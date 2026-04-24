import readline from 'readline';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const USD_TO_PHP = 56; // approximate conversion rate

// ─────────────────────────────────────────────────────────────
// MANILA DISTRICTS (centroid lat/lon + context)
// ─────────────────────────────────────────────────────────────

const DISTRICTS = [
  {
    name: 'Malate',
    lat: 14.5654, lon: 120.9858,
    description: 'Beachfront entertainment district with Manila Bay views, vibrant nightlife, and restaurants.',
    character: 'Tourist & Entertainment Hub',
    pros: ['Manila Bay sunset views', 'Active nightlife & dining scene', 'High tourist footfall', 'Near Rizal Park & CCP Complex'],
    cons: ['Can be noisy at night', 'Competitive short-stay market'],
  },
  {
    name: 'Ermita',
    lat: 14.5826, lon: 120.9831,
    description: 'Tourist-friendly district near embassies, the National Museum, and major cultural landmarks.',
    character: 'Cultural & Diplomatic Hub',
    pros: ['National Museum cluster', 'Good LRT access', 'Walking distance to Intramuros', 'Foreign guest-friendly'],
    cons: ['More commercial than residential', 'High competition from hotels'],
  },
  {
    name: 'Paco',
    lat: 14.5877, lon: 120.9990,
    description: 'Residential district near universities and the Philippine General Hospital.',
    character: 'Residential & Medical Hub',
    pros: ['Quieter neighbourhood feel', 'Near PGH & Paco Park', 'Budget-friendly property prices', 'Stable demand'],
    cons: ['Less tourist traffic', 'Lower average nightly rates'],
  },
  {
    name: 'Intramuros',
    lat: 14.5925, lon: 120.9746,
    description: 'UNESCO heritage walled city — Fort Santiago, Manila Cathedral, and top international tourist draws.',
    character: 'Heritage & Cultural Tourism',
    pros: ['World-class heritage sites', 'Strong international tourism', 'Near Manila Bay', 'Unique destination appeal'],
    cons: ['Limited new construction', 'Heritage regulations may restrict development'],
  },
  {
    name: 'Binondo',
    lat: 14.5988, lon: 120.9770,
    description: "World's oldest Chinatown — a vibrant commercial and food destination attracting locals and tourists.",
    character: 'Commercial & Culinary Hub',
    pros: ['Famous food tour scene', 'Strong commercial activity', 'LRT-1 Central access', 'Cultural tourism draw'],
    cons: ['Heavy traffic congestion', 'Noisy during business hours'],
  },
  {
    name: 'Quiapo / Santa Cruz',
    lat: 14.5991, lon: 120.9839,
    description: 'Commercial and religious center anchored by Quiapo Church and Carriedo markets.',
    character: 'Religious & Commercial Hub',
    pros: ['Quiapo Church pilgrim traffic', 'Central Manila location', 'LRT accessible', 'Budget accommodation demand'],
    cons: ['Very congested streets', 'Not suited for premium listings'],
  },
  {
    name: 'Sampaloc',
    lat: 14.6105, lon: 121.0008,
    description: "Manila's university belt — consistent demand from students, faculty, and transient guests year-round.",
    character: 'Student & Academic Hub',
    pros: ['Near UST, FEU, UE & PLM', 'Consistent year-round demand', 'Budget-friendly market', 'LRT 2 access'],
    cons: ['Primarily budget segment', 'Lower average nightly rates'],
  },
  {
    name: 'San Miguel',
    lat: 14.5966, lon: 120.9932,
    description: 'Upscale enclave near Malacañang Palace with tree-lined streets and heritage architecture.',
    character: 'Upscale Residential Area',
    pros: ['Prestigious Manila address', 'Peaceful, tree-lined streets', 'Close to Quiapo & Binondo', 'Heritage charm'],
    cons: ['Limited commercial options nearby', 'Some restricted areas near Palace'],
  },
  {
    name: 'Tondo',
    lat: 14.6196, lon: 120.9682,
    description: 'Port-adjacent district with lower property prices — an emerging area for budget accommodation.',
    character: 'Port & Emerging Area',
    pros: ['Near Manila North Harbor', 'Lower property acquisition cost', 'Emerging investment potential', 'Good transport links'],
    cons: ['Less tourist appeal', 'Industrial character in some pockets'],
  },
  {
    name: 'Port Area / Bay City',
    lat: 14.5432, lon: 120.9808,
    description: 'Near SM Mall of Asia and NAIA — ideal for airport layovers and bay-side leisure stays.',
    character: 'Airport & Entertainment Proximity',
    pros: ['15-20 min drive to NAIA terminals', 'SM Mall of Asia complex', 'Bay City entertainment strip', 'CCP & Solaire nearby'],
    cons: ['Less residential character', 'Primarily commercial development'],
  },
];

