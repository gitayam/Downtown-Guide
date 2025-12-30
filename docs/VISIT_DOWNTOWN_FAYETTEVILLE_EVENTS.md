# Visit Downtown Fayetteville Events Integration

## Overview

**Source URL:** https://visitdowntownfayetteville.com/events/
**Platform:** WordPress with Event Espresso v4.8.36
**API Type:** REST API (JSON)
**Authentication:** None required (public endpoints)

This document describes how to import events from the Visit Downtown Fayetteville (Cool Spring Downtown District) website into a central Fayetteville calendar system.

---

## API Endpoints

### Base URL
```
https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36/
```

### Primary Endpoints

| Endpoint | Description | Method |
|----------|-------------|--------|
| `/events` | All events | GET |
| `/datetimes` | Event date/time instances | GET |
| `/venues` | Event venues/locations | GET |
| `/events/{id}` | Single event details | GET |
| `/venues/{id}/events` | Events at a specific venue | GET |

---

## Data Schemas

### Event Object

```typescript
interface EventEspressoEvent {
  // Identification
  EVT_ID: number;
  EVT_name: string;
  EVT_slug: string;
  link: string;  // Full URL to event page

  // Content
  EVT_desc: {
    raw: string;
    rendered: string;  // HTML formatted
  };
  EVT_short_desc: string;

  // Status
  status: {
    raw: string;      // "publish", "draft", etc.
    pretty: string;   // "Published", "Draft", etc.
  };

  // Timestamps (ISO 8601)
  EVT_created: string;
  EVT_created_gmt: string;
  EVT_modified: string;
  EVT_modified_gmt: string;
  EVT_visible_on: string;
  EVT_visible_on_gmt: string;

  // Configuration
  EVT_display_desc: boolean;
  EVT_display_ticket_selector: boolean;
  EVT_member_only: boolean;
  EVT_allow_overflow: boolean;
  EVT_donations: boolean;
  EVT_phone: string;
  EVT_external_URL: string;
  EVT_order: number;
  EVT_wp_user: number;
  parent: number;

  // Registration
  EVT_default_registration_status: {
    raw: string;    // "RPP", "RAP", etc.
    pretty: string; // "PENDING_PAYMENT", "APPROVED", etc.
  };
  EVT_additional_limit: number;
  EVT_timezone_string: string;

  // Related Resources (hypermedia links)
  _links: {
    self: Array<{ href: string }>;
    collection: Array<{ href: string }>;
    "https://api.eventespresso.com/registrations": Array<{ href: string }>;
    "https://api.eventespresso.com/datetimes": Array<{ href: string }>;
    "https://api.eventespresso.com/venues": Array<{ href: string }>;
    // ... more relations
  };
}
```

### Datetime Object

```typescript
interface EventEspressoDatetime {
  DTT_ID: number;
  EVT_ID: number;  // Links to parent event

  // Date/Time (ISO 8601)
  DTT_EVT_start: string;      // Local time
  DTT_EVT_end: string;        // Local time
  DTT_EVT_start_gmt: string;  // UTC
  DTT_EVT_end_gmt: string;    // UTC

  // Capacity
  DTT_reg_limit: number | null;  // null = unlimited
  DTT_sold: number;
  DTT_reserved: number;

  // Display
  DTT_name: string;
  DTT_description: string;
  DTT_order: number;
  DTT_is_primary: boolean;
  DTT_deleted: boolean;

  _links: {
    self: Array<{ href: string }>;
    "https://api.eventespresso.com/event": Array<{ href: string }>;
    "https://api.eventespresso.com/tickets": Array<{ href: string }>;
  };
}
```

### Venue Object

```typescript
interface EventEspressoVenue {
  VNU_ID: number;
  VNU_name: string;
  VNU_identifier: string;

  // Address
  VNU_address: string;
  VNU_address2: string;
  VNU_city: string;
  VNU_zip: string;
  STA_ID: number;      // State ID
  CNT_ISO: string;     // Country code (US)

  // Contact
  VNU_phone: string;
  VNU_url: string;
  VNU_virtual_phone: string;
  VNU_virtual_url: string;

  // Capacity & Mapping
  VNU_capacity: number | null;
  VNU_google_map_link: string;
  VNU_enable_for_gmap: boolean;

  // Description
  VNU_desc: {
    raw: string;
    rendered: string;
  };

  _links: {
    "https://api.eventespresso.com/events": Array<{ href: string }>;
  };
}
```

---

## Import Strategy

### Option 1: Scheduled Polling (Recommended)

Poll the API at regular intervals to fetch new/updated events.

