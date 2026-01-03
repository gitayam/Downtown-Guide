/**
 * Venue Scoring Engine for Date Planning
 * Replaces random selection with intelligent scoring
 */

import { haversineDistance, Coordinates } from './geo';

export interface Venue {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  latitude: number;
  longitude: number;
  price_level?: number;
  average_cost?: number;
  romantic_score?: number;
  vibe?: string;        // JSON array string
  good_for?: string;    // JSON array string
  best_time?: string;   // JSON array string
  typical_duration?: number;
  rating?: number;
  review_count?: number;
}

export interface ScoringContext {
  vibes: string[];
  budgetRange: string;          // '$', '$$', '$$$'
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  eventType?: string;           // 'first_date', 'anniversary', etc.
  previousStop?: Coordinates;   // For proximity scoring
}

export interface VenueScore {
  venue: Venue;
  totalScore: number;
  breakdown: {
    vibeMatch: number;      // 0-30
    budgetFit: number;      // 0-20
    romanticScore: number;  // 0-15
    proximityBonus: number; // 0-15
    timeOfDayFit: number;   // 0-10
    eventTypeFit: number;   // 0-10
  };
}

/**
 * Main scoring function - calculates total score for a venue
 */
export function scoreVenue(venue: Venue, context: ScoringContext): VenueScore {
  const breakdown = {
    vibeMatch: calculateVibeScore(venue, context.vibes),
    budgetFit: calculateBudgetScore(venue, context.budgetRange),
    romanticScore: calculateRomanticScore(venue),
    proximityBonus: calculateProximityScore(venue, context.previousStop),
    timeOfDayFit: calculateTimeOfDayScore(venue, context.timeOfDay),
    eventTypeFit: calculateEventTypeScore(venue, context.eventType)
  };

  const totalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return { venue, totalScore, breakdown };
}

/**
 * Vibe matching (0-30 points)
 * Direct match = 30, partial = 15, category fallback = 5
 */
function calculateVibeScore(venue: Venue, userVibes: string[]): number {
  if (!userVibes || userVibes.length === 0) return 15; // Neutral

  const venueVibes = safeParseArray(venue.vibe);
  const venueGoodFor = safeParseArray(venue.good_for);
  const allVenueTags = [...venueVibes, ...venueGoodFor].map(v => v.toLowerCase());

  let score = 0;
  let matchCount = 0;

  for (const userVibe of userVibes) {
    const vibe = userVibe.toLowerCase();

    // Direct match
    if (allVenueTags.includes(vibe)) {
      matchCount++;
      continue;
    }

    // Semantic/partial matches - expanded for new vibes
    const semanticMatches: Record<string, string[]> = {
      // Original vibes
      'romantic': ['intimate', 'cozy', 'upscale', 'quiet', 'candlelit', 'date_night'],
      'adventurous': ['adventurous', 'thrilling', 'unique', 'active', 'outdoor', 'exciting'],
      'cultural': ['cultural', 'artsy', 'historic', 'educational', 'theatre', 'museum'],
      'fun': ['fun', 'lively', 'playful', 'energetic', 'games', 'entertainment'],
      'relaxed': ['relaxed', 'casual', 'chill', 'peaceful', 'quiet', 'laid_back'],
      'budget-friendly': ['casual', 'budget', 'affordable', 'cheap'],

      // New vibes
      'outdoors': ['outdoor', 'nature', 'hiking', 'park', 'trail', 'fresh_air', 'scenic'],
      'foodie': ['foodie', 'culinary', 'gourmet', 'farm_to_table', 'local', 'chef', 'tasting'],
      'artsy': ['artsy', 'art', 'creative', 'gallery', 'artistic', 'craft', 'studio'],
      'sporty': ['sporty', 'sports', 'athletic', 'active', 'fitness', 'games', 'competition'],
      'cozy': ['cozy', 'intimate', 'warm', 'comfortable', 'snug', 'homey', 'fireplace'],
      'upscale': ['upscale', 'fine_dining', 'elegant', 'sophisticated', 'luxury', 'premium'],
      'budget_friendly': ['casual', 'budget', 'affordable', 'cheap', 'free', 'low_cost']
    };

    const synonyms = semanticMatches[vibe] || [];
    if (synonyms.some(syn => allVenueTags.some(tag => tag.includes(syn)))) {
      matchCount += 0.5;
    }
  }

  // Calculate score based on match ratio
  const matchRatio = matchCount / userVibes.length;
  if (matchRatio >= 0.75) score = 30;
  else if (matchRatio >= 0.5) score = 22;
  else if (matchRatio >= 0.25) score = 15;
  else if (matchRatio > 0) score = 8;
  else score = 3; // Baseline

  return score;
}

/**
 * Budget fit (0-20 points)
 * Exact match = 20, one tier off = 12, two tiers = 5
 */
function calculateBudgetScore(venue: Venue, budgetRange: string): number {
  const budgetTier = budgetRange === '$$$' ? 3 : budgetRange === '$$' ? 2 : 1;
  const venueTier = venue.price_level || 2;

  const diff = Math.abs(budgetTier - venueTier);

  if (diff === 0) return 20;
  if (diff === 1) return 12;
  if (diff === 2) return 5;
  return 2;
}

/**
 * Romantic score (0-15 points)
 * Direct from database, scaled
 */