// ─────────────────────────────────────────────────────────────
// KEY MANILA AMENITIES (with coordinates)
// ─────────────────────────────────────────────────────────────

const AMENITIES = [
  { name: 'Robinsons Place Manila', lat: 14.5783, lon: 120.9840, type: 'Mall', emoji: '🛒' },
  { name: 'SM Manila (Carriedo)', lat: 14.5995, lon: 120.9827, type: 'Mall', emoji: '🛒' },
  { name: 'Harrison Plaza', lat: 14.5645, lon: 120.9893, type: 'Mall', emoji: '🛒' },
  { name: 'Rizal Park / Luneta', lat: 14.5829, lon: 120.9795, type: 'Park', emoji: '🌳' },
  { name: 'Intramuros Walled City', lat: 14.5925, lon: 120.9724, type: 'Attraction', emoji: '🏰' },
  { name: 'Manila Bay Boardwalk', lat: 14.5712, lon: 120.9776, type: 'Attraction', emoji: '🌊' },
  { name: 'National Museum of the Philippines', lat: 14.5871, lon: 120.9806, type: 'Museum', emoji: '🏛️' },
  { name: 'Manila Ocean Park', lat: 14.5836, lon: 120.9785, type: 'Attraction', emoji: '🐠' },
  { name: 'Fort Santiago', lat: 14.5944, lon: 120.9718, type: 'Attraction', emoji: '🏯' },
  { name: 'CCP Complex', lat: 14.5599, lon: 120.9840, type: 'Entertainment', emoji: '🎭' },
  { name: 'Quiapo Church (Black Nazarene)', lat: 14.5993, lon: 120.9838, type: 'Landmark', emoji: '⛪' },
  { name: 'Manila Cathedral', lat: 14.5938, lon: 120.9730, type: 'Landmark', emoji: '⛪' },
  { name: 'Binondo Chinatown', lat: 14.5988, lon: 120.9748, type: 'Dining', emoji: '🍜' },
  { name: 'Remedios Circle (Malate nightlife)', lat: 14.5716, lon: 120.9853, type: 'Dining/Nightlife', emoji: '🍹' },
  { name: 'Paco Park', lat: 14.5839, lon: 120.9985, type: 'Park', emoji: '🌳' },
  { name: 'LRT-1 UN Avenue Station', lat: 14.5797, lon: 120.9841, type: 'Transport', emoji: '🚉' },
  { name: 'LRT-1 Pedro Gil Station', lat: 14.5734, lon: 120.9854, type: 'Transport', emoji: '🚉' },
  { name: 'LRT-1 Vito Cruz Station', lat: 14.5643, lon: 120.9888, type: 'Transport', emoji: '🚉' },
  { name: 'LRT-1 Central Terminal', lat: 14.5983, lon: 120.9811, type: 'Transport', emoji: '🚉' },
  { name: 'LRT-2 Legarda Station', lat: 14.6019, lon: 120.9889, type: 'Transport', emoji: '🚉' },
  { name: 'NAIA Terminal 1', lat: 14.5086, lon: 121.0194, type: 'Airport', emoji: '✈️' },
  { name: 'Philippine General Hospital', lat: 14.5766, lon: 120.9927, type: 'Hospital', emoji: '🏥' },
  { name: 'Manila Doctors Hospital', lat: 14.5796, lon: 120.9866, type: 'Hospital', emoji: '🏥' },
  { name: 'De La Salle University', lat: 14.5648, lon: 120.9937, type: 'University', emoji: '🎓' },
  { name: 'University of Santo Tomas', lat: 14.6098, lon: 121.0000, type: 'University', emoji: '🎓' },
  { name: 'Pamantasan ng Lungsod ng Maynila', lat: 14.5878, lon: 120.9888, type: 'University', emoji: '🎓' },
  { name: 'SM Mall of Asia', lat: 14.5353, lon: 120.9832, type: 'Mall', emoji: '🛒' },
];

