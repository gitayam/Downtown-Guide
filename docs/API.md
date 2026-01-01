# Fayetteville Events API Documentation

**Base URL:** `https://ncfayetteville.com`

**Alternative:** `https://downtown-guide.wemea-5ahhf.workers.dev`

The Fayetteville Events API provides programmatic access to community events in the Fayetteville, NC area. The API is built on Cloudflare Workers with a D1 database backend.

## Features

- RESTful JSON API
- CORS enabled for all origins
- 5-minute server-side caching
- iCal calendar feed support
- Pagination support
- Comprehensive filtering options

---

## Endpoints Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET | List events with filters |
| `/api/events/today` | GET | Today's events |
| `/api/events/upcoming` | GET | Events in next 7 days |
| `/api/events/:id` | GET | Single event details |
| `/api/categories` | GET | List available categories |
| `/api/sources` | GET | List event sources |
| `/cal/events.ics` | GET | iCal calendar feed |
| `/api/health` | GET | Health check |

---

## Events

### List Events

Retrieve a filtered list of events.

```
GET /api/events
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `section` | string | `all` | Filter by area: `downtown`, `fort_bragg`, `crown`, or `all` |
| `source` | string | - | Filter by source ID (e.g., `distinctly_fayetteville`) |
| `from` | string | now | Start date filter (ISO 8601 format) |
| `to` | string | - | End date filter (ISO 8601 format) |
| `search` | string | - | Text search in title and description |
| `category` | string | - | Filter by category (e.g., `Arts`, `Live Music`) |
| `categories` | string | - | Filter by multiple categories (comma-separated) |
| `featured` | boolean | - | Filter featured events only (`true` or `false`) |
| `limit` | integer | `100` | Maximum results to return (max: 500) |
| `offset` | integer | `0` | Pagination offset |

#### Example Requests

**Get all upcoming events:**
```bash
curl "https://ncfayetteville.com/api/events"
```

**Get downtown events for a specific date range:**
```bash
curl "https://ncfayetteville.com/api/events?section=downtown&from=2025-01-01&to=2025-01-07"
```

**Search for music events:**
```bash
curl "https://ncfayetteville.com/api/events?search=music&category=Live%20Music"
```

**Get events in multiple categories:**
```bash
curl "https://ncfayetteville.com/api/events?categories=Arts,Live%20Music,Festivals"
```

**Paginate through results:**
```bash
curl "https://ncfayetteville.com/api/events?limit=20&offset=40"
```

#### Response

```json
{
  "data": [
    {
      "id": "distinctly_12345",
      "source_id": "distinctly_fayetteville",
      "external_id": "12345",
      "title": "First Friday Art Walk",
      "description": "Monthly art walk through downtown galleries...",
      "start_datetime": "2025-01-03T17:00:00.000Z",
      "end_datetime": "2025-01-03T21:00:00.000Z",
      "location_name": "Downtown Fayetteville",
      "url": "https://example.com/event/12345",
      "ticket_url": null,
      "image_url": "https://example.com/images/event.jpg",
      "categories": "[\"Arts\", \"Community\"]",
      "section": "downtown",
      "status": "confirmed",
      "featured": 0,
      "source_name": "Distinctly Fayetteville",
      "venue_latitude": 35.0527,
      "venue_longitude": -78.8784,
      "venue_name": "Arts Center"
    }
  ],
  "count": 1,
  "total": 156,
  "limit": 100,
  "offset": 0
}
```

---

### Get Single Event

Retrieve detailed information for a specific event.

```
GET /api/events/:id
```

#### Response

```json
{
  "data": {
    "id": "distinctly_12345",
    "source_id": "distinctly_fayetteville",
    "title": "First Friday Art Walk",
    "description": "Full event description...",
    "start_datetime": "2025-01-03T17:00:00.000Z",
    "end_datetime": "2025-01-03T21:00:00.000Z",
    "location_name": "Downtown Fayetteville",
    "url": "https://example.com/event",
    "ticket_url": null,
    "image_url": "https://example.com/image.jpg",
    "categories": "[\"Arts\", \"Community\"]",
    "section": "downtown",
    "status": "confirmed",
    "featured": 0,
    "source_name": "Distinctly Fayetteville",
    "venue_name": "Arts Council of Fayetteville",
    "venue_address": "301 Hay St",
    "venue_city": "Fayetteville",
    "venue_state": "NC",
    "venue_zip": "28301",
    "venue_phone": "(910) 323-1776",
    "venue_website": "https://theartscouncil.com",
    "venue_google_maps_url": "https://maps.google.com/?q=...",
    "venue_apple_maps_url": "https://maps.apple.com/?q=...",
    "venue_hours_of_operation": "Mon-Fri 9am-5pm",
    "venue_image_url": "https://example.com/venue.jpg",
    "venue_parking_info": "Street parking available",
    "venue_accessibility_info": "Wheelchair accessible"
  }
}
```

---

### Today's Events

Get all events happening today.

```
GET /api/events/today
```

#### Response

```json
{
  "data": [...],
  "count": 12,
  "date": "2025-01-03"
}
```

---

### Upcoming Events

Get events for the next 7 days.

```
GET /api/events/upcoming
```

#### Response

```json
{
  "data": [...],
  "count": 45,
  "range": {
    "from": "2025-01-03T12:00:00.000Z",
    "to": "2025-01-10T12:00:00.000Z"
  }
}
```

---

## Categories

### List Categories

Get all available event categories.

```
GET /api/categories
```

#### Response

```json
{
  "data": [
    "Arts",
    "Community",
    "Expos",
    "Family",
    "Festivals",
    "FSU Sports",
    "Live Music",
    "Long Weekend",
    "Military",
    "Movies",
    "Nightlife",
    "Sports"
  ],
  "count": 12
}
```

---

## Sources

### List Sources

Get all event sources with sync status.

```
GET /api/sources
```

#### Response

```json
{
  "data": [
    {
      "id": "distinctly_fayetteville",
      "name": "Distinctly Fayetteville",
      "url": "https://distinctlyfayettevillenc.com",
      "type": "scraper",
      "section": "downtown",
      "sync_interval_minutes": 60,
      "last_sync": "2025-01-03T12:00:00.000Z",
      "last_sync_status": "success",
      "last_sync_count": 45,
      "is_active": 1
    }
  ],
  "count": 8
}
```

---

## Calendar Feed

### iCal Feed

Subscribe to events via iCal format. Compatible with Google Calendar, Apple Calendar, Outlook, etc.

```
GET /cal/events.ics
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `section` | string | Filter by section: `downtown`, `fort_bragg`, `crown`, `holidays` |
| `source` | string | Filter by source ID |

