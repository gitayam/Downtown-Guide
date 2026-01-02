-- Add Fayetteville History Museum source and events
-- Museum hours: Tue-Sat 10am-4pm
-- Address: 325 Franklin Street, Fayetteville, NC 28301
-- Phone: 910-433-1457

-- 1. Add venue for Fayetteville History Museum
INSERT INTO venues (id, name, short_name, address, city, state, zip, latitude, longitude, phone, website, venue_type, hours_of_operation, google_maps_url, apple_maps_url)
VALUES (
    'fayetteville_history_museum',
    'Fayetteville History Museum',
    'History Museum',
    '325 Franklin Street',
    'Fayetteville',
    'NC',
    '28301',
    35.0527,
    -78.8784,
    '910-433-1457',
    'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
    'museum',
    'Tue-Sat 10am-4pm',
    'https://maps.google.com/?q=Fayetteville+History+Museum+325+Franklin+Street+Fayetteville+NC',
    'https://maps.apple.com/?q=Fayetteville+History+Museum+325+Franklin+Street+Fayetteville+NC'
);

-- 2. Add venue for Cross Creek Cemetery (for the tour)
INSERT INTO venues (id, name, short_name, address, city, state, zip, latitude, longitude, venue_type, description)
VALUES (
    'cross_creek_cemetery',
    'Cross Creek Cemetery #1',
    'Cross Creek Cemetery',
    '339 N. Cool Springs Street',
    'Fayetteville',
    'NC',
    '28301',
    35.0545,
    -78.8810,
    'outdoor',
    'Historic cemetery with American Revolution era burials'
);

-- 3. Add source
INSERT INTO sources (id, name, url, type, section, sync_interval_minutes, is_active, last_sync_status, last_sync_count)
VALUES (
    'history_museum',
    'Fayetteville History Museum',
    'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
    'manual',
    'downtown',
    10080,
    TRUE,
    'success',
    10
);

-- 4. Add events (all dates are 2026 based on provided schedule)

-- Winter Wonderland Scavenger Hunt - Each Saturday in January 2026
-- Jan 3, 10, 17, 24, 31 are all Saturdays in 2026
INSERT INTO events (id, source_id, external_id, title, description, start_datetime, end_datetime, venue_id, location_name, url, categories, section, status)
VALUES
    ('hm_winter_hunt_jan3', 'history_museum', 'winter-hunt-2026-01-03',
     'Winter Wonderland Scavenger Hunt',
     'Pick a chilly Saturday in January to go on a hunt through our main museum galleries. Kids can search for special local history questions (and the answers) hidden throughout our exhibits. This self-guided, family-friendly activity is perfect for Grades 2-5 who are eager to learn more about Fayetteville and the surrounding area. Prizes awarded while supplies last. Ages 6+.',
     '2026-01-03T10:00:00', '2026-01-03T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","Kids"]', 'downtown', 'confirmed'),

    ('hm_winter_hunt_jan10', 'history_museum', 'winter-hunt-2026-01-10',
     'Winter Wonderland Scavenger Hunt',
     'Pick a chilly Saturday in January to go on a hunt through our main museum galleries. Kids can search for special local history questions (and the answers) hidden throughout our exhibits. This self-guided, family-friendly activity is perfect for Grades 2-5 who are eager to learn more about Fayetteville and the surrounding area. Prizes awarded while supplies last. Ages 6+.',
     '2026-01-10T10:00:00', '2026-01-10T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","Kids"]', 'downtown', 'confirmed'),

    ('hm_winter_hunt_jan17', 'history_museum', 'winter-hunt-2026-01-17',
     'Winter Wonderland Scavenger Hunt',
     'Pick a chilly Saturday in January to go on a hunt through our main museum galleries. Kids can search for special local history questions (and the answers) hidden throughout our exhibits. This self-guided, family-friendly activity is perfect for Grades 2-5 who are eager to learn more about Fayetteville and the surrounding area. Prizes awarded while supplies last. Ages 6+.',
     '2026-01-17T10:00:00', '2026-01-17T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","Kids"]', 'downtown', 'confirmed'),

    ('hm_winter_hunt_jan24', 'history_museum', 'winter-hunt-2026-01-24',
     'Winter Wonderland Scavenger Hunt',
     'Pick a chilly Saturday in January to go on a hunt through our main museum galleries. Kids can search for special local history questions (and the answers) hidden throughout our exhibits. This self-guided, family-friendly activity is perfect for Grades 2-5 who are eager to learn more about Fayetteville and the surrounding area. Prizes awarded while supplies last. Ages 6+.',
     '2026-01-24T10:00:00', '2026-01-24T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","Kids"]', 'downtown', 'confirmed'),

    ('hm_winter_hunt_jan31', 'history_museum', 'winter-hunt-2026-01-31',
     'Winter Wonderland Scavenger Hunt',
     'Pick a chilly Saturday in January to go on a hunt through our main museum galleries. Kids can search for special local history questions (and the answers) hidden throughout our exhibits. This self-guided, family-friendly activity is perfect for Grades 2-5 who are eager to learn more about Fayetteville and the surrounding area. Prizes awarded while supplies last. Ages 6+.',
     '2026-01-31T10:00:00', '2026-01-31T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","Kids"]', 'downtown', 'confirmed');

