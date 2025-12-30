# Fort Liberty (Bragg) MWR Events Integration

## Overview

**Source URL:** https://bragg.armymwr.com/calendar
**Platform:** Custom CMS (Concrete5-based)
**API Type:** None (HTML scraping required)
**Authentication:** None required (public)
**Organization:** Army MWR (Morale, Welfare and Recreation)

Fort Liberty (formerly Fort Bragg) MWR provides events for military personnel, families, and the community including recreation, sports, arts, and community events.

---

## Section Tag

**Tag:** `fort_bragg` / `fort_liberty`
**Category:** Military

This source is part of the **Fort Bragg Section** of the Fayetteville Central Calendar, separate from Downtown events.

---

## Data Access

### No API Available

The MWR calendar does not provide:
- ❌ REST API
- ❌ RSS feed
- ❌ iCal/ICS export
- ❌ JSON endpoints
- ❌ JSON-LD structured data

### Scraping Required

Events must be extracted via HTML parsing of the calendar pages.

---

## URL Structure

### Calendar Views

```
# Agenda view (default)
https://bragg.armymwr.com/calendar

# Specific date
https://bragg.armymwr.com/calendar?date=01/15/2026

# Month view
https://bragg.armymwr.com/calendar?mode=month

# Category filter
https://bragg.armymwr.com/calendar?category=5

# Combined filters
https://bragg.armymwr.com/calendar?date=01/01/2026&category=5&mode=agenda
```

### Event Detail Pages

```
https://bragg.armymwr.com/calendar/event/{event-slug}/{event-id}/{occurrence-id}
```

Example:
```
https://bragg.armymwr.com/calendar/event/monday-night-magic-card-game/7091319/101634
```

---

## Event Categories

| ID | Category |
|----|----------|
| 1 | ACS (Army Community Service) |
| 2 | Arts & Crafts |
| 3 | Auto |
| 4 | Bowling |
| 5 | Community Events |
| 6 | Entertainment |
| 7 | Fitness |
| 8 | Golf |
| 9 | Library |
| 10 | Outdoor Recreation |
| 11 | Recreation |
| 12 | Restaurants & Clubs |
| 13 | Sports |
| 14 | Swimming |
| 15 | Youth Programs |
| 16 | Other |

---

## HTML Structure

### Event Listing Pattern

```html
<div class="event-item">
  <a href="/calendar/event/event-slug/123456/789012">
    <img src="/application/files/.../event-image.jpg" alt="Event Name">
    <h3>Event Title</h3>
  </a>
  <em>4 pm - 6:45 pm</em>
  <span class="venue">
    <a href="/programs/venue-name">Venue Name</a>
  </span>
</div>
```

### Date Display

Dates are shown in the calendar navigation and event groupings:
- Format: "Month Day" (e.g., "January 5")
- Year inferred from URL parameter or current date

---

## Import Implementation

### TypeScript Scraper

```typescript
// sync-fort-liberty-events.ts

interface FortLibertyEvent {
  id: string;
  source: 'fort_liberty_mwr';
  sourceId: string;
  title: string;
  description: string;
  startDateTime: Date;
  endDateTime: Date;
  venue: {
    name: string;
    city: string;
    state: string;
  } | null;
  categories: string[];
  url: string;
  imageUrl?: string;
  section: 'fort_bragg';
}

const BASE_URL = 'https://bragg.armymwr.com';

async function fetchFortLibertyEvents(
  startDate: Date = new Date(),
  daysAhead: number = 30
): Promise<FortLibertyEvent[]> {
  const events: FortLibertyEvent[] = [];
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + daysAhead);

  // Fetch each week to get full coverage
  let currentDate = new Date(startDate);

  while (currentDate < endDate) {
    const dateStr = formatDateParam(currentDate);
    const url = `${BASE_URL}/calendar?date=${encodeURIComponent(dateStr)}&mode=agenda`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'FayettevilleCentralCalendar/1.0',
          'Accept': 'text/html',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch ${url}: ${response.status}`);
        currentDate.setDate(currentDate.getDate() + 7);
        continue;
      }

      const html = await response.text();
      const pageEvents = parseEventsFromHtml(html, currentDate.getFullYear());
      events.push(...pageEvents);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
    }

    // Move to next week
    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Deduplicate by event ID
  const uniqueEvents = Array.from(
    new Map(events.map(e => [e.id, e])).values()
  );

  return uniqueEvents.sort(
    (a, b) => a.startDateTime.getTime() - b.startDateTime.getTime()
  );
}

