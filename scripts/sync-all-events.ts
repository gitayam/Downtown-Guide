/**
 * Fayetteville Central Calendar - Multi-Source Event Sync
 *
 * Fetches events from multiple sources:
 * 1. Visit Downtown Fayetteville (Event Espresso API)
 * 2. Segra Stadium (Squarespace JSON)
 * 3. Distinctly Fayetteville (RSS Feed)
 * 4. Dogwood Festival (Web Scraping)
 * 5. Fort Bragg MWR (Web Scraping)
 * 6. Crown Complex (Web Scraping)
 * 7. Downtown Alliance / FayDTA (MEC API + Signature Events)
 * 8. MLK Committee (Signature Annual Events)
 * 9. Headquarters Library (Web Scraping - filtered by location)
 * 10. Fort Bragg Training Holidays (Static FY26 Schedule)
 * 11. Arts Council of Fayetteville (Wix Events Scraping)
 * 12. Fayetteville Symphony Orchestra (Season Schedule)
 * 13. Cameo Art House Theatre (Dynamic Scraping - Movies & Special Events)
 *
 * Enhanced with researchtoolspy API for additional metadata extraction.
 *
 * Features:
 * - Content hash-based change detection (only updates when data actually changes)
 * - Tracks last_seen_at for each event to detect removed events
 * - Soft delete: past events marked as 'past', removed events as 'cancelled'
 * - Dry-run mode for testing changes without writing to database
 *
 * Usage:
 *   npx tsx scripts/sync-all-events.ts                    # Preview events (no DB write)
 *   npx tsx scripts/sync-all-events.ts --json > events.json
 *   npx tsx scripts/sync-all-events.ts --source=segra
 *   npx tsx scripts/sync-all-events.ts --db               # Write to D1 database
 *   npx tsx scripts/sync-all-events.ts --db --cleanup     # Write + cleanup old events
 *   npx tsx scripts/sync-all-events.ts --db --dry-run     # Preview what would change
 *   npx tsx scripts/sync-all-events.ts --cleanup-only     # Only run cleanup (no fetch)
 *   npx tsx scripts/sync-all-events.ts --enhanced         # Use researchtoolspy for extra metadata
 */

// =============================================================================
// Types
// =============================================================================

type EventSection = 'downtown' | 'fort_bragg' | 'crown';

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
    latitude?: number;
    longitude?: number;
    phone?: string;
    googleMapsUrl?: string;
  } | null;
  categories: string[];
  url: string;
  ticketUrl?: string;
  imageUrl?: string;
  contactPhone?: string;
  lastModified: Date;
  section: EventSection;
}

// =============================================================================
// Category Normalization - User-Friendly Categories for Fayetteville Residents
// =============================================================================

// Map raw/messy categories to clean, user-friendly categories
const CATEGORY_MAP: Record<string, string> = {
  // Art categories → "Arts"
  'art': 'Arts',
  'arts & culture': 'Arts',
  'arts &amp; culture': 'Arts',
  'arts &amp; crafts': 'Arts',
  'gallery': 'Arts',
  'performing arts': 'Arts',
  'cultural': 'Arts',

  // Music categories → "Live Music"
  'classical music': 'Live Music',
  'chamber music': 'Live Music',
  'orchestra': 'Live Music',
  'gospel': 'Live Music',
  'film music': 'Live Music',
  'americana': 'Live Music',

  // Film/Movies → "Movies"
  'film': 'Movies',
  'classic film': 'Movies',
  'movies': 'Movies',
  'special screening': 'Movies',

  // Military → "Military"
  'military': 'Military',
  'mwr': 'Military',
  'training holiday': 'Military',
  '3-day weekend': 'Long Weekend',
  '4-day weekend': 'Long Weekend',

  // Family/Youth → "Family"
  'family': 'Family',
  'youth': 'Family',
  'story time': 'Family',
  'educational': 'Family',
  'library programs': 'Family',

  // Community events
  'community': 'Community',
  'parades': 'Community',
  'signature events': 'Community',

  // Festivals
  'festivals & fairs': 'Festivals',
  'holiday': 'Festivals',

  // Sports
  'sports': 'Sports',

  // Nightlife
  'nightlife': 'Nightlife',

  // Expos
  'expos & trade shows': 'Expos',
};

// Categories to display (in order) - these are the normalized categories
const DISPLAY_CATEGORIES = [
  'Community',
  'Arts',
  'Live Music',
  'Movies',
  'Family',
  'Festivals',
  'Sports',
  'Military',
  'Long Weekend',
  'Nightlife',
  'Expos',
];

function normalizeCategories(categories: string[]): string[] {
  const normalized = new Set<string>();

  for (const cat of categories) {
    const lower = cat.toLowerCase().trim();
    const mapped = CATEGORY_MAP[lower];

    if (mapped) {
      normalized.add(mapped);
    } else {
      // Keep original if not in map (capitalized)
      normalized.add(cat.charAt(0).toUpperCase() + cat.slice(1));
    }
  }

  // Sort by display order
  const result = Array.from(normalized).sort((a, b) => {
    const aIdx = DISPLAY_CATEGORIES.indexOf(a);
    const bIdx = DISPLAY_CATEGORIES.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return result;
}

// =============================================================================
// ResearchTools API Integration
// =============================================================================

const RESEARCH_TOOLS_API = 'https://researchtools.net/api';

interface ScrapingResult {
  url: string;
  title?: string;
  description?: string;
  author?: string;
  content?: {
    text: string;
    word_count: number;
  };
  metadata?: {
    og_title?: string;
    og_description?: string;
    og_image?: string;
  };
}

async function fetchWithResearchTools(url: string): Promise<ScrapingResult | null> {
  try {
    const response = await fetch(`${RESEARCH_TOOLS_API}/web-scraper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, extract_mode: 'full' }),
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error(`  ResearchTools fetch failed for ${url}:`, error);
    return null;
  }
}

// =============================================================================
// Source 1: Visit Downtown Fayetteville (Event Espresso)
// =============================================================================

const DOWNTOWN_API = 'https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36';

// Cache for venue data to avoid redundant API calls
const venueCache = new Map<number, any>();

async function fetchVenueDetails(eventId: number): Promise<any | null> {
  try {
    const response = await fetch(`${DOWNTOWN_API}/events/${eventId}/venues`);
    if (!response.ok) return null;
    const venues = await response.json();
    return venues?.[0] || null;
  } catch {
    return null;
  }
}

async function fetchDowntownEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Visit Downtown Fayetteville...');

  // Fetch events, datetimes, and all venues in parallel
  const [eventsRes, datetimesRes, venuesRes] = await Promise.all([
    fetch(`${DOWNTOWN_API}/events?limit=200&order_by=EVT_modified&order=DESC`),
    fetch(`${DOWNTOWN_API}/datetimes?limit=200&order_by=DTT_EVT_start&order=DESC`),
    fetch(`${DOWNTOWN_API}/venues?limit=200`),
  ]);

  const [events, datetimes, venues] = await Promise.all([
    eventsRes.json(),
    datetimesRes.json(),
    venuesRes.json(),
  ]);

  // Build venue lookup by ID
  for (const venue of venues) {
    venueCache.set(venue.VNU_ID, venue);
  }
  console.error(`  Cached ${venueCache.size} venues`);

  // Build datetime lookup
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
    if (eventDatetimes.length === 0) continue;

    // Try to get venue for this event (from linked venues endpoint)
    let venueData = null;
    const venuesLink = event._links?.['https://api.eventespresso.com/venues']?.[0]?.href;
    if (venuesLink) {
      try {
        const venueRes = await fetch(venuesLink);
        if (venueRes.ok) {
          const eventVenues = await venueRes.json();
          venueData = eventVenues?.[0];
        }
      } catch {
        // Fall back to cached venues or default
      }
    }

    for (const dt of eventDatetimes) {
      results.push({
        id: `downtown_${event.EVT_ID}_${dt.DTT_ID}`,
        source: 'visit_downtown_fayetteville',
        sourceId: String(event.EVT_ID),
        title: event.EVT_name,
        description: cleanDescription(event.EVT_desc?.rendered || '', event.EVT_name),
        startDateTime: new Date(dt.DTT_EVT_start_gmt || dt.DTT_EVT_start),
        endDateTime: new Date(dt.DTT_EVT_end_gmt || dt.DTT_EVT_end),
        venue: venueData ? {
          name: venueData.VNU_name || 'Downtown Fayetteville',
          address: venueData.VNU_address || undefined,
          city: venueData.VNU_city || 'Fayetteville',
          state: 'NC',
          zip: venueData.VNU_zip || undefined,
          phone: venueData.VNU_phone || undefined,
          googleMapsUrl: venueData.VNU_google_map_link || undefined,
        } : {
          name: 'Downtown Fayetteville',
          city: 'Fayetteville',
          state: 'NC',
        },
        categories: [],
        url: event.link,
        ticketUrl: event.EVT_external_URL || undefined,
        contactPhone: event.EVT_phone || undefined,
        lastModified: new Date(event.EVT_modified_gmt || event.EVT_modified),
        section: 'downtown',
      });
    }
  }

  console.error(`  Found ${results.length} events`);
  return results;
}

// =============================================================================
// Source 2: Segra Stadium (Squarespace)
// =============================================================================

const SEGRA_API = 'https://www.segrastadium.com/events-tickets?format=json';

async function fetchSegraEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Segra Stadium...');

  const response = await fetch(SEGRA_API);
  const data = await response.json();

  const results: UnifiedEvent[] = [];

  // Squarespace events collections have 'upcoming' and 'past' arrays
  const items = data.upcoming || data.items || [];

  for (const item of items) {
    if (item.draft) continue;

    results.push({
      id: `segra_${item.id}`,
      source: 'segra_stadium',
      sourceId: item.id,
      title: item.title,
      description: cleanDescription(item.body || item.excerpt || '', item.title),
      startDateTime: new Date(item.startDate),
      endDateTime: new Date(item.endDate),
      venue: {
        name: 'Segra Stadium',
        address: '460 Hay St',
        city: 'Fayetteville',
        state: 'NC',
        zip: '28301',
      },
      categories: item.tags || [],
      url: `https://www.segrastadium.com${item.fullUrl}`,
      ticketUrl: item.sourceUrl || undefined,
      imageUrl: item.assetUrl ? `https:${item.assetUrl}` : undefined,
      lastModified: new Date(item.updatedOn),
      section: 'downtown',
    });
  }

  console.error(`  Found ${results.length} events`);
  return results;
}

// =============================================================================
// Source 2b: Fayetteville Woodpeckers (MLB Stats API)
// =============================================================================

const WOODPECKERS_TEAM_ID = 3712;
const MLB_STATS_API = 'https://statsapi.mlb.com/api/v1';

const SEGRA_STADIUM_VENUE: UnifiedEvent['venue'] = {
  name: 'Segra Stadium',
  address: '460 Hay St',
  city: 'Fayetteville',
  state: 'NC',
  zip: '28301',
};

async function fetchWoodpeckersGames(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Fayetteville Woodpeckers (MiLB)...');

  const results: UnifiedEvent[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  // Fetch current and next year schedules to cover offseason
  const years = [currentYear, currentYear + 1];

  for (const year of years) {
    try {
      const url = `${MLB_STATS_API}/schedule?teamId=${WOODPECKERS_TEAM_ID}&season=${year}&sportId=14&gameType=R&startDate=${year}-03-01&endDate=${year}-09-30`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`  Failed to fetch ${year} schedule: ${response.status}`);
        continue;
      }

      const data = await response.json();

      // Process each date in the schedule
      for (const dateEntry of data.dates || []) {
        for (const game of dateEntry.games || []) {
          // Only include HOME games (played at Segra Stadium)
          const isHome = game.teams?.home?.team?.id === WOODPECKERS_TEAM_ID;
          if (!isHome) continue;

          const gameDate = new Date(game.gameDate);
          // Skip past games
          if (gameDate < now) continue;

          const awayTeam = game.teams?.away?.team?.name || 'TBD';
          const homeTeam = game.teams?.home?.team?.name || 'Fayetteville Woodpeckers';

          // Game duration is typically 3 hours for minor league
          const endDate = new Date(gameDate);
          endDate.setHours(endDate.getHours() + 3);

          const gameId = game.gamePk || `${year}-${dateEntry.date}-${awayTeam.replace(/\s+/g, '')}`;

          results.push({
            id: `woodpeckers_${gameId}`,
            source: 'woodpeckers',
            sourceId: String(gameId),
            title: `Woodpeckers vs ${awayTeam}`,
            description: `Fayetteville Woodpeckers (Houston Astros Single-A affiliate) take on the ${awayTeam} at Segra Stadium in downtown Fayetteville. Gates typically open 1 hour before first pitch. Family-friendly fun with promotions, concessions, and entertainment between innings!`,
            startDateTime: gameDate,
            endDateTime: endDate,
            venue: SEGRA_STADIUM_VENUE,
            categories: ['Sports', 'Family'],
            url: `https://www.milb.com/fayetteville/schedule/${year}-${String(gameDate.getMonth() + 1).padStart(2, '0')}`,
            ticketUrl: 'https://www.milb.com/fayetteville/tickets',
            imageUrl: 'https://www.milb.com/images/logos/t3712.png',
            lastModified: new Date(),
            section: 'downtown',
          });
        }
      }
    } catch (error) {
      console.error(`  Error fetching ${year} schedule:`, error);
    }
  }

  console.error(`  Found ${results.length} home games`);
  return results;
}

// =============================================================================
// Source 3: Distinctly Fayetteville (Enhanced Scraping)
// =============================================================================

