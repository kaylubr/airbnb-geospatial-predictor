# Airbnb Investment ML Pipeline

A complete, production-ready machine learning pipeline for Airbnb investment analysis using Node.js.

##  Features

- **Data Integration**: Combines listings, calendar rates, and reviews data
- **Feature Engineering**: Automated temporal aggregations and statistical features
- **Geospatial Analysis**: OpenStreetMap integration with Haversine distance calculations
- **Machine Learning**: Random Forest classifier/regressor with feature importance
- **Modular Architecture**: Clean, maintainable code structure

## Installation

```bash
npm install
```

## Quick Start

```bash
npm start
```

## Data Sources

The pipeline expects three JSON files:

1. **Listings Data.json** - Property information
   - listing_id, latitude, longitude
   - rating_overall, amenities
   - bedrooms, beds, baths
   - ttm_revenue, ttm_occupancy

2. **Past Calendar Rates.json** - Historical performance
   - listing_id, date
   - occupancy, revenue, rate_avg
   - booking_lead_time_avg, length_of_stay_avg

3. **Reviews Data.json** - Review metrics
   - listing_id, date
   - num_reviews, reviewers

## Pipeline Architecture

```
┌─────────────────┐
│  Data Loader    │  ← Load & validate JSON files
└────────┬────────┘
         │
┌────────▼────────┐
│  Feature Eng    │  ← Aggregate & engineer features
└────────┬────────┘
         │
┌────────▼────────┐
│  Geo Features   │  ← OpenStreetMap + Haversine
└────────┬────────┘
         │
┌────────▼────────┐
│  ML Model       │  ← Random Forest training
└────────┬────────┘
         │
┌────────▼────────┐
│  Predictions    │  ← Output results
└─────────────────┘
```

## Module Structure

### `dataLoader.js`
- Loads JSON/JSONL files
- Data validation and quality checks
- Handles multiple data formats

### `featureEngineering.js`
- Temporal aggregations (mean, std, sum)
- Calendar metrics (occupancy, revenue, rates)
- Review features (total, monthly average)
- Listing features (amenities count, ratings)

### `geo.js`
- Haversine distance formula implementation
- OpenStreetMap Overpass API integration
- Attraction density calculations
- Nearby listing analysis

### `model.js`
- Random Forest classifier/regressor
- Train/test split with shuffling
- Feature normalization (min-max scaling)
- Model evaluation metrics
- Feature importance analysis

### `main.js`
- Pipeline orchestration
- Configuration management
- Results generation and export

## Generated Features

### Temporal Features
- `avg_occupancy`, `std_occupancy`, `max_occupancy`
- `total_revenue`, `avg_revenue`, `std_revenue`
- `avg_daily_rate`, `std_daily_rate`
- `avg_booking_lead_time`
- `avg_length_of_stay`

### Review Features
- `total_reviews`
- `avg_reviews_per_month`
- `months_with_reviews`
- `review_consistency`

### Listing Features
- `rating_overall`
- `amenities_count`
- `bedrooms`, `beds`, `baths`

### Geospatial Features
- `attraction_count_1km`, `attraction_count_3km`, `attraction_count_5km`
- `nearest_attraction_distance`
- `attraction_density_1km`, `attraction_density_3km`

## Configuration

Edit the `config` object in `main.js`:

```javascript
const config = {
  // Target variable to predict
  targetColumn: 'total_revenue',  // or 'avg_occupancy', 'avg_revenue'
  
  // Task type
  taskType: 'classification',  // or 'regression'
};
```

### Classification Mode
Predicts investment score categories:
- **High**: Top 33rd percentile
- **Medium**: Middle 34th percentile  
- **Low**: Bottom 33rd percentile

### Regression Mode
Predicts continuous values (revenue, occupancy, etc.)

## Output Files

1. **feature_table.json**
   - Complete unified feature dataset
   - One row per listing with all engineered features

2. **predictions.json**
   - Model predictions for all listings
   - Includes actual vs predicted comparison
   - Key metrics for decision-making

3. **feature_importance.json**
   - Ranked list of feature importance
   - Helps understand prediction drivers

## Geospatial Analysis

The pipeline uses OpenStreetMap to fetch real attractions in Manila:

- **Tourism**: Parks, monuments, viewpoints
- **Restaurants & Cafes**: Dining options
- **Shopping**: Malls, supermarkets
- **Transport**: Stations, terminals
- **Entertainment**: Leisure facilities
- **Historical**: Cultural sites

Distance calculations use the **Haversine formula** for accurate great-circle distances.

## Machine Learning

### Model: Random Forest
- **Ensemble method**: Combines multiple decision trees
- **Robust**: Handles non-linear relationships
- **Feature importance**: Reveals prediction drivers

### Evaluation Metrics

**Classification:**
- Accuracy
- Confusion matrix
- Per-class precision/recall

**Regression:**
- RMSE (Root Mean Squared Error)
- MAE (Mean Absolute Error)
- R² Score

## Extending the Pipeline

### Add Custom Features

Edit `featureEngineering.js`:

```javascript
extractListingFeatures(listing) {
  return {
    // ... existing features ...
    my_custom_feature: listing.some_field * 2
  };
}
```

### Add More Attraction Types

Edit `geo.js` Overpass query:

```javascript
node["amenity"="hospital"](area.searchArea);
```

### Try Different Models

Replace Random Forest with other algorithms by modifying `model.js`.

## Error Handling

- **Missing coordinates**: Listings without lat/lon are skipped
- **API failures**: Falls back to known Manila attractions
- **Data validation**: Reports on data quality issues
- **Async operations**: Proper error catching throughout

## Sample Output

```
═══════════════════════════════════════════════════
STEP 4: MACHINE LEARNING MODEL TRAINING
═══════════════════════════════════════════════════

- Preparing dataset with target: total_revenue

- Selected 25 feature columns:
   avg_occupancy, avg_revenue, avg_daily_rate, ...

- Prepared dataset with 150 samples

- Classification Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Accuracy: 75.00%
Correct predictions: 22 / 30
```

## Troubleshooting

### OpenStreetMap timeout
Increase timeout in `geo.js` or use fallback attractions.

### Memory issues
Process listings in batches if dataset is very large.

### Missing dependencies
Run `npm install` to ensure all packages are installed.

## Best Practices

1. **Cache API results**: Geospatial data is cached automatically
2. **Data quality**: Review validation report before training
3. **Feature selection**: Remove highly correlated features
4. **Hyperparameter tuning**: Adjust nEstimators, maxDepth
5. **Cross-validation**: Implement k-fold for robust evaluation

## Use Cases

1. **Investment Analysis**: Identify high-potential properties
2. **Pricing Strategy**: Predict optimal rates
3. **Location Scoring**: Evaluate neighborhood quality
4. **Portfolio Optimization**: Compare multiple properties
5. **Market Research**: Understand demand drivers

## Technical Stack

- **Runtime**: Node.js (ES Modules)
- **ML Library**: random-forest-classifier
- **HTTP Client**: axios
- **Caching**: node-cache
- **Data Format**: JSON/JSONL

## Contributing

Feel free to extend this pipeline:
- Add more feature engineering techniques
- Implement additional ML models
- Integrate other geospatial APIs
- Add visualization capabilities

## License

MIT

##  Author

Built by a senior data engineer and ML engineer for production use.

---

**Happy Investing!**
