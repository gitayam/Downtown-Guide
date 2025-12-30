# Fayetteville Central Calendar - Event Sources Documentation

This directory contains documentation for integrating multiple Fayetteville event sources into a central calendar system.

## Event Sections

Events are organized into two main sections:

### 🏙️ Downtown Fayetteville

| Source | Platform | Access Method | Events | Reliability |
|--------|----------|---------------|--------|-------------|
| [Visit Downtown Fayetteville](VISIT_DOWNTOWN_FAYETTEVILLE_EVENTS.md) | Event Espresso (WordPress) | REST API | ~3-10 | High |
| [Segra Stadium](SEGRA_STADIUM_EVENTS.md) | Squarespace | JSON API | ~30 (seasonal) | High |
| [Distinctly Fayetteville](DISTINCTLY_FAYETTEVILLE_EVENTS.md) | Simpleview CMS | RSS Feed | ~30 | High |
| [Dogwood Festival](DOGWOOD_FESTIVAL_EVENTS.md) | Squarespace | Scraping | ~6/year | Medium |

### 🎖️ Fort Liberty (Bragg)

| Source | Platform | Access Method | Events | Reliability |
|--------|----------|---------------|--------|-------------|
| [Fort Liberty MWR](FORT_LIBERTY_MWR_EVENTS.md) | Concrete5 CMS | Scraping | ~20-50 | Medium |

## Live API

**Base URL:** `https://downtown-guide.wemea-5ahhf.workers.dev`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/sources` | List event sources with sync status |
| `GET /api/events` | List events (supports filters) |
| `GET /api/events/today` | Today's events |
| `GET /api/events/upcoming` | Next 7 days |
| `GET /api/events/:id` | Single event by ID |
| `GET /cal/events.ics` | iCal feed for calendar apps |

### Query Parameters for `/api/events`

| Parameter | Example | Description |
|-----------|---------|-------------|
| `section` | `downtown`, `fort_bragg` | Filter by section |
| `source` | `distinctly_fayetteville` | Filter by source |
| `from` | `2025-01-01` | Start date (ISO) |
| `to` | `2025-01-31` | End date (ISO) |
| `limit` | `50` | Max results (default: 100) |
| `offset` | `0` | Pagination offset |

### Example Requests

```bash
# Get all upcoming events
curl "https://downtown-guide.wemea-5ahhf.workers.dev/api/events"

# Get Fort Bragg events only
curl "https://downtown-guide.wemea-5ahhf.workers.dev/api/events?section=fort_bragg"

# Subscribe in calendar app (Apple, Google, Outlook)
# Add this URL as a calendar subscription:
https://downtown-guide.wemea-5ahhf.workers.dev/cal/events.ics
```

---

## Quick Start

### Run the Multi-Source Sync

```bash
# Install dependencies (if needed)
npm install

# Sync all sources (console output)
npx tsx scripts/sync-all-events.ts

# Sync and write to D1 database
npx tsx scripts/sync-all-events.ts --db

# Export to JSON
npx tsx scripts/sync-all-events.ts --json > events.json

# Sync specific source
npx tsx scripts/sync-all-events.ts --source=distinctly --db   # CVB
npx tsx scripts/sync-all-events.ts --source=downtown --db     # Visit Downtown
npx tsx scripts/sync-all-events.ts --source=segra --db        # Segra Stadium
npx tsx scripts/sync-all-events.ts --source=dogwood --db      # Dogwood Festival
npx tsx scripts/sync-all-events.ts --source=fortliberty --db  # Fort Liberty MWR
```

## API Endpoints Summary

### Visit Downtown Fayetteville
```
Base: https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36/
GET  /events?limit=200&order_by=EVT_modified&order=DESC
GET  /datetimes?limit=200&order_by=DTT_EVT_start&order=DESC
GET  /venues
```

### Segra Stadium
```
GET https://www.segrastadium.com/events-tickets?format=json
# Uses 'upcoming' array for future events
```

### Distinctly Fayetteville
```
RSS: https://www.distinctlyfayettevillenc.com/event/rss/
# ~30 items, dates embedded in description HTML
```

### Dogwood Festival
```
Scrape: https://www.thedogwoodfestival.com/2025-2026-events
# Static HTML, bullet-point format
```

### Fort Liberty MWR
```
Scrape: https://bragg.armymwr.com/calendar?date=MM/DD/YYYY&mode=agenda
# HTML scraping, 5 weeks of data fetched
# No API or feeds available
```

## Unified Event Schema

All sources are normalized to this schema:

```typescript
type EventSection = 'downtown' | 'fort_bragg';

