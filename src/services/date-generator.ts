
import { D1Database } from '@cloudflare/workers-types';

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
  // This is a simplified logic. In a real app, we'd use more complex scoring.
  const venues = await DB.prepare(`
    SELECT * FROM venues 
    WHERE (price_level <= ? OR price_level IS NULL)
    AND category IN ('food', 'drink', 'activity', 'nature', 'culture')
  `).bind(budgetTier).all();
  
  const candidates = venues.results || [];

  // 3. Simple Planning Logic
  const stops: DateStop[] = [];
  let currentCost = 0;
  let currentDuration = 0;
  let order = 1;

  // Step 1: Activity or Nature (Early evening / Afternoon)
  const activities = candidates.filter((v: any) => 
    (v.category === 'activity' || v.category === 'nature' || v.category === 'culture') &&
    matchVibe(v, prefs.vibes)
  );
  
  const activity = getRandom(activities);
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

  // Step 2: Dinner (Main event)
  const restaurants = candidates.filter((v: any) => 
    v.category === 'food' && matchVibe(v, prefs.vibes)
  );
  
  const dinner = getRandom(restaurants);
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
  if (!venue.vibe && !venue.good_for) return true; // Loose matching if no data
  
  const venueTags = [
    ...(venue.vibe ? JSON.parse(venue.vibe) : []),
    ...(venue.good_for ? JSON.parse(venue.good_for) : [])
  ].map((t: string) => t.toLowerCase());

  // Check if any user vibe matches venue tags
  // This is basic; we can improve with a mapping dictionary later
  return userVibes.some(v => venueTags.includes(v.toLowerCase()));
}

function getRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}
