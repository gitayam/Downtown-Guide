/**
 * Import scraped venues into D1
 *
 * Reads scripts/scraped_venues_blogs.json
 * Geocodes missing locations using Nominatim (OpenStreetMap)
 * Generates SQL for insertion
 *
 * Usage:
 *   npx tsx scripts/import-scraped-venues.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface EnrichedVenue {
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  source: string;
  price_level?: number;
  romantic_score?: number;
  vibe?: string[];
  good_for?: string[];
  features?: string[];
  url?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

function slugify(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Fayetteville, NC')}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DowntownGuideBot/1.0' }
    });
    const data = await res.json() as NominatimResult[];
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (err) {
    console.warn(`Geocoding failed for ${query}`);
    return null;
  }
}

async function main() {
  const jsonPath = path.join(__dirname, 'scraped_venues_blogs.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('No scraped data found. Run scraper first.');
    return;
  }

  const venues = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as EnrichedVenue[];
  const sqlStatements: string[] = [];

  console.log(`Processing ${venues.length} venues...`);

  for (const venue of venues) {
    const id = slugify(venue.name);
    console.log(`  Processing ${venue.name} (${id})...`);

    // Geocode
    let lat = null;
    let lng = null;
    
    // Manual overrides for known tricky spots
    if (id === 'cape_fear_river_trail') { lat = 35.122; lng = -78.868; } // Near Jordan Soccer Complex
    else if (id === 'carvers_creek_state_park') { lat = 35.216; lng = -78.966; }
    else if (id === 'raven_rock_state_park') { lat = 35.459; lng = -78.912; }
    else {
      // Try geocoding
      const coords = await geocode(venue.name);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
      // Be polite to Nominatim
      await new Promise(r => setTimeout(r, 1000));
    }

    // Build SQL
    // Columns: id, name, category, subcategory, description, source, price_level, romantic_score, 
    // good_for (json), vibe (json), safety_info, latitude, longitude
    
    const escape = (s: string | undefined) => s ? `'${s.replace(/'/g, "''")}'` : 'NULL';
    
    const cols = [
      'id', 'name', 'category', 'subcategory', 'description', 'data_source',
      'price_level', 'romantic_score', 'good_for', 'vibe', 'safety_info',
      'latitude', 'longitude', 'city', 'state'
    ];
    
    const goodForJson = venue.good_for ? JSON.stringify(venue.good_for) : '[]';
    const vibeJson = venue.vibe ? JSON.stringify(venue.vibe) : '[]';
    const featuresJson = venue.features ? JSON.stringify(venue.features) : '[]'; // Map to something? or put in safety_info/notes
    
    // Append features to safety_info/notes if relevant or just dump to new columns?
    // We added 'outdoor_seating' etc. in migration. Let's map a few.
    const outdoor = venue.features?.includes('outdoor_seating') || venue.features?.includes('outdoor_patio') ? 1 : 0;

    const vals = [
      `'${id}'`,
      escape(venue.name),
      escape(venue.category),
      escape(venue.subcategory),
      escape(venue.description),
      `'scraped_blog'`,
      venue.price_level || 'NULL',
      venue.romantic_score || 'NULL',
      `'${goodForJson}'`,
      `'${vibeJson}'`,
      `'Derived from features: ${featuresJson}'`, // Storing extra features in safety_info for now/notes
      lat || 'NULL',
      lng || 'NULL',
      `'Fayetteville'`,
      `'NC'`
    ];

    const sql = `INSERT OR REPLACE INTO venues (${cols.join(', ')}, outdoor_seating) VALUES (${vals.join(', ')}, ${outdoor});`;
    sqlStatements.push(sql);
  }

  const outSqlPath = path.join(__dirname, 'import_scraped_venues.sql');
  fs.writeFileSync(outSqlPath, sqlStatements.join('\n'));
  console.log(`\nGenerated SQL at ${outSqlPath}`);
  console.log('Run: npx wrangler d1 execute downtown-events --local --file=scripts/import_scraped_venues.sql');
}

main().catch(console.error);
