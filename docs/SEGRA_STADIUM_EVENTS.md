# Segra Stadium Events Integration

## Overview

**Source URL:** https://www.segrastadium.com/events-tickets
**Platform:** Squarespace
**API Type:** Squarespace JSON API (append `?format=json`)
**Authentication:** None required (public)
**Venue:** Segra Stadium, 460 Hay St, Fayetteville NC 28301
**Phone:** (910) 339-1989

Primary venue for:
- Fayetteville Woodpeckers (Minor League Baseball)
- Concerts and festivals
- Special events (MMA, memorial events, beer festivals)

---

## API Endpoint

### Events Collection JSON

```
GET https://www.segrastadium.com/events-tickets?format=json
```

Returns Squarespace collection JSON with all events.

---

## Data Schema

### Collection Response

```typescript
interface SquarespaceCollection {
  collection: {
    id: string;
    websiteId: string;
    title: string;
    urlId: string;
    type: number;           // 10 = Events
    itemCount: number;
    updatedOn: number;      // Unix timestamp (ms)
  };
  items: SquarespaceEvent[];
  pagination: {
    nextPage: boolean;
    nextPageOffset: number;
    nextPageUrl: string | null;
  };
}
```

### Event Object

```typescript
interface SquarespaceEvent {
  id: string;
  collectionId: string;
  websiteId: string;

  // Content
  title: string;
  body: string;              // HTML formatted description
  excerpt: string;           // Plain text summary

  // URLs
  fullUrl: string;           // Path to event page (e.g., "/events-tickets/pecktoberfest")
  sourceUrl: string;         // External ticket link (Ticketmaster, etc.)
  urlId: string;             // URL slug

  // Dates (Unix timestamps in milliseconds)
  startDate: number;
  endDate: number;
  publishOn: number;
  updatedOn: number;
  addedOn: number;

  // Media
  assetUrl: string;          // Primary image URL
  systemDataId: string;

  // Metadata
  tags: string[];
  categories: string[];

  // Location (from venue)
  location: {
    addressLine1: string;
    addressLine2: string;
    addressCountry: string;
  };

  // Status
  draft: boolean;
  starred: boolean;
  passthrough: boolean;
}
```

---

## Import Implementation

### TypeScript Sync Function

```typescript
// sync-segra-events.ts

interface SegraEvent {
  id: string;
  source: 'segra_stadium';
  sourceId: string;
  title: string;
  description: string;
  descriptionHtml: string;
  startDateTime: Date;
  endDateTime: Date;
  venue: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  url: string;
  ticketUrl: string | null;
  imageUrl: string | null;
  tags: string[];
  lastModified: Date;
}

const SEGRA_API = 'https://www.segrastadium.com/events-tickets?format=json';

async function fetchSegraEvents(): Promise<SegraEvent[]> {
  const response = await fetch(SEGRA_API, {
    headers: {
      'User-Agent': 'FayettevilleCentralCalendar/1.0',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const events: SegraEvent[] = [];

  for (const item of data.items || []) {
    // Skip drafts
    if (item.draft) continue;

    // Convert Unix ms timestamps to Date
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);

    // Strip HTML for plain text description
    const description = item.body
      ?.replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || '';

    events.push({
      id: `segra_${item.id}`,
      source: 'segra_stadium',
      sourceId: item.id,
      title: item.title,
      description,
      descriptionHtml: item.body || '',
      startDateTime: startDate,
      endDateTime: endDate,
      venue: {
        name: 'Segra Stadium',
        address: '460 Hay St',
        city: 'Fayetteville',
        state: 'NC',
        zip: '28301',
      },
      url: `https://www.segrastadium.com${item.fullUrl}`,
      ticketUrl: item.sourceUrl || null,
      imageUrl: item.assetUrl ? `https:${item.assetUrl}` : null,
      tags: item.tags || [],
      lastModified: new Date(item.updatedOn),
    });
  }

  // Sort by start date
  events.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

  return events;
}

// Filter to future events only
async function fetchUpcomingSegraEvents(): Promise<SegraEvent[]> {
  const allEvents = await fetchSegraEvents();
  const now = new Date();
  return allEvents.filter(e => e.endDateTime > now);
}
```

---

## Pagination

Squarespace uses offset-based pagination:

```typescript
async function fetchAllSegraEvents(): Promise<SegraEvent[]> {
  let allEvents: SegraEvent[] = [];
  let url = SEGRA_API;

  while (url) {
    const response = await fetch(url);
    const data = await response.json();

    const events = transformEvents(data.items);
    allEvents = allEvents.concat(events);

    // Check for next page
    if (data.pagination?.nextPage && data.pagination.nextPageUrl) {
      url = `https://www.segrastadium.com${data.pagination.nextPageUrl}`;
    } else {
      url = null;
    }
  }

  return allEvents;
}
```

---

## ICS Calendar Export

Individual events support ICS export via Squarespace's built-in functionality:

```
https://www.segrastadium.com/events-tickets/[event-slug]?format=ical
```

Example:
```bash
curl "https://www.segrastadium.com/events-tickets/pecktoberfest?format=ical"
```

---

## Sample Events

| Event | Date | Type |
|-------|------|------|
| Pecktoberfest | Sept 27, 2025 | Beer Festival |
| Ultimate Battlegrounds 26 | Sept 6, 2025 | MMA |
| 9/11 Memorial Stair Climb | Sept 11, 2025 | Memorial |
| Harry Potter Night | Various | Baseball Promo |
| Red, White & Blue Weekend | July 4-6, 2025 | Holiday |

---

## Recurring Game Promotions

The Woodpeckers have weekly promotions that recur:

| Day | Promotion | Details |
|-----|-----------|---------|
| Tuesday | Tacos & Tallboys | $2 tacos, $4 Corona/Modelo |
| Wednesday | Dollar Dog Wednesday | $1 hot dogs |
| Thursday | Thirsty Thursday | $5 craft beer, $2 Pepsi |
| Sunday | Family 4-Pack | 4 tickets + food for $44 |

These should be treated as recurring events if importing to a calendar.

---

## Rate Limiting

- No documented rate limits
- Recommended: Max 30 requests/minute
- Cache responses for at least 15 minutes

---

## Known Limitations

1. **No dedicated calendar feed** - Must parse JSON collection
2. **Limited filtering** - No server-side date filtering
3. **Past events included** - API returns all events, filter client-side
4. **No webhook support** - Must poll for changes

---

## Error Handling

```typescript
async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}
```

---

## Database Schema (additions)

```sql
-- Add to central events table
INSERT INTO event_sources (name, url, type, sync_interval_minutes)
VALUES ('Segra Stadium', 'https://www.segrastadium.com/events-tickets?format=json', 'squarespace', 60);

-- Events from this source will have:
-- source = 'segra_stadium'
-- venue = 'Segra Stadium'
```

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-29 | Initial documentation |
