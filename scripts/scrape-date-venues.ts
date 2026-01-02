/**
 * Scrape venues for Perfect Date planning
 * 
 * Sources:
 * - Local Blogs/Guides (Simulated/Hardcoded for now due to anti-bot/redirects)
 * - Search Results Curated Data
 * 
 * Usage:
 *   npx tsx scripts/scrape-date-venues.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// --- Interfaces ---

interface EnrichedVenue {
  name: string;
  address?: string;
  category: string; // 'food', 'drink', 'activity', 'nature', 'culture'
  subcategory?: string; // 'italian', 'hiking_trail', 'museum'
  description?: string;
  url?: string; // Source URL or official URL
  source: string;
  // Estimated/Scraped fields
  price_level?: number;
  romantic_score?: number;
  vibe?: string[];
  good_for?: string[];
  features?: string[]; // 'outdoor_seating', 'live_music'
}

// --- Data ---

const CURATED_VENUES: EnrichedVenue[] = [
  // --- HIKING / NATURE ---
  {
    name: 'Cape Fear River Trail',
    category: 'nature',
    subcategory: 'hiking_trail',
    description: 'A 7-mile paved path suitable for walkers, runners, and bicyclists, with scenic views of trees, plants, wildlife, and the river through marshes, wetlands, and woodlands. Features a covered bridge.',
    source: 'Distinctly Fayetteville',
    romantic_score: 4,
    good_for: ['active', 'day_date', 'walking'],
    features: ['paved', 'scenic_views']
  },
  {
    name: 'Carvers Creek State Park',
    category: 'nature',
    subcategory: 'state_park',
    description: 'Known for its easy, flat, and wide trails through pine forests at the Long Valley Farm Access, offering beautiful views of a millpond and historical Rockefeller estate.',
    source: 'The Katie Show Blog',
    romantic_score: 4,
    good_for: ['picnic', 'history_buffs', 'quiet_walk'],
    features: ['picnic_area', 'historic_site']
  },
  {
    name: 'Raven Rock State Park',
    category: 'nature',
    subcategory: 'state_park',
    description: 'Renowned for its dramatic rock formations and the challenging Raven Rock Trail (3 miles). Culminates in a breathtaking overlook of the Cape Fear River.',
    source: 'The Katie Show Blog',
    romantic_score: 5,
    good_for: ['adventure', 'views', 'hiking'],
    features: ['scenic_overlook', 'challenging_hike']
  },
  {
    name: 'Cape Fear Botanical Garden',
    category: 'nature',
    subcategory: 'botanical_garden',
    description: 'Spanning 80 acres overlooking the Cape Fear River, featuring themed gardens, serene waterways, an 1800s farmhouse, and a tobacco barn. Perfect for romantic strolls.',
    source: 'Wanderlog',
    romantic_score: 5,
    good_for: ['walking', 'photos', 'quiet_conversation'],
    features: ['gardens', 'historic_buildings']
  },
  {
    name: 'J. Bayard Clark Park & Nature Center',
    category: 'nature',
    subcategory: 'nature_center',
    description: 'Features nature trails along the Cape Fear River, a small waterfall (Clark Park Falls), and live animal exhibits.',
    source: 'Distinctly Fayetteville',
    romantic_score: 3,
    good_for: ['casual_walk', 'learning'],
    features: ['waterfall', 'trails']
  },
  
  // --- ACTIVITIES ---
  {
    name: 'ZipQuest Waterfall & Treetop Adventure',
    category: 'activity',
    subcategory: 'zipline',
    description: 'Ziplining tours with breathtaking views of waterfalls and treetops. "NightQuest" available for evening dates under the stars.',
    source: 'Wanderlog',
    romantic_score: 4,
    good_for: ['adventure', 'thrill_seekers', 'memorable_date'],
    features: ['night_tours', 'waterfall_views']
  },
  {
    name: 'Fascinate-U Children\'s Museum',
    category: 'activity',
    subcategory: 'museum',
    description: 'Hands-on museum allowing interaction through creative role-playing. Great for playful dates or parents.',
    source: 'Wanderlog',
    romantic_score: 2,
    good_for: ['family_date', 'playful'],
    features: ['interactive']
  },
  {
    name: 'Sweet Tea Shakespeare',
    category: 'culture',
    subcategory: 'theatre',
    description: 'Performs Shakespearean plays and other productions, often outdoors with live music and a festive atmosphere.',
    source: 'Wanderlog',
    romantic_score: 5,
    good_for: ['culture', 'theatre', 'outdoor_performance'],
    features: ['live_music', 'outdoor_seating']
  },
  
  // --- FOOD & DRINK (Romantic) ---
  {
    name: 'Circa 1800',
    category: 'food',
    subcategory: 'southern',
    description: 'Locally focused new Southern cuisine in a cozy and unpretentious setting downtown.',
    source: 'Wanderlog',
    price_level: 3,
    romantic_score: 5,
    good_for: ['dinner', 'anniversary', 'foodies'],
    features: ['local_food', 'cozy']
  },
  {
    name: 'The Wine Café',
    category: 'drink',
    subcategory: 'wine_bar',
    description: 'Downtown spot with live jazz and a selection of wines, ideal for a relaxed and sophisticated evening.',
    source: 'Wanderlog',
    price_level: 2,
    romantic_score: 4,
    good_for: ['drinks', 'live_music', 'conversation'],
    features: ['live_music', 'wine_selection']
  },
  {
    name: 'Antonella\'s Italian Ristorante',
    category: 'food',
    subcategory: 'italian',
    description: 'Cozy Italian spot downtown known for intimate atmosphere and classic dishes.',
    source: 'Local Knowledge',
    price_level: 2,
    romantic_score: 4,
    good_for: ['dinner', 'first_date'],
    features: ['indoor_seating', 'intimate']
  },
  {
    name: 'Luigi\'s Italian Chophouse',
    category: 'food',
    subcategory: 'italian',
    description: 'Upscale Italian dining and steakhouse, popular for anniversaries and special occasions.',
    source: 'Local Knowledge',
    price_level: 3,
    romantic_score: 4,
    good_for: ['anniversary', 'fine_dining'],
    features: ['outdoor_patio', 'full_bar']
  },
  {
    name: 'Gaston Brewing Company',
    category: 'drink',
    subcategory: 'brewery',
    description: 'Downtown brewery with a great food menu and lively atmosphere.',
    source: 'Local Knowledge',
    price_level: 2,
    romantic_score: 3,
    good_for: ['casual_date', 'beer_lovers'],
    features: ['craft_beer', 'outdoor_seating']
  },
  {
    name: 'Blue Moon Café',
    category: 'food',
    subcategory: 'cafe',
    description: 'Eclectic downtown cafe with outdoor patio, great for lunch or casual dinner.',
    source: 'Local Knowledge',
    price_level: 2,
    romantic_score: 3,
    good_for: ['lunch_date', 'casual'],
    features: ['outdoor_patio']
  }
];

// --- Main Execution ---

async function main() {
  console.log('Starting venue aggregation...');
  
  // In a real scenario, we would merge these with scraped results
  // For now, we use the curated list based on our research
  const allVenues = [...CURATED_VENUES];

  // Deduplicate by name
  const uniqueVenues = new Map<string, EnrichedVenue>();
  for (const v of allVenues) {
    const key = v.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!uniqueVenues.has(key)) {
      uniqueVenues.set(key, v);
    }
  }

  const results = Array.from(uniqueVenues.values());
  console.log(`\nTotal Unique Venues: ${results.length}`);

  // Save to JSON
  const outputPath = path.join(__dirname, 'scraped_venues_blogs.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Saved data to ${outputPath}`);
}

main().catch(console.error);