const DISTINCTLY_RSS = 'https://www.distinctlyfayettevillenc.com/event/rss/';

interface DistinctlyEventData {
  recid: string;
  title: string;
  description: string;
  latitude?: number;
  longitude?: number;
  location?: string;  // Venue name
  hostname?: string;
  categories?: Array<{ catName: string; catId: string }>;
  media_raw?: Array<{ mediaurl: string; mediatype: string }>;
  phone?: string;
  email?: string;
  linkUrl?: string;
  admission?: string;
  expired?: boolean;
  past?: boolean;
  host?: {
    address1?: string;
    city?: string;
    state?: string;
    zip?: string;
    company?: string;
  };
}

/**
 * Parse date string like "Wednesday, December 31, 2025 9:00 PM"
 */
function parseDistinctlyDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try parsing with built-in Date parser first
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Manual parsing for format: "Weekday, Month DD, YYYY H:MM AM/PM"
  const match = dateStr.match(/(\w+),\s+(\w+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i);
  if (match) {
    const [, , monthName, day, year, hour, minute, ampm] = match;
    const months: Record<string, number> = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    const month = months[monthName.toLowerCase()];
    if (month !== undefined) {
      let h = parseInt(hour);
      if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
      return new Date(parseInt(year), month, parseInt(day), h, parseInt(minute));
    }
  }

  return null;
}

/**
 * Fetch detailed event data from Distinctly Fayetteville event page
 */
async function fetchDistinctlyEventDetails(eventUrl: string): Promise<{
  data: DistinctlyEventData | null;
  startDate: string | null;
  endDate: string | null;
  ogImage: string | null;
  streetAddress: string | null;
}> {
  try {
    const response = await fetch(eventUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EventBot/1.0)' }
    });

    if (!response.ok) {
      return { data: null, startDate: null, endDate: null, ogImage: null, streetAddress: null };
    }

    const html = await response.text();

    // Extract og:image for high-res image
    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
    const ogImage = ogImageMatch?.[1] || null;

    // Extract embedded JSON data: var data = {...}
    // The JSON is on one line ending with }; then other vars follow
    const dataMatch = html.match(/var\s+data\s*=\s*(\{[^\n]+\});/);
    let data: DistinctlyEventData | null = null;

    if (dataMatch) {
      try {
        // Clean up the JSON - handle HTML entities in strings
        let jsonStr = dataMatch[1]
          .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"');
        data = JSON.parse(jsonStr);
      } catch (e) {
        // Try field-by-field extraction as fallback
        const recidMatch = html.match(/"recid"\s*:\s*"(\d+)"/);
        const locationMatch = html.match(/"location"\s*:\s*"([^"]*)"/);
        const titleMatch = html.match(/var\s+data\s*=\s*\{[^}]*"title"\s*:\s*"([^"]*)"/);
        const descMatch = html.match(/"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        const latMatch = html.match(/"latitude"\s*:\s*([\d.-]+)/);
        const lngMatch = html.match(/"longitude"\s*:\s*([\d.-]+)/);

        if (recidMatch && titleMatch) {
          data = {
            recid: recidMatch[1],
            location: locationMatch?.[1] || '',
            title: titleMatch[1],
            description: descMatch?.[1]?.replace(/\\r\\n/g, '\n').replace(/\\"/g, '"') || '',
            latitude: latMatch ? parseFloat(latMatch[1]) : undefined,
            longitude: lngMatch ? parseFloat(lngMatch[1]) : undefined,
          };
        }
      }
    }

    // Extract startDate and endDate
    const startDateMatch = html.match(/var\s+startDate\s*=\s*"([^"]+)"/);
    const endDateMatch = html.match(/var\s+endDate\s*=\s*"([^"]+)"/);
    const streetAddressMatch = html.match(/var\s+streetAddress\s*=\s*"([^"]*)"/);

    return {
      data,
      startDate: startDateMatch?.[1] || null,
      endDate: endDateMatch?.[1] || null,
      ogImage,
      streetAddress: streetAddressMatch?.[1] || null
    };
  } catch (error) {
    return { data: null, startDate: null, endDate: null, ogImage: null, streetAddress: null };
  }
}

async function fetchDistinctlyEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Distinctly Fayetteville...');

  // Step 1: Get event URLs from RSS feed
  const response = await fetch(DISTINCTLY_RSS);
  const xml = await response.text();

  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const eventUrls: Array<{ url: string; pubDate: string; rssCategories: string[] }> = [];

  for (const item of items) {
    const link = extractXmlTag(item, 'link');
    const pubDate = extractXmlTag(item, 'pubDate') || '';

    // Extract categories from RSS as fallback
    const categoryMatches = item.match(/<category><!\[CDATA\[\s*([^\]]+)\s*\]\]><\/category>/g) || [];
    const rssCategories = categoryMatches.map(c =>
      c.replace(/<category><!\[CDATA\[\s*/, '').replace(/\s*\]\]><\/category>/, '').replace(/&amp;/g, '&').trim()
    );

    if (link) {
      eventUrls.push({ url: link, pubDate, rssCategories });
    }
  }

  console.error(`  Found ${eventUrls.length} events in RSS, fetching details...`);

  // Step 2: Fetch detailed data for each event (with rate limiting)
  const results: UnifiedEvent[] = [];
  const BATCH_SIZE = 5;
  const DELAY_MS = 200;

  for (let i = 0; i < eventUrls.length; i += BATCH_SIZE) {
    const batch = eventUrls.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async ({ url, pubDate, rssCategories }) => {
        const details = await fetchDistinctlyEventDetails(url);

        // Extract ID from URL
        const idMatch = url.match(/\/(\d+)\/?$/);
        const sourceId = details.data?.recid || idMatch?.[1] || String(Date.now());

        // Parse dates
        let startDateTime = parseDistinctlyDate(details.startDate || '');
        let endDateTime = parseDistinctlyDate(details.endDate || '');

        // Fallback to noon if no time info
        if (!startDateTime) {
          startDateTime = new Date();
          startDateTime.setHours(12, 0, 0, 0);
        }
        if (!endDateTime) {
          endDateTime = new Date(startDateTime);
          endDateTime.setHours(23, 59, 0, 0);
        }

        // Handle overnight events (end time before start time means next day)
        // e.g., NYE event 7:30 PM - 12:30 AM should end on Jan 1
        if (endDateTime <= startDateTime) {
          endDateTime.setDate(endDateTime.getDate() + 1);
        }

        // Get image - prefer og:image (high res), then media_raw
        let imageUrl = details.ogImage;
        if (!imageUrl && details.data?.media_raw?.[0]?.mediaurl) {
          imageUrl = details.data.media_raw[0].mediaurl;
        }

        // Get categories - prefer API data, fallback to RSS
        let categories = rssCategories;
        if (details.data?.categories?.length) {
          categories = details.data.categories.map(c => c.catName);
        }

        // Get venue info
        const venueName = details.data?.location || details.data?.hostname || 'Fayetteville';
        const host = details.data?.host;

        // Build description
        let description = '';
        if (details.data?.description) {
          // Strip HTML tags and decode entities
          description = details.data.description
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
            .replace(/\s+/g, ' ')
            .trim();
        }

        // Add venue and admission info to description
        if (details.data?.admission && details.data.admission !== 'Free') {
          description = `Admission: ${details.data.admission}. ${description}`;
        }

        const title = decodeHtmlEntities(details.data?.title || '');

        return {
          id: `distinctly_${sourceId}`,
          source: 'distinctly_fayetteville',
          sourceId,
          title,
          description: description || `Event at ${venueName} in Fayetteville`,
          startDateTime,
          endDateTime,
          venue: {
            name: venueName,
            address: details.streetAddress || host?.address1,
            city: host?.city || 'Fayetteville',
            state: host?.state || 'NC',
            zip: host?.zip,
            latitude: details.data?.latitude,
            longitude: details.data?.longitude,
          },
          categories,
          url,
          ticketUrl: details.data?.linkUrl || undefined,
          imageUrl,
          lastModified: pubDate ? new Date(pubDate) : new Date(),
          section: 'downtown',
        } as UnifiedEvent;
      })
    );

    results.push(...batchResults.filter(e => e.title));

    // Rate limiting delay between batches
    if (i + BATCH_SIZE < eventUrls.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  // Filter out past/expired events (keep events that ended within the last 12 hours for overnight sync)
  const now = new Date();
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const futureEvents = results.filter(e => e.endDateTime > twelveHoursAgo);

  console.error(`  Enriched ${futureEvents.length} future events with full details`);
  return futureEvents;
}

// =============================================================================
// Source 4: Dogwood Festival (Scraping)
// =============================================================================

const DOGWOOD_URL = 'https://www.thedogwoodfestival.com/2025-2026-events';

async function fetchDogwoodEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Dogwood Festival...');

  const response = await fetch(DOGWOOD_URL);
  const html = await response.text();

  const results: UnifiedEvent[] = [];
  const now = new Date();

  // Pattern: "Month DD, YYYY: Event Name"
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
        venue: {
          name: 'Fayetteville',
          city: 'Fayetteville',
          state: 'NC',
        },
        categories: ['Festivals & Fairs', 'Community'],
        url: DOGWOOD_URL,
        lastModified: new Date(),
        section: 'downtown',
      });
    }
  }

  // Pattern: "Month DD - DD, YYYY: Event Name" (date ranges)
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
        venue: {
          name: 'Festival Park',
          city: 'Fayetteville',
          state: 'NC',
        },
        categories: ['Festivals & Fairs', 'Signature Events'],
        url: DOGWOOD_URL,
        lastModified: new Date(),
        section: 'downtown',
      });
    }
  }

  // Deduplicate
  const unique = Array.from(new Map(results.map(e => [e.id, e])).values());

  console.error(`  Found ${unique.length} events`);
  return unique;
}

// =============================================================================
// Source 5: Fort Bragg MWR (Scraping) - FORT BRAGG SECTION
// =============================================================================

const FORT_BRAGG_MWR_URL = 'https://bragg.armymwr.com/calendar';

// Helper to fetch and parse individual MWR event pages for rich data
interface MwrEventDetails {
  description: string;
  imageUrl?: string;
  cost?: string;
  venue?: {
    name: string;
    address?: string;
    city: string;
    state: string;
  };
  endDateTime?: Date;
  registrationRequired?: boolean;
  ageRequirement?: string;
}

