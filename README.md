# Fayetteville Central Calendar

A unified event calendar aggregating Downtown Fayetteville and Fort Liberty events into a single API and calendar feed.

## Live Sites

| Resource | URL |
|----------|-----|
| **Website** | [fayetteville-events.pages.dev](https://fayetteville-events.pages.dev) |
| **API** | [downtown-guide.wemea-5ahhf.workers.dev](https://downtown-guide.wemea-5ahhf.workers.dev) |
| **iCal Feed** | [Subscribe to Calendar](https://downtown-guide.wemea-5ahhf.workers.dev/cal/events.ics) |

---

## Live API

**Base URL:** `https://downtown-guide.wemea-5ahhf.workers.dev`

### Quick Links

| Resource | URL |
|----------|-----|
| API Docs | [/](https://downtown-guide.wemea-5ahhf.workers.dev/) |
| All Events | [/api/events](https://downtown-guide.wemea-5ahhf.workers.dev/api/events) |
| Today's Events | [/api/events/today](https://downtown-guide.wemea-5ahhf.workers.dev/api/events/today) |
| iCal Feed | [/cal/events.ics](https://downtown-guide.wemea-5ahhf.workers.dev/cal/events.ics) |

### Subscribe to Calendar

Add this URL to Apple Calendar, Google Calendar, or Outlook:

```
https://downtown-guide.wemea-5ahhf.workers.dev/cal/events.ics
```

For section-specific feeds:
```
# Downtown only
https://downtown-guide.wemea-5ahhf.workers.dev/cal/events.ics?section=downtown

# Fort Liberty only
https://downtown-guide.wemea-5ahhf.workers.dev/cal/events.ics?section=fort_bragg
```

---

## Event Sources

### Downtown Fayetteville

|| Source | Type | Events |
||--------|------|--------|
|| [Distinctly Fayetteville](https://www.distinctlyfayettevillenc.com/events/) | RSS Feed | ~20-30 |
|| [Visit Downtown](https://visitdowntownfayetteville.com/events/) | REST API | ~3-10 |
|| [Segra Stadium](https://www.segrastadium.com/events-calendar) | JSON API | ~30 (seasonal) |
|| [Crown Complex](https://www.crowncomplexnc.com/events/all) | Web Scraping | ~10-20 |
|| [Dogwood Festival](https://www.thedogwoodfestival.com/2025-2026-events) | Scraping | ~6/year |

### Fort Liberty (Bragg)

| Source | Type | Events |
|--------|------|--------|
| [Fort Liberty MWR](https://bragg.armymwr.com/calendar) | Scraping | ~20-50 |

---

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/sources` | List event sources with sync status |
| GET | `/api/events` | List events with filters |
| GET | `/api/events/today` | Today's events |
| GET | `/api/events/upcoming` | Next 7 days |
| GET | `/api/events/:id` | Single event by ID |
| GET | `/cal/events.ics` | iCal feed |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `section` | string | `downtown` or `fort_bragg` |
| `source` | string | Source ID (e.g., `distinctly_fayetteville`) |
| `from` | ISO date | Start date filter |
| `to` | ISO date | End date filter |
| `limit` | number | Max results (default: 100) |
| `offset` | number | Pagination offset |

### Example Requests

```bash
# Get all upcoming events
curl "https://downtown-guide.wemea-5ahhf.workers.dev/api/events"

# Get Fort Bragg events
curl "https://downtown-guide.wemea-5ahhf.workers.dev/api/events?section=fort_bragg"

# Get events from a specific source
curl "https://downtown-guide.wemea-5ahhf.workers.dev/api/events?source=distinctly_fayetteville"

# Get events in a date range
curl "https://downtown-guide.wemea-5ahhf.workers.dev/api/events?from=2025-01-01&to=2025-01-31"
```

---

## Local Development

### Prerequisites

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Cloudflare account

### Setup

```bash
# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login

# Run locally
npx wrangler dev
```

### Sync Events

```bash
# Sync all sources (console output)
npx tsx scripts/sync-all-events.ts

# Sync and write to D1 database
npx tsx scripts/sync-all-events.ts --db

# Sync specific source
npx tsx scripts/sync-all-events.ts --source=distinctly --db

# Export to JSON
npx tsx scripts/sync-all-events.ts --json > events.json
```

### Deploy

```bash
npx wrangler deploy
```

---

## Infrastructure

| Resource | Name | URL/ID |
|----------|------|--------|
| **Pages** (Frontend) | `fayetteville-events` | [fayetteville-events.pages.dev](https://fayetteville-events.pages.dev) |
| **Worker** (API) | `downtown-guide` | [downtown-guide.wemea-5ahhf.workers.dev](https://downtown-guide.wemea-5ahhf.workers.dev) |
| **D1 Database** | `downtown-events` | `fd953a64-4f1a-452c-aac4-84ad28c68370` |
| **R2 Bucket** | `downtown-raw-data` | - |

### Database Tables

- `sources` - Event source registry with sync status
- `events` - Unified event storage
- `venues` - Normalized venue data
- `raw_scrapes` - Sync logs and raw data references
- `pending_events` - Community submissions (Phase 4)
- `reminder_log` - Discord notification tracking

---

## Discord Integration

Event reminders are sent via Discord webhook:
- **1 week before** events (orange embed)
- **1 day before** events (red embed)

```bash
# Test reminders (dry run)
npx tsx scripts/send-discord-reminders.ts --dry-run

# Send reminders
npx tsx scripts/send-discord-reminders.ts
```

See [docs/DISCORD_WEBHOOK_REMINDERS.md](docs/DISCORD_WEBHOOK_REMINDERS.md) for setup.

---

## Documentation

- [Event Sources](docs/README.md) - Integration docs for each source
- [Discord Reminders](docs/DISCORD_WEBHOOK_REMINDERS.md) - Webhook setup
- [UI Style Guide](UI_STYLE_GUIDE.md) - Fayetteville design system
- [Database Schema](SCHEMA.md) - D1 tables and queries
- [Roadmap](ROADMAP.md) - Project phases and progress
- [Git Workflow](guides/GIT_WORKFLOW.md) - Contributing guidelines
- [Best Practices](guides/BEST_PRACTICES.md) - Engineering standards

---

## Project Structure

```
├── src/
│   └── index.ts              # Cloudflare Worker (API)
├── web/                      # React Frontend (Cloudflare Pages)
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   └── lib/              # API client, utils, types
│   └── public/
├── scripts/
│   ├── sync-all-events.ts        # Multi-source sync
│   └── send-discord-reminders.ts # Discord notifications
├── migrations/
│   └── 0000_initial.sql      # D1 schema
├── docs/                     # Source integration docs
├── guides/                   # Engineering guides
├── UI_STYLE_GUIDE.md         # Fayetteville design system
├── wrangler.toml             # Worker config
└── package.json
```

---

## License

MIT
