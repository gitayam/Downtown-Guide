-- Venue Hours Updates - Researched January 2025
-- Run with: npx wrangler d1 execute downtown-events --remote --file=scripts/update-venue-hours.sql

-- DRINK VENUES

-- Coffee Scene at The Prince Charles (closes early - NOT suitable for nightcap)
UPDATE venues SET
  hours_of_operation = 'Mon-Wed: 7am-3pm, Thu-Fri: 7am-5pm, Sat: 8am-5pm, Sun: 9am-5pm',
  best_time = '["morning", "afternoon"]'
WHERE id = 'coffee_scene_prince_charles';

-- Blanc Coffee Roasters (closes early)
UPDATE venues SET
  hours_of_operation = 'Mon: Closed, Tue: 8am-12pm, Wed-Sat: 8am-4pm, Sun: 9am-2pm',
  best_time = '["morning", "afternoon"]'
WHERE id = 'blanc_coffee_roasters';

-- Charley's Pub (open late - good for nightcap)
UPDATE venues SET
  hours_of_operation = 'Mon-Thu: 3pm-12am, Fri-Sat: 3pm-2am, Sun: Closed',
  best_time = '["evening", "night"]'
WHERE id = 'charleys_pub';

-- Dad Bod Dive Bar (open late on weekends)
UPDATE venues SET
  hours_of_operation = 'Mon-Wed: Closed, Thu: 4pm-9pm, Fri: 5pm-1am, Sat: 1pm-2am, Sun: 1pm-8pm',
  best_time = '["evening", "night"]'
WHERE id = 'dad_bod_dive_bar';

-- North South Brewing Company (open evenings)
UPDATE venues SET
  hours_of_operation = 'Mon-Sun: 4pm-10pm (Sun until 8pm)',
  best_time = '["evening", "night"]'
WHERE id = 'north_south_brewing';

-- Gaston Brewing Company (open late)
UPDATE venues SET
  hours_of_operation = 'Mon: Closed, Tue-Wed: 11:30am-10pm, Thu-Sat: 11:30am-11pm, Sun: 11:30am-7pm',
  best_time = '["afternoon", "evening", "night"]'
WHERE id = 'gaston_brewing_company';

-- Muse & Co (open until 8-9pm)
UPDATE venues SET
  hours_of_operation = 'Mon: Closed, Tue-Thu: 11am-8pm, Fri-Sat: 11am-9pm, Sun: 11am-8pm',
  best_time = '["afternoon", "evening"]'
WHERE id = 'muse_co';

-- The Wine Cafe (may be closed - verify)
UPDATE venues SET
  hours_of_operation = 'Sun: 1pm-6pm, Mon: 12pm-7pm, Tue: 4pm-7pm, Wed-Thu: 12pm-8pm, Fri-Sat: 12pm-10pm',
  best_time = '["afternoon", "evening"]'
WHERE id = 'the_wine_caf';

-- Winterbloom Tea (afternoon/evening)
UPDATE venues SET
  hours_of_operation = 'Mon-Tue: Closed, Wed-Sat: 12pm-9pm, Sun: 12pm-5pm',
  best_time = '["afternoon", "evening"]'
WHERE id = 'winterbloom_tea';

-- White Rabbit Pub (late night)
UPDATE venues SET
  hours_of_operation = 'Daily: 7pm-2am',
  best_time = '["night"]',
  address = '3030 Fort Bragg Rd'
WHERE id = 'the_white_rabbit';

-- Archives Speakeasy (typically late night)
UPDATE venues SET
  hours_of_operation = 'Thu-Sat: 7pm-2am (verify)',
  best_time = '["evening", "night"]',
  address = '723 W Rowan St'
WHERE id = 'archives';

-- FOOD VENUES

-- Antonella's Italian Ristorante (dinner only, closes at 9-10pm)
UPDATE venues SET
  hours_of_operation = 'Mon-Tue: Closed, Wed-Sat: 4pm-10pm, Sun: 4pm-9pm',
  best_time = '["evening"]'
WHERE id = 'antonellas_italian_ristorante';

