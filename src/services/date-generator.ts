
import { D1Database } from '@cloudflare/workers-types';
import { fetchEvents } from '../lib/events';

export interface DatePreferences {
  event_type: string;
  budget_range: string; // $, $$, $$$
  vibes: string[];
  duration_hours: number;
  date?: string;
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

  // 3. Fetch candidate events if date provided
  let events: any[] = [];
  if (prefs.date) {
    // Use the lib helper to get events for that day
    events = await fetchEvents(DB, {
      from: new Date(prefs.date).toISOString(),
      to: new Date(new Date(prefs.date).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      limit: 10
    });
  }

  // 4. Planning Logic
  const stops: DateStop[] = [];
  let currentCost = 0;
  let currentDuration = 0;
  let order = 1;

  // Step 1: Identify key anchor (Event)
  const relevantEvent = events.find(e => matchEventVibe(e, prefs.vibes));
  let eventStartHour = 19; // Default to 7 PM for generic evening plans

  if (relevantEvent) {
    const startDate = new Date(relevantEvent.start_datetime);
    eventStartHour = startDate.getHours();
  }

  // Helper to add stop
  const addStop = (stop: DateStop) => {
    stop.order = order++;
    stops.push(stop);
    currentCost += stop.cost;
    currentDuration += stop.duration;
  };

  // Scenario A: Evening Event (starts 6 PM or later) -> Dinner First
  // Scenario B: Late Afternoon Event (4 PM - 6 PM) -> Dinner After
  // Scenario C: Day Event (before 4 PM) -> Activity -> Dinner

  // --- SLOT 1: Pre-Game / Activity / Early Dinner ---
  if (eventStartHour >= 18) {
    // Dinner before event
    const dinner = getRandom(candidates.filter((v: any) => v.category === 'food' && matchVibe(v, prefs.vibes)));
    if (dinner) {
      addStop({
        order: 0,
        venue: dinner,
        activity: 'Pre-Event Dinner',
        duration: 90,
        cost: dinner.average_cost || 40,
        notes: dinner.description || 'Start the night with a great meal.',
        transitionTip: relevantEvent ? 'Head to the event venue.' : undefined
      });
    }
  } else if (eventStartHour < 16 && relevantEvent) {
    // Event is first (Day time)
    addStop({
      order: 0,
      event: relevantEvent,
      venue: { 
        name: relevantEvent.venue_name || relevantEvent.location_name,
        latitude: relevantEvent.venue_latitude,
        longitude: relevantEvent.venue_longitude,
        address: relevantEvent.venue_address
      },
      activity: relevantEvent.title,
      duration: 120,
      cost: 20,
      notes: relevantEvent.description?.slice(0, 100) + '...',
      transitionTip: 'Find something fun to do next.'
    });
  } else if (eventStartHour >= 16 && eventStartHour < 18 && relevantEvent) {
    // Event is first (Late Afternoon)
    addStop({
      order: 0,
      event: relevantEvent,
      venue: { 
        name: relevantEvent.venue_name || relevantEvent.location_name,
        latitude: relevantEvent.venue_latitude,
        longitude: relevantEvent.venue_longitude,
        address: relevantEvent.venue_address
      },
      activity: relevantEvent.title,
      duration: 120,
      cost: 20,
      notes: relevantEvent.description?.slice(0, 100) + '...',
      transitionTip: 'Head to dinner.'
    });
  } else {
    // No event, standard evening: Activity first
    const activity = getRandom(candidates.filter((v: any) => 
      (v.category === 'activity' || v.category === 'nature' || v.category === 'culture') &&
      matchVibe(v, prefs.vibes)
    ));
    if (activity) {
      addStop({
        order: 0,
        venue: activity,
        activity: activity.category === 'nature' ? 'Walk & Talk' : 'Fun Activity',
        duration: 90,
        cost: activity.average_cost || 15,
        notes: activity.description || 'Enjoy some time together.',
        transitionTip: 'Time for dinner?'
      });
    }
  }

  // --- SLOT 2: Main Event / Dinner ---
  if (eventStartHour >= 18 && relevantEvent) {
    // The Event
    addStop({
      order: 0,
      event: relevantEvent,
      venue: { 
        name: relevantEvent.venue_name || relevantEvent.location_name,
        latitude: relevantEvent.venue_latitude,
        longitude: relevantEvent.venue_longitude,
        address: relevantEvent.venue_address
      },
      activity: relevantEvent.title,
      duration: 120,
      cost: 20,
      notes: relevantEvent.description?.slice(0, 100) + '...',
      transitionTip: 'Wind down with a drink or dessert?'
    });
  } else if (eventStartHour < 18) {
    // Dinner (Post-event)
    const dinner = getRandom(candidates.filter((v: any) => v.category === 'food' && matchVibe(v, prefs.vibes)));
    if (dinner) {
      addStop({
        order: 0,
        venue: dinner,
        activity: 'Dinner',
        duration: 90,
        cost: dinner.average_cost || 40,
        notes: dinner.description || 'Enjoy a lovely meal.',
        transitionTip: 'Optional nightcap?'
      });
    }
  }

  // --- SLOT 3: Nightcap / Dessert ---
  if (currentDuration < (prefs.duration_hours * 60)) {
    const nightcaps = candidates.filter((v: any) => 
      (v.category === 'drink' || (v.category === 'food' && v.subcategory?.includes('dessert'))) &&
      matchVibe(v, prefs.vibes)
    );
    
    const nightcap = getRandom(nightcaps);
    if (nightcap) {
      addStop({
        order: 0,
        venue: nightcap,
        activity: nightcap.category === 'drink' ? 'Drinks' : 'Dessert',
        duration: 60,
        cost: nightcap.average_cost || 15,
        notes: nightcap.description || 'Wind down the evening.',
      });
    }
  }

  return {
    id: crypto.randomUUID(),
    title: `${prefs.vibes[0] || 'Perfect'} ${prefs.event_type} in Fayetteville`,
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
