import axios from 'axios';
import NodeCache from 'node-cache';

/**
 * GeoFeatures Module
 * Handles geospatial feature extraction using OpenStreetMap Overpass API
 * and Haversine distance calculations
 */

class GeoFeatures {
  constructor(cacheTimeout = 3600) {
    this.cache = new NodeCache({ stdTTL: cacheTimeout });
    this.overpassUrl = 'https://overpass-api.de/api/interpreter';
    this.requestDelay = 1000; // 1 second between requests to be polite
    this.attractions = null;
  }

  /**
   * Haversine formula to calculate distance between two coordinates
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lon1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lon2 - Longitude of point 2
   * @returns {number} - Distance in kilometers
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    
    const toRad = (deg) => deg * (Math.PI / 180);
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in km
  }

  /**
   * Fetch attractions from OpenStreetMap Overpass API
   * Fetches points of interest in Manila area
   * @param {string} city - City name (default: Manila)
   * @returns {Promise<Array>} - Array of attraction objects with lat/lon
   */
  async fetchAttractions(city = 'Manila') {
    const cacheKey = `attractions_${city}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('Using cached attractions data\n');
      return cached;
    }

    console.log(`Fetching attractions from OpenStreetMap for ${city}...`);
    console.log('This may take 30-60 seconds...\n');

    try {
      // Overpass QL query to fetch various POIs in Manila
      const query = `
        [out:json][timeout:90];
        area["name"="Metro Manila"]->.searchArea;
        (
          // Tourism
          node["tourism"](area.searchArea);
          way["tourism"](area.searchArea);
          
          // Restaurants and food
          node["amenity"="restaurant"](area.searchArea);
          node["amenity"="cafe"](area.searchArea);
          
          // Shopping
          node["shop"="mall"](area.searchArea);
          node["shop"="supermarket"](area.searchArea);
          
          // Transport
          node["public_transport"="station"](area.searchArea);
          node["amenity"="bus_station"](area.searchArea);
          
          // Entertainment
          node["leisure"](area.searchArea);
          
          // Historical/Cultural
          node["historic"](area.searchArea);
        );
        out center;
      `;

      const response = await axios.post(
        this.overpassUrl,
        query,
        {
          headers: { 'Content-Type': 'text/plain' },
          timeout: 90000 // 90 second timeout
        }
      );

      // Extract attractions with coordinates
      const attractions = response.data.elements
        .filter(el => el.lat && el.lon)
        .map(el => ({
          lat: el.lat,
          lon: el.lon,
          type: el.tags?.tourism || el.tags?.amenity || el.tags?.shop || el.tags?.leisure || el.tags?.historic || 'attraction',
          name: el.tags?.name || 'Unnamed'
        }));

      console.log(`Fetched ${attractions.length} attractions from OSM\n`);

      // Cache the results
      this.cache.set(cacheKey, attractions);
      
      return attractions;
    } catch (error) {
      console.warn('Failed to fetch from OSM:', error.message);
      console.log('Using fallback: sample Manila attractions\n');
      
      // Fallback to some known Manila attractions
      const fallbackAttractions = this.getFallbackAttractions();
      this.cache.set(cacheKey, fallbackAttractions);
      return fallbackAttractions;
    }
  }

  /**
   * Get fallback attractions for Manila (in case API fails)
   * @returns {Array} - Sample attractions with coordinates
   */
  getFallbackAttractions() {
    return [
      // Major landmarks
      { lat: 14.5995, lon: 120.9842, type: 'landmark', name: 'Rizal Park' },
      { lat: 14.5932, lon: 120.9824, type: 'landmark', name: 'Intramuros' },
      { lat: 14.5547, lon: 121.0244, type: 'mall', name: 'SM Mall of Asia' },
      { lat: 14.5654, lon: 121.0550, type: 'mall', name: 'SM Megamall' },
      { lat: 14.6488, lon: 121.0509, type: 'mall', name: 'SM North EDSA' },
      { lat: 14.5764, lon: 121.0515, type: 'mall', name: 'Shangri-La Plaza' },
      { lat: 14.5526, lon: 121.0503, type: 'mall', name: 'Greenbelt' },
      { lat: 14.5520, lon: 121.0498, type: 'mall', name: 'Glorietta' },
      { lat: 14.5569, lon: 121.0231, type: 'transport', name: 'NAIA Terminal 3' },
      { lat: 14.5658, lon: 121.0353, type: 'district', name: 'Makati CBD' },
      { lat: 14.5548, lon: 121.0294, type: 'district', name: 'BGC' },
      { lat: 14.5764, lon: 121.0851, type: 'district', name: 'Ortigas Center' },
      { lat: 14.6091, lon: 121.0223, type: 'district', name: 'Quezon City Circle' },
      { lat: 14.5899, lon: 120.9799, type: 'tourism', name: 'Manila Bay' },
      { lat: 14.6042, lon: 120.9822, type: 'tourism', name: 'Manila Ocean Park' },
      // Additional key areas
      { lat: 14.5501, lon: 121.0489, type: 'restaurant', name: 'Poblacion Makati' },
      { lat: 14.6075, lon: 121.0218, type: 'tourism', name: 'La Mesa Eco Park' },
      { lat: 14.5786, lon: 121.0382, type: 'transport', name: 'EDSA Guadalupe' },
      { lat: 14.6113, lon: 121.0357, type: 'transport', name: 'Cubao' },
      { lat: 14.5839, lon: 121.0573, type: 'tourism', name: 'Greenhills Shopping Center' }
    ];
  }

  /**
   * Calculate geo features for a single listing
   * @param {number} lat - Listing latitude
   * @param {number} lon - Listing longitude
   * @param {Array} attractions - Array of attraction objects
   * @returns {Object} - Geo features
   */
  calculateGeoFeatures(lat, lon, attractions) {
    // Calculate distances to all attractions
    const distances = attractions.map(attr => 
      this.haversineDistance(lat, lon, attr.lat, attr.lon)
    );

    // Count attractions within different radii
    const within1km = distances.filter(d => d <= 1).length;
    const within3km = distances.filter(d => d <= 3).length;
    const within5km = distances.filter(d => d <= 5).length;

    // Find nearest attraction
    const nearestDistance = Math.min(...distances);

    // Calculate attraction density (attractions per km²)
    const area1km = Math.PI * 1 * 1; // π * r²
    const area3km = Math.PI * 3 * 3;
    const density1km = within1km / area1km;
    const density3km = within3km / area3km;

    return {
      attraction_count_1km: within1km,
      attraction_count_3km: within3km,
      attraction_count_5km: within5km,
      nearest_attraction_distance: nearestDistance,
      attraction_density_1km: density1km,
      attraction_density_3km: density3km
    };
  }

  /**
   * Add geo features to all listings in feature table
   * @param {Array} featureTable - Feature table with latitude/longitude
   * @returns {Promise<Array>} - Feature table with geo features added
   */
  async addGeoFeatures(featureTable) {
    console.log('Adding geospatial features...\n');

    // Fetch attractions once for all listings
    if (!this.attractions) {
      this.attractions = await this.fetchAttractions('Manila');
    }

    const enrichedTable = [];
    let processed = 0;

    for (const listing of featureTable) {
      if (!listing.latitude || !listing.longitude) {
        console.warn(`⚠️  Skipping listing ${listing.listing_id} - missing coordinates`);
        continue;
      }

      // Calculate geo features
      const geoFeatures = this.calculateGeoFeatures(
        listing.latitude,
        listing.longitude,
        this.attractions
      );

      // Merge with existing features
      enrichedTable.push({
        ...listing,
        ...geoFeatures
      });

      processed++;
      if (processed % 10 === 0) {
        process.stdout.write(`\r⏳ Processed ${processed}/${featureTable.length} listings...`);
      }
    }

    console.log(`\nAdded geo features to ${enrichedTable.length} listings\n`);

    return enrichedTable;
  }

  /**
   * Calculate distance between two listings
   * @param {Object} listing1 - First listing with lat/lon
   * @param {Object} listing2 - Second listing with lat/lon
   * @returns {number} - Distance in kilometers
   */
  distanceBetweenListings(listing1, listing2) {
    return this.haversineDistance(
      listing1.latitude,
      listing1.longitude,
      listing2.latitude,
      listing2.longitude
    );
  }

  /**
   * Find nearby listings (useful for competitive analysis)
   * @param {Object} listing - Target listing
   * @param {Array} allListings - All listings
   * @param {number} radiusKm - Search radius in kilometers
   * @returns {Array} - Nearby listings
   */
  findNearbyListings(listing, allListings, radiusKm = 1) {
    return allListings
      .filter(other => other.listing_id !== listing.listing_id)
      .map(other => ({
        ...other,
        distance: this.distanceBetweenListings(listing, other)
      }))
      .filter(other => other.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  }
}

export default GeoFeatures;