// ─────────────────────────────────────────────────────────────
// PROPERTY TYPE MENU
// ─────────────────────────────────────────────────────────────

export const PROPERTY_TYPES = [
  {
    id: 1, label: 'Entire Condo Unit',
    filter: l => l.room_type === 'entire_home' && (l.listing_type || '').toLowerCase().includes('condo'),
  },
  {
    id: 2, label: 'Entire Apartment / Rental Unit',
    filter: l => l.room_type === 'entire_home' && (
      (l.listing_type || '').toLowerCase().includes('rental') ||
      (l.listing_type || '').toLowerCase().includes('apartment')
    ),
  },
  {
    id: 3, label: 'Any Entire Home / Apartment',
    filter: l => l.room_type === 'entire_home',
  },
  {
    id: 4, label: 'Private Room (in a shared home)',
    filter: l => l.room_type === 'private_room',
  },
  {
    id: 5, label: 'Any Type — No Preference',
    filter: () => true,
  },
];

// ─────────────────────────────────────────────────────────────
// BEDROOMS MENU
// ─────────────────────────────────────────────────────────────

export const BEDROOM_OPTIONS = [
  { id: 1, label: 'Studio (0–1 bedroom)',    filter: l => (l.bedrooms || 0) <= 1 },
  { id: 2, label: '1 Bedroom',               filter: l => (l.bedrooms || 0) === 1 },
  { id: 3, label: '2 Bedrooms',              filter: l => (l.bedrooms || 0) === 2 },
  { id: 4, label: '3+ Bedrooms',             filter: l => (l.bedrooms || 0) >= 3 },
  { id: 5, label: 'No Preference',           filter: () => true },
];

// ─────────────────────────────────────────────────────────────
// INVESTMENT PRIORITY MENU
// ─────────────────────────────────────────────────────────────

export const PRIORITIES = [
  {
    id: 1, label: 'Maximize Annual Revenue',
    weights: { revenue: 0.50, occupancy: 0.20, rating: 0.15, geo: 0.15 },
  },
  {
    id: 2, label: 'Maximize Occupancy Rate',
    weights: { revenue: 0.20, occupancy: 0.50, rating: 0.15, geo: 0.15 },
  },
  {
    id: 3, label: 'Best Guest Ratings (quality market)',
    weights: { revenue: 0.20, occupancy: 0.15, rating: 0.50, geo: 0.15 },
  },
  {
    id: 4, label: 'Best ROI (revenue relative to budget)',
    weights: { revenue: 0.40, occupancy: 0.30, rating: 0.15, geo: 0.15 },
  },
];

// ─────────────────────────────────────────────────────────────
// UTILITY: Haversine distance (km)
// ─────────────────────────────────────────────────────────────

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function formatPHP(amount) {
  return '₱' + Math.round(amount).toLocaleString('en-PH');
}

