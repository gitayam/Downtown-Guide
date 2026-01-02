# Perfect Date Fayetteville - Integration Roadmap

A hyper-local AI-powered date planning feature for Fayetteville, NC that leverages our existing venue database, event calendar, and community knowledge.

## Vision

Transform the Downtown Guide into not just an event discovery platform, but a **personalized experience curator** that helps couples, friends, and families plan perfect outings in Fayetteville using real local data we already have.

## Why This Makes Sense

### Existing Assets We Can Leverage
| Asset | Count | Value |
|-------|-------|-------|
| Curated Venues | 37+ | Local restaurants, bars, theaters, parks with hours, descriptions |
| Live Events | 180+ | Real-time events from 15+ sources |
| Venue Aliases | 107 | Smart matching for location recognition |
| Categories | 10+ | Sports, Arts, Music, Family, etc. |
| Sections | 3 | Downtown, Fort Bragg, Crown Complex |
| **MapLibre Maps** | - | Interactive clustering, venue markers, directions |
| **Venue Coordinates** | 37+ | Lat/lng for all venues with Google/Apple Maps links |

### Competitive Advantage Over Generic Date Apps
1. **Hyperlocal Focus**: We know Fayetteville - the best spots, hidden gems, local favorites
2. **Real Event Data**: Not generic suggestions - actual events happening this week
3. **Integrated Experience**: Events + Venues + AI recommendations in one place
4. **Community Trust**: Already established as the go-to Fayetteville events source
5. **No API Costs for Maps**: OpenFreeMap tiles (no Google Maps API fees)

---

## Existing Map Infrastructure (Use This!)

We already have a sophisticated MapLibre GL implementation that Perfect-Date lacks:

### Current Components
| Component | Purpose | Reuse Strategy |
|-----------|---------|----------------|
| `MapView.tsx` | Clustered event map | Extend for date plan route view |
| `EventMap.tsx` | Single venue display | Reuse for venue preview cards |
| `DirectionsModal.tsx` | Google/Apple Maps links | Reuse as-is |

### Map Tech Stack (No Changes Needed)
- **MapLibre GL JS** v5.15 + **react-map-gl** v8.1
- **Tiles**: OpenFreeMap Liberty (free, no API key)
- **Clustering**: Client-side with color-coded markers
- **Coordinates**: All 39+ venues have lat/lng in D1

### New Component: DatePlanMap.tsx

```typescript
interface DatePlanMapProps {
  stops: DateStop[];
  showRoute?: boolean;
  interactive?: boolean;
}

// Features needed:
// 1. Numbered markers (1, 2, 3...) for each stop
// 2. Dashed line connecting stops (walking route)
// 3. Popup on click showing stop details
// 4. "Get Directions" link for each stop
// 5. Fit bounds to show all stops
```

**Visual Example:**
```
    ┌─────────────────────────────────┐
    │            MAP                   │
    │                                  │
    │    [1]──────[2]                 │
    │     │        │                   │
    │     │        │                   │
    │     └────────[3]                │
    │                                  │
    │  1: Mash House (Dinner)         │
    │  2: Cameo Theatre (Movie)       │
    │  3: Muse & Co (Dessert)         │
    └─────────────────────────────────┘
```

### Walking Distance Matrix (Pre-Calculate)

Downtown Fayetteville is very walkable. Pre-calculate distances between key venues:

```typescript
// Store in D1 or compute on-demand using Haversine
const WALKING_MATRIX: Record<string, Record<string, number>> = {
  'mash_house': {
    'cameo_art_house': 3,      // 3 min walk
    'muse_and_co': 2,          // 2 min walk
    'huske_hardware': 5,       // 5 min walk
  },
  // ... pre-calculate for top 20 downtown venues
};

// Haversine formula (port from Perfect-Date)
function getWalkingMinutes(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const distanceKm = haversine(lat1, lng1, lat2, lng2);
  const walkingSpeedKmPerMin = 0.08; // ~5 km/h = 0.08 km/min
  return Math.ceil(distanceKm / walkingSpeedKmPerMin);
}
```

---

## Phase 1: Foundation (MVP)

**Goal**: Basic date planning with venue recommendations + map visualization

### 1.1 Data Model Extensions

