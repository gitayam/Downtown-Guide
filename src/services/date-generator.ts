import { D1Database } from '@cloudflare/workers-types';
import { fetchEvents } from '../lib/events';
import { ScoringContext, selectBestVenue } from '../lib/scoring';

// --- INTERFACES ---

export interface DatePreferences {
  event_type: string;
  budget_range: string; // $, $$, $$$, $$$$
  vibes: string[];
  duration_hours: number;
  date?: string;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  activity_level?: number; // 1-5
  include_food?: boolean;
  include_drinks?: boolean;
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

interface TimeSlot {
  type: 'meal' | 'activity' | 'event' | 'drinks' | 'dessert';
  activity: string;
  categories: string[];
  duration: number;
  defaultCost: number;
  required: boolean;
}

// --- MAIN GENERATION ORCHESTRATOR ---

export async function generateDatePlan(DB: D1Database, prefs: DatePreferences): Promise<DatePlan> {
  // 1. Fetch all candidate venues matching budget
  const budgetTier = prefs.budget_range === '$$$' ? 4 : prefs.budget_range === '$$' ? 3 : 2;
  const venues = await DB.prepare(`
    SELECT * FROM venues WHERE (price_level <= ? OR price_level IS NULL) AND latitude IS NOT NULL
  `).bind(budgetTier).all();
  const allVenues = (venues.results || []) as any[];

  // 2. Fetch candidate events for the given day
  let events: any[] = [];
  if (prefs.date) {
    const { from, to } = getTimeRange(prefs.date, prefs.time_of_day);
    events = await fetchEvents(DB, { from, to, limit: 20 });
  }
  const anchorEvent = findBestEvent(events, prefs.vibes);

  // 3. Build a template of time slots
  const slots = buildTimeSlots(prefs, anchorEvent);

  // 4. Fill slots with best venues/event
  const stops = await fillSlots(slots, allVenues, prefs, anchorEvent);

  // 5. Calculate totals
  const totalDuration = stops.reduce((sum, s) => sum + s.duration, 0);
  const estimatedCost = stops.reduce((sum, s) => sum + s.cost, 0);

  return {
    id: crypto.randomUUID(),
    title: `${prefs.time_of_day ? (prefs.time_of_day.charAt(0).toUpperCase() + prefs.time_of_day.slice(1)) : 'Perfect'} ${prefs.event_type}`,
    totalDuration,
    estimatedCost,
    stops,
    tips: ["Check venue hours before going.", "Parking is usually free downtown after 5pm."]
  };
}

// --- HELPER FUNCTIONS ---

function buildTimeSlots(prefs: DatePreferences, anchorEvent: any): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const eventType = prefs.event_type;
    
    // If there's a specific event, build the plan around it
    if (anchorEvent) {
        const eventStartHour = new Date(anchorEvent.start_datetime).getHours();
        if (eventStartHour >= 18) { // Evening event
            slots.push({ type: 'meal', activity: 'Pre-Event Dinner', categories: ['food'], duration: 75, defaultCost: 40, required: true });
            slots.push({ type: 'event', activity: anchorEvent.title, categories: [], duration: 120, defaultCost: 30, required: true });
            slots.push({ type: 'drinks', activity: 'Nightcap', categories: ['drink'], duration: 45, defaultCost: 20, required: false });
        } else { // Day event
            slots.push({ type: 'event', activity: anchorEvent.title, categories: [], duration: 120, defaultCost: 30, required: true });
            slots.push({ type: 'meal', activity: 'Post-Event Lunch/Dinner', categories: ['food'], duration: 75, defaultCost: 40, required: true });
            slots.push({ type: 'activity', activity: 'Afternoon Activity', categories: ['nature', 'culture'], duration: 60, defaultCost: 15, required: false });
        }
        return slots;
    }

    // Default slot building based on time of day
    switch (prefs.time_of_day) {
        case 'morning':
            slots.push({ type: 'meal', activity: 'Breakfast/Coffee', categories: ['food'], duration: 45, defaultCost: 20, required: true });
            slots.push({ type: 'activity', activity: 'Morning Activity', categories: ['nature', 'activity', 'culture'], duration: 90, defaultCost: 15, required: true });
            break;
        case 'afternoon':
            slots.push({ type: 'meal', activity: 'Lunch', categories: ['food'], duration: 60, defaultCost: 25, required: true });
            slots.push({ type: 'activity', activity: 'Afternoon Fun', categories: ['activity', 'culture', 'nature'], duration: 90, defaultCost: 20, required: true });
            break;
        default: // Evening
            slots.push({ type: 'meal', activity: 'Dinner', categories: ['food'], duration: 90, defaultCost: 45, required: true });
            slots.push({ type: 'activity', activity: 'Evening Activity', categories: ['activity', 'culture', 'entertainment'], duration: 75, defaultCost: 25, required: false });
            slots.push({ type: 'drinks', activity: 'Nightcap', categories: ['drink'], duration: 60, defaultCost: 20, required: false });
            break;
    }
    return slots;
}

