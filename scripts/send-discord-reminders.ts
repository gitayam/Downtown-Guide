/**
 * Discord Event Reminder Script
 *
 * Sends reminders to Discord for events happening:
 * - 1 week from now
 * - 1 day from now
 *
 * Usage:
 *   npx tsx scripts/send-discord-reminders.ts
 *   npx tsx scripts/send-discord-reminders.ts --dry-run
 *   DISCORD_WEBHOOK_URL=... npx tsx scripts/send-discord-reminders.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// =============================================================================
// Configuration
// =============================================================================

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ||
  'https://discord.com/api/webhooks/1455420203122032876/2hGfKju2UPhWOBqGG4c2F4NzxMoyYOp9psr_5vGMrpYsZHMtzU06clcA_OqDwJpBQ3tW';

const SENT_LOG_PATH = join(process.cwd(), 'data', 'sent-reminders.json');

// Production website URL
const SITE_URL = 'https://ncfayetteville.com';

// Movie-related keywords to filter out (too much noise)
const MOVIE_KEYWORDS = [
  'movie', 'film', 'cinema', 'screening', 'matinee',
  'imax', 'showing', 'theater showing', 'theatre showing'
];

// Movie-related categories to filter out
const MOVIE_CATEGORIES = [
  'movies', 'film', 'cinema', 'movie screenings', 'films'
];

// Colors for embed messages
const COLORS = {
  ONE_WEEK: 15965202,   // Orange
  ONE_DAY: 15158332,    // Red
  DEFAULT: 5814783,     // Blue
};

// Category emoji mapping
const CATEGORY_EMOJI: Record<string, string> = {
  'concerts & music': '🎵',
  'music': '🎵',
  'festivals & fairs': '🎪',
  'festival': '🎪',
  'sports': '⚾',
  'arts': '🎨',
  'food & drink': '🍽️',
  'family friendly': '👨‍👩‍👧‍👦',
  'family': '👨‍👩‍👧‍👦',
  'holiday': '🎄',
  'nightlife': '🌙',
  'outdoor recreation': '🌲',
  'outdoor': '🌲',
  'performing arts': '🎭',
  'history & heritage': '🏛️',
  'wellness': '🧘',
};

// Source badges
const SOURCE_BADGES: Record<string, string> = {
  'visit_downtown_fayetteville': '🏙️ Downtown',
  'segra_stadium': '⚾ Segra Stadium',
  'distinctly_fayetteville': '🎭 CVB',
  'dogwood_festival': '🌸 Dogwood Festival',
  'fort_liberty_mwr': '🎖️ Fort Liberty',
};

// =============================================================================
// Types
// =============================================================================

interface UnifiedEvent {
  id: string;
  source: string;
  sourceId: string;
  title: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  venue: {
    name: string;
    address?: string;
    city: string;
    state: string;
    zip?: string;
  } | null;
  categories: string[];
  url: string;
  ticketUrl?: string;
  imageUrl?: string;
  section: 'downtown' | 'fort_bragg';
}

// Helper to check if an event is a movie (to filter out)
function isMovieEvent(event: UnifiedEvent): boolean {
  const titleLower = event.title.toLowerCase();
  const descLower = event.description.toLowerCase();

  // Check title and description for movie keywords
  for (const keyword of MOVIE_KEYWORDS) {
    if (titleLower.includes(keyword) || descLower.includes(keyword)) {
      return true;
    }
  }

  // Check categories
  for (const cat of event.categories) {
    const catLower = cat.toLowerCase();
    if (MOVIE_CATEGORIES.includes(catLower)) {
      return true;
    }
  }

  return false;
}

// Get the ncfayetteville.com URL for an event
function getSiteUrl(event: UnifiedEvent): string {
  return `${SITE_URL}/events/${event.id}`;
}

interface DiscordEmbed {
  title: string;
  description: string;
  url?: string;
  color: number;
  timestamp?: string;
  footer?: { text: string };
  thumbnail?: { url: string };
  fields: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

interface DiscordPayload {
  username: string;
  avatar_url?: string;
  embeds: DiscordEmbed[];
}

interface SentLog {
  sent: Record<string, string>;  // key: "eventId_reminderType", value: ISO timestamp
}

type ReminderType = '1_week' | '1_day';

// =============================================================================
// Event Fetching (from sync-all-events.ts)
// =============================================================================

const DOWNTOWN_API = 'https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36';
const SEGRA_API = 'https://www.segrastadium.com/events-tickets?format=json';
const DISTINCTLY_RSS = 'https://www.distinctlyfayettevillenc.com/event/rss/';
const DOGWOOD_URL = 'https://www.thedogwoodfestival.com/2025-2026-events';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractXmlTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i'));
  if (match) return match[1];
  const simpleMatch = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
  return simpleMatch?.[1] || null;
}

function parseMonthDate(month: string, day: string, year: string): Date | null {
  const months: Record<string, number> = {
    January: 0, February: 1, March: 2, April: 3,
    May: 4, June: 5, July: 6, August: 7,
    September: 8, October: 9, November: 10, December: 11,
  };
  const monthNum = months[month];
  if (monthNum === undefined) return null;
  return new Date(parseInt(year), monthNum, parseInt(day));
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

async function fetchDowntownEvents(): Promise<UnifiedEvent[]> {
  try {
    const [eventsRes, datetimesRes] = await Promise.all([
      fetch(`${DOWNTOWN_API}/events?limit=200&order_by=EVT_modified&order=DESC`),
      fetch(`${DOWNTOWN_API}/datetimes?limit=200&order_by=DTT_EVT_start&order=DESC`),
    ]);
    const [events, datetimes] = await Promise.all([eventsRes.json(), datetimesRes.json()]);

    const datetimesByEvent = new Map<number, any[]>();
    for (const dt of datetimes) {
      if (dt.DTT_deleted) continue;
      const existing = datetimesByEvent.get(dt.EVT_ID) || [];
      existing.push(dt);
      datetimesByEvent.set(dt.EVT_ID, existing);
    }

    const results: UnifiedEvent[] = [];
    for (const event of events) {
      if (event.status?.raw !== 'publish') continue;
      const eventDatetimes = datetimesByEvent.get(event.EVT_ID) || [];
      for (const dt of eventDatetimes) {
        results.push({
          id: `downtown_${event.EVT_ID}_${dt.DTT_ID}`,
          source: 'visit_downtown_fayetteville',
          sourceId: String(event.EVT_ID),
          title: event.EVT_name,
          description: stripHtml(event.EVT_desc?.rendered || ''),
          startDateTime: new Date(dt.DTT_EVT_start_gmt || dt.DTT_EVT_start),
          endDateTime: new Date(dt.DTT_EVT_end_gmt || dt.DTT_EVT_end),
          venue: { name: 'Downtown Fayetteville', city: 'Fayetteville', state: 'NC' },
          categories: [],
          url: event.link,
          section: 'downtown',
        });
      }
    }
    return results;
  } catch (error) {
    console.error('Error fetching Downtown events:', error);
    return [];
  }
}

async function fetchSegraEvents(): Promise<UnifiedEvent[]> {
  try {
    const response = await fetch(SEGRA_API);
    const data = await response.json();
    const items = data.upcoming || data.items || [];
    return items.filter((item: any) => !item.draft).map((item: any) => ({
      id: `segra_${item.id}`,
      source: 'segra_stadium',
      sourceId: item.id,
      title: item.title,
      description: stripHtml(item.body || item.excerpt || ''),
      startDateTime: new Date(item.startDate),
      endDateTime: new Date(item.endDate),
      venue: { name: 'Segra Stadium', address: '460 Hay St', city: 'Fayetteville', state: 'NC', zip: '28301' },
      categories: item.tags || [],
      url: `https://www.segrastadium.com${item.fullUrl}`,
      ticketUrl: item.sourceUrl,
      imageUrl: item.assetUrl ? `https:${item.assetUrl}` : undefined,
      section: 'downtown' as const,
    }));
  } catch (error) {
    console.error('Error fetching Segra events:', error);
    return [];
  }
}

async function fetchDistinctlyEvents(): Promise<UnifiedEvent[]> {
  try {
    const response = await fetch(DISTINCTLY_RSS);
    const xml = await response.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const results: UnifiedEvent[] = [];

    for (const item of items) {
      const title = extractXmlTag(item, 'title');
      const link = extractXmlTag(item, 'link');
      const description = extractXmlTag(item, 'description');

      const categoryMatches = item.match(/<category>\s*<!\[CDATA\[\s*([^\]]+)\s*\]\]>\s*<\/category>/g) || [];
      const categories = categoryMatches.map(c => {
        const match = c.match(/<!\[CDATA\[\s*([^\]]+)\s*\]\]>/);
        return match?.[1]?.trim() || '';
      }).filter(Boolean);

      const dateMatches = description?.match(/(\d{2})\/(\d{2})\/(\d{4})/g) || [];
      let startDate = new Date();
      let endDate = new Date();

      if (dateMatches.length >= 2) {
        const [sm, sd, sy] = dateMatches[0].split('/');
        const [em, ed, ey] = dateMatches[dateMatches.length - 1].split('/');
        startDate = new Date(parseInt(sy), parseInt(sm) - 1, parseInt(sd));
        endDate = new Date(parseInt(ey), parseInt(em) - 1, parseInt(ed));
      } else if (dateMatches.length === 1) {
        const [m, d, y] = dateMatches[0].split('/');
        startDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        endDate = startDate;
      }

      const imgMatch = description?.match(/<img[^>]+src=['"]([^'"]+)['"]/);
      const idMatch = link?.match(/\/(\d+)\/?$/);

      results.push({
        id: `distinctly_${idMatch?.[1] || Date.now()}`,
        source: 'distinctly_fayetteville',
        sourceId: idMatch?.[1] || String(Date.now()),
        title: title?.replace(/&amp;/g, '&') || '',
        description: stripHtml(description || ''),
        startDateTime: startDate,
        endDateTime: endDate,
        venue: { name: 'Fayetteville', city: 'Fayetteville', state: 'NC' },
        categories,
        url: link || '',
        imageUrl: imgMatch?.[1],
        section: 'downtown',
      });
    }
    return results;
  } catch (error) {
    console.error('Error fetching Distinctly events:', error);
    return [];
  }
}

async function fetchDogwoodEvents(): Promise<UnifiedEvent[]> {
  try {
    const response = await fetch(DOGWOOD_URL);
    const html = await response.text();
    const results: UnifiedEvent[] = [];
    const now = new Date();

    const singleRegex = /([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4}):\s*([^\n<●]+)/g;
    let match;
    while ((match = singleRegex.exec(html)) !== null) {
      const [, month, day, year, title] = match;
      const date = parseMonthDate(month, day, year);
      if (date && date > now) {
        results.push({
          id: `dogwood_${date.toISOString().split('T')[0]}_${slugify(title)}`,
          source: 'dogwood_festival',
          sourceId: slugify(title),
          title: title.trim(),
          description: '',
          startDateTime: date,
          endDateTime: date,
          venue: { name: 'Fayetteville', city: 'Fayetteville', state: 'NC' },
          categories: ['Festivals & Fairs'],
          url: DOGWOOD_URL,
          section: 'downtown',
        });
      }
    }

    const rangeRegex = /([A-Z][a-z]+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s+(\d{4}):\s*([^\n<●]+)/g;
    while ((match = rangeRegex.exec(html)) !== null) {
      const [, month, startDay, endDay, year, title] = match;
      const startDate = parseMonthDate(month, startDay, year);
      const endDate = parseMonthDate(month, endDay, year);
      if (startDate && endDate && endDate > now) {
        results.push({
          id: `dogwood_${startDate.toISOString().split('T')[0]}_${slugify(title)}`,
          source: 'dogwood_festival',
          sourceId: slugify(title),
          title: title.trim(),
          description: '',
          startDateTime: startDate,
          endDateTime: endDate,
          venue: { name: 'Festival Park', city: 'Fayetteville', state: 'NC' },
          categories: ['Festivals & Fairs', 'Signature Events'],
          url: DOGWOOD_URL,
          section: 'downtown',
        });
      }
    }

    return Array.from(new Map(results.map(e => [e.id, e])).values());
  } catch (error) {
    console.error('Error fetching Dogwood events:', error);
    return [];
  }
}

const FORT_LIBERTY_URL = 'https://bragg.armymwr.com/calendar';

async function fetchFortLibertyEvents(): Promise<UnifiedEvent[]> {
  try {
    const results: UnifiedEvent[] = [];
    const now = new Date();

    // Fetch current week and next 2 weeks for reminders
    for (let weekOffset = 0; weekOffset < 3; weekOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + (weekOffset * 7));

      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const year = targetDate.getFullYear();
      const dateParam = `${month}/${day}/${year}`;

      const url = `${FORT_LIBERTY_URL}?date=${encodeURIComponent(dateParam)}&mode=agenda`;
      const response = await fetch(url);
      if (!response.ok) continue;

      const html = await response.text();
      const eventRegex = /\/calendar\/event\/([a-zA-Z0-9-]+)\/(\d+)\/(\d+)/gi;
      let match;

      while ((match = eventRegex.exec(html)) !== null) {
        const [fullPath, slug, eventId, occurrenceId] = match;
        const uniqueId = `ftliberty_${eventId}_${occurrenceId}`;
        if (results.some(e => e.id === uniqueId)) continue;

        let title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        title = title.replace(/&#039;/g, "'").replace(/&amp;/g, '&');

        results.push({
          id: uniqueId,
          source: 'fort_liberty_mwr',
          sourceId: `${eventId}_${occurrenceId}`,
          title,
          description: '',
          startDateTime: targetDate,
          endDateTime: new Date(targetDate.getTime() + 2 * 60 * 60 * 1000),
          venue: { name: 'Fort Liberty', city: 'Fort Liberty', state: 'NC' },
          categories: ['Military', 'MWR'],
          url: `https://bragg.armymwr.com${fullPath}`,
          section: 'fort_bragg',
        });
      }
      await new Promise(r => setTimeout(r, 300));
    }

    return Array.from(new Map(results.map(e => [e.id, e])).values());
  } catch (error) {
    console.error('Error fetching Fort Liberty events:', error);
    return [];
  }
}

async function fetchAllEvents(): Promise<UnifiedEvent[]> {
  const results = await Promise.allSettled([
    fetchDowntownEvents(),
    fetchSegraEvents(),
    fetchDistinctlyEvents(),
    fetchDogwoodEvents(),
    fetchFortLibertyEvents(),
  ]);

  let allEvents: UnifiedEvent[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allEvents = allEvents.concat(result.value);
    }
  }

  // Filter to future events, exclude movies, and sort by section then date
  const now = new Date();
  return allEvents
    .filter(e => e.endDateTime > now)
    .filter(e => !isMovieEvent(e))
    .sort((a, b) => {
      // Sort by section first (downtown before fort_bragg)
      if (a.section !== b.section) {
        return a.section === 'downtown' ? -1 : 1;
      }
      // Then by date
      return a.startDateTime.getTime() - b.startDateTime.getTime();
    });
}

// =============================================================================
// Reminder Logic
// =============================================================================

function loadSentLog(): SentLog {
  try {
    if (existsSync(SENT_LOG_PATH)) {
      return JSON.parse(readFileSync(SENT_LOG_PATH, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading sent log:', error);
  }
  return { sent: {} };
}

function saveSentLog(log: SentLog): void {
  try {
    const dir = join(process.cwd(), 'data');
    if (!existsSync(dir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(SENT_LOG_PATH, JSON.stringify(log, null, 2));
  } catch (error) {
    console.error('Error saving sent log:', error);
  }
}

function wasReminderSent(log: SentLog, eventId: string, type: ReminderType): boolean {
  const key = `${eventId}_${type}`;
  return key in log.sent;
}

function markReminderSent(log: SentLog, eventId: string, type: ReminderType): void {
  const key = `${eventId}_${type}`;
  log.sent[key] = new Date().toISOString();
}

function getEventsForReminder(events: UnifiedEvent[], type: ReminderType): UnifiedEvent[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return events.filter(event => {
    const eventDate = new Date(
      event.startDateTime.getFullYear(),
      event.startDateTime.getMonth(),
      event.startDateTime.getDate()
    );

    const diffDays = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (type === '1_week') {
      return diffDays >= 6 && diffDays <= 8; // 6-8 days out (flexible window)
    } else if (type === '1_day') {
      return diffDays === 1; // Exactly 1 day out
    }
    return false;
  });
}

// =============================================================================
// Discord Integration
// =============================================================================

function getCategoryEmoji(categories: string[]): string {
  for (const cat of categories) {
    const lower = cat.toLowerCase();
    if (CATEGORY_EMOJI[lower]) return CATEGORY_EMOJI[lower];
  }
  return '📅';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function buildReminderEmbed(event: UnifiedEvent, type: ReminderType): DiscordEmbed {
  const emoji = getCategoryEmoji(event.categories);
  const sourceBadge = SOURCE_BADGES[event.source] || event.source;
  const sectionLabel = event.section === 'downtown' ? '🏙️ Downtown' : '🎖️ Fort Liberty';

  const isOneDay = type === '1_day';
  const title = isOneDay ? `⏰ Tomorrow! ${sectionLabel}` : `🗓️ Coming Up Next Week - ${sectionLabel}`;
  const color = isOneDay ? COLORS.ONE_DAY : COLORS.ONE_WEEK;
  const description = isOneDay
    ? "Don't forget - this event is happening tomorrow!"
    : 'Mark your calendar for this upcoming event!';

  const fields = [
    {
      name: `${emoji} Event`,
      value: event.title,
      inline: false,
    },
    {
      name: '📅 Date',
      value: formatDate(event.startDateTime),
      inline: true,
    },
  ];

  // Add time if it's not midnight (indicating a specific time was set)
  const hours = event.startDateTime.getHours();
  const minutes = event.startDateTime.getMinutes();
  if (hours !== 0 || minutes !== 0) {
    fields.push({
      name: '⏰ Time',
      value: formatTime(event.startDateTime),
      inline: true,
    });
  }

  // Add venue if available
  if (event.venue?.name) {
    fields.push({
      name: '📍 Location',
      value: event.venue.address
        ? `${event.venue.name}\n${event.venue.address}, ${event.venue.city}`
        : event.venue.name,
      inline: false,
    });
  }

  // Add categories if available
  if (event.categories.length > 0) {
    fields.push({
      name: '🏷️ Categories',
      value: event.categories.slice(0, 3).join(' • '),
      inline: false,
    });
  }

  const embed: DiscordEmbed = {
    title,
    description,
    url: getSiteUrl(event),
    color,
    fields,
    footer: {
      text: `${sourceBadge} • ncfayetteville.com`,
    },
    timestamp: event.startDateTime.toISOString(),
  };

  // Add thumbnail if available
  if (event.imageUrl) {
    embed.thumbnail = { url: event.imageUrl };
  }

  return embed;
}

function buildPayload(events: UnifiedEvent[], type: ReminderType): DiscordPayload {
  const embeds = events.map(e => buildReminderEmbed(e, type));

  return {
    username: '📅 Fayetteville Events',
    embeds: embeds.slice(0, 10), // Discord limit: 10 embeds per message
  };
}

async function sendToDiscord(payload: DiscordPayload, dryRun: boolean): Promise<boolean> {
  if (dryRun) {
    console.log('\n[DRY RUN] Would send to Discord:');
    console.log(JSON.stringify(payload, null, 2));
    return true;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 204) {
      console.log('✅ Message sent successfully');
      return true;
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      console.log(`⚠️ Rate limited. Retry after ${retryAfter}s`);
      return false;
    }

    console.error(`❌ Failed to send: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.error('Response:', text);
    return false;
  } catch (error) {
    console.error('❌ Error sending to Discord:', error);
    return false;
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('='.repeat(60));
  console.log('FAYETTEVILLE EVENT REMINDERS');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  // Load sent log
  const sentLog = loadSentLog();
  console.log(`Loaded ${Object.keys(sentLog.sent).length} previously sent reminders`);

  // Fetch all events
  console.log('\nFetching events from all sources...');
  const events = await fetchAllEvents();
  console.log(`Found ${events.length} upcoming events\n`);

  // Process 1-week reminders
  console.log('--- 1-WEEK REMINDERS ---');
  const weekEvents = getEventsForReminder(events, '1_week');
  const unsent1Week = weekEvents.filter(e => !wasReminderSent(sentLog, e.id, '1_week'));

  if (unsent1Week.length > 0) {
    console.log(`Found ${unsent1Week.length} events needing 1-week reminder:`);
    for (const event of unsent1Week) {
      console.log(`  - ${event.title} (${formatDate(event.startDateTime)})`);
    }

    // Send in batches of 10
    for (let i = 0; i < unsent1Week.length; i += 10) {
      const batch = unsent1Week.slice(i, i + 10);
      const payload = buildPayload(batch, '1_week');
      const success = await sendToDiscord(payload, dryRun);

      if (success && !dryRun) {
        for (const event of batch) {
          markReminderSent(sentLog, event.id, '1_week');
        }
      }

      // Rate limit pause between batches
      if (i + 10 < unsent1Week.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  } else {
    console.log('No 1-week reminders to send');
  }

  // Process 1-day reminders
  console.log('\n--- 1-DAY REMINDERS ---');
  const dayEvents = getEventsForReminder(events, '1_day');
  const unsent1Day = dayEvents.filter(e => !wasReminderSent(sentLog, e.id, '1_day'));

  if (unsent1Day.length > 0) {
    console.log(`Found ${unsent1Day.length} events needing 1-day reminder:`);
    for (const event of unsent1Day) {
      console.log(`  - ${event.title} (${formatDate(event.startDateTime)})`);
    }

    for (let i = 0; i < unsent1Day.length; i += 10) {
      const batch = unsent1Day.slice(i, i + 10);
      const payload = buildPayload(batch, '1_day');
      const success = await sendToDiscord(payload, dryRun);

      if (success && !dryRun) {
        for (const event of batch) {
          markReminderSent(sentLog, event.id, '1_day');
        }
      }

      if (i + 10 < unsent1Day.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  } else {
    console.log('No 1-day reminders to send');
  }

  // Save updated sent log
  if (!dryRun) {
    saveSentLog(sentLog);
    console.log(`\nSaved ${Object.keys(sentLog.sent).length} sent reminders to log`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('COMPLETE');
  console.log('='.repeat(60));
}

main().catch(console.error);
