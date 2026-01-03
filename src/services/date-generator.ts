/**
 * Date Plan Generator - Intelligent Recommendation Engine
 * Uses scoring-based venue selection with geographic optimization
 */

import { D1Database } from '@cloudflare/workers-types';
import { fetchEvents } from '../lib/events';
import { selectBestVenue, ScoringContext, Venue } from '../lib/scoring';
import { generateTransitionTip, Coordinates } from '../lib/geo';

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

interface TimeSlot {
  type: 'meal' | 'activity' | 'event' | 'drinks' | 'dessert';
  activity: string;
  categories: string[];
  duration: number;
  defaultCost: number;
  required: boolean;
}

export async function generateDatePlan(DB: D1Database, prefs: DatePreferences): Promise<DatePlan> {
  // 1. Fetch all eligible venues
  const venues = await DB.prepare(`
    SELECT * FROM venues
    WHERE category IS NOT NULL
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
  `).all();

  const allVenues = (venues.results || []) as Venue[];

  // 2. Fetch events if date provided
  let events: any[] = [];
  let anchorEvent: any = null;

  if (prefs.date) {
    const timeRange = getTimeRange(prefs.date, prefs.time_of_day);
    const allEvents = await fetchEvents(DB, {
      from: timeRange.from,
      to: timeRange.to,
      limit: 20
    });
    events = allEvents.filter((e: any) => e.venue_latitude && e.venue_longitude);
    anchorEvent = findBestEvent(events, prefs.vibes);
  }

  // 3. Build time slots based on time of day and duration
  const slots = buildTimeSlots(prefs, anchorEvent);

  // 4. Fill slots with scored venue selection
  const stops = await fillSlots(slots, allVenues, prefs, anchorEvent);

  // 5. Calculate totals
  const totalDuration = stops.reduce((sum, s) => sum + s.duration, 0);
  const estimatedCost = stops.reduce((sum, s) => sum + s.cost, 0);

  // 6. Generate tips
  const tips = generatePlanTips(stops, prefs);

  return {
    id: crypto.randomUUID(),
    title: generatePlanTitle(prefs, anchorEvent),
    totalDuration,
    estimatedCost,
    stops,
    tips
  };
}

/**
 * Build time slots based on time of day
 */
function buildTimeSlots(prefs: DatePreferences, anchorEvent: any): TimeSlot[] {
  const slots: TimeSlot[] = [];

  if (prefs.time_of_day === 'morning') {
    slots.push({
      type: 'meal',
      activity: 'Breakfast/Coffee',
      categories: ['food'],
      duration: 45,
      defaultCost: 20,
      required: true
    });

    if (anchorEvent) {
      slots.push({
        type: 'event',
        activity: anchorEvent.title,
        categories: [],
        duration: 90,
        defaultCost: 20,
        required: true
      });
    } else {
      slots.push({
        type: 'activity',
        activity: 'Morning Activity',
        categories: ['nature', 'activity', 'culture'],
        duration: 90,
        defaultCost: 15,
        required: true
      });
    }

    if (prefs.duration_hours >= 4) {
      slots.push({
        type: 'meal',
        activity: 'Lunch',
        categories: ['food'],
        duration: 60,
        defaultCost: 25,
        required: false
      });
    }

  } else if (prefs.time_of_day === 'afternoon') {
    slots.push({
      type: 'meal',
      activity: 'Lunch',
      categories: ['food'],
      duration: 60,
      defaultCost: 25,
      required: true
    });

    if (anchorEvent) {
      slots.push({
        type: 'event',
        activity: anchorEvent.title,
        categories: [],
        duration: 120,
        defaultCost: 25,
        required: true
      });
    } else {
      slots.push({
        type: 'activity',
        activity: 'Afternoon Fun',
        categories: ['activity', 'culture', 'nature'],
        duration: 90,
        defaultCost: 20,
        required: true
      });
    }

    if (prefs.duration_hours >= 4) {
      slots.push({
        type: 'dessert',
        activity: 'Sweet Treat',
        categories: ['food'],
        duration: 30,
        defaultCost: 12,
        required: false
      });
    }

  } else {
    // Evening (default)
    const eventStartHour = anchorEvent
      ? new Date(anchorEvent.start_datetime).getHours()
      : 20;

    // Dinner first if event is 7pm+
    if (eventStartHour >= 19 || !anchorEvent) {
      slots.push({
        type: 'meal',
        activity: 'Dinner',
        categories: ['food'],
        duration: 90,
        defaultCost: 45,
        required: true
      });
    }

    if (anchorEvent) {
      slots.push({
        type: 'event',
        activity: anchorEvent.title,
        categories: [],
        duration: 120,
        defaultCost: 30,
        required: true
      });

      // Dinner after early event
      if (eventStartHour < 19) {
        slots.push({
          type: 'meal',
          activity: 'Dinner',
          categories: ['food'],
          duration: 90,
          defaultCost: 45,
          required: true
        });
      }
    } else {
      // No event - add activity
      slots.push({
        type: 'activity',
        activity: 'Evening Activity',
        categories: ['activity', 'culture', 'entertainment'],
        duration: 75,
        defaultCost: 25,
        required: false
      });
    }

    // Nightcap if duration allows
    if (prefs.duration_hours >= 3) {
      slots.push({
        type: 'drinks',
        activity: 'Nightcap',
        categories: ['drink'],
        duration: 60,
        defaultCost: 20,
        required: false
      });
    }
  }

  return slots;
}