async function fillSlots(
  slots: TimeSlot[],
  allVenues: any[],
  prefs: DatePreferences,
  anchorEvent: any
): Promise<DateStop[]> {
  const stops: DateStop[] = [];
  const usedVenueIds: string[] = [];
  let remainingDuration = prefs.duration_hours * 60;

  for (const slot of slots) {
    if (!slot.required && remainingDuration < slot.duration) continue;

    if (slot.type === 'event' && anchorEvent) {
      stops.push({
        order: stops.length + 1,
        event: { id: anchorEvent.id, title: anchorEvent.title },
        venue: {
          id: anchorEvent.venue_id, name: anchorEvent.venue_name || anchorEvent.location_name,
          latitude: anchorEvent.venue_latitude, longitude: anchorEvent.venue_longitude, address: anchorEvent.venue_address
        },
        activity: anchorEvent.title,
        duration: slot.duration,
        cost: anchorEvent.price || slot.defaultCost,
        notes: anchorEvent.description?.slice(0, 150) || anchorEvent.title,
      });
      remainingDuration -= slot.duration;
      continue;
    }

    const candidates = allVenues.filter(v => slot.categories.includes(v.category));
    const context: ScoringContext = { vibes: prefs.vibes, budgetRange: prefs.budget_range, timeOfDay: prefs.time_of_day };
    const selected = selectBestVenue(candidates, context, usedVenueIds);

    if (selected) {
      stops.push({
        order: stops.length + 1,
        venue: selected,
        activity: slot.activity,
        duration: selected.typical_duration || slot.duration,
        cost: selected.average_cost || slot.defaultCost,
        notes: selected.description || `Enjoy ${selected.name}!`,
      });
      usedVenueIds.push(selected.id);
      remainingDuration -= slot.duration;
    }
  }
  return stops;
}

function findBestEvent(events: any[], vibes: string[]): any {
  if (events.length === 0) return null;
  // Simple match for now, can be expanded with scoring
  const preferred = events.find(e => matchEventVibe(e, vibes));
  return preferred || events[0]; // Return first event as fallback
}

function getTimeRange(date: string, timeOfDay?: string): { from: string; to: string } {
    const dateBase = new Date(date);
    let startHour = 0, endHour = 24;
    if (timeOfDay === 'morning') { startHour = 6; endHour = 12; }
    else if (timeOfDay === 'afternoon') { startHour = 12; endHour = 17; }
    else if (timeOfDay === 'evening') { startHour = 17; endHour = 24; }
    const fromDate = new Date(dateBase); fromDate.setUTCHours(startHour, 0, 0, 0);
    const toDate = new Date(dateBase); toDate.setUTCHours(endHour, 59, 59, 999);
    return { from: fromDate.toISOString(), to: toDate.toISOString() };
}

function matchEventVibe(event: any, userVibes: string[]): boolean {
  if (!userVibes || userVibes.length === 0) return true;
  const cats = event.categories ? safeParseArray(event.categories) : [];
  return userVibes.some(vibe => {
    const v = vibe.toLowerCase();
    if (v.includes('cultur') && (cats.includes('Arts') || cats.includes('Theatre'))) return true;
    if (v.includes('fun') && (cats.includes('Comedy') || cats.includes('Sports'))) return true;
    return false;
  });
}

