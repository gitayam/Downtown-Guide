-- Migration: 0001_sync_improvements.sql
-- Purpose: Add columns for better sync change detection and cleanup

-- 1. Add content_hash for change detection (MD5 of key fields)
ALTER TABLE events ADD COLUMN content_hash TEXT;

-- 2. Add last_seen_at to track when event was last seen in a sync
ALTER TABLE events ADD COLUMN last_seen_at TIMESTAMP;

-- 3. Add featured flag for manually promoted events
ALTER TABLE events ADD COLUMN featured BOOLEAN DEFAULT FALSE;

-- 4. Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_events_last_seen ON events(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- 5. Initialize last_seen_at for existing events
UPDATE events SET last_seen_at = updated_at WHERE last_seen_at IS NULL;

-- 6. Add sync_runs table to track sync history
CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  source_id TEXT REFERENCES sources(id),
  events_found INTEGER DEFAULT 0,
  events_inserted INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_unchanged INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running', -- 'running', 'success', 'error'
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_source ON sync_runs(source_id);
CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON sync_runs(started_at);