/**
 * Fill slots with scored venue selection
 */
async function fillSlots(
  slots: TimeSlot[],
  allVenues: Venue[],
  prefs: DatePreferences,
  anchorEvent: any
): Promise<DateStop[]> {
  const stops: DateStop[] = [];
  const usedVenueIds: string[] = [];
  let previousCoords: Coordinates | undefined;
  let remainingDuration = prefs.duration_hours * 60;

  for (const slot of slots) {
    // Skip non-required slots if running low on time
    if (!slot.required && remainingDuration < slot.duration) continue;

    // Handle event slots
    if (slot.type === 'event' && anchorEvent) {
      const stop: DateStop = {
        order: stops.length + 1,
        event: anchorEvent,
        venue: {
          id: anchorEvent.venue_id,
          name: anchorEvent.venue_name || anchorEvent.location_name,
          latitude: anchorEvent.venue_latitude,
          longitude: anchorEvent.venue_longitude,
          address: anchorEvent.venue_address
        },
        activity: anchorEvent.title,
        duration: slot.duration,
        cost: anchorEvent.price || slot.defaultCost,
        notes: anchorEvent.description?.slice(0, 150) || anchorEvent.title,
        transitionTip: previousCoords ? generateTransitionTip(
          previousCoords,
          { latitude: anchorEvent.venue_latitude, longitude: anchorEvent.venue_longitude }
        ) : undefined
      };

      stops.push(stop);
      remainingDuration -= slot.duration;
      previousCoords = {
        latitude: anchorEvent.venue_latitude,
        longitude: anchorEvent.venue_longitude
      };
      continue;
    }

    // Filter venues by category
    const candidates = allVenues.filter(v =>
      slot.categories.includes(v.category)
    );

    // Build scoring context
    const context: ScoringContext = {
      vibes: prefs.vibes,
      budgetRange: prefs.budget_range,
      timeOfDay: prefs.time_of_day,
      eventType: prefs.event_type,
      previousStop: previousCoords
    };

    // Select best venue using scoring engine
    const selected = selectBestVenue(candidates, context, usedVenueIds);

    if (selected) {
      const stop: DateStop = {
        order: stops.length + 1,
        venue: selected,
        activity: slot.activity,
        duration: selected.typical_duration || slot.duration,
        cost: selected.average_cost || slot.defaultCost,
        notes: (selected as any).description || getDefaultNote(slot.type),
        transitionTip: previousCoords ? generateTransitionTip(
          previousCoords,
          { latitude: selected.latitude, longitude: selected.longitude }
        ) : undefined
      };

      stops.push(stop);
      usedVenueIds.push(selected.id);
      remainingDuration -= stop.duration;
      previousCoords = {
        latitude: selected.latitude,
        longitude: selected.longitude
      };
    }
  }

  return stops;
}

/**
 * Find best matching event for the date
 */
