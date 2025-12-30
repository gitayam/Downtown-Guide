# Fayetteville Dogwood Festival Events Integration

## Overview

**Source URL:** https://www.thedogwoodfestival.com/2025-2026-events
**Platform:** Squarespace
**API Type:** None (static HTML - requires scraping)
**Authentication:** None required
**Organization:** Fayetteville Dogwood Festival, Inc.

The Dogwood Festival is Fayetteville's signature annual spring event, typically held in late April. The organization hosts year-round fundraising and community events.

---

## Data Access

### No API Available

The Dogwood Festival website does not provide:
- JSON API endpoints
- RSS feeds
- iCal exports
- Calendar widgets

Events are listed as **static HTML content** in bullet-point format.

### Scraping Required

Events must be extracted via HTML parsing of the events page.

---

## Event Format on Website

Events are displayed as simple text with this format:

```
● January 10, 2026: Donuts and Dodgeball
● February 11, 2026: Media Night
● February 21, 2026: A Night Out at Crown Coliseum
● April 24 - 26, 2026: Fayetteville Dogwood Spring Festival
```

No structured data (JSON-LD, microdata) is present.

---

## Known Events (2025-2026 Season)

| Date | Event | Notes |
|------|-------|-------|
| January 10, 2026 | Donuts and Dodgeball | Fundraiser |
| February 11, 2026 | Media Night | Press event |
| February 21, 2026 | A Night Out | Crown Coliseum |
| April 24-26, 2026 | Dogwood Spring Festival | Main festival |

---

## Import Implementation

### TypeScript Web Scraper

```typescript
// sync-dogwood-events.ts

interface DogwoodEvent {
  id: string;
  source: 'dogwood_festival';
  title: string;
  startDate: Date;
  endDate: Date;
  venue: string | null;
  url: string;
  lastScraped: Date;
}

const DOGWOOD_URL = 'https://www.thedogwoodfestival.com/2025-2026-events';

async function fetchDogwoodEvents(): Promise<DogwoodEvent[]> {
  const response = await fetch(DOGWOOD_URL, {
    headers: {
      'User-Agent': 'FayettevilleCentralCalendar/1.0',
      'Accept': 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  return parseEventsFromHtml(html);
}

function parseEventsFromHtml(html: string): DogwoodEvent[] {
  const events: DogwoodEvent[] = [];

  // Match patterns like:
  // "January 10, 2026: Event Name"
  // "April 24 - 26, 2026: Event Name"
  const patterns = [
    // Single date: "Month DD, YYYY: Event"
    /●?\s*([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4}):\s*([^\n●]+)/g,
    // Date range: "Month DD - DD, YYYY: Event"
    /●?\s*([A-Z][a-z]+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s+(\d{4}):\s*([^\n●]+)/g,
  ];

  // Extract single-date events
  const singleDateRegex = /●?\s*([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4}):\s*([^\n●<]+)/g;
  let match;

  while ((match = singleDateRegex.exec(html)) !== null) {
    const [, month, day, year, title] = match;
    const date = parseMonthDayYear(month, day, year);

    if (date) {
      events.push({
        id: `dogwood_${date.toISOString().split('T')[0]}_${slugify(title)}`,
        source: 'dogwood_festival',
        title: title.trim(),
        startDate: date,
        endDate: date,
        venue: extractVenue(title),
        url: DOGWOOD_URL,
        lastScraped: new Date(),
      });
    }
  }

  // Extract date-range events
  const rangeRegex = /●?\s*([A-Z][a-z]+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s+(\d{4}):\s*([^\n●<]+)/g;

  while ((match = rangeRegex.exec(html)) !== null) {
    const [, month, startDay, endDay, year, title] = match;
    const startDate = parseMonthDayYear(month, startDay, year);
    const endDate = parseMonthDayYear(month, endDay, year);

    if (startDate && endDate) {
      events.push({
        id: `dogwood_${startDate.toISOString().split('T')[0]}_${slugify(title)}`,
        source: 'dogwood_festival',
        title: title.trim(),
        startDate,
        endDate,
        venue: extractVenue(title),
        url: DOGWOOD_URL,
        lastScraped: new Date(),
      });
    }
  }

  // Deduplicate by ID
  const uniqueEvents = Array.from(
    new Map(events.map(e => [e.id, e])).values()
  );

  return uniqueEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

function parseMonthDayYear(month: string, day: string, year: string): Date | null {
  const months: Record<string, number> = {
    January: 0, February: 1, March: 2, April: 3,
    May: 4, June: 5, July: 6, August: 7,
    September: 8, October: 9, November: 10, December: 11,
  };

  const monthNum = months[month];
  if (monthNum === undefined) return null;

  return new Date(parseInt(year), monthNum, parseInt(day));
}

function extractVenue(title: string): string | null {
  // Look for "at Venue" pattern
  const atMatch = title.match(/at\s+([^,]+)/i);
  if (atMatch) return atMatch[1].trim();

  // Known venues
  if (title.toLowerCase().includes('crown')) return 'Crown Coliseum';
  if (title.toLowerCase().includes('festival')) return 'Festival Park';

  return null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// Filter to future events
async function fetchUpcomingDogwoodEvents(): Promise<DogwoodEvent[]> {
  const events = await fetchDogwoodEvents();
  const now = new Date();
  return events.filter(e => e.endDate >= now);
}
```

