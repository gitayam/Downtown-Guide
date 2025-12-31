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
