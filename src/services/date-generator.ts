
import { D1Database } from '@cloudflare/workers-types';
import { fetchEvents } from '../lib/events';

export interface DatePreferences {
  event_type: string;
  budget_range: string; // $, $$, $$$
  vibes: string[];
  duration_hours: number;
  date?: string;
  time_of_day?: 'morning' | 'afternoon' | 'evening';
  start_time?: string; // "18:00"
}

export interface DatePlan {
  id: string;
  title: string;
  totalDuration: number;
  estimatedCost: number;
  stops: DateStop[];
  tips: string[];
}

export interface DateStop {
  order: number;
  venue?: any;
  event?: any;
  activity: string;
  duration: number; // minutes
  cost: number;
  notes: string;
  transitionTip?: string;
}

export async function generateDatePlan(DB: D1Database, prefs: DatePreferences): Promise<DatePlan> {
  // 1. Determine constraints
  const budgetTier = prefs.budget_range === '$$$' ? 4 : prefs.budget_range === '$$' ? 3 : 2;
  
  // 2. Fetch candidate venues
  const venues = await DB.prepare(`
    SELECT * FROM venues 
    WHERE (price_level <= ? OR price_level IS NULL)
    AND category IN ('food', 'drink', 'activity', 'nature', 'culture')
  `).bind(budgetTier).all();
  
  const candidates = venues.results || [];

  // Filter venues by Time of Day suitability (Heuristic)
  const morningVenues = candidates.filter((v: any) => 
    v.category === 'nature' || v.category === 'activity' || 
    (v.category === 'food' && (v.subcategory?.includes('cafe') || v.subcategory?.includes('bakery') || v.subcategory?.includes('breakfast')))
  );
  
  const afternoonVenues = candidates.filter((v: any) => 
    v.category !== 'drink' // Avoid bars in afternoon unless specified
  );

  const eveningVenues = candidates; // All valid for evening typically

  let pool = eveningVenues;
  if (prefs.time_of_day === 'morning') pool = morningVenues;
  if (prefs.time_of_day === 'afternoon') pool = afternoonVenues;

  // 3. Fetch candidate events if date provided
  let events: any[] = [];
  if (prefs.date) {
    // Define time range for event fetch
    let startHour = 0;
    let endHour = 24;

    if (prefs.time_of_day === 'morning') { startHour = 6; endHour = 12; }
    else if (prefs.time_of_day === 'afternoon') { startHour = 12; endHour = 17; }
    else if (prefs.time_of_day === 'evening') { startHour = 17; endHour = 24; }

    const dateBase = new Date(prefs.date);
    const fromDate = new Date(dateBase); fromDate.setHours(startHour, 0, 0);
    const toDate = new Date(dateBase); toDate.setHours(endHour, 59, 59);

    events = await fetchEvents(DB, {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      limit: 10
    });
  }

  // 4. Planning Logic
  const stops: DateStop[] = [];
  let currentCost = 0;
  let currentDuration = 0;
  let order = 1;

  // Helper to add stop
  const addStop = (stop: DateStop) => {
    stop.order = order++;
    stops.push(stop);
    currentCost += stop.cost;
    currentDuration += stop.duration;
  };

  // Find Anchor Event
  const relevantEvent = events.find(e => matchEventVibe(e, prefs.vibes));
  
  if (prefs.time_of_day === 'morning') {
    // MORNING: Breakfast -> Activity -> Lunch
    const breakfast = getRandom(pool.filter((v: any) => v.category === 'food'));
    if (breakfast) {
      addStop({
        order: 0, venue: breakfast, activity: 'Breakfast/Coffee', duration: 45, cost: 15,
        notes: breakfast.description || 'Start the day right.', transitionTip: 'Head to your activity.'
      });
    }

    if (relevantEvent) {
      addStop({
        order: 0, event: relevantEvent, venue: { name: relevantEvent.venue_name || relevantEvent.location_name, latitude: relevantEvent.venue_latitude, longitude: relevantEvent.venue_longitude },
        activity: relevantEvent.title, duration: 90, cost: 20, notes: relevantEvent.title
      });
    } else {
      const activity = getRandom(pool.filter((v: any) => v.category === 'nature' || v.category === 'activity'));
      if (activity) {
        addStop({
          order: 0, venue: activity, activity: 'Morning Activity', duration: 90, cost: 10,
          notes: activity.description || 'Enjoy the morning air.', transitionTip: 'Ready for lunch?'
        });
      }
    }

    const lunch = getRandom(candidates.filter((v: any) => v.category === 'food' && v.id !== breakfast?.id));
    if (lunch && currentDuration < prefs.duration_hours * 60) {
      addStop({
        order: 0, venue: lunch, activity: 'Lunch', duration: 60, cost: 25,
        notes: 'Refuel with a nice lunch.'
      });
    }

  } else if (prefs.time_of_day === 'afternoon') {
    // AFTERNOON: Lunch -> Activity -> Treat
    const lunch = getRandom(pool.filter((v: any) => v.category === 'food'));
    if (lunch) {
      addStop({
        order: 0, venue: lunch, activity: 'Lunch', duration: 60, cost: 25,
        notes: lunch.description || 'Mid-day meal.', transitionTip: 'Head to your activity.'
      });
    }

    if (relevantEvent) {
      addStop({
        order: 0, event: relevantEvent, venue: { name: relevantEvent.venue_name || relevantEvent.location_name, latitude: relevantEvent.venue_latitude, longitude: relevantEvent.venue_longitude },
        activity: relevantEvent.title, duration: 90, cost: 20, notes: relevantEvent.title
      });
    } else {
      const activity = getRandom(pool.filter((v: any) => v.category === 'culture' || v.category === 'activity' || v.category === 'nature'));
      if (activity) {
        addStop({
          order: 0, venue: activity, activity: 'Afternoon Fun', duration: 90, cost: 15,
          notes: activity.description || 'Explore the city.'
        });
      }
    }

    const treat = getRandom(pool.filter((v: any) => v.category === 'food' && (v.subcategory?.includes('dessert') || v.subcategory?.includes('cafe'))));
    if (treat && currentDuration < prefs.duration_hours * 60) {
      addStop({
        order: 0, venue: treat, activity: 'Sweet Treat', duration: 30, cost: 10,
        notes: 'A little pick-me-up.'
      });
    }

  } else {
    // EVENING (Default): Pre-Game -> Event/Dinner -> Nightcap
    // ... (Existing Evening Logic) ...
    let eventStartHour = 19;
    if (relevantEvent) {
      eventStartHour = new Date(relevantEvent.start_datetime).getHours();
    }

    // SLOT 1
    if (eventStartHour >= 18) {
      const dinner = getRandom(pool.filter((v: any) => v.category === 'food' && matchVibe(v, prefs.vibes)));
      if (dinner) addStop({ order: 0, venue: dinner, activity: 'Dinner', duration: 90, cost: 40, notes: dinner.description || 'Dinner time.', transitionTip: relevantEvent ? 'Head to event.' : undefined });
    } else if (relevantEvent) {
      addStop({ order: 0, event: relevantEvent, venue: { name: relevantEvent.venue_name || relevantEvent.location_name, latitude: relevantEvent.venue_latitude, longitude: relevantEvent.venue_longitude }, activity: relevantEvent.title, duration: 120, cost: 20, notes: relevantEvent.title });
    } else {
      const activity = getRandom(pool.filter((v: any) => (v.category === 'activity' || v.category === 'culture') && matchVibe(v, prefs.vibes)));
      if (activity) addStop({ order: 0, venue: activity, activity: 'Evening Activity', duration: 60, cost: 20, notes: activity.description || 'Start the evening fun.', transitionTip: 'Dinner next.' });
    }

    // SLOT 2
    if (eventStartHour >= 18 && relevantEvent) {
      addStop({ order: 0, event: relevantEvent, venue: { name: relevantEvent.venue_name || relevantEvent.location_name, latitude: relevantEvent.venue_latitude, longitude: relevantEvent.venue_longitude }, activity: relevantEvent.title, duration: 120, cost: 20, notes: relevantEvent.title });
    } else if (eventStartHour < 18) {
      const dinner = getRandom(pool.filter((v: any) => v.category === 'food' && matchVibe(v, prefs.vibes)));
      if (dinner && !stops.find(s => s.activity === 'Dinner')) addStop({ order: 0, venue: dinner, activity: 'Dinner', duration: 90, cost: 40, notes: dinner.description || 'Dinner time.' });
    }

    // SLOT 3
    if (currentDuration < prefs.duration_hours * 60) {
      const nightcap = getRandom(pool.filter((v: any) => v.category === 'drink' || (v.category === 'food' && v.subcategory?.includes('dessert'))));
      if (nightcap) addStop({ order: 0, venue: nightcap, activity: 'Nightcap', duration: 60, cost: 15, notes: 'Wind down.' });
    }
  }

  return {
    id: crypto.randomUUID(),
    title: `${prefs.time_of_day ? (prefs.time_of_day.charAt(0).toUpperCase() + prefs.time_of_day.slice(1)) : 'Perfect'} ${prefs.event_type}`,
    totalDuration: currentDuration,
    estimatedCost: currentCost,
    stops,
    tips: ["Check venue hours before going.", "Parking is usually free downtown after 5pm."]
  };
}

