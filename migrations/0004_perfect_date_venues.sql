-- Migration: Add fields for Perfect Date planning
-- Description: Adds venue metadata for date planning and tables for date plans
-- Date: 2026-01-02

-- 1. Venue Enhancement for Date Planning
-- Note: 'venue_type', 'parking_info', 'accessibility_info' already exist from 0002

ALTER TABLE venues ADD COLUMN category TEXT;          -- Broader category: 'food', 'drink', 'activity', 'nature'
ALTER TABLE venues ADD COLUMN subcategory TEXT;       -- Specifics: 'italian', 'cocktail_bar', 'hiking_trail'
ALTER TABLE venues ADD COLUMN price_level INTEGER;    -- 1-4 ($ to $$$$)
ALTER TABLE venues ADD COLUMN average_cost INTEGER;   -- Estimated spend per person
ALTER TABLE venues ADD COLUMN romantic_score INTEGER; -- 1-100 or 1-5 (using 1-5 per roadmap)
ALTER TABLE venues ADD COLUMN vibe TEXT;              -- JSON array: ["cozy", "loud", "intimate"]
ALTER TABLE venues ADD COLUMN noise_level TEXT;       -- 'quiet', 'moderate', 'loud'
ALTER TABLE venues ADD COLUMN best_time TEXT;         -- JSON array: ["sunset", "late_night", "weekend_brunch"]
ALTER TABLE venues ADD COLUMN good_for TEXT;          -- JSON array: ["first_date", "anniversary", "groups"]
ALTER TABLE venues ADD COLUMN cuisine_type TEXT;      -- Primary cuisine for restaurants

-- Logistics & Amenities
ALTER TABLE venues ADD COLUMN reservation_required BOOLEAN DEFAULT 0;
ALTER TABLE venues ADD COLUMN outdoor_seating BOOLEAN DEFAULT 0;
ALTER TABLE venues ADD COLUMN alcohol_served BOOLEAN DEFAULT 0;
ALTER TABLE venues ADD COLUMN kid_friendly BOOLEAN DEFAULT 0;
ALTER TABLE venues ADD COLUMN wheelchair_accessible BOOLEAN DEFAULT 0; -- Explicit boolean
ALTER TABLE venues ADD COLUMN safety_info TEXT;       -- Notes on lighting, cell service, crowd levels

-- External Data / Validation
ALTER TABLE venues ADD COLUMN rating REAL;            -- Aggregate rating (0.0 - 5.0)
ALTER TABLE venues ADD COLUMN review_count INTEGER;   -- Number of reviews
ALTER TABLE venues ADD COLUMN menu_url TEXT;
ALTER TABLE venues ADD COLUMN reservation_url TEXT;
ALTER TABLE venues ADD COLUMN photos TEXT;            -- JSON array of photo URLs
ALTER TABLE venues ADD COLUMN data_source TEXT;       -- 'manual', 'google_places', 'yelp', 'scrape'
ALTER TABLE venues ADD COLUMN last_verified DATE;

-- 2. Date Templates (Curated logic)
CREATE TABLE IF NOT EXISTS date_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  event_types TEXT,          -- JSON: ["first_date", "anniversary"]
  duration_hours INTEGER,
  budget_range TEXT,         -- "budget", "moderate", "upscale"
  vibes TEXT,               -- JSON: ["romantic", "adventurous"]
  venue_sequence TEXT,      -- JSON: ["dinner", "activity", "dessert"] (types of venues)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Saved Date Plans (User generated)
CREATE TABLE IF NOT EXISTS saved_dates (
  id TEXT PRIMARY KEY,
  user_id TEXT,              -- UUID or Session ID
  title TEXT,
  venues TEXT,               -- JSON array of venue_ids
  events TEXT,               -- JSON array of event_ids
  notes TEXT,
  scheduled_date DATE,
  budget INTEGER,
  conversation_starters TEXT, -- JSON array of strings
  share_id TEXT UNIQUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_venues_category ON venues(category);
ALTER TABLE venues ADD COLUMN date_friendly BOOLEAN DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_venues_date_friendly ON venues(date_friendly);
