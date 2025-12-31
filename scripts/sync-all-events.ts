/**
 * Fayetteville Central Calendar - Multi-Source Event Sync
 *
 * Fetches events from multiple sources:
 * 1. Visit Downtown Fayetteville (Event Espresso API)
 * 2. Segra Stadium (Squarespace JSON)
 * 3. Distinctly Fayetteville (RSS Feed)
 * 4. Dogwood Festival (Web Scraping)
 * 5. Fort Liberty MWR (Web Scraping)
 * 6. Crown Complex (Web Scraping)
 * 7. Downtown Alliance / FayDTA (MEC API + Signature Events)
 * 8. MLK Committee (Signature Annual Events)
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
// Source 3: Distinctly Fayetteville (RSS)
// =============================================================================

const DISTINCTLY_RSS = 'https://www.distinctlyfayettevillenc.com/event/rss/';

async function fetchDistinctlyEvents(): Promise<UnifiedEvent[]> {
  console.error('Fetching: Distinctly Fayetteville...');

  const response = await fetch(DISTINCTLY_RSS);
  const xml = await response.text();

  const results: UnifiedEvent[] = [];

  // Simple XML parsing without dependencies
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const item of items) {
    const title = extractXmlTag(item, 'title');
    const link = extractXmlTag(item, 'link');
    const guid = extractXmlTag(item, 'guid');
    const pubDate = extractXmlTag(item, 'pubDate');
    const description = extractXmlTag(item, 'description');
    const lat = extractXmlTag(item, 'geo:lat');
    const lon = extractXmlTag(item, 'geo:long');

    // Extract categories
    const categoryMatches = item.match(/<category>([^<]+)<\/category>/g) || [];
    const categories = categoryMatches.map(c =>
      c.replace(/<\/?category>/g, '').replace(/&amp;/g, '&')
    );

    // Parse dates from description - format: "MM/DD/YYYY to ... MM/DD/YYYY"
    // or just single dates scattered in the text
    const dateMatches = description?.match(/(\d{2})\/(\d{2})\/(\d{4})/g) || [];

    let startDate = new Date();
    let endDate = new Date();

    if (dateMatches.length >= 2) {
      // First date is start, last date is end
      const [sm, sd, sy] = dateMatches[0].split('/');
      const [em, ed, ey] = dateMatches[dateMatches.length - 1].split('/');
      startDate = new Date(parseInt(sy), parseInt(sm) - 1, parseInt(sd));
      endDate = new Date(parseInt(ey), parseInt(em) - 1, parseInt(ed));
    } else if (dateMatches.length === 1) {
      const [m, d, y] = dateMatches[0].split('/');
      startDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      endDate = startDate;
    }

    // Extract image
    const imgMatch = description?.match(/<img[^>]+src="([^"]+)"/);
    const imageUrl = imgMatch?.[1];

    // Extract ID from URL
    const idMatch = link?.match(/\/(\d+)\/?$/);
    const sourceId = idMatch?.[1] || guid || String(Date.now());

    const cleanTitle = decodeHtmlEntities(title || '');
    results.push({
      id: `distinctly_${sourceId}`,
      source: 'distinctly_fayetteville',
      sourceId,
      title: cleanTitle,
      description: cleanDescription(description || '', cleanTitle),
      startDateTime: startDate,
      endDateTime: endDate,
      venue: lat && lon ? {
        name: 'Fayetteville',
        city: 'Fayetteville',
        state: 'NC',
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
      } : null,
      categories,
      url: link || '',
      imageUrl,
      lastModified: pubDate ? new Date(pubDate) : new Date(),
      section: 'downtown',
    });
  }

  console.error(`  Found ${results.length} events`);
  return results;
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
// Source 5: Fort Liberty MWR (Scraping) - FORT BRAGG SECTION
// =============================================================================

const FORT_LIBERTY_URL = 'https://bragg.armymwr.com/calendar';

async function fetchFortLibertyEvents(useEnhanced = false): Promise<UnifiedEvent[]> {
  console.error('Fetching: Fort Liberty MWR...');

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
      const url = `${FORT_LIBERTY_URL}?date=${encodeURIComponent(dateParam)}&mode=agenda`;
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

        // Convert slug to title as default
        let title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        // Try to find better title from link text (not image alt)
        const linkTextMatch = context.match(/>([A-Z][^<]{4,60})<\/a>/);
        if (linkTextMatch && !linkTextMatch[1].includes('.png') && !linkTextMatch[1].includes('.jpg')) {
          title = linkTextMatch[1].trim();
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
        let description = '';
        let imageUrl: string | undefined;

        // Use ResearchTools API to fetch event images
        // Note: MWR site doesn't have good meta descriptions, so we only extract images
        if (useEnhanced) {
          console.error(`    Fetching image for: ${title.slice(0, 40)}...`);
          const scraped = await fetchWithResearchTools(eventUrl);
          if (scraped) {
            // Only use the og:image - descriptions on MWR site contain menu/sidebar content
            imageUrl = scraped.metadata?.og_image;
          }
          // Rate limit for API calls
          await new Promise(r => setTimeout(r, 300));
        }

        results.push({
          id: uniqueId,
          source: 'fort_liberty_mwr',
          sourceId: `${eventId}_${occurrenceId}`,
          title,
          description,
          startDateTime: eventDate,
          endDateTime: new Date(eventDate.getTime() + 2 * 60 * 60 * 1000), // Default 2hr duration
          venue: venueMatch ? {
            name: venueMatch[1].trim(),
            city: 'Fort Liberty',
            state: 'NC',
          } : {
            name: 'Fort Liberty',
            city: 'Fort Liberty',
            state: 'NC',
          },
          categories: ['Military', 'MWR'],
          url: eventUrl,
          imageUrl,
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
// Main
// =============================================================================

type SourceName = 'downtown' | 'segra' | 'distinctly' | 'dogwood' | 'fortliberty' | 'crown' | 'faydta' | 'mlk' | 'all';

async function syncEvents(source: SourceName = 'all', useEnhanced = false): Promise<UnifiedEvent[]> {
  const fetchers: Record<string, () => Promise<UnifiedEvent[]>> = {
    downtown: fetchDowntownEvents,
    segra: fetchSegraEvents,
    distinctly: fetchDistinctlyEvents,
    dogwood: fetchDogwoodEvents,
    fortliberty: () => fetchFortLibertyEvents(useEnhanced),
    crown: fetchCrownComplexEvents,
    faydta: fetchFayDTAEvents,
    mlk: fetchMLKEvents,
  };

  let allEvents: UnifiedEvent[] = [];

  if (source === 'all') {
    // Fetch all sources in parallel (Fort Liberty is slower due to scraping)
    const results = await Promise.allSettled([
      fetchDowntownEvents(),
      fetchSegraEvents(),
      fetchDistinctlyEvents(),
      fetchDogwoodEvents(),
      fetchFortLibertyEvents(useEnhanced),
      fetchCrownComplexEvents(),
      fetchFayDTAEvents(),
      fetchMLKEvents(),
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
    JSON.stringify(event.categories),
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
      NULL,
      '${escapeSQL(event.venue?.name || '')}',
      '${escapeSQL(event.url)}',
      ${event.ticketUrl ? `'${escapeSQL(event.ticketUrl)}'` : 'NULL'},
      ${event.imageUrl ? `'${escapeSQL(event.imageUrl)}'` : 'NULL'},
      '${escapeSQL(JSON.stringify(event.categories))}',
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
    'distinctly_fayetteville': 'distinctly_fayetteville',
    'dogwood_festival': 'dogwood_festival',
    'fort_liberty_mwr': 'fort_liberty_mwr',
    'crown_complex': 'crown_complex',
    'faydta': 'faydta',
    'mlk_committee': 'mlk_committee',
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
        distinctly_fayetteville: 'CVB',
        dogwood_festival: 'Dogwood Festival',
        fort_liberty_mwr: 'MWR',
        crown_complex: 'Crown Complex',
        faydta: 'Downtown Alliance',
        mlk_committee: 'MLK Committee',
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
            if (event.venue?.name && event.venue.name !== 'Fayetteville' && event.venue.name !== 'Fort Liberty') {
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
      console.log(`  Fort Liberty (Bragg):  ${fortBraggCount} events`);
      console.log(`  Total:                 ${events.length} events`);
      console.log('='.repeat(60) + '\n');
    }
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
