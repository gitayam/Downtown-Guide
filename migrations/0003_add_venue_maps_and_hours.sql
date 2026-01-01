-- Migration: Add Apple Maps and hours to venues
-- Date: 2025-12-31
-- Description: Add apple_maps_url and hours_of_operation to venues table

ALTER TABLE venues ADD COLUMN apple_maps_url TEXT;       -- Direct Apple Maps link
ALTER TABLE venues ADD COLUMN hours_of_operation TEXT;   -- Structured or free-text hours
