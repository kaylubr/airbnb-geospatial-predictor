import readline from 'readline';
import DataLoader from './dataLoader.js';
import FeatureEngineering from './featureEngineering.js';
import GeoFeatures from './geo.js';
import MLModel from './model.js';
import { PROPERTY_TYPES, BEDROOM_OPTIONS, PRIORITIES, runAdvisorAnalysis } from './advisor.js';
import fs from 'fs/promises';

// ─────────────────────────────────────────────────────────────
// INPUT HELPERS
// ─────────────────────────────────────────────────────────────

function createRL() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, a => resolve(a.trim())));
}

async function askMenu(rl, options, label) {
  while (true) {
    console.log(`\n${label}`);
    options.forEach(o => console.log(`   ${o.id}. ${o.label}`));
    const ans = await ask(rl, `\n   Enter choice (1-${options.length}): `);
    const choice = parseInt(ans, 10);
    if (choice >= 1 && choice <= options.length) return choice;
    console.log(`   Please enter a number between 1 and ${options.length}.`);
  }
}

async function askBudget(rl) {
  while (true) {
    const ans = await ask(
      rl,
      '\nWhat is your total investment budget? (in Philippine Peso)\n' +
      '   Examples: 3000000 for P3M  |  8500000 for P8.5M\n' +
      '   Budget: P'
    );
    const val = parseFloat(ans.replace(/,/g, ''));
    if (!isNaN(val) && val > 0) return val;
    console.log('   Please enter a valid amount (numbers only, e.g. 5000000).');
  }
}

// ─────────────────────────────────────────────────────────────
// PIPELINE
// ─────────────────────────────────────────────────────────────

class AirbnbMLPipeline {
  constructor() {
    this.dataLoader = new DataLoader('.');
    this.featureEngineering = new FeatureEngineering();
    this.geoFeatures = new GeoFeatures();
    this.model = new MLModel();
  }

  async run(config = {}) {
    console.log('\n' + '═'.repeat(60));
    console.log('AIRBNB INVESTMENT ML PIPELINE');
    console.log('═'.repeat(60) + '\n');

    const startTime = Date.now();

    try {
      // ============================================================
      // STEP 1: LOAD DATA
      // ============================================================
      console.log('═'.repeat(60));
      console.log('STEP 1: DATA LOADING');
      console.log('═'.repeat(60) + '\n');

      const rawData = await this.dataLoader.loadAllData();
      this.dataLoader.validateData(rawData);

      // ============================================================
      // STEP 2: FEATURE ENGINEERING
      // ============================================================
      console.log('═'.repeat(60));
      console.log('STEP 2: FEATURE ENGINEERING');
      console.log('═'.repeat(60) + '\n');

      let featureTable = this.featureEngineering.createFeatureTable(rawData);

      // ============================================================
      // STEP 3: GEOSPATIAL FEATURES
      // ============================================================
      console.log('═'.repeat(60));
      console.log('STEP 3: GEOSPATIAL FEATURE EXTRACTION');
      console.log('═'.repeat(60) + '\n');

      featureTable = await this.geoFeatures.addGeoFeatures(featureTable);

      // Save feature table
      await this.saveFeatureTable(featureTable);

      // ============================================================
      // STEP 4: MACHINE LEARNING
      // ============================================================
      console.log('═'.repeat(60));
      console.log('STEP 4: MACHINE LEARNING MODEL TRAINING');
      console.log('═'.repeat(60) + '\n');

      // Configuration
      const mlConfig = {
        targetColumn: config.targetColumn || 'total_revenue',
        taskType: config.taskType || 'classification',
        testSize: 0.2,
        normalize: true,
        modelOptions: {
          nEstimators: 50,
          maxDepth: 10,
          minSamplesSplit: 2
        }
      };

      const results = await this.model.trainPipeline(featureTable, mlConfig);

      // ============================================================
      // STEP 5: GENERATING ANALYSIS
      // ============================================================
      console.log('═'.repeat(60));
      console.log('STEP 5: GENERATING ANALYSIS');
      console.log('═'.repeat(60) + '\n');

      await this.generateAnalysis(featureTable, results);

      // ============================================================
      // SUMMARY
      // ============================================================
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('═'.repeat(60));
      console.log('PIPELINE COMPLETED SUCCESSFULLY');
      console.log('═'.repeat(60) + '\n');
      console.log(`Total Duration : ${duration} seconds`);
      console.log(`Listings       : ${featureTable.length}`);
      console.log(`Task Type      : ${mlConfig.taskType.toUpperCase()}`);
      console.log(`Target         : ${mlConfig.targetColumn}\n`);

      console.log('Generated Files:');
      console.log('   feature_table.json      - Complete feature dataset');
      console.log('   analysis.json           - Model analysis results');
      console.log('   feature_importance.json - Feature rankings\n');

      const rawListings = rawData.listings || [];

      return { featureTable, rawListings, results, duration };

    } catch (error) {
      console.error('\nPipeline failed:', error.message);
      console.error(error.stack);
      throw error;
    }
  }