async function fetchMwrEventDetails(eventUrl: string): Promise<MwrEventDetails | null> {
  try {
    const response = await fetch(eventUrl, {
      headers: {
        'User-Agent': 'FayettevilleCentralCalendar/1.0',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error(`  Failed to fetch MWR event page: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const details: MwrEventDetails = { description: '' };

    // Extract og:image
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImageMatch) {
      details.imageUrl = ogImageMatch[1];
    }

    // Extract og:description or meta description
    const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (ogDescMatch) {
      details.description = decodeHtmlEntities(ogDescMatch[1]);
    } else if (metaDescMatch) {
      details.description = decodeHtmlEntities(metaDescMatch[1]);
    }

    // Extract description from event-main-details section
    const mainDetailsMatch = html.match(/<section[^>]*class=["'][^"']*event-main-details[^"']*["'][^>]*>([\s\S]*?)<\/section>/i);
    if (mainDetailsMatch) {
      // Get text content, strip HTML tags
      let detailsText = mainDetailsMatch[1]
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (detailsText.length > details.description.length) {
        details.description = decodeHtmlEntities(detailsText);
      }
    }

    // Extract cost/price information - look in main content only (not JS bundles)
    // Match patterns like "Free program", "$5.00", "Cost: $10 per person"
    const mainContent = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
                        html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
                        html.match(/<section[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/section>/i)?.[1] ||
                        html;

    // Strip out script and style tags from content before searching
    const cleanContent = mainContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Look for "Free" first (common for MWR events)
    if (/\bfree\s+(?:program|event|admission|entry|to\s+attend)/i.test(cleanContent)) {
      details.cost = 'Free';
    } else {
      // Look for price mentions like "$5.00" or "Cost: $10"
      const priceMatch = cleanContent.match(/\$(\d+(?:\.\d{2})?)\s*(?:per\s+person|each)?/i);
      if (priceMatch) {
        details.cost = `$${priceMatch[1]}`;
      }
    }

    // Check for registration requirement
    if (/registration\s+(?:is\s+)?required/i.test(html) || /must\s+register/i.test(html) || /sign\s+up\s+required/i.test(html)) {
      details.registrationRequired = true;
    }

    // Extract age requirement
    const ageMatch = html.match(/(?:ages?|open\s+to)[:\s]*([\d]+(?:\s*[-–]\s*\d+)?(?:\s*(?:years?|yrs?|and\s+(?:up|over|under)))?[^<\n]{0,30})/i);
    if (ageMatch) {
      details.ageRequirement = ageMatch[1].trim();
    }

    // Extract venue/location details from program links
    const locationMatch = html.match(/<a[^>]*href=["']\/programs\/[^"']+["'][^>]*>([^<]+)<\/a>/i);
    if (locationMatch) {
      details.venue = {
        name: decodeHtmlEntities(locationMatch[1].trim()),
        city: 'Fort Bragg',
        state: 'NC',
      };
    }

    // Extract end time if available
    const timeRangeMatch = html.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (timeRangeMatch) {
      const endTime = parseTimeString(timeRangeMatch[2]);
      if (endTime) {
        // We'll use this in the main function to set proper end time
        const tempDate = new Date();
        tempDate.setHours(endTime.hours, endTime.minutes, 0, 0);
        details.endDateTime = tempDate;
      }
    }

    return details;
  } catch (error) {
    console.error(`  Error fetching MWR event details:`, error);
    return null;
  }
}

async function fetchFortBraggMwrEvents(useEnhanced = false): Promise<UnifiedEvent[]> {
  console.error('Fetching: Fort Bragg MWR...');

  const results: UnifiedEvent[] = [];
  const now = new Date();

  // Fetch current week and next 4 weeks
  for (let weekOffset = 0; weekOffset < 5; weekOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + (weekOffset * 7));

    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const year = targetDate.getFullYear();
    const dateParam = `${month}/${day}/${year}`;

    try {
      const url = `${FORT_BRAGG_MWR_URL}?date=${encodeURIComponent(dateParam)}&mode=agenda`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'FayettevilleCentralCalendar/1.0',
          'Accept': 'text/html',
        },
      });

      if (!response.ok) continue;

      const html = await response.text();

      // Extract events from HTML
      // Pattern: /calendar/event/slug/eventId/occurrenceId
      const eventRegex = /\/calendar\/event\/([a-zA-Z0-9-]+)\/(\d+)\/(\d+)/gi;
      let match;

      while ((match = eventRegex.exec(html)) !== null) {
        const [fullPath, slug, eventId, occurrenceId] = match;

        // Extract title from nearby content (alt text or link text)
        const contextStart = Math.max(0, match.index - 300);
        const contextEnd = Math.min(html.length, match.index + 500);
        const context = html.slice(contextStart, contextEnd);

        // Convert slug to title as default (most reliable source)
        let title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const slugTitle = title; // Save original slug-based title

        // Try to find better title from link text, but validate it matches the slug
        const linkTextMatch = context.match(/>([A-Z][^<]{4,60})<\/a>/);
        if (linkTextMatch && !linkTextMatch[1].includes('.png') && !linkTextMatch[1].includes('.jpg')) {
          const contextTitle = linkTextMatch[1].trim();
          // Only use context title if it shares significant words with slug
          // This prevents picking up unrelated nearby event titles
          const slugWords = slug.toLowerCase().split('-').filter(w => w.length > 3);
          const contextWords = contextTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const sharedWords = slugWords.filter(w => contextWords.some(cw => cw.includes(w) || w.includes(cw)));
          if (sharedWords.length >= 2 || (sharedWords.length >= 1 && slugWords.length <= 3)) {
            title = contextTitle;
          }
        }

        // Decode HTML entities
        title = title
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');

        // Try to find time
        const timeMatch = context.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);

        // Try to find venue
        const venueMatch = context.match(/\/programs\/[^"]+">([^<]+)</);

        // Try to find date from context
        const dateTextMatch = context.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i);

        let eventDate = new Date(targetDate);
        if (dateTextMatch) {
          const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                              'july', 'august', 'september', 'october', 'november', 'december'];
          const monthIdx = monthNames.indexOf(dateTextMatch[1].toLowerCase());
          if (monthIdx >= 0) {
            eventDate = new Date(year, monthIdx, parseInt(dateTextMatch[2]));
            // Adjust year if month is in the past
            if (eventDate < now && monthIdx < now.getMonth()) {
              eventDate.setFullYear(year + 1);
            }
          }
        }

        // Parse time if found
        if (timeMatch) {
          const startTime = parseTimeString(timeMatch[1]);
          const endTime = parseTimeString(timeMatch[2]);
          if (startTime) {
            eventDate.setHours(startTime.hours, startTime.minutes);
          }
        }

        const uniqueId = `ftliberty_${eventId}_${occurrenceId}`;

        // Skip if already added
        if (results.some(e => e.id === uniqueId)) continue;

        const eventUrl = `https://bragg.armymwr.com${fullPath}`;

        // Fetch individual event page for rich details
        console.error(`  Fetching details for: ${title.substring(0, 40)}...`);
        const eventDetails = await fetchMwrEventDetails(eventUrl);

        // Rate limit individual page fetches (300ms between requests)
        await new Promise(r => setTimeout(r, 300));

        // Build description with cost/registration info if available
        let description = eventDetails?.description || '';
        if (eventDetails?.cost) {
          description = description ? `${description}\n\nCost: ${eventDetails.cost}` : `Cost: ${eventDetails.cost}`;
        }
        if (eventDetails?.registrationRequired) {
          description = description ? `${description}\nRegistration required.` : 'Registration required.';
        }
        if (eventDetails?.ageRequirement) {
          description = description ? `${description}\nAges: ${eventDetails.ageRequirement}` : `Ages: ${eventDetails.ageRequirement}`;
        }

        // Calculate proper end time
        let endDateTime: Date;
        if (eventDetails?.endDateTime) {
          // Use end time from event page, but with the correct date
          endDateTime = new Date(eventDate);
          endDateTime.setHours(eventDetails.endDateTime.getHours(), eventDetails.endDateTime.getMinutes(), 0, 0);
          // Handle overnight events
          if (endDateTime <= eventDate) {
            endDateTime.setDate(endDateTime.getDate() + 1);
          }
        } else if (timeMatch) {
          // Use end time from calendar context
          const endTime = parseTimeString(timeMatch[2]);
          if (endTime) {
            endDateTime = new Date(eventDate);
            endDateTime.setHours(endTime.hours, endTime.minutes, 0, 0);
            if (endDateTime <= eventDate) {
              endDateTime.setDate(endDateTime.getDate() + 1);
            }
          } else {
            endDateTime = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
          }
        } else {
          endDateTime = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
        }

        // Use venue from event details if available, otherwise from calendar
        const venue = eventDetails?.venue || (venueMatch ? {
          name: venueMatch[1].trim(),
          city: 'Fort Bragg',
          state: 'NC',
        } : {
          name: 'Fort Bragg',
          city: 'Fort Bragg',
          state: 'NC',
        });

        results.push({
          id: uniqueId,
          source: 'fort_liberty_mwr',
          sourceId: `${eventId}_${occurrenceId}`,
          title,
          description,
          startDateTime: eventDate,
          endDateTime,
          venue,
          categories: ['Military', 'MWR'],
          url: eventUrl,
          imageUrl: eventDetails?.imageUrl,
          lastModified: new Date(),
          section: 'fort_bragg',
        });
      }

      // Rate limit: wait 500ms between requests
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      console.error(`  Error fetching week ${weekOffset}:`, error);
    }
  }

  // Sort by date and deduplicate
  const unique = Array.from(new Map(results.map(e => [e.id, e])).values());
  unique.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

  console.error(`  Found ${unique.length} events`);
  return unique;
}

// =============================================================================
// Source 6: Crown Complex (Scraping)
// =============================================================================

const CROWN_COMPLEX_URL = 'https://www.crowncomplexnc.com/events/all';

async function fetchCrownComplexEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Crown Complex...');

  // Use ResearchTools API since the page is client-side rendered
  const scraped = await fetchWithResearchTools(CROWN_COMPLEX_URL);
  if (!scraped || !scraped.content?.text) {
    console.error('  Failed to fetch Crown Complex page');
    return [];
  }

  const text = scraped.content.text;
  const results: UnifiedEvent[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  // Parse events from plain text format:
  // "Event Title Month. Day Crown Venue Buy Tickets"
  // "Event Title Month. Start - Month. End Crown Venue Buy Tickets"
  // Examples:
  // Knoxville at Fayetteville Jan. 9 Crown Coliseum Buy Tickets
  // Fayetteville Fishing Expo Jan. 30 - Feb. 1 Crown Expo Buy Tickets
  // Whose Live Anyway? Feb. 1 Crown Theatre Buy Tickets
  
  // Match: Title + Month. Day[-Day] + Crown Venue + Buy Tickets
  // Format: "Event Name Jan. 9 Crown Coliseum Buy Tickets"
  const eventRegex = /([A-Z][A-Za-z0-9 \.?&'-]+?)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.\s+(\d{1,2})(?:\s*[-–]\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.\s+(\d{1,2}))?\s+(Crown\s+(?:Coliseum|Theatre|Expo))\s+Buy\s+Tickets/gi;

  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  let match;
  const seenIds = new Set<string>();

  while ((match = eventRegex.exec(text)) !== null) {
    let title = match[1].trim();
    
    // Clean up title - remove "Buy Tickets" if still there
    title = title.replace(/Buy\s+Tickets.*$/i, '').trim();
    
    // Filter out junk: titles that are too long or contain navigation keywords
    if (!title || title.length < 3 || title.length > 80) continue;
    if (/home|events|calendar|tickets?|office|contact|policy|faq|accessibility|streaming|parking|directions|about|information|lost.*found|group|benefits|seating|charts|vendor/i.test(title)) continue;

    const startMonth = monthMap[match[2].toLowerCase()];
    const startDay = parseInt(match[3]);
    const endMonthStr = match[4];
    const endDayStr = match[5];
    const venueName = match[6].trim();

    let startDate = new Date(currentYear, startMonth, startDay);
    let endDate = new Date(startDate);

    // Handle date ranges
    if (endMonthStr && endDayStr) {
      const endMonth = monthMap[endMonthStr.toLowerCase()];
      const endDay = parseInt(endDayStr);
      endDate = new Date(currentYear, endMonth, endDay);
    }

    // Adjust year if date is in the past
    if (endDate < now) {
      startDate.setFullYear(currentYear + 1);
      endDate.setFullYear(currentYear + 1);
    }

    // Venue mapping
    const venueInfo: Record<string, UnifiedEvent['venue']> = {
      'crown coliseum': {
        name: 'Crown Coliseum',
        address: '1960 Coliseum Drive',
        city: 'Fayetteville',
        state: 'NC',
        zip: '28306',
      },
      'crown theatre': {
        name: 'Crown Theatre',
        address: '1960 Coliseum Drive',
        city: 'Fayetteville',
        state: 'NC',
        zip: '28306',
      },
      'crown expo': {
        name: 'Crown Expo',
        address: '1960 Coliseum Drive',
        city: 'Fayetteville',
        state: 'NC',
        zip: '28306',
      },
    };

    const venue = venueInfo[venueName.toLowerCase()] || {
      name: venueName,
      city: 'Fayetteville',
      state: 'NC',
    };

    // Infer categories from title
    let categories: string[] = [];
    if (title.toLowerCase().includes('fishing') || title.toLowerCase().includes('expo')) {
      categories.push('Expos & Trade Shows');
    } else if (title.toLowerCase().includes('hockey') || /\s(at|vs|v)\s/i.test(title)) {
      categories.push('Sports');
    } else if (title.toLowerCase().includes('concert') || title.toLowerCase().includes('live') || title.toLowerCase().includes('anyway')) {
      categories.push('Performing Arts');
    } else {
      categories.push('Events');
    }

    const eventId = slugify(title).substring(0, 40);
    const eventDate = startDate.toISOString().split('T')[0];
    const uniqueId = `crown_${eventDate}_${eventId}`;

    // Avoid duplicates
    if (seenIds.has(uniqueId)) continue;
    seenIds.add(uniqueId);

    results.push({
      id: uniqueId,
      source: 'crown_complex',
      sourceId: eventId,
      title,
      description: '',
      startDateTime: startDate,
      endDateTime: endDate,
      venue,
      categories,
      url: CROWN_COMPLEX_URL,
      lastModified: new Date(),
      section: 'crown',
    });
  }

  console.error(`  Found ${results.length} events`);
  return results;
}

// =============================================================================
// Source 7: Downtown Alliance / FayDTA (Modern Events Calendar API + Signature Events)
// =============================================================================

const FAYDTA_API = 'https://www.faydta.com/wp-json/mec/v1/events';
const DICKENS_HOLIDAY_URL = 'http://adickensholiday.com/';

const MLK_URL = 'https://mlkmemorialpark.org/upcoming-events/';

const LIBRARY_URL = 'https://cumberland.librarycalendar.com/events/upcoming';

const ARTS_COUNCIL_URL = 'https://www.wearethearts.com';

const SYMPHONY_URL = 'https://www.fayettevillesymphony.org/2025-2026-season/';

// Cameo Art House Theatre URLs
const CAMEO_NOW_SHOWING_URL = 'https://www.cameoarthouse.com/now-showing/';
const CAMEO_SPECIAL_EVENTS_URL = 'https://www.cameoarthouse.com/special-events/';

// Cameo Art House venue
const CAMEO_VENUE: UnifiedEvent['venue'] = {
  name: 'Cameo Art House Theatre',
  address: '225 Hay Street',
  city: 'Fayetteville',
  state: 'NC',
  zip: '28301',
  phone: '910-486-6633',
};

// Fayetteville Symphony Orchestra venues with full location data
const SYMPHONY_VENUES: Record<string, UnifiedEvent['venue']> = {
  'arts_xl': {
    name: 'Arts XL',
    address: '214 Burgess St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
  },
  'st_johns': {
    name: "St. John's Episcopal Church",
    address: '302 Green Street',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
  },
  'seabrook': {
    name: 'Seabrook Auditorium (Fayetteville State University)',
    address: '1200 Murchison Rd',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
  },
  'huff': {
    name: 'Huff Concert Hall (Methodist University)',
    address: '5400 Ramsey Street',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28311',
  },
};

// FY26 Training Holiday Schedule (Oct 2025 - Sep 2026)
// Source: XVIII Airborne Corps Compensatory Schedule
const FY26_TRAINING_HOLIDAYS = [
  // October 2025
  { name: 'Columbus Day Weekend', start: '2025-10-10', end: '2025-10-13', days: 4, type: 'federal' },
  // November 2025
  { name: 'Veterans Day Weekend', start: '2025-11-08', end: '2025-11-11', days: 4, type: 'federal' },
  { name: 'Thanksgiving Weekend', start: '2025-11-27', end: '2025-11-30', days: 4, type: 'federal' },
  // December 2025
  { name: 'Christmas Block Leave', start: '2025-12-22', end: '2025-12-26', days: 5, type: 'block' },
  { name: 'New Year Block Leave', start: '2025-12-29', end: '2026-01-02', days: 5, type: 'block' },
  // January 2026
  { name: 'MLK Day Weekend', start: '2026-01-16', end: '2026-01-19', days: 4, type: 'federal' },
  // February 2026
  { name: 'Presidents Day Weekend', start: '2026-02-13', end: '2026-02-16', days: 4, type: 'federal' },
  // March 2026
  { name: 'Training Holiday Weekend', start: '2026-03-13', end: '2026-03-15', days: 3, type: 'training' },
  // April 2026
  { name: 'Easter Weekend', start: '2026-04-03', end: '2026-04-06', days: 4, type: 'federal' },
  // May 2026
  { name: 'Memorial Day Weekend', start: '2026-05-22', end: '2026-05-25', days: 4, type: 'federal' },
  // July 2026
  { name: 'Independence Day Weekend', start: '2026-07-03', end: '2026-07-06', days: 4, type: 'federal' },
  // September 2026
  { name: 'Labor Day Weekend', start: '2026-09-04', end: '2026-09-07', days: 4, type: 'federal' },
];

async function fetchFayDTAEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Downtown Alliance (FayDTA)...');

  const results: UnifiedEvent[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  // 1. Try to fetch from MEC API (may be empty)
  try {
    const response = await fetch(FAYDTA_API);
    if (response.ok) {
      const events = await response.json();

      if (Array.isArray(events) && events.length > 0) {
        for (const event of events) {
          const startDate = new Date(event.date?.start?.date || event.meta?.mec_start_date);
          const endDate = new Date(event.date?.end?.date || event.meta?.mec_end_date || startDate);

          if (endDate < now) continue;

          results.push({
            id: `faydta_${event.ID || event.id}`,
            source: 'faydta',
            sourceId: String(event.ID || event.id),
            title: event.title?.rendered || event.title || 'Downtown Alliance Event',
            description: cleanDescription(event.content?.rendered || event.excerpt?.rendered || '', event.title?.rendered),
            startDateTime: startDate,
            endDateTime: endDate,
            venue: {
              name: event.location?.name || 'Downtown Fayetteville',
              address: event.location?.address || undefined,
              city: 'Fayetteville',
              state: 'NC',
            },
            categories: event.categories?.map((c: any) => c.name) || ['Community'],
            url: event.link || event.permalink || 'https://www.faydta.com/events/',
            imageUrl: event.featured_image?.large || event.thumbnail || undefined,
            lastModified: new Date(event.modified || event.date_gmt || new Date()),
            section: 'downtown',
          });
        }
      }
    }
  } catch (error) {
    console.error('  MEC API error (may be empty):', error);
  }

  // 2. Add signature annual events that are on separate sites

  // A Dickens Holiday - Last Friday of November (day after Thanksgiving)
  // Calculate the date for the current/next occurrence
  const dickensDate = getLastFridayOfNovember(currentYear);
  if (dickensDate < now) {
    // Event passed this year, use next year
    dickensDate.setFullYear(currentYear + 1);
  }

  // Only add if within next 12 months
  const oneYearFromNow = new Date(now);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  if (dickensDate <= oneYearFromNow) {
    results.push({
      id: `faydta_dickens_${dickensDate.getFullYear()}`,
      source: 'faydta',
      sourceId: `dickens_${dickensDate.getFullYear()}`,
      title: 'A Dickens Holiday',
      description: 'Annual Victorian-themed holiday celebration in Downtown Fayetteville. Features holiday shopping, artisan vendors, food trucks, costumed Dickens characters, carolers, carriage rides, candlelight procession, tree lighting ceremony, and fireworks. Free admission.',
      startDateTime: new Date(dickensDate.setHours(12, 0, 0, 0)), // Starts at noon
      endDateTime: new Date(dickensDate.setHours(22, 0, 0, 0)), // Ends around 10 PM
      venue: {
        name: 'Downtown Fayetteville',
        city: 'Fayetteville',
        state: 'NC',
      },
      categories: ['Festivals & Fairs', 'Community', 'Holiday'],
      url: DICKENS_HOLIDAY_URL,
      lastModified: new Date(),
      section: 'downtown',
    });
  }

  // Midsummer Magic - typically in June (exact date varies, skip for now unless we can scrape it)
  // TODO: Add Midsummer Magic when dates are announced

  console.error(`  Found ${results.length} events`);
  return results;
}

/**
 * Get the last Friday of November (day after Thanksgiving) for a given year
 */
function getLastFridayOfNovember(year: number): Date {
  // Start from November 30 and go backwards to find the last Friday
  const date = new Date(year, 10, 30); // November 30
  while (date.getDay() !== 5) { // 5 = Friday
    date.setDate(date.getDate() - 1);
  }
  return date;
}

// =============================================================================
// Source 8: MLK Committee (Signature Annual Events)
// =============================================================================

/**
 * Get MLK Day (3rd Monday of January) for a given year
 */
function getMLKDay(year: number): Date {
  // Start from January 1 and find the 3rd Monday
  const date = new Date(year, 0, 1); // January 1
  let mondayCount = 0;

  while (mondayCount < 3) {
    if (date.getDay() === 1) { // 1 = Monday
      mondayCount++;
      if (mondayCount === 3) break;
    }
    date.setDate(date.getDate() + 1);
  }
  return date;
}

async function fetchMLKEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: MLK Committee...');

  const results: UnifiedEvent[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  // MLK Parade - held on or around MLK Day (3rd Monday of January)
  // The parade is typically the Saturday before MLK Day
  let mlkDay = getMLKDay(currentYear);

  // If MLK Day has passed, use next year
  if (mlkDay < now) {
    mlkDay = getMLKDay(currentYear + 1);
  }

  // Parade is typically the Saturday before MLK Day
  const paradeDate = new Date(mlkDay);
  paradeDate.setDate(paradeDate.getDate() - 2); // Saturday before Monday

  // Only add if within next 12 months
  const oneYearFromNow = new Date(now);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  if (paradeDate <= oneYearFromNow) {
    results.push({
      id: `mlk_parade_${paradeDate.getFullYear()}`,
      source: 'mlk_committee',
      sourceId: `parade_${paradeDate.getFullYear()}`,
      title: 'Dr. Martin Luther King Jr. Parade',
      description: 'Annual MLK Parade through Downtown Fayetteville celebrating the life and legacy of Dr. Martin Luther King Jr. The parade features local organizations, schools, marching bands, and community groups. Free to attend.',
      startDateTime: new Date(paradeDate.setHours(10, 0, 0, 0)), // Starts at 10 AM
      endDateTime: new Date(paradeDate.setHours(13, 0, 0, 0)), // Ends around 1 PM
      venue: {
        name: 'Downtown Fayetteville',
        address: 'Hay Street',
        city: 'Fayetteville',
        state: 'NC',
      },
      categories: ['Parades', 'Community', 'Cultural'],
      url: MLK_URL,
      lastModified: new Date(),
      section: 'downtown',
    });
  }

  // MLK Banquet - typically held in late January or February
  // Date varies each year, so we'll add it when announced
  // For now, just add the parade as the signature event

  console.error(`  Found ${results.length} events`);
  return results;
}

// =============================================================================
// Source 9: Cumberland County Library - Headquarters (Web Scraping)
// =============================================================================

async function fetchLibraryEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Headquarters Library...');

  const results: UnifiedEvent[] = [];
  const now = new Date();

  try {
    const response = await fetch(LIBRARY_URL);
    if (!response.ok) {
      console.error(`  HTTP error: ${response.status}`);
      return results;
    }

    const html = await response.text();

    // Parse event blocks - look for event links and their associated data
    // Pattern: /event/[slug]-[id]
    const eventPattern = /href="\/event\/([^"]+)"[^>]*>.*?<\/a>/gs;
    const eventUrls = new Set<string>();

    // Extract unique event URLs
    const urlMatches = html.matchAll(/href="(\/event\/[^"]+)"/g);
    for (const match of urlMatches) {
      eventUrls.add(match[1]);
    }

    // For each unique event, extract its details from the page
    // The page shows events in a featured carousel and list format
    // We'll extract from the structured data in the HTML

    // Find event blocks that contain "Headquarters Library" in the location field
    const eventBlocks = html.split(/class="lc-featured-event-content"/);

    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i];

      // Check if this event is at Headquarters Library by looking at the location div specifically
      // The location is in: <div class="lc-featured-event-location">...at Headquarters Library</div>
      const locationMatch = block.match(/class="lc-featured-event-location"[^>]*>([^<]+(?:<[^>]+>[^<]*)*?)at\s+([\w\s]+Library)/i);
      if (!locationMatch || !locationMatch[2].includes('Headquarters')) {
        continue;
      }

      // Extract event URL
      const urlMatch = block.match(/href="(\/event\/[^"]+)"/);
      if (!urlMatch) continue;
      const eventUrl = urlMatch[1];
      const eventId = eventUrl.split('/').pop() || '';

      // Extract title from aria-label or link text
      const titleMatch = block.match(/aria-label="View Details - ([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : 'Library Event';

      // Extract date and time
      // Format: "Saturday, January 3, 2026 at 10:00am - 10:30am"
      const dateMatch = block.match(/([A-Z][a-z]+day),\s+([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})\s+at\s+(\d{1,2}:\d{2}[ap]m)\s*-\s*(\d{1,2}:\d{2}[ap]m)/i);

      if (!dateMatch) continue;

      const [, , month, day, year, startTime, endTime] = dateMatch;

      // Parse date
      const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month);

      if (monthIndex === -1) continue;

      const startDate = new Date(parseInt(year), monthIndex, parseInt(day));
      const endDate = new Date(parseInt(year), monthIndex, parseInt(day));

      // Parse start time
      const startTimeParsed = parseTimeString(startTime);
      if (startTimeParsed) {
        startDate.setHours(startTimeParsed.hours, startTimeParsed.minutes, 0, 0);
      }

      // Parse end time
      const endTimeParsed = parseTimeString(endTime);
      if (endTimeParsed) {
        endDate.setHours(endTimeParsed.hours, endTimeParsed.minutes, 0, 0);
      }

      // Skip past events
      if (endDate < now) continue;

      // Extract program type/category
      const categoryMatch = block.match(/Program Type:<\/h4>\s*([^<]+)/);
      const category = categoryMatch ? categoryMatch[1].trim() : 'Library Programs';

      // Extract age group
      const ageMatch = block.match(/Age Group:<\/h4>\s*([^<]+)/);
      const ageGroup = ageMatch ? ageMatch[1].trim() : '';

      // Extract room/location detail
      const roomMatch = block.match(/at Headquarters Library\s*<\/div>\s*<\/div>/i);
      const locationDetail = block.match(/([^>]+)\s+at Headquarters Library/);
      const room = locationDetail ? locationDetail[1].trim() : '';

      // Build base description
      let description = ageGroup ? `${category} program for ${ageGroup}. ${room ? `Location: ${room}` : ''}`.trim() : `${category} program at Headquarters Library.`;
      let imageUrl: string | undefined;

      // Fetch individual event page for better description and image
      const fullEventUrl = `https://cumberland.librarycalendar.com${eventUrl}`;
      try {
        const eventResponse = await fetch(fullEventUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EventBot/1.0)' }
        });
        if (eventResponse.ok) {
          const eventHtml = await eventResponse.text();

          // Extract description from JSON or meta
          const jsonDescMatch = eventHtml.match(/"description"\s*:\s*"([^"]+)"/);
          if (jsonDescMatch) {
            const fullDesc = jsonDescMatch[1]
              .replace(/\\u[\dA-Fa-f]{4}/g, '')
              .replace(/<[^>]*>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/\\r\\n/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            if (fullDesc.length > description.length) {
              description = fullDesc.slice(0, 500);
            }
          }

          // Fallback to meta description
          if (description.length < 50) {
            const metaDescMatch = eventHtml.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
            if (metaDescMatch && metaDescMatch[1].length > description.length) {
              description = metaDescMatch[1].replace(/&amp;/g, '&').trim();
            }
          }

          // Extract event image
          const imgMatch = eventHtml.match(/field--name-field-lc-image[^>]*>.*?<img[^>]+src="([^"]+)"/s);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }
        // Rate limit
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        // Continue with basic data
      }

      results.push({
        id: `library_hq_${eventId}`,
        source: 'library_hq',
        sourceId: eventId,
        title: title,
        description,
        startDateTime: startDate,
        endDateTime: endDate,
        venue: {
          name: 'Headquarters Library',
          address: '300 Maiden Lane',
          city: 'Fayetteville',
          state: 'NC',
          zip: '28301',
        },
        categories: [category, 'Library Programs'].filter(Boolean),
        url: fullEventUrl,
        imageUrl,
        lastModified: new Date(),
        section: 'downtown',
      });
    }
  } catch (error) {
    console.error('  Error fetching library events:', error);
  }

  console.error(`  Found ${results.length} events`);
  return results;
}

