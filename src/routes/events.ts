
import { Hono } from 'hono';
import { Bindings } from '../types';
import { fetchEvents, countEvents } from '../lib/events';

const events = new Hono<{ Bindings: Bindings }>();

// GET /api/events/today - Today's events
events.get('/today', async (c) => {
  const { DB } = c.env;

  const today = new Date();
  const now = today.toISOString();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  // Show events that:
  // 1. Start today (start_datetime >= startOfDay AND start_datetime < endOfDay), OR
  // 2. Are still ongoing (started before but end_datetime >= now)
  const result = await DB.prepare(`
    SELECT
      e.*,
      s.name as source_name
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
    WHERE (e.start_datetime >= ? AND e.start_datetime < ?)
       OR (e.start_datetime < ? AND e.end_datetime >= ?)
    ORDER BY e.start_datetime ASC
  `).bind(startOfDay, endOfDay, startOfDay, now).all();

  return c.json({
    data: result.results,
    count: result.results?.length || 0,
    date: startOfDay.split('T')[0],
  });
});

// GET /api/events/upcoming - Next 7 days
events.get('/upcoming', async (c) => {
  const { DB } = c.env;

  const now = new Date().toISOString();
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Show events that are still ongoing (end_datetime >= now) or start within the week
  const result = await DB.prepare(`
    SELECT
      e.*,
      s.name as source_name
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
    WHERE e.end_datetime >= ? AND e.start_datetime < ?
    ORDER BY e.start_datetime ASC
  `).bind(now, weekFromNow).all();

  return c.json({
    data: result.results,
    count: result.results?.length || 0,
    range: { from: now, to: weekFromNow },
  });
});

// GET /api/events/weekend - This weekend's events (Fri-Sun)
events.get('/weekend', async (c) => {
  const { DB } = c.env;

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday

  // Calculate Friday start and Sunday end
  let fridayStart: Date;
  let sundayEnd: Date;

  if (dayOfWeek === 0) {
    // Sunday - show today only (end of current weekend)
    fridayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    sundayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (dayOfWeek === 6) {
    // Saturday - show Sat-Sun
    fridayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    sundayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  } else if (dayOfWeek === 5) {
    // Friday - show Fri-Sun
    fridayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    sundayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
  } else {
    // Mon-Thu - show upcoming Fri-Sun
    const daysUntilFriday = 5 - dayOfWeek;
    fridayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFriday);
    sundayEnd = new Date(fridayStart.getTime() + 3 * 24 * 60 * 60 * 1000);
  }

  const result = await DB.prepare(`
    SELECT
      e.*,
      s.name as source_name
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
    WHERE e.end_datetime >= ? AND e.start_datetime < ?
      AND e.status IN ('confirmed', 'active')
    ORDER BY e.start_datetime ASC
  `).bind(fridayStart.toISOString(), sundayEnd.toISOString()).all();

  return c.json({
    data: result.results,
    count: result.results?.length || 0,
    range: {
      from: fridayStart.toISOString(),
      to: sundayEnd.toISOString(),
    },
  });
});

// GET /api/events/image - Generate Social Image Data
events.get('/image', async (c) => {
  const { DB } = c.env;
  const section = c.req.query('section') || 'all';
  const dateFilter = c.req.query('date') || 'upcoming';

  // Calculate Date Ranges
  const now = new Date();
  let from = now.toISOString();
  let to: string | undefined;
  let title = 'Upcoming Events';
  let subtitle = 'Fayetteville, NC';

  if (dateFilter === 'today') {
    title = "Today's Events";
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    from = startOfDay.toISOString();
    to = endOfDay.toISOString();
  } else if (dateFilter === 'tomorrow') {
    title = "Tomorrow's Events";
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    from = start.toISOString();
    to = end.toISOString();
  } else if (dateFilter === 'week') {
    title = "This Week's Events";
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    from = start.toISOString();
    to = end.toISOString();
  } else if (dateFilter === 'month') {
    title = "This Month's Events";
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    from = start.toISOString();
    to = end.toISOString();
  }

  if (section === 'downtown') subtitle = 'Downtown Fayetteville';
  if (section === 'fort_bragg') subtitle = 'Fort Bragg';
  if (section === 'crown') subtitle = 'Crown Complex';

  // Use the helper from lib/events.ts
  const eventsData = await fetchEvents(DB, {
    section,
    from,
    to,
    limit: 8
  });

  return c.json({
    title,
    subtitle,
    events: eventsData,
    generatedAt: new Date().toISOString(),
  });
});

// GET /api/events/:id - Single event
events.get('/:id', async (c) => {
  const { DB } = c.env;
  const id = c.req.param('id');

  const result = await DB.prepare(`
    SELECT
      e.*,
      s.name as source_name,
      v.name as venue_name,
      v.address as venue_address,
      v.city as venue_city,
      v.state as venue_state,
      v.zip as venue_zip,
      v.phone as venue_phone,
      v.website as venue_website,
      v.google_maps_url as venue_google_maps_url,
      v.apple_maps_url as venue_apple_maps_url,
      v.hours_of_operation as venue_hours_of_operation,
      v.image_url as venue_image_url,
      v.parking_info as venue_parking_info,
      v.accessibility_info as venue_accessibility_info,
      v.latitude as venue_latitude,
      v.longitude as venue_longitude
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
    LEFT JOIN venues v ON e.venue_id = v.id
    WHERE e.id = ?
  `).bind(id).first();

  if (!result) {
    return c.json({ error: 'Event not found' }, 404);
  }

  return c.json({ data: result });
});

// GET /api/events - List events with filters
events.get('/', async (c) => {
  const { DB } = c.env;

  const params = {
    section: c.req.query('section'),
    source: c.req.query('source'),
    from: c.req.query('from'),
    to: c.req.query('to'),
    search: c.req.query('search'),
    category: c.req.query('category'),
    categories: c.req.query('categories'),
    featured: c.req.query('featured'),
    limit: Math.min(parseInt(c.req.query('limit') || '100'), 500),
    offset: parseInt(c.req.query('offset') || '0'),
  };

  const [data, total] = await Promise.all([
    fetchEvents(DB, params),
    countEvents(DB, params)
  ]);

  return c.json({
    data,
    count: data.length,
    total,
    limit: params.limit,
    offset: params.offset,
  });
});

export default events;