function calculateRomanticScore(venue: Venue): number {
  const score = venue.romantic_score || 3;
  return score * 3; // 1-5 becomes 3-15
}

/**
 * Proximity bonus (0-15 points)
 * Rewards walkable venues when there's a previous stop
 */
function calculateProximityScore(venue: Venue, previousStop?: Coordinates): number {
  if (!previousStop || !venue.latitude || !venue.longitude) {
    return 8; // Neutral when no previous stop
  }

  const distance = haversineDistance(previousStop, {
    latitude: venue.latitude,
    longitude: venue.longitude
  });

  if (distance < 0.3) return 15;      // < 300m
  if (distance < 0.5) return 12;      // < 500m
  if (distance < 1.0) return 10;      // < 1km
  if (distance < 1.5) return 7;       // < 1.5km
  if (distance < 2.5) return 4;       // < 2.5km
  return 1;                           // Far away
}

/**
 * Time of day fit (0-10 points)
 */
function calculateTimeOfDayScore(venue: Venue, timeOfDay?: string): number {
  if (!timeOfDay) return 5; // Neutral

  const bestTimes = safeParseArray(venue.best_time);
  if (bestTimes.length === 0) return 5;

  if (bestTimes.includes(timeOfDay)) return 10;

  // Partial matches
  if (timeOfDay === 'evening' && bestTimes.includes('afternoon')) return 6;
  if (timeOfDay === 'afternoon' && bestTimes.includes('morning')) return 6;

  return 2;
}

/**
 * Event type fit (0-10 points)
 * Matches venue good_for with event type
 */
function calculateEventTypeScore(venue: Venue, eventType?: string): number {
  if (!eventType) return 5; // Neutral

  const goodFor = safeParseArray(venue.good_for);
  if (goodFor.length === 0) return 5;

  // Map event type IDs to matching terms in venue good_for
  const eventTypeMap: Record<string, string[]> = {
    // Legacy formats (for backwards compatibility)
    'Date Night': ['date_night', 'dinner', 'romantic', 'drinks'],
    'First Date': ['first_date', 'casual', 'conversation', 'coffee'],
    'Anniversary': ['anniversary', 'special_occasion', 'romantic', 'fine_dining'],
    'Friends Night': ['friends', 'fun', 'drinks', 'games'],
    'Family': ['family', 'kid_friendly', 'casual'],

    // New event type IDs
    'date_night': ['date_night', 'dinner', 'romantic', 'drinks', 'intimate'],
    'first_date': ['first_date', 'casual', 'conversation', 'coffee', 'relaxed'],
    'anniversary': ['anniversary', 'special_occasion', 'romantic', 'fine_dining', 'upscale'],
    'friends_night': ['friends', 'fun', 'drinks', 'games', 'group', 'social'],
    'family_outing': ['family', 'kid_friendly', 'casual', 'all_ages', 'outdoor'],
    'solo_adventure': ['solo', 'exploration', 'self_care', 'meditation', 'nature'],
    'casual_hangout': ['casual', 'coffee', 'relaxed', 'chill', 'laid_back'],
    'special_occasion': ['special_occasion', 'celebration', 'birthday', 'milestone', 'fine_dining'],
    'active_day': ['active', 'outdoor', 'sports', 'hiking', 'adventure', 'fitness'],
    'chill_day': ['chill', 'relaxed', 'spa', 'quiet', 'peaceful', 'low_key']
  };

  const matchTerms = eventTypeMap[eventType] || [];
  const hasMatch = matchTerms.some(term =>
    goodFor.some(g => g.toLowerCase().includes(term))
  );

  return hasMatch ? 10 : 3;
}

/**
 * Select best venue from candidates using weighted random
 * Top-N weighted selection prevents always picking #1
 */
export function selectBestVenue(
  candidates: Venue[],
  context: ScoringContext,
  excludeIds: string[] = [],
  topN: number = 5
): Venue | null {
  // Filter and score
  const scored = candidates
    .filter(v => !excludeIds.includes(v.id))
    .filter(v => v.latitude && v.longitude) // Must have coordinates
    .map(v => scoreVenue(v, context))
    .sort((a, b) => b.totalScore - a.totalScore);

  if (scored.length === 0) return null;

  // Take top N and do weighted random selection
  const top = scored.slice(0, Math.min(topN, scored.length));

  // Add small random factor to avoid always picking #1
  const withJitter = top.map(s => ({
    ...s,
    adjustedScore: s.totalScore + Math.random() * 10
  }));

  // Sort by adjusted score and pick top
  withJitter.sort((a, b) => b.adjustedScore - a.adjustedScore);
  return withJitter[0].venue;
}

/**
 * Get multiple venues, avoiding repeats, using scoring
 */
export function selectMultipleVenues(
  candidates: Venue[],
  context: ScoringContext,
  count: number,
  excludeIds: string[] = []
): Venue[] {
  const selected: Venue[] = [];
  const excluded = [...excludeIds];
  let currentContext = { ...context };

  for (let i = 0; i < count; i++) {
    const venue = selectBestVenue(candidates, currentContext, excluded);
    if (!venue) break;

    selected.push(venue);
    excluded.push(venue.id);

    // Update context with previous stop for proximity scoring
    currentContext = {
      ...currentContext,
      previousStop: {
        latitude: venue.latitude,
        longitude: venue.longitude
      }
    };
  }

  return selected;
}

/**
 * Safe JSON array parsing
 */
function safeParseArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