---

## Alternative: Manual Event List

Since the Dogwood Festival has a small, predictable event calendar, you may prefer to maintain a manual event list that's updated periodically:

```typescript
const DOGWOOD_EVENTS_2025_2026 = [
  {
    title: 'Donuts and Dodgeball',
    date: '2026-01-10',
    venue: null,
  },
  {
    title: 'Media Night',
    date: '2026-02-11',
    venue: null,
  },
  {
    title: 'A Night Out',
    date: '2026-02-21',
    venue: 'Crown Coliseum',
  },
  {
    title: 'Fayetteville Dogwood Spring Festival',
    startDate: '2026-04-24',
    endDate: '2026-04-26',
    venue: 'Festival Park',
  },
];
```

---

## Squarespace JSON Attempt

You can try the Squarespace JSON endpoint, but this page appears to be a simple content page, not an events collection:

```bash
curl "https://www.thedogwoodfestival.com/2025-2026-events?format=json"
```

This typically returns page metadata but not structured event data.

---

## Sync Recommendations

| Approach | Frequency | Reliability |
|----------|-----------|-------------|
| Web scraping | Weekly | Medium |
| Manual list | As needed | High |
| Email alerts | Subscribe to newsletter | High |

Given the small number of events (~4-6 per year), **manual maintenance** may be more reliable than automated scraping.

---

## Contact for Updates

- **Website:** https://www.thedogwoodfestival.com
- **Social:** Facebook, Instagram
- **Newsletter:** Available on website

---

## Known Limitations

1. **No structured data** - Events are plain text in HTML
2. **No API or feeds** - Must scrape or maintain manually
3. **URL may change yearly** - Currently `/2025-2026-events`
4. **Minimal event details** - No descriptions, times, or images

---

## Festival History

The Dogwood Festival has been running since 1982 and typically includes:

- Parade
- Street fair
- Live music
- Carnival rides
- Food vendors
- Arts & crafts
- Dog show
- 5K/10K run

Main festival dates are typically the **last weekend of April**.

---

## Database Schema (additions)

```sql
INSERT INTO event_sources (
  name, url, type, sync_interval_minutes, notes
)
VALUES (
  'Dogwood Festival',
  'https://www.thedogwoodfestival.com/2025-2026-events',
  'scrape',
  10080,  -- Weekly (7 * 24 * 60)
  'Small event list, consider manual maintenance'
);
```

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-29 | Initial documentation |
