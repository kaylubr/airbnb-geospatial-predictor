import {
  RandomForestClassifier as RFClassifier,
  RandomForestRegression as RFRegression
} from 'ml-random-forest';

/**
 * MLModel Module
 * Handles machine learning model training and prediction using ml-random-forest.
 * Supports both regression (predict continuous revenue/occupancy) and
 * classification (predict High/Medium/Low investment score).
 */

class MLModel {
  constructor() {
    this.model = null;
    this.featureColumns = null;
    this.targetColumn = null;
    this.isClassification = false;
    this.normalizers = null;
    this.labelMap = null;        // string label -> integer
    this.reverseLabelMap = null; // integer -> string label
  }

  /**
   * Prepare dataset by selecting features and target.
   * @param {Array} featureTable - Complete feature table
   * @param {string} targetColumn - Name of target column
   * @param {Array} excludeColumns - Columns to exclude from features
   * @returns {{ X: number[][], y: number[], validListings: any[] }}
   */
  prepareDataset(featureTable, targetColumn = 'total_revenue', excludeColumns = []) {
    console.log(`Preparing dataset with target: ${targetColumn}\n`);
    this.targetColumn = targetColumn;

    const alwaysExclude = ['listing_id', 'city', 'latitude', 'longitude', targetColumn];
    const exclude = new Set([...alwaysExclude, ...excludeColumns]);

    const sample = featureTable[0];
    this.featureColumns = Object.keys(sample)
      .filter(col => !exclude.has(col) && typeof sample[col] === 'number');

    console.log(`Selected ${this.featureColumns.length} feature columns:`);
    console.log(`   ${this.featureColumns.join(', ')}\n`);

    const X = [], y = [], validListings = [];

    for (const row of featureTable) {
      const target = row[targetColumn];
      if (target == null || isNaN(target)) continue;

      const features = this.featureColumns.map(col => {
        const v = row[col];
        return (v == null || isNaN(v)) ? 0 : v;
      });

      X.push(features);
      y.push(target);
      validListings.push(row.listing_id);
    }

    console.log(`Prepared dataset with ${X.length} samples\n`);
    return { X, y, validListings };
  }

  /**
   * Min-max scale each feature column to [0, 1].
   * Stores per-column stats in this.normalizers for use at predict time.
   */
  normalizeFeatures(X) {
    if (!X || X.length === 0) return X;
    const numFeatures = X[0].length;
    this.normalizers = [];

    for (let i = 0; i < numFeatures; i++) {
      const col = X.map(row => row[i]);
      this.normalizers.push({ min: Math.min(...col), max: Math.max(...col) });
    }

    const normalized = X.map(row =>
      row.map((val, i) => {
        const { min, max } = this.normalizers[i];
        return max === min ? 0 : (val - min) / (max - min);
      })
    );
    console.log('Features normalized using min-max scaling\n');
    return normalized;
  }

  /** Apply stored normalizer to new data (at predict time). */
  applyNormalization(X) {
    if (!this.normalizers) return X;
    return X.map(row =>
      row.map((val, i) => {
        const { min, max } = this.normalizers[i];
        return max === min ? 0 : (val - min) / (max - min);
      })
    );
  }

  /**
   * Split dataset into train and test sets
   * @param {Array} X - Feature matrix
   * @param {Array} y - Target vector
   * @param {number} testSize - Proportion of test set (0-1)
   * @returns {Object} - Train and test splits
   */
  trainTestSplit(X, y, testSize = 0.2) {
    const n = X.length;
    const testN = Math.floor(n * testSize);
    
    // Create indices and shuffle
    const indices = Array.from({ length: n }, (_, i) => i);
    
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Split indices
    const testIndices = indices.slice(0, testN);
    const trainIndices = indices.slice(testN);

    const XTrain = trainIndices.map(i => X[i]);
    const yTrain = trainIndices.map(i => y[i]);
    const XTest = testIndices.map(i => X[i]);
    const yTest = testIndices.map(i => y[i]);

    console.log(`Train/Test Split:`);
    console.log(`   Training samples: ${XTrain.length}`);
    console.log(`   Test samples: ${XTest.length}\n`);

    return { XTrain, yTrain, XTest, yTest };
  }

