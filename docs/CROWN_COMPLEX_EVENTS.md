# Crown Complex Events Integration

## Overview

**Source URL:** https://www.crowncomplexnc.com/events/all
**Platform:** Custom web platform
**API Type:** None (HTML scraping required)
**Authentication:** None required
**Organization:** Crown Complex / OVG Venues

Crown Complex is a multi-venue entertainment destination in Fayetteville, NC featuring:
- Crown Coliseum (sports, concerts, events)
- Crown Theatre (concerts, performing arts)
- Crown Expo (expos, trade shows)

---

## Data Access

### No API Available

The Crown Complex website does not provide:
- JSON API endpoints
- RSS feeds
- iCal exports
- Calendar widgets

Events are listed as **HTML content** in a dynamic grid/list layout on the events page.

### Scraping Required

Events must be extracted via HTML parsing of https://www.crowncomplexnc.com/events/all

---

## Event Format on Website

Events are displayed in a grid/list view with the following structure:

```html
<div class="event-item">
  <h3>Event Title</h3>
  <p>Venue Name (Crown Coliseum, Crown Theatre, Crown Expo)</p>
  <p>Date (e.g., "Jan. 9")</p>
  <a href="/event/...">Buy Tickets</a>
</div>
```

Known events (as of Dec 30, 2025):

| Date | Event | Venue |
|------|-------|-------|
| Jan. 9 | Knoxville at Fayetteville | Crown Coliseum |
| Jan. 10 | Knoxville at Fayetteville | Crown Coliseum |
| Jan. 23 | Huntsville at Fayetteville | Crown Coliseum |
| Jan. 25 | Macon at Fayetteville | Crown Coliseum |
| Jan. 30 - Feb. 1 | Fayetteville Fishing Expo | Crown Expo |
| Feb. 1 | Whose Live Anyway? | Crown Theatre |
| Feb. 6 | Birmingham at Fayetteville | Crown Coliseum |
| Feb. 7 | Birmingham at Fayetteville | Crown Coliseum |

---

## Import Implementation

### TypeScript Web Scraper

The Crown Complex scraper is implemented in `scripts/sync-all-events.ts` as `fetchCrownComplexEvents()`:

```typescript
async function fetchCrownComplexEvents(): Promise<UnifiedEvent[]> {
  const response = await fetch('https://www.crowncomplexnc.com/events/all');
  const html = await response.text();
  
  // Parse events from HTML grid/list
  // Extract: title, date, venue, ticket URL
  // Map venues to normalized names (Crown Coliseum, Crown Theatre, Crown Expo)
  // Return UnifiedEvent array
}
```

### Event Extraction Patterns

The scraper uses regex and DOM parsing to extract:

1. **Event Title**: Extracted from event heading/name
2. **Date**: Parsed from date text (e.g., "Jan. 9" → January 9, 2025)
3. **Venue**: One of Crown Coliseum, Crown Theatre, or Crown Expo
4. **Ticket URL**: "Buy Tickets" link
5. **Event Type**: Inferred from title (sports, concert, expo)

### Venue Mapping

```typescript
const venueMapping: Record<string, VenueInfo> = {
  'Crown Coliseum': {
    name: 'Crown Coliseum',
    address: '1960 Coliseum Drive',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28306',
  },
  'Crown Theatre': {
    name: 'Crown Theatre',
    address: '1960 Coliseum Drive',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28306',
  },
  'Crown Expo': {
    name: 'Crown Expo',
    address: '1960 Coliseum Drive',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28306',
  },
};
```

---

## Sync Recommendations

| Approach | Frequency | Reliability |
|----------|-----------|-------------|
| Web scraping | Hourly (60 min) | Medium-High |
| Manual updates | As-needed | High |

**Recommendation:** Scrape hourly to catch new event announcements and ticket sales openings.

---

## Known Limitations

1. **Date parsing complexity** - Crown Complex uses various date formats:
   - "Jan. 9" (single date with year inference)
   - "Jan. 30 - Feb. 1" (date ranges)
   - Exact times are not always available in list view

2. **No event descriptions** - Event details are only available on individual event pages

3. **Dynamic content** - Some events may load via JavaScript after initial page load

4. **Venue location** - All three venues share the same physical address (1960 Coliseum Drive)

5. **No structured metadata** - Page lacks JSON-LD, microdata, or Open Graph tags for events

---

## Database Schema Addition

Add Crown Complex to the `sources` table:

```sql
INSERT INTO sources (
  id, name, url, type, section, sync_interval_minutes, is_active
) VALUES (
  'crown_complex',
  'Crown Complex',
  'https://www.crowncomplexnc.com/events/all',
  'scrape',
  'downtown',
  60,
  TRUE
);
```

---

## Integration Notes

### Adding to Sync Script

1. Add `'crown_complex'` to `SourceName` type
2. Implement `fetchCrownComplexEvents()` function
3. Add to `syncEvents()` fetcher map
4. Include in parallel fetch in main sync routine

### Testing

```bash
# Scrape Crown Complex only
npx tsx scripts/sync-all-events.ts --source=crown_complex

# Write to database
npx tsx scripts/sync-all-events.ts --source=crown_complex --db

# JSON output for debugging
npx tsx scripts/sync-all-events.ts --source=crown_complex --json
```

---

## Contact Information

- **Website:** https://www.crowncomplexnc.com
- **Phone:** (910) 438-4100
- **Address:** 1960 Coliseum Drive, Fayetteville, NC 28306
- **Ticketmaster:** https://www.ticketmaster.com

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-30 | Initial documentation and scraper implementation |

