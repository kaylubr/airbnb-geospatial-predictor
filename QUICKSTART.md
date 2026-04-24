# 🚀 Quick Start Guide

Get up and running with the Airbnb ML Pipeline in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

This installs:
- `random-forest-classifier` - ML model
- `axios` - HTTP client for OpenStreetMap API
- `node-cache` - Caching for API results

## Step 2: Prepare Your Data

Ensure you have these three JSON files in the project directory:
- ✅ `Listings Data.json`
- ✅ `Past Calendar Rates.json`
- ✅ `Reviews Data.json`

## Step 3: Run the Pipeline

```bash
npm start
```

That's it! The pipeline will:
1. Load your data
2. Engineer features
3. Fetch geospatial data
4. Train ML model
5. Generate predictions

## Step 4: View Results

After completion, check these files:
- 📄 `feature_table.json` - All engineered features
- 📄 `predictions.json` - Investment predictions
- 📄 `feature_importance.json` - Key drivers

## 🎯 Customize Your Analysis

Edit the config in `main.js`:

```javascript
const config = {
  targetColumn: 'total_revenue',  // What to predict
  taskType: 'classification'       // classification or regression
};
```

### Popular Targets:
- `'total_revenue'` - Predict revenue potential
- `'avg_occupancy'` - Predict booking rates
- `'total_reviews'` - Predict popularity

### Task Types:
- `'classification'` - Categorize as High/Medium/Low investment
- `'regression'` - Predict exact numeric values

## 📊 Understanding Output

### Classification Example:
```
Listing ID    | Actual | Predicted | Occupancy | Revenue
17618807      | high   | high      | 82.3%     | $5,521
41070658      | low    | medium    | 18.5%     | $7,390
```

### Regression Example:
```
Listing ID    | Actual | Predicted | Occupancy | Revenue
17618807      | 5521   | 5430      | 82.3%     | $5,521
41070658      | 7390   | 6810      | 18.5%     | $7,390
```

## 🗺️ Geospatial Features

The pipeline automatically:
- Fetches attractions from OpenStreetMap
- Calculates distances to landmarks
- Counts nearby points of interest
- Computes attraction density

No configuration needed!

## 🔧 Common Issues

### Issue: "Cannot find module"
**Solution:** Run `npm install`

### Issue: "OSM API timeout"
**Solution:** Pipeline will use fallback Manila attractions automatically

### Issue: "No listings with coordinates"
**Solution:** Check that your Listings Data has `latitude` and `longitude` fields

### Issue: Low accuracy
**Solution:** Try these:
- Increase `nEstimators` to 100 in config
- Increase `maxDepth` to 15
- Use regression instead of classification
- Add more training data

## 📈 Typical Performance

With 150+ listings:
- **Processing time:** 1-3 minutes
- **Classification accuracy:** 70-85%
- **Regression R² score:** 0.65-0.80

## 🎓 Next Steps

1. **Explore Results**
   - Open `predictions.json` to see all predictions
   - Check `feature_importance.json` to understand drivers

2. **Tune Hyperparameters**
   - Edit `config.js` to adjust model settings
   - Experiment with different targets

3. **Add Custom Features**
   - Modify `featureEngineering.js` to add domain knowledge
   - Create derived features from existing data

4. **Visualize**
   - Import `predictions.json` into Excel/Tableau
   - Plot predicted vs actual values
   - Map high-value listings

## 🤔 FAQs

**Q: Can I use this with other cities?**  
A: Yes! Change the city in `geo.js` or `config.js`

**Q: How accurate are the predictions?**  
A: Typically 70-85% for classification, R²=0.65-0.80 for regression

**Q: Can I predict multiple targets?**  
A: Run the pipeline multiple times with different `targetColumn` values

**Q: Does it work with CSV files?**  
A: Convert CSV to JSON first, or modify `dataLoader.js` to support CSV

**Q: How do I improve accuracy?**  
A: Add more data, engineer better features, tune hyperparameters

## 💡 Pro Tips

1. **Start with Classification** - Easier to interpret for business decisions
2. **Check Feature Importance** - Focus on top 5-10 features
3. **Validate Predictions** - Compare with actual performance
4. **Iterate** - Try different targets and features
5. **Cache Results** - OSM data is cached for 1 hour

## 🆘 Need Help?

Check the full documentation in `README.md`

---

**Happy Analyzing! 📊**
