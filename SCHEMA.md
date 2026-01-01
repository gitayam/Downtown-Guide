# Database Schema

**D1 Database:** `downtown-events`
**Database ID:** `fd953a64-4f1a-452c-aac4-84ad28c68370`

---

## Tables Overview

| Table | Description | Rows |
|-------|-------------|------|
| `sources` | Event source registry | 5 |
| `events` | Unified event storage | ~50 |
| `venues` | Normalized venue data | - |
| `raw_scrapes` | Sync logs | - |
| `pending_events` | Community submissions | - |
| `reminder_log` | Notification tracking | - |

---

## sources

Registry of event sources with sync status tracking.

```sql
CREATE TABLE sources (
  id TEXT PRIMARY KEY,           -- e.g., 'distinctly_fayetteville'
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,            -- 'api', 'rss', 'scrape', 'json'
  section TEXT NOT NULL DEFAULT 'downtown', -- 'downtown' or 'fort_bragg'
  sync_interval_minutes INTEGER DEFAULT 60,
  last_sync TIMESTAMP,
  last_sync_status TEXT,         -- 'success', 'error'
  last_sync_count INTEGER,       -- number of events found
  is_active BOOLEAN DEFAULT TRUE
);
```

### Seeded Sources

| id | name | section | type |
|----|------|---------|------|
| `visit_downtown` | Visit Downtown Fayetteville | downtown | api |
| `segra_stadium` | Segra Stadium | downtown | json |
| `dogwood_festival` | Dogwood Festival | downtown | scrape |
| `distinctly_fayetteville` | Distinctly Fayetteville | downtown | rss |
| `fort_liberty_mwr` | Fort Liberty MWR | fort_bragg | scrape |

---

## events

Central event storage with unified schema.

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,           -- Composite: source_id + external_id
  source_id TEXT NOT NULL REFERENCES sources(id),
  external_id TEXT NOT NULL,     -- ID from the remote system

  title TEXT NOT NULL,
  description TEXT,

  start_datetime TIMESTAMP NOT NULL,
  end_datetime TIMESTAMP NOT NULL,

  venue_id TEXT REFERENCES venues(id),
  location_name TEXT,            -- Fallback if venue_id is null

  url TEXT,                      -- Link to event page
  ticket_url TEXT,               -- Link to buy tickets
  image_url TEXT,                -- Event poster/image

  categories TEXT,               -- JSON array
  tags TEXT,                     -- JSON array

  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'tentative'
  section TEXT NOT NULL DEFAULT 'downtown', -- 'downtown' or 'fort_bragg'

  raw_data TEXT,                 -- JSON dump of original data

  last_modified TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(source_id, external_id)
);

-- Indexes
CREATE INDEX idx_events_dates ON events(start_datetime, end_datetime);
CREATE INDEX idx_events_source ON events(source_id);
CREATE INDEX idx_events_section ON events(section);
```

### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | TEXT | Unique ID, format: `{source}_{external_id}` |
| `source_id` | TEXT | Foreign key to sources table |
| `section` | TEXT | `downtown` or `fort_bragg` |
| `start_datetime` | TIMESTAMP | ISO 8601 format |
| `categories` | TEXT | JSON array of strings |

---

## venues

Normalized venue data for location lookups.

```sql
CREATE TABLE venues (
  id TEXT PRIMARY KEY,           -- e.g., 'segra_stadium'
  source_id TEXT REFERENCES sources(id),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT DEFAULT 'Fayetteville',
  state TEXT DEFAULT 'NC',
  zip TEXT,
  latitude REAL,
  longitude REAL,
  google_maps_url TEXT,
  apple_maps_url TEXT,
  hours_of_operation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## raw_scrapes

Audit log of sync operations.

```sql
CREATE TABLE raw_scrapes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL REFERENCES sources(id),
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL,          -- 'success', 'error'
  items_found INTEGER DEFAULT 0,
  raw_content_url TEXT,          -- R2 URL if stored there
  log_message TEXT
);
```

---

## pending_events

Community-submitted events awaiting moderation (Phase 4).

```sql
CREATE TABLE pending_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submitter_email TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_datetime TIMESTAMP NOT NULL,
  end_datetime TIMESTAMP NOT NULL,
  venue_name TEXT,
  venue_address TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## reminder_log

Tracks sent notifications to prevent duplicates.

```sql
CREATE TABLE reminder_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES events(id),
  reminder_type TEXT NOT NULL,   -- '1_week', '1_day', 'new_event'
  channel TEXT NOT NULL,         -- 'discord', 'email', 'sms'
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL,          -- 'sent', 'failed'
  message_id TEXT,               -- Discord message ID
  error_message TEXT,
  UNIQUE(event_id, reminder_type, channel)
);

-- Indexes
CREATE INDEX idx_reminder_event ON reminder_log(event_id);
CREATE INDEX idx_reminder_type ON reminder_log(reminder_type);
```

---

## Common Queries

### Get upcoming events

```sql
SELECT e.*, s.name as source_name
FROM events e
LEFT JOIN sources s ON e.source_id = s.id
WHERE e.start_datetime >= datetime('now')
ORDER BY e.start_datetime ASC
LIMIT 50;
```

### Get events by section

```sql
SELECT * FROM events
WHERE section = 'fort_bragg'
  AND start_datetime >= datetime('now')
ORDER BY start_datetime ASC;
```

### Check source sync status

```sql
SELECT id, name, last_sync, last_sync_status, last_sync_count
FROM sources
ORDER BY last_sync DESC;
```

### Count events by source

```sql
SELECT source_id, COUNT(*) as count
FROM events
WHERE start_datetime >= datetime('now')
GROUP BY source_id;
```

---

## Wrangler Commands

```bash
# Execute query
npx wrangler d1 execute downtown-events --remote --command="SELECT * FROM sources;"

# Execute SQL file
npx wrangler d1 execute downtown-events --remote --file=migrations/0000_initial.sql

# List tables
npx wrangler d1 execute downtown-events --remote --command="SELECT name FROM sqlite_master WHERE type='table';"

# Export data
npx wrangler d1 export downtown-events --remote --output=backup.sql
```

---

*Last updated: December 30, 2025*
