# Date Planner Recommendation Engine - Improvement Plan

## Current State Analysis

### Architecture Overview
```
User Preferences → generateDatePlan() → Slot-Based Templates → Random Selection → Date Plan
                         ↓
                   fetchEvents() + DB Query for Venues
                         ↓
                   matchVibe() / matchEventVibe()
                         ↓
                   getRandom() selection
```

### What's Working
- Basic time-of-day templates (morning/afternoon/evening)
- Budget filtering via `price_level`
- Event fetching for selected date
- Swap functionality for individual stops
- Venue coordinates for map display

### Critical Issues Identified

| Issue | Severity | Impact |
|-------|----------|--------|
| Random venue selection | HIGH | No intelligence, poor recommendations |
| Empty venue metadata | HIGH | 50%+ venues missing vibe/category |
| No proximity optimization | HIGH | Stops can be miles apart |
| Hardcoded costs/durations | MEDIUM | Inaccurate estimates |
| Weak vibe matching | MEDIUM | Mismatched recommendations |
| No venue hours check | MEDIUM | Could recommend closed venues |
| Static 3-slot templates | LOW | Inflexible to duration |

---

## Phase 1: Data Quality (Foundation)

**Goal:** Ensure all venues have the metadata needed for intelligent recommendations.

### 1.1 Venue Data Audit & Enrichment

```sql
-- Current state
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN category IS NULL THEN 1 ELSE 0 END) as missing_category,
  SUM(CASE WHEN vibe = '[]' OR vibe IS NULL THEN 1 ELSE 0 END) as missing_vibe,
  SUM(CASE WHEN price_level IS NULL THEN 1 ELSE 0 END) as missing_price,
  SUM(CASE WHEN hours_of_operation IS NULL THEN 1 ELSE 0 END) as missing_hours
FROM venues;
```

**Tasks:**
- [ ] Audit all 52 venues for missing metadata
- [ ] Categorize event venues (Segra, Crown, Festival Park)
- [ ] Add `best_time` field (morning/afternoon/evening suitability)
- [ ] Populate `average_cost` for food/drink venues
- [ ] Add `typical_duration` field (how long people typically stay)
- [ ] Enrich `vibe` arrays with consistent taxonomy

**Vibe Taxonomy (Standardize):**
```typescript
const VIBE_TAXONOMY = {
  romantic: ['intimate', 'cozy', 'candlelit', 'quiet'],
  adventurous: ['active', 'outdoor', 'thrilling', 'unique'],
  cultural: ['artsy', 'historic', 'educational', 'theatre'],
  fun: ['lively', 'playful', 'energetic', 'games'],
  relaxed: ['chill', 'casual', 'low-key', 'peaceful'],
  upscale: ['fancy', 'fine-dining', 'sophisticated', 'special-occasion']
};
```

### 1.2 Event-Venue Linking

Currently 24 events have no `venue_id`. Create venue records for recurring event locations:
- [ ] Map event `location_name` to existing venues
- [ ] Create new venue records for missing locations
- [ ] Backfill `venue_id` on existing events

---

## Phase 2: Intelligent Scoring Engine

**Goal:** Replace random selection with scored ranking.

### 2.1 Venue Scoring Algorithm

```typescript
interface VenueScore {
  venueId: string;
  totalScore: number;
  breakdown: {
    vibeMatch: number;      // 0-30 points
    budgetFit: number;      // 0-20 points
    romanticScore: number;  // 0-15 points (from DB)
    proximityBonus: number; // 0-15 points
    timeOfDayFit: number;   // 0-10 points
    popularityBonus: number;// 0-10 points
  };
}

function scoreVenue(
  venue: Venue,
  prefs: DatePreferences,
  previousStop?: DateStop
): VenueScore {
  let score = 0;

  // 1. Vibe Match (0-30)
  // Direct match = 30, partial = 15, category fallback = 5
  score += calculateVibeScore(venue.vibe, venue.good_for, prefs.vibes);

  // 2. Budget Fit (0-20)
  // Exact match = 20, one tier off = 10, two tiers = 0
  score += calculateBudgetScore(venue.price_level, prefs.budget_range);

  // 3. Romantic Score (0-15)
  // Direct from database, scaled
  score += (venue.romantic_score || 3) * 3;

  // 4. Proximity Bonus (0-15)
  // If previous stop exists, reward nearby venues
  if (previousStop?.venue?.latitude) {
    const distance = haversine(previousStop.venue, venue);
    if (distance < 0.5) score += 15;      // < 0.5 km
    else if (distance < 1) score += 10;   // < 1 km
    else if (distance < 2) score += 5;    // < 2 km
  }

  // 5. Time of Day Fit (0-10)
  // Check best_time array matches prefs.time_of_day
  score += calculateTimeScore(venue.best_time, prefs.time_of_day);

  // 6. Popularity Bonus (0-10)
  // Based on rating * log(review_count)
  score += calculatePopularityScore(venue.rating, venue.review_count);

  return { venueId: venue.id, totalScore: score, breakdown: {...} };
}
```