function matchVibe(venue: any, userVibes: string[]): boolean {
  if (!userVibes || userVibes.length === 0) return true;
  
  // Combine all venue tags
  const venueTags = [
    ...(venue.vibe ? safeParse(venue.vibe) : []),
    ...(venue.good_for ? safeParse(venue.good_for) : [])
  ].map((t: string) => t.toLowerCase());

  // Check partial matches (e.g. "adventure" matches "adventurous")
  return userVibes.some(v => {
    const vibe = v.toLowerCase();
    
    // Loose matching for common date vibes if data is sparse
    if (vibe === 'date night' || vibe === 'romantic') {
      if (venue.category === 'food' || venue.category === 'drink') return true;
      if (venueTags.some(t => t.includes('dinner') || t.includes('intimate') || t.includes('cozy'))) return true;
    }

    // Direct match
    if (venueTags.includes(vibe)) return true;
    // Partial/Stem match (simple)
    if (vibe.includes('advent') && venueTags.some(t => t.includes('advent'))) return true;
    if (vibe.includes('romant') && venueTags.some(t => t.includes('romant'))) return true;
    if (vibe.includes('relax') && venueTags.some(t => t.includes('relax'))) return true;
    if (vibe.includes('cultur') && venueTags.some(t => t.includes('cultur'))) return true;
    return false;
  });
}

