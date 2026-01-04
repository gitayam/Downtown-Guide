import { D1Database } from '@cloudflare/workers-types';
import { fetchEvents } from '../lib/events';
import { ScoringContext, selectBestVenue, Venue } from '../lib/scoring';

// --- INTERFACES ---

export interface DatePreferences {
  event_type: string;
  budget_range: string; // $, $$, $$$, $$$$
  vibes: string[];
  duration_hours: number;
  date?: string;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night' | 'full_day';
  activity_level?: number; // 1-5
  include_food?: boolean;
  include_drinks?: boolean;
  has_military_access?: boolean; // Can access Fort Bragg/MWR venues
  is_21_plus?: boolean; // Can access 21+ venues (bars, breweries, etc.)
  include_area_attractions?: boolean; // Include venues outside downtown (state parks, mall, airport area, etc.)
  exclude_venue_ids?: string[]; // Venue IDs to exclude (for variety between days)
  anchor_event_id?: string; // Specific event ID to build the plan around (from event page)
  has_dog?: boolean; // Traveling with a dog - prefer pet-friendly venues
  has_young_children?: boolean; // Traveling with children under 5 - prefer kid-friendly venues
  needs_wifi?: boolean; // Need WiFi for remote work
  needs_wheelchair_access?: boolean; // Need wheelchair accessible venues
  avoid_stairs?: boolean; // Avoid venues with stairs
}

export interface DatePlan {
  id: string;
  title: string;
  totalDuration: number;
  estimatedCost: number;
  stops: DateStop[];
  tips: string[];
  _debug?: {
    slotsGenerated: number;
    venuesByCategory: Record<string, number>;
    is21Plus: boolean;
  };
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
  venueEvents?: {  // Events happening at this venue during the date
    id: string;
    title: string;
    start_datetime: string;
    end_datetime: string;
    categories: string[];
  }[];
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

  // Filter venues based on military access preference
  // Venues on Fort Bragg/Liberty typically have "MWR" in name or source_id contains fort_liberty/fort_bragg
  let allVenues = (venues.results || []) as any[];

  if (!prefs.has_military_access) {
    allVenues = allVenues.filter(v => {
      const name = (v.name || '').toLowerCase();
      const sourceId = (v.source_id || '').toLowerCase();
      const address = (v.address || '').toLowerCase();

      // Exclude venues that appear to require military access
      const isMilitaryVenue =
        name.includes('mwr') ||
        name.includes('fort liberty') ||
        name.includes('fort bragg') ||
        sourceId.includes('fort_liberty') ||
        sourceId.includes('fort_bragg') ||
        sourceId.includes('mwr') ||
        address.includes('fort liberty') ||
        address.includes('fort bragg');

      return !isMilitaryVenue;
    });
  }

  // Filter venues based on 21+ age restriction
  // If user is NOT 21+, exclude bars, breweries, wine bars, speakeasies, etc.
  const TWENTY_ONE_PLUS_SUBCATEGORIES = [
    'bar', 'speakeasy', 'wine_bar', 'dive_bar', 'brewery',
    'cocktail_bar', 'lounge', 'kava_bar', 'pub'
  ];

  const is21Plus = prefs.is_21_plus === true;
  if (!is21Plus) {
    allVenues = allVenues.filter(v => {
      const subcategory = (v.subcategory || '').toLowerCase();
      return !TWENTY_ONE_PLUS_SUBCATEGORIES.includes(subcategory);
    });
  }

  // Filter to downtown-only venues by default
  // Unless include_area_attractions is explicitly true, only show downtown venues
  if (!prefs.include_area_attractions) {
    allVenues = allVenues.filter(v => v.is_downtown === 1);
  }

  // Filter out event_only venues (theaters, stadiums, arenas)
  // These venues should only be recommended when there's an event happening
  // They will be included via the event slot mechanism, not as standalone venues
  allVenues = allVenues.filter(v => v.event_only !== 1);

