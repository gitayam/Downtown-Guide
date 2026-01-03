/**
 * Curated Venues for Perfect Date Planning
 * 
 * This file contains a hand-curated list of venues in and around Fayetteville, NC,
 * enriched with metadata to power the "Perfect Date" planner.
 */

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
  price_level?: number; // 1-4
  romantic_score?: number; // 1-5
  vibe?: string[];
  good_for?: string[];
  features?: string[];
  best_time?: string[];
}

// --- Data ---

export const CURATED_VENUES: EnrichedVenue[] = [
  // --- HIKING / NATURE ---
  {
    name: 'Cape Fear River Trail',
    category: 'nature',
    subcategory: 'hiking_trail',
    description: 'A 7-mile paved path suitable for walkers, runners, and bicyclists, with scenic views of trees, plants, wildlife, and the river through marshes, wetlands, and woodlands. Features a covered bridge.',
    source: 'Distinctly Fayetteville',
    romantic_score: 4,
    good_for: ['active', 'day_date', 'walking'],
    vibe: ['outdoors', 'scenic', 'peaceful'],
    best_time: ['morning', 'afternoon', 'sunset']
  },
  {
    name: 'Carvers Creek State Park',
    address: '2505 Long Valley Rd, Spring Lake, NC 28390',
    category: 'nature',
    subcategory: 'state_park',
    description: 'Known for its easy, flat trails through pine forests, offering beautiful views of a millpond and the historic Rockefeller estate.',
    source: 'The Katie Show Blog',
    romantic_score: 4,
    good_for: ['picnic', 'history_buffs', 'quiet_walk'],
    vibe: ['outdoors', 'peaceful', 'historic'],
    best_time: ['morning', 'afternoon']
  },
  {
    name: 'Cape Fear Botanical Garden',
    address: '536 N Eastern Blvd, Fayetteville, NC 28301',
    category: 'nature',
    subcategory: 'botanical_garden',
    description: 'Spanning 80 acres overlooking the Cape Fear River, featuring themed gardens and serene waterways. Perfect for romantic strolls.',
    source: 'Wanderlog',
    romantic_score: 5,
    good_for: ['walking', 'photos', 'quiet_conversation', 'first_date'],
    vibe: ['romantic', 'peaceful', 'scenic'],
    best_time: ['morning', 'afternoon']
  },

  // --- ACTIVITIES & ENTERTAINMENT ---
  {
    name: 'ZipQuest Waterfall & Treetop Adventure',
    address: '1933 Doc Bennett Rd, Fayetteville, NC 28306',
    category: 'activity',
    subcategory: 'zipline',
    description: 'Ziplining tours with breathtaking views of waterfalls and treetops. "NightQuest" available for evening dates under the stars.',
    source: 'Wanderlog',
    price_level: 3,
    romantic_score: 4,
    good_for: ['adventure', 'thrill_seekers', 'memorable_date'],
    vibe: ['adventurous', 'exciting', 'outdoors'],
    best_time: ['afternoon', 'evening']
  },
  {
    name: 'The Climbing Place',
    address: '436 W Russell St, Fayetteville, NC 28301',
    category: 'activity',
    subcategory: 'climbing',
    description: 'Indoor rock climbing facility for an active and challenging date.',
    source: 'Wordpress Blog',
    price_level: 2,
    romantic_score: 3,
    good_for: ['adventure', 'active', 'trust_building', 'first_date'],
    vibe: ['active', 'challenging', 'fun'],
    best_time: ['afternoon', 'evening']
  },
  {
    name: "Greg's Pottery",
    address: '122 Maxwell St, Fayetteville, NC 28301',
    category: 'activity',
    subcategory: 'creative_class',
    description: 'A vibrant and inviting pottery painting experience for all ages. Known for chill vibes and fair pricing.',
    url: 'https://www.facebook.com/gregspottery/',
    source: 'Wanderlog',
    price_level: 2,
    romantic_score: 4,
    good_for: ['creative_date', 'hands-on', 'relaxed', 'first_date'],
    vibe: ['creative', 'relaxed', 'cozy'],
    best_time: ['afternoon', 'evening']
  },
  {
    name: 'Putt-Putt Fun Center',
    address: '3311 Footbridge Ln, Fayetteville, NC 28306',
    category: 'activity',
    subcategory: 'entertainment_center',
    description: 'Classic fun with mini-golf, go-karts, laser tag, and an arcade.',
    url: 'https://puttputt.com/fayetteville-nc/',
    source: 'User Request',
    price_level: 2,
    romantic_score: 3,
    good_for: ['playful', 'fun', 'first_date', 'groups'],
    vibe: ['casual', 'fun', 'lively'],
    best_time: ['afternoon', 'evening']
  },
  {
    name: 'Main Event Fayetteville',
    address: '580 Cross Creek Mall, Fayetteville, NC 28303',
    category: 'activity',
    subcategory: 'entertainment_center',
    description: 'Modern entertainment complex with state-of-the-art bowling, laser tag, arcade games, and a full restaurant/bar.',
    url: 'https://www.mainevent.com/fayetteville/',
    source: 'User Request',
    price_level: 2,
    romantic_score: 3,
    good_for: ['groups', 'fun', 'playful', 'rainy_day', 'boys_night_out'],
    vibe: ['lively', 'modern', 'energetic'],
    best_time: ['evening', 'weekend']
  },
  {
    name: 'Escapology',
    address: '2770 Freedom Parkway Dr, Suite #4, Fayetteville, NC 28314',
    category: 'activity',
    subcategory: 'escape_room',
    description: 'Immersive and private escape room experiences. Work together to find clues, crack codes, and solve puzzles in 60 minutes.',
    url: 'https://www.escapology.com/en/fayetteville-nc',
    source: 'User Request',
    price_level: 3,
    romantic_score: 4,
    good_for: ['team-building', 'groups', 'adventure', 'problem_solving'],
    vibe: ['challenging', 'immersive', 'interactive'],
    best_time: ['afternoon', 'evening']
  },
  
  // --- BARS & NIGHTLIFE ---
  {
    name: 'The Sip Room',
    address: '106 Hay Street, Fayetteville, NC 28301',
    category: 'drink',
    subcategory: 'wine_bar',
    description: 'Stylish bar with great reviews, quality cocktails, a diverse selection of wines, and live jazz music.',
    url: 'https://www.thesiproomnc.com/',
    source: 'User Request',
    price_level: 3,
    romantic_score: 5,
    good_for: ['girls_night_out', 'romantic', 'cocktails', 'wine_lovers'],
    vibe: ['stylish', 'sophisticated', 'intimate'],
    best_time: ['evening', 'late_night']
  },
  {
    name: 'Dad Bod Dive Bar',
    address: '444 W Russell St, Ste 102, Fayetteville, NC 28301',
    category: 'drink',
    subcategory: 'dive_bar',
    description: 'Chill dive bar in an awesome building with a great patio, food truck, and friendly bartenders. Kid and pet friendly.',
    source: 'User Request',
    price_level: 1,
    romantic_score: 2,
    good_for: ['casual_drinks', 'boys_night_out', 'pet_friendly'],
    vibe: ['casual', 'relaxed', 'divey'],
    best_time: ['afternoon', 'evening']
  },
  {
    name: 'Charlie Mike’s Pub',
    address: '195 Starpoint Drive, Fayetteville, NC 28303',
    category: 'drink',
    subcategory: 'pub',
    description: 'Military-themed pub with a welcoming atmosphere, food, pool tables, and live music or karaoke.',
    source: 'User Request',
    price_level: 1,
    romantic_score: 2,
    good_for: ['casual_drinks', 'live_music', 'military', 'boys_night_out'],
    vibe: ['casual', 'social', 'military-friendly'],
    best_time: ['evening', 'late_night']
  },
  {
    name: 'Dirtbag Ales Brewery & Taproom',
    address: '5435 Corporation Dr, Hope Mills, NC 28348',
    category: 'drink',
    subcategory: 'brewery',
    description: 'Large brewery with a communal atmosphere, a great restaurant (Napkins), huge outdoor space, playground, and regular events like farmers markets and live music.',
    url: 'https://www.dirtbagales.com/',
    source: 'User Request',
    price_level: 2,
    romantic_score: 3,
    good_for: ['beer_lovers', 'groups', 'family_fun', 'outdoor'],
    vibe: ['lively', 'casual', 'family_friendly'],
    best_time: ['afternoon', 'weekend']
  },
  {
    name: 'Heckler Brewing Company',
    address: '5780 Ramsey Street, Suite #110, Fayetteville, NC 28311',
    category: 'drink',
    subcategory: 'brewery',
    description: 'Family-owned brewery focusing on high-quality, small-batch European-style craft beers and also offers food like pizza.',
    source: 'User Request',
    price_level: 2,
    romantic_score: 3,
    good_for: ['beer_lovers', 'casual_drinks'],
    vibe: ['casual', 'local'],
    best_time: ['evening']
  },
  {
    name: 'Dirty Whiskey Craft Cocktail Bar',
    address: '5431 Corporation Drive, Hope Mills, NC 28348',
    category: 'drink',
    subcategory: 'cocktail_bar',
    description: 'Craft cocktail bar with a massive outdoor patio, focusing on in-house fusions and locally sourced North Carolina spirits.',
    url: 'https://dirtywhiskeyinc.com/',
    source: 'User Request',
    price_level: 3,
    romantic_score: 4,
    good_for: ['cocktails', 'girls_night_out', 'sophisticated_drinks'],
    vibe: ['stylish', 'sophisticated', 'lively'],
    best_time: ['evening', 'late_night']
  },
  {
    name: 'CRU Lounge Fayetteville',
    address: '114 Gillespie Street, Fayetteville, NC 28301',
    category: 'drink',
    subcategory: 'lounge',
    description: 'Vibrant nightclub and lounge with live music, drink specials, craft cocktails, elevated bar plates, and hookah options.',
    source: 'User Request',
    price_level: 3,
    romantic_score: 4,
    good_for: ['girls_night_out', 'nightlife', 'dancing'],
    vibe: ['lively', 'upscale', 'modern'],
    best_time: ['late_night']
  },
  {
    name: 'On-After Bar & Grill',
    address: '3004 Bragg Blvd, Fayetteville, NC 28303',
    category: 'food',
    subcategory: 'bar_and_grill',
    description: 'A clean dive bar feel with a lively and vibrant atmosphere. Known for karaoke, pool leagues, and an affordable all-day breakfast.',
    source: 'User Request',
    price_level: 1,
    romantic_score: 2,
    good_for: ['casual_drinks', 'karaoke', 'late_night_food'],
    vibe: ['divey', 'lively', 'social'],
    best_time: ['evening', 'late_night']
  },
  {
    name: 'Group Therapy Pub & Playground',
    address: '1916 Skibo Road, Fayetteville, NC 28314',
    category: 'activity',
    subcategory: 'entertainment_center',
    description: 'Entertainment venue with mini-golf, axe throwing, duckpin bowling, and a self-serve beer wall.',
    url: 'https://grouptherapy.fun/fayetteville/',
    source: 'User Request',
    price_level: 2,
    romantic_score: 3,
    good_for: ['groups', 'fun', 'playful', 'interactive', 'girls_night_out', 'boys_night_out'],
    vibe: ['lively', 'social', 'fun'],
    best_time: ['evening']
  },

  // --- EXISTING VENUES (already in list, no need to re-add) ---
  // Archives, White Rabbit, District House of Taps, Circa 1800, 
  // Anchor Allie's, Carvers Creek, ASOM, Cape Fear Botanical Garden,
  // Fascinate-U, The Climbing Place
];