
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

  // Step 1: Activity or Event (Afternoon/Early Evening)
  // Prioritize a relevant event if one exists
  const relevantEvent = events.find(e => matchEventVibe(e, prefs.vibes));
  
  if (relevantEvent) {
    stops.push({
      order: order++,
      event: relevantEvent,
      venue: { 
        name: relevantEvent.venue_name || relevantEvent.location_name,
        latitude: relevantEvent.venue_latitude,
        longitude: relevantEvent.venue_longitude,
        address: relevantEvent.venue_address
      },
      activity: 'Attend Event',
      duration: 120, // Assume 2 hours for event
      cost: 20, // Estimate ticket cost if unknown
      notes: relevantEvent.title,
      transitionTip: 'Head to dinner after the event.'
    });
    currentCost += 20;
    currentDuration += 120;
  } else {
    // Fallback to venue activity
    const activities = candidates.filter((v: any) => 
      (v.category === 'activity' || v.category === 'nature' || v.category === 'culture') &&
      matchVibe(v, prefs.vibes)
    );
    
    // If exact vibe match fails, try generic fallback
    const activity = getRandom(activities) || getRandom(candidates.filter((v: any) => v.category === 'activity'));
    
    if (activity) {
      stops.push({
        order: order++,
        venue: activity,
        activity: activity.category === 'nature' ? 'Walk & Talk' : 'Fun Activity',
        duration: 90,
        cost: activity.average_cost || 15,
        notes: activity.description || 'Enjoy some time together.',
        transitionTip: 'Head to dinner afterwards.'
      });
      currentCost += activity.average_cost || 15;
      currentDuration += 90;
    }
  }

  // Step 2: Dinner (Main event)
  const restaurants = candidates.filter((v: any) => 
    v.category === 'food' && matchVibe(v, prefs.vibes)
  );
  
  const dinner = getRandom(restaurants) || getRandom(candidates.filter((v: any) => v.category === 'food'));
  
  if (dinner) {
    stops.push({
      order: order++,
      venue: dinner,
      activity: 'Dinner',
      duration: 90,
      cost: dinner.average_cost || 40,
      notes: dinner.description || 'Enjoy a lovely meal.',
      transitionTip: 'Time for dessert or drinks?'
    });
    currentCost += dinner.average_cost || 40;
    currentDuration += 90;
  }

  // Step 3: Drinks or Dessert (Late evening)
  if (currentDuration < (prefs.duration_hours * 60)) {
    const nightcaps = candidates.filter((v: any) => 
      (v.category === 'drink' || (v.category === 'food' && v.subcategory?.includes('dessert'))) &&
      matchVibe(v, prefs.vibes)
    );
    
    const nightcap = getRandom(nightcaps);
    if (nightcap) {
      stops.push({
        order: order++,
        venue: nightcap,
        activity: nightcap.category === 'drink' ? 'Drinks' : 'Dessert',
        duration: 60,
        cost: nightcap.average_cost || 15,
        notes: nightcap.description || 'Wind down the evening.',
      });
      currentCost += nightcap.average_cost || 15;
      currentDuration += 60;
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