```typescript
// poll-events.ts
interface FayettevilleEvent {
  id: string;
  source: 'visit_downtown_fayetteville';
  sourceId: number;
  title: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  venue: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    googleMapsUrl?: string;
  } | null;
  url: string;
  lastModified: Date;
}

async function fetchDowntownEvents(): Promise<FayettevilleEvent[]> {
  const baseUrl = 'https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36';

  // Fetch events
  const eventsRes = await fetch(`${baseUrl}/events`);
  const events = await eventsRes.json();

  // Fetch datetimes
  const datetimesRes = await fetch(`${baseUrl}/datetimes`);
  const datetimes = await datetimesRes.json();

  // Fetch venues
  const venuesRes = await fetch(`${baseUrl}/venues`);
  const venues = await venuesRes.json();

  // Create lookup maps
  const venueMap = new Map(venues.map((v: any) => [v.VNU_ID, v]));
  const datetimesByEvent = new Map<number, any[]>();

  for (const dt of datetimes) {
    const existing = datetimesByEvent.get(dt.EVT_ID) || [];
    existing.push(dt);
    datetimesByEvent.set(dt.EVT_ID, existing);
  }

  // Transform to unified format
  const transformedEvents: FayettevilleEvent[] = [];

  for (const event of events) {
    if (event.status.raw !== 'publish') continue;

    const eventDatetimes = datetimesByEvent.get(event.EVT_ID) || [];

    // Get venue from event's _links (requires additional fetch)
    let venue = null;
    const venueLink = event._links?.['https://api.eventespresso.com/venues']?.[0]?.href;
    if (venueLink) {
      try {
        const venueRes = await fetch(venueLink);
        const venueData = await venueRes.json();
        if (venueData.length > 0) {
          const v = venueData[0];
          venue = {
            name: v.VNU_name,
            address: v.VNU_address,
            city: v.VNU_city || 'Fayetteville',
            state: 'NC',
            zip: v.VNU_zip,
            googleMapsUrl: v.VNU_google_map_link || undefined,
          };
        }
      } catch (e) {
        console.warn(`Failed to fetch venue for event ${event.EVT_ID}`);
      }
    }

    // Create event entries for each datetime
    for (const dt of eventDatetimes) {
      if (dt.DTT_deleted) continue;

      transformedEvents.push({
        id: `vdf_${event.EVT_ID}_${dt.DTT_ID}`,
        source: 'visit_downtown_fayetteville',
        sourceId: event.EVT_ID,
        title: event.EVT_name,
        description: event.EVT_desc?.rendered || event.EVT_short_desc || '',
        startDateTime: new Date(dt.DTT_EVT_start_gmt),
        endDateTime: new Date(dt.DTT_EVT_end_gmt),
        venue,
        url: event.link,
        lastModified: new Date(event.EVT_modified_gmt),
      });
    }
  }

  return transformedEvents;
}
```

### Option 2: Webhook-Style Change Detection

Since the API doesn't support webhooks, implement change detection by comparing `EVT_modified` timestamps.

```typescript
// change-detector.ts
interface SyncState {
  lastSync: Date;
  knownEvents: Map<number, string>; // EVT_ID -> EVT_modified
}

async function detectChanges(state: SyncState): Promise<{
  new: any[];
  updated: any[];
  deleted: number[];
}> {
  const baseUrl = 'https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36';
  const eventsRes = await fetch(`${baseUrl}/events`);
  const events = await eventsRes.json();

  const currentEventIds = new Set<number>();
  const newEvents: any[] = [];
  const updatedEvents: any[] = [];

  for (const event of events) {
    currentEventIds.add(event.EVT_ID);

    const knownModified = state.knownEvents.get(event.EVT_ID);

    if (!knownModified) {
      // New event
      newEvents.push(event);
    } else if (knownModified !== event.EVT_modified) {
      // Updated event
      updatedEvents.push(event);
    }
  }

  // Find deleted events
  const deletedIds: number[] = [];
  for (const [id] of state.knownEvents) {
    if (!currentEventIds.has(id)) {
      deletedIds.push(id);
    }
  }

  return { new: newEvents, updated: updatedEvents, deleted: deletedIds };
}
```

---

## Polling Schedule Recommendations

| Frequency | Use Case | Notes |
|-----------|----------|-------|
| Every 15 min | High-traffic calendar | May be excessive for this source |
| Every 1 hour | **Recommended** | Good balance of freshness and efficiency |
| Every 6 hours | Low-priority sync | Acceptable for static event lists |
| Daily | Archive/backup | Minimum recommended |

---

## Sample Cron Job (Node.js)

```typescript
// sync-cron.ts
import { CronJob } from 'cron';

const syncJob = new CronJob(
  '0 * * * *', // Every hour at minute 0
  async () => {
    console.log(`[${new Date().toISOString()}] Starting Downtown Fayetteville sync`);

    try {
      const events = await fetchDowntownEvents();

      // Filter to future events only
      const now = new Date();
      const futureEvents = events.filter(e => e.endDateTime > now);

      console.log(`Fetched ${futureEvents.length} upcoming events`);

      // Upsert to your central calendar database
      for (const event of futureEvents) {
        await upsertEvent(event);
      }

      console.log('Sync complete');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  },
  null,
  true,
  'America/New_York'
);
```

---

## Cloudflare Workers Implementation