### 2.2 Weighted Selection

```typescript
function selectVenue(
  candidates: Venue[],
  prefs: DatePreferences,
  previousStop?: DateStop,
  excludeIds: string[] = []
): Venue | null {
  // Score all candidates
  const scored = candidates
    .filter(v => !excludeIds.includes(v.id))
    .map(v => ({ venue: v, score: scoreVenue(v, prefs, previousStop) }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore);

  if (scored.length === 0) return null;

  // Weighted random from top 5 (avoid always picking #1)
  const topN = scored.slice(0, 5);
  const totalWeight = topN.reduce((sum, s) => sum + s.score.totalScore, 0);

  let random = Math.random() * totalWeight;
  for (const s of topN) {
    random -= s.score.totalScore;
    if (random <= 0) return s.venue;
  }

  return topN[0].venue;
}
```

---

## Phase 3: Geographic Optimization

**Goal:** Create walkable, logical routes.

### 3.1 Haversine Distance Utility

```typescript
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function estimateWalkTime(distanceKm: number): number {
  // Average walking speed: 5 km/h = 12 min/km
  return Math.ceil(distanceKm * 12);
}
```

### 3.2 Route Optimization

```typescript
interface OptimizedRoute {
  stops: DateStop[];
  totalWalkTime: number;
  totalDistance: number;
}

function optimizeRoute(stops: DateStop[]): OptimizedRoute {
  if (stops.length <= 2) return { stops, totalWalkTime: 0, totalDistance: 0 };

  // Use nearest-neighbor heuristic
  // Start from first stop (anchor), greedily pick nearest next
  const optimized: DateStop[] = [stops[0]];
  const remaining = [...stops.slice(1)];

  while (remaining.length > 0) {
    const current = optimized[optimized.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    remaining.forEach((stop, idx) => {
      const dist = haversineDistance(
        current.venue.latitude, current.venue.longitude,
        stop.venue.latitude, stop.venue.longitude
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });

    optimized.push(remaining.splice(nearestIdx, 1)[0]);
  }

  // Calculate totals
  let totalDistance = 0;
  for (let i = 1; i < optimized.length; i++) {
    totalDistance += haversineDistance(
      optimized[i-1].venue.latitude, optimized[i-1].venue.longitude,
      optimized[i].venue.latitude, optimized[i].venue.longitude
    );
  }

  return {
    stops: optimized.map((s, i) => ({ ...s, order: i + 1 })),
    totalWalkTime: estimateWalkTime(totalDistance),
    totalDistance
  };
}
```

### 3.3 Transition Tips

```typescript
function generateTransitionTip(from: DateStop, to: DateStop): string {
  const distance = haversineDistance(
    from.venue.latitude, from.venue.longitude,
    to.venue.latitude, to.venue.longitude
  );
  const walkTime = estimateWalkTime(distance);

  if (walkTime <= 3) return "Just a short stroll next door.";
  if (walkTime <= 7) return `${walkTime} minute walk to your next stop.`;
  if (walkTime <= 15) return `Nice ${walkTime} minute walk through downtown.`;
  return `About ${walkTime} minutes - consider driving or rideshare.`;
}
```

---

## Phase 4: Dynamic Planning

**Goal:** Replace rigid templates with flexible, event-aware scheduling.

### 4.1 Time Slot Architecture

```typescript
interface TimeSlot {
  type: 'meal' | 'activity' | 'event' | 'drinks' | 'dessert';
  startTime: string;  // "18:00"
  duration: number;   // minutes
  required: boolean;
  venueCategory: string[];
}

function buildTimeSlots(
  prefs: DatePreferences,
  anchorEvent?: Event
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  if (prefs.time_of_day === 'evening') {
    // If event exists, schedule around it
    if (anchorEvent) {
      const eventStart = new Date(anchorEvent.start_datetime);
      const eventHour = eventStart.getHours();

      // Pre-event dinner if event is 7pm+
      if (eventHour >= 19) {
        slots.push({
          type: 'meal',
          startTime: `${eventHour - 2}:00`,
          duration: 90,
          required: true,
          venueCategory: ['food']
        });
      }

      // The event itself
      slots.push({
        type: 'event',
        startTime: `${eventHour}:00`,
        duration: 120,
        required: true,
        venueCategory: []
      });

      // Post-event drinks if before 10pm
      if (eventHour + 2 < 22) {
        slots.push({
          type: 'drinks',
          startTime: `${eventHour + 2}:00`,
          duration: 60,
          required: false,
          venueCategory: ['drink']
        });
      }
    } else {
      // No event: Dinner → Activity → Nightcap
      slots.push(
        { type: 'meal', startTime: '18:00', duration: 90, required: true, venueCategory: ['food'] },
        { type: 'activity', startTime: '19:30', duration: 60, required: false, venueCategory: ['activity', 'culture'] },
        { type: 'drinks', startTime: '21:00', duration: 60, required: false, venueCategory: ['drink'] }
      );
    }
  }

  // Similar logic for morning/afternoon...

  return slots;
}
```

