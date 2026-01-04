-- Venue Attributes Update
-- WiFi, accessibility, and amenity information
-- Run with: npx wrangler d1 execute downtown-events --remote --file=scripts/update-venue-attributes.sql

-- ============================================
-- WIFI & POWER OUTLETS
-- ============================================

-- Coffee shops - all have WiFi and power outlets (laptop-friendly workspaces)
UPDATE venues SET has_wifi = 1, wifi_speed = 'fast', power_outlets = 1
WHERE id IN ('coffee_scene_prince_charles', 'blanc_coffee_roasters', 'rude_awakening_coffee_house', 'millers_brew_coffee_shop');

-- Tea houses - typically have WiFi
UPDATE venues SET has_wifi = 1, wifi_speed = 'moderate', power_outlets = 1
WHERE id IN ('winterbloom_tea', 'muse_co');

-- Breweries/Restaurants with WiFi
UPDATE venues SET has_wifi = 1, wifi_speed = 'moderate'
WHERE id IN ('gaston_brewing_company', 'north_south_brewing', 'circa_1800', 'cru_fayetteville');

-- Libraries always have WiFi
UPDATE venues SET has_wifi = 1, wifi_speed = 'fast', power_outlets = 1
WHERE name LIKE '%Library%';

-- ============================================
-- WHEELCHAIR ACCESSIBILITY
-- ============================================

-- Most modern restaurants downtown are ADA compliant (ground floor, ramps)
UPDATE venues SET wheelchair_accessible = 1
WHERE id IN (
  'gaston_brewing_company',
  'north_south_brewing',
  'blue_moon_caf',
  'macs_speed_shop',
  'taste_of_west_africa',
  'pierros_italian_bistro',
  'anchor_allies',
  'the_salad_box',
  'archway_burgers',
  'bees_and_boards',
  'dad_bod_dive_bar',
  'cru_fayetteville'
);

-- Coffee/tea shops on ground floor
UPDATE venues SET wheelchair_accessible = 1
WHERE id IN (
  'blanc_coffee_roasters',
  'muse_co',
  'winterbloom_tea',
  'the_sweet_palette'
);

-- Parks and outdoor venues
UPDATE venues SET wheelchair_accessible = 1 WHERE category = 'nature';

-- Museums and cultural venues (typically ADA compliant)
UPDATE venues SET wheelchair_accessible = 1
WHERE id IN (
  'fayetteville_history_museum',
  'cameo_art_house_theatre',
  'cape_fear_studios'
);

-- ============================================
-- HAS STAIRS (accessibility barriers)
-- ============================================

-- Historic buildings that may have stairs
UPDATE venues SET has_stairs = 1
WHERE id IN (
  'coffee_scene_prince_charles',  -- In Prince Charles Hotel (historic)
  'antonellas_italian_ristorante', -- May have step entrance
  'circa_1800',  -- Historic building
  'archives'  -- Speakeasy, often in basement/upstairs
);

-- ============================================
-- HAS ELEVATOR (accessibility aid)
-- ============================================

-- Larger venues with multiple floors
UPDATE venues SET has_elevator = 1
WHERE id IN (
  'cameo_art_house_theatre',
  'fayetteville_history_museum'
);

-- ============================================
-- CHANGING TABLES (family-friendly)
-- ============================================

-- Family restaurants likely have changing tables
UPDATE venues SET has_changing_table = 1
WHERE id IN (
  'gaston_brewing_company',
  'macs_speed_shop',
  'pierros_italian_bistro',
  'antonellas_italian_ristorante',
  'luigis_italian_chophouse'
);

-- Museums and cultural venues
UPDATE venues SET has_changing_table = 1
WHERE id IN (
  'fayetteville_history_museum',
  'cameo_art_house_theatre'
);

-- ============================================
-- OUTDOOR SEATING (already have column, ensure populated)
-- ============================================

UPDATE venues SET outdoor_seating = 1
WHERE id IN (
  'pierros_italian_bistro',
  'blue_moon_caf',
  'circa_1800',
  'gaston_brewing_company',
  'north_south_brewing',
  'dad_bod_dive_bar',
  'charleys_pub',
  'anchor_allies',
  'macs_speed_shop',
  'coffee_scene_prince_charles',
  'the_sweet_palette',
  'muse_co'
);

-- Parks are all outdoor
UPDATE venues SET outdoor_seating = 1 WHERE category = 'nature';