```sql
-- New table for date plan templates
CREATE TABLE date_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  event_types TEXT, -- JSON array: ["first_date", "anniversary", "family"]
  duration_hours INTEGER,
  budget_range TEXT, -- "budget", "moderate", "upscale"
  vibes TEXT, -- JSON array: ["romantic", "adventurous", "relaxed"]
  venue_sequence TEXT, -- JSON array of venue_type sequences
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-generated/saved date plans
CREATE TABLE saved_dates (
  id TEXT PRIMARY KEY,
  user_id TEXT, -- Optional, for future auth
  title TEXT,
  venues TEXT, -- JSON array of venue IDs
  events TEXT, -- JSON array of event IDs
  notes TEXT,
  scheduled_date DATE,
  budget INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  share_id TEXT UNIQUE, -- For shareable links
  view_count INTEGER DEFAULT 0
);

-- Venue enhancements for date planning
ALTER TABLE venues ADD COLUMN date_friendly BOOLEAN DEFAULT TRUE;
ALTER TABLE venues ADD COLUMN romantic_score INTEGER; -- 1-5
ALTER TABLE venues ADD COLUMN noise_level TEXT; -- quiet, moderate, loud
ALTER TABLE venues ADD COLUMN reservation_required BOOLEAN;
ALTER TABLE venues ADD COLUMN average_cost INTEGER; -- per person
ALTER TABLE venues ADD COLUMN cuisine_type TEXT; -- american, italian, asian, etc.
ALTER TABLE venues ADD COLUMN outdoor_seating BOOLEAN;
ALTER TABLE venues ADD COLUMN parking_notes TEXT;
ALTER TABLE venues ADD COLUMN safety_info TEXT; -- "well-lit", "remote", "cell-service-spotty"
```

### 1.2 Local-First Venue Database Strategy

**Philosophy**: Fayetteville is small (~210k population) and predictable. We can database ALL date-worthy venues locally with rich metadata. Google Places API is a fallback only for edge cases.

**Current State**: 39+ venues with basic info
**Target State**: 150-200 venues with full date planning metadata

#### Venue Categories to Collect

| Category | Est. Count | Priority | Use Case |
|----------|------------|----------|----------|
| Restaurants | 60-80 | P0 | Dinner, brunch, lunch dates |
| Bars/Breweries | 15-20 | P0 | Drinks, nightlife |
| Coffee Shops | 10-15 | P0 | First dates, casual meetups |
| Parks | 20-25 | P1 | Outdoor dates, picnics, walks |
| Entertainment | 10-15 | P1 | Movies, bowling, mini golf |
| Museums/Cultural | 5-10 | P1 | Cultural dates |
| Dessert/Ice Cream | 8-12 | P2 | Date endings |
| Outdoor Activities | 5-10 | P2 | Adventure dates |

#### Enhanced Venue Schema

```sql
-- Extend existing venues table
ALTER TABLE venues ADD COLUMN category TEXT; -- restaurant, bar, park, entertainment
ALTER TABLE venues ADD COLUMN subcategory TEXT; -- italian, brewery, botanical, bowling
ALTER TABLE venues ADD COLUMN price_level INTEGER; -- 1-4 ($, $$, $$$, $$$$)
ALTER TABLE venues ADD COLUMN average_cost INTEGER; -- per person estimate
ALTER TABLE venues ADD COLUMN good_for TEXT; -- JSON: ["dinner", "drinks", "first_date", "anniversary"]
ALTER TABLE venues ADD COLUMN romantic_score INTEGER; -- 1-5
ALTER TABLE venues ADD COLUMN noise_level TEXT; -- quiet, moderate, loud
ALTER TABLE venues ADD COLUMN vibe TEXT; -- JSON: ["romantic", "casual", "upscale", "fun"]
ALTER TABLE venues ADD COLUMN reservation_required BOOLEAN;
ALTER TABLE venues ADD COLUMN outdoor_seating BOOLEAN;
ALTER TABLE venues ADD COLUMN parking_notes TEXT;
ALTER TABLE venues ADD COLUMN best_time TEXT; -- JSON: ["dinner", "brunch", "late_night"]
ALTER TABLE venues ADD COLUMN cuisine_type TEXT; -- american, italian, asian, mexican
ALTER TABLE venues ADD COLUMN alcohol_served BOOLEAN;
ALTER TABLE venues ADD COLUMN kid_friendly BOOLEAN;
ALTER TABLE venues ADD COLUMN wheelchair_accessible BOOLEAN;
ALTER TABLE venues ADD COLUMN rating REAL; -- 1-5, from Google/Yelp
ALTER TABLE venues ADD COLUMN review_count INTEGER;
ALTER TABLE venues ADD COLUMN photos TEXT; -- JSON array of URLs
ALTER TABLE venues ADD COLUMN menu_url TEXT;
ALTER TABLE venues ADD COLUMN reservation_url TEXT;
ALTER TABLE venues ADD COLUMN data_source TEXT; -- manual, google, yelp, scraped
ALTER TABLE venues ADD COLUMN last_verified DATE;
```

