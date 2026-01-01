-- Migration: Enhance venues table for location enrichment
-- Date: 2025-12-31
-- Description: Add additional fields to venues for richer location data

-- Add new columns to venues table
ALTER TABLE venues ADD COLUMN short_name TEXT;           -- Short display name (e.g., "Segra" instead of "Segra Stadium")
ALTER TABLE venues ADD COLUMN description TEXT;          -- Brief description of the venue
ALTER TABLE venues ADD COLUMN phone TEXT;                -- Contact phone number
ALTER TABLE venues ADD COLUMN website TEXT;              -- Venue website URL
ALTER TABLE venues ADD COLUMN capacity INTEGER;          -- Seating/standing capacity
ALTER TABLE venues ADD COLUMN venue_type TEXT;           -- Type: 'stadium', 'theater', 'park', 'arena', 'restaurant', 'bar', 'museum', 'library', 'church', 'other'
ALTER TABLE venues ADD COLUMN parking_info TEXT;         -- Parking details
ALTER TABLE venues ADD COLUMN accessibility_info TEXT;   -- Accessibility features
ALTER TABLE venues ADD COLUMN image_url TEXT;            -- Venue photo
ALTER TABLE venues ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for faster name lookups
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);
CREATE INDEX IF NOT EXISTS idx_venues_name_lower ON venues(LOWER(name));

-- Create a venue aliases table for matching different name variations
CREATE TABLE IF NOT EXISTS venue_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,                    -- Alternative name (e.g., "Crown Center", "Crown Arena")
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(alias)
);

CREATE INDEX IF NOT EXISTS idx_venue_aliases_alias ON venue_aliases(LOWER(alias));
CREATE INDEX IF NOT EXISTS idx_venue_aliases_venue_id ON venue_aliases(venue_id);