  /**
   * Convert continuous y values into integer labels 0/1/2 (Low/Medium/High).
   * ml-random-forest requires numeric class labels.
   * @param {number[]} y - Continuous target values
   * @param {number[]} thresholds - Percentile break-points [low%, high%]
   * @returns {number[]} - Integer labels (0=low, 1=medium, 2=high)
   */
  createInvestmentScoreLabels(y, thresholds = [33, 67]) {
    const sorted = [...y].sort((a, b) => a - b);
    const lowThreshold  = sorted[Math.floor(sorted.length * thresholds[0] / 100)];
    const highThreshold = sorted[Math.floor(sorted.length * thresholds[1] / 100)];

    this.labelMap        = { low: 0, medium: 1, high: 2 };
    this.reverseLabelMap = { 0: 'low', 1: 'medium', 2: 'high' };

    const labels = y.map(v => (v < lowThreshold ? 0 : v < highThreshold ? 1 : 2));

    console.log('Investment Score Distribution:');
    console.log(`   Low    (0): ${labels.filter(l => l === 0).length}`);
    console.log(`   Medium (1): ${labels.filter(l => l === 1).length}`);
    console.log(`   High   (2): ${labels.filter(l => l === 2).length}\n`);

    return labels;
  }

  /**
   * Train Random Forest Classifier.
   * ml-random-forest expects X as number[][] and y as integer[].
   */
  trainClassifier(X, y, options = {}) {
    console.log('Training Random Forest Classifier...\n');
    this.isClassification = true;

    const rfOptions = {
      seed: 42,
      nEstimators: options.nEstimators || 50,
      maxFeatures: options.maxFeatures || 0.8,
      replacement: true
    };
    this.model = new RFClassifier(rfOptions);
    this.model.train(X, y); // synchronous — no callback needed
    console.log('Classifier training completed\n');
  }

  /**
   * Train Random Forest Regressor.
   * ml-random-forest expects X as number[][] and y as number[].
   */
  trainRegressor(X, y, options = {}) {
    console.log('Training Random Forest Regressor...\n');
    this.isClassification = false;

    const rfOptions = {
      seed: 42,
      nEstimators: options.nEstimators || 50,
      maxFeatures: options.maxFeatures || 0.8,
      replacement: true
    };
    this.model = new RFRegression(rfOptions);
    this.model.train(X, y);
    console.log('Regressor training completed\n');
  }

  /**
   * Generate predictions for a batch of samples.
   * ml-random-forest's predict() takes an array of samples and returns an array.
   * Returns string labels for classifiers, numbers for regressors.
   * @param {number[][]} X - Feature matrix
   * @returns {Array} predictions
   */
  predict(X) {
    if (!this.model) throw new Error('Model not trained. Call trainPipeline() first.');

    // ml-random-forest predict() accepts the whole matrix at once
    const raw = this.model.predict(X);

    if (this.isClassification && this.reverseLabelMap) {
      return raw.map(p => this.reverseLabelMap[p] ?? p);
    }
    return raw;
  }

  /** Print and return classification metrics. yTrue here are integer labels. */
  evaluateClassification(yTrue, yPred) {
    const labels = ['low', 'medium', 'high'];
    let correct = 0;

    // Build confusion matrix (string labels)
    const cm = {};
    for (const tl of labels) { cm[tl] = {}; for (const pl of labels) cm[tl][pl] = 0; }

    for (let i = 0; i < yTrue.length; i++) {
      // yTrue is integer; yPred is already string via predict()
      const tl = this.reverseLabelMap ? this.reverseLabelMap[yTrue[i]] : String(yTrue[i]);
      const pl = yPred[i];
      if (tl === pl) correct++;
      if (cm[tl]?.[pl] !== undefined) cm[tl][pl]++;
    }

    const accuracy = correct / yTrue.length;
    console.log('Classification Results:');
    console.log('━'.repeat(55));
    console.log(`Accuracy : ${(accuracy * 100).toFixed(2)}%`);
    console.log(`Correct  : ${correct} / ${yTrue.length}`);
    console.log('\nConfusion Matrix (row=actual, col=predicted):');
    console.log('           ' + labels.map(l => l.padEnd(9)).join(''));
    for (const tl of labels) {
      console.log(`${tl.padEnd(11)}` + labels.map(pl => String(cm[tl][pl]).padEnd(9)).join(''));
    }
    console.log('━'.repeat(55) + '\n');
    return { accuracy, confusionMatrix: cm };
  }

