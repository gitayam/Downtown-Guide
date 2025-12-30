# Distinctly Fayetteville Events Integration

## Overview

**Source URL:** https://www.distinctlyfayettevillenc.com/events/
**Platform:** Simpleview CMS
**API Type:** RSS Feed + Embedded JSON
**Authentication:** None required (public RSS)
**Organization:** Fayetteville Area Convention & Visitors Bureau

This is the official tourism/visitors bureau event calendar covering all of Fayetteville and Cumberland County.

---

## Data Access Methods

### Method 1: RSS Feed (Recommended)

```
GET https://www.distinctlyfayettevillenc.com/event/rss/
```

Returns RSS 2.0 feed with ~31 events.

### Method 2: Embedded Page JSON

Events page contains embedded JSON data in Vue.js data objects. Requires HTML parsing.

### Method 3: REST API (Restricted)

```
POST https://www.distinctlyfayettevillenc.com/includes/rest_v2/plugins_events_events_by_date/find/
```

**Note:** Returns 403 Forbidden for direct API access. May require specific headers or referrer.

---

## RSS Feed Schema

### XML Namespaces

```xml
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:georss="http://www.georss.org/georss"
  xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#">
```

### Item Structure

```xml
<item>
  <title>Event Name</title>
  <link>https://www.distinctlyfayettevillenc.com/event/event-slug/12345/</link>
  <guid isPermaLink="true">https://www.distinctlyfayettevillenc.com/event/event-slug/12345/</guid>
  <pubDate>Mon, 29 Dec 2025 23:59:59 -0500</pubDate>
  <category>Concerts &amp; Music</category>
  <category>Family Friendly</category>
  <description><![CDATA[
    <img src="https://assets.simpleviewinc.com/..." />
    <p><strong>Date:</strong> 08/04/2025 - 08/04/2025</p>
    <p>Event description text...</p>
  ]]></description>
  <georss:point>35.0527 -78.8784</georss:point>
  <geo:lat>35.0527</geo:lat>
  <geo:long>-78.8784</geo:long>
</item>
```

---

## Embedded JSON Schema

Found in page source within Vue.js component initialization:

```typescript
interface DistinctlyEvent {
  recid: string;              // Unique ID (e.g., "28968")
  title: string;
  url: string;                // Relative URL path

  // Dates
  startDate: string;          // ISO 8601 (e.g., "2025-12-30T04:59:59.000Z")
  endDate: string;
  date: string;               // Display date
  recurrence: string;         // Recurrence pattern
  recurType: string;

  // Location
  location: string;           // Venue name
  latitude: number;
  longitude: number;
  venue: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    url: string;
  };

  // Categories
  categories: Array<{
    catId: string;
    catName: string;
  }>;

  // Media
  asset: {
    type: 'image';
    resource: {
      url: string;            // Cloudinary URL
      alt: string;
    };
  };
  media_raw: string;          // Image URL

  // Content
  description: string;        // HTML formatted

  // Listing (venue details)
  listing: {
    title: string;
    primaryCategory: string;
    url: string;
  };
}
```

---

## Event Categories

18 categories available for filtering:

| Category | Description |
|----------|-------------|
| Arts | Art exhibitions, galleries |
| Concerts & Music | Live music performances |
| Expos & Conventions | Trade shows, conventions |
| Family Friendly | Kid-appropriate events |
| Festivals & Fairs | Community festivals |
| Food & Drink | Culinary events |
| Golf | Golf tournaments |
| History & Heritage | Historical events |
| Holiday | Seasonal celebrations |
| Markets & Shopping | Farmers markets, retail |
| Military | Fort Liberty events |
| Nightlife | Bars, clubs |
| Outdoor Recreation | Nature activities |
| Performing Arts | Theater, dance |
| Signature Events | Major annual events |
| Sports | Athletic events |
| Tours | Guided tours |
| Wellness | Health & fitness |

---

## Import Implementation

### TypeScript RSS Parser

