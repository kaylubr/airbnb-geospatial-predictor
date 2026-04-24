/**
 * Configuration Module
 * Centralized configuration for the ML pipeline
 */

export const config = {
  // ==================== DATA SETTINGS ====================
  
  data: {
    // Input file names
    listingsFile: 'Listings Data.json',
    calendarFile: 'Past Calendar Rates.json',
    reviewsFile: 'Reviews Data.json',
    
    // Data directory
    dataDir: '.'
  },

  // ==================== FEATURE ENGINEERING ====================
  
  features: {
    // Columns to exclude from ML features
    excludeColumns: [
      'listing_id',
      'city',
      'latitude',
      'longitude'
    ],
    
    // Feature normalization
    normalize: true,
    
    // Handle missing values
    fillMissingWith: 0
  },

  // ==================== GEOSPATIAL SETTINGS ====================
  
  geo: {
    // City for attraction fetching
    city: 'Manila',
    
    // Distance radii (in kilometers)
    radiusOptions: [1, 3, 5],
    
    // OpenStreetMap Overpass API
    overpassUrl: 'https://overpass-api.de/api/interpreter',
    overpassTimeout: 90000, // 90 seconds
    
    // Rate limiting
    requestDelay: 1000, // 1 second between requests
    
    // Cache settings
    cacheTimeout: 3600, // 1 hour in seconds
    
    // Fallback mode if API fails
    useFallback: true
  },

  // ==================== MACHINE LEARNING ====================
  
  ml: {
    // Target variable options:
    // 'total_revenue', 'avg_occupancy', 'avg_revenue', 'total_reviews'
    targetColumn: 'total_revenue',
    
    // Task type: 'classification' or 'regression'
    taskType: 'classification',
    
    // Train/test split ratio
    testSize: 0.2,
    
    // Random Forest hyperparameters
    model: {
      nEstimators: 50,      // Number of trees
      maxDepth: 10,         // Maximum depth of trees
      minSamplesSplit: 2,   // Minimum samples to split node
      randomState: 42       // Random seed for reproducibility
    },
    
    // Classification labels (percentile thresholds)
    classificationThresholds: [33, 67], // [low/medium, medium/high]
    
    // Feature selection
    featureSelectionThreshold: 0.01 // Minimum feature importance
  },

  // ==================== OUTPUT SETTINGS ====================
  
  output: {
    // Output file names
    featureTableFile: 'feature_table.json',
    predictionsFile: 'predictions.json',
    featureImportanceFile: 'feature_importance.json',
    
    // Pretty print JSON
    prettyPrint: true,
    jsonIndent: 2,
    
    // Console logging
    verbose: true,
    showProgress: true
  },

  // ==================== ADVANCED SETTINGS ====================
  
  advanced: {
    // Batch processing for large datasets
    batchSize: 1000,
    
    // Parallel processing
    maxConcurrency: 5,
    
    // Memory limits
    maxMemoryMB: 2048,
    
    // Retry settings for API calls
    maxRetries: 3,
    retryDelay: 2000 // 2 seconds
  }
};

/**
 * Get configuration value by path
 * @param {string} path - Dot-separated path (e.g., 'ml.model.nEstimators')
 * @returns {any} - Configuration value
 */
export function getConfig(path) {
  return path.split('.').reduce((obj, key) => obj?.[key], config);
}

/**
 * Update configuration value
 * @param {string} path - Dot-separated path
 * @param {any} value - New value
 */
export function setConfig(path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((obj, key) => obj[key], config);
  target[lastKey] = value;
}

/**
 * Validate configuration
 * @returns {Object} - Validation result
 */
export function validateConfig() {
  const errors = [];
  const warnings = [];

  // Validate target column
  const validTargets = ['total_revenue', 'avg_occupancy', 'avg_revenue', 'total_reviews'];
  if (!validTargets.includes(config.ml.targetColumn)) {
    warnings.push(`Target column '${config.ml.targetColumn}' may not be available`);
  }

  // Validate task type
  if (!['classification', 'regression'].includes(config.ml.taskType)) {
    errors.push(`Invalid task type: ${config.ml.taskType}`);
  }

  // Validate test size
  if (config.ml.testSize <= 0 || config.ml.testSize >= 1) {
    errors.push('Test size must be between 0 and 1');
  }

  // Validate model parameters
  if (config.ml.model.nEstimators < 1) {
    errors.push('nEstimators must be >= 1');
  }
  if (config.ml.model.maxDepth < 1) {
    errors.push('maxDepth must be >= 1');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export default config;
