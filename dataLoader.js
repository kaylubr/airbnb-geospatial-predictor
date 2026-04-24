import fs from 'fs/promises';
import path from 'path';

/**
 * DataLoader Module
 * Handles loading and initial parsing of all JSON datasets
 */

class DataLoader {
  constructor(dataDir = '.') {
    this.dataDir = dataDir;
  }

  /**
   * Load JSON file with error handling
   * @param {string} filename - Name of the JSON file
   * @returns {Promise<Array>} - Parsed JSON data
   */
  async loadJSON(filename) {
    try {
      const filePath = path.join(this.dataDir, filename);
      console.log(`Loading ${filename}...`);
      
      const rawData = await fs.readFile(filePath, 'utf-8');
      
      // Handle both array and JSONL (newline-delimited JSON)
      if (rawData.trim().startsWith('[')) {
        return JSON.parse(rawData);
      } else {
        // JSONL format - one JSON object per line (skip any stray bracket lines)
        return rawData
          .trim()
          .split('\n')
          .filter(line => line.trim().startsWith('{'))
          .map(line => JSON.parse(line));
      }
    } catch (error) {
      console.error(`Error loading ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Load all datasets
   * @returns {Promise<Object>} - Object containing all datasets
   */
  async loadAllData() {
    try {
      console.log('Loading all datasets...\n');

      const [listings, calendar, reviews] = await Promise.all([
        this.loadJSON('Listings Data.json'),
        this.loadJSON('Past Calendar Rates.json'),
        this.loadJSON('Reviews Data.json')
      ]);

      console.log(`Loaded ${listings.length} listings`);
      console.log(`Loaded ${calendar.length} calendar records`);
      console.log(`Loaded ${reviews.length} review records\n`);

      return {
        listings,
        calendar,
        reviews
      };
    } catch (error) {
      console.error('Failed to load datasets:', error.message);
      throw error;
    }
  }

  /**
   * Validate data quality
   * @param {Object} data - Dataset object
   * @returns {Object} - Validation report
   */
  validateData(data) {
    const report = {
      listings: {
        total: data.listings.length,
        withCoordinates: data.listings.filter(l => l.latitude && l.longitude).length,
        withRatings: data.listings.filter(l => l.rating_overall).length
      },
      calendar: {
        total: data.calendar.length,
        uniqueListings: new Set(data.calendar.map(c => c.listing_id)).size
      },
      reviews: {
        total: data.reviews.length,
        uniqueListings: new Set(data.reviews.map(r => r.listing_id)).size,
        totalReviewCount: data.reviews.reduce((sum, r) => sum + (r.num_reviews || 0), 0)
      }
    };

    console.log('Data Validation Report:');
    console.log('━'.repeat(50));
    console.log('Listings:');
    console.log(`  Total: ${report.listings.total}`);
    console.log(`  With Coordinates: ${report.listings.withCoordinates}`);
    console.log(`  With Ratings: ${report.listings.withRatings}`);
    console.log('\nCalendar Data:');
    console.log(`  Total Records: ${report.calendar.total}`);
    console.log(`  Unique Listings: ${report.calendar.uniqueListings}`);
    console.log('\nReviews Data:');
    console.log(`  Total Records: ${report.reviews.total}`);
    console.log(`  Unique Listings: ${report.reviews.uniqueListings}`);
    console.log(`  Total Review Count: ${report.totalReviewCount}`);
    console.log('━'.repeat(50) + '\n');

    return report;
  }
}

export default DataLoader;