-- Black History Month Scavenger Hunt - February 2026 (all Tues-Sat during museum hours)
-- Running the entire month, but we'll create Saturday events as highlights
INSERT INTO events (id, source_id, external_id, title, description, start_datetime, end_datetime, venue_id, location_name, url, categories, section, status)
VALUES
    ('hm_bhm_hunt_feb7', 'history_museum', 'bhm-hunt-2026-02-07',
     'Black History Month Scavenger Hunt',
     'The Fayetteville History Museum galleries share many facets of the impactful story of Fayetteville''s Black community. Individuals can search for special local African American history questions (and the answers) hidden throughout our exhibits. This self-guided, family-friendly activity is perfect for all ages who are eager to learn more about Fayetteville and its rich African American History. Available all month during museum hours (Tue-Sat 10am-4pm). Free admission.',
     '2026-02-07T10:00:00', '2026-02-07T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","History","Black History"]', 'downtown', 'confirmed'),

    ('hm_bhm_hunt_feb14', 'history_museum', 'bhm-hunt-2026-02-14',
     'Black History Month Scavenger Hunt',
     'The Fayetteville History Museum galleries share many facets of the impactful story of Fayetteville''s Black community. Individuals can search for special local African American history questions (and the answers) hidden throughout our exhibits. This self-guided, family-friendly activity is perfect for all ages who are eager to learn more about Fayetteville and its rich African American History. Available all month during museum hours (Tue-Sat 10am-4pm). Free admission.',
     '2026-02-14T10:00:00', '2026-02-14T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","History","Black History"]', 'downtown', 'confirmed'),

    ('hm_bhm_hunt_feb21', 'history_museum', 'bhm-hunt-2026-02-21',
     'Black History Month Scavenger Hunt',
     'The Fayetteville History Museum galleries share many facets of the impactful story of Fayetteville''s Black community. Individuals can search for special local African American history questions (and the answers) hidden throughout our exhibits. This self-guided, family-friendly activity is perfect for all ages who are eager to learn more about Fayetteville and its rich African American History. Available all month during museum hours (Tue-Sat 10am-4pm). Free admission.',
     '2026-02-21T10:00:00', '2026-02-21T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","History","Black History"]', 'downtown', 'confirmed'),

    ('hm_bhm_hunt_feb28', 'history_museum', 'bhm-hunt-2026-02-28',
     'Black History Month Scavenger Hunt',
     'The Fayetteville History Museum galleries share many facets of the impactful story of Fayetteville''s Black community. Individuals can search for special local African American history questions (and the answers) hidden throughout our exhibits. This self-guided, family-friendly activity is perfect for all ages who are eager to learn more about Fayetteville and its rich African American History. Available all month during museum hours (Tue-Sat 10am-4pm). Free admission.',
     '2026-02-28T10:00:00', '2026-02-28T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","History","Black History"]', 'downtown', 'confirmed');