  /** Print and return regression metrics (RMSE, MAE, R²). */
  evaluateRegression(yTrue, yPred) {
    const n = yTrue.length;
    const errors = yTrue.map((v, i) => v - yPred[i]);
    const mse  = errors.reduce((s, e) => s + e * e, 0) / n;
    const mae  = errors.reduce((s, e) => s + Math.abs(e), 0) / n;
    const rmse = Math.sqrt(mse);
    const yMean = yTrue.reduce((a, b) => a + b, 0) / n;
    const ssTot = yTrue.reduce((s, v) => s + (v - yMean) ** 2, 0);
    const r2   = 1 - (errors.reduce((s, e) => s + e * e, 0) / ssTot);

    console.log('Regression Results:');
    console.log('━'.repeat(50));
    console.log(`RMSE : ${rmse.toFixed(2)}`);
    console.log(`MAE  : ${mae.toFixed(2)}`);
    console.log(`R²   : ${r2.toFixed(4)}`);
    console.log('━'.repeat(50) + '\n');
    return { rmse, mae, r2 };
  }

  /**
   * Extract feature importance from the trained model.
   * ml-random-forest exposes model.featureImportances() on the underlying trees.
   */
  getFeatureImportance() {
    if (!this.featureColumns) return [];

    let rawImportances;
    try {
      rawImportances = this.model.featureImportances();
    } catch {
      // Fallback: equal weights if library doesn't expose it
      rawImportances = this.featureColumns.map(() => 1 / this.featureColumns.length);
    }

    const total = rawImportances.reduce((a, b) => a + b, 0) || 1;
    const importance = this.featureColumns.map((col, i) => ({
      feature: col,
      importance: (rawImportances[i] / total) * 100
    })).sort((a, b) => b.importance - a.importance);

    console.log('Feature Importance:\n');
    console.log('━'.repeat(65));
    importance.slice(0, 15).forEach((item, i) => {
      const bar = '█'.repeat(Math.max(1, Math.ceil(item.importance / 2)));
      console.log(
        `${String(i + 1).padStart(2)}. ${item.feature.padEnd(32)} ${bar} ${item.importance.toFixed(2)}%`
      );
    });
    console.log('━'.repeat(65) + '\n');
    return importance;
  }

  /**
   * End-to-end training pipeline.
   * @param {Array<Object>} featureTable
   * @param {Object} config
   * @returns {{ metrics, featureImportance, predictions, actual }}
   */
  async trainPipeline(featureTable, config = {}) {
    const {
      targetColumn = 'total_revenue',
      taskType     = 'classification',
      testSize     = 0.2,
      normalize    = true,
      modelOptions = {}
    } = config;

    console.log('Starting ML Training Pipeline\n');
    console.log(`Task Type : ${taskType.toUpperCase()}`);
    console.log(`Target    : ${targetColumn}\n`);

    // 1. Prepare data
    const { X, y } = this.prepareDataset(featureTable, targetColumn);

    if (X.length < 5) {
      throw new Error(
        `Not enough samples (${X.length}) to train. ` +
        'Ensure listings have coordinates, calendar data, and a valid target column.'
      );
    }

    // 2. Build integer labels for classification
    let yFinal = y;
    if (taskType === 'classification') {
      yFinal = this.createInvestmentScoreLabels(y);
    }

    // 3. Normalize
    const XNorm = normalize ? this.normalizeFeatures(X) : X;

    // 4. Split
    const { XTrain, yTrain, XTest, yTest } = this.trainTestSplit(XNorm, yFinal, testSize);

    // 5. Train
    if (taskType === 'classification') {
      this.trainClassifier(XTrain, yTrain, modelOptions);
    } else {
      this.trainRegressor(XTrain, yTrain, modelOptions);
    }

    // 6. Evaluate
    const yPred = this.predict(XTest);

    let metrics;
    if (taskType === 'classification') {
      metrics = this.evaluateClassification(yTest, yPred);
    } else {
      metrics = this.evaluateRegression(yTest, yPred);
    }

    // 7. Feature importance
    const featureImportance = this.getFeatureImportance();

    return { metrics, featureImportance, predictions: yPred, actual: yTest };
  }
}

export default MLModel;
