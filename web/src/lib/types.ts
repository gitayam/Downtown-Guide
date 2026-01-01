export type EventSection = 'downtown' | 'fort_bragg' | 'crown'

export interface Event {
  id: string
  source_id: string
  external_id: string
  title: string
  description: string | null
  start_datetime: string
  end_datetime: string
  location_name: string | null
  url: string | null
  ticket_url: string | null
  image_url: string | null
  categories: string | null
  section: EventSection
  status: string
  source_name: string | null
  featured?: number | boolean
  venue_name?: string
  venue_address?: string
  venue_city?: string
  venue_state?: string
  venue_zip?: string
  venue_phone?: string
  venue_website?: string
  venue_google_maps_url?: string
  venue_apple_maps_url?: string
  venue_hours_of_operation?: string
  venue_image_url?: string
  venue_parking_info?: string
  venue_accessibility_info?: string
  venue_latitude?: number
  venue_longitude?: number
  venue_coordinates?: { lat: number; lng: number } // Legacy fallback
}

export interface Source {
  id: string
  name: string
  url: string
  type: string
  section: EventSection
  sync_interval_minutes: number
  last_sync: string | null
  last_sync_status: string | null
  last_sync_count: number | null
  is_active: boolean
}

export interface EventsResponse {
  data: Event[]
  count: number
  total: number
  limit: number
  offset: number
}

export interface SourcesResponse {
  data: Source[]
  count: number
}

export interface TimeGroup {
  label: string
  emoji: string
  color: 'dogwood' | 'capefear' | 'liberty' | 'brick'
  events: Event[]
}
