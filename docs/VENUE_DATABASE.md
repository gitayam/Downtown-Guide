# Venue Database System

This document describes the venue/location enrichment system used by the Downtown Fayetteville Event Guide.

## Overview

The venue database allows us to enrich event locations with detailed information such as addresses, coordinates, phone numbers, capacity, and more. When events are added (either manually or via automatic scraping), the system attempts to match the event's location to a known venue.

## Database Schema

### `venues` table

Stores detailed information about known venues in the Fayetteville area.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (e.g., `segra_stadium`, `crown_coliseum`) |
| `name` | TEXT | Full venue name (e.g., "Segra Stadium") |
| `short_name` | TEXT | Abbreviated name for display (e.g., "Segra") |
| `description` | TEXT | Brief description of the venue |
| `address` | TEXT | Street address |
| `city` | TEXT | City name |
| `state` | TEXT | State abbreviation |
| `zip` | TEXT | ZIP code |
| `latitude` | REAL | Geographic latitude |
| `longitude` | REAL | Geographic longitude |
| `phone` | TEXT | Contact phone number |
| `website` | TEXT | Venue website URL |
| `capacity` | INTEGER | Seating/standing capacity |
| `venue_type` | TEXT | Type classification (see below) |
| `parking_info` | TEXT | Parking details |
| `accessibility_info` | TEXT | Accessibility features |
| `image_url` | TEXT | Venue photo URL |
| `google_maps_url` | TEXT | Direct Google Maps link |
| `apple_maps_url` | TEXT | Direct Apple Maps link |
| `hours_of_operation` | TEXT | Typical operating hours (text) |
| `updated_at` | TIMESTAMP | Last update timestamp |

### Venue Types

- `stadium` - Sports stadiums (Segra Stadium, Jeralds Stadium)
- `arena` - Indoor arenas (Crown Coliseum, Capel Arena)
- `theater` - Theaters and auditoriums (Crown Theatre, Cameo Art House)
- `expo` - Exhibition centers (Crown Expo Center)
- `park` - Outdoor parks (Festival Park)
- `district` - Geographic areas (Downtown Fayetteville)
- `museum` - Museums and galleries (The Arts Center)
- `library` - Libraries (Headquarters Library)
- `military` - Military installations (Fort Liberty)
- `cafe` - Cafes and teahouses (Muse & Co)

### `venue_aliases` table

Stores alternative names for venues to improve matching accuracy.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key (auto-increment) |
| `venue_id` | TEXT | Foreign key to `venues.id` |
| `alias` | TEXT | Alternative name (unique) |
| `created_at` | TIMESTAMP | Creation timestamp |

## Venue Matching Algorithm

When events are synced to the database, the system attempts to match the event's location name to a known venue using the following process:

### 1. Exact Match (Case-Insensitive)
```
"Crown Coliseum" → crown_coliseum
"segra stadium" → segra_stadium
```

### 2. Alias Lookup
```
"The Crown" → crown_coliseum
"Woodpeckers Stadium" → segra_stadium
"Ft. Bragg" → fort_liberty
```

### 3. Contains Match
Checks if the location name contains (or is contained by) a known venue name:
```
"Crown Coliseum - Fayetteville" → crown_coliseum
"Show at Segra" → segra_stadium
```

### 4. Fuzzy Matching
Removes common suffixes (Theater, Arena, Stadium, Center, Complex, Hall, Park) and prefixes (The) before matching:
```
"Crown Arena" → crown_coliseum (via "crown")
"The Arts Center" → arts_center (via "arts center")
```

## Currently Seeded Venues

