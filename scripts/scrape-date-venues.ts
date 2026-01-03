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
  category: string;
  subcategory?: string;
  description?: string;
  url?: string;
  source: string;
  price_level?: number;
  romantic_score?: number;
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
    description: 'A 7-mile paved path for walkers and bicyclists with scenic views of the river and a covered bridge.',
    source: 'Distinctly Fayetteville',
    romantic_score: 4,
    good_for: ['active', 'day_date', 'walking', 'sunset'],
    vibe: ['outdoors', 'scenic', 'peaceful', 'active'],
    best_time: ['morning', 'afternoon', 'sunset']
  },
  {
    name: 'Carvers Creek State Park',
    address: '2505 Long Valley Rd, Spring Lake, NC 28390',
    category: 'nature',
    subcategory: 'state_park',
    description: 'Easy, flat trails through pine forests, with views of a millpond and the historic Rockefeller estate.',
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
    description: '80 acres of themed gardens and serene waterways. Perfect for romantic strolls.',
    source: 'Wanderlog',
    romantic_score: 5,
    good_for: ['walking', 'photos', 'quiet_conversation', 'first_date'],
    vibe: ['romantic', 'peaceful', 'scenic'],
    best_time: ['morning', 'afternoon']
  },
  {
    name: 'Fayetteville Rose Garden',
    category: 'nature',
    subcategory: 'garden',
    description: 'Features over 1,000 rose bushes, gazebos, and fountains. A beautiful and tranquil spot.',
    source: 'Dale Lets Travel',
    romantic_score: 5,
    good_for: ['walking', 'photos', 'quiet_conversation', 'romantic'],
    vibe: ['romantic', 'peaceful', 'scenic'],
    best_time: ['afternoon', 'sunset']
  },

  // --- ACTIVITIES & ENTERTAINMENT ---
  {
    name: "Greg's Pottery",
    address: '122 Maxwell St, Fayetteville, NC 28301',
    category: 'activity',
    subcategory: 'creative_class',
    description: 'A vibrant and inviting pottery painting experience with chill vibes and fair pricing.',
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
    good_for: ['playful', 'fun', 'first_date', 'groups', 'family_fun'],
    vibe: ['casual', 'fun', 'lively', 'nostalgic'],
    best_time: ['afternoon', 'evening']
  },
  {
    name: 'Main Event Fayetteville',
    address: '580 Cross Creek Mall, Fayetteville, NC 28303',
    category: 'activity',
    subcategory: 'entertainment_center',
    description: 'Modern entertainment complex with bowling, laser tag, arcade games, and a full restaurant/bar.',
    url: 'https://www.mainevent.com/fayetteville/',
    source: 'User Request',
    price_level: 2,
    romantic_score: 3,
    good_for: ['groups', 'fun', 'playful', 'rainy_day', 'boys_night_out', 'family_fun'],
    vibe: ['lively', 'modern', 'energetic'],
    best_time: ['evening', 'weekend']
  },
  {
    name: 'Escapology',
    address: '2770 Freedom Parkway Dr, Suite #4, Fayetteville, NC 28314',
    category: 'activity',
    subcategory: 'escape_room',
    description: 'Immersive private escape rooms. Work together to find clues, crack codes, and solve puzzles in 60 minutes.',
    url: 'https://www.escapology.com/en/fayetteville-nc',
    source: 'User Request',
    price_level: 3,
    romantic_score: 4,
    good_for: ['team-building', 'groups', 'adventure', 'problem_solving'],
    vibe: ['challenging', 'immersive', 'interactive'],
    best_time: ['afternoon', 'evening']
  },
  {
    name: 'Epic Fun Park',
    address: '1400 Walter Reed Rd, Fayetteville, NC 28304',
    category: 'activity',
    subcategory: 'amusement_center',
    description: 'Indoor park with a massive inflatable, ropes course, climbing walls, and arcade games.',
    url: 'https://epicfunpark.com/',
    source: 'User Request',
    price_level: 2,
    romantic_score: 2,
    good_for: ['fun', 'family_fun', 'active', 'playful'],
    vibe: ['energetic', 'lively'],
    best_time: ['afternoon', 'weekend']
  },
  {
    name: 'Urban Air Adventure Park',
    address: '2051 Skibo Rd, Fayetteville, NC 28314',
    category: 'activity',
    subcategory: 'trampoline_park',
    description: 'Ultimate indoor playground with trampolines, warrior courses, and other aerial adventures.',
    url: 'https://www.urbanair.com/north-carolina-fayetteville/',
    source: 'User Request',
    price_level: 2,
    romantic_score: 2,
    good_for: ['fun', 'family_fun', 'active'],
    vibe: ['energetic', 'lively'],
    best_time: ['afternoon', 'weekend']
  },
  {
    name: 'Game Show Live!',
    address: '3637 Sycamore Dairy Road, Fayetteville, NC 28303',
    category: 'activity',
    subcategory: 'entertainment_center',
    description: 'An interactive, live-hosted game show experience suitable for families, friends, and coworkers.',
    source: 'User Request',
    price_level: 2,
    romantic_score: 3,
    good_for: ['fun', 'groups', 'team-building', 'unique_experience'],
    vibe: ['interactive', 'lively', 'competitive'],
    best_time: ['evening']
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
    vibe: ['stylish', 'sophisticated', 'intimate', 'cozy'],
    best_time: ['evening', 'late_night']
  },
  {
    name: 'Dad Bod Dive Bar',
    address: '444 W Russell St, Ste 102, Fayetteville, NC 28301',
    category: 'drink',
    subcategory: 'dive_bar',
    description: 'Chill dive bar with a great patio, food truck, and friendly bartenders. Kid and pet friendly.',
    source: 'User Request',
    price_level: 1,
    romantic_score: 2,
    good_for: ['casual_drinks', 'boys_night_out', 'pet_friendly'],
    vibe: ['casual', 'relaxed', 'divey', 'friendly'],
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
    description: 'Large brewery with a communal atmosphere, restaurant, huge outdoor space, and regular events.',
    url: 'https://www.dirtbagales.com/',
    source: 'User Request',
    price_level: 2,
    romantic_score: 3,
    good_for: ['beer_lovers', 'groups', 'family_fun', 'outdoor'],
    vibe: ['lively', 'casual', 'family_friendly', 'social'],
    best_time: ['afternoon', 'weekend']
  },
  {
    name: 'Heckler Brewing Company',
    address: '5780 Ramsey Street, Suite #110, Fayetteville, NC 28311',
    category: 'drink',
    subcategory: 'brewery',
    description: 'Family-owned brewery focusing on high-quality, small-batch European-style craft beers and also offers food like pizza.',
    url: 'https://www.toasttab.com/heckler-brewing-company/v3',
    source: 'User Request',
    price_level: 2,
    romantic_score: 3,
    good_for: ['beer_lovers', 'casual_drinks', 'family_fun'],
    vibe: ['casual', 'local', 'family_friendly', 'community'],
    best_time: ['afternoon', 'evening']
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
    vibe: ['stylish', 'sophisticated', 'lively', 'outdoor'],
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
    name: 'Legends Pub',
    address: '4624 Bragg Blvd suite #1, Fayetteville, NC 28303',
    category: 'drink',
    subcategory: 'dive_bar',
    description: 'The oldest biker bar in town, offering a welcoming, laid-back atmosphere with pool tables and music bingo.',
    source: 'User Request',
    price_level: 1,
    romantic_score: 2,
    good_for: ['casual_drinks', 'boys_night_out', 'bikers'],
    vibe: ['divey', 'casual', 'community'],
    best_time: ['evening', 'late_night']
  },

  // --- FOOD ---
  {
    name: 'Ichikaku Japanese Restaurant',
    address: '350 North Eastern Boulevard, Suite 200, Fayetteville, NC 28301',
    category: 'food',
    subcategory: 'japanese',
    description: 'Authentic Japanese restaurant praised for its homemade ramen and tranquil, welcoming atmosphere.',
    url: 'https://ichikaku.com/',
    source: 'Google Search',
    price_level: 2,
    romantic_score: 3,
    good_for: ['dinner', 'casual_date', 'lunch'],
    vibe: ['authentic', 'calm', 'cozy'],
    best_time: ['lunch', 'dinner']
  },
  {
    name: "Mai's Kitchen",
    address: '329 Person St, Fayetteville, NC 28301',
    category: 'food',
    subcategory: 'thai',
    description: 'Authentic Thai cuisine in a cozy, quiet, and clean setting with warm hospitality.',
    url: 'https://maiskitchenthaicuisine.com/',
    source: 'Google Search',
    price_level: 2,
    romantic_score: 3,
    good_for: ['dinner', 'adventurous_eaters', 'casual_date'],
    vibe: ['cozy', 'authentic', 'quiet'],
    best_time: ['dinner']
  },
  {
    name: "Miller's Brew Coffee Shop",
    address: '1401 Morganton Rd, Fayetteville, NC 28305',
    category: 'drink',
    subcategory: 'coffee_shop',
    description: 'A heartwarming, community-focused coffee shop with a mission to employ individuals with disabilities.',
    url: 'https://www.millerscrew.com/millers-brew-coffee-shop',
    source: 'Google Search',
    price_level: 1,
    romantic_score: 3,
    good_for: ['casual_date', 'morning', 'supporting_local', 'coffee'],
    vibe: ['community', 'welcoming', 'cozy'],
    best_time: ['morning', 'afternoon']
  }
];
