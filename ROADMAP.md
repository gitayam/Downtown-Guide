# Fayetteville Central Calendar - Roadmap

A unified event calendar aggregating Downtown Fayetteville and Fort Liberty events into a single, community-focused platform.

---

## Vision

Create the go-to source for "What's happening in Fayetteville?" by aggregating events from multiple sources, eliminating the need to check 5+ websites to find local activities.

---

## Current State (Phase 0 Complete)

### Event Sources Integrated

|| Source | Section | Method | Status |
||--------|---------|--------|--------|
|| Visit Downtown Fayetteville | Downtown | REST API | ✅ Complete |
|| Segra Stadium | Downtown | JSON API | ✅ Complete |
|| Distinctly Fayetteville CVB | Downtown | RSS Feed | ✅ Complete |
|| Crown Complex | Downtown | Web Scraping | ✅ Complete |
|| Dogwood Festival | Downtown | Web Scraping | ✅ Complete |
|| Fort Liberty MWR | Fort Bragg | Web Scraping | ✅ Complete |

### Scripts Built
- ✅ `sync-all-events.ts` - Multi-source event aggregation
- ✅ `send-discord-reminders.ts` - Discord webhook notifications (1 week + 1 day)
- ✅ Unified event schema with section tagging (`downtown` / `fort_bragg`)
- ✅ Deduplication by title + date

### Documentation
- ✅ Source-specific integration docs (5 sources)
- ✅ Discord webhook setup guide
- ✅ Engineering best practices guides

---

## Phase 1: Edge Database & Persistence ✅

**Goal:** Store events in D1 database, enable scheduled syncs via Workers.

### Database Setup (D1)
- [x] Initialize `downtown-events` D1 database (`fd953a64-4f1a-452c-aac4-84ad28c68370`)
- [x] Create schema migration (6 tables: sources, events, venues, raw_scrapes, pending_events, reminder_log)
- [x] Apply migration via Wrangler
- [x] Seed 5 event sources

### Raw Data Backup (R2)
- [x] Create `downtown-raw-data` R2 bucket
- [ ] Save raw HTML/JSON before parsing (audit trail)
- [x] Configure Worker bindings

### Ingestion
- [x] Add `--db` flag to sync script for D1 writes
- [x] Implement upsert logic (ON CONFLICT DO UPDATE)
- [x] Source health monitoring (last_sync, last_sync_status, last_sync_count)
- [x] Hourly cron trigger configured (`0 * * * *`)
- [ ] Port full sync logic to Worker (currently CLI only)
- [ ] Add `is_deleted` soft-delete for removed events

### Deduplication Enhancement
- [ ] Fuzzy title matching (Levenshtein distance)
- [ ] Link duplicates to canonical record
- [ ] Priority ranking: Distinctly > Downtown > Segra > Dogwood

---

## Phase 2: Events API ✅

**Goal:** Expose events via REST API and calendar feeds.

**Live URL:** `https://downtown-guide.wemea-5ahhf.workers.dev`

### REST API Endpoints
- [x] `GET /api/events` - List with filters:
  - `?section=downtown|fort_bragg|all`
  - `?from=2025-01-01&to=2025-01-31`
  - `?source=distinctly_fayetteville`
  - `?limit=50&offset=0`
- [x] `GET /api/events/:id` - Single event details
- [x] `GET /api/events/today` - Today's events
- [x] `GET /api/events/upcoming` - Next 7 days
- [x] `GET /api/events/weekend` - Fri-Sun events
- [x] `GET /api/sources` - Source status & health
- [x] `GET /api/health` - Health check

### Calendar Feeds
- [x] `GET /cal/events.ics` - iCal feed (supports `?section=` filter)
- [x] Category-based subscriptions (`?category=Live%20Music` or `?categories=Arts,Music`)
- [ ] Separate feeds per section (downtown.ics, fortbragg.ics)

### RSS Feeds
- [ ] `GET /feed/events.rss` - RSS 2.0 feed
- [ ] `GET /feed/events.atom` - Atom feed

### Security & Performance
- [x] CORS whitelist (ncfayetteville.com, pages.dev, localhost)
- [x] Rate limiting (100 requests/minute per IP)
- [x] Security headers (CSP, X-Content-Type-Options, X-Frame-Options)
- [x] 5-minute edge cache (Hono cache middleware)
- [ ] Version-based invalidation on sync
- [ ] Stale-while-revalidate for resilience

---

## Phase 3: Web Interface ("City Portal") ✅

**Goal:** Mobile-first calendar website for Fayetteville residents.

**Live URL:** `https://fayetteville-events.pages.dev`

### Project Setup
- [x] Initialize React + Vite project (Cloudflare Pages)
- [x] Configure Tailwind CSS v4 with Fayetteville theme
- [x] Set up deployment pipeline (`npm run deploy`)
- [x] Create UI Style Guide (`UI_STYLE_GUIDE.md`)

### Homepage
- [x] Section tabs: Downtown | Fort Liberty | All
- [x] Time-based grouping:
  - 🔥 TODAY
  - ⚡ TOMORROW
  - 📅 THIS WEEK
  - 🗓️ COMING UP
- [x] Event cards with images
- [x] "Subscribe to Calendar" CTA