function formatDateParam(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function parseEventsFromHtml(html: string, defaultYear: number): FortLibertyEvent[] {
  const events: FortLibertyEvent[] = [];

  // Extract event links and data
  // Pattern: /calendar/event/slug/id1/id2
  const eventRegex = /href="(\/calendar\/event\/([^"]+)\/(\d+)\/(\d+))"/g;
  let match;

  while ((match = eventRegex.exec(html)) !== null) {
    const [, fullPath, slug, eventId, occurrenceId] = match;

    // Find associated title (usually in nearby text or alt attribute)
    const titleMatch = html.slice(match.index, match.index + 500)
      .match(/(?:alt="|>)([^"<]+?)(?:\.jpg"|<\/)/);

    // Find time
    const timeMatch = html.slice(match.index, match.index + 500)
      .match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);

    // Find venue
    const venueMatch = html.slice(match.index, match.index + 500)
      .match(/\/programs\/[^"]+">([^<]+)</);

    // Find image
    const imgMatch = html.slice(Math.max(0, match.index - 200), match.index + 200)
      .match(/src="([^"]+\.jpg)"/);

    const title = titleMatch?.[1]?.replace(/-/g, ' ').trim() ||
                  slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    events.push({
      id: `ftliberty_${eventId}_${occurrenceId}`,
      source: 'fort_liberty_mwr',
      sourceId: `${eventId}_${occurrenceId}`,
      title,
      description: '',
      startDateTime: new Date(), // Would need more parsing for actual date
      endDateTime: new Date(),
      venue: venueMatch ? {
        name: venueMatch[1],
        city: 'Fort Liberty',
        state: 'NC',
      } : null,
      categories: ['Military', 'MWR'],
      url: `${BASE_URL}${fullPath}`,
      imageUrl: imgMatch ? `${BASE_URL}${imgMatch[1]}` : undefined,
      section: 'fort_bragg',
    });
  }

  return events;
}

function parseTime(timeStr: string, date: Date): Date {
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!match) return date;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2] || '0');
  const period = match[3].toLowerCase();

  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}
```

---

## Event Detail Scraping

For full event details, scrape the individual event pages:

```typescript
async function fetchEventDetails(eventUrl: string): Promise<Partial<FortLibertyEvent>> {
  const response = await fetch(eventUrl);
  const html = await response.text();

  // Extract full description
  const descMatch = html.match(/<div class="event-description">([\s\S]*?)<\/div>/);

  // Extract full date/time
  const dateMatch = html.match(/(\w+ \d+, \d{4})/);

  // Extract location details
  const locationMatch = html.match(/<div class="event-location">([\s\S]*?)<\/div>/);

  return {
    description: descMatch ? stripHtml(descMatch[1]) : '',
    // ... other fields
  };
}
```

---

## Sync Recommendations

| Approach | Frequency | Notes |
|----------|-----------|-------|
| Full scrape | Daily | Fetch 30 days ahead |
| Incremental | Every 6 hours | Check current week only |
| Event details | On demand | Only when displaying |

---

## Rate Limiting

- No documented limits
- Recommended: Max 1 request/second
- Add delays between page fetches
- Cache responses for at least 1 hour

---

## Known Limitations

1. **No API** - Must scrape HTML pages
2. **Date parsing complexity** - Dates require context from URL
3. **Recurring events** - Shown as separate occurrences
4. **Time zone** - Assumed Eastern Time (Fort Liberty is in NC)
5. **Rate limits unknown** - Be conservative with requests

---

## Sample Events

| Event | Venue | Type |
|-------|-------|------|
| Monday Night Magic | Throckmorton Library | Recreation |
| Lego Block Party | Library | Youth |
| Commander's Cup Basketball | Gym | Sports |
| First Friday's Teens Bowling | Bowling Center | Recreation |
| New Year's Bowling Event | Bowling Center | Community |

---

## Venues on Post

Common venues for MWR events:

- Throckmorton Library
- Ritz-Epps Fitness Center
- Stryker Golf Course
- Hercules Physical Fitness Center
- Youth Center
- Arts & Crafts Center
- Outdoor Recreation
- Bowling Center
- Club Bragg

---

## Integration Notes

### Section Tagging

All Fort Liberty events should be tagged with:
```typescript
{
  section: 'fort_bragg',
  tags: ['military', 'mwr', 'fort_liberty'],
}
```

### Display Grouping

In the central calendar, events can be grouped:
- **Downtown Fayetteville** - Visit Downtown, Segra, Distinctly, Dogwood
- **Fort Bragg** - MWR events

---

## Database Schema (additions)

```sql
-- Add section column if not exists
ALTER TABLE events ADD COLUMN section TEXT DEFAULT 'downtown';

-- Add Fort Liberty source
INSERT INTO event_sources (name, url, type, sync_interval_minutes, section)
VALUES (
  'Fort Liberty MWR',
  'https://bragg.armymwr.com/calendar',
  'scrape',
  360,  -- Every 6 hours
  'fort_bragg'
);
```

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-29 | Initial documentation |