  // 2. Fetch anchor event or candidate events
  let anchorEvent: any = null;

  // If a specific event ID is provided (from "Plan day around this" feature), use it
  if (prefs.anchor_event_id) {
    const anchorResult = await DB.prepare(`
      SELECT e.*,
        v.id as venue_id, v.name as venue_name, v.address as venue_address,
        v.city as venue_city, v.state as venue_state, v.zip as venue_zip,
        v.latitude as venue_latitude, v.longitude as venue_longitude
      FROM events e
      LEFT JOIN venues v ON e.venue_id = v.id
      WHERE e.id = ?
    `).bind(prefs.anchor_event_id).first();

    if (anchorResult) {
      anchorEvent = anchorResult;
    }
  }

  // If no anchor event specified or found, fetch events for the day and pick best
  if (!anchorEvent && prefs.date) {
    const { from, to } = getTimeRange(prefs.date, prefs.time_of_day);
    const events = await fetchEvents(DB, { from, to, limit: 20 });
    anchorEvent = findBestEvent(events, prefs.vibes);
  }

  // 3. Build a template of time slots
  const slots = buildTimeSlots(prefs, anchorEvent);

  // Debug: count venues by category
  const venuesByCategory: Record<string, number> = {};
  for (const v of allVenues) {
    venuesByCategory[v.category] = (venuesByCategory[v.category] || 0) + 1;
  }

  // 4. Fill slots with best venues/event
  const stops = await fillSlots(slots, allVenues, prefs, anchorEvent);

  // 4.5. Enrich stops with venue-specific events happening that day
  if (prefs.date) {
    const { from, to } = getTimeRange(prefs.date, prefs.time_of_day);
    await enrichStopsWithVenueEvents(DB, stops, from, to);
  }

  // 5. Calculate totals
  const totalDuration = stops.reduce((sum, s) => sum + s.duration, 0);
  const estimatedCost = stops.reduce((sum, s) => sum + s.cost, 0);

  // Generate a descriptive title
  let planTitle: string;
  if (anchorEvent) {
    // When building around a specific event, reference it in the title
    planTitle = `Day Around "${anchorEvent.title}"`;
  } else {
    const timeLabel = prefs.time_of_day
      ? prefs.time_of_day === 'full_day'
        ? 'Full Day'
        : prefs.time_of_day.charAt(0).toUpperCase() + prefs.time_of_day.slice(1)
      : 'Perfect';
    planTitle = `${timeLabel} ${prefs.event_type}`;
  }

  return {
    id: crypto.randomUUID(),
    title: planTitle,
    totalDuration,
    estimatedCost,
    stops,
    tips: ["Check venue hours before going.", "Parking is usually free downtown after 5pm."],
    _debug: {
      slotsGenerated: slots.length,
      venuesByCategory,
      is21Plus: prefs.is_21_plus === true
    }
  };
}

// --- HELPER FUNCTIONS ---