// =============================================================================
// Source 10: Fort Bragg Training Holidays (Static Schedule)
// =============================================================================

async function fetchFortBraggHolidays(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Fort Bragg Training Holidays...');

  const results: UnifiedEvent[] = [];
  const now = new Date();

  for (const holiday of FY26_TRAINING_HOLIDAYS) {
    const startDate = new Date(holiday.start + 'T00:00:00');
    const endDate = new Date(holiday.end + 'T23:59:59');

    // Skip past holidays
    if (endDate < now) continue;

    // Create a merchant-friendly title
    const title = `🎖️ ${holiday.days}-Day Weekend: ${holiday.name}`;

    // Create description based on type
    let description = '';
    if (holiday.type === 'federal') {
      description = `Fort Bragg soldiers have a ${holiday.days}-day weekend for ${holiday.name}. Expect increased activity in downtown Fayetteville as military families enjoy time off.`;
    } else if (holiday.type === 'block') {
      description = `Fort Bragg Block Leave period - many soldiers will be on leave. Some may travel, others will stay local. Good time for family-friendly events and promotions.`;
    } else {
      description = `Corps Training Holiday - soldiers have a ${holiday.days}-day weekend. Great opportunity for local businesses to welcome military families.`;
    }

    results.push({
      id: `ft_liberty_holiday_${holiday.start}`,
      source: 'fort_liberty_holidays',
      sourceId: `holiday_${holiday.start}`,
      title: title,
      description: description,
      startDateTime: startDate,
      endDateTime: endDate,
      venue: {
        name: 'Fort Bragg',
        city: 'Fort Bragg',
        state: 'NC',
      },
      categories: ['Military', 'Long Weekend'],
      url: 'https://home.army.mil/liberty',
      lastModified: new Date(),
      section: 'fort_bragg',
    });
  }

  console.error(`  Found ${results.length} events`);
  return results;
}