#### Sample Enriched Venue

```json
{
  "id": "mash_house",
  "name": "Mash House",
  "category": "restaurant",
  "subcategory": "gastropub",
  "price_level": 2,
  "average_cost": 35,
  "good_for": ["dinner", "drinks", "date_night", "anniversary"],
  "romantic_score": 4,
  "noise_level": "moderate",
  "vibe": ["upscale_casual", "romantic", "foodie"],
  "reservation_required": true,
  "outdoor_seating": true,
  "parking_notes": "Free lot behind building, street parking on Hay St",
  "best_time": ["dinner", "weekend_brunch"],
  "cuisine_type": "american_gastropub",
  "alcohol_served": true,
  "kid_friendly": true,
  "wheelchair_accessible": true,
  "rating": 4.5,
  "review_count": 892,
  "menu_url": "https://themashhouse.com/menu",
  "reservation_url": "https://www.opentable.com/mash-house",
  "data_source": "manual",
  "last_verified": "2025-01-02"
}
```

---

## Phase 0: Data Collection (Before MVP)

**Goal**: Build comprehensive local venue database before building the date planner

### 0.1 Data Sources for Scraping

| Source | Data Available | Method | Priority |
|--------|---------------|--------|----------|
| **Google Places API** | All categories, ratings, hours, photos | API calls | P0 |
| **Yelp Fusion API** | Restaurants, bars, reviews, photos | API (free tier) | P0 |
| **Our Existing DB** | 37 venues with coordinates | Already have | P0 |
| **Visit Fayetteville** | Tourism attractions, events | Scrape | P1 |
| **City Parks & Rec** | Parks, trails, facilities | Scrape | P1 |
| **Local Blogs/Guides** | Best hikes, date spots, hidden gems | Scrape | P1 |
| **Reddit/Forums** | "Best date ideas", "Things to do" threads | Scrape | P1 |
| **TripAdvisor** | Top attractions, reviews | Scrape | P2 |
| **Facebook Places** | Local businesses, hours | API | P2 |

### 0.2 Scraping Script Plan

```typescript
// scripts/scrape-venues.ts

interface VenueScraperConfig {
  sources: {
    googlePlaces: {
      apiKey: string;
      categories: string[]; // restaurant, bar, park, museum, etc.
      location: { lat: 35.0527, lng: -78.8784 }; // Downtown Fayetteville
      radius: 15000; // 15km covers most of Fayetteville
    };
    yelp: {
      apiKey: string;
      categories: string[];
    };
  };
  deduplication: {
    matchBy: ['name', 'address', 'coordinates'];
    similarityThreshold: 0.85;
  };
  enrichment: {
    // For each venue, fetch additional data
    googleDetails: boolean;
    yelpReviews: boolean;
    photos: boolean;
  };
}

// Execution plan:
// 1. Fetch all restaurants within 15km of downtown
// 2. Fetch all bars/nightlife
// 3. Fetch all parks and recreation
// 4. Fetch entertainment venues
// 5. Deduplicate against existing DB
// 6. Enrich with detailed info
// 7. Manual review and curation
// 8. Import to D1
```

### 0.3 Google Places Categories to Fetch

```typescript
const GOOGLE_PLACE_TYPES = [
  // Dining
  'restaurant', 'cafe', 'bakery', 'bar', 'night_club',

  // Entertainment
  'movie_theater', 'bowling_alley', 'amusement_park',
  'art_gallery', 'museum',

  // Outdoors
  'park', 'tourist_attraction', 'zoo',

  // Other date spots
  'spa', 'shopping_mall', 'book_store',
];

const YELP_CATEGORIES = [
  'restaurants', 'bars', 'coffee', 'desserts',
  'arts', 'active', 'nightlife', 'parks',
];
```