### Event Pages
- [x] Event detail pages (`/events/:id`)
- [x] Full description, images, venue info
- [x] Map with venue marker (Leaflet, shows when coordinates available)
- [x] "Add to Calendar" button (Google Calendar)
- [x] "Get Directions" modal (Google Maps, Apple Maps)
- [x] Source attribution
- [x] Share functionality
- [x] Dynamic Open Graph meta tags for social sharing
- [x] Schema.org JSON-LD structured data for SEO

### Calendar Subscribe Page
- [x] iCal subscription instructions
- [x] Copy-to-clipboard for URLs
- [x] Platform-specific guides (iPhone, Google, Outlook, Android)

### Filtering & Search
- [x] Section filtering (Downtown / Fort Liberty / All)
- [x] Date range picker (Today, Tomorrow, Weekend, All, Custom Range)
- [x] Search bar with text search
- [x] Category filter dropdown
- [ ] Venue filter dropdown
- [ ] Free events toggle

### Views
- [x] List view (default, mobile-optimized)
- [x] Calendar grid view
- [x] Map view with clustered markers (Leaflet + MarkerCluster)

---

## Phase 4: Discord & Notifications

**Goal:** Automated community notifications across channels.

### Discord Enhancements
- [ ] Migrate `send-discord-reminders.ts` to Scheduled Worker
- [ ] Channel-specific posts:
  - `#downtown-events` for Downtown section
  - `#fort-liberty-events` for Fort Bragg section
- [ ] Weekly digest (Sunday 6pm): "This Week in Fayetteville"
- [ ] Weekend preview (Friday 10am): "This Weekend"
- [ ] New event announcements (immediate)

### Reminder Tracking
- [ ] Store sent reminders in `reminder_log` table
- [ ] Prevent duplicate sends
- [ ] Track engagement (if Discord provides stats)

### Future Channels
- [ ] Email newsletter (weekly digest)
- [ ] SMS opt-in (Twilio, major events only)
- [ ] Push notifications (PWA)

---

## Phase 5: Community & Admin

**Goal:** Enable community event submissions with moderation.

### Discord Bot Event Submission (Priority)
- [ ] `/submit-event` slash command in Discord
- [ ] Interactive modal form:
  - Title (required)
  - Date/time picker (required)
  - Location/venue (required)
  - Description (required)
  - Ticket URL (optional)
  - Image URL (optional)
- [ ] Submit to moderation queue (`pending_events` table)
- [ ] Admin notification in `#event-submissions` channel
- [ ] Approve/Reject buttons for moderators
- [ ] Confirmation DM to submitter on approval
- [ ] Auto-publish approved events to main calendar

### Web Form Submission (Later)
- [ ] "Submit Your Event" form on website
- [ ] Required: Title, date, time, venue, description
- [ ] Optional: Image upload (R2 presigned URLs), ticket link
- [ ] Captcha/rate limiting
- [ ] Integration with same moderation queue

### Moderation Queue
- [ ] Admin-only review interface (web)
- [ ] Approve / Reject / Edit workflow
- [ ] Discord notification for new submissions
- [ ] Email confirmation to submitter

### Organizer Accounts (Future)
- [ ] Verified organizer status
- [ ] Direct event posting (no moderation)
- [ ] Event performance analytics

---

## Phase 6: Intelligence & Analytics

### Site Analytics
- [ ] Cloudflare Web Analytics integration
- [ ] Popular events tracking
- [ ] Search term analysis

### Source Monitoring
- [ ] Sync success/failure rates
- [ ] Events per source over time
- [ ] Stale data alerts (no new events in X days)

### Future: AI Features
- [ ] Natural language search ("family events this weekend")
- [ ] Auto-categorization of scraped events
- [ ] Event description summarization

---

## Future Event Sources (Backlog)

### Downtown Fayetteville
- [ ] Cape Fear Botanical Garden
- [ ] Fayetteville Area Transportation Museum
- [ ] Arts Council of Fayetteville
- [ ] Local breweries (Huske Hardware, Mash House)
- [ ] Cameo Art House Theatre

### Greater Fayetteville
- [ ] Crown Complex / Coliseum
- [ ] Methodist University
- [ ] Fayetteville State University
- [ ] Cumberland County Public Library
- [ ] Fayetteville Woodpeckers (if separate from Segra)

### Regional ("Worth the Drive")
- [ ] Raleigh/Durham major events
- [ ] Wilmington beach events
- [ ] Pinehurst golf events

---

## Technical Maintenance

### Ongoing Tasks
- [ ] Update Dogwood Festival URL annually (`/2026-2027-events`)
- [ ] Monitor Segra off-season (Oct-Feb typically empty)
- [ ] Respect rate limits on scraped sources
- [ ] Dependency updates (monthly)

### Resilience
- [ ] Source failover (one failure doesn't block others)
- [ ] Graceful degradation (show cached data if sync fails)
- [ ] Health check endpoint (`/api/health`)

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Event sources | 5 | 10+ |
| Active events | ~50 | 100+ |
| Sync reliability | - | 99%+ |
| API response time | - | <200ms |
| Discord members | - | 500+ |
| Weekly site visitors | - | 1,000+ |
| Calendar subscribers | - | 200+ |

---

## Quick Links

- [Event Sources Documentation](docs/README.md)
- [Discord Integration Guide](docs/DISCORD_WEBHOOK_REMINDERS.md)
- [Git Workflow](guides/GIT_WORKFLOW.md)
- [Best Practices](guides/BEST_PRACTICES.md)

---

*Last updated: January 1, 2026*
