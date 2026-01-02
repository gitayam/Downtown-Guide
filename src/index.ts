/**
 * Fayetteville Central Calendar - API Worker
 *
 * Endpoints:
 *   GET /api/events          - List events with filters
 *   GET /api/events/today    - Today's events
 *   GET /api/events/upcoming - Next 7 days
 *   GET /api/events/weekend  - This weekend (Fri-Sun)
 *   GET /api/events/:id      - Single event details
 *   GET /api/categories      - List available categories
 *   GET /api/sources         - Event sources with sync status
 *   GET /cal/events.ics      - iCal calendar feed
 *   GET /api/health          - Health check
 *
 * Filter Parameters for /api/events:
 *   section    - Filter by area: downtown, fort_bragg, crown, all
 *   source     - Filter by source_id
 *   from       - Start date (ISO 8601)
 *   to         - End date (ISO 8601)
 *   search     - Text search in title/description
 *   category   - Single category filter
 *   categories - Multi-category filter (comma-separated)
 *   featured   - Filter featured events (true/false)
 *   limit      - Results per page (max 500)
 *   offset     - Pagination offset
 *
 * Full API docs: /docs/API.md
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import { secureHeaders } from 'hono/secure-headers';

type Bindings = {
  DB: D1Database;
  RAW_DATA: R2Bucket;
  DISCORD_WEBHOOK_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// ... (existing CORS and middleware code) ...

// Helper: Fetch Events Logic (refactored for reuse)
async function fetchEvents(DB: D1Database, params: {
  section?: string;
  source?: string;
  from?: string;
  to?: string;
  search?: string;
  category?: string;
  categories?: string;
  featured?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions: string[] = [];
  const queryParams: any[] = [];

  // Only show confirmed or active events
  conditions.push("e.status IN ('confirmed', 'active')");

  // Date filters
  const now = new Date().toISOString();
  if (!params.from) {
    // Default: show events active now or in future
    conditions.push('datetime(e.end_datetime) >= datetime(?)');
    queryParams.push(now);
  } else {
    conditions.push('datetime(e.start_datetime) >= datetime(?)');
    queryParams.push(params.from);
  }

  if (params.to) {
    conditions.push('datetime(e.start_datetime) <= datetime(?)');
    queryParams.push(params.to);
  }

  if (params.section && params.section !== 'all') {
    conditions.push('e.section = ?');
    queryParams.push(params.section);
  }

  if (params.category && params.category !== 'all') {
    conditions.push('e.categories LIKE ?');
    queryParams.push(`%"${params.category}"%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = params.limit || 50;
  
  // Reuse the main query structure
  queryParams.push(limit);
  
  const result = await DB.prepare(`
    SELECT
      e.id, e.title, e.start_datetime, e.end_datetime, 
      e.location_name, e.categories, e.image_url,
      v.name as venue_name, v.address as venue_address,
      v.image_url as venue_image_url
    FROM events e
    LEFT JOIN venues v ON e.venue_id = v.id
    ${whereClause}
    ORDER BY e.start_datetime ASC
    LIMIT ?
  `).bind(...queryParams).all();

  return result.results || [];
}

// =============================================================================
// GET /api/events/image - Generate Social Image
// =============================================================================

// Image generation endpoint - returns event data for client-side rendering
// Note: Server-side image generation disabled due to WASM limitations in Workers
app.get('/api/events/image', async (c) => {
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
  if (section === 'fort_bragg') subtitle = 'Fort Liberty';
  if (section === 'crown') subtitle = 'Crown Complex';

  // Fetch Events
  const events = await fetchEvents(DB, {
    section,
    from,
    to,
    limit: 8
  });

  // Return JSON data for client-side image generation
  return c.json({
    title,
    subtitle,
    events,
    generatedAt: new Date().toISOString(),
  });
});

// ... (rest of the existing endpoints) ...

const ALLOWED_ORIGINS = [
  'https://ncfayetteville.com',
  'https://fayetteville-events.pages.dev',
  /^https:\/\/[a-z0-9-]+\.fayetteville-events\.pages\.dev$/,  // Preview deployments
  'http://localhost:5173',  // Local dev
  'http://localhost:3000',
];

// CORS with origin whitelist
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*';  // Allow requests with no origin (curl, etc.)
    for (const allowed of ALLOWED_ORIGINS) {
      if (typeof allowed === 'string' && allowed === origin) return origin;
      if (allowed instanceof RegExp && allowed.test(origin)) return origin;
    }
    return null;  // Reject other origins
  },
  allowMethods: ['GET', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge: 86400,  // 24 hours
}));

// Security headers
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://downtown-guide.wemea-5ahhf.workers.dev', 'https://ncfayetteville.com'],
  },
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));

// Simple rate limiting using request counting per IP
// Note: For production, consider using Cloudflare's built-in rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100;  // requests per window
const RATE_WINDOW = 60 * 1000;  // 1 minute

app.use('/api/*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  const now = Date.now();

  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + RATE_WINDOW };
    rateLimitMap.set(ip, record);
  }

  record.count++;

  // Add rate limit headers
  c.header('X-RateLimit-Limit', RATE_LIMIT.toString());
  c.header('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT - record.count).toString());
  c.header('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());

  if (record.count > RATE_LIMIT) {
    return c.json({ error: 'Too many requests. Please try again later.' }, 429);
  }

  await next();
});

// Cache API responses for 5 minutes
app.use('/api/*', cache({
  cacheName: 'downtown-events-api',
  cacheControl: 'public, max-age=300',
}));

// Global error handler with CORS
app.onError((err, c) => {
  console.error('Global Worker Error:', err);
  return c.json(
    { error: 'Internal Server Error', details: err.message }, 
    500, 
    {
      'Access-Control-Allow-Origin': c.req.header('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    }
  );
});

// =============================================================================
// Health Check
// =============================================================================

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =============================================================================
// GET /api/sources - List event sources with sync status
// =============================================================================

app.get('/api/sources', async (c) => {
  const { DB } = c.env;

  const result = await DB.prepare(`
    SELECT
      id,
      name,
      url,
      type,
      section,
      sync_interval_minutes,
      last_sync,
      last_sync_status,
      last_sync_count,
      is_active
    FROM sources
    ORDER BY section, name
  `).all();

  return c.json({
    data: result.results,
    count: result.results?.length || 0,
  });
});

// =============================================================================
// GET /api/categories - List distinct event categories
// =============================================================================

app.get('/api/categories', async (c) => {
  const { DB } = c.env;

  // Get all categories from current and future events (show until event ends)
  const result = await DB.prepare(`
    SELECT categories FROM events
    WHERE end_datetime >= ? AND categories IS NOT NULL AND categories != '[]'
  `).bind(new Date().toISOString()).all();

  // Extract unique categories from JSON arrays
  const categorySet = new Set<string>();
  for (const row of result.results || []) {
    try {
      const cats = JSON.parse((row as { categories: string }).categories);
      if (Array.isArray(cats)) {
        cats.forEach((cat: string) => categorySet.add(cat));
      }
    } catch {
      // Skip invalid JSON
    }
  }

  // Sort alphabetically
  const categories = Array.from(categorySet).sort();

  return c.json({
    data: categories,
    count: categories.length,
  });
});

// =============================================================================
// GET /api/events/today - Today's events
// =============================================================================

app.get('/api/events/today', async (c) => {
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

// =============================================================================
// GET /api/events/upcoming - Next 7 days
// =============================================================================

app.get('/api/events/upcoming', async (c) => {
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

// =============================================================================
// GET /api/events/weekend - This weekend's events (Fri-Sun)
// =============================================================================

app.get('/api/events/weekend', async (c) => {
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

// =============================================================================
// GET /api/events/:id - Single event
// =============================================================================

app.get('/api/events/:id', async (c) => {
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

// =============================================================================
// GET /api/events - List events with filters
// =============================================================================

app.get('/api/events', async (c) => {
  const { DB } = c.env;

  // Query parameters
  const section = c.req.query('section');     // 'downtown' | 'fort_bragg' | 'crown' | 'all'
  const source = c.req.query('source');       // source_id
  const from = c.req.query('from');           // ISO date (start range)
  const to = c.req.query('to');               // ISO date (end range)
  const search = c.req.query('search');       // text search (title, description)
  const category = c.req.query('category');   // single category filter
  const categories = c.req.query('categories'); // multi-category filter (comma-separated)
  const featured = c.req.query('featured');   // filter featured events ('true' or 'false')
  const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500); // max 500
  const offset = parseInt(c.req.query('offset') || '0');

  // Build query
  const conditions: string[] = [];
  const params: any[] = [];

  // Only show confirmed or active events (exclude cancelled, past)
  conditions.push("e.status IN ('confirmed', 'active')");

  // Default: show events that haven't ended yet (end_datetime >= now)
  if (!from) {
    conditions.push('datetime(e.end_datetime) >= datetime(?)');
    params.push(new Date().toISOString());
  } else {
    // When 'from' is specified, use start_datetime for range queries
    conditions.push('datetime(e.start_datetime) >= datetime(?)');
    params.push(from);
  }

  if (to) {
    conditions.push('datetime(e.start_datetime) <= datetime(?)');
    params.push(to);
  }

  if (section && section !== 'all') {
    conditions.push('e.section = ?');
    params.push(section);
  }

  if (source) {
    conditions.push('e.source_id = ?');
    params.push(source);
  }

  // Text search on title and description
  if (search && search.trim()) {
    conditions.push('(e.title LIKE ? OR e.description LIKE ?)');
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  // Single category filter (JSON array contains)
  if (category && category !== 'all') {
    conditions.push('e.categories LIKE ?');
    params.push(`%"${category}"%`);
  }

  // Multi-category filter (comma-separated, event must match ANY of the categories)
  if (categories && categories.trim()) {
    const categoryList = categories.split(',').map(c => c.trim()).filter(c => c);
    if (categoryList.length > 0) {
      const categoryConditions = categoryList.map(() => 'e.categories LIKE ?');
      conditions.push(`(${categoryConditions.join(' OR ')})`);
      categoryList.forEach(cat => params.push(`%"${cat}"%`));
    }
  }

  // Featured filter
  if (featured === 'true') {
    conditions.push('e.featured = 1');
  } else if (featured === 'false') {
    conditions.push('(e.featured = 0 OR e.featured IS NULL)');
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // Count total
  const countResult = await DB.prepare(`
    SELECT COUNT(*) as total FROM events e ${whereClause}
  `).bind(...params).first<{ total: number }>();

  // Fetch events
  params.push(limit, offset);
  const result = await DB.prepare(`
    SELECT
      e.id,
      e.source_id,
      e.external_id,
      e.title,
      e.description,
      e.start_datetime,
      e.end_datetime,
      e.location_name,
      e.url,
      e.ticket_url,
      e.image_url,
      e.categories,
      e.section,
      e.status,
      e.featured,
      s.name as source_name,
      v.latitude as venue_latitude,
      v.longitude as venue_longitude,
      v.name as venue_name
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
    LEFT JOIN venues v ON e.venue_id = v.id
    ${whereClause}
    ORDER BY e.featured DESC, e.start_datetime ASC
    LIMIT ? OFFSET ?
  `).bind(...params).all();

  return c.json({
    data: result.results,
    count: result.results?.length || 0,
    total: countResult?.total || 0,
    limit,
    offset,
  });
});

// =============================================================================
// GET /cal/events.ics - iCal Feed
// =============================================================================

// Calendar names by section
const CALENDAR_NAMES: Record<string, string> = {
  downtown: 'Fayetteville Downtown Events',
  crown: 'Crown Complex Events',
  fort_bragg: 'Fort Liberty Events',
  holidays: 'Fort Liberty Training Holidays',
  all: 'Fayetteville Events (All)',
};

app.get('/cal/events.ics', async (c) => {
  const { DB } = c.env;

  const section = c.req.query('section');
  const source = c.req.query('source'); // Allow filtering by source (e.g., holidays)
  const category = c.req.query('category'); // Single category filter
  const categories = c.req.query('categories'); // Multi-category filter (comma-separated)
  const now = new Date().toISOString();

  // Show events until they end (not just until they start)
  let query = `
    SELECT * FROM events
    WHERE datetime(end_datetime) >= datetime(?)
      AND status IN ('confirmed', 'active')
  `;
  const params: any[] = [now];

  if (section && section !== 'all') {
    query += ' AND section = ?';
    params.push(section);
  }

  if (source) {
    query += ' AND source_id = ?';
    params.push(source);
  }

  // Single category filter
  if (category && category !== 'all') {
    query += ' AND categories LIKE ?';
    params.push(`%"${category}"%`);
  }

  // Multi-category filter (comma-separated, matches ANY)
  if (categories && categories.trim()) {
    const categoryList = categories.split(',').map(c => c.trim()).filter(c => c);
    if (categoryList.length > 0) {
      const categoryConditions = categoryList.map(() => 'categories LIKE ?');
      query += ` AND (${categoryConditions.join(' OR ')})`;
      categoryList.forEach(cat => params.push(`%"${cat}"%`));
    }
  }

  query += ' ORDER BY featured DESC, start_datetime ASC LIMIT 500';

  const result = await DB.prepare(query).bind(...params).all();
  const events = result.results || [];

  // Determine calendar name
  let calendarName = CALENDAR_NAMES.all;
  if (source === 'fort_liberty_holidays') {
    calendarName = CALENDAR_NAMES.holidays;
  } else if (category) {
    calendarName = `Fayetteville ${category} Events`;
  } else if (categories) {
    const catList = categories.split(',').map(c => c.trim()).slice(0, 3);
    calendarName = `Fayetteville ${catList.join(', ')} Events`;
  } else if (section && CALENDAR_NAMES[section]) {
    calendarName = CALENDAR_NAMES[section];
  }

  // Determine filename
  let filename = 'fayetteville-events.ics';
  if (source === 'fort_liberty_holidays') {
    filename = 'fort-liberty-holidays.ics';
  } else if (category) {
    filename = `fayetteville-${category.toLowerCase().replace(/\s+/g, '-')}-events.ics`;
  } else if (categories) {
    filename = `fayetteville-custom-events.ics`;
  } else if (section && section !== 'all') {
    filename = `fayetteville-${section.replace('_', '-')}-events.ics`;
  }

  // Generate iCal
  const ical = generateICalFeed(events, calendarName);

  return new Response(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=3600', // 1 hour cache
    },
  });
});

function generateICalFeed(events: any[], calendarName: string = 'Fayetteville Events'): string {
  const now = new Date();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fayetteville Central Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-TIMEZONE:America/New_York',
    // Add VTIMEZONE for America/New_York
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'TZNAME:EDT',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'TZNAME:EST',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const event of events) {
    const uid = `${event.id}@fayetteville-calendar`;
    const dtstart = formatICalDate(event.start_datetime);
    const dtend = formatICalDate(event.end_datetime);
    const dtstamp = formatICalDate(now.toISOString());
    const summary = escapeICalText(event.title);
    const description = escapeICalText(event.description || '');
    const location = escapeICalText(event.location_name || '');
    const url = event.url || '';

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `DTSTAMP:${dtstamp}`,
      `SUMMARY:${summary}`,
    );

    if (description) lines.push(`DESCRIPTION:${description}`);
    if (location) lines.push(`LOCATION:${location}`);
    if (url) lines.push(`URL:${url}`);

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatICalDate(isoDate: string): string {
  // Convert ISO date to iCal format: YYYYMMDDTHHMMSSZ
  // Input: 2025-12-31T20:00:00.000Z or 2025-12-31T20:00:00
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) {
    // Fallback if date is invalid
    return isoDate.replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace(' ', 'T');
  }
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// =============================================================================
// Default route
// =============================================================================

app.get('/', (c) => {
  return c.json({
    name: 'Fayetteville Central Calendar API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      sources: '/api/sources',
      events: '/api/events',
      eventsToday: '/api/events/today',
      eventsUpcoming: '/api/events/upcoming',
      eventById: '/api/events/:id',
      icalFeed: '/cal/events.ics',
    },
    docs: 'https://github.com/your-repo/downtown-guide',
  });
});

// =============================================================================
// Discord Webhook Integration
// =============================================================================

interface DiscordEmbed {
  title: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  thumbnail?: { url: string };
  timestamp?: string;
}

interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

// Section colors for Discord embeds
const SECTION_COLORS: Record<string, number> = {
  downtown: 0xA65D57,  // brick
  crown: 0x2D6A4F,     // capefear
  fort_bragg: 0x1E3A5F, // liberty
  default: 0x4A5568,   // gray
};

// Section emojis
const SECTION_EMOJIS: Record<string, string> = {
  downtown: '🏙️',
  crown: '🏟️',
  fort_bragg: '🎖️',
};

function formatEventTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

async function sendDiscordMessage(webhookUrl: string, payload: DiscordWebhookPayload): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('Discord webhook error:', error);
    return false;
  }
}

async function sendDailyDigest(env: Bindings): Promise<{ success: boolean; eventCount: number }> {
  if (!env.DISCORD_WEBHOOK_URL) {
    console.log('Discord webhook URL not configured');
    return { success: false, eventCount: 0 };
  }

  // Get today's events (Eastern Time)
  const now = new Date();
  const estOffset = -5 * 60; // EST offset in minutes
  const utcOffset = now.getTimezoneOffset();
  const estTime = new Date(now.getTime() + (utcOffset + estOffset) * 60000);

  const startOfDay = new Date(estTime.getFullYear(), estTime.getMonth(), estTime.getDate());
  const endOfDay = new Date(estTime.getFullYear(), estTime.getMonth(), estTime.getDate() + 1);

  // Convert back to UTC for DB query
  const startUTC = new Date(startOfDay.getTime() - (utcOffset + estOffset) * 60000).toISOString();
  const endUTC = new Date(endOfDay.getTime() - (utcOffset + estOffset) * 60000).toISOString();

  // Show events that start today OR are still ongoing (end_datetime >= now)
  const nowUTC = new Date().toISOString();
  const result = await env.DB.prepare(`
    SELECT e.*, s.name as source_name
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
    WHERE ((datetime(e.start_datetime) >= datetime(?) AND datetime(e.start_datetime) < datetime(?))
       OR (datetime(e.start_datetime) < datetime(?) AND datetime(e.end_datetime) >= datetime(?)))
      AND e.status IN ('confirmed', 'active')
    ORDER BY e.featured DESC, e.start_datetime ASC
    LIMIT 25
  `).bind(startUTC, endUTC, startUTC, nowUTC).all();

  const events = result.results || [];

  if (events.length === 0) {
    // Send "no events" message
    await sendDiscordMessage(env.DISCORD_WEBHOOK_URL, {
      username: 'Fayetteville Events',
      avatar_url: 'https://fayetteville-events.pages.dev/logo.png',
      embeds: [{
        title: '📅 No Events Today',
        description: 'There are no scheduled events for today. Check back tomorrow!',
        color: 0x4A5568,
        footer: { text: 'Fayetteville Central Calendar' },
        timestamp: new Date().toISOString(),
      }],
    });
    return { success: true, eventCount: 0 };
  }

  // Group events by section
  const eventsBySection: Record<string, any[]> = {
    downtown: [],
    crown: [],
    fort_bragg: [],
  };

  for (const event of events) {
    const section = (event as any).section || 'downtown';
    if (eventsBySection[section]) {
      eventsBySection[section].push(event);
    } else {
      eventsBySection.downtown.push(event);
    }
  }

  // Create embeds for each section with events
  const embeds: DiscordEmbed[] = [];
  const dateStr = estTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });

  // Header embed
  embeds.push({
    title: `📅 Events for ${dateStr}`,
    description: `**${events.length}** event${events.length !== 1 ? 's' : ''} happening today in Fayetteville!`,
    color: 0xA65D57,
    url: 'https://fayetteville-events.pages.dev',
  });

  // Create embed for each section with events
  for (const [section, sectionEvents] of Object.entries(eventsBySection)) {
    if (sectionEvents.length === 0) continue;

    const emoji = SECTION_EMOJIS[section] || '📍';
    const sectionName = section === 'downtown' ? 'Downtown' :
                       section === 'crown' ? 'Crown Complex' :
                       section === 'fort_bragg' ? 'Fort Bragg' : section;

    const fields = sectionEvents.slice(0, 6).map((event: any) => ({
      name: `${formatEventTime(event.start_datetime)}`,
      value: `**[${truncateText(event.title, 50)}](${event.url || 'https://fayetteville-events.pages.dev/events/' + event.id})**${event.location_name ? `\n📍 ${truncateText(event.location_name, 40)}` : ''}`,
      inline: false,
    }));

    embeds.push({
      title: `${emoji} ${sectionName} (${sectionEvents.length})`,
      color: SECTION_COLORS[section] || SECTION_COLORS.default,
      fields,
    });
  }

  // Footer embed
  embeds.push({
    description: '🔗 [View All Events](https://fayetteville-events.pages.dev) | [Subscribe to Calendar](https://fayetteville-events.pages.dev/calendar)',
    color: 0x4A5568,
    footer: { text: 'Fayetteville Central Calendar • Updated daily at 8 AM' },
    timestamp: new Date().toISOString(),
  });

  // Send to Discord (max 10 embeds per message)
  const success = await sendDiscordMessage(env.DISCORD_WEBHOOK_URL, {
    username: 'Fayetteville Events',
    avatar_url: 'https://fayetteville-events.pages.dev/logo.png',
    embeds: embeds.slice(0, 10),
  });

  return { success, eventCount: events.length };
}

// =============================================================================
// Manual Discord Trigger Endpoint (for testing)
// =============================================================================

app.post('/api/discord/daily-digest', async (c) => {
  const result = await sendDailyDigest(c.env);
  return c.json(result);
});

app.get('/api/discord/test', async (c) => {
  if (!c.env.DISCORD_WEBHOOK_URL) {
    return c.json({ error: 'Discord webhook not configured' }, 500);
  }

  const success = await sendDiscordMessage(c.env.DISCORD_WEBHOOK_URL, {
    username: 'Fayetteville Events',
    content: '✅ Discord webhook test successful!',
  });

  return c.json({ success });
});

// =============================================================================
// Scheduled Handler (Cron Trigger)
// =============================================================================

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    const now = new Date();
    const hour = now.getUTCHours();

    console.log(`Scheduled job triggered at ${now.toISOString()} (UTC hour: ${hour})`);

    // Send daily digest at 13:00 UTC (8:00 AM EST)
    if (hour === 13) {
      console.log('Sending daily Discord digest...');
      const result = await sendDailyDigest(env);
      console.log(`Daily digest sent: ${result.eventCount} events, success: ${result.success}`);
    }

    // Update sources sync timestamp
    try {
      await env.DB.prepare(`
        UPDATE sources
        SET last_sync = ?
        WHERE is_active = 1
      `).bind(now.toISOString()).run();

      console.log('Cron job completed successfully');
    } catch (error) {
      console.error('Cron job failed:', error);
    }
  },
};