### 0.4 Manual Curation Requirements

After scraping, manually add/verify:

| Field | Why Manual |
|-------|-----------|
| `good_for` | Requires local knowledge |
| `romantic_score` | Subjective rating |
| `vibe` | Atmosphere description |
| `best_time` | When it's best for dates |
| `parking_notes` | Local knowledge |
| `reservation_required` | Check website |
| **Collections** | Tag venues for "Best Sunset", "Quiet Chat", "First Date Safe" |

### 0.5 Fayetteville-Specific Venues to Prioritize

**Must-Have Downtown (Walking Distance)**
1. Mash House - Gastropub
2. Huske Hardware House - Historic brewery
3. Luigi's - Italian fine dining
4. Cameo Art House Theatre - Indie cinema
5. Muse & Co - Tea house
6. Dirtbag Ales - Craft brewery
7. The Capitol Encore - Live music
8. Fayetteville Pie Company - Dessert
9. Sweet Palette - Bakery/dessert
10. North South Brewing - Brewery

**Must-Have Parks**
1. Cape Fear Botanical Garden
2. Festival Park
3. Mazarick Park
4. Clark Park
5. Lake Rim Park
6. Arnette Park
7. Cross Creek Linear Park

**Must-Have Entertainment**
1. Crown Theatre
2. Segra Stadium (Woodpeckers)
3. Putt-Putt Fun Center
4. Spare Time Entertainment
5. Sky Zone Trampoline Park

**Must-Have Greater Fayetteville**
1. Fort Bragg area restaurants
2. Cross Creek Mall area
3. Skibo Road corridor

**Safety & Comfort Factors (for manual review)**
- **Lighting**: Is it well-lit at night? (Crucial for first dates)
- **Cell Service**: Is it a dead zone? (Safety risk)
- **Crowd Levels**: "Private/Secluded" vs "Public/Safe" balance.

### 0.6 Data Collection Timeline

| Week | Task | Output |
|------|------|--------|
| Week 1 | Set up Google Places + Yelp API scripts | Working scrapers |
| Week 1 | Scrape all restaurants (60-80) | Raw venue data |
| Week 2 | Scrape bars, coffee, parks | Raw venue data |
| Week 2 | Deduplicate and merge with existing DB | Clean dataset |
| Week 3 | Manual curation: top 50 venues | Enriched data |
| Week 3 | Import to D1, verify coordinates | Production ready |

### 0.7 Fallback to Google Places API

Even with local database, fallback for:

```typescript
async function findVenue(query: string, category: string): Promise<Venue> {
  // 1. First, search local database
  const localResult = await searchLocalVenues(query, category);
  if (localResult && localResult.confidence > 0.8) {
    return localResult;
  }

  // 2. Fallback to Google Places (rare)
  const googleResult = await searchGooglePlaces(query, {
    location: FAYETTEVILLE_CENTER,
    radius: 15000,
    type: category,
  });

  // 3. Optionally save to local DB for future
  if (googleResult) {
    await cacheVenueLocally(googleResult);
  }

  return googleResult;
}
```

**When to use Google API fallback:**
- New venue not in our DB yet
- User searches for specific business name
- Category we haven't scraped yet
- Verification of hours/status

**Expected API usage**: <100 calls/month (mostly cached locally)

### 0.8 Unstructured Data Collection (Blogs, Forums, Guides)

**Goal**: Capture "hikes, activities, hangouts" that aren't structured businesses.

**Sources to Target:**
- Reddit r/Fayetteville threads ("Best first date spots", "Hiking near Fayetteville")
- Local blogs (Fayetteville Flyer, CityView, etc.)
- AllTrails (for hiking/walking trail metadata)
- "Top 10" lists for activities

**Data to Extract:**
- **Name**: "Cape Fear River Trail - Jordan Soccer Complex Trailhead"
- **Type**: "hike", "scenic_spot", "activity"
- **Vibe**: "active", "nature", "quiet"
- **Location**: Lat/Lng (might need geocoding from description)
- **Best For**: "Day dates", "Walking the dog", "Sunset"

**Storage Strategy:**
Store these as `venues` but with a distinct `category: 'activity'` or `'nature_spot'`. This allows them to be mixed into date plans just like restaurants.