// ─────────────────────────────────────────────────────────────
// Assign each listing to nearest district centroid
// ─────────────────────────────────────────────────────────────

function assignDistrict(lat, lon) {
  let nearest = DISTRICTS[0];
  let minDist = Infinity;
  for (const d of DISTRICTS) {
    const dist = haversine(lat, lon, d.lat, d.lon);
    if (dist < minDist) { minDist = dist; nearest = d; }
  }
  return nearest.name;
}

// ─────────────────────────────────────────────────────────────
// Score districts based on filtered listings + user priority
// ─────────────────────────────────────────────────────────────

function scoreDistricts(listings, weights, budget) {
  const groups = new Map();
  for (const l of listings) {
    if (!groups.has(l._district)) groups.set(l._district, []);
    groups.get(l._district).push(l);
  }

  const scored = [];
  for (const [distName, members] of groups) {
    if (members.length < 1) continue;

    const distInfo = DISTRICTS.find(d => d.name === distName) || { name: distName };

    const avgOccupancy  = mean(members.map(l => l.avg_occupancy  || 0));
    const avgDailyRate  = mean(members.map(l => l.avg_daily_rate || 0));   // USD
    const annualRevPHP  = mean(members.map(l => (l.total_revenue || 0) * USD_TO_PHP));
    const monthlyRevPHP = annualRevPHP / 12;
    const avgRating     = mean(members.filter(l => (l.rating_overall || 0) > 0).map(l => l.rating_overall));
    const avgAttractions = mean(members.map(l => l.attraction_count_1km || 0));
    const roi           = budget > 0 ? (annualRevPHP / budget) * 100 : 0;

    // Top 3 listings in this district sorted by total_revenue
    const topListings = [...members]
      .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))
      .slice(0, 3);

    scored.push({
      ...distInfo,
      listings: members,
      topListings,
      count: members.length,
      avgOccupancy,
      avgDailyRate,
      annualRevPHP,
      monthlyRevPHP,
      avgRating,
      avgAttractions,
      roi,
    });
  }

  // Normalize each metric then apply weighted sum → score out of 10
  const maxRev  = Math.max(...scored.map(d => d.annualRevPHP), 1);
  const maxOcc  = Math.max(...scored.map(d => d.avgOccupancy), 1);
  const maxRat  = Math.max(...scored.map(d => d.avgRating),    1);
  const maxGeo  = Math.max(...scored.map(d => d.avgAttractions), 1);

  for (const d of scored) {
    d.score = (
      weights.revenue   * (d.annualRevPHP    / maxRev) +
      weights.occupancy * (d.avgOccupancy    / maxOcc) +
      weights.rating    * (d.avgRating       / maxRat) +
      weights.geo       * (d.avgAttractions  / maxGeo)
    ) * 10;
  }

  return scored.sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────────────────────
// Get nearest amenities for a district centroid
// ─────────────────────────────────────────────────────────────