### 4.2 Duration-Aware Planning

```typescript
function fillTimeSlots(
  slots: TimeSlot[],
  venues: Venue[],
  prefs: DatePreferences
): DateStop[] {
  const stops: DateStop[] = [];
  let remainingDuration = prefs.duration_hours * 60;
  let previousStop: DateStop | null = null;

  for (const slot of slots) {
    if (remainingDuration <= 0 && !slot.required) continue;

    const candidates = venues.filter(v =>
      slot.venueCategory.includes(v.category)
    );

    const selected = selectVenue(
      candidates,
      prefs,
      previousStop,
      stops.map(s => s.venue?.id).filter(Boolean)
    );

    if (selected) {
      const stop: DateStop = {
        order: stops.length + 1,
        venue: selected,
        activity: slot.type === 'meal' ? getMealLabel(slot.startTime) : selected.name,
        duration: selected.typical_duration || slot.duration,
        cost: selected.average_cost || getDefaultCost(slot.type),
        notes: selected.description || '',
        transitionTip: previousStop ? generateTransitionTip(previousStop, { venue: selected } as DateStop) : undefined
      };

      stops.push(stop);
      remainingDuration -= stop.duration;
      previousStop = stop;
    }
  }

  return stops;
}
```

---

## Phase 5: AI Enhancement (Optional)

**Goal:** Use LLM for natural language understanding and creative recommendations.

### 5.1 Natural Language Preferences

```typescript
// Use Cloudflare AI or OpenAI to parse user input
async function parseNaturalLanguagePrefs(
  input: string,
  AI: Ai
): Promise<DatePreferences> {
  const response = await AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      {
        role: 'system',
        content: `Extract date preferences from user input. Return JSON:
          {
            "event_type": "date_night|first_date|anniversary|friends|family",
            "budget_range": "$|$$|$$$",
            "vibes": ["romantic", "adventurous", "cultural", "fun", "relaxed"],
            "duration_hours": 2-6,
            "time_of_day": "morning|afternoon|evening"
          }`
      },
      { role: 'user', content: input }
    ]
  });

  return JSON.parse(response.response);
}
```

### 5.2 Creative Plan Titles & Tips

```typescript
async function generatePlanNarrative(
  plan: DatePlan,
  AI: Ai
): Promise<{ title: string; tips: string[] }> {
  const response = await AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      {
        role: 'system',
        content: 'Generate a creative title and 3 helpful tips for this date plan in Fayetteville, NC.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          stops: plan.stops.map(s => s.venue?.name),
          vibes: plan.vibes,
          time: plan.time_of_day
        })
      }
    ]
  });

  return JSON.parse(response.response);
}
```

---

## Implementation Roadmap

### Sprint 1: Data Foundation (3-5 days)
- [ ] Audit all venues, identify gaps
- [ ] Create venue enrichment script
- [ ] Populate missing category, vibe, price_level
- [ ] Add best_time and typical_duration fields
- [ ] Link orphaned events to venues

### Sprint 2: Scoring Engine (3-5 days)
- [ ] Implement `scoreVenue()` function
- [ ] Implement `selectVenue()` with weighted random
- [ ] Add haversine distance calculation
- [ ] Replace all `getRandom()` calls with `selectVenue()`
- [ ] Unit tests for scoring logic

### Sprint 3: Route Optimization (2-3 days)
- [ ] Implement `optimizeRoute()` function
- [ ] Generate walking time estimates
- [ ] Add transition tips between stops
- [ ] Update frontend to show walk times

### Sprint 4: Dynamic Scheduling (3-5 days)
- [ ] Implement `buildTimeSlots()` for each time of day
- [ ] Event-aware scheduling (before/after event logic)
- [ ] Duration-aware stop selection
- [ ] Use venue's actual costs/durations

### Sprint 5: AI Enhancement (Optional, 2-3 days)
- [ ] Natural language preference parsing
- [ ] Creative title/tip generation
- [ ] Conversation-style plan refinement

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Venues with complete metadata | ~40% | 95%+ |
| Average walking distance between stops | Unknown | < 1 km |
| Vibe match accuracy | Low (random) | 80%+ |
| User plan saves | Unknown | 25%+ of generated |
| Plan regeneration rate | Unknown | < 30% (first plan is good) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/date-generator.ts` | Core algorithm rewrite |
| `src/lib/geo.ts` | New - haversine, route optimization |
| `src/lib/scoring.ts` | New - venue scoring engine |
| `migrations/000X_venue_enrichment.sql` | Schema additions |
| `scripts/enrich-venues.ts` | Data enrichment automation |

---

*Created: January 3, 2026*
*Author: Senior Development Review*
