import type { Event, EventsResponse, SourcesResponse } from './types'

const API_BASE = 'https://downtown-guide.wemea-5ahhf.workers.dev'

export async function fetchEvents(params?: {
  section?: string
  source?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}): Promise<EventsResponse> {
  const url = new URL(`${API_BASE}/api/events`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchEvent(id: string): Promise<{ data: Event }> {
  const response = await fetch(`${API_BASE}/api/events/${encodeURIComponent(id)}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch event: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchTodayEvents(): Promise<{ data: Event[]; count: number; date: string }> {
  const response = await fetch(`${API_BASE}/api/events/today`)
  if (!response.ok) {
    throw new Error(`Failed to fetch today's events: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchUpcomingEvents(): Promise<{ data: Event[]; count: number }> {
  const response = await fetch(`${API_BASE}/api/events/upcoming`)
  if (!response.ok) {
    throw new Error(`Failed to fetch upcoming events: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchSources(): Promise<SourcesResponse> {
  const response = await fetch(`${API_BASE}/api/sources`)
  if (!response.ok) {
    throw new Error(`Failed to fetch sources: ${response.statusText}`)
  }
  return response.json()
}

export const ICAL_URL = `${API_BASE}/cal/events.ics`
export const ICAL_DOWNTOWN_URL = `${API_BASE}/cal/events.ics?section=downtown`
export const ICAL_FORTLIBERTY_URL = `${API_BASE}/cal/events.ics?section=fort_bragg`
