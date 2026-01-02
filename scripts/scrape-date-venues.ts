/**
 * Scrape venues for Perfect Date planning
 * 
 * Sources:
 * - Google Places API (Restaurants, Bars, Entertainment, Parks)
 * - Yelp Fusion API (Reviews, Price, Photos)
 * - Local Blogs/Reddit (Unstructured data)
 * 
 * Usage:
 *   export GOOGLE_PLACES_API_KEY=...
 *   npx tsx scripts/scrape-date-venues.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---

const CONFIG = {
  location: {
    lat: 35.0527,
    lng: -78.8784, // Downtown Fayetteville
  },
  radius: 15000, // 15km
  googleTypes: [
    'restaurant', 'bar', 'cafe', 'park', 'movie_theater', 
    'bowling_alley', 'art_gallery', 'museum', 'tourist_attraction'
  ],
  unstructuredSources: [
    { name: 'Reddit r/Fayetteville', url: 'https://www.reddit.com/r/Fayetteville/search/?q=date+ideas' },
    { name: 'Fayetteville Flyer', url: 'https://www.fayettevilleflyer.com' } // Example
  ]
};

// --- Interfaces ---

interface RawVenue {
  name: string;
  address?: string;
  location: { lat: number; lng: number };
  types: string[]; // ['restaurant', 'point_of_interest']
  rating?: number;
  user_ratings_total?: number;
  price_level?: number; // 0-4
  place_id: string; // Google Place ID
  source: 'google' | 'yelp' | 'manual';
  photos?: string[];
  website?: string;
  phone?: string;
  hours?: string[]; // Raw hours text
}

interface EnrichedVenue extends RawVenue {
  // Date Planning Metadata
  category: string; // 'food', 'drink', 'activity', 'nature'
  subcategory?: string;
  romantic_score?: number; // 1-5
  vibe?: string[]; // ['cozy', 'loud']
  best_time?: string[]; // ['evening', 'weekend']
  good_for?: string[]; // ['first_date', 'groups']
  parking_info?: string;
  safety_info?: string; // 'well-lit', 'busy'
}

// --- Scrapers ---

class GooglePlacesScraper {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchNearby(type: string): Promise<RawVenue[]> {
    if (!this.apiKey) {
      console.warn('⚠️ No Google API Key provided. Skipping Google fetch.');
      return [];
    }
    console.log(`fetching ${type} from Google Places...`);
    // Placeholder for actual API call
    // const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${CONFIG.location.lat},${CONFIG.location.lng}&radius=${CONFIG.radius}&type=${type}&key=${this.apiKey}`;
    return [];
  }

  async getDetails(placeId: string): Promise<Partial<RawVenue>> {
    if (!this.apiKey) return {};
    // Placeholder for Place Details API
    return {};
  }
}

class UnstructuredScraper {
  async scrapeReddit(): Promise<RawVenue[]> {
    console.log('Scraping Reddit for hidden gems...');
    // Placeholder: Fetch Reddit threads, parse comments for venue names
    // This would likely need an LLM or regex to extract venue names from text
    return [];
  }
}

// --- Processing ---

function mapGoogleTypeToCategory(types: string[]): string {
  if (types.includes('park') || types.includes('tourist_attraction')) return 'nature';
  if (types.includes('restaurant') || types.includes('food')) return 'food';
  if (types.includes('bar') || types.includes('night_club')) return 'drink';
  if (types.includes('movie_theater') || types.includes('bowling_alley')) return 'activity';
  return 'other';
}

function calculateRomanticScore(venue: RawVenue): number {
  // Heuristic based on price, rating, and types
  let score = 3; // Start average
  if (venue.price_level && venue.price_level >= 3) score += 1;
  if (venue.rating && venue.rating > 4.5) score += 1;
  if (venue.types.includes('fast_food')) score = 1;
  return Math.min(5, Math.max(1, score));
}

// --- Main ---

async function main() {
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY || '';
  const scraper = new GooglePlacesScraper(googleApiKey);
  const unstructured = new UnstructuredScraper();

  const allVenues: EnrichedVenue[] = [];

  // 1. Fetch from Google
  for (const type of CONFIG.googleTypes) {
    const rawVenues = await scraper.fetchNearby(type);
    for (const raw of rawVenues) {
      const enriched: EnrichedVenue = {
        ...raw,
        category: mapGoogleTypeToCategory(raw.types),
        romantic_score: calculateRomanticScore(raw),
        vibe: [], // To be populated by manual curation or LLM
        good_for: []
      };
      allVenues.push(enriched);
    }
  }

  // 2. Fetch Unstructured
  const hiddenGems = await unstructured.scrapeReddit();
  // ... process hidden gems ...

  // 3. Output Results
  console.log(`Found ${allVenues.length} potential date venues.`);
  
  // Save to JSON for manual review/curation
  const outputPath = path.join(__dirname, 'scraped_venues_raw.json');
  fs.writeFileSync(outputPath, JSON.stringify(allVenues, null, 2));
  console.log(`Saved raw data to ${outputPath}`);
}

main().catch(console.error);
