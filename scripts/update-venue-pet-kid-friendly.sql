-- Pet-friendly and Kid-friendly venue updates
-- Based on research from BringFido, Yelp, TripAdvisor, and Distinctly Fayetteville
-- Run with: npx wrangler d1 execute downtown-events --remote --file=scripts/update-venue-pet-kid-friendly.sql

-- PET-FRIENDLY VENUES (outdoor patios that welcome dogs)

-- Restaurants with pet-friendly patios
UPDATE venues SET pet_friendly = 1 WHERE id = 'pierros_italian_bistro';
UPDATE venues SET pet_friendly = 1 WHERE id = 'blue_moon_caf';
UPDATE venues SET pet_friendly = 1 WHERE id = 'circa_1800';
UPDATE venues SET pet_friendly = 1 WHERE id = 'macs_speed_shop';
UPDATE venues SET pet_friendly = 1 WHERE id = 'anchor_allies';

-- Breweries (typically dog-friendly with outdoor space)
UPDATE venues SET pet_friendly = 1 WHERE id = 'gaston_brewing_company';
UPDATE venues SET pet_friendly = 1 WHERE id = 'north_south_brewing';

-- Bars with outdoor patios
UPDATE venues SET pet_friendly = 1 WHERE id = 'dad_bod_dive_bar';
UPDATE venues SET pet_friendly = 1 WHERE id = 'charleys_pub';

-- Parks and outdoor venues (obviously pet-friendly)
UPDATE venues SET pet_friendly = 1 WHERE category = 'nature';

-- KID-FRIENDLY VENUES (family appropriate, no 21+ requirement)

-- Family-friendly restaurants
UPDATE venues SET kid_friendly = 1 WHERE id = 'gaston_brewing_company';
UPDATE venues SET kid_friendly = 1 WHERE id = 'pierros_italian_bistro';
UPDATE venues SET kid_friendly = 1 WHERE id = 'antonellas_italian_ristorante';
UPDATE venues SET kid_friendly = 1 WHERE id = 'macs_speed_shop';
UPDATE venues SET kid_friendly = 1 WHERE id = 'anchor_allies';
UPDATE venues SET kid_friendly = 1 WHERE id = 'taste_of_west_africa';
UPDATE venues SET kid_friendly = 1 WHERE id = 'agora_restaurant';
UPDATE venues SET kid_friendly = 1 WHERE id = 'bees_and_boards';
UPDATE venues SET kid_friendly = 1 WHERE id = 'archway_burgers';
UPDATE venues SET kid_friendly = 1 WHERE id = 'luigis_italian_chophouse';
UPDATE venues SET kid_friendly = 1 WHERE id = 'fullers_old_fashioned_bbq';
UPDATE venues SET kid_friendly = 1 WHERE id = 'ichikaku_japanese_restaurant';
UPDATE venues SET kid_friendly = 1 WHERE id = 'mais_kitchen';
UPDATE venues SET kid_friendly = 1 WHERE id = 'the_salad_box';
UPDATE venues SET kid_friendly = 1 WHERE id = 'haymount_truck_stop';

-- Dessert shops (always kid-friendly)
UPDATE venues SET kid_friendly = 1 WHERE id = 'the_sweet_palette';

-- Coffee/Tea shops (typically kid-friendly)
UPDATE venues SET kid_friendly = 1 WHERE id = 'coffee_scene_prince_charles';
UPDATE venues SET kid_friendly = 1 WHERE id = 'blanc_coffee_roasters';
UPDATE venues SET kid_friendly = 1 WHERE id = 'muse_co';
UPDATE venues SET kid_friendly = 1 WHERE id = 'winterbloom_tea';
UPDATE venues SET kid_friendly = 1 WHERE id = 'millers_brew_coffee_shop';
UPDATE venues SET kid_friendly = 1 WHERE id = 'rude_awakening_coffee_house';

-- Cultural venues (museums, theaters, galleries - family appropriate)
UPDATE venues SET kid_friendly = 1 WHERE category = 'culture';

-- Parks and nature (family-friendly)
UPDATE venues SET kid_friendly = 1 WHERE category = 'nature';

-- Shopping (generally kid-friendly)
UPDATE venues SET kid_friendly = 1 WHERE category = 'shopping';

-- NOT kid-friendly (bars, speakeasies, dive bars, wine bars)
-- These should remain kid_friendly = 0 (default)
-- archives, charleys_pub, dad_bod_dive_bar, the_white_rabbit,
-- the_wine_caf, wana_navu_kava_bar, cru_fayetteville, district_house_of_taps