function buildTimeSlots(prefs: DatePreferences, anchorEvent: any): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const durationMinutes = prefs.duration_hours * 60;

    // If there's a specific event AND we're NOT in full_day mode, build the plan around it
    // Full day mode should generate comprehensive itineraries regardless of anchor events
    if (anchorEvent && prefs.time_of_day !== 'full_day') {
        // Use prefs.time_of_day (computed correctly on frontend with user's timezone)
        // instead of re-parsing start_datetime (which causes UTC/local timezone issues)
        const isEveningOrNight = prefs.time_of_day === 'evening' || prefs.time_of_day === 'night';

        if (isEveningOrNight) {
            // Evening/Night event: Dinner → Event → Nightcap
            slots.push({ type: 'meal', activity: 'Pre-Event Dinner', categories: ['food'], duration: 75, defaultCost: 40, required: true });
            slots.push({ type: 'event', activity: anchorEvent.title, categories: [], duration: 120, defaultCost: 30, required: true });
            slots.push({ type: 'drinks', activity: 'Nightcap', categories: ['drink'], duration: 45, defaultCost: 20, required: false });
        } else if (prefs.time_of_day === 'morning') {
            // Morning event: Coffee → Event → Lunch → Activity
            slots.push({ type: 'meal', activity: 'Pre-Event Coffee', categories: ['food'], duration: 30, defaultCost: 12, required: true });
            slots.push({ type: 'event', activity: anchorEvent.title, categories: [], duration: 120, defaultCost: 30, required: true });
            slots.push({ type: 'meal', activity: 'Post-Event Lunch', categories: ['food'], duration: 60, defaultCost: 25, required: true });
            slots.push({ type: 'activity', activity: 'Afternoon Activity', categories: ['nature', 'culture'], duration: 60, defaultCost: 15, required: false });
        } else {
            // Afternoon event: Lunch → Event → Activity → Dinner
            slots.push({ type: 'meal', activity: 'Pre-Event Lunch', categories: ['food'], duration: 60, defaultCost: 25, required: true });
            slots.push({ type: 'event', activity: anchorEvent.title, categories: [], duration: 120, defaultCost: 30, required: true });
            slots.push({ type: 'activity', activity: 'Post-Event Activity', categories: ['nature', 'culture', 'shopping'], duration: 45, defaultCost: 10, required: false });
            slots.push({ type: 'meal', activity: 'Evening Dinner', categories: ['food'], duration: 75, defaultCost: 35, required: false });
        }
        return slots;
    }

    // Build slots dynamically based on time of day
    // Generate rich itineraries so users have options to customize
    switch (prefs.time_of_day) {
        case 'morning':
            slots.push({ type: 'meal', activity: 'Breakfast/Coffee', categories: ['food'], duration: 45, defaultCost: 15, required: true });
            slots.push({ type: 'activity', activity: 'Morning Stroll', categories: ['nature'], duration: 45, defaultCost: 0, required: true });
            slots.push({ type: 'activity', activity: 'Culture Stop', categories: ['culture'], duration: 60, defaultCost: 15, required: true });
            slots.push({ type: 'activity', activity: 'Shopping/Browse', categories: ['shopping'], duration: 45, defaultCost: 10, required: false });
            if (durationMinutes >= 240) {
                slots.push({ type: 'meal', activity: 'Brunch/Lunch', categories: ['food'], duration: 60, defaultCost: 25, required: false });
                slots.push({ type: 'activity', activity: 'Afternoon Fun', categories: ['entertainment', 'activity'], duration: 60, defaultCost: 20, required: false });
            }
            break;

        case 'afternoon':
            slots.push({ type: 'meal', activity: 'Lunch', categories: ['food'], duration: 60, defaultCost: 25, required: true });
            slots.push({ type: 'activity', activity: 'Explore', categories: ['culture'], duration: 60, defaultCost: 15, required: true });
            slots.push({ type: 'activity', activity: 'Outdoor Time', categories: ['nature'], duration: 45, defaultCost: 0, required: true });
            slots.push({ type: 'dessert', activity: 'Sweet Treat', categories: ['food'], duration: 30, defaultCost: 12, required: false });
            if (durationMinutes >= 240) {
                slots.push({ type: 'activity', activity: 'Entertainment', categories: ['entertainment'], duration: 60, defaultCost: 20, required: false });
                slots.push({ type: 'drinks', activity: 'Happy Hour', categories: ['drink'], duration: 45, defaultCost: 18, required: false });
            }
            break;

        case 'full_day':
            // FULL DAY: Morning to Late Night (8-12 stops)
            // Morning Block
            slots.push({ type: 'meal', activity: 'Breakfast/Coffee', categories: ['food'], duration: 45, defaultCost: 15, required: true });
            slots.push({ type: 'activity', activity: 'Morning Walk', categories: ['nature'], duration: 40, defaultCost: 0, required: true });
            slots.push({ type: 'activity', activity: 'Morning Activity', categories: ['culture', 'activity'], duration: 60, defaultCost: 15, required: true });
            // Midday Block
            slots.push({ type: 'meal', activity: 'Lunch', categories: ['food'], duration: 60, defaultCost: 25, required: true });
            slots.push({ type: 'activity', activity: 'Afternoon Explore', categories: ['shopping', 'culture'], duration: 60, defaultCost: 15, required: true });
            slots.push({ type: 'activity', activity: 'Afternoon Fun', categories: ['entertainment', 'activity'], duration: 60, defaultCost: 20, required: false });
            // Late Afternoon
            slots.push({ type: 'dessert', activity: 'Afternoon Treat', categories: ['food'], duration: 30, defaultCost: 12, required: false });
            slots.push({ type: 'activity', activity: 'Golden Hour', categories: ['nature'], duration: 45, defaultCost: 0, required: false });
            // Evening Block
            slots.push({ type: 'meal', activity: 'Dinner', categories: ['food'], duration: 75, defaultCost: 40, required: true });
            slots.push({ type: 'activity', activity: 'Evening Entertainment', categories: ['culture', 'entertainment'], duration: 60, defaultCost: 25, required: true });
            // Night Block
            slots.push({ type: 'dessert', activity: 'Dessert', categories: ['food'], duration: 30, defaultCost: 12, required: false });
            slots.push({ type: 'drinks', activity: 'Nightcap', categories: ['drink'], duration: 45, defaultCost: 20, required: false });
            break;

        default: // Evening
            slots.push({ type: 'activity', activity: 'Pre-Dinner Walk', categories: ['nature'], duration: 30, defaultCost: 0, required: true });
            slots.push({ type: 'meal', activity: 'Dinner', categories: ['food'], duration: 75, defaultCost: 40, required: true });
            slots.push({ type: 'activity', activity: 'Evening Entertainment', categories: ['culture', 'entertainment'], duration: 60, defaultCost: 20, required: true });
            slots.push({ type: 'dessert', activity: 'Dessert Stop', categories: ['food'], duration: 30, defaultCost: 12, required: false });
            slots.push({ type: 'drinks', activity: 'Nightcap', categories: ['drink'], duration: 45, defaultCost: 18, required: false });
            if (durationMinutes >= 300) {
                slots.push({ type: 'activity', activity: 'Late Night Fun', categories: ['entertainment'], duration: 60, defaultCost: 20, required: false });
            }
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
  // Start with excluded venue IDs (for variety between days) + track used within this plan
  const usedVenueIds: string[] = [...(prefs.exclude_venue_ids || [])];
  let totalDuration = 0;
  const targetDuration = prefs.duration_hours * 60;

  for (const slot of slots) {
    // For non-required slots, only skip if we're significantly over time
    // This ensures we generate rich itineraries with options to remove
    if (!slot.required && totalDuration > targetDuration + 60) continue;

    if (slot.type === 'event' && anchorEvent) {
      stops.push({
        order: stops.length + 1,
        event: {
          id: anchorEvent.id,
          title: anchorEvent.title,
          start_datetime: anchorEvent.start_datetime,
          end_datetime: anchorEvent.end_datetime
        },
        venue: {
          id: anchorEvent.venue_id, name: anchorEvent.venue_name || anchorEvent.location_name,
          latitude: anchorEvent.venue_latitude, longitude: anchorEvent.venue_longitude, address: anchorEvent.venue_address
        },
        activity: anchorEvent.title,
        duration: slot.duration,
        cost: anchorEvent.price || slot.defaultCost,
        notes: anchorEvent.description?.slice(0, 150) || anchorEvent.title,
      });
      totalDuration += slot.duration;
      continue;
    }

    // Filter by category first
    let candidates = allVenues.filter(v => slot.categories.includes(v.category));

    // Filter by pet-friendly if traveling with a dog
    if (prefs.has_dog) {
      const petFriendlyCandidates = candidates.filter(v => v.pet_friendly === 1);
      // If we have pet-friendly options, use them; otherwise fall back to all candidates
      if (petFriendlyCandidates.length > 0) {
        candidates = petFriendlyCandidates;
      }
    }

    // Filter by kid-friendly if traveling with young children
    if (prefs.has_young_children) {
      const kidFriendlyCandidates = candidates.filter(v => v.kid_friendly === 1);
      // If we have kid-friendly options, use them; otherwise fall back to all candidates
      if (kidFriendlyCandidates.length > 0) {
        candidates = kidFriendlyCandidates;
      }
      // Also exclude bars and 21+ venues when with young children
      candidates = candidates.filter(v =>
        v.subcategory !== 'bar' &&
        v.subcategory !== 'dive_bar' &&
        v.subcategory !== 'speakeasy' &&
        v.subcategory !== 'brewery' &&
        v.subcategory !== 'wine_bar'
      );
    }

    // Filter by wheelchair accessibility if needed
    if (prefs.needs_wheelchair_access) {
      const wheelchairAccessibleCandidates = candidates.filter(v => v.wheelchair_accessible === 1);
      // If we have wheelchair accessible options, use them; otherwise fall back to all candidates
      if (wheelchairAccessibleCandidates.length > 0) {
        candidates = wheelchairAccessibleCandidates;
      }
    }

    // Filter out venues with stairs if user wants to avoid them
    if (prefs.avoid_stairs) {
      // Exclude venues with stairs UNLESS they have an elevator
      const noStairsCandidates = candidates.filter(v =>
        v.has_stairs !== 1 || v.has_elevator === 1
      );
      // If we have options without stairs, use them; otherwise fall back to all candidates
      if (noStairsCandidates.length > 0) {
        candidates = noStairsCandidates;
      }
    }

    // Filter by WiFi availability if user needs it
    if (prefs.needs_wifi) {
      const wifiCandidates = candidates.filter(v => v.has_wifi === 1);
      // If we have WiFi options, use them; otherwise fall back to all candidates
      if (wifiCandidates.length > 0) {
        candidates = wifiCandidates;
      }
    }

    // For evening/night slots (especially drinks/nightcap), filter by best_time to exclude daytime-only venues
    if (prefs.time_of_day === 'evening' || prefs.time_of_day === 'night') {
      if (slot.type === 'drinks' || slot.activity.toLowerCase().includes('nightcap')) {
        // For nightcap, strongly prefer venues open late (with 'night' or 'evening' in best_time)
        // Exclude coffee shops and other daytime-only places
        candidates = candidates.filter(v => {
          const bestTime = v.best_time ? safeParseArray(v.best_time) : [];
          // If no best_time set, allow it (don't exclude due to missing data)
          if (bestTime.length === 0) return true;
          // Exclude if best_time only has morning/afternoon (e.g., coffee shops that close at 5pm)
          const hasLateHours = bestTime.includes('evening') || bestTime.includes('night');
          const onlyEarlyHours = bestTime.every(t => t === 'morning' || t === 'afternoon');
          return hasLateHours || !onlyEarlyHours;
        });
      }
    }

    // For morning slots, prefer venues with morning in best_time
    if (prefs.time_of_day === 'morning') {
      // Boost morning-appropriate venues but don't exclude others
      candidates = candidates.sort((a, b) => {
        const aTime = a.best_time ? safeParseArray(a.best_time) : [];
        const bTime = b.best_time ? safeParseArray(b.best_time) : [];
        const aHasMorning = aTime.includes('morning');
        const bHasMorning = bTime.includes('morning');
        if (aHasMorning && !bHasMorning) return -1;
        if (!aHasMorning && bHasMorning) return 1;
        return 0;
      });
    }

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
      totalDuration += slot.duration;
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

// 21+ venue subcategories
const TWENTY_ONE_PLUS_SUBCATEGORIES = [
  'bar', 'speakeasy', 'wine_bar', 'dive_bar', 'brewery',
  'cocktail_bar', 'lounge', 'kava_bar', 'pub'
];

// Helper to filter venues by user preferences (21+, downtown, military)
function filterVenuesByPrefs(venues: any[], prefs: DatePreferences): any[] {
  let filtered = venues;

  // Filter by military access
  if (!prefs.has_military_access) {
    filtered = filtered.filter(v => {
      const name = (v.name || '').toLowerCase();
      const sourceId = (v.source_id || '').toLowerCase();
      const address = (v.address || '').toLowerCase();
      const isMilitaryVenue =
        name.includes('mwr') || name.includes('fort liberty') || name.includes('fort bragg') ||
        sourceId.includes('fort_liberty') || sourceId.includes('fort_bragg') || sourceId.includes('mwr') ||
        address.includes('fort liberty') || address.includes('fort bragg');
      return !isMilitaryVenue;
    });
  }

  // Filter by 21+ age restriction
  if (prefs.is_21_plus !== true) {
    filtered = filtered.filter(v => {
      const subcategory = (v.subcategory || '').toLowerCase();
      return !TWENTY_ONE_PLUS_SUBCATEGORIES.includes(subcategory);
    });
  }

  // Filter to downtown-only venues by default
  if (!prefs.include_area_attractions) {
    filtered = filtered.filter(v => v.is_downtown === 1);
  }

  // Filter out event_only venues (theaters, stadiums, arenas)
  // These should only be recommended when there's an event happening
  filtered = filtered.filter(v => v.event_only !== 1);

  return filtered;
}

// Enrich stops with any venue-specific events happening during the date
async function enrichStopsWithVenueEvents(
  DB: D1Database,
  stops: DateStop[],
  from: string,
  to: string
): Promise<void> {
  for (const stop of stops) {
    if (!stop.venue?.id) continue;

    // Fetch venue-only events for this venue on this day
    const venueEvents = await fetchEvents(DB, {
      venue_id: stop.venue.id,
      from,
      to,
      limit: 5,
      include_venue_only: true,  // Include venue-specific events
    });

    if (venueEvents.length > 0) {
      // Add venue events to the stop
      stop.venueEvents = venueEvents.map((e: any) => ({
        id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        categories: e.categories ? safeParseArray(e.categories) : [],
      }));

      // Update the notes to highlight there's an event
      const eventTitles = venueEvents.map((e: any) => e.title).join(', ');
      stop.notes = `${stop.notes} 🎉 Events tonight: ${eventTitles}`;
    }
  }
}

export async function getSwapSuggestion(
  DB: D1Database,
  prefs: DatePreferences,
  stopToSwap: DateStop,
  allStops: DateStop[]
): Promise<DateStop | null> {
    if (stopToSwap.venue) {
        const category = stopToSwap.venue.category;
        const currentVenueId = stopToSwap.venue.id;
        // Include current venue ID so we don't select the same venue again
        // Also include all other venues in the plan
        const usedVenueIds = [
          currentVenueId,
          ...allStops.map(s => s.venue?.id).filter(id => id && id !== currentVenueId)
        ].filter(Boolean) as string[];
        const context: ScoringContext = { vibes: prefs.vibes, budgetRange: prefs.budget_range, timeOfDay: prefs.time_of_day };

        // 1. Try same category first
        let venues = await DB.prepare(`SELECT * FROM venues WHERE category = ? AND latitude IS NOT NULL`).bind(category).all();
        let candidates = filterVenuesByPrefs((venues.results || []) as any[], prefs);
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
                candidates = filterVenuesByPrefs((venues.results || []) as any[], prefs);
                selected = selectBestVenue(candidates, context, usedVenueIds);
            }
        }

        // 3. If still nothing, try ANY venue with preferences applied
        if (!selected) {
            venues = await DB.prepare(`SELECT * FROM venues WHERE latitude IS NOT NULL`).all();
            candidates = filterVenuesByPrefs((venues.results || []) as any[], prefs);
            selected = selectBestVenue(candidates, context, usedVenueIds);
        }

        // 4. Last resort: try with relaxed downtown filter
        if (!selected) {
            const relaxedPrefs = { ...prefs, include_area_attractions: true };
            venues = await DB.prepare(`SELECT * FROM venues WHERE category = ? AND latitude IS NOT NULL`).bind(category).all();
            candidates = filterVenuesByPrefs((venues.results || []) as any[], relaxedPrefs);
            selected = selectBestVenue(candidates, context, usedVenueIds);
        }

        // 5. Absolute last resort: any venue, no filters except 21+
        if (!selected) {
            venues = await DB.prepare(`SELECT * FROM venues WHERE latitude IS NOT NULL`).all();
            // Only apply 21+ filter, allow all locations
            let allVenues = (venues.results || []) as any[];
            if (prefs.is_21_plus !== true) {
                allVenues = allVenues.filter(v => {
                    const subcategory = (v.subcategory || '').toLowerCase();
                    return !TWENTY_ONE_PLUS_SUBCATEGORIES.includes(subcategory);
                });
            }
            selected = selectBestVenue(allVenues, context, usedVenueIds);
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
        const currentEventId = stopToSwap.event.id;
        // Exclude current event from used list (we're replacing it), but include others
        const usedEventIds = allStops
          .map(s => s.event?.id)
          .filter(id => id && id !== currentEventId);

        const { from, to } = getTimeRange(prefs.date, prefs.time_of_day);

        // 1. Try to find events in the same time range
        let events = await fetchEvents(DB, { from, to, limit: 50 });
        let alternateEvents = events.filter(e => !usedEventIds.includes(e.id));
        let suggestion = findBestEvent(alternateEvents, prefs.vibes);

        // 2. If no alternatives, try fetching events for the full day
        if (!suggestion) {
            const dayStart = prefs.date + 'T00:00:00.000Z';
            const dayEnd = prefs.date + 'T23:59:59.999Z';
            events = await fetchEvents(DB, { from: dayStart, to: dayEnd, limit: 50 });
            alternateEvents = events.filter(e => !usedEventIds.includes(e.id));
            suggestion = findBestEvent(alternateEvents, prefs.vibes);
        }

        // 3. If still no alternatives, try upcoming events in next 7 days
        if (!suggestion) {
            const now = new Date().toISOString();
            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            events = await fetchEvents(DB, { from: now, to: nextWeek, limit: 50 });
            alternateEvents = events.filter(e => !usedEventIds.includes(e.id));
            suggestion = findBestEvent(alternateEvents, prefs.vibes);
        }

        if (!suggestion) return null;

        const description = suggestion.description
            ? suggestion.description.slice(0, 100) + (suggestion.description.length > 100 ? '...' : '')
            : suggestion.title;

        return {
            ...stopToSwap,
            event: {
              id: suggestion.id,
              title: suggestion.title,
              start_datetime: suggestion.start_datetime,
              end_datetime: suggestion.end_datetime
            },
            venue: {
                id: suggestion.venue_id || null,
                name: suggestion.venue_name || suggestion.location_name || 'TBD',
                latitude: suggestion.venue_latitude || null,
                longitude: suggestion.venue_longitude || null,
                address: suggestion.venue_address || null
            },
            activity: suggestion.title,
            notes: description,
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

  let candidates = filterVenuesByPrefs((venues.results || []) as any[], prefs);
  let selected = selectBestVenue(candidates, context, usedVenueIds);

  // Fallback: try any venue with preferences applied
  if (!selected) {
    const allVenues = await DB.prepare(`SELECT * FROM venues WHERE latitude IS NOT NULL`).all();
    candidates = filterVenuesByPrefs((allVenues.results || []) as any[], prefs);
    selected = selectBestVenue(candidates, context, usedVenueIds);
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