function safeParseArray(json: string): any[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// Helper to get activity label from category
function getActivityLabel(category: string): string {
  const labels: Record<string, string> = {
    'food': 'Dining',
    'drink': 'Drinks',
    'nature': 'Outdoor Activity',
    'activity': 'Activity',
    'culture': 'Cultural Experience',
    'entertainment': 'Entertainment',
    'shopping': 'Shopping'
  };
  return labels[category] || 'Stop';
}

export async function getSwapSuggestion(
  DB: D1Database,
  prefs: DatePreferences,
  stopToSwap: DateStop,
  allStops: DateStop[]
): Promise<DateStop | null> {
    if (stopToSwap.venue) {
        const category = stopToSwap.venue.category;
        const usedVenueIds = allStops.map(s => s.venue?.id).filter(Boolean);
        const context: ScoringContext = { vibes: prefs.vibes, budgetRange: prefs.budget_range, timeOfDay: prefs.time_of_day };

        // 1. Try same category first
        let venues = await DB.prepare(`SELECT * FROM venues WHERE category = ? AND latitude IS NOT NULL`).bind(category).all();
        let candidates = (venues.results || []) as any[];
        let selected = selectBestVenue(candidates, context, usedVenueIds);

        // 2. If no alternatives in same category, try related categories
        if (!selected) {
            const relatedCategories: Record<string, string[]> = {
                'food': ['drink', 'entertainment'],
                'drink': ['food', 'entertainment'],
                'activity': ['nature', 'entertainment', 'culture'],
                'nature': ['activity', 'culture'],
                'culture': ['entertainment', 'activity', 'nature'],
                'entertainment': ['activity', 'culture', 'drink'],
                'shopping': ['culture', 'food']
            };
            const related = relatedCategories[category] || [];
            for (const relatedCat of related) {
                if (selected) break;
                venues = await DB.prepare(`SELECT * FROM venues WHERE category = ? AND latitude IS NOT NULL`).bind(relatedCat).all();
                candidates = (venues.results || []) as any[];
                selected = selectBestVenue(candidates, context, usedVenueIds);
            }
        }

        // 3. If still nothing, try ANY venue
        if (!selected) {
            venues = await DB.prepare(`SELECT * FROM venues WHERE latitude IS NOT NULL`).all();
            candidates = (venues.results || []) as any[];
            selected = selectBestVenue(candidates, context, usedVenueIds);
        }

        if (!selected) return null;

        return {
            ...stopToSwap,
            venue: selected,
            activity: getActivityLabel(selected.category),
            notes: selected.description || stopToSwap.notes,
            cost: selected.average_cost || stopToSwap.cost,
            duration: selected.typical_duration || stopToSwap.duration
        };
    }

    if (stopToSwap.event && prefs.date) {
        const usedEventIds = allStops.map(s => s.event?.id).filter(Boolean);
        const { from, to } = getTimeRange(prefs.date, prefs.time_of_day);
        const events = await fetchEvents(DB, { from, to, limit: 20 });
        const alternateEvents = events.filter(e => !usedEventIds.includes(e.id));
        const suggestion = findBestEvent(alternateEvents, prefs.vibes);

        if (!suggestion) return null;

        return {
            ...stopToSwap,
            event: { id: suggestion.id, title: suggestion.title },
            venue: {
                id: suggestion.venue_id, name: suggestion.venue_name || suggestion.location_name,
                latitude: suggestion.venue_latitude, longitude: suggestion.venue_longitude, address: suggestion.venue_address
            },
            activity: suggestion.title,
            notes: suggestion.description?.slice(0, 100) + '...',
        };
    }
    return null;
}

// Add a new stop to the itinerary
export async function getAddSuggestion(
  DB: D1Database,
  prefs: DatePreferences,
  insertAfterIndex: number,
  allStops: DateStop[]
): Promise<DateStop | null> {
  const usedVenueIds = allStops.map(s => s.venue?.id).filter(Boolean);
  const context: ScoringContext = { vibes: prefs.vibes, budgetRange: prefs.budget_range, timeOfDay: prefs.time_of_day };

  // Determine what type of stop to suggest based on existing stops
  const existingCategories = allStops.map(s => s.venue?.category).filter(Boolean);
  const hasMeal = existingCategories.includes('food');
  const hasDrink = existingCategories.includes('drink');
  const hasActivity = existingCategories.some(c => ['activity', 'culture', 'nature', 'entertainment'].includes(c));

  // Decide category to suggest
  let suggestCategories: string[] = [];
  if (prefs.time_of_day === 'evening') {
    if (!hasMeal) suggestCategories = ['food'];
    else if (!hasActivity) suggestCategories = ['activity', 'culture', 'entertainment'];
    else if (!hasDrink) suggestCategories = ['drink'];
    else suggestCategories = ['food', 'drink', 'activity', 'culture'];
  } else if (prefs.time_of_day === 'morning') {
    if (!hasMeal) suggestCategories = ['food'];
    else if (!hasActivity) suggestCategories = ['nature', 'activity', 'culture'];
    else suggestCategories = ['food', 'nature', 'activity'];
  } else {
    if (!hasMeal) suggestCategories = ['food'];
    else if (!hasActivity) suggestCategories = ['activity', 'culture', 'nature'];
    else suggestCategories = ['food', 'activity', 'culture', 'drink'];
  }

  // Fetch venues in suggested categories
  const placeholders = suggestCategories.map(() => '?').join(',');
  const venues = await DB.prepare(`
    SELECT * FROM venues WHERE category IN (${placeholders}) AND latitude IS NOT NULL
  `).bind(...suggestCategories).all();

  const candidates = (venues.results || []) as any[];
  let selected = selectBestVenue(candidates, context, usedVenueIds);

  // Fallback: try any venue
  if (!selected) {
    const allVenues = await DB.prepare(`SELECT * FROM venues WHERE latitude IS NOT NULL`).all();
    selected = selectBestVenue((allVenues.results || []) as any[], context, usedVenueIds);
  }

  if (!selected) return null;

  return {
    order: insertAfterIndex + 2,
    venue: selected,
    activity: getActivityLabel(selected.category),
    duration: selected.typical_duration || 60,
    cost: selected.average_cost || 20,
    notes: selected.description || `Enjoy ${selected.name}!`,
  };
}