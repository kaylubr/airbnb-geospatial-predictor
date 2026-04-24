/**
 * FeatureEngineering Module
 * Aggregates temporal data and creates ML features from raw datasets
 */

class FeatureEngineering {
  /**
   * Aggregate calendar data per listing
   * @param {Array} calendarData - Raw calendar records
   * @returns {Map} - Map of listing_id to aggregated features
   */
  aggregateCalendarData(calendarData) {
    console.log('Aggregating calendar data...');
    
    const listingGroups = new Map();

    // Group by listing_id
    for (const record of calendarData) {
      const listingId = record.listing_id;
      
      if (!listingGroups.has(listingId)) {
        listingGroups.set(listingId, []);
      }
      listingGroups.get(listingId).push(record);
    }

    // Aggregate statistics per listing
    const aggregated = new Map();

    for (const [listingId, records] of listingGroups) {
      const validRecords = records.filter(r => 
        r.occupancy !== undefined && 
        r.revenue !== undefined
      );

      if (validRecords.length === 0) continue;

      // Calculate statistics
      const occupancies = validRecords.map(r => r.occupancy);
      const revenues = validRecords.map(r => r.revenue);
      const rates = validRecords.map(r => r.rate_avg).filter(r => r);
      const leadTimes = validRecords.map(r => r.booking_lead_time_avg).filter(r => r);
      const stayLengths = validRecords.map(r => r.length_of_stay_avg).filter(r => r);

      aggregated.set(listingId, {
        // Occupancy metrics
        avg_occupancy: this.mean(occupancies),
        std_occupancy: this.standardDeviation(occupancies),
        max_occupancy: Math.max(...occupancies),
        min_occupancy: Math.min(...occupancies),

        // Revenue metrics
        total_revenue: this.sum(revenues),
        avg_revenue: this.mean(revenues),
        std_revenue: this.standardDeviation(revenues),
        max_revenue: Math.max(...revenues),

        // Rate metrics
        avg_daily_rate: rates.length > 0 ? this.mean(rates) : 0,
        std_daily_rate: rates.length > 0 ? this.standardDeviation(rates) : 0,

        // Booking behavior
        avg_booking_lead_time: leadTimes.length > 0 ? this.mean(leadTimes) : 0,
        avg_length_of_stay: stayLengths.length > 0 ? this.mean(stayLengths) : 0,

        // Data quality
        months_with_data: validRecords.length
      });
    }

    console.log(`Aggregated calendar data for ${aggregated.size} listings\n`);
    return aggregated;
  }

  /**
   * Aggregate reviews data per listing
   * @param {Array} reviewsData - Raw review records
   * @returns {Map} - Map of listing_id to review features
   */
  aggregateReviewsData(reviewsData) {
    console.log('Aggregating reviews data...');
    
    const listingReviews = new Map();

    for (const record of reviewsData) {
      const listingId = record.listing_id;
      const numReviews = record.num_reviews || 0;

      if (!listingReviews.has(listingId)) {
        listingReviews.set(listingId, {
          totalReviews: 0,
          monthlyReviews: [],
          monthsWithReviews: 0
        });
      }

      const stats = listingReviews.get(listingId);
      stats.totalReviews += numReviews;
      stats.monthlyReviews.push(numReviews);
      if (numReviews > 0) {
        stats.monthsWithReviews++;
      }
    }

    // Calculate final statistics
    const aggregated = new Map();
    for (const [listingId, stats] of listingReviews) {
      aggregated.set(listingId, {
        total_reviews: stats.totalReviews,
        avg_reviews_per_month: stats.monthlyReviews.length > 0 
          ? this.mean(stats.monthlyReviews) 
          : 0,
        months_with_reviews: stats.monthsWithReviews,
        review_consistency: stats.monthsWithReviews / stats.monthlyReviews.length
      });
    }

    console.log(`Aggregated reviews for ${aggregated.size} listings\n`);
    return aggregated;
  }