### 1.3 Core API Endpoints

```typescript
// New routes for /api/date-planner

GET /api/date-planner/suggestions
  ?event_type=first_date
  &budget=moderate
  &vibes=romantic,relaxed
  &duration=3
  &date=2025-01-15

POST /api/date-planner/generate
  {
    event_type: "anniversary",
    budget: 150,
    vibes: ["romantic", "sophisticated"],
    duration_hours: 4,
    date: "2025-01-15",
    preferences: {
      include_event: true,
      dietary: ["vegetarian"],
      accessibility: true
    }
  }

GET /api/date-planner/plan/:id
POST /api/date-planner/save
GET /api/date-planner/share/:shareId
```

### 1.4 Simple UI (First Iteration)

**New Page**: `/plan-date` or `/perfect-date`

```
+------------------------------------------+
|  Plan Your Perfect Fayetteville Date     |
+------------------------------------------+
|                                          |
|  What's the occasion?                    |
|  [First Date] [Date Night] [Anniversary] |
|  [Friends Night] [Family] [Special]      |
|                                          |
|  What's the vibe?                        |
|  [Romantic] [Adventurous] [Relaxed]      |
|  [Fun] [Cultural] [Sophisticated]        |
|                                          |
|  Budget: [$] [$$] [$$$]                  |
|                                          |
|  Duration: [2-3 hrs] [Half Day] [Evening]|
|                                          |
|  Include an event? [Yes] [No]            |
|  Date: [Calendar Picker]                 |
|                                          |
|        [Generate My Perfect Date]        |
+------------------------------------------+
```

### 1.5 Recommendation Engine (Rule-Based First)

```typescript
interface DatePlan {
  id: string;
  title: string; // "Romantic Downtown Evening"
  stops: DateStop[];
  totalDuration: number;
  estimatedCost: number;
  tips: string[];
  conversation_starters: string[]; // "Ask about their favorite childhood vacation..."
}

interface DateStop {
  order: number;
  venue?: Venue;
  event?: Event;
  activity: string; // "Dinner at Mash House"
  duration: number; // minutes
  cost: number;
  notes: string;
  transitionTip?: string; // "5 min walk to next stop"
}

// Example generated plan
{
  title: "Romantic Downtown Evening",
  stops: [
    {
      order: 1,
      venue: { id: "mash_house", name: "Mash House" },
      activity: "Dinner",
      duration: 90,
      cost: 60,
      notes: "Great craft beer selection, cozy atmosphere"
    },
    {
      order: 2,
      venue: { id: "cameo_art_house", name: "Cameo Art House Theatre" },
      event: { title: "MARTY SUPREME", startTime: "7:30 PM" },
      activity: "Movie",
      duration: 120,
      cost: 24,
      notes: "Indie film at historic theater",
      transitionTip: "3 minute walk down Hay Street"
    },
    {
      order: 3,
      venue: { id: "muse_and_co", name: "Muse & Co" },
      activity: "Dessert & Tea",
      duration: 45,
      cost: 15,
      notes: "Boba tea and chill vibes to end the night"
    }
  ],
  totalDuration: 255,
  estimatedCost: 99,
  tips: [
    "Parking available at Market House lot",
    "All venues are within walking distance",
    "Make reservation at Mash House for weekend"
  ]
}
```

---

## Phase 2: AI Enhancement

**Goal**: GPT-powered personalization and natural language interface

### 2.1 OpenAI Integration

```typescript
// System prompt for date planning
const SYSTEM_PROMPT = `You are a local Fayetteville, NC date planning expert.
You have access to real venue and event data from the area.

Available venues: ${JSON.stringify(venues)}
Upcoming events: ${JSON.stringify(events)}

Generate creative, personalized date plans using ONLY the provided venues and events.
Consider:
- Walking distances in downtown (most venues are within 5-10 min walk)
- Venue hours and reservation requirements
- Event timing and ticket availability
- Budget constraints
- The specific vibe/occasion requested

Always provide practical tips for parking, timing, and local insights.`;
```

### 2.2 Natural Language Input