function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2] || '0');
  const period = match[3].toLowerCase();

  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  return { hours, minutes };
}

// =============================================================================
// Source 11: Arts Council of Fayetteville (Wix Events)
// =============================================================================

async function fetchArtsCouncilEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Arts Council of Fayetteville...');

  const results: UnifiedEvent[] = [];
  const now = new Date();

  try {
    const response = await fetch(ARTS_COUNCIL_URL, {
      headers: {
        'User-Agent': 'FayettevilleCentralCalendar/1.0',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      console.error(`  HTTP error: ${response.status}`);
      return results;
    }

    const html = await response.text();

    // Extract event data from embedded Wix JSON
    // Pattern: "title":"Event Name","description":"...","mainImage":{...},"slug":"event-slug"
    const eventJsonPattern = /"title":"([^"]+)","description":"([^"]+)","about":"[^"]*","mainImage":\{[^}]+\},"slug":"([^"]+)"/g;

    // Also extract scheduling data
    // Pattern: "startDate":"2026-01-23T23:00:00.000Z","endDate":"2026-01-24T02:00:00.000Z"
    const schedulePattern = /"startDate":"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)","endDate":"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)"/g;

    // Collect all events with their data
    const eventData: { title: string; description: string; slug: string }[] = [];
    let match;

    while ((match = eventJsonPattern.exec(html)) !== null) {
      const [, title, description, slug] = match;

      // Skip navigation/system items
      if (title.includes('My ') || title === 'Events' || title === 'Profile') continue;

      eventData.push({
        title: decodeHtmlEntities(title),
        description: decodeHtmlEntities(description),
        slug,
      });
    }

    // Collect scheduling data (ISO dates)
    const schedules: { startDate: Date; endDate: Date }[] = [];
    while ((match = schedulePattern.exec(html)) !== null) {
      const [, startDate, endDate] = match;
      schedules.push({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    }

    // Match events with schedules (they appear in same order on the page)
    // Filter to only unique events (some may appear duplicated)
    const seenSlugs = new Set<string>();

    for (let i = 0; i < Math.min(eventData.length, schedules.length); i++) {
      const event = eventData[i];
      const schedule = schedules[i];

      // Skip duplicates and past events
      if (seenSlugs.has(event.slug)) continue;
      if (schedule.endDate < now) continue;

      seenSlugs.add(event.slug);

      // Extract image URL
      const imgPattern = new RegExp(`"slug":"${event.slug.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}"[^}]*"mainImage":\\{[^}]*"url":"([^"]+)"`, 'i');
      const imgMatch = html.match(imgPattern);
      let imageUrl: string | undefined;
      if (imgMatch) {
        imageUrl = imgMatch[1].replace(/\\\//g, '/');
      }

      results.push({
        id: `arts_council_${event.slug}`,
        source: 'arts_council',
        sourceId: event.slug,
        title: event.title,
        description: event.description,
        startDateTime: schedule.startDate,
        endDateTime: schedule.endDate,
        venue: {
          name: 'The Arts Center',
          address: '301 Hay St',
          city: 'Fayetteville',
          state: 'NC',
          zip: '28301',
        },
        categories: ['Arts & Culture', 'Gallery'],
        url: `${ARTS_COUNCIL_URL}/event-details-registration/${event.slug}`,
        imageUrl,
        lastModified: new Date(),
        section: 'downtown',
      });
    }
  } catch (error) {
    console.error('  Error fetching Arts Council events:', error);
  }

  console.error(`  Found ${results.length} events`);
  return results;
}

// =============================================================================
// Source 12: Fayetteville Symphony Orchestra (Season Schedule)
// =============================================================================

// 2025-2026 Season concerts with researched venue data
// Source: https://www.fayettevillesymphony.org/concert-calendar/ (authoritative for dates/venues)
const SYMPHONY_2025_2026_SEASON = [
  {
    id: 'coffee-cantata-2025',
    title: 'Coffee Cantata',
    description: "Chamber concert featuring Bach's Coffee Cantata with voice and strings, telling a comedic story of a girl and her father arguing over love, life, and caffeine. Coffee and pastries available.",
    date: '2025-11-22',
    time: '14:00', // 2:00pm (also 7:30pm show)
    endTime: '16:00',
    venue: 'arts_xl',
    categories: ['Classical Music', 'Chamber Music'],
  },
  {
    id: 'coffee-cantata-evening-2025',
    title: 'Coffee Cantata (Evening Performance)',
    description: "Chamber concert featuring Bach's Coffee Cantata with voice and strings, telling a comedic story of a girl and her father arguing over love, life, and caffeine. Coffee and pastries available.",
    date: '2025-11-22',
    time: '19:30', // 7:30pm
    endTime: '21:30',
    venue: 'arts_xl',
    categories: ['Classical Music', 'Chamber Music'],
  },
  {
    id: 'road-to-america-250-2026',
    title: 'The Road to America 250',
    description: "Chamber concert celebrating American musical history with music by American composers, ahead of the country's 250th anniversary.",
    date: '2026-01-17',
    time: '19:30',
    endTime: '21:30',
    venue: 'huff', // Per concert calendar (not season page which said St. John's)
    categories: ['Classical Music', 'Chamber Music', 'Americana'],
  },
  {
    id: 'night-on-the-town-2026',
    title: 'A Night on the Town',
    description: 'Features award-winning bassist Kebra-Seyoun Charles performing their original bass concerto "Night Life," plus a gospel choir performing gospel settings.',
    date: '2026-02-28',
    time: '19:30',
    endTime: '21:30',
    venue: 'seabrook',
    categories: ['Classical Music', 'Orchestra', 'Gospel'],
  },
  {
    id: 'side-by-side-2026',
    title: 'Side by Side',
    description: 'Annual concert where the Fayetteville Symphony Youth Orchestra performs alongside professional symphony musicians. A celebration of music education and mentorship. Free admission, tickets required.',
    date: '2026-03-15',
    time: '16:00', // 4:00pm
    endTime: '18:00',
    venue: 'huff',
    categories: ['Classical Music', 'Orchestra', 'Family', 'Youth'],
  },
  {
    id: 'john-williams-2026',
    title: 'John Williams and His Influences',
    description: 'Features iconic John Williams film scores paired with some of the classical greats that inspired them. A celebration of cinematic music.',
    date: '2026-04-21', // Per concert calendar (not Apr 18 from season page)
    time: '19:30',
    endTime: '21:30',
    venue: 'huff',
    categories: ['Classical Music', 'Orchestra', 'Film Music'],
  },
];

async function fetchSymphonyEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Fayetteville Symphony Orchestra...');

  const results: UnifiedEvent[] = [];
  const now = new Date();

  for (const concert of SYMPHONY_2025_2026_SEASON) {
    const [year, month, day] = concert.date.split('-').map(Number);
    const [hours, minutes] = concert.time.split(':').map(Number);
    const [endHours, endMinutes] = concert.endTime.split(':').map(Number);

    const startDateTime = new Date(year, month - 1, day, hours, minutes);
    const endDateTime = new Date(year, month - 1, day, endHours, endMinutes);

    // Skip past events
    if (endDateTime < now) continue;

    const venue = SYMPHONY_VENUES[concert.venue];

    results.push({
      id: `symphony_${concert.id}`,
      source: 'fayetteville_symphony',
      sourceId: concert.id,
      title: `Fayetteville Symphony: ${concert.title}`,
      description: concert.description,
      startDateTime,
      endDateTime,
      venue,
      categories: concert.categories,
      url: SYMPHONY_URL,
      lastModified: new Date(),
      section: 'downtown',
    });
  }

  console.error(`  Found ${results.length} events`);
  return results;
}

// =============================================================================
// Source 13: Cameo Art House Theatre (Dynamic Scraping)
// =============================================================================

/**
 * Parse a showtime string like "Tuesday, December 30: 4:15 & 7:30"
 * Returns array of Date objects for each showtime
 */
function parseCameoShowtimes(showtimeText: string, currentYear: number): Date[] {
  const results: Date[] = [];

  // Match pattern: "Day, Month Date: Time(s)"
  const dayMatch = showtimeText.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+)\s+(\d{1,2}):\s*(.+)$/i);
  if (!dayMatch) return results;

  const [, , month, day, timesStr] = dayMatch;

  // Parse month
  const monthNames: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };
  const monthIndex = monthNames[month.toLowerCase()];
  if (monthIndex === undefined) return results;

  // Determine year - showtimes are typically for current or next few months
  // If the month is significantly before current month (more than 1 month ago), assume next year
  const now = new Date();
  let year = currentYear;
  const monthDiff = monthIndex - now.getMonth();

  // If month is more than 1 month in the past, it's probably next year
  // (allows for late-month scheduling of early-month events)
  if (monthDiff < -1) {
    year = currentYear + 1;
  }

  // Parse times (can be "4:15 & 7:30" or "1:00, 4:15 & 7:30" or "1:00PM")
  const timePattern = /(\d{1,2}):?(\d{2})?\s*(AM|PM)?/gi;
  let timeMatch;

  while ((timeMatch = timePattern.exec(timesStr)) !== null) {
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2] || '0');
    const period = timeMatch[3]?.toUpperCase();

    // If no AM/PM specified, infer from hour (movie theaters rarely show before noon)
    if (!period) {
      // Times like 1:00, 1:30 are likely PM (1 PM), times like 4:00+ are definitely PM
      if (hours < 12) {
        hours += 12; // Assume PM for movie showtimes
      }
    } else if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    const showDate = new Date(year, monthIndex, parseInt(day), hours, minutes);
    if (showDate > now) {
      results.push(showDate);
    }
  }

  return results;
}

/**
 * Parse movie block from Cameo HTML
 */
function parseCameoMovieBlock(block: string, currentYear: number): {
  title: string;
  description: string;
  rating: string;
  runtime: string;
  director: string;
  showtimes: Date[];
  imageUrl?: string;
  ticketUrl?: string;
} | null {
  // Extract title from <strong>TITLE</strong>
  const titleMatch = block.match(/<p><strong>([^<]+)<\/strong><\/p>/);
  if (!titleMatch) return null;

  let title = titleMatch[1].trim();
  // Clean up title (remove date suffixes like "- JANUARY 11TH")
  title = title.replace(/\s*[-–]\s*(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+\d{1,2}(ST|ND|RD|TH)?/i, '');

  // Extract showtimes
  const showtimeSection = block.match(/UPCOMING SHOWTIMES:<\/div>\s*<div>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/i);
  const showtimes: Date[] = [];

  if (showtimeSection) {
    const showtimeLines = showtimeSection[1].split(/<br\s*\/?>/i);
    for (const line of showtimeLines) {
      // Remove HTML tags and decode HTML entities
      let cleanLine = line.replace(/<[^>]*>/g, '').trim();
      cleanLine = cleanLine.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
      if (cleanLine) {
        showtimes.push(...parseCameoShowtimes(cleanLine, currentYear));
      }
    }
  }

  // Extract description (paragraph after showtimes, before director)
  const descMatch = block.match(/<\/div>\s*<p>([^<]+(?:(?!Directed By:).)*?)<\/p>\s*<p>Directed By:/i);
  const description = descMatch ? descMatch[1].trim() : '';

  // Extract rating and runtime
  const ratingMatch = block.match(/Rated\s+(\w+);\s*Runtime\s+([\dhr\s]+min)/i);
  const rating = ratingMatch ? ratingMatch[1] : 'NR';
  const runtime = ratingMatch ? ratingMatch[2] : '';

  // Extract director
  const directorMatch = block.match(/Directed By:\s*([^<]+)/i);
  const director = directorMatch ? directorMatch[1].trim() : '';

  // Extract image URL
  const imageMatch = block.match(/src="(https:\/\/www\.cameoarthouse\.com\/wordpress\/wp-content\/uploads\/[^"]+)"/);
  const imageUrl = imageMatch ? imageMatch[1] : undefined;

  // Extract ticket URL
  const ticketMatch = block.match(/href="(https:\/\/ticketmesandhills\.com\/events\/[^"]+)"/);
  const ticketUrl = ticketMatch ? ticketMatch[1] : undefined;

  if (showtimes.length === 0) return null;

  return { title, description, rating, runtime, director, showtimes, imageUrl, ticketUrl };
}