```typescript
// functions/api/sync/downtown-fayetteville.ts
export async function onRequestPost(context: { env: Env }) {
  const baseUrl = 'https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36';

  // Fetch all data in parallel
  const [eventsRes, datetimesRes, venuesRes] = await Promise.all([
    fetch(`${baseUrl}/events`),
    fetch(`${baseUrl}/datetimes`),
    fetch(`${baseUrl}/venues`),
  ]);

  const [events, datetimes, venues] = await Promise.all([
    eventsRes.json(),
    datetimesRes.json(),
    venuesRes.json(),
  ]);

  // Process and store in D1
  const db = context.env.DB;

  let inserted = 0;
  let updated = 0;

  for (const event of events) {
    if (event.status.raw !== 'publish') continue;

    const result = await db.prepare(`
      INSERT INTO events (
        source, source_id, title, description, url, last_modified
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (source, source_id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        url = excluded.url,
        last_modified = excluded.last_modified
    `).bind(
      'visit_downtown_fayetteville',
      event.EVT_ID,
      event.EVT_name,
      event.EVT_desc?.rendered || '',
      event.link,
      event.EVT_modified_gmt
    ).run();

    if (result.meta.changes > 0) {
      result.meta.last_row_id ? inserted++ : updated++;
    }
  }

  return Response.json({
    success: true,
    inserted,
    updated,
    total: events.length,
  });
}
```

---

## Database Schema (D1/SQLite)

```sql
-- Central calendar events table
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,           -- 'visit_downtown_fayetteville'
  source_id INTEGER NOT NULL,     -- EVT_ID from source
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  last_modified TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  UNIQUE(source, source_id)
);

-- Event instances (for recurring/multi-day events)
CREATE TABLE IF NOT EXISTS event_datetimes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_datetime_id INTEGER,     -- DTT_ID from source
  start_datetime TEXT NOT NULL,
  end_datetime TEXT NOT NULL,

  UNIQUE(event_id, source_datetime_id)
);

-- Venues
CREATE TABLE IF NOT EXISTS venues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  google_maps_url TEXT,

  UNIQUE(source, source_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_event_datetimes_start ON event_datetimes(start_datetime);
CREATE INDEX IF NOT EXISTS idx_event_datetimes_end ON event_datetimes(end_datetime);
```

---

## API Query Parameters

The Event Espresso API supports these query parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `where[status]` | Filter by status | `?where[status]=publish` |
| `where[EVT_ID]` | Filter by event ID | `?where[EVT_ID]=123` |
| `include` | Include related data | `?include=Datetime,Venue` |
| `limit` | Results per page | `?limit=50` |
| `offset` | Pagination offset | `?offset=50` |
| `order_by` | Sort field | `?order_by=EVT_created` |
| `order` | Sort direction | `?order=DESC` |

### Example Queries

```bash
# Get published events only
curl "https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36/events?where[status]=publish"

# Get events with their datetimes included
curl "https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36/events?include=Datetime"

# Get events modified after a date
curl "https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36/events?where[EVT_modified][>=]=2025-01-01T00:00:00"

# Paginate through results
curl "https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36/events?limit=20&offset=0"
curl "https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36/events?limit=20&offset=20"
```

---

## Error Handling

```typescript
async function fetchWithRetry(url: string, maxRetries = 3): Promise<any> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'FayettevilleCentralCalendar/1.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${i + 1} failed: ${lastError.message}`);

      // Exponential backoff
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }

  throw lastError;
}
```

---

## Rate Limiting Considerations

- No documented rate limits, but be respectful
- Recommended: Max 60 requests/minute
- Use caching to reduce API calls
- Batch requests where possible

---

## Known Limitations

1. **No Webhooks** - Must poll for changes
2. **No iCal Feed** - No native calendar subscription format
3. **No RSS Feed** - No news-style feed available
4. **Pagination Required** - Default API returns oldest events first. Use `?limit=200&order_by=EVT_modified&order=DESC` for recent events
5. **Event/Datetime Mismatch** - Events and datetimes are separate entities; many older events lack datetime records
6. **Images** - Event images require parsing HTML description or separate featured image endpoint

### Important: Pagination Gotcha

The default API call returns the **oldest** events first (from 2018-2019). To get current/upcoming events, you MUST use:

```bash
# Events ordered by most recently modified
/events?limit=200&order_by=EVT_modified&order=DESC

# Datetimes ordered by start date (most recent first)
/datetimes?limit=200&order_by=DTT_EVT_start&order=DESC
```

---

## Alternative Data Access

### Direct Page Scraping (Fallback)

If the API becomes unavailable, events can be scraped from the HTML pages:

```typescript
// Fallback scraper - use only if API fails
async function scrapeEventsPage(): Promise<any[]> {
  const res = await fetch('https://visitdowntownfayetteville.com/events/');
  const html = await res.text();

  // Parse JSON-LD from page
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    return JSON.parse(jsonLdMatch[1]);
  }

  return [];
}
```

---

## Contact Information

For questions about hosting events downtown:
- **Phone:** 910-433-1505
- **Department:** Special Events

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-29 | Initial documentation created |
