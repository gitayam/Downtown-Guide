/**
 * Fayetteville Central Calendar - API Worker
 *
 * Endpoints:
 *   GET /api/events          - List events with filters
 *   GET /api/events/today    - Today's events
 *   GET /api/events/upcoming - Next 7 days
 *   GET /api/events/:id      - Single event
 *   GET /api/sources         - Source status
 *   GET /cal/events.ics      - iCal feed
 *   GET /api/health          - Health check
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';

type Bindings = {
  DB: D1Database;
  RAW_DATA: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS for all routes
app.use('*', cors());

// Cache API responses for 5 minutes
app.use('/api/*', cache({
  cacheName: 'downtown-events-api',
  cacheControl: 'public, max-age=300',
}));

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
// GET /api/events/today - Today's events
// =============================================================================

app.get('/api/events/today', async (c) => {
  const { DB } = c.env;

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const result = await DB.prepare(`
    SELECT
      e.*,
      s.name as source_name
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
    WHERE e.start_datetime >= ? AND e.start_datetime < ?
    ORDER BY e.start_datetime ASC
  `).bind(startOfDay, endOfDay).all();

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

  const result = await DB.prepare(`
    SELECT
      e.*,
      s.name as source_name
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
    WHERE e.start_datetime >= ? AND e.start_datetime < ?
    ORDER BY e.start_datetime ASC
  `).bind(now, weekFromNow).all();

  return c.json({
    data: result.results,
    count: result.results?.length || 0,
    range: { from: now, to: weekFromNow },
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
      s.name as source_name
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
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
  const section = c.req.query('section'); // 'downtown' | 'fort_bragg'
  const source = c.req.query('source');   // source_id
  const from = c.req.query('from');       // ISO date
  const to = c.req.query('to');           // ISO date
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');

  // Build query
  const conditions: string[] = [];
  const params: any[] = [];

  // Default: future events only
  if (!from) {
    conditions.push('e.start_datetime >= ?');
    params.push(new Date().toISOString());
  } else {
    conditions.push('e.start_datetime >= ?');
    params.push(from);
  }

  if (to) {
    conditions.push('e.start_datetime <= ?');
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
      s.name as source_name
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
    ${whereClause}
    ORDER BY e.start_datetime ASC
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

app.get('/cal/events.ics', async (c) => {
  const { DB } = c.env;

  const section = c.req.query('section');
  const now = new Date().toISOString();

  let query = `
    SELECT * FROM events
    WHERE start_datetime >= ?
  `;
  const params: any[] = [now];

  if (section && section !== 'all') {
    query += ' AND section = ?';
    params.push(section);
  }

  query += ' ORDER BY start_datetime ASC LIMIT 500';

  const result = await DB.prepare(query).bind(...params).all();
  const events = result.results || [];

  // Generate iCal
  const ical = generateICalFeed(events);

  return new Response(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="fayetteville-events.ics"',
      'Cache-Control': 'public, max-age=3600', // 1 hour cache
    },
  });
});

function generateICalFeed(events: any[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fayetteville Central Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Fayetteville Events',
    'X-WR-TIMEZONE:America/New_York',
  ];

  for (const event of events) {
    const uid = `${event.id}@fayetteville-calendar`;
    const dtstart = formatICalDate(event.start_datetime);
    const dtend = formatICalDate(event.end_datetime);
    const created = formatICalDate(event.created_at || new Date().toISOString());
    const summary = escapeICalText(event.title);
    const description = escapeICalText(event.description || '');
    const location = escapeICalText(event.location_name || '');
    const url = event.url || '';

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `DTSTAMP:${created}`,
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
  return isoDate.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
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
// Scheduled Handler (Cron Trigger)
// =============================================================================

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    console.log('Scheduled sync triggered at:', new Date().toISOString());

    // For now, log that the cron ran
    // Full sync will be implemented by porting sync-all-events.ts to Worker
    // This is a placeholder that updates the sources table

    try {
      await env.DB.prepare(`
        UPDATE sources
        SET last_sync = ?
        WHERE is_active = 1
      `).bind(new Date().toISOString()).run();

      console.log('Cron job completed successfully');
    } catch (error) {
      console.error('Cron job failed:', error);
    }
  },
};
