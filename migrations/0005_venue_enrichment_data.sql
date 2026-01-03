-- Migration: Venue Enrichment Data Only
-- Run after columns exist

-- FOOD VENUES
UPDATE venues SET category = 'food', subcategory = 'italian', price_level = 3, average_cost = 45, romantic_score = 5, vibe = '["romantic", "upscale", "intimate"]', good_for = '["anniversary", "date_night", "special_occasion"]', best_time = '["evening"]', typical_duration = 90 WHERE id = 'antonellas_italian_ristorante';

UPDATE venues SET category = 'food', subcategory = 'cafe', price_level = 2, average_cost = 20, romantic_score = 3, vibe = '["casual", "relaxed", "eclectic"]', good_for = '["lunch", "first_date", "friends"]', best_time = '["morning", "afternoon"]', typical_duration = 60 WHERE id = 'blue_moon_caf';

UPDATE venues SET category = 'food', subcategory = 'southern', price_level = 3, average_cost = 50, romantic_score = 5, vibe = '["romantic", "cozy", "upscale"]', good_for = '["dinner", "anniversary", "foodies"]', best_time = '["evening"]', typical_duration = 90 WHERE id = 'circa_1800';

UPDATE venues SET category = 'food', subcategory = 'italian', price_level = 4, average_cost = 65, romantic_score = 5, vibe = '["upscale", "romantic", "sophisticated"]', good_for = '["anniversary", "special_occasion", "fine_dining"]', best_time = '["evening"]', typical_duration = 120 WHERE id = 'luigis_italian_chophouse';

-- DRINK VENUES
UPDATE venues SET category = 'drink', subcategory = 'brewery', price_level = 2, average_cost = 25, romantic_score = 3, vibe = '["lively", "casual", "fun"]', good_for = '["drinks", "dinner", "friends"]', best_time = '["afternoon", "evening"]', typical_duration = 75 WHERE id = 'gaston_brewing_company';

UPDATE venues SET category = 'drink', subcategory = 'brewery', price_level = 2, average_cost = 25, romantic_score = 3, vibe = '["casual", "craft_beer", "relaxed"]', good_for = '["drinks", "conversation", "friends"]', best_time = '["afternoon", "evening"]', typical_duration = 60 WHERE id = 'huske_hardware_house';

UPDATE venues SET category = 'drink', subcategory = 'brewery', price_level = 2, average_cost = 30, romantic_score = 4, vibe = '["romantic", "intimate", "craft_beer"]', good_for = '["drinks", "conversation", "date_night"]', best_time = '["evening"]', typical_duration = 60 WHERE id = 'dirtbag_ales';

-- NATURE VENUES
UPDATE venues SET price_level = 1, average_cost = 0, vibe = '["outdoors", "scenic", "peaceful"]', best_time = '["morning", "afternoon"]', typical_duration = 90 WHERE id = 'cape_fear_river_trail';

UPDATE venues SET price_level = 1, average_cost = 0, vibe = '["outdoors", "peaceful", "historic"]', best_time = '["morning", "afternoon"]', typical_duration = 120 WHERE id = 'carvers_creek_state_park';

UPDATE venues SET price_level = 1, average_cost = 0, vibe = '["outdoors", "adventurous", "scenic"]', best_time = '["morning", "afternoon"]', typical_duration = 180 WHERE id = 'raven_rock_state_park';

UPDATE venues SET price_level = 2, average_cost = 15, vibe = '["romantic", "peaceful", "scenic"]', best_time = '["morning", "afternoon"]', typical_duration = 90 WHERE id = 'cape_fear_botanical_garden';

UPDATE venues SET price_level = 1, average_cost = 0, vibe = '["casual", "outdoors", "educational"]', best_time = '["morning", "afternoon"]', typical_duration = 60 WHERE id = 'j_bayard_clark_park_nature_center';

-- ACTIVITY VENUES
UPDATE venues SET price_level = 3, average_cost = 80, vibe = '["adventurous", "thrilling", "unique"]', best_time = '["morning", "afternoon"]', typical_duration = 180 WHERE id = 'zipquest_waterfall_treetop_adventure';

UPDATE venues SET category = 'activity', subcategory = 'museum', price_level = 1, average_cost = 10, romantic_score = 2, vibe = '["playful", "family", "interactive"]', good_for = '["family_date", "playful"]', best_time = '["morning", "afternoon"]', typical_duration = 90 WHERE id = 'fascinate-u_childrens_museum';

UPDATE venues SET category = 'activity', subcategory = 'entertainment', price_level = 2, average_cost = 35, romantic_score = 3, vibe = '["fun", "active", "playful"]', good_for = '["friends", "fun_date", "games"]', best_time = '["afternoon", "evening"]', typical_duration = 120 WHERE id = 'group_therapy_pub';

-- CULTURE VENUES
UPDATE venues SET category = 'culture', subcategory = 'theatre', price_level = 2, average_cost = 15, romantic_score = 4, vibe = '["cultural", "artsy", "intimate"]', good_for = '["culture", "movie_date", "artsy"]', best_time = '["evening"]', typical_duration = 120 WHERE id = 'cameo_art_house';

UPDATE venues SET price_level = 2, average_cost = 25, vibe = '["cultural", "artsy", "outdoor"]', best_time = '["evening"]', typical_duration = 150 WHERE id = 'sweet_tea_shakespeare';