interface UnifiedEvent {
  id: string;                    // Unique ID (source_sourceId)
  source: string;                // Source identifier
  sourceId: string;              // Original ID from source
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
  } | null;
  categories: string[];
  url: string;
  ticketUrl?: string;
  imageUrl?: string;
  lastModified: Date;
  section: EventSection;         // 'downtown' or 'fort_bragg'
}
```

## Sync Schedule Recommendations

| Source | Section | Frequency | Notes |
|--------|---------|-----------|-------|
| Visit Downtown | Downtown | Hourly | Active event management |
| Segra Stadium | Downtown | Hourly | Seasonal (busy Mar-Sep) |
| Distinctly Fayetteville | Downtown | Hourly | CVB - comprehensive |
| Dogwood Festival | Downtown | Weekly | Small, static list |
| Fort Liberty MWR | Fort Bragg | Every 6 hours | Scraping, rate limited |

## Deduplication Strategy

Events may appear in multiple sources. The sync script deduplicates by:

1. Matching title (case-insensitive) + start date
2. Keeping first occurrence found
3. Prioritizing sources with more detail (Distinctly > Downtown > Segra > Dogwood)

## Database Schema

**D1 Database:** `downtown-events` (`fd953a64-4f1a-452c-aac4-84ad28c68370`)

### Tables

| Table | Description |
|-------|-------------|
| `sources` | Event source registry with sync status |
| `events` | Unified event storage |
| `venues` | Normalized venue data |
| `raw_scrapes` | Sync logs and raw data references |
| `pending_events` | Community submissions (Phase 4) |
| `reminder_log` | Discord notification tracking |

### Key Columns

**sources:**
- `id` - Source identifier (e.g., `distinctly_fayetteville`)
- `section` - `downtown` or `fort_bragg`
- `last_sync`, `last_sync_status`, `last_sync_count` - Sync tracking

**events:**
- `id` - Unique event ID
- `source_id` - Foreign key to sources
- `section` - `downtown` or `fort_bragg`
- `start_datetime`, `end_datetime` - Event timing
- `location_name` - Venue name
- `url`, `ticket_url`, `image_url` - Links

See [migrations/0000_initial.sql](../migrations/0000_initial.sql) for full schema.

## Error Handling

All sync operations include:

- Retry with exponential backoff (3 attempts)
- Source-level error isolation (one failure doesn't stop others)
- Logging of failures for monitoring

## Known Issues

1. **Segra Stadium** - Empty during off-season (Oct-Feb)
2. **Distinctly Fayetteville** - REST API requires auth, use RSS
3. **Dogwood Festival** - URL changes yearly (`/2025-2026-events`)
4. **Visit Downtown** - Pagination required for full event list

## Contact Information

| Source | Contact |
|--------|---------|
| Visit Downtown | Special Events: 910-433-1505 |
| Segra Stadium | (910) 339-1989 |
| Distinctly Fayetteville | CVB general inquiries |
| Dogwood Festival | Via website contact form |

## Discord Reminders

Event reminders are sent to Discord via webhook:
- **1 week before** an event (orange embed)
- **1 day before** an event (red embed)

See [DISCORD_WEBHOOK_REMINDERS.md](DISCORD_WEBHOOK_REMINDERS.md) for full documentation.

```bash
# Test (no actual sends)
npx tsx scripts/send-discord-reminders.ts --dry-run

# Send reminders
npx tsx scripts/send-discord-reminders.ts
```

## Files in this Directory

- `README.md` - This file (index)
- `VISIT_DOWNTOWN_FAYETTEVILLE_EVENTS.md` - Event Espresso API docs
- `SEGRA_STADIUM_EVENTS.md` - Squarespace JSON docs
- `DISTINCTLY_FAYETTEVILLE_EVENTS.md` - RSS feed docs
- `DOGWOOD_FESTIVAL_EVENTS.md` - Web scraping docs
- `FORT_LIBERTY_MWR_EVENTS.md` - Fort Bragg MWR scraping docs
- `DISCORD_WEBHOOK_REMINDERS.md` - Discord integration docs

## Scripts

- `scripts/sync-all-events.ts` - Multi-source sync script
- `scripts/sync-downtown-events.ts` - Downtown-only sync
- `scripts/send-discord-reminders.ts` - Discord reminder sender

---

*Last updated: December 30, 2025*