function findBestEvent(events: any[], vibes: string[]): any {
  if (events.length === 0) return null;

  // Score events by vibe match
  const scored = events.map(event => {
    let score = 0;
    const categories = safeParseArray(event.categories);

    // Vibe-category matching
    if (vibes.includes('Cultural') && (categories.includes('Arts') || categories.includes('Theatre'))) score += 10;
    if (vibes.includes('Fun') && (categories.includes('Comedy') || categories.includes('Sports'))) score += 10;
    if (vibes.includes('Romantic') && categories.includes('Music')) score += 8;
    if (vibes.includes('Adventurous') && categories.includes('Sports')) score += 8;

    // Bonus for having venue coordinates (better for planning)
    if (event.venue_latitude && event.venue_longitude) score += 5;

    return { event, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.score > 0 ? scored[0].event : events[0];
}

/**
 * Get time range for event fetching
 */
function getTimeRange(date: string, timeOfDay?: string): { from: string; to: string } {
  const dateBase = new Date(date);
  let startHour = 0;
  let endHour = 24;

  if (timeOfDay === 'morning') { startHour = 6; endHour = 12; }
  else if (timeOfDay === 'afternoon') { startHour = 12; endHour = 17; }
  else if (timeOfDay === 'evening') { startHour = 17; endHour = 24; }

  const fromDate = new Date(dateBase);
  fromDate.setHours(startHour, 0, 0);

  const toDate = new Date(dateBase);
  toDate.setHours(endHour, 59, 59);

  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString()
  };
}

/**
 * Generate plan title
 */
function generatePlanTitle(prefs: DatePreferences, anchorEvent: any): string {
  const timeLabel = prefs.time_of_day
    ? prefs.time_of_day.charAt(0).toUpperCase() + prefs.time_of_day.slice(1)
    : 'Perfect';

  if (anchorEvent) {
    return `${timeLabel} Date: ${anchorEvent.title}`;
  }

  return `${timeLabel} ${prefs.event_type}`;
}

/**
 * Generate helpful tips for the plan
 */
function generatePlanTips(stops: DateStop[], prefs: DatePreferences): string[] {
  const tips: string[] = [];

  // Parking tip
  if (prefs.time_of_day === 'evening') {
    tips.push("Parking is free downtown after 5pm on weekdays.");
  }

  // Reservation tip for dinner
  const hasDinner = stops.some(s => s.activity === 'Dinner');
  if (hasDinner) {
    tips.push("Consider making a dinner reservation, especially on weekends.");
  }

  // Walking tip if route is walkable
  const allWalkable = stops.every((s, i) => {
    if (i === 0) return true;
    // Check transition tip for walking indicators
    return s.transitionTip?.includes('walk') || s.transitionTip?.includes('stroll');
  });

  if (allWalkable && stops.length > 1) {
    tips.push("Great news - this entire route is walkable!");
  }

  // Weather check reminder
  const hasOutdoor = stops.some(s =>
    s.venue?.category === 'nature' ||
    s.venue?.subcategory?.includes('outdoor')
  );

  if (hasOutdoor) {
    tips.push("Check the weather forecast for outdoor activities.");
  }

  return tips.length > 0 ? tips : ["Have a wonderful time exploring Fayetteville!"];
}

/**
 * Default notes by slot type
 */
function getDefaultNote(type: string): string {
  const notes: Record<string, string> = {
    meal: "Enjoy your meal!",
    activity: "Have fun!",
    drinks: "Wind down and relax.",
    dessert: "A sweet way to end.",
    event: "Enjoy the show!"
  };
  return notes[type] || "";
}

function safeParseArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ============================================
// SWAP FUNCTIONALITY
// ============================================

export async function getSwapSuggestion(
  DB: D1Database,
  prefs: DatePreferences,
  stopToSwap: DateStop,
  allStops: DateStop[]
): Promise<DateStop | null> {
  const usedVenueIds = allStops.map(s => s.venue?.id).filter(Boolean);

  // Get previous stop for proximity scoring
  const stopIndex = allStops.findIndex(s => s.order === stopToSwap.order);
  const previousStop = stopIndex > 0 ? allStops[stopIndex - 1] : null;

  // Build scoring context
  const context: ScoringContext = {
    vibes: prefs.vibes,
    budgetRange: prefs.budget_range,
    timeOfDay: prefs.time_of_day,
    eventType: prefs.event_type,
    previousStop: previousStop?.venue ? {
      latitude: previousStop.venue.latitude,
      longitude: previousStop.venue.longitude
    } : undefined
  };

  // --- SWAP VENUE ---
  if (stopToSwap.venue && !stopToSwap.event) {
    const category = stopToSwap.venue.category;

    const venues = await DB.prepare(`
      SELECT * FROM venues
      WHERE category = ?
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
    `).bind(category).all();

    const candidates = (venues.results || []) as Venue[];
    const selected = selectBestVenue(candidates, context, usedVenueIds);

    if (!selected) return null;

    return {
      ...stopToSwap,
      venue: selected,
      notes: (selected as any).description || stopToSwap.notes,
      cost: selected.average_cost || stopToSwap.cost,
      duration: selected.typical_duration || stopToSwap.duration
    };
  }

  // --- SWAP EVENT ---
  if (stopToSwap.event && prefs.date) {
    const usedEventIds = allStops.map(s => s.event?.id).filter(Boolean);
    const timeRange = getTimeRange(prefs.date, prefs.time_of_day);

    const events = await fetchEvents(DB, {
      from: timeRange.from,
      to: timeRange.to,
      limit: 20
    });

    const candidates = events.filter((e: any) =>
      e.venue_latitude &&
      e.venue_longitude &&
      !usedEventIds.includes(e.id)
    );

    if (candidates.length === 0) return null;

    // Pick best event
    const suggestion = findBestEvent(candidates, prefs.vibes);

    return {
      ...stopToSwap,
      event: suggestion,
      venue: {
        id: suggestion.venue_id,
        name: suggestion.venue_name || suggestion.location_name,
        latitude: suggestion.venue_latitude,
        longitude: suggestion.venue_longitude,
        address: suggestion.venue_address
      },
      activity: suggestion.title,
      notes: suggestion.description?.slice(0, 100) + '...'
    };
  }

  return null;
}
