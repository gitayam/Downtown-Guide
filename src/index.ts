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
  DISCORD_WEBHOOK_URL: string;
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
// GET /api/categories - List distinct event categories
// =============================================================================

app.get('/api/categories', async (c) => {
  const { DB } = c.env;

  // Get all categories from future events
  const result = await DB.prepare(`
    SELECT categories FROM events
    WHERE start_datetime >= ? AND categories IS NOT NULL AND categories != '[]'
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
  const section = c.req.query('section'); // 'downtown' | 'fort_bragg' | 'crown'
  const source = c.req.query('source');   // source_id
  const from = c.req.query('from');       // ISO date
  const to = c.req.query('to');           // ISO date
  const search = c.req.query('search');   // text search (title, description)
  const category = c.req.query('category'); // category filter
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');

  // Build query
  const conditions: string[] = [];
  const params: any[] = [];

  // Only show confirmed or active events (exclude cancelled, past)
  conditions.push("e.status IN ('confirmed', 'active')");

  // Default: future events only
  if (!from) {
    conditions.push('datetime(e.start_datetime) >= datetime(?)');
    params.push(new Date().toISOString());
  } else {
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

  // Category filter (JSON array contains)
  if (category && category !== 'all') {
    conditions.push('e.categories LIKE ?');
    params.push(`%"${category}"%`);
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
      s.name as source_name
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
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

app.get('/cal/events.ics', async (c) => {
  const { DB } = c.env;

  const section = c.req.query('section');
  const now = new Date().toISOString();

  let query = `
    SELECT * FROM events
    WHERE datetime(start_datetime) >= datetime(?)
      AND status IN ('confirmed', 'active')
  `;
  const params: any[] = [now];

  if (section && section !== 'all') {
    query += ' AND section = ?';
    params.push(section);
  }

  query += ' ORDER BY featured DESC, start_datetime ASC LIMIT 500';

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

  const result = await env.DB.prepare(`
    SELECT e.*, s.name as source_name
    FROM events e
    LEFT JOIN sources s ON e.source_id = s.id
    WHERE datetime(e.start_datetime) >= datetime(?)
      AND datetime(e.start_datetime) < datetime(?)
      AND e.status IN ('confirmed', 'active')
    ORDER BY e.featured DESC, e.start_datetime ASC
    LIMIT 25
  `).bind(startUTC, endUTC).all();

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