  async saveFeatureTable(featureTable) {
    try {
      await fs.writeFile('feature_table.json', JSON.stringify(featureTable, null, 2), 'utf-8');
      console.log('Saved feature table to feature_table.json\n');
    } catch (error) {
      console.error('Failed to save feature table:', error.message);
    }
  }

  async generateAnalysis(featureTable, results) {
    try {
      const { X } = this.model.prepareDataset(featureTable, this.model.targetColumn);
      const XNormalized = this.model.applyNormalization(X);
      const predictions = this.model.predict(XNormalized);

      const analysisReport = featureTable.slice(0, predictions.length).map((listing, i) => ({
        listing_id:                  listing.listing_id,
        listing_name:                listing.listing_name,
        listing_type:                listing.listing_type,
        room_type:                   listing.room_type,
        bedrooms:                    listing.bedrooms,
        actual:                      listing[this.model.targetColumn],
        investment_score:            predictions[i],
        latitude:                    listing.latitude,
        longitude:                   listing.longitude,
        city:                        listing.city,
        avg_occupancy:               listing.avg_occupancy,
        avg_revenue:                 listing.avg_revenue,
        avg_daily_rate:              listing.avg_daily_rate,
        rating_overall:              listing.rating_overall,
        attraction_count_1km:        listing.attraction_count_1km,
        nearest_attraction_distance: listing.nearest_attraction_distance
      }));

      await fs.writeFile('analysis.json', JSON.stringify(analysisReport, null, 2), 'utf-8');
      await fs.writeFile('feature_importance.json', JSON.stringify(results.featureImportance, null, 2), 'utf-8');

      const SEP = '━'.repeat(105);
      console.log('Sample Analysis (top 10):\n');
      console.log(SEP);
      console.log(
        'Listing ID    | ' +
        'Name'.padEnd(40) + '| ' +
        'Score'.padEnd(10) + '| ' +
        'Occupancy  | Avg Nightly Rate'
      );
      console.log(SEP);

      for (let i = 0; i < Math.min(10, analysisReport.length); i++) {
        const r = analysisReport[i];
        const name     = (r.listing_name || 'Unknown').substring(0, 38).padEnd(38);
        const score    = String(r.investment_score).padEnd(10);
        const occupancy = ((r.avg_occupancy || 0) * 100).toFixed(1) + '%';
        const rate     = 'P' + Math.round((r.avg_daily_rate || 0) * 56).toLocaleString() + '/night';

        console.log(
          `${String(r.listing_id).padEnd(14)}| ` +
          `${name} | ` +
          `${score}| ` +
          `${occupancy.padEnd(11)}| ` +
          `${rate}`
        );
      }
      console.log(SEP + '\n');
      console.log(`Saved ${analysisReport.length} records to analysis.json\n`);

    } catch (error) {
      console.error('Failed to generate analysis:', error.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('AIRBNB INVESTMENT ADVISOR — MANILA');
  console.log('Powered by ML Pipeline + Location Analysis');
  console.log('═'.repeat(60));
  console.log('\nPlease answer a few questions before the pipeline runs.\n');
  console.log('━'.repeat(60));

  // ── Step 0: Collect user inputs ─────────────────────────
  const rl = createRL();
  let profile;

  try {
    const budget       = await askBudget(rl);
    const propertyType = await askMenu(rl, PROPERTY_TYPES, 'What type of Airbnb do you want to invest in?');
    const bedrooms     = await askMenu(rl, BEDROOM_OPTIONS, 'How many bedrooms are you targeting?');
    const priority     = await askMenu(rl, PRIORITIES,     'What is your primary investment goal?');

    profile = { budget, propertyType, bedrooms, priority };
  } finally {
    rl.close();
  }

  console.log('\n' + '━'.repeat(60));
  console.log('Starting ML pipeline with your preferences...\n');

  // ── Steps 1-5: Run the ML pipeline ──────────────────────
  const pipeline = new AirbnbMLPipeline();
  let featureTable, rawListings;

  try {
    const output = await pipeline.run({ targetColumn: 'total_revenue', taskType: 'classification' });
    featureTable = output.featureTable;
    rawListings  = output.rawListings || [];
  } catch (error) {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  }

  // ── Step 6: Investment location analysis ────────────────
  try {
    await runAdvisorAnalysis(featureTable, rawListings, {
      ...profile,
      totalAll: featureTable.length,
    });
  } catch (error) {
    console.error('\nFailed to generate investment report:', error.message);
    process.exit(1);
  }
}

main();