-- Taste of West Africa
UPDATE venues SET
  hours_of_operation = 'Mon-Tue: Closed, Wed-Sat: 11am-8pm, Sun: 11am-5pm',
  best_time = '["afternoon", "evening"]'
WHERE id = 'taste_of_west_africa';

-- The Sweet Palette (closes at 6pm)
UPDATE venues SET
  hours_of_operation = 'Mon: Closed, Tue-Sat: 11am-6pm, Sun: Closed',
  best_time = '["afternoon"]'
WHERE id = 'the_sweet_palette';

-- Circa 1800 (lunch and dinner)
UPDATE venues SET
  hours_of_operation = 'Mon-Tue: Closed, Wed-Fri: 11am-2pm & 5pm-9pm, Sat: 10am-2pm & 5pm-9:30pm, Sun: 10am-2:30pm',
  best_time = '["afternoon", "evening"]'
WHERE id = 'circa_1800';

-- Pierro's Italian Bistro (open until 9-10pm)
UPDATE venues SET
  hours_of_operation = 'Mon-Thu: 11am-9pm, Fri-Sat: 11am-10pm, Sun: 12pm-9pm',
  best_time = '["afternoon", "evening"]'
WHERE id = 'pierros_italian_bistro';

-- Agora Restaurant
UPDATE venues SET
  hours_of_operation = 'Mon-Thu: 11am-9pm, Fri-Sat: 11am-10pm, Sun: Closed',
  best_time = '["afternoon", "evening"]'
WHERE id = 'agora_restaurant';

-- Bees and Boards (closes at 3pm - lunch only)
UPDATE venues SET
  hours_of_operation = 'Mon-Fri: 9am-3pm, Sat: 10am-2pm, Sun: Closed',
  best_time = '["morning", "afternoon"]'
WHERE id = 'bees_and_boards';

-- Archway Burgers Dogs and Beer (closes early)
UPDATE venues SET
  hours_of_operation = 'Mon-Thu: 11am-3pm, Fri-Sat: 11am-7pm, Sun: Closed',
  best_time = '["afternoon"]'
WHERE id = 'archway_burgers';

-- CRU Fayetteville (late night lounge)
UPDATE venues SET
  hours_of_operation = 'Mon: Closed, Tue-Thu: 7pm-1am, Fri-Sat: 7pm-2am, Sun: 12pm-12am',
  best_time = '["evening", "night"]'
WHERE id = 'cru_fayetteville';

-- NEW UPDATES (Research Batch 1 & 2)

-- Blue Moon Café
UPDATE venues SET
  hours_of_operation = 'Mon: 11am-5pm, Tue-Thu: 11am-9pm, Fri-Sat: 11am-10pm, Sun: 11am-3pm',
  best_time = '["afternoon", "evening"]'
WHERE id = 'blue_moon_caf';

-- Rude Awakening Coffee House
UPDATE venues SET
  hours_of_operation = 'Mon-Thu: 7:30am-10pm, Fri-Sat: 7:30am-12am, Sun: 9am-10pm',
  best_time = '["morning", "afternoon", "evening", "night"]'
WHERE id = 'rude_awakening_coffee_house';

-- The Climbing Place
UPDATE venues SET
  hours_of_operation = 'Mon-Sat: 10am-9pm, Sun: Closed',
  best_time = '["morning", "afternoon", "evening"]'
WHERE id = 'the_climbing_place';

-- US Army Airborne & Special Operations Museum
UPDATE venues SET
  hours_of_operation = 'Tue-Sat: 10am-4pm, Sun: 12pm-4pm, Mon: Closed',
  best_time = '["morning", "afternoon"]'
WHERE id = 'us_army_airborne_special_operations_museum';

-- Paddy''s Irish Public House
UPDATE venues SET
  hours_of_operation = 'Wed-Sat: 6pm-2am, Sun-Tue: Closed',
  best_time = '["evening", "night"]'
WHERE id = 'paddys_irish_pub';

-- Latitude 35 Bar and Grill
UPDATE venues SET
  hours_of_operation = 'Tue-Thu: 11:30am-10pm, Fri: 11:30am-12am, Sat: 9am-12am, Sun: 9am-9pm, Mon: Closed',
  best_time = '["afternoon", "evening", "night"]'
