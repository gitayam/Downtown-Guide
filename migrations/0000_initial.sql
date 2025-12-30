-- Migration: 0000_initial.sql

-- 1. Sources Table: Tracks where events come from
CREATE TABLE sources (
  id TEXT PRIMARY KEY,           -- e.g., 'segra', 'downtown', 'dogwood'
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

-- Seed initial sources
INSERT INTO sources (id, name, url, type, section) VALUES
('visit_downtown', 'Visit Downtown Fayetteville', 'https://visitdowntownfayetteville.com/wp-json/ee/v4.8.36/events', 'api', 'downtown'),
('segra_stadium', 'Segra Stadium', 'https://www.segrastadium.com/events-tickets?format=json', 'json', 'downtown'),
('dogwood_festival', 'Dogwood Festival', 'https://www.thedogwoodfestival.com/2025-2026-events', 'scrape', 'downtown'),
('distinctly_fayetteville', 'Distinctly Fayetteville', 'https://www.distinctlyfayettevillenc.com/event/rss/', 'rss', 'downtown'),
('fort_liberty_mwr', 'Fort Liberty MWR', 'https://bragg.armymwr.com/calendar', 'scrape', 'fort_bragg');

-- 2. Venues Table: Normalized locations
CREATE TABLE venues (
  id TEXT PRIMARY KEY,           -- e.g., 'segra_stadium', 'festival_park'
  source_id TEXT REFERENCES sources(id),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT DEFAULT 'Fayetteville',
  state TEXT DEFAULT 'NC',
  zip TEXT,
  latitude REAL,
  longitude REAL,
  google_maps_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Events Table: The core calendar data
CREATE TABLE events (
  id TEXT PRIMARY KEY,           -- Composite: source_id + external_id
  source_id TEXT NOT NULL REFERENCES sources(id),
  external_id TEXT NOT NULL,     -- ID from the remote system
  
  title TEXT NOT NULL,
  description TEXT,
  
  start_datetime TIMESTAMP NOT NULL, -- ISO 8601
  end_datetime TIMESTAMP NOT NULL,   -- ISO 8601
  
  venue_id TEXT REFERENCES venues(id),
  location_name TEXT,            -- Fallback if venue_id is null
  
  url TEXT,                      -- Link to event page
  ticket_url TEXT,               -- Link to buy tickets
  image_url TEXT,                -- Event poster/image
  
  categories TEXT,               -- JSON array of tags/categories
  tags TEXT,                     -- JSON array of tags
  
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'tentative'
  section TEXT NOT NULL DEFAULT 'downtown', -- 'downtown' or 'fort_bragg'

  raw_data TEXT,                 -- JSON dump of original data for debugging

  last_modified TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(source_id, external_id)
);

-- Indexes for performance
CREATE INDEX idx_events_dates ON events(start_datetime, end_datetime);
CREATE INDEX idx_events_source ON events(source_id);
CREATE INDEX idx_events_section ON events(section);
CREATE INDEX idx_events_venue ON venues(id);

-- 4. Raw Scrapes Table: The "Data Lake" for debugging parsers
CREATE TABLE raw_scrapes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL REFERENCES sources(id),
  scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL,          -- 'success', 'error'
  items_found INTEGER DEFAULT 0,
  raw_content_url TEXT,          -- R2 URL if stored there
  log_message TEXT
);

-- 5. Pending Events: For community submissions (Phase 4)
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

-- 6. Reminder Log: Track sent Discord notifications
CREATE TABLE reminder_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL REFERENCES events(id),
  reminder_type TEXT NOT NULL,   -- '1_week', '1_day', 'new_event'
  channel TEXT NOT NULL,         -- 'discord', 'email', 'sms'
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL,          -- 'sent', 'failed'
  message_id TEXT,               -- Discord message ID for reference
  error_message TEXT,
  UNIQUE(event_id, reminder_type, channel)
);

CREATE INDEX idx_reminder_event ON reminder_log(event_id);
CREATE INDEX idx_reminder_type ON reminder_log(reminder_type);