| ID | Name | Type | Aliases |
|----|------|------|---------|
| `segra_stadium` | Segra Stadium | stadium | Segra, Woodpeckers Stadium, SEGRA Stadium |
| `crown_coliseum` | Crown Coliseum | arena | Crown, The Crown, Crown Arena, Crown Center |
| `crown_expo` | Crown Expo Center | expo | Crown Expo, Expo Center |
| `crown_theatre` | Crown Theatre | theater | - |
| `festival_park` | Festival Park | park | Dogwood Festival Park |
| `downtown_fayetteville` | Downtown Fayetteville | district | Downtown, Hay Street, Fayetteville Downtown |
| `cameo_art_house` | Cameo Art House Theatre | theater | Cameo Theatre, Cameo, Cameo Art House |
| `arts_center` | The Arts Center | museum | Arts Council, Fayetteville Arts Center |
| `capel_arena` | Capel Arena | arena | FSU Capel Arena, Fayetteville State Capel Arena |
| `seabrook_auditorium` | Seabrook Auditorium | theater | FSU Seabrook, Seabrook Auditorium (Fayetteville State University) |
| `jeralds_stadium` | Luther "Nick" Jeralds Stadium | stadium | FSU Stadium, FSU Football Stadium, Jeralds |
| `huff_concert_hall` | Huff Concert Hall | theater | Huff Concert Hall (Methodist University), Methodist University Huff Hall |
| `headquarters_library` | Headquarters Library | library | Cumberland County Library, Main Library |
| `fort_liberty` | Fort Liberty | military | Fort Bragg, Ft. Bragg, Ft Liberty |
| `fayetteville_speedway` | Fayetteville Motor Speedway | stadium | Speedway, Fay Motor Speedway, Fayetteville Speedway |
| `muse_and_co` | Muse & Co | cafe | Muse, Muse and Co |

## How Event Sync Uses Venues

The sync script (`scripts/sync-all-events.ts`) automatically enriches events with venue data:

1. **Load Venue Cache**: At sync start, all venues and aliases are loaded into memory
2. **Match Locations**: For each event, `lookupVenueId()` attempts to match the location name
3. **Store Reference**: If matched, the `venue_id` is stored in the events table
4. **Preserve Original**: The original `location_name` is always preserved

```typescript
// In writeToD1()
const venueId = lookupVenueId(event.venue?.name);

// INSERT includes:
// venue_id: matched venue ID or NULL
// location_name: original location string from source
```

## Adding New Venues

### Via Seed Script

1. Add the venue to `FAYETTEVILLE_VENUES` array in `scripts/seed-venues.ts`
2. Include all relevant fields and aliases
3. Run `npx tsx scripts/seed-venues.ts` to generate SQL
4. Execute `npx wrangler d1 execute downtown-events --remote --file=scripts/venues-seed.sql`

### Via Direct SQL

```sql
-- Add venue
INSERT INTO venues (id, name, city, state, venue_type, address, zip, latitude, longitude)
VALUES ('new_venue', 'New Venue Name', 'Fayetteville', 'NC', 'theater', '123 Main St', '28301', 35.05, -78.88);

-- Add aliases
INSERT INTO venue_aliases (venue_id, alias) VALUES ('new_venue', 'New Venue');
INSERT INTO venue_aliases (venue_id, alias) VALUES ('new_venue', 'The New Venue');
```

## Querying Venue Data

### Get venue details for an event
```sql
SELECT e.title, e.start_datetime, v.*
FROM events e
LEFT JOIN venues v ON e.venue_id = v.id
WHERE e.id = 'your_event_id';
```

### List all events at a venue
```sql
SELECT title, start_datetime, location_name
FROM events
WHERE venue_id = 'segra_stadium'
ORDER BY start_datetime;
```

### Find unmatched locations
```sql
SELECT DISTINCT location_name
FROM events
WHERE venue_id IS NULL AND location_name != ''
ORDER BY location_name;
```

## Future Enhancements

- **Frontend Integration**: Display venue details (map, directions, phone) on event cards
- **Venue Pages**: Dedicated pages showing all events at a venue
- **Auto-Discovery**: Suggest new venues based on frequently appearing unmatched locations
- **External Enrichment**: Pull additional data from Google Places API