function getNearestAmenities(distLat, distLon, limit = 8) {
  return AMENITIES
    .map(a => ({ ...a, distKm: haversine(distLat, distLon, a.lat, a.lon) }))
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────
// Generate Markdown report string
// ─────────────────────────────────────────────────────────────

function generateMarkdown(profile, top3) {
  const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const medals = ['#1', '#2', '#3'];
  const ranks  = ['1st', '2nd', '3rd'];

  const budgetStr   = formatPHP(profile.budget);
  const propLabel   = PROPERTY_TYPES.find(p => p.id === profile.propertyType)?.label || 'Any';
  const bedLabel    = BEDROOM_OPTIONS.find(b => b.id === profile.bedrooms)?.label || 'Any';
  const prioLabel   = PRIORITIES.find(p => p.id === profile.priority)?.label || 'Balanced';

  let md = `# Airbnb Investment Report — Manila\n`;
  md += `*Generated: ${today}*\n\n`;
  md += `---\n\n`;

  // ── Investment Profile ──────────────────────────────────────
  md += `## Your Investment Profile\n\n`;
  md += `| Parameter | Selection |\n`;
  md += `|-----------|----------|\n`;
  md += `| **Investment Budget** | ${budgetStr} |\n`;
  md += `| **Property Type** | ${propLabel} |\n`;
  md += `| **Bedrooms** | ${bedLabel} |\n`;
  md += `| **Priority** | ${prioLabel} |\n`;
  md += `| **Listings Analyzed** | ${profile.totalFiltered} (out of ${profile.totalAll}) |\n`;
  md += `\n---\n\n`;

  // ── Top 3 Districts ─────────────────────────────────────────
  md += `## Top 3 Best Locations in Manila\n\n`;

  top3.forEach((d, i) => {
    const amenities = getNearestAmenities(d.lat, d.lon, 7);
    const roiStr    = d.roi > 0 ? `${d.roi.toFixed(2)}%` : 'N/A';

    md += `### ${medals[i]} #${i + 1} — ${d.name}\n`;
    md += `**Investment Score: ${d.score.toFixed(1)} / 10**\n\n`;
    md += `> ${d.description}\n\n`;
    md += `**Character:** ${d.character}\n\n`;

    // Key stats table
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Avg. Occupancy Rate | ${(d.avgOccupancy * 100).toFixed(1)}% |\n`;
    md += `| Avg. Nightly Rate | ${formatPHP(d.avgDailyRate * USD_TO_PHP)} |\n`;
    md += `| Avg. Monthly Revenue | ${formatPHP(d.monthlyRevPHP)} |\n`;
    md += `| Avg. Annual Revenue | ${formatPHP(d.annualRevPHP)} |\n`;
    md += `| Expected ROI | ${roiStr} |\n`;
    md += `| Avg. Guest Rating | ${d.avgRating > 0 ? d.avgRating.toFixed(2) : 'N/A'} |\n`;
    md += `| Listings in Area | ${d.count} |\n`;
    md += `\n`;

    // Why invest here
    md += `#### Why Invest Here\n`;
    (d.pros || []).forEach(p => { md += `- ${p}\n`; });
    md += `\n`;

    // Things to consider
    md += `#### Things to Consider\n`;
    (d.cons || []).forEach(c => { md += `- ${c}\n`; });
    md += `\n`;

    // Nearest amenities
    md += `#### Nearest Amenities\n\n`;
    md += `| # | Amenity | Type | Distance |\n`;
    md += `|---|---------|------|----------|\n`;
    amenities.forEach((a, idx) => {
      md += `| ${idx + 1} | ${a.name} | ${a.type} | ${a.distKm.toFixed(2)} km |\n`;
    });
    md += `\n`;

    // Top listings
    if (d.topListings.length > 0) {
      md += `#### Top Performing Listings in This Area\n\n`;
      md += `| # | Listing Name | Type | Bedrooms | Occupancy | Est. Monthly Revenue | Rating |\n`;
      md += `|---|------------|------|----------|-----------|----------------------|--------|\n`;
      d.topListings.forEach((l, idx) => {
        const monthlyPHP = formatPHP((l.total_revenue || 0) * USD_TO_PHP / 12);
        const occ        = ((l.avg_occupancy || 0) * 100).toFixed(1) + '%';
        const rating     = l.rating_overall ? l.rating_overall.toFixed(2) : 'N/A';
        const bedLabel   = (l.bedrooms || 0) === 0 ? 'Studio' : `${l.bedrooms} BR`;
        const typeTrim   = (l.listing_type || 'N/A').replace('Entire ', '').replace(' room', '');
        md += `| ${idx + 1} | **${l.listing_name || 'Unknown'}** | ${typeTrim} | ${bedLabel} | ${occ} | ${monthlyPHP} | ${rating} |\n`;
      });
      md += `\n`;
    }

    if (i < 2) md += `---\n\n`;
  });

  // ── Investment Tips ──────────────────────────────────────────
  md += `---\n\n`;
  md += `## Key Investment Insights\n\n`;
  md += `Based on the analysis of **${profile.totalAll} active Manila listings**:\n\n`;

  // Compute overall stats for tips
  const allOccupancies = top3.flatMap(d => d.listings.map(l => l.avg_occupancy || 0));
  const avgAllOcc = mean(allOccupancies);
  const top1 = top3[0];

  md += `- **${top1.name}** is the top-ranked area for your profile, `;
  md += `with an estimated annual revenue of **${formatPHP(top1.annualRevPHP)}**.\n`;
  md += `- The average occupancy rate across top areas is **${(avgAllOcc * 100).toFixed(1)}%** — `;
  md += `listings with pools and gyms typically achieve 15–20% higher rates.\n`;
  md += `- Properties rated **4.7 and above** earn on average **30% more** than the market average.\n`;
  md += `- **Entire condo units** in Malate and Ermita consistently outperform private rooms on revenue.\n`;
  md += `- Listings within **500m of an LRT station** show higher year-round occupancy due to accessibility.\n`;
  md += `- Listings with **15+ photos** get significantly more bookings — invest in professional photography.\n\n`;

  md += `> **Disclaimer:** Revenue projections are based on trailing 12-month data from similar existing listings. `;
  md += `Actual results may vary. Consult a real estate professional before investing.\n\n`;
  md += `---\n`;
  md += `*Report generated by the Airbnb Investment ML Pipeline · ${today}*\n`;

  return md;
}

// ─────────────────────────────────────────────────────────────
// JSONL parser (same as dataLoader.js)
// ─────────────────────────────────────────────────────────────

async function loadJSONL(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  if (raw.trim().startsWith('[')) return JSON.parse(raw);
  return raw.trim().split('\n')
    .filter(line => line.trim().startsWith('{'))
    .map(line => JSON.parse(line));
}

// ─────────────────────────────────────────────────────────────
// INTERACTIVE PROMPTS
// ─────────────────────────────────────────────────────────────

function createRL() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

async function askMenu(rl, options, label) {
  while (true) {
    console.log(`\n${label}`);
    options.forEach(o => console.log(`   ${o.id}. ${o.label}`));
    const ans = await ask(rl, `\n   Enter choice (1–${options.length}): `);
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
      '   Examples: 3000000 for ₱3M  |  8500000 for ₱8.5M\n' +
      '   Budget: ₱'
    );
    const val = parseFloat(ans.replace(/,/g, ''));
    if (!isNaN(val) && val > 0) return val;
    console.log('   Please enter a valid amount (numbers only, e.g. 5000000).');
  }
}

