/**
 * Utility Functions
 * Common helper functions used across the pipeline
 */

/**
 * Format a number as currency
 * @param {number} value - Numeric value
 * @param {string} currency - Currency code
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format a number as percentage
 * @param {number} value - Numeric value (0-1)
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted percentage string
 */
export function formatPercentage(value, decimals = 1) {
  return (value * 100).toFixed(decimals) + '%';
}

/**
 * Calculate elapsed time in human-readable format
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} - Formatted time string
 */
export function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} - Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string|Function} keyFn - Key or key function
 * @returns {Map} - Grouped map
 */
export function groupBy(array, keyFn) {
  const map = new Map();
  const getKey = typeof keyFn === 'function' ? keyFn : (item) => item[keyFn];

  for (const item of array) {
    const key = getKey(item);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(item);
  }

  return map;
}

/**
 * Calculate percentile of a value in an array
 * @param {Array} array - Numeric array
 * @param {number} value - Value to find percentile for
 * @returns {number} - Percentile (0-100)
 */
export function percentile(array, value) {
  const sorted = [...array].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  if (index === -1) return 100;
  return (index / sorted.length) * 100;
}

/**
 * Generate summary statistics for an array
 * @param {Array} array - Numeric array
 * @returns {Object} - Statistics object
 */
export function summaryStats(array) {
  if (array.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      mean: null,
      median: null,
      std: null
    };
  }

  const sorted = [...array].sort((a, b) => a - b);
  const sum = array.reduce((a, b) => a + b, 0);
  const mean = sum / array.length;
  
  const variance = array.reduce((sum, val) => 
    sum + Math.pow(val - mean, 2), 0) / array.length;
  const std = Math.sqrt(variance);

  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  return {
    count: array.length,
    min: Math.min(...array),
    max: Math.max(...array),
    mean: mean,
    median: median,
    std: std
  };
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after delay
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @returns {Promise} - Result of function
 */
export async function retry(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i));
      }
    }
  }
  
  throw lastError;
}

/**
 * Create a progress bar string
 * @param {number} current - Current progress
 * @param {number} total - Total items
 * @param {number} width - Width of progress bar
 * @returns {string} - Progress bar string
 */
export function progressBar(current, total, width = 40) {
  const percentage = current / total;
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percent = (percentage * 100).toFixed(1);
  
  return `[${bar}] ${percent}% (${current}/${total})`;
}

/**
 * Validate latitude and longitude
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} - Whether coordinates are valid
 */
export function isValidCoordinate(lat, lon) {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180 &&
    !isNaN(lat) && !isNaN(lon)
  );
}

/**
 * Round number to specified decimal places
 * @param {number} value - Number to round
 * @param {number} decimals - Decimal places
 * @returns {number} - Rounded number
 */
export function roundTo(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Check if value is numeric
 * @param {any} value - Value to check
 * @returns {boolean} - Whether value is numeric
 */
export function isNumeric(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Remove outliers using IQR method
 * @param {Array} array - Numeric array
 * @param {number} threshold - IQR multiplier (default 1.5)
 * @returns {Array} - Array without outliers
 */
export function removeOutliers(array, threshold = 1.5) {
  const sorted = [...array].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - threshold * iqr;
  const upperBound = q3 + threshold * iqr;
  
  return array.filter(val => val >= lowerBound && val <= upperBound);
}

/**
 * Create a simple hash of a string
 * @param {string} str - String to hash
 * @returns {number} - Hash value
 */
export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Chunk an array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array} - Array of chunks
 */
export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default {
  formatCurrency,
  formatPercentage,
  formatDuration,
  deepClone,
  groupBy,
  percentile,
  summaryStats,
  sleep,
  retry,
  progressBar,
  isValidCoordinate,
  roundTo,
  isNumeric,
  removeOutliers,
  simpleHash,
  chunk
};
