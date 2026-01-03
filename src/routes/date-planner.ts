
import { Hono } from 'hono';
import { Bindings } from '../types';
import { generateDatePlan, getSwapSuggestion, getAddSuggestion } from '../services/date-generator';

const datePlanner = new Hono<{ Bindings: Bindings }>();

// GET /api/date-planner/suggestions
// Get suggestions for form dropdowns or initial ideas
datePlanner.get('/suggestions', async (c) => {
  return c.json({
    // Occasion/Event Types - expanded for more use cases
    event_types: [
      { id: "date_night", label: "Date Night", icon: "❤️", description: "Romantic evening out" },
      { id: "first_date", label: "First Date", icon: "✨", description: "Low-pressure, get to know each other" },
      { id: "anniversary", label: "Anniversary", icon: "💍", description: "Celebrate your milestone" },
      { id: "friends_night", label: "Friends Night", icon: "🎉", description: "Fun night with the crew" },
      { id: "family_outing", label: "Family Outing", icon: "👨‍👩‍👧", description: "Fun for all ages" },
      { id: "solo_adventure", label: "Solo Adventure", icon: "🚀", description: "Treat yourself" },
      { id: "casual_hangout", label: "Casual Hangout", icon: "☕", description: "Relaxed, no pressure" },
      { id: "special_occasion", label: "Special Occasion", icon: "🎂", description: "Birthday, promotion, etc." },
      { id: "active_day", label: "Active Day", icon: "🏃", description: "Get moving and stay active" },
      { id: "chill_day", label: "Chill Day", icon: "😌", description: "Low-key and relaxing" }
    ],

    // Vibes - emotional/style tags
    vibes: [
      { id: "romantic", label: "Romantic", icon: "💕" },
      { id: "fun", label: "Fun", icon: "🎈" },
      { id: "relaxed", label: "Relaxed", icon: "🌿" },
      { id: "adventurous", label: "Adventurous", icon: "🧗" },
      { id: "cultural", label: "Cultural", icon: "🎭" },
      { id: "outdoors", label: "Outdoors", icon: "🌲" },
      { id: "foodie", label: "Foodie", icon: "🍽️" },
      { id: "artsy", label: "Artsy", icon: "🎨" },
      { id: "sporty", label: "Sporty", icon: "⚽" },
      { id: "cozy", label: "Cozy", icon: "🕯️" },
      { id: "upscale", label: "Upscale", icon: "🥂" },
      { id: "budget_friendly", label: "Budget-Friendly", icon: "💰" }
    ],

    // Budget ranges with actual dollar amounts
    budget_ranges: [
      { id: "$", label: "$", description: "Under $30", maxBudget: 30 },
      { id: "$$", label: "$$", description: "$30-$75", maxBudget: 75 },
      { id: "$$$", label: "$$$", description: "$75-$150", maxBudget: 150 },
      { id: "$$$$", label: "$$$$", description: "$150+", maxBudget: 300 }
    ],

    // Activity level options
    activity_levels: [
      { id: 1, label: "Very Chill", description: "Minimal walking, seated activities" },
      { id: 2, label: "Relaxed", description: "Some walking, mostly relaxed" },
      { id: 3, label: "Moderate", description: "Mix of active and relaxed" },
      { id: 4, label: "Active", description: "On your feet, exploring" },
      { id: 5, label: "Very Active", description: "Adventure mode, lots of movement" }
    ],

    // Quick date presets
    quick_presets: [
      { id: "quick_coffee", label: "Quick Coffee Date", duration: 1.5, event_type: "casual_hangout", vibes: ["relaxed", "cozy"], budget: "$" },
      { id: "dinner_drinks", label: "Dinner & Drinks", duration: 3, event_type: "date_night", vibes: ["romantic", "foodie"], budget: "$$" },
      { id: "full_day_adventure", label: "Full Day Adventure", duration: 6, event_type: "active_day", vibes: ["adventurous", "outdoors"], budget: "$$" },
      { id: "romantic_evening", label: "Romantic Evening", duration: 4, event_type: "anniversary", vibes: ["romantic", "upscale"], budget: "$$$" },
      { id: "budget_fun", label: "Budget-Friendly Fun", duration: 3, event_type: "friends_night", vibes: ["fun", "budget_friendly"], budget: "$" },
      { id: "cultural_afternoon", label: "Cultural Afternoon", duration: 4, event_type: "date_night", vibes: ["cultural", "artsy"], budget: "$$" }
    ],

    // "When" quick options
    when_options: [
      { id: "today", label: "Today" },
      { id: "tomorrow", label: "Tomorrow" },
      { id: "this_weekend", label: "This Weekend" },
      { id: "next_weekend", label: "Next Weekend" },
      { id: "pick_date", label: "Pick a Date" }
    ],

    // Time of day with actual hours
    time_of_day: [
      { id: "morning", label: "Morning", startHour: 8, endHour: 12, icon: "🌅" },
      { id: "afternoon", label: "Afternoon", startHour: 12, endHour: 17, icon: "☀️" },
      { id: "evening", label: "Evening", startHour: 17, endHour: 21, icon: "🌆" },
      { id: "night", label: "Late Night", startHour: 21, endHour: 24, icon: "🌙" }
    ],

    // Duration options in hours
    duration_options: [
      { hours: 1, label: "Quick (1 hr)" },
      { hours: 2, label: "Short (2 hrs)" },
      { hours: 3, label: "Standard (3 hrs)" },
      { hours: 4, label: "Extended (4 hrs)" },
      { hours: 6, label: "Half Day (6 hrs)" },
      { hours: 8, label: "Full Day (8 hrs)" }
    ],

    // Dietary/food preferences
    food_preferences: [
      { id: "no_preference", label: "No Preference" },
      { id: "vegetarian", label: "Vegetarian" },
      { id: "vegan", label: "Vegan" },
      { id: "gluten_free", label: "Gluten-Free" },
      { id: "halal", label: "Halal" },
      { id: "kosher", label: "Kosher" }
    ],

    // Include/exclude activity types
    activity_preferences: [
      { id: "include_food", label: "Include Meal", default: true },
      { id: "include_drinks", label: "Include Drinks", default: false },
      { id: "include_dessert", label: "Include Dessert", default: false },
      { id: "include_activity", label: "Include Activity", default: true },
      { id: "include_outdoors", label: "Include Outdoors", default: false }
    ],

    // Military base access (Fort Bragg/Liberty venues often require military ID)
    access_options: [
      {
        id: "has_military_access",
        label: "I have military base access",
        description: "Include Fort Bragg/Fort Liberty venues (requires military ID or star on license)",
        default: false
      }
    ]
  });
});