async function fetchCameoEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Cameo Art House Theatre...');

  const results: UnifiedEvent[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  // Fetch both pages in parallel
  const [nowShowingRes, specialEventsRes] = await Promise.all([
    fetch(CAMEO_NOW_SHOWING_URL, {
      headers: { 'User-Agent': 'FayettevilleCentralCalendar/1.0', 'Accept': 'text/html' },
    }),
    fetch(CAMEO_SPECIAL_EVENTS_URL, {
      headers: { 'User-Agent': 'FayettevilleCentralCalendar/1.0', 'Accept': 'text/html' },
    }),
  ]);

  // Process Now Showing page
  if (nowShowingRes.ok) {
    const html = await nowShowingRes.text();

    // Split by movie blocks (each movie is in a panel-grid-cell)
    const movieBlocks = html.split(/class="panel-grid-cell"/);

    for (const block of movieBlocks) {
      const movie = parseCameoMovieBlock(block, currentYear);
      if (!movie) continue;

      // Create an event for each showtime
      for (const showtime of movie.showtimes) {
        // Calculate end time based on runtime
        const runtimeMatch = movie.runtime.match(/(\d+)hr\s*(\d+)?min/i);
        let durationMinutes = 120; // Default 2 hours
        if (runtimeMatch) {
          durationMinutes = parseInt(runtimeMatch[1]) * 60 + (parseInt(runtimeMatch[2] || '0'));
        }
        const endTime = new Date(showtime.getTime() + durationMinutes * 60 * 1000);

        const dateStr = showtime.toISOString().split('T')[0];
        const timeStr = showtime.toTimeString().slice(0, 5).replace(':', '');

        results.push({
          id: `cameo_${slugify(movie.title)}_${dateStr}_${timeStr}`,
          source: 'cameo_art_house',
          sourceId: `${slugify(movie.title)}_${dateStr}_${timeStr}`,
          title: movie.title,
          description: `${movie.description} Directed by ${movie.director}. Rated ${movie.rating}, ${movie.runtime}.`,
          startDateTime: showtime,
          endDateTime: endTime,
          venue: CAMEO_VENUE,
          categories: ['Film', 'Movies', 'Arts & Culture'],
          url: CAMEO_NOW_SHOWING_URL,
          ticketUrl: movie.ticketUrl,
          imageUrl: movie.imageUrl,
          lastModified: new Date(),
          section: 'downtown',
        });
      }
    }
  }

  // Process Special Events page
  if (specialEventsRes.ok) {
    const html = await specialEventsRes.text();

    // Split by event blocks
    const eventBlocks = html.split(/class="panel-grid-cell"/);

    for (const block of eventBlocks) {
      const event = parseCameoMovieBlock(block, currentYear);
      if (!event) continue;

      // Special events typically have single showtimes
      for (const showtime of event.showtimes) {
        const runtimeMatch = event.runtime.match(/(\d+)hr\s*(\d+)?min/i);
        let durationMinutes = 120;
        if (runtimeMatch) {
          durationMinutes = parseInt(runtimeMatch[1]) * 60 + (parseInt(runtimeMatch[2] || '0'));
        }
        const endTime = new Date(showtime.getTime() + durationMinutes * 60 * 1000);

        const dateStr = showtime.toISOString().split('T')[0];
        const timeStr = showtime.toTimeString().slice(0, 5).replace(':', '');

        // Determine category based on title/content
        let categories = ['Film', 'Special Screening'];
        if (event.title.match(/\(\d{4}\)/)) {
          categories.push('Classic Film');
        }
        if (event.description.toLowerCase().includes('documentary')) {
          categories = ['Documentary', 'Special Screening'];
        }
        if (event.title.toLowerCase().includes('holocaust') || event.description.toLowerCase().includes('holocaust')) {
          categories.push('Educational');
        }

        results.push({
          id: `cameo_special_${slugify(event.title)}_${dateStr}_${timeStr}`,
          source: 'cameo_art_house',
          sourceId: `special_${slugify(event.title)}_${dateStr}_${timeStr}`,
          title: `Cameo Special: ${event.title}`,
          description: `${event.description} ${event.director ? `Directed by ${event.director}.` : ''} Rated ${event.rating}, ${event.runtime}.`,
          startDateTime: showtime,
          endDateTime: endTime,
          venue: CAMEO_VENUE,
          categories,
          url: CAMEO_SPECIAL_EVENTS_URL,
          ticketUrl: event.ticketUrl,
          imageUrl: event.imageUrl,
          lastModified: new Date(),
          section: 'downtown',
        });
      }
    }
  }

  // Deduplicate by ID
  const unique = Array.from(new Map(results.map(e => [e.id, e])).values());
  unique.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

  console.error(`  Found ${unique.length} events (showtimes)`);
  return unique;
}

// =============================================================================
// Utilities
// =============================================================================

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    // Named entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g, '…')
    // Hex entities (&#x2019; etc)
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Decimal entities (&#8217; etc)
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

/**
 * Clean up event description text by:
 * 1. Decoding HTML entities
 * 2. Stripping HTML tags
 * 3. Removing date prefixes like "12/31/2025 to 12/31/2025 - "
 * 4. Removing title repetition at the start
 * 5. Cleaning up whitespace and punctuation
 */
function cleanDescription(text: string, title?: string): string {
  if (!text) return '';

  let cleaned = decodeHtmlEntities(stripHtml(text));

  // Remove date prefix patterns like "12/31/2025 to 12/31/2025 - " or "01/02/2026 to 01/02/2026 - "
  cleaned = cleaned.replace(/^\d{2}\/\d{2}\/\d{4}\s+to\s+\d{2}\/\d{2}\/\d{4}\s*[-–—]\s*/i, '');

  // Remove single date prefix like "12/31/2025 - "
  cleaned = cleaned.replace(/^\d{2}\/\d{2}\/\d{4}\s*[-–—]\s*/i, '');

  // Remove title if it appears at the very start of description
  if (title && cleaned.toLowerCase().startsWith(title.toLowerCase())) {
    cleaned = cleaned.slice(title.length).replace(/^[\s\-–—:]+/, '');
  }

  // Clean up leading/trailing punctuation
  cleaned = cleaned
    .replace(/^[\s\-–—:]+/, '')  // Remove leading dashes/colons
    .replace(/[\s\-–—]+$/, '')   // Remove trailing dashes
    .replace(/\s+/g, ' ')        // Normalize whitespace
    .trim();

  // Capitalize first letter if it got lowercased
  if (cleaned.length > 0 && /[a-z]/.test(cleaned[0])) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

function extractXmlTag(xml: string, tag: string): string | null {
  // CDATA with possible whitespace before closing tag
  const match = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i'));
  if (match) return match[1];

  // Simple tag content (no CDATA)
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
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// =============================================================================
// Source 14: Fayetteville Motor Speedway (MyRacePass)
// Dirt track racing - Season runs March to October
// =============================================================================

const FAYETTEVILLE_SPEEDWAY_URL = 'https://www.myracepass.com/tracks/2933/schedule';
const FAYETTEVILLE_SPEEDWAY_TRACK_ID = 2933;

async function fetchFayettevilleSpeedwayEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Fayetteville Motor Speedway (MyRacePass)...');

  const results: UnifiedEvent[] = [];
  const now = new Date();

  // Fetch 2 months of events by checking daily pages
  // MyRacePass track schedule pages show upcoming events
  try {
    const response = await fetch(FAYETTEVILLE_SPEEDWAY_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FayettevilleEventsBot/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`  Failed to fetch: ${response.status}`);
      return [];
    }

    const html = await response.text();

    // Parse events from MyRacePass HTML structure
    // Events are in mrp-rowCardWrap divs with structure:
    // <div class="mrp-rowCardWrap">...<p class="text-muted text-uppercase">DATE</p>...<h3><a href="/events/ID">TITLE</a></h3>...<p class="text-muted">SERIES</p>...btn-outline-danger for upcoming, btn-danger for past results
    // We want events with "Details" button (btn-outline-danger), not "Results" (btn-danger) or "Canceled"/"Dropped"

    // Split into individual event blocks
    const eventBlocks = html.split('<div class="mrp-rowCardWrap">').slice(1);

    const seenIds = new Set<string>();

    for (const block of eventBlocks) {
      // Skip cancelled, dropped, rain out, postponed events
      if (/btn-outline-default.*(?:Canceled|Dropped|Rain Out|Postponed)/i.test(block)) {
        continue;
      }

      // Skip events with Results (past events)
      if (/btn-danger.*>Results<\/a>/i.test(block)) {
        continue;
      }

      // Extract date
      const dateMatch = block.match(/<p class="text-muted text-uppercase">([^<]+)<\/p>/);
      if (!dateMatch) continue;
      const dateStr = dateMatch[1].trim();

      // Extract event ID and title
      const titleMatch = block.match(/<h3><a href="\/events\/(\d+)[^"]*">([^<]+)<\/a><\/h3>/);
      if (!titleMatch) continue;
      const eventId = titleMatch[1];
      const title = titleMatch[2].trim();

      // Extract series (optional)
      const seriesMatch = block.match(/<\/h3>[\s\S]*?<p class="text-muted">([^<]+)<\/p>/);
      const series = seriesMatch ? seriesMatch[1].trim() : '';

      // Parse date - format: "Saturday, March 15, 2025" or "March 15, 2025"
      const parsedDate = dateStr.match(/(?:\w+,\s+)?(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
      if (!parsedDate) continue;

      const monthNames: Record<string, number> = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
      };

      const month = monthNames[parsedDate[1].toLowerCase()];
      if (month === undefined) continue;

      const day = parseInt(parsedDate[2]);
      const year = parseInt(parsedDate[3]);

      const startDate = new Date(year, month, day, 19, 0, 0); // Racing typically starts at 7 PM
      const endDate = new Date(year, month, day, 23, 0, 0); // Ends around 11 PM

      // Skip past events
      if (endDate < now) continue;

      // Create unique ID
      const uniqueId = `speedway_${eventId}`;
      if (seenIds.has(uniqueId)) continue;
      seenIds.add(uniqueId);

      // Build event title - include series if different from title
      let fullTitle = title;
      if (series && !title.toLowerCase().includes(series.toLowerCase().split(' ')[0])) {
        fullTitle = `${title} - ${series}`;
      }

      results.push({
        id: uniqueId,
        source: 'fayetteville_speedway',
        sourceId: eventId,
        title: fullTitle,
        description: series ? `Racing series: ${series}` : 'Dirt track racing at Fayetteville Motor Speedway',
        startDateTime: startDate,
        endDateTime: endDate,
        venue: {
          name: 'Fayetteville Motor Speedway',
          address: '3407 Doc Bennett Rd',
          city: 'Fayetteville',
          state: 'NC',
          zip: '28312',
        },
        categories: ['Sports', 'Family'],
        url: `https://www.myracepass.com/events/${eventId}`,
        ticketUrl: `https://www.myracepass.com/tracks/${FAYETTEVILLE_SPEEDWAY_TRACK_ID}/tickets`,
        lastModified: new Date(),
        section: 'downtown',
      });
    }

    // If no events found from HTML parsing, the season might be over
    // or the page structure changed - that's okay
    if (results.length === 0) {
      console.error('  No upcoming events found (racing season is March-October)');
    } else {
      console.error(`  Found ${results.length} events`);
    }

  } catch (error) {
    console.error(`  Error fetching Fayetteville Speedway: ${error}`);
  }

  return results;
}

// =============================================================================
// Source 15: FSU Broncos Sports (Fayetteville State University)
// College athletics - home games at FSU campus venues
// =============================================================================

const FSU_SPORTS = [
  { slug: 'mens-basketball', name: 'Men\'s Basketball', emoji: '🏀' },
  { slug: 'womens-basketball', name: 'Women\'s Basketball', emoji: '🏀' },
  { slug: 'football', name: 'Football', emoji: '🏈' },
  { slug: 'volleyball', name: 'Volleyball', emoji: '🏐' },
  { slug: 'softball', name: 'Softball', emoji: '🥎' },
  { slug: 'track-and-field', name: 'Track & Field', emoji: '🏃' },
  { slug: 'cheerleading', name: 'Cheerleading', emoji: '📣' },
];

interface FSUJsonLdEvent {
  '@type': string;
  name: string;
  startDate: string;
  endDate?: string;
  description?: string;
  location?: {
    name?: string;
    address?: {
      streetAddress?: string;
    };
  };
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
  image?: {
    url?: string;
  };
}

async function fetchFSUSportsEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: FSU Broncos Sports...');

  const results: UnifiedEvent[] = [];
  const now = new Date();
  const seenIds = new Set<string>();

  for (const sport of FSU_SPORTS) {
    try {
      const url = `https://fsubroncos.com/sports/${sport.slug}/schedule`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FayettevilleEventsBot/1.0)',
        },
      });

      if (!response.ok) {
        console.error(`  ${sport.name}: Failed (${response.status})`);
        continue;
      }

      const html = await response.text();

      // Extract JSON-LD data
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">(\[[\s\S]*?\])<\/script>/);
      if (!jsonLdMatch) {
        console.error(`  ${sport.name}: No JSON-LD found`);
        continue;
      }

      let events: FSUJsonLdEvent[];
      try {
        events = JSON.parse(jsonLdMatch[1]);
      } catch {
        console.error(`  ${sport.name}: Invalid JSON`);
        continue;
      }

      let homeGameCount = 0;

      for (const event of events) {
        if (event['@type'] !== 'SportsEvent') continue;

        const locationName = event.location?.name || '';

        // Only include home games (location in Fayetteville)
        if (!locationName.toLowerCase().includes('fayetteville')) {
          continue;
        }

        // Parse date
        const startDate = new Date(event.startDate);
        if (isNaN(startDate.getTime())) continue;

        // Skip past events
        if (startDate < now) continue;

        // Extract opponent from event name
        // Format: "Fayetteville State University Vs/At Opponent"
        let opponent = 'TBA';
        const vsMatch = event.name?.match(/(?:Vs|At)\s+(.+)$/i);
        if (vsMatch) {
          opponent = vsMatch[1].trim();
        } else if (event.awayTeam?.name) {
          opponent = event.awayTeam.name;
        }

        // Create title
        const title = `FSU ${sport.name} vs ${opponent}`;

        // Create unique ID
        const dateStr = startDate.toISOString().split('T')[0];
        const eventId = slugify(`fsu-${sport.slug}-${opponent}-${dateStr}`);

        if (seenIds.has(eventId)) continue;
        seenIds.add(eventId);

        // Determine end time (assume 2-3 hours depending on sport)
        const durationHours = sport.slug === 'football' ? 3.5 : 2;
        const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

        // Get venue name based on sport
        const venueName = sport.slug === 'football' ? 'Luther "Nick" Jeralds Stadium' :
              sport.slug.includes('basketball') ? 'Capel Arena' :
              sport.slug === 'volleyball' ? 'Capel Arena' :
              sport.slug === 'softball' ? 'FSU Softball Field' :
              'FSU Campus';

        // Format game time for description
        const gameTime = startDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        // Create rich description
        const description = `${sport.emoji} FSU Broncos ${sport.name} takes on ${opponent} at ${venueName}. ` +
          `Game time: ${gameTime}. Support Fayetteville State University athletics - Go Broncos! 🐴`;

        // Get image URL from JSON-LD or use default FSU logo
        const imageUrl = event.image?.url || 'https://fsubroncos.com/images/logos/site/site.png';

        // Ticket URL - use sport-specific ticket page
        const ticketUrl = sport.slug.includes('basketball')
          ? 'https://fsubroncos.com/sports/2019/12/4/basketball-ticket-information.aspx?path=mbball'
          : sport.slug === 'football'
            ? 'https://fsubroncos.com/sports/2025/2/10/2025-football-season-tickets.aspx'
            : `https://fsubroncos.com/sports/${sport.slug}/schedule`;

        results.push({
          id: `fsu_${eventId}`,
          source: 'fsu_sports',
          sourceId: eventId,
          title,
          description,
          startDateTime: startDate,
          endDateTime: endDate,
          venue: {
            name: venueName,
            address: '1200 Murchison Rd',
            city: 'Fayetteville',
            state: 'NC',
            zip: '28301',
          },
          categories: ['Sports', 'FSU Sports'],
          url: `https://fsubroncos.com/sports/${sport.slug}/schedule`,
          ticketUrl,
          imageUrl,
          lastModified: new Date(),
          section: 'downtown',
        });

        homeGameCount++;
      }

      if (homeGameCount > 0) {
        console.error(`  ${sport.name}: ${homeGameCount} home games`);
      }

    } catch (error) {
      console.error(`  ${sport.name}: Error - ${error}`);
    }
  }

  console.error(`  Total: ${results.length} FSU home games`);
  return results;
}