-- Historic Cross Creek Cemetery #1 American Revolution Tour - Feb 27, 2026
INSERT INTO events (id, source_id, external_id, title, description, start_datetime, end_datetime, venue_id, location_name, url, categories, section, status)
VALUES
    ('hm_cemetery_tour_feb27', 'history_museum', 'cemetery-tour-2026-02-27',
     'Historic Cross Creek Cemetery #1 American Revolution Tour',
     'Join a local historian this winter for a tailored tour of Cross Creek Cemetery #1 on the eve of the 250th Anniversary of the Battle of Moore''s Creek Bridge. Learn about some extraordinary Fayettevillians who experienced the American Revolutionary War firsthand, whether as a soldier, or a loved one who waited. Topics including cemetery iconography and architecture will also be explored. The tour begins at 339 N. Cool Springs Street, next to the Cross Creek Cemetery #1 signage. Parking is available along N. Cool Springs St. Participants will travel in the cemetery, requiring moderate walking. All ages welcome. Free admission.',
     '2026-02-27T12:00:00', '2026-02-27T13:00:00',
     'cross_creek_cemetery', 'Cross Creek Cemetery #1 (339 N. Cool Springs St)',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["History","Tours","Outdoor"]', 'downtown', 'confirmed');

-- Queen Anne's Revenge Conservation Lab Bus Trip - March 9, 2026
INSERT INTO events (id, source_id, external_id, title, description, start_datetime, end_datetime, venue_id, location_name, url, ticket_url, categories, section, status)
VALUES
    ('hm_qar_bus_trip', 'history_museum', 'qar-bus-trip-2026-03-09',
     'Queen Anne''s Revenge Conservation Lab - Bus Trip',
     'Are you ready for an adventure? Join museum staff as we travel to the Queen Anne''s Revenge Conservation Lab in Greenville for an exclusive look at the work involved in the recovery of this infamous ship (Blackbeard''s flagship!). This educational tour is an opportunity to see artifacts before they reach museums and speak to the specialists who conserve and preserve these relics of the past. Afterwards, we will grab a quick lunch (cost not included) and head back to Fayetteville. Register online or at the Fayetteville History Museum. Ages 13+. $10 per person.',
     '2026-03-09T08:00:00', '2026-03-09T15:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum (Departure)',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["History","Tours","Education"]', 'downtown', 'confirmed');

-- Spring Break Facts of Foolishness Scavenger Hunt - April 7-11, 2026
INSERT INTO events (id, source_id, external_id, title, description, start_datetime, end_datetime, venue_id, location_name, url, categories, section, status)
VALUES
    ('hm_spring_hunt_apr7', 'history_museum', 'spring-hunt-2026-04-07',
     'Spring Break Facts of Foolishness Scavenger Hunt',
     'Will you find the clues to our local history mysteries? Kids can search for special local history questions (and their answers) hidden throughout our exhibits. This self-guided activity is perfect for Grades 2-5 who are eager to learn more about Fayetteville and the surrounding area. Ages 5-12. Free admission.',
     '2026-04-07T10:00:00', '2026-04-07T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","Kids"]', 'downtown', 'confirmed'),

    ('hm_spring_hunt_apr8', 'history_museum', 'spring-hunt-2026-04-08',
     'Spring Break Facts of Foolishness Scavenger Hunt',
     'Will you find the clues to our local history mysteries? Kids can search for special local history questions (and their answers) hidden throughout our exhibits. This self-guided activity is perfect for Grades 2-5 who are eager to learn more about Fayetteville and the surrounding area. Ages 5-12. Free admission.',
     '2026-04-08T10:00:00', '2026-04-08T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","Kids"]', 'downtown', 'confirmed'),

    ('hm_spring_hunt_apr9', 'history_museum', 'spring-hunt-2026-04-09',
     'Spring Break Facts of Foolishness Scavenger Hunt',
     'Will you find the clues to our local history mysteries? Kids can search for special local history questions (and their answers) hidden throughout our exhibits. This self-guided activity is perfect for Grades 2-5 who are eager to learn more about Fayetteville and the surrounding area. Ages 5-12. Free admission.',
     '2026-04-09T10:00:00', '2026-04-09T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","Kids"]', 'downtown', 'confirmed'),

    ('hm_spring_hunt_apr10', 'history_museum', 'spring-hunt-2026-04-10',
     'Spring Break Facts of Foolishness Scavenger Hunt',
     'Will you find the clues to our local history mysteries? Kids can search for special local history questions (and their answers) hidden throughout our exhibits. This self-guided activity is perfect for Grades 2-5 who are eager to learn more about Fayetteville and the surrounding area. Ages 5-12. Free admission.',
     '2026-04-10T10:00:00', '2026-04-10T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","Kids"]', 'downtown', 'confirmed'),

    ('hm_spring_hunt_apr11', 'history_museum', 'spring-hunt-2026-04-11',
     'Spring Break Facts of Foolishness Scavenger Hunt',
     'Will you find the clues to our local history mysteries? Kids can search for special local history questions (and their answers) hidden throughout our exhibits. This self-guided activity is perfect for Grades 2-5 who are eager to learn more about Fayetteville and the surrounding area. Ages 5-12. Free admission.',
     '2026-04-11T10:00:00', '2026-04-11T16:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Education","Kids"]', 'downtown', 'confirmed');

-- City Market at the Museum Spring Kick-off - April 11, 2026
INSERT INTO events (id, source_id, external_id, title, description, start_datetime, end_datetime, venue_id, location_name, url, categories, section, status, featured)
VALUES
    ('hm_city_market_kickoff', 'history_museum', 'city-market-kickoff-2026-04-11',
     'City Market at the Museum - Spring Kick-off',
     'Saturday, April 11, is the perfect Spring day to kick off the 2026 season of the City Market @ the Museum. The Market meets every Saturday from 9 am-1 pm. Fresh, locally grown vegetables, fruits, eggs, honey and other farm products are offered for sale. These seasonal offerings along with plants, flowers, wood crafts, knitted goods, soap, candles, jewelry and other handcrafted products can be purchased. Lots of fun "mini-events" are planned throughout the season. The market season runs from April-December but a number of vendors appear year-round. All ages. Free admission.',
     '2026-04-11T09:00:00', '2026-04-11T13:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Market","Family","Shopping","Food"]', 'downtown', 'confirmed', 1);

-- Monday Walking Tours in May - May 4, 11, 18, 2026
INSERT INTO events (id, source_id, external_id, title, description, start_datetime, end_datetime, venue_id, location_name, url, categories, section, status)
VALUES
    ('hm_walking_tour_may4', 'history_museum', 'walking-tour-2026-05-04',
     'Monday Walking Tour of Historic Downtown',
     'Join a local historian for a walking tour of historic downtown Fayetteville. Call 910-433-1457 to register for this event. All ages. Free admission.',
     '2026-05-04T10:00:00', '2026-05-04T11:30:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["History","Tours","Outdoor"]', 'downtown', 'confirmed'),

    ('hm_walking_tour_may11', 'history_museum', 'walking-tour-2026-05-11',
     'Monday Walking Tour of Historic Downtown',
     'Join a local historian for a walking tour of historic downtown Fayetteville. Call 910-433-1457 to register for this event. All ages. Free admission.',
     '2026-05-11T10:00:00', '2026-05-11T11:30:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["History","Tours","Outdoor"]', 'downtown', 'confirmed'),

    ('hm_walking_tour_may18', 'history_museum', 'walking-tour-2026-05-18',
     'Monday Walking Tour of Historic Downtown',
     'Join a local historian for a walking tour of historic downtown Fayetteville. Call 910-433-1457 to register for this event. All ages. Free admission.',
     '2026-05-18T10:00:00', '2026-05-18T11:30:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["History","Tours","Outdoor"]', 'downtown', 'confirmed');

-- Tea of the Town - Summertime Bus Tour - June 15, 2026
INSERT INTO events (id, source_id, external_id, title, description, start_datetime, end_datetime, venue_id, location_name, url, ticket_url, categories, section, status)
VALUES
    ('hm_tea_tour_jun15', 'history_museum', 'tea-tour-2026-06-15',
     'Tea of the Town - Summertime Bus Tour',
     'Looking for something to do on a warm summer day? Are you interested in hearing about the tea of Fayetteville''s past? We have just the thing to satisfy that curiosity. Join us at the Fayetteville History Museum to hop on a bus for a tour you are not soon to forget. Visit sites with salacious scandals, calculated conspiracies, and perhaps even a cemetery or two. Space is limited and registration is required, so book your spot early! Participants will travel via bus, but the tour does involve some walking. For more information, call the museum at (910) 433-1457. Register online or at the Fayetteville History Museum. Ages 13+. $5 per person.',
     '2026-06-15T09:00:00', '2026-06-15T13:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["History","Tours"]', 'downtown', 'confirmed');

-- Downtown Alliance's 11th Annual Midsummer Magic Fairy Door Scavenger Hunt - End of July 2026
INSERT INTO events (id, source_id, external_id, title, description, start_datetime, end_datetime, venue_id, location_name, url, categories, section, status)
VALUES
    ('hm_fairy_door_hunt', 'history_museum', 'fairy-door-2026-07',
     'Midsummer Magic Fairy Door Scavenger Hunt',
     'Join the Fayetteville History Museum while we usher in the 11th annual Downtown Fayetteville Midsummer Magic event! This free 2-day Fairy Door Scavenger Hunt sees adventurers young and old traversing the downtown kingdom in search of adventure and magic. The museum has its very own portal to fairyland - find it and be sure to make note of our clue. All ages. Free admission. Keep an eye on the Museum social media for exact dates.',
     '2026-07-25T10:00:00', '2026-07-26T16:00:00',
     'fayetteville_history_museum', 'Downtown Fayetteville',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Family","Kids","Festival"]', 'downtown', 'confirmed');

-- City Market at the Museum Dog Days of Summer - August 8, 2026
INSERT INTO events (id, source_id, external_id, title, description, start_datetime, end_datetime, venue_id, location_name, url, categories, section, status)
VALUES
    ('hm_dog_days_aug8', 'history_museum', 'dog-days-2026-08-08',
     'City Market at the Museum - Dog Days of Summer',
     'In Ancient Rome, when the brightest star, Sirius, would appear in the sky just before the sun, in early July, it marked the beginning of the hottest days of the year. The Romans referred to this period as dies caniculares or "days of the dog star," which eventually became just "dog days." The Dog Days of summer run from July 3 to August 11. Celebrate the "Dog Days of Summer" with us at the City Market @ the Museum this year. Bring your pups for treats and pets! All ages. Free admission.',
     '2026-08-08T09:00:00', '2026-08-08T13:00:00',
     'fayetteville_history_museum', 'Fayetteville History Museum',
     'https://www.fayettevillenc.gov/Parks-and-Recreation/Facilities/Fayetteville-History-Museum',
     '["Market","Family","Pets"]', 'downtown', 'confirmed');
