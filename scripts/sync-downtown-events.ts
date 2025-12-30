/**
 * Visit Downtown Fayetteville Events Sync Script
 *
 * Fetches events from https://visitdowntownfayetteville.com/events/
 * and outputs them in a normalized format for the central calendar.
 *
 * Usage:
 *   npx tsx scripts/sync-downtown-events.ts
 *   npx tsx scripts/sync-downtown-events.ts --json > events.json
 *   npx tsx scripts/sync-downtown-events.ts --future-only
 */

const BASE_URL = 'https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36';

// Types
interface RawEvent {
  EVT_ID: number;
  EVT_name: string;
  EVT_slug: string;
  EVT_desc: { raw: string; rendered: string };
  EVT_short_desc: string;
  status: { raw: string; pretty: string };
  EVT_created_gmt: string;
  EVT_modified_gmt: string;
  link: string;
  _links: Record<string, Array<{ href: string }>>;
}

interface RawDatetime {
  DTT_ID: number;
  EVT_ID: number;
  DTT_EVT_start: string;
  DTT_EVT_end: string;
  DTT_EVT_start_gmt: string;
  DTT_EVT_end_gmt: string;
  DTT_name: string;
  DTT_deleted: boolean;
  DTT_sold: number;
  DTT_reg_limit: number | null;
}

interface RawVenue {
  VNU_ID: number;
  VNU_name: string;
  VNU_address: string;
  VNU_address2: string;
  VNU_city: string;
  VNU_zip: string;
  VNU_phone: string;
  VNU_google_map_link: string;
}

interface NormalizedEvent {
  id: string;
  source: 'visit_downtown_fayetteville';
  sourceEventId: number;
  sourceDatetimeId: number;
  title: string;
  description: string;
  descriptionHtml: string;
  startDateTime: string;
  endDateTime: string;
  startDateTimeLocal: string;
  endDateTimeLocal: string;
  venue: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    googleMapsUrl: string;
  } | null;
  url: string;
  ticketsSold: number;
  ticketLimit: number | null;
  lastModified: string;
}

// Fetch with retry logic
async function fetchJson<T>(url: string, retries = 3): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'FayettevilleCentralCalendar/1.0',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt}/${retries} failed: ${lastError.message}`);

      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.error(`Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

// Strip HTML tags for plain text description
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

// Main sync function
async function syncDowntownEvents(options: {
  futureOnly?: boolean;
  verbose?: boolean;
}): Promise<NormalizedEvent[]> {
  const { futureOnly = false, verbose = false } = options;

  if (verbose) console.error('Fetching events from Visit Downtown Fayetteville...');

  // Fetch all data in parallel with proper pagination
  // Use limit=200 and order by most recent to get current events
  const [events, datetimes, venues] = await Promise.all([
    fetchJson<RawEvent[]>(`${BASE_URL}/events?limit=200&order_by=EVT_modified&order=DESC`),
    fetchJson<RawDatetime[]>(`${BASE_URL}/datetimes?limit=200&order_by=DTT_EVT_start&order=DESC`),
    fetchJson<RawVenue[]>(`${BASE_URL}/venues?limit=50`),
  ]);

  if (verbose) {
    console.error(`Fetched: ${events.length} events, ${datetimes.length} datetimes, ${venues.length} venues`);
  }

  // Build lookup maps
  const venueMap = new Map<number, RawVenue>();
  for (const venue of venues) {
    venueMap.set(venue.VNU_ID, venue);
  }

  const datetimesByEvent = new Map<number, RawDatetime[]>();
  for (const dt of datetimes) {
    if (dt.DTT_deleted) continue;
    const existing = datetimesByEvent.get(dt.EVT_ID) || [];
    existing.push(dt);
    datetimesByEvent.set(dt.EVT_ID, existing);
  }

  // Build event-to-venue mapping (requires parsing _links)
  const eventVenueMap = new Map<number, RawVenue>();

  // Normalize events
  const normalizedEvents: NormalizedEvent[] = [];
  const now = new Date();

  for (const event of events) {
    // Skip unpublished events
    if (event.status.raw !== 'publish') continue;

    const eventDatetimes = datetimesByEvent.get(event.EVT_ID) || [];

    if (eventDatetimes.length === 0) {
      if (verbose) console.error(`Warning: Event ${event.EVT_ID} has no datetimes`);
      continue;
    }

    // Try to get venue from _links
    let venue: NormalizedEvent['venue'] = null;
    const venueHref = event._links?.['https://api.eventespresso.com/venues']?.[0]?.href;

    if (venueHref) {
      try {
        const venueData = await fetchJson<RawVenue[]>(venueHref);
        if (venueData.length > 0) {
          const v = venueData[0];
          venue = {
            name: v.VNU_name || '',
            address: [v.VNU_address, v.VNU_address2].filter(Boolean).join(', '),
            city: v.VNU_city || 'Fayetteville',
            state: 'NC',
            zip: v.VNU_zip || '',
            phone: v.VNU_phone || '',
            googleMapsUrl: v.VNU_google_map_link || '',
          };
        }
      } catch {
        if (verbose) console.error(`Warning: Could not fetch venue for event ${event.EVT_ID}`);
      }
    }

    // Create normalized event for each datetime
    for (const dt of eventDatetimes) {
      const endDate = new Date(dt.DTT_EVT_end_gmt);

      // Skip past events if futureOnly
      if (futureOnly && endDate < now) continue;

      normalizedEvents.push({
        id: `vdf_${event.EVT_ID}_${dt.DTT_ID}`,
        source: 'visit_downtown_fayetteville',
        sourceEventId: event.EVT_ID,
        sourceDatetimeId: dt.DTT_ID,
        title: event.EVT_name,
        description: stripHtml(event.EVT_desc?.rendered || event.EVT_short_desc || ''),
        descriptionHtml: event.EVT_desc?.rendered || '',
        startDateTime: dt.DTT_EVT_start_gmt,
        endDateTime: dt.DTT_EVT_end_gmt,
        startDateTimeLocal: dt.DTT_EVT_start,
        endDateTimeLocal: dt.DTT_EVT_end,
        venue,
        url: event.link,
        ticketsSold: dt.DTT_sold,
        ticketLimit: dt.DTT_reg_limit,
        lastModified: event.EVT_modified_gmt,
      });
    }
  }

  // Sort by start date
  normalizedEvents.sort(
    (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
  );

  if (verbose) {
    console.error(`Normalized ${normalizedEvents.length} event instances`);
  }

  return normalizedEvents;
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const futureOnly = args.includes('--future-only');
  const verbose = !jsonOutput;

  try {
    const events = await syncDowntownEvents({ futureOnly, verbose });

    if (jsonOutput) {
      console.log(JSON.stringify(events, null, 2));
    } else {
      console.log('\n=== Visit Downtown Fayetteville Events ===\n');

      for (const event of events) {
        const start = new Date(event.startDateTimeLocal);
        const end = new Date(event.endDateTimeLocal);

        console.log(`📅 ${event.title}`);
        console.log(`   Date: ${start.toLocaleDateString()} ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`);

        if (event.venue) {
          console.log(`   Venue: ${event.venue.name}`);
          if (event.venue.address) {
            console.log(`   Address: ${event.venue.address}, ${event.venue.city}, ${event.venue.state} ${event.venue.zip}`);
          }
        }

        console.log(`   URL: ${event.url}`);

        if (event.ticketsSold > 0) {
          console.log(`   Tickets Sold: ${event.ticketsSold}${event.ticketLimit ? `/${event.ticketLimit}` : ''}`);
        }

        console.log('');
      }

      console.log(`Total: ${events.length} events`);
    }
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