WHERE id = 'latitude_35';

-- Greg''s Pottery
UPDATE venues SET
  hours_of_operation = 'Mon-Sat: 11am-4pm, Sun: Closed',
  best_time = '["afternoon"]'
WHERE id = 'gregs_pottery';

-- Fascinate-U Children''s Museum
UPDATE venues SET
  hours_of_operation = 'Tue-Fri: 9am-5pm, Sat: 10am-5pm, Sun: 12pm-5pm, Mon: Closed',
  best_time = '["morning", "afternoon"]'
WHERE id IN ('fascinate-u_childrens_museum', 'fascinate_u');

-- City Center Gallery and Books
UPDATE venues SET
  hours_of_operation = 'Mon-Sat: 10am-6pm, Sun: Closed',
  best_time = '["morning", "afternoon"]'
WHERE id = 'city_center_gallery';

-- Cape Fear Botanical Garden
UPDATE venues SET
  hours_of_operation = 'Mon-Sat: 9am-5pm, Sun: 12pm-5pm',
  best_time = '["morning", "afternoon"]'
WHERE id = 'cape_fear_botanical_garden';

-- ZipQuest Waterfall & Treetop Adventure
UPDATE venues SET
  hours_of_operation = 'Mon, Fri, Sat: 9am-5pm, Sun: 10am-5pm, Tue-Thu: Closed',
  best_time = '["morning", "afternoon"]'
WHERE id = 'zipquest_waterfall_treetop_adventure';

-- Mac''s Speed Shop
UPDATE venues SET
  hours_of_operation = 'Mon-Wed: 11am-10pm, Thu-Sat: 11am-11pm, Sun: 11am-10pm',
  best_time = '["afternoon", "evening"]'
WHERE id = 'macs_speed_shop';

-- Luigi''s Italian Chophouse
UPDATE venues SET
  hours_of_operation = 'Mon-Thu: 11:30am-9pm, Fri: 5pm-10pm, Sat: 12pm-10pm, Sun: 12pm-9pm',
  best_time = '["afternoon", "evening"]'
WHERE id = 'luigis_italian_chophouse';

-- Sol''s Arcade and Taproom
UPDATE venues SET
  hours_of_operation = 'Tue-Thu: 4pm-10pm, Fri: 4pm-12am, Sat: 12pm-12am, Sun: 12pm-10pm, Mon: Closed',
  best_time = '["afternoon", "evening", "night"]'
WHERE id IN ('sols_arcade', 'sols_arcade_and_taproom');

-- Bound and Vine
UPDATE venues SET
  hours_of_operation = 'Tue-Wed: 11am-6pm, Thu-Sat: 11am-9pm, Sun: 12pm-5pm, Mon: Closed',
  best_time = '["afternoon", "evening"]'
WHERE id = 'bound_and_vine';

-- The Salad Box & Some
UPDATE venues SET
  hours_of_operation = 'Mon-Sat: 10am-2:40pm, Sun: Closed',
  best_time = '["afternoon"]'
WHERE id = 'the_salad_box';

-- Wana Navu Kava Bar
UPDATE venues SET
  hours_of_operation = 'Mon-Thu: 12:15pm-10:30pm, Fri: 12:15pm-12am, Sat: 12:15pm-12:30am, Sun: 12:15pm-10:30pm',
  best_time = '["afternoon", "evening", "night"]'
WHERE id = 'wana_navu_kava_bar';

-- District House of Taps
UPDATE venues SET
  hours_of_operation = 'Tue-Thu: 4pm-10pm, Fri: 4pm-12am, Sat: 12pm-12am, Sun: 12pm-8pm, Mon: Closed',
  best_time = '["afternoon", "evening", "night"]'
WHERE id = 'district_house_of_taps';

-- Haymount Truck Stop
UPDATE venues SET
  hours_of_operation = 'Mon-Thu: 11am-10pm, Fri-Sat: 11am-12am, Sun: 11am-9pm',
  best_time = '["afternoon", "evening", "night"]'
WHERE id = 'haymount_truck_stop';