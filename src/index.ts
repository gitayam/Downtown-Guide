/**
 * Fayetteville Central Calendar - API Worker
 *
 * Main entry point for the Cloudflare Worker.
 * Handles routing, middleware, and scheduled tasks.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import { secureHeaders } from 'hono/secure-headers';
import { Bindings } from './types';
import eventsRouter from './routes/events';
import datePlannerRouter from './routes/date-planner';
import metaRouter from './routes/meta';
import calendarRouter from './routes/calendar';
import { sendDailyDigest, sendDiscordMessage } from './lib/discord';

const app = new Hono<{ Bindings: Bindings }>();

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
  allowMethods: ['GET', 'POST', 'OPTIONS'],
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

// Cache GET API responses for 5 minutes (exclude POST/date-planner)
app.use('/api/events/*', cache({
  cacheName: 'downtown-events-api',
  cacheControl: 'public, max-age=300',
}));
app.use('/api/sources', cache({
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    }
  );
});

// Mount Routes
app.route('/api/events', eventsRouter);
app.route('/api/date-planner', datePlannerRouter);
app.route('/api', metaRouter); // mounts /api/sources and /api/categories
app.route('/cal', calendarRouter); // mounts /cal/events.ics

// Health Check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Discord Test Endpoints
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

// Root
app.get('/', (c) => {
  return c.json({
    name: 'Fayetteville Central Calendar API',
    version: '1.1.0',
    endpoints: {
      health: '/api/health',
      sources: '/api/sources',
      events: '/api/events',
      eventsToday: '/api/events/today',
      eventsUpcoming: '/api/events/upcoming',
      eventById: '/api/events/:id',
      datePlanner: '/api/date-planner/suggestions',
      icalFeed: '/cal/events.ics',
    },
    docs: 'https://github.com/gitayam/Downtown-Guide',
  });
});

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