UPDATE venues SET category = 'culture', subcategory = 'bookstore', price_level = 1, average_cost = 0, romantic_score = 3, vibe = '["artsy", "quiet", "intellectual"]', good_for = '["browsing", "culture", "rainy_day"]', best_time = '["morning", "afternoon"]', typical_duration = 45 WHERE id = 'city_center_gallery';

UPDATE venues SET category = 'culture', subcategory = 'museum', price_level = 1, average_cost = 5, romantic_score = 2, vibe = '["educational", "historic", "quiet"]', good_for = '["culture", "history_buffs"]', best_time = '["morning", "afternoon"]', typical_duration = 60 WHERE id = 'fayetteville_history_museum';

-- ENTERTAINMENT VENUES
UPDATE venues SET category = 'entertainment', subcategory = 'arena', price_level = 2, average_cost = 30, romantic_score = 2, vibe = '["exciting", "lively", "sports"]', good_for = '["sports", "concerts", "fun_date"]', best_time = '["evening"]', typical_duration = 180 WHERE id = 'segra_stadium';

UPDATE venues SET category = 'entertainment', subcategory = 'arena', price_level = 3, average_cost = 50, romantic_score = 2, vibe = '["exciting", "lively", "entertainment"]', good_for = '["concerts", "sports", "shows"]', best_time = '["evening"]', typical_duration = 150 WHERE id = 'crown_coliseum';

UPDATE venues SET category = 'entertainment', subcategory = 'convention', price_level = 2, average_cost = 15, romantic_score = 1, vibe = '["varied", "events"]', good_for = '["expos", "conventions"]', best_time = '["morning", "afternoon"]', typical_duration = 180 WHERE id = 'crown_expo';

UPDATE venues SET category = 'entertainment', subcategory = 'theatre', price_level = 2, average_cost = 40, romantic_score = 4, vibe = '["cultural", "intimate", "entertainment"]', good_for = '["concerts", "comedy", "shows"]', best_time = '["evening"]', typical_duration = 120 WHERE id = 'crown_theatre';

UPDATE venues SET category = 'entertainment', subcategory = 'outdoor', price_level = 1, average_cost = 0, romantic_score = 3, vibe = '["festive", "outdoor", "community"]', good_for = '["festivals", "events", "family"]', best_time = '["morning", "afternoon", "evening"]', typical_duration = 180 WHERE id = 'festival_park';

UPDATE venues SET category = 'entertainment', subcategory = 'nightclub', price_level = 2, average_cost = 20, romantic_score = 2, vibe = '["lively", "dancing", "nightlife"]', good_for = '["dancing", "nightlife", "friends"]', best_time = '["evening"]', typical_duration = 120 WHERE id = 'club_luna';

UPDATE venues SET category = 'entertainment', subcategory = 'racetrack', price_level = 2, average_cost = 20, romantic_score = 2, vibe = '["exciting", "loud", "unique"]', good_for = '["racing", "unique_date", "adventurous"]', best_time = '["evening"]', typical_duration = 180 WHERE id = 'fayetteville_speedway';

-- MISC VENUES
UPDATE venues SET category = 'food', subcategory = 'food_truck', price_level = 1, average_cost = 15, romantic_score = 2, vibe = '["casual", "outdoor", "varied"]', good_for = '["casual_bite", "drinks", "friends"]', best_time = '["afternoon", "evening"]', typical_duration = 60 WHERE id = 'haymount_truck_stop';

UPDATE venues SET category = 'activity', subcategory = 'bowling', price_level = 1, average_cost = 15, romantic_score = 2, vibe = '["fun", "casual", "active"]', good_for = '["fun_date", "friends", "family"]', best_time = '["afternoon", "evening"]', typical_duration = 90 WHERE id = 'dragon_lanes';

UPDATE venues SET category = 'activity', subcategory = 'golf', price_level = 3, average_cost = 60, romantic_score = 3, vibe = '["upscale", "relaxed", "active"]', good_for = '["golf", "special_occasion"]', best_time = '["morning", "afternoon"]', typical_duration = 240 WHERE id = 'gates_four';

UPDATE venues SET category = 'shopping', subcategory = 'specialty', price_level = 2, average_cost = 0, romantic_score = 2, vibe = '["unique", "quirky", "artsy"]', good_for = '["browsing", "unique_finds"]', best_time = '["afternoon"]', typical_duration = 30 WHERE id = 'garnet_skull';

UPDATE venues SET category = 'culture', subcategory = 'historic', price_level = 1, average_cost = 0, romantic_score = 3, vibe = '["quiet", "historic", "reflective"]', good_for = '["history_buffs", "quiet_walk"]', best_time = '["morning", "afternoon"]', typical_duration = 30 WHERE id = 'cross_creek_cemetery';

-- Defaults for remaining
UPDATE venues SET
  category = COALESCE(category, 'other'),
  price_level = COALESCE(price_level, 2),
  average_cost = COALESCE(average_cost, 20),
  romantic_score = COALESCE(romantic_score, 3),
  vibe = CASE WHEN vibe IS NULL OR vibe = '[]' THEN '["casual"]' ELSE vibe END,
  good_for = CASE WHEN good_for IS NULL OR good_for = '[]' THEN '["general"]' ELSE good_for END,
  best_time = COALESCE(best_time, '["afternoon", "evening"]'),
  typical_duration = COALESCE(typical_duration, 60)
WHERE best_time IS NULL OR typical_duration IS NULL OR category IS NULL;