```typescript
// sync-distinctly-fayetteville.ts
import { parseStringPromise } from 'xml2js';

interface DistinctlyEvent {
  id: string;
  source: 'distinctly_fayetteville';
  sourceId: string;
  title: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  categories: string[];
  url: string;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  pubDate: Date;
}

const RSS_URL = 'https://www.distinctlyfayettevillenc.com/event/rss/';

async function fetchDistinctlyEvents(): Promise<DistinctlyEvent[]> {
  const response = await fetch(RSS_URL, {
    headers: {
      'User-Agent': 'FayettevilleCentralCalendar/1.0',
      'Accept': 'application/rss+xml, application/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const xml = await response.text();
  const parsed = await parseStringPromise(xml, { explicitArray: false });

  const items = parsed.rss?.channel?.item || [];
  const itemsArray = Array.isArray(items) ? items : [items];

  const events: DistinctlyEvent[] = [];

  for (const item of itemsArray) {
    // Extract ID from URL
    const urlMatch = item.link?.match(/\/event\/[^/]+\/(\d+)\//);
    const sourceId = urlMatch?.[1] || item.guid;

    // Parse dates from description HTML
    const dateMatch = item.description?.match(
      /<strong>Date:<\/strong>\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/
    );

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (dateMatch) {
      startDate = parseDate(dateMatch[1]);
      endDate = parseDate(dateMatch[2]);
    }

    // Extract image URL from description
    const imgMatch = item.description?.match(/<img[^>]+src="([^"]+)"/);
    const imageUrl = imgMatch?.[1] || null;

    // Get categories
    const categories = Array.isArray(item.category)
      ? item.category
      : item.category
      ? [item.category]
      : [];

    // Strip HTML from description
    const description = item.description
      ?.replace(/<img[^>]*>/g, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || '';

    events.push({
      id: `df_${sourceId}`,
      source: 'distinctly_fayetteville',
      sourceId,
      title: item.title || '',
      description,
      startDate,
      endDate,
      categories,
      url: item.link || '',
      imageUrl,
      latitude: item['geo:lat'] ? parseFloat(item['geo:lat']) : null,
      longitude: item['geo:long'] ? parseFloat(item['geo:long']) : null,
      pubDate: new Date(item.pubDate),
    });
  }

  return events;
}

function parseDate(dateStr: string): Date | null {
  // Parse MM/DD/YYYY format
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;

  const [, month, day, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

// Filter to future events
async function fetchUpcomingDistinctlyEvents(): Promise<DistinctlyEvent[]> {
  const events = await fetchDistinctlyEvents();
  const now = new Date();

  return events.filter(e => {
    if (e.endDate) return e.endDate > now;
    if (e.startDate) return e.startDate > now;
    return true; // Keep if no dates available
  });
}
```

---

## Alternative: Scrape Embedded JSON

If RSS is insufficient, scrape the page for embedded Vue.js data:

```typescript
async function scrapeDistinctlyEventsPage(): Promise<any[]> {
  const response = await fetch('https://www.distinctlyfayettevillenc.com/events/');
  const html = await response.text();

  // Find the embedded events data
  // Look for pattern: "items": [...event data...]
  const match = html.match(/"items"\s*:\s*(\[[^\]]+\])/);

  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error('Failed to parse embedded JSON:', e);
    }
  }

  return [];
}
```

---

## Calendar Integration Features

The website supports:

- **Google Calendar export** per event
- **Microsoft Live Calendar export** per event
- **Print events** with date range filtering

### Print/Export URL

```
https://www.distinctlyfayettevillenc.com/print-events/?startDate=2025-01-01&endDate=2025-12-31
```

---

## Filtering Parameters

When accessing the events page, these URL parameters are supported:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `startdate` | Start date filter | `2025-01-01` |
| `enddate` | End date filter | `2025-12-31` |
| `catid` | Category ID filter | `123` |
| `keyword` | Search keyword | `concert` |
| `view` | Display mode | `list`, `grid` |

Example:
```
https://www.distinctlyfayettevillenc.com/events/?startdate=2025-01-01&enddate=2025-03-31&catid=123
```

---

## Rate Limiting

- RSS feed: No known limits
- Recommended: Poll every 30-60 minutes
- Cache responses appropriately

---

## Known Limitations

1. **REST API requires authentication** - Returns 403 for direct access
2. **RSS has limited fields** - Dates must be parsed from description HTML
3. **No venue details in RSS** - Only coordinates available
4. **No pagination in RSS** - Single page of results (~31 events)

---

## Sample Events (December 2025)

| Event | Category | Dates |
|-------|----------|-------|
| Fayetteville Holiday Lights | Holiday | Dec 30 - Jan 1 |
| Yoga at the Museum | Wellness | Weekly |
| Fayetteville Symphony | Performing Arts | Various |
| Downtown Farmers Market | Markets | Saturdays |

---

## Database Schema (additions)

```sql
INSERT INTO event_sources (name, url, type, sync_interval_minutes)
VALUES (
  'Distinctly Fayetteville',
  'https://www.distinctlyfayettevillenc.com/event/rss/',
  'rss',
  60
);
```

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-29 | Initial documentation |
