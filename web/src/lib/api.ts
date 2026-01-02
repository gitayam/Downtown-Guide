import type { Event, EventsResponse, SourcesResponse } from './types'

// Use relative URLs - requests will be proxied through Pages Functions
export const API_URL = ''

// Configuration for resilient API calls
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  timeout: 15000, // 15 second timeout
}

// Cache keys for localStorage fallback
const CACHE_KEYS = {
  events: 'downtown_guide_events_cache',
  categories: 'downtown_guide_categories_cache',
  sources: 'downtown_guide_sources_cache',
}

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

interface CacheEntry<T> {
  data: T
  timestamp: number
  params?: string
}

// Helper: Store data in cache
function setCache<T>(key: string, data: T, params?: string): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), params }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // localStorage might be full or unavailable
  }
}

// Helper: Get data from cache
function getCache<T>(key: string, params?: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const entry: CacheEntry<T> = JSON.parse(raw)
    const age = Date.now() - entry.timestamp

    // Check if cache matches params (for events with filters)
    if (params && entry.params !== params) return null

    // Return cache even if stale (for fallback), but mark it
    if (age < CACHE_TTL) {
      return entry.data
    }

    // Return stale cache as fallback
    return entry.data
  } catch {
    return null
  }
}

// Helper: Check if cache is fresh (exported for potential use)
export function isCacheFresh(key: string, params?: string): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return false

    const entry = JSON.parse(raw)
    if (params && entry.params !== params) return false

    return Date.now() - entry.timestamp < CACHE_TTL
  } catch {
    return false
  }
}

// Helper: Fetch with timeout
async function fetchWithTimeout(
  url: string,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

// Helper: Sleep for exponential backoff
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Helper: Calculate backoff delay
function getBackoffDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt)
  const jitter = Math.random() * 0.3 * delay // Add 0-30% jitter
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelayMs)
}

// Main resilient fetch function with retry and caching
async function resilientFetch<T>(
  url: string,
  cacheKey: string,
  cacheParams?: string
): Promise<T> {
  let lastError: Error | null = null

  // Try to fetch with retries
  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, RETRY_CONFIG.timeout)

      if (!response.ok) {
        throw new Error(
          `API error ${response.status}: ${response.statusText || 'Unknown error'}`
        )
      }

      const data = await response.json()

      // Cache successful response
      setCache(cacheKey, data, cacheParams)

      return data
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on 4xx errors (client errors)
      if (lastError.message.includes('API error 4')) {
        break
      }

      // Wait before retrying (except on last attempt)
      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        await sleep(getBackoffDelay(attempt))
      }
    }
  }

  // All retries failed - try to use cached data as fallback
  const cachedData = getCache<T>(cacheKey, cacheParams)
  if (cachedData) {
    console.warn('Using cached data after fetch failure:', lastError?.message)
    return cachedData
  }

  // Determine error type for user-friendly message
  const errorMessage = getErrorMessage(lastError)
  throw new Error(errorMessage)
}

// Helper: Get user-friendly error message
function getErrorMessage(error: Error | null): string {
  if (!error) return 'Failed to load events. Please try again.'

  const msg = error.message.toLowerCase()

  if (msg.includes('aborted') || msg.includes('timeout')) {
    return 'Request timed out. Please check your connection and try again.'
  }

  if (msg.includes('networkerror') || msg.includes('failed to fetch')) {
    return 'Network error. Please check your internet connection.'
  }

  if (msg.includes('api error 5')) {
    return 'Server is temporarily unavailable. Please try again in a few minutes.'
  }

  if (msg.includes('api error 4')) {
    return 'Invalid request. Please refresh the page.'
  }

  return 'Failed to load events. Please try again.'
}

export async function fetchEvents(params?: {
  section?: string
  source?: string
  from?: string
  to?: string
  search?: string
  category?: string
  limit?: number
  offset?: number
}): Promise<EventsResponse> {
  const url = new URL(`${API_URL}/api/events`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  // Create cache key from params
  const cacheParams = params ? JSON.stringify(params) : 'default'

  return resilientFetch<EventsResponse>(
    url.toString(),
    CACHE_KEYS.events,
    cacheParams
  )
}

export async function fetchEvent(id: string): Promise<{ data: Event }> {
  const url = `${API_URL}/api/events/${encodeURIComponent(id)}`
  return resilientFetch<{ data: Event }>(
    url,
    `${CACHE_KEYS.events}_${id}`,
    id
  )
}

export async function fetchTodayEvents(): Promise<{
  data: Event[]
  count: number
  date: string
}> {
  const url = `${API_URL}/api/events/today`
  return resilientFetch<{ data: Event[]; count: number; date: string }>(
    url,
    `${CACHE_KEYS.events}_today`,
    'today'
  )
}

export async function fetchUpcomingEvents(): Promise<{
  data: Event[]
  count: number
}> {
  const url = `${API_URL}/api/events/upcoming`
  return resilientFetch<{ data: Event[]; count: number }>(
    url,
    `${CACHE_KEYS.events}_upcoming`,
    'upcoming'
  )
}

export async function fetchSources(): Promise<SourcesResponse> {
  const url = `${API_URL}/api/sources`
  return resilientFetch<SourcesResponse>(url, CACHE_KEYS.sources)
}

export async function fetchCategories(): Promise<{
  data: string[]
  count: number
}> {
  const url = `${API_URL}/api/categories`
  return resilientFetch<{ data: string[]; count: number }>(
    url,
    CACHE_KEYS.categories
  )
}

// Export for checking network status
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

// Export for checking if we have cached data available
export function hasCachedEvents(params?: Record<string, unknown>): boolean {
  const cacheParams = params ? JSON.stringify(params) : 'default'
  return getCache(CACHE_KEYS.events, cacheParams) !== null
}

// Worker URL for calendar feeds (needs full URL for external calendar apps)
const WORKER_URL = 'https://downtown-guide.wemea-5ahhf.workers.dev'

// iCal feed URLs (HTTPS - for download)
export const ICAL_URL = `${WORKER_URL}/cal/events.ics`
export const ICAL_DOWNTOWN_URL = `${WORKER_URL}/cal/events.ics?section=downtown`
export const ICAL_CROWN_URL = `${WORKER_URL}/cal/events.ics?section=crown`
export const ICAL_FORTLIBERTY_URL = `${WORKER_URL}/cal/events.ics?section=fort_bragg`
export const ICAL_HOLIDAYS_URL = `${WORKER_URL}/cal/events.ics?source=fort_liberty_holidays`

// WebCal URLs (for one-click subscription on mobile/desktop)
const WEBCAL_BASE = WORKER_URL.replace('https://', 'webcal://')
export const WEBCAL_URL = `${WEBCAL_BASE}/cal/events.ics`
export const WEBCAL_DOWNTOWN_URL = `${WEBCAL_BASE}/cal/events.ics?section=downtown`
export const WEBCAL_CROWN_URL = `${WEBCAL_BASE}/cal/events.ics?section=crown`
export const WEBCAL_FORTLIBERTY_URL = `${WEBCAL_BASE}/cal/events.ics?section=fort_bragg`
export const WEBCAL_HOLIDAYS_URL = `${WEBCAL_BASE}/cal/events.ics?source=fort_liberty_holidays`

// Legacy alias
export const ICAL_FORTBRAGG_URL = ICAL_FORTLIBERTY_URL