// POST /api/date-planner/generate
// Generate a date plan based on user preferences
datePlanner.post('/generate', async (c) => {
  const body = await c.req.json();
  const { DB } = c.env;
  
  try {
    const plan = await generateDatePlan(DB, body);
    return c.json({
      status: 'success',
      plan
    });
  } catch (error) {
    console.error('Date generation error:', error);
    return c.json({ error: 'Failed to generate plan' }, 500);
  }
});

// POST /api/date-planner/swap
// Swap a single stop in an itinerary
datePlanner.post('/swap', async (c) => {
  const { DB } = c.env;
  const { stopToSwap, allStops, preferences } = await c.req.json();

  if (!stopToSwap || !allStops || !preferences) {
    return c.json({ error: 'Invalid request body' }, 400);
  }
  
  try {
    const newStop = await getSwapSuggestion(DB, preferences, stopToSwap, allStops);
    if (!newStop) {
      return c.json({ error: 'No alternative found' }, 404);
    }
    return c.json({ status: 'success', newStop });
  } catch (error) {
    console.error('Swap stop error:', error);
    return c.json({ error: 'Failed to swap stop' }, 500);
  }
});

// POST /api/date-planner/add
// Add a new stop to an itinerary at a specific position
datePlanner.post('/add', async (c) => {
  const { DB } = c.env;
  const { insertAfterIndex, allStops, preferences } = await c.req.json();

  if (typeof insertAfterIndex !== 'number' || !allStops || !preferences) {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  try {
    const newStop = await getAddSuggestion(DB, preferences, insertAfterIndex, allStops);
    if (!newStop) {
      return c.json({ error: 'No suggestion found' }, 404);
    }
    return c.json({ status: 'success', newStop });
  } catch (error) {
    console.error('Add stop error:', error);
    return c.json({ error: 'Failed to add stop' }, 500);
  }
});

// GET /api/date-planner/plan/:id
// Retrieve a specific plan by ID
datePlanner.get('/plan/:id', async (c) => {
  const id = c.req.param('id');
  const { DB } = c.env;
  
  const plan = await DB.prepare('SELECT * FROM saved_dates WHERE id = ?').bind(id).first();
  
  if (!plan) {
    return c.json({ error: 'Plan not found' }, 404);
  }

  // Reconstruct plan object
  let planData;
  try {
    planData = JSON.parse(plan.notes as string);
  } catch {
    planData = { title: plan.title, stops: [] };
  }

  return c.json({ data: planData });
});

// POST /api/date-planner/save
// Save a generated plan
datePlanner.post('/save', async (c) => {
  const body = await c.req.json();
  const { DB } = c.env;
  
  const id = crypto.randomUUID();
  const shareId = crypto.randomUUID().split('-')[0]; // Short ID for sharing (first 8 chars)
  const now = new Date().toISOString();

  // Validate body structure (basic)
  if (!body.title || !body.stops) {
    return c.json({ error: 'Invalid plan data' }, 400);
  }

  try {
    await DB.prepare(`
      INSERT INTO saved_dates (id, share_id, title, venues, events, notes, budget, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      shareId,
      body.title,
      JSON.stringify(body.stops.map((s: any) => s.venue?.id || null).filter(Boolean)), // Extract venue IDs
      JSON.stringify([]), // Events not yet fully linked in MVP
      JSON.stringify(body), // Store full plan JSON in notes for now to reconstruct easily
      body.estimatedCost,
      now
    ).run();

    return c.json({ id, shareId, message: "Plan saved" });
  } catch (error) {
    console.error('Save plan error:', error);
    return c.json({ error: 'Failed to save plan' }, 500);
  }
});

// GET /api/date-planner/share/:shareId
// Retrieve a plan by its share ID (public link)
datePlanner.get('/share/:shareId', async (c) => {
  const shareId = c.req.param('shareId');
  const { DB } = c.env;

  const row = await DB.prepare('SELECT * FROM saved_dates WHERE share_id = ?').bind(shareId).first();

  if (!row) {
    return c.json({ error: 'Plan not found' }, 404);
  }

  // Reconstruct plan object
  // In MVP we stored the full JSON in 'notes' for simplicity
  let planData;
  try {
    planData = JSON.parse(row.notes as string);
  } catch {
    planData = { title: row.title, stops: [] };
  }

  return c.json({ data: planData });
});

// POST /api/date-planner/scrape-maps-url
// Scrape venue info from Google Maps or Apple Maps URL
datePlanner.post('/scrape-maps-url', async (c) => {
  const { url } = await c.req.json();

  if (!url) {
    return c.json({ error: 'URL is required' }, 400);
  }

  try {
    const venueInfo = await scrapeMapUrl(url);
    if (!venueInfo) {
      return c.json({ error: 'Could not extract venue information' }, 400);
    }
    return c.json({ status: 'success', venue: venueInfo });
  } catch (error) {
    console.error('Scrape URL error:', error);
    return c.json({ error: 'Failed to scrape URL' }, 500);
  }
});

// POST /api/date-planner/add-custom-venue
// Add a custom venue to a plan and track user demand
datePlanner.post('/add-custom-venue', async (c) => {
  const { DB } = c.env;
  const { venue, planContext, planId } = await c.req.json();

  if (!venue || !venue.name) {
    return c.json({ error: 'Venue name is required' }, 400);
  }

  try {
    // Check if we already have this venue request (by name similarity or maps URL)
    let existingRequest = null;
    if (venue.google_maps_url) {
      existingRequest = await DB.prepare(
        'SELECT * FROM user_venue_requests WHERE google_maps_url = ?'
      ).bind(venue.google_maps_url).first();
    }
    if (!existingRequest && venue.apple_maps_url) {
      existingRequest = await DB.prepare(
        'SELECT * FROM user_venue_requests WHERE apple_maps_url = ?'
      ).bind(venue.apple_maps_url).first();
    }

    const now = new Date().toISOString();

    if (existingRequest) {
      // Increment request count
      await DB.prepare(`
        UPDATE user_venue_requests
        SET request_count = request_count + 1,
            last_requested_at = ?
        WHERE id = ?
      `).bind(now, existingRequest.id).run();

      return c.json({
        status: 'success',
        message: 'Venue demand recorded',
        venueRequest: existingRequest,
        isExisting: true
      });
    }

    // Create new user venue request
    const id = crypto.randomUUID();
    await DB.prepare(`
      INSERT INTO user_venue_requests (
        id, name, address, city, state, latitude, longitude,
        google_maps_url, apple_maps_url, suggested_category, suggested_vibe,
        plan_context, submitted_from_plan_id, user_notes, first_requested_at, last_requested_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      venue.name,
      venue.address || null,
      venue.city || 'Fayetteville',
      venue.state || 'NC',
      venue.latitude || null,
      venue.longitude || null,
      venue.google_maps_url || null,
      venue.apple_maps_url || null,
      venue.suggested_category || null,
      venue.suggested_vibe || null,
      planContext ? JSON.stringify(planContext) : null,
      planId || null,
      venue.notes || null,
      now,
      now
    ).run();

    return c.json({
      status: 'success',
      message: 'Venue request saved',
      venueRequestId: id,
      isExisting: false
    });
  } catch (error) {
    console.error('Add custom venue error:', error);
    return c.json({ error: 'Failed to save venue request' }, 500);
  }
});

// GET /api/date-planner/venues-by-category/:category
// Get venue suggestions by category for "add stop" feature
datePlanner.get('/venues-by-category/:category', async (c) => {
  const { DB } = c.env;
  const category = c.req.param('category');
  const limit = parseInt(c.req.query('limit') || '10');

  try {
    const venues = await DB.prepare(`
      SELECT id, name, address, city, category, subcategory,
             latitude, longitude, average_cost, vibe, description,
             rating, review_count, typical_duration
      FROM venues
      WHERE category = ? AND latitude IS NOT NULL
      ORDER BY rating DESC, review_count DESC
      LIMIT ?
    `).bind(category, limit).all();

    return c.json({
      status: 'success',
      venues: venues.results || [],
      count: venues.results?.length || 0
    });
  } catch (error) {
    console.error('Fetch venues by category error:', error);
    return c.json({ error: 'Failed to fetch venues' }, 500);
  }
});

// Helper: Scrape Google/Apple Maps URL for venue metadata
async function scrapeMapUrl(url: string): Promise<any> {
  // Normalize URL
  const cleanUrl = url.trim();

  // Detect URL type
  const isGoogleMaps = cleanUrl.includes('google.com/maps') || cleanUrl.includes('maps.google') || cleanUrl.includes('goo.gl/maps');
  const isAppleMaps = cleanUrl.includes('maps.apple.com');

  let venueInfo: any = {
    source_url: cleanUrl,
    source_type: isGoogleMaps ? 'google_maps' : isAppleMaps ? 'apple_maps' : 'unknown'
  };

  try {
    // Fetch the URL to get redirected URL and page content
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DatePlanner/1.0)'
      },
      redirect: 'follow'
    });

    const finalUrl = response.url;
    const html = await response.text();

    if (isGoogleMaps) {
      // Parse Google Maps URL for coordinates
      // Pattern: /@35.0527,-78.8784,17z or /place/Venue+Name/@35.0527,-78.8784
      const coordMatch = finalUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (coordMatch) {
        venueInfo.latitude = parseFloat(coordMatch[1]);
        venueInfo.longitude = parseFloat(coordMatch[2]);
      }

      // Try to extract place name from URL
      const placeMatch = finalUrl.match(/\/place\/([^\/]+)/);
      if (placeMatch) {
        venueInfo.name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      }

      // Try to extract from page title
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch && !venueInfo.name) {
        // Google Maps titles are often "Venue Name - Google Maps"
        const titleParts = titleMatch[1].split(' - ');
        if (titleParts.length > 0) {
          venueInfo.name = titleParts[0].trim();
        }
      }

      // Look for address in meta tags or structured data
      const addressMatch = html.match(/"address":"([^"]+)"/);
      if (addressMatch) {
        venueInfo.address = addressMatch[1];
      }

      venueInfo.google_maps_url = finalUrl;
    }
    else if (isAppleMaps) {
      // Parse Apple Maps URL
      // Pattern: ll=35.0527,-78.8784 or q=Venue+Name
      const llMatch = finalUrl.match(/ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (llMatch) {
        venueInfo.latitude = parseFloat(llMatch[1]);
        venueInfo.longitude = parseFloat(llMatch[2]);
      }

      const qMatch = finalUrl.match(/q=([^&]+)/);
      if (qMatch) {
        venueInfo.name = decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
      }

      // Try to extract from page title
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch && !venueInfo.name) {
        venueInfo.name = titleMatch[1].split(' - ')[0].trim();
      }

      venueInfo.apple_maps_url = finalUrl;
    }

    // If we still don't have a name, return null
    if (!venueInfo.name) {
      return null;
    }

    return venueInfo;
  } catch (error) {
    console.error('Error scraping URL:', error);
    return null;
  }
}

// GET /api/date-planner/venue-categories
// Get available venue categories for the add stop dropdown
datePlanner.get('/venue-categories', async (c) => {
  return c.json({
    categories: [
      { id: 'food', label: 'Restaurant / Food', icon: '🍽️', description: 'Dining options' },
      { id: 'drink', label: 'Bar / Drinks', icon: '🍸', description: 'Bars, breweries, cafes' },
      { id: 'activity', label: 'Activity', icon: '🎯', description: 'Fun activities' },
      { id: 'nature', label: 'Outdoors / Nature', icon: '🌲', description: 'Parks, trails, outdoor spots' },
      { id: 'culture', label: 'Culture / Arts', icon: '🎭', description: 'Museums, galleries, theaters' },
      { id: 'entertainment', label: 'Entertainment', icon: '🎬', description: 'Movies, shows, games' },
      { id: 'shopping', label: 'Shopping', icon: '🛍️', description: 'Retail and shopping' },
      { id: 'custom', label: 'Custom / Other', icon: '✨', description: 'Add your own spot' }
    ]
  });
});

export default datePlanner;