#### Example URLs

**All events:**
```
https://ncfayetteville.com/cal/events.ics
```

**Downtown events only:**
```
https://ncfayetteville.com/cal/events.ics?section=downtown
```

**Fort Liberty training holidays:**
```
https://ncfayetteville.com/cal/events.ics?section=holidays
```

---

## Health Check

### API Health

Check if the API is operational.

```
GET /api/health
```

#### Response

```json
{
  "status": "ok",
  "timestamp": "2025-01-03T12:00:00.000Z"
}
```

---

## Data Types

### Event Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique event identifier |
| `source_id` | string | Source that provided this event |
| `external_id` | string | Original ID from source |
| `title` | string | Event title |
| `description` | string | Full event description |
| `start_datetime` | string | Start time (ISO 8601) |
| `end_datetime` | string | End time (ISO 8601) |
| `location_name` | string | Venue/location name |
| `url` | string | Event details URL |
| `ticket_url` | string | Ticket purchase URL (if applicable) |
| `image_url` | string | Event image URL |
| `categories` | string | JSON array of categories |
| `section` | string | Area: `downtown`, `fort_bragg`, `crown` |
| `status` | string | Event status: `confirmed`, `active`, `cancelled` |
| `featured` | integer | 1 if featured, 0 otherwise |
| `venue_latitude` | number | Venue latitude coordinate |
| `venue_longitude` | number | Venue longitude coordinate |
| `venue_name` | string | Normalized venue name |

### Sections

| Value | Description |
|-------|-------------|
| `downtown` | Downtown Fayetteville events |
| `fort_bragg` | Fort Liberty/Bragg area events |
| `crown` | Crown Complex events |
| `all` | All sections combined |

### Event Status

| Value | Description |
|-------|-------------|
| `confirmed` | Event is confirmed |
| `active` | Event is currently happening |
| `cancelled` | Event has been cancelled |

---

## Rate Limiting & Caching

- **Cache Duration:** 5 minutes for all `/api/*` endpoints
- **Rate Limiting:** No strict rate limiting, but please be respectful
- **Cache Headers:** Responses include `Cache-Control: public, max-age=300`

---

## Error Responses

### 404 Not Found

```json
{
  "error": "Event not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

---

## Usage Examples

### JavaScript/TypeScript

```typescript
// Fetch today's events
const response = await fetch('https://ncfayetteville.com/api/events/today');
const { data: events } = await response.json();

// Search with filters
const params = new URLSearchParams({
  section: 'downtown',
  search: 'music',
  from: '2025-01-01',
  to: '2025-01-31',
  limit: '50'
});
const filtered = await fetch(`https://ncfayetteville.com/api/events?${params}`);
```

### Python

```python
import requests

# Get upcoming events
response = requests.get('https://ncfayetteville.com/api/events/upcoming')
events = response.json()['data']

# Filter by category
params = {
    'category': 'Live Music',
    'section': 'downtown',
    'limit': 20
}
response = requests.get('https://ncfayetteville.com/api/events', params=params)
```

### cURL

```bash
# Get all categories
curl https://ncfayetteville.com/api/categories

# Search events
curl "https://ncfayetteville.com/api/events?search=art&section=downtown"

# Subscribe to calendar (copy URL to calendar app)
# https://ncfayetteville.com/cal/events.ics?section=downtown
```

---

## Changelog

### 2025-01-01
- Added multi-category filtering with `categories` parameter
- Added `featured` filter parameter
- Enhanced API documentation

### 2024-12-31
- Added custom date range support
- Added venue coordinates to event responses
- Improved map view functionality