  /**
   * Extract listing features
   * @param {Object} listing - Single listing record
   * @returns {Object} - Extracted features
   */
  extractListingFeatures(listing) {
    // Parse amenities if it's a string
    let amenitiesCount = 0;
    if (listing.amenities) {
      if (typeof listing.amenities === 'string') {
        try {
          const parsed = JSON.parse(listing.amenities);
          amenitiesCount = Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          // If it's a comma-separated string
          amenitiesCount = listing.amenities.split(',').filter(a => a.trim()).length;
        }
      } else if (Array.isArray(listing.amenities)) {
        amenitiesCount = listing.amenities.length;
      }
    }

    return {
      listing_id: listing.listing_id,
      listing_name: listing.listing_name || 'Unknown',
      listing_type: listing.listing_type || 'Unknown',
      room_type: listing.room_type || 'unknown',
      latitude: listing.latitude || null,
      longitude: listing.longitude || null,
      rating_overall: listing.rating_overall || 0,
      amenities_count: amenitiesCount,
      bedrooms: listing.bedrooms || 0,
      beds: listing.beds || 0,
      baths: listing.baths || 0,
      accommodates: listing.guests || listing.accommodates || 0,
      ttm_revenue: listing.ttm_revenue || 0,
      ttm_occupancy: listing.ttm_occupancy || 0,
      city: listing.city || 'Unknown'
    };
  }

  /**
   * Create unified feature table by joining all data sources
   * @param {Object} data - All datasets
   * @returns {Array} - Array of feature records
   */
  createFeatureTable(data) {
    console.log('Creating unified feature table...\n');

    const calendarFeatures = this.aggregateCalendarData(data.calendar);
    const reviewFeatures = this.aggregateReviewsData(data.reviews);

    const featureTable = [];

    for (const listing of data.listings) {
      const listingId = listing.listing_id;

      // Extract base listing features
      const baseFeatures = this.extractListingFeatures(listing);

      // Merge calendar features
      const calendar = calendarFeatures.get(listingId) || this.getDefaultCalendarFeatures();

      // Merge review features
      const reviews = reviewFeatures.get(listingId) || this.getDefaultReviewFeatures();

      // Skip if no coordinates (needed for geo features)
      if (!baseFeatures.latitude || !baseFeatures.longitude) {
        continue;
      }

      // Combine all features
      featureTable.push({
        ...baseFeatures,
        ...calendar,
        ...reviews
      });
    }

    console.log(`Created feature table with ${featureTable.length} listings\n`);
    console.log('Feature columns:', Object.keys(featureTable[0] || {}).join(', '));
    console.log();

    return featureTable;
  }

  /**
   * Get default calendar features for listings without data
   */
  getDefaultCalendarFeatures() {
    return {
      avg_occupancy: 0,
      std_occupancy: 0,
      max_occupancy: 0,
      min_occupancy: 0,
      total_revenue: 0,
      avg_revenue: 0,
      std_revenue: 0,
      max_revenue: 0,
      avg_daily_rate: 0,
      std_daily_rate: 0,
      avg_booking_lead_time: 0,
      avg_length_of_stay: 0,
      months_with_data: 0
    };
  }

  /**
   * Get default review features for listings without reviews
   */
  getDefaultReviewFeatures() {
    return {
      total_reviews: 0,
      avg_reviews_per_month: 0,
      months_with_reviews: 0,
      review_consistency: 0
    };
  }

  // ==================== STATISTICAL UTILITIES ====================

  /**
   * Calculate mean of an array
   */
  mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Calculate sum of an array
   */
  sum(arr) {
    return arr.reduce((sum, val) => sum + val, 0);
  }

  /**
   * Calculate standard deviation
   */
  standardDeviation(arr) {
    if (arr.length === 0) return 0;
    const avg = this.mean(arr);
    const squaredDiffs = arr.map(val => Math.pow(val - avg, 2));
    const variance = this.mean(squaredDiffs);
    return Math.sqrt(variance);
  }
}

export default FeatureEngineering;