```
User: "Plan a romantic anniversary dinner for this Saturday,
       we like craft cocktails and live music, budget around $150"

AI Response:
"Here's your perfect anniversary evening in Downtown Fayetteville:

6:00 PM - Craft Cocktails at Huske Hardware House
         Start with handcrafted cocktails in the historic building
         (~$30, 45 min)

7:00 PM - Anniversary Dinner at The Mash House
         Farm-to-table menu, intimate atmosphere
         Pro tip: Request the corner booth for privacy
         (~$80, 90 min)

9:00 PM - Live Music at Dirtbag Ales
         Local band playing tonight - perfect nightcap
         (~$20 including drinks, 90 min)

Total: ~$130 | Walking distance between all venues
Parking: Free lot behind Market House after 6 PM"
```

### 2.3 Context-Aware Suggestions

- Time of day awareness (brunch vs dinner spots)
- Weather integration (indoor alternatives)
- Event-driven suggestions ("There's a symphony concert that night!")
- Seasonal recommendations

---

## Phase 3: Social & Sharing

**Goal**: Shareable date plans, collaborative planning

### 3.1 Shareable Links

```
https://ncfayetteville.com/date/abc123

+------------------------------------------+
|  Sarah's Anniversary Plan                |
|  Saturday, January 15th                  |
+------------------------------------------+
|                                          |
|  6:00 PM  Cocktails @ Huske Hardware    |
|  7:00 PM  Dinner @ Mash House           |
|  9:00 PM  Live Music @ Dirtbag Ales     |
|                                          |
|  Est. Cost: $130 | Duration: 4 hours    |
|                                          |
|  [Copy This Plan] [Modify for Me]       |
+------------------------------------------+
```

### 3.2 Social Features

- Save favorite date plans
- "Date this week" widget on homepage
- User-submitted date ideas
- Rating/feedback on completed dates
- Discord integration for date suggestions

### 3.3 Open Graph / Social Sharing

```html
<meta property="og:title" content="Perfect Date: Romantic Downtown Evening" />
<meta property="og:description" content="Cocktails, dinner & live music in Fayetteville" />
<meta property="og:image" content="/api/date/abc123/og-image" />
```

---

## Phase 4: Advanced Features

### 4.1 Two-Person Planning (From Perfect-Date)

Adapt the two-location dating feature for:
- Couples coming from different parts of Fayetteville
- Meeting friends from Raleigh/Durham in the middle
- Fort Bragg + Downtown meetup optimization

### 4.2 Calendar Integration

- Add date plans to Google/Apple Calendar
- Reminder notifications
- Automatic event ticket links

### 4.3 Reservation Integration

- OpenTable/Resy integration for restaurants
- Ticket links for events
- One-click booking flow

### 4.4 Personalization

- Remember user preferences
- Learn from saved/completed dates
- Suggest based on history

---

## Technical Architecture