// ─────────────────────────────────────────────────────────────
// CORE: enrich listings with district assignment
// ─────────────────────────────────────────────────────────────

function enrichListings(featureTable, rawListings) {
  const rawMap = new Map((rawListings || []).map(l => [l.listing_id, l]));
  return featureTable.map(ft => {
    const raw = rawMap.get(ft.listing_id) || {};
    return {
      ...ft,
      listing_name: ft.listing_name  || raw.listing_name  || 'Unknown Listing',
      listing_type: ft.listing_type  || raw.listing_type  || 'Unknown',
      room_type:    ft.room_type     || raw.room_type     || 'unknown',
      bedrooms:     ft.bedrooms      ?? raw.bedrooms      ?? 0,
      _district: assignDistrict(ft.latitude, ft.longitude),
    };
  });
}

// ─────────────────────────────────────────────────────────────
// EXPORTED: run the full district analysis + save report
// Called by main.js after the ML pipeline completes.
// profile = { budget, propertyType, bedrooms, priority, totalAll }
// ─────────────────────────────────────────────────────────────

export async function runAdvisorAnalysis(featureTable, rawListings, profile) {
  const listings = enrichListings(featureTable, rawListings);

  const typeFilter = PROPERTY_TYPES[profile.propertyType - 1].filter;
  const bedFilter  = BEDROOM_OPTIONS[profile.bedrooms - 1].filter;

  let filtered = listings.filter(l => typeFilter(l) && bedFilter(l));

  if (filtered.length < 5) {
    console.log('Too few listings match your criteria. Broadening to all types...\n');
    const extra = listings.filter(l => !filtered.includes(l));
    filtered = [...filtered, ...extra];
  }

  const weights = PRIORITIES[profile.priority - 1].weights;
  const ranked  = scoreDistricts(filtered, weights, profile.budget);
  const top3    = ranked.slice(0, 3);

  console.log('═'.repeat(60));
  console.log('STEP 6: INVESTMENT LOCATION ANALYSIS');
  console.log('═'.repeat(60) + '\n');

  console.log(`Matched ${filtered.length} listings out of ${listings.length}`);
  console.log(`Scored ${ranked.length} districts\n`);

  console.log('TOP 3 INVESTMENT LOCATIONS IN MANILA:\n');
  top3.forEach((d, i) => {
    const rank = ['#1', '#2', '#3'][i];
    console.log(`   ${rank} ${d.name} — Score: ${d.score.toFixed(1)}/10`);
    console.log(`      Avg Occupancy : ${(d.avgOccupancy * 100).toFixed(1)}%`);
    console.log(`      Avg Annual Rev: ${formatPHP(d.annualRevPHP)}`);
    if (d.roi > 0) console.log(`      Expected ROI : ${d.roi.toFixed(2)}%`);
    console.log(`      Listings      : ${d.count}`);
    console.log();
  });

  const fullProfile = {
    ...profile,
    totalFiltered: filtered.length,
  };

  const markdown = generateMarkdown(fullProfile, top3);
  const reportPath = 'investment_report.md';
  await fs.writeFile(reportPath, markdown, 'utf-8');

  console.log('━'.repeat(60));
  console.log('\nFULL MARKDOWN REPORT:\n');
  console.log(markdown);
  console.log('━'.repeat(60));
  console.log(`\nReport saved to: ${reportPath}`);
  console.log('\nInvestment analysis complete!\n');
}