// =============================================================================
// Main
// =============================================================================

type SourceName = 'downtown' | 'segra' | 'woodpeckers' | 'distinctly' | 'dogwood' | 'fortliberty' | 'crown' | 'faydta' | 'mlk' | 'library' | 'holidays' | 'artscouncil' | 'symphony' | 'cameo' | 'speedway' | 'fsu' | 'all';

async function syncEvents(source: SourceName = 'all', useEnhanced = false): Promise<UnifiedEvent[]> {
  const fetchers: Record<string, () => Promise<UnifiedEvent[]>> = {
    downtown: fetchDowntownEvents,
    segra: fetchSegraEvents,
    woodpeckers: fetchWoodpeckersGames,
    distinctly: fetchDistinctlyEvents,
    dogwood: fetchDogwoodEvents,
    fortliberty: () => fetchFortBraggMwrEvents(useEnhanced),
    crown: fetchCrownComplexEvents,
    faydta: fetchFayDTAEvents,
    mlk: fetchMLKEvents,
    library: fetchLibraryEvents,
    holidays: fetchFortBraggHolidays,
    artscouncil: fetchArtsCouncilEvents,
    symphony: fetchSymphonyEvents,
    cameo: fetchCameoEvents,
    speedway: fetchFayettevilleSpeedwayEvents,
    fsu: fetchFSUSportsEvents,
  };

  let allEvents: UnifiedEvent[] = [];

  if (source === 'all') {
    // Fetch all sources in parallel (Fort Bragg is slower due to scraping)
    const results = await Promise.allSettled([
      fetchDowntownEvents(),
      fetchSegraEvents(),
      fetchWoodpeckersGames(),
      fetchDistinctlyEvents(),
      fetchDogwoodEvents(),
      fetchFortBraggMwrEvents(useEnhanced),
      fetchCrownComplexEvents(),
      fetchFayDTAEvents(),
      fetchMLKEvents(),
      fetchLibraryEvents(),
      fetchFortBraggHolidays(),
      fetchArtsCouncilEvents(),
      fetchSymphonyEvents(),
      fetchCameoEvents(),
      fetchFayettevilleSpeedwayEvents(),
      fetchFSUSportsEvents(),
    ]);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allEvents = allEvents.concat(result.value);
      } else {
        console.error('  Error:', result.reason);
      }
    }
  } else if (fetchers[source]) {
    allEvents = await fetchers[source]();
  } else {
    throw new Error(`Unknown source: ${source}`);
  }

  // Filter to future events
  const now = new Date();
  const futureEvents = allEvents.filter(e => e.endDateTime > now);

  // Sort by start date
  futureEvents.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

  // Deduplicate by title + date (across sources)
  const seen = new Set<string>();
  const deduped = futureEvents.filter(e => {
    const key = `${e.title.toLowerCase()}_${e.startDateTime.toISOString().split('T')[0]}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped;
}

// =============================================================================
// D1 Database Integration (with change detection)
// =============================================================================

interface SyncStats {
  inserted: number;
  updated: number;
  unchanged: number;
  deleted: number;
  errors: number;
}

// =============================================================================
// Venue Lookup System
// =============================================================================

interface D1VenueLookup {
  id: string;
  name: string;
  aliases: string[];
}

let d1VenueList: D1VenueLookup[] = [];
let d1VenueLookupMap: Map<string, string> = new Map(); // lowercased name/alias -> venue_id

/**
 * Load venues and aliases from D1 database for location matching
 */
async function loadD1VenueCache(): Promise<void> {
  const { spawnSync } = await import('child_process');

  try {
    // Load venues
    const venueResult = spawnSync('npx', [
      'wrangler', 'd1', 'execute', 'downtown-events',
      '--remote', '--json',
      '--command=SELECT id, name FROM venues'
    ], { stdio: 'pipe', encoding: 'utf-8' });

    if (venueResult.stdout) {
      const output = JSON.parse(venueResult.stdout);
      const venues = output?.[0]?.results || [];
      d1VenueList = venues.map((v: { id: string; name: string }) => ({
        id: v.id,
        name: v.name,
        aliases: []
      }));

      // Add venue names to lookup map
      for (const venue of d1VenueList) {
        d1VenueLookupMap.set(venue.name.toLowerCase(), venue.id);
      }
    }

    // Load aliases
    const aliasResult = spawnSync('npx', [
      'wrangler', 'd1', 'execute', 'downtown-events',
      '--remote', '--json',
      '--command=SELECT venue_id, alias FROM venue_aliases'
    ], { stdio: 'pipe', encoding: 'utf-8' });

    if (aliasResult.stdout) {
      const output = JSON.parse(aliasResult.stdout);
      const aliases = output?.[0]?.results || [];
      for (const alias of aliases) {
        d1VenueLookupMap.set(alias.alias.toLowerCase(), alias.venue_id);
        // Add to venue list
        const venue = d1VenueList.find(v => v.id === alias.venue_id);
        if (venue) {
          venue.aliases.push(alias.alias);
        }
      }
    }

    console.error(`  Loaded ${d1VenueList.length} venues with ${d1VenueLookupMap.size} name variations`);
  } catch (error) {
    console.error('  Warning: Could not load venue cache');
  }
}

/**
 * Look up venue_id from a location name
 * Tries exact match, then aliases, then fuzzy matching
 */
function lookupVenueId(locationName: string | undefined): string | null {
  if (!locationName) return null;

  const normalized = locationName.toLowerCase().trim();

  // 1. Exact match (case-insensitive)
  if (d1VenueLookupMap.has(normalized)) {
    return d1VenueLookupMap.get(normalized) || null;
  }

  // 2. Check if location contains a known venue name
  for (const [key, venueId] of d1VenueLookupMap.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return venueId;
    }
  }

  // 3. Fuzzy matching for common variations
  // Remove common suffixes/prefixes
  const cleaned = normalized
    .replace(/\s+(theater|theatre|arena|stadium|center|complex|hall|park)$/i, '')
    .replace(/^the\s+/i, '')
    .trim();

  if (d1VenueLookupMap.has(cleaned)) {
    return d1VenueLookupMap.get(cleaned) || null;
  }

  // Check for partial matches with cleaned name
  for (const [key, venueId] of d1VenueLookupMap.entries()) {
    const cleanedKey = key
      .replace(/\s+(theater|theatre|arena|stadium|center|complex|hall|park)$/i, '')
      .replace(/^the\s+/i, '')
      .trim();
    if (cleaned === cleanedKey || cleaned.includes(cleanedKey) || cleanedKey.includes(cleaned)) {
      return venueId;
    }
  }

  return null;
}

/**
 * Create a simple hash of event content for change detection.
 * Uses a fast string hash (djb2) instead of crypto for portability.
 */
function hashContent(event: UnifiedEvent): string {
  const content = [
    event.title,
    event.description.slice(0, 1000),
    event.startDateTime.toISOString(),
    event.endDateTime.toISOString(),
    event.venue?.name || '',
    event.url,
    event.ticketUrl || '',
    event.imageUrl || '',
    JSON.stringify(normalizeCategories(event.categories)),
  ].join('|');

  // djb2 hash algorithm - fast and good distribution
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

async function writeToD1(events: UnifiedEvent[], dryRun = false): Promise<SyncStats> {
  const { execSync, spawnSync } = await import('child_process');
  const { writeFileSync, unlinkSync, existsSync } = await import('fs');
  const { join } = await import('path');

  const stats: SyncStats = { inserted: 0, updated: 0, unchanged: 0, deleted: 0, errors: 0 };
  const now = new Date().toISOString();

  // Step 0: Load venue cache for location enrichment
  console.error('  Loading venue cache for location matching...');
  await loadD1VenueCache();

  // Step 1: Get existing events with their hashes for comparison
  console.error('  Fetching existing events for comparison...');
  let existingEvents: Map<string, { id: string; content_hash: string | null }> = new Map();

  try {
    const result = spawnSync('npx', [
      'wrangler', 'd1', 'execute', 'downtown-events',
      '--remote', '--json',
      '--command=SELECT id, content_hash FROM events WHERE status != \'cancelled\''
    ], { stdio: 'pipe', encoding: 'utf-8' });

    if (result.stdout) {
      const output = JSON.parse(result.stdout);
      const rows = output?.[0]?.results || [];
      for (const row of rows) {
        existingEvents.set(row.id, { id: row.id, content_hash: row.content_hash });
      }
    }
    console.error(`  Found ${existingEvents.size} existing events`);
  } catch (error) {
    console.error('  Warning: Could not fetch existing events, will upsert all');
  }

  // Step 2: Build SQL statements with change detection
  const statements: string[] = [];
  const seenIds = new Set<string>();

  for (const event of events) {
    const contentHash = hashContent(event);
    const existing = existingEvents.get(event.id);
    seenIds.add(event.id);

    // Skip if hash matches (no changes)
    if (existing && existing.content_hash === contentHash) {
      stats.unchanged++;
      // Still update last_seen_at
      statements.push(`UPDATE events SET last_seen_at = '${now}' WHERE id = '${escapeSQL(event.id)}';`);
      continue;
    }

    if (existing) {
      stats.updated++;
    } else {
      stats.inserted++;
    }

    // Look up venue_id from location name
    const venueId = lookupVenueId(event.venue?.name);

    const sql = `INSERT INTO events (
      id, source_id, external_id, title, description,
      start_datetime, end_datetime, venue_id, location_name,
      url, ticket_url, image_url, categories, tags,
      status, section, raw_data, last_modified, updated_at,
      content_hash, last_seen_at
    ) VALUES (
      '${escapeSQL(event.id)}',
      '${escapeSQL(mapSourceId(event.source))}',
      '${escapeSQL(event.sourceId)}',
      '${escapeSQL(event.title)}',
      '${escapeSQL(event.description.slice(0, 5000))}',
      '${event.startDateTime.toISOString()}',
      '${event.endDateTime.toISOString()}',
      ${venueId ? `'${escapeSQL(venueId)}'` : 'NULL'},
      '${escapeSQL(event.venue?.name || '')}',
      '${escapeSQL(event.url)}',
      ${event.ticketUrl ? `'${escapeSQL(event.ticketUrl)}'` : 'NULL'},
      ${event.imageUrl ? `'${escapeSQL(event.imageUrl)}'` : 'NULL'},
      '${escapeSQL(JSON.stringify(normalizeCategories(event.categories)))}',
      '[]',
      'confirmed',
      '${event.section}',
      NULL,
      '${event.lastModified.toISOString()}',
      '${now}',
      '${contentHash}',
      '${now}'
    )
    ON CONFLICT(source_id, external_id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      start_datetime = excluded.start_datetime,
      end_datetime = excluded.end_datetime,
      venue_id = excluded.venue_id,
      location_name = excluded.location_name,
      url = excluded.url,
      ticket_url = excluded.ticket_url,
      image_url = excluded.image_url,
      categories = excluded.categories,
      section = excluded.section,
      last_modified = excluded.last_modified,
      updated_at = excluded.updated_at,
      content_hash = excluded.content_hash,
      last_seen_at = excluded.last_seen_at;`;

    statements.push(sql.replace(/\n\s+/g, ' '));
  }

  console.error(`  Changes: ${stats.inserted} new, ${stats.updated} updated, ${stats.unchanged} unchanged`);

  if (dryRun) {
    console.error('  DRY RUN: No changes written to database');
    return stats;
  }

  // Step 3: Execute SQL in batches (file import has auth issues, use individual commands)
  if (statements.length > 0) {
    console.error(`  Executing ${statements.length} SQL statements...`);

    // Execute statements one at a time (batching causes command length issues)
    const BATCH_SIZE = 1;
    let executed = 0;

    for (let i = 0; i < statements.length; i += BATCH_SIZE) {
      const batch = statements.slice(i, i + BATCH_SIZE);
      const batchSql = batch.join(' ');

      try {
        const result = spawnSync('npx', [
          'wrangler', 'd1', 'execute', 'downtown-events',
          '--remote', `--command=${batchSql}`
        ], { stdio: 'pipe', encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

        if (result.status !== 0 && result.stderr) {
          console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${result.stderr.slice(0, 200)}`);
          stats.errors++;
        } else {
          executed += batch.length;
        }
      } catch (error) {
        console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} exception:`, error);
        stats.errors++;
      }
    }

    console.error(`  Executed ${executed}/${statements.length} statements`);
  }

  return stats;
}

/**
 * Clean up past events that ended more than 24 hours ago.
 * Soft deletes by setting status to 'past' instead of hard delete.
 */
async function cleanupPastEvents(dryRun = false): Promise<number> {
  const { spawnSync } = await import('child_process');

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  console.error(`\nCleaning up events that ended before ${cutoff}...`);

  // First count how many would be affected
  try {
    const countResult = spawnSync('npx', [
      'wrangler', 'd1', 'execute', 'downtown-events',
      '--remote', '--json',
      `--command=SELECT COUNT(*) as count FROM events WHERE end_datetime < '${cutoff}' AND status = 'confirmed'`
    ], { stdio: 'pipe', encoding: 'utf-8' });

    if (countResult.stdout) {
      const output = JSON.parse(countResult.stdout);
      const count = output?.[0]?.results?.[0]?.count || 0;
      console.error(`  Found ${count} past events to archive`);

      if (count === 0) return 0;

      if (dryRun) {
        console.error('  DRY RUN: Would archive these events');
        return count;
      }

      // Archive past events (soft delete)
      const updateResult = spawnSync('npx', [
        'wrangler', 'd1', 'execute', 'downtown-events',
        '--remote',
        `--command=UPDATE events SET status = 'past' WHERE end_datetime < '${cutoff}' AND status = 'confirmed'`
      ], { stdio: 'pipe', encoding: 'utf-8' });

      if (updateResult.status !== 0) {
        console.error(`  Error archiving past events: ${updateResult.stderr}`);
        return 0;
      }

      console.error(`  Archived ${count} past events`);
      return count;
    }
  } catch (error) {
    console.error('  Error during cleanup:', error);
  }

  return 0;
}

/**
 * Soft delete events that haven't been seen in the last N hours.
 * This handles events that were removed from the source.
 */
async function cleanupMissingEvents(hoursThreshold = 48, dryRun = false): Promise<number> {
  const { spawnSync } = await import('child_process');

  const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString();
  console.error(`\nChecking for events not seen since ${cutoff}...`);

  try {
    // Count events not seen recently (exclude manual entries and already cancelled)
    const countResult = spawnSync('npx', [
      'wrangler', 'd1', 'execute', 'downtown-events',
      '--remote', '--json',
      `--command=SELECT COUNT(*) as count FROM events WHERE last_seen_at < '${cutoff}' AND status = 'confirmed' AND source_id != 'manual' AND end_datetime > datetime('now')`
    ], { stdio: 'pipe', encoding: 'utf-8' });

    if (countResult.stdout) {
      const output = JSON.parse(countResult.stdout);
      const count = output?.[0]?.results?.[0]?.count || 0;
      console.error(`  Found ${count} events not seen in ${hoursThreshold}h (possibly removed from source)`);

      if (count === 0) return 0;

      if (dryRun) {
        // Show which events would be affected
        const listResult = spawnSync('npx', [
          'wrangler', 'd1', 'execute', 'downtown-events',
          '--remote', '--json',
          `--command=SELECT id, title, source_id, last_seen_at FROM events WHERE last_seen_at < '${cutoff}' AND status = 'confirmed' AND source_id != 'manual' AND end_datetime > datetime('now') LIMIT 10`
        ], { stdio: 'pipe', encoding: 'utf-8' });

        if (listResult.stdout) {
          const listOutput = JSON.parse(listResult.stdout);
          const rows = listOutput?.[0]?.results || [];
          console.error('  DRY RUN: Would mark as cancelled:');
          for (const row of rows) {
            console.error(`    - ${row.title} (${row.source_id}, last seen: ${row.last_seen_at})`);
          }
          if (count > 10) console.error(`    ... and ${count - 10} more`);
        }
        return count;
      }

      // Soft delete (mark as cancelled)
      const updateResult = spawnSync('npx', [
        'wrangler', 'd1', 'execute', 'downtown-events',
        '--remote',
        `--command=UPDATE events SET status = 'cancelled' WHERE last_seen_at < '${cutoff}' AND status = 'confirmed' AND source_id != 'manual' AND end_datetime > datetime('now')`
      ], { stdio: 'pipe', encoding: 'utf-8' });

      if (updateResult.status !== 0) {
        console.error(`  Error marking events as cancelled: ${updateResult.stderr}`);
        return 0;
      }

      console.error(`  Marked ${count} events as cancelled`);
      return count;
    }
  } catch (error) {
    console.error('  Error during missing event cleanup:', error);
  }

  return 0;
}

function escapeSQL(str: string): string {
  if (!str) return '';
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

function mapSourceId(source: string): string {
  const mapping: Record<string, string> = {
    'visit_downtown_fayetteville': 'visit_downtown',
    'segra_stadium': 'segra_stadium',
    'woodpeckers': 'woodpeckers',
    'distinctly_fayetteville': 'distinctly_fayetteville',
    'dogwood_festival': 'dogwood_festival',
    'fort_liberty_mwr': 'fort_liberty_mwr',
    'crown_complex': 'crown_complex',
    'faydta': 'faydta',
    'mlk_committee': 'mlk_committee',
    'library_hq': 'library_hq',
    'fort_liberty_holidays': 'fort_liberty_holidays',
    'arts_council': 'arts_council',
    'fayetteville_symphony': 'fayetteville_symphony',
    'cameo_art_house': 'cameo_art_house',
    'fayetteville_speedway': 'fayetteville_speedway',
    'fsu_sports': 'fsu_sports',
  };
  return mapping[source] || source;
}

async function updateSourceLastSync(sourceId: string, count: number, status: 'success' | 'error'): Promise<void> {
  const { execSync } = await import('child_process');

  const sql = `
    UPDATE sources SET
      last_sync = '${new Date().toISOString()}',
      last_sync_status = '${status}',
      last_sync_count = ${count}
    WHERE id = '${sourceId}';
  `.replace(/\n\s+/g, ' ').trim();

  try {
    execSync(
      `npx wrangler d1 execute downtown-events --remote --command="${sql}"`,
      { stdio: 'pipe' }
    );
  } catch (error) {
    console.error(`  Failed to update source ${sourceId}:`, error);
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const writeDb = args.includes('--db');
  const useEnhanced = args.includes('--enhanced');
  const dryRun = args.includes('--dry-run');
  const runCleanup = args.includes('--cleanup');
  const skipFetch = args.includes('--cleanup-only'); // Only run cleanup, no fetch

  // Parse --source=xxx
  const sourceArg = args.find(a => a.startsWith('--source='));
  const source = (sourceArg?.split('=')[1] as SourceName) || 'all';

  if (useEnhanced) {
    console.error('Enhanced mode: Using ResearchTools API for additional metadata');
  }

  if (dryRun) {
    console.error('DRY RUN MODE: No changes will be written to database');
  }

  try {
    let events: UnifiedEvent[] = [];

    // Fetch events unless --cleanup-only
    if (!skipFetch) {
      events = await syncEvents(source, useEnhanced);
    }

    // Write to D1 if --db flag is set
    if (writeDb && events.length > 0) {
      console.error('\nWriting to D1 database...');
      const result = await writeToD1(events, dryRun);

      console.error(`\nSync Summary:`);
      console.error(`  - Inserted: ${result.inserted}`);
      console.error(`  - Updated:  ${result.updated}`);
      console.error(`  - Unchanged: ${result.unchanged}`);
      if (result.errors > 0) {
        console.error(`  - Errors: ${result.errors}`);
      }

      // Update source last_sync timestamps (unless dry run)
      if (!dryRun) {
        const sourceIds = [...new Set(events.map(e => mapSourceId(e.source)))];
        for (const sourceId of sourceIds) {
          const count = events.filter(e => mapSourceId(e.source) === sourceId).length;
          await updateSourceLastSync(sourceId, count, 'success');
        }
        console.error('  Source sync timestamps updated');
      }
    }

    // Run cleanup if --cleanup or --cleanup-only flag is set
    if (runCleanup || skipFetch) {
      console.error('\n--- Running Cleanup ---');

      // Clean up past events
      const pastCount = await cleanupPastEvents(dryRun);

      // Clean up events not seen in 48 hours (potentially removed from source)
      const missingCount = await cleanupMissingEvents(48, dryRun);

      console.error(`\nCleanup Summary:`);
      console.error(`  - Past events archived: ${pastCount}`);
      console.error(`  - Missing events cancelled: ${missingCount}`);
    }

    if (jsonOutput) {
      console.log(JSON.stringify(events, null, 2));
    } else {
      console.log('\n' + '='.repeat(60));
      console.log('FAYETTEVILLE CENTRAL CALENDAR - UPCOMING EVENTS');
      console.log('='.repeat(60));

      // Group by section first, then by source
      const bySection = new Map<EventSection, UnifiedEvent[]>();
      for (const event of events) {
        const existing = bySection.get(event.section) || [];
        existing.push(event);
        bySection.set(event.section, existing);
      }

      const sectionNames: Record<EventSection, string> = {
        downtown: '🏙️  DOWNTOWN FAYETTEVILLE',
        fort_bragg: '🎖️  FORT LIBERTY (BRAGG)',
      };

      const sourceNames: Record<string, string> = {
        visit_downtown_fayetteville: 'Visit Downtown',
        segra_stadium: 'Segra Stadium',
        woodpeckers: 'Woodpeckers',
        distinctly_fayetteville: 'CVB',
        dogwood_festival: 'Dogwood Festival',
        fort_liberty_mwr: 'MWR',
        crown_complex: 'Crown Complex',
        faydta: 'Downtown Alliance',
        mlk_committee: 'MLK Committee',
        library_hq: 'Headquarters Library',
        fort_liberty_holidays: 'Training Holidays',
        arts_council: 'Arts Council',
        fayetteville_symphony: 'Symphony',
        cameo_art_house: 'Cameo Art House',
        fayetteville_speedway: 'Motor Speedway',
        fsu_sports: 'FSU Broncos',
      };

      for (const [section, sectionEvents] of bySection) {
        console.log('\n' + sectionNames[section]);
        console.log('='.repeat(40));

        // Group by source within section
        const bySource = new Map<string, UnifiedEvent[]>();
        for (const event of sectionEvents) {
          const existing = bySource.get(event.source) || [];
          existing.push(event);
          bySource.set(event.source, existing);
        }

        for (const [sourceName, sourceEvents] of bySource) {
          console.log(`\n  ${sourceNames[sourceName] || sourceName}:`);

          for (const event of sourceEvents.slice(0, 8)) {
            const start = event.startDateTime;
            const dateStr = start.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            console.log(`    ${dateStr}: ${event.title}`);
            if (event.venue?.name && event.venue.name !== 'Fayetteville' && event.venue.name !== 'Fort Bragg') {
              console.log(`              📍 ${event.venue.name}`);
            }
          }

          if (sourceEvents.length > 8) {
            console.log(`    ... and ${sourceEvents.length - 8} more`);
          }
        }
      }

      // Summary
      const downtownCount = bySection.get('downtown')?.length || 0;
      const fortBraggCount = bySection.get('fort_bragg')?.length || 0;

      console.log('\n' + '='.repeat(60));
      console.log('SUMMARY');
      console.log('-'.repeat(60));
      console.log(`  Downtown Fayetteville: ${downtownCount} events`);
      console.log(`  Fort Bragg:            ${fortBraggCount} events`);
      console.log(`  Total:                 ${events.length} events`);
      console.log('='.repeat(60) + '\n');
    }
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