function matchEventVibe(event: any, userVibes: string[]): boolean {
  if (!userVibes || userVibes.length === 0) return true;
  const cats = event.categories ? safeParse(event.categories) : [];
  // Basic mapping
  if (userVibes.includes('Cultural') && (cats.includes('Arts') || cats.includes('Theatre'))) return true;
  if (userVibes.includes('Fun') && (cats.includes('Comedy') || cats.includes('Sports'))) return true;
  return false;
}

function safeParse(json: string): any[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function getSwapSuggestion(
  DB: D1Database,
  prefs: DatePreferences,
  stopToSwap: DateStop,
  allStops: DateStop[]
): Promise<DateStop | null> {
  if (!stopToSwap.venue) return null; // Can't swap events yet

  const category = stopToSwap.venue.category;
  const budgetTier = prefs.budget_range === '$$$' ? 4 : prefs.budget_range === '$$' ? 3 : 2;
  const usedVenueIds = allStops.map(s => s.venue?.id).filter(Boolean);

  // Fetch candidate venues of the same category, excluding used ones
  const query = `
    SELECT * FROM venues 
    WHERE category = ? 
    AND (price_level <= ? OR price_level IS NULL)
    AND id NOT IN (${usedVenueIds.map(() => '?').join(',')})
  `;
  
  const venues = await DB.prepare(query).bind(category, budgetTier, ...usedVenueIds).all();
  
  const candidates = venues.results || [];
  const suggestion = getRandom(candidates.filter(v => matchVibe(v, prefs.vibes))) || getRandom(candidates);

  if (!suggestion) return null;

  // Create a new stop object
  const newStop: DateStop = {
    ...stopToSwap,
    venue: suggestion,
    notes: suggestion.description || stopToSwap.notes,
    cost: suggestion.average_cost || stopToSwap.cost
  };

  return newStop;
}