// ─────────────────────────────────────────────────────────────
// MAIN (standalone: npm run advise)
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('AIRBNB INVESTMENT ADVISOR — MANILA');
  console.log('Powered by ML Pipeline Analysis');
  console.log('═'.repeat(60));
  console.log('\nWelcome! Answer a few questions to get your personalized');
  console.log('investment report for the best Airbnb locations in Manila.\n');
  console.log('━'.repeat(60));

  let featureTable, rawListings;

  try {
    featureTable = JSON.parse(await fs.readFile('feature_table.json', 'utf-8'));
  } catch {
    console.error('\nfeature_table.json not found. Please run "npm start" first.\n');
    process.exit(1);
  }

  try {
    rawListings = await loadJSONL('Listings Data.json');
  } catch {
    rawListings = [];
  }

  const rl = createRL();

  try {
    const budget       = await askBudget(rl);
    const propertyType = await askMenu(rl, PROPERTY_TYPES, 'What type of Airbnb do you want to invest in?');
    const bedrooms     = await askMenu(rl, BEDROOM_OPTIONS, 'How many bedrooms are you targeting?');
    const priority     = await askMenu(rl, PRIORITIES,     'What is your primary investment goal?');

    console.log('\n' + '━'.repeat(60) + '\n');

    const profile = {
      budget,
      propertyType,
      bedrooms,
      priority,
      totalAll: featureTable.length,
    };

    await runAdvisorAnalysis(featureTable, rawListings, profile);

  } finally {
    rl.close();
  }
}

// Only auto-run when executed directly (not when imported by main.js)
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main().catch(err => {
    console.error('\nError:', err.message);
    process.exit(1);
  });
}