### Our Stack (No External Map APIs!)

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐   │
│  │ PlanDatePage │  │ DatePlanMap  │  │ Existing    │   │
│  │  (new)       │  │  (new)       │  │ Components  │   │
│  └──────────────┘  └──────────────┘  └─────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│              Cloudflare Workers API                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ /api/date/* │  │ /api/events │  │ /api/venues │     │
│  │   (new)     │  │  (exists)   │  │  (exists)   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    D1 Database                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐      │
│  │  venues  │  │  events  │  │  date_plans      │      │
│  │(enriched)│  │ (exists) │  │    (new)         │      │
│  └──────────┘  └──────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│              External Services                           │
│  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │ OpenFreeMap      │  │ OpenAI (Phase 2 only)      │  │
│  │ (FREE tiles)     │  │ gpt-4o-mini: ~$0.001/plan  │  │
│  └──────────────────┘  └────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐│
│  │ Google/Apple Maps: Links only (no API calls)      ││
│  │ Directions open in native apps, not embedded      ││
│  └────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Cost Analysis

| Service | Phase 1 (MVP) | Phase 2+ (AI) | Notes |
|---------|---------------|---------------|-------|
| Map Tiles | $0 | $0 | OpenFreeMap is free |
| D1 Database | $0 | $0 | Included in Workers plan |
| Workers | $0 | $0 | Free tier: 100K req/day |
| OpenAI | $0 | ~$10/month | gpt-4o-mini at 1000 plans/month |
| **Total** | **$0** | **~$10/month** | Extremely cost-effective |

### Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| OpenFreeMap downtime | Low | Cache tiles, fallback style |
| Venue data stale | Medium | Regular updates, user feedback |
| AI hallucinations | Medium | Constrain to known venues only |
| Low adoption | Medium | Promote on homepage, Discord |
| Scope creep | High | Strict MVP focus, iterate |

### Key Files to Create

```
src/
├── routes/
│   └── date-planner.ts      # API routes
├── services/
│   └── date-generator.ts    # Core recommendation logic
├── templates/
│   └── DatePlanTemplate.tsx # OG image generation

web/src/
├── pages/
│   └── PlanDatePage.tsx     # Main UI
├── components/
│   └── date-planner/
│       ├── EventTypeSelector.tsx
│       ├── VibeSelector.tsx
│       ├── BudgetSlider.tsx
│       ├── DatePlanCard.tsx
│       └── DateStopCard.tsx
```

---

## Migration from Perfect-Date (modern-stack only)

**Source**: `/Users/sac/Git/Perfect-Date/modern-stack/backend/server.py` (1,310 lines)

### Code to Port (~274 lines of pure algorithm)

| Component | Source File & Lines | Adaptation Needed |
|-----------|---------------------|-------------------|
| Haversine distance | `server.py` L139-166 | TypeScript conversion (28 lines) |
| Activity generation | `server.py` L726-785 | Simplify templates for local use (60 lines) |
| Smart search queries | `server.py` L787-838 | Map activity → venue type (50 lines) |
| Share ID generation | `server.py` L380-382 | Use `crypto.getRandomValues()` |
| Database schema | `server.py` L361-375 | Direct port to D1 |

### Pydantic Models to Port (as TypeScript interfaces)

```typescript
// From server.py L479-520
interface DateRequest {
  location: string;
  budget: number;
  event_type: string;
  vibes: string[];
  time_available?: number; // default 4
}

interface ShareDateRequest {
  activities: Activity[];
  location: string;
  budget: number;
  event_type: string;
  vibes: string[];
  title?: string;
  expiry_hours?: number; // default 168 (7 days)
}
```

### Code NOT to Port (We Have Better)

| Perfect-Date modern-stack | Our Solution | Why Ours is Better |
|---------------------------|--------------|-------------------|
| Google Maps API (`googlemaps` package) | MapLibre + OpenFreeMap | Free, no API key, already working |
| Google Places search | Our D1 venue database | Curated local data, no API costs |
| Leaflet maps (enhanced-ui.html) | react-map-gl (MapView.tsx) | Already integrated, React-native |
| SQLite (shared_dates.db) | D1 | Edge-native, global distribution |
| Plain HTML+JS (enhanced-ui.html) | React + Tailwind | Consistent with existing app |
| Two-location midpoint (L168-238) | N/A | Single city focus for now |
| Destination cities scoring (L240-306) | N/A | Hyperlocal focus |
| Fallback geocoding (L87-137) | Our venue coordinates | All venues already geocoded |

### Frontend State to Port (as React hooks)

```typescript
// From enhanced-ui.html L330-344
const [dateData, setDateData] = useState({
  eventType: 'date_night',
  timeAvailable: 4,
  budget: 100,
  vibes: [],
  location: 'Downtown Fayetteville',
});
```

### What We Build New

| Component | Description | Complexity | Reference |
|-----------|-------------|------------|-----------|
| DatePlanMap.tsx | Route visualization with numbered stops | Medium | Inspired by enhanced-ui.html L1515-1832 |
| PlanDatePage.tsx | Form + results UI | Medium | Wizard mode L68-234 |
| date-planner.ts | API routes | Low | Endpoints L561-724, L1034-1093 |
| date-generator.ts | Recommendation logic | High | generate_activities L726-785 |
| Walking distance calc | Haversine formula | Low | L139-166 |
| ShareModal.tsx | Share UI with links | Low | L2106-2199 |

---

## Implementation Timeline

### Phase 0: Data Collection (Week 1-2)
- [ ] Set up Google Places API scraper script
- [ ] Set up Yelp Fusion API scraper script
- [x] Scrape restaurants (60-80 venues)
- [x] Scrape bars, coffee shops, parks (40-50 venues)
- [x] **Scrape unstructured data (hikes, blogs, reddit threads)**
- [x] Deduplicate against existing 37 venues
- [x] Manual curation of top 50 date spots
- [x] Create D1 migration for new venue fields
- [x] Import enriched data to production D1

### Phase 1: MVP (Week 3-4)
- [x] Refactor `src/index.ts` to support router/controller pattern
- [x] Database schema for date plans
- [x] Basic API endpoints (`/api/date-planner/*`)
- [x] Simple UI with form inputs (PlanDatePage.tsx)
- [x] Rule-based recommendation engine
- [ ] DatePlanMap component with route visualization
- [ ] Basic save/share functionality

### Phase 2: AI Enhancement (Week 5-6)
- [ ] OpenAI integration (gpt-4o-mini)
- [ ] Natural language interface
- [ ] Context-aware suggestions
- [ ] Testing and refinement

### Phase 3: Polish & Launch (Week 7-8)
- [ ] Social sharing with OG images
- [ ] Mobile optimization
- [ ] Performance tuning
- [ ] Add to main navigation
- [ ] Homepage promotion widget
- [ ] Discord announcement

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Date plans generated | 100/month |
| Plans saved/shared | 20% conversion |
| User return rate | 30% monthly |
| Social shares | 10/month |

---

## MVP Definition (Phase 1 Only)

### In Scope for MVP
- [x] Form-based date planning (no natural language)
- [x] 5 event types: Date Night, First Date, Friends, Family, Anniversary
- [x] 6 vibes: Romantic, Fun, Relaxed, Adventurous, Cultural, Budget-Friendly
- [x] 3 budget tiers: $ (<$50), $$ ($50-100), $$$ ($100+)
- [x] Duration: 2-3 hrs, Half Day, Full Evening
- [x] Generate 1-3 plans based on inputs
- [x] Show plans with map visualization
- [x] Save plan to local storage (no auth)
- [x] Share plan via URL (unauthenticated)
- [x] Mobile-responsive design

### NOT in MVP (Phase 2+)
- [ ] Natural language input ("plan a romantic dinner")
- [ ] User accounts / saved preferences
- [ ] AI-powered recommendations
- [ ] Weather integration
- [ ] Reservation booking
- [ ] Calendar export
- [ ] Collaborative planning
- [ ] User ratings/feedback

### Definition of Done (Phase 1)
1. User can select preferences and generate a date plan
2. Plan shows 2-4 venue stops with times and costs
3. Interactive map displays route with numbered markers
4. Walking times shown between stops
5. Share link generates working preview
6. Works on mobile and desktop
7. Integrated into main navigation

---

## Open Questions (Decisions Needed)

| Question | Options | Recommendation |
|----------|---------|----------------|
| Page URL | `/plan-date` vs `/perfect-date` | `/plan-date` (simpler) |
| Share URL format | `/date/:id` vs `/plan/:id` | `/date/:id` (shorter) |
| Plan storage | D1 vs KV | D1 (consistency with events) |
| Venue enrichment | Manual vs AI-assisted | Manual first, AI later |
| Include events? | Required vs Optional | Optional (not all dates need events) |

### Answered Questions
- **Authentication**: Anonymous with local storage for MVP ✓
- **AI Costs**: $0 for MVP, ~$10/month Phase 2 ✓
- **Venue Data**: Yes, need enrichment (see Section 1.2) ✓
- **Mobile App**: PWA sufficient ✓

---

## Next Steps

### Immediate (This Session)
1. [x] Approve this roadmap
2. [x] Create `scripts/scrape-date-venues.ts` skeleton
3. [ ] Set up Google Places API key in `.env`
4. [x] Create D1 migration for venue enrichment fields

### Phase 0: Data Collection Sprint
1. [ ] Scrape downtown restaurants via Google Places
2. [ ] Scrape parks via City of Fayetteville site
3. [ ] Merge with existing 39 venues (dedupe)
4. [ ] Manual curation: add `good_for`, `romantic_score`, `vibe`
5. [ ] Import 100+ enriched venues to D1

### Phase 1: MVP Sprint
1. [ ] Build `/api/date-planner/*` routes
2. [ ] Create PlanDatePage.tsx with form
3. [ ] Build DatePlanMap.tsx component
4. [ ] Implement rule-based generator (uses local DB)
5. [ ] Add share functionality
6. [ ] Test and deploy

### Pre-Launch
1. [ ] Add to main navigation
2. [ ] Homepage promotion widget
3. [ ] Discord announcement
