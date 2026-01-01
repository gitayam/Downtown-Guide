import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  ArrowPathIcon,
  WifiIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import type { Event } from '../lib/types'
import { fetchEvents, fetchCategories, isOnline } from '../lib/api'
import { groupEventsByTime } from '../lib/utils'
import EventCard from '../components/EventCard'
import SectionTabs from '../components/SectionTabs'
import TimeGroupHeader from '../components/TimeGroupHeader'
import ViewToggle, { type ViewMode } from '../components/ViewToggle'
import CalendarGrid from '../components/CalendarGrid'
import SearchBar from '../components/SearchBar'
import CategoryFilter from '../components/CategoryFilter'

// Local storage key for persisting category selection
const SELECTED_CATEGORIES_KEY = 'fayetteville_events_selected_categories'

// Categories to exclude by default (Movies = Cameo showtimes)
const DEFAULT_EXCLUDED = ['Movies']

// Number of events to show initially per time group
const EVENTS_PER_GROUP = 6

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [section, setSection] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[] | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const retryCountRef = useRef(0)

  // Toggle expansion of a time group
  const toggleGroupExpansion = useCallback((groupLabel: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupLabel)) {
        next.delete(groupLabel)
      } else {
        next.add(groupLabel)
      }
      return next
    })
  }, [])

  // Load categories on mount and initialize selection
  useEffect(() => {
    fetchCategories()
      .then((res) => {
        const allCats = res.data
        setCategories(allCats)

        // Initialize selected categories from localStorage or defaults
        try {
          const stored = localStorage.getItem(SELECTED_CATEGORIES_KEY)
          if (stored) {
            const parsed = JSON.parse(stored)
            // Filter to only include valid categories
            const valid = parsed.filter((c: string) => allCats.includes(c))
            setSelectedCategories(valid.length > 0 ? valid : allCats.filter(c => !DEFAULT_EXCLUDED.includes(c)))
          } else {
            // Default: all categories except the default excluded ones
            setSelectedCategories(allCats.filter(c => !DEFAULT_EXCLUDED.includes(c)))
          }
        } catch {
          setSelectedCategories(allCats.filter(c => !DEFAULT_EXCLUDED.includes(c)))
        }
      })
      .catch(() => {
        setCategories([])
        setSelectedCategories([])
      })
  }, [])

  // Load events function (reusable for retries)
  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number> = { limit: 200 }
      if (section !== 'all') params.section = section
      if (search) params.search = search
      const response = await fetchEvents(params)
      setEvents(response.data)
      retryCountRef.current = 0 // Reset retry count on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [section, search])

  // Load events when filters change
  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Retry handler
  const handleRetry = useCallback(async () => {
    setIsRetrying(true)
    retryCountRef.current += 1
    await loadEvents()
    setIsRetrying(false)
  }, [loadEvents])

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (error) {
        handleRetry()
      }
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [error, handleRetry])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
  }, [])

  // Handle selected categories change and persist
  const handleSelectionChange = useCallback((selected: string[]) => {
    setSelectedCategories(selected)
    try {
      localStorage.setItem(SELECTED_CATEGORIES_KEY, JSON.stringify(selected))
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Filter events by selected categories (client-side filtering)
  const filteredEvents = events.filter(event => {
    // If no categories loaded yet, or all selected, show everything
    if (!selectedCategories || selectedCategories.length === 0) return true
    if (selectedCategories.length === categories.length) return true

    try {
      const eventCategories: string[] = typeof event.categories === 'string'
        ? JSON.parse(event.categories)
        : event.categories || []

      // Show uncategorized events
      if (eventCategories.length === 0) return true

      // Hide event if ANY of its categories is excluded (not in selectedCategories)
      // This ensures that a movie tagged as ["Arts", "Movies"] is hidden when Movies is unchecked
      return eventCategories.every(cat => selectedCategories.includes(cat))
    } catch {
      return true // Keep event if categories can't be parsed
    }
  })

  const timeGroups = groupEventsByTime(filteredEvents)

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-brick via-brick-600 to-forest overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-white">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">
            What's Happening in<br />
            <span className="text-dogwood">Fayetteville</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-xl mb-8">
            Your central guide to Downtown and Fort Bragg events. Never miss a festival, show, or community gathering.
          </p>

          {/* Section Quick Links */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSection('downtown')}
              className="px-5 py-2.5 bg-white text-brick font-medium rounded-lg hover:bg-dogwood-50 transition-colors flex items-center gap-2"
            >
              <span>🏙️</span> Downtown Events
            </button>
            <button
              onClick={() => setSection('fort_bragg')}
              className="px-5 py-2.5 bg-white/20 text-white font-medium rounded-lg hover:bg-white/30 transition-colors border border-white/30 flex items-center gap-2"
            >
              <span>🎖️</span> Fort Bragg Events
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Controls Bar: Section Tabs + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <SectionTabs value={section} onChange={setSection} />

          {/* View Toggle - Show on all screens */}
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>

        {/* Filter Bar: Search + Categories */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <SearchBar value={search} onChange={handleSearchChange} />
          {categories.length > 0 && selectedCategories && (
            <CategoryFilter
              categories={categories}
              selectedCategories={selectedCategories}
              onSelectionChange={handleSelectionChange}
            />
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brick border-t-transparent" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto bg-red-50 rounded-2xl p-6 border border-red-100">
              {/* Icon based on error type */}
              {!isOnline() ? (
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <WifiIcon className="w-8 h-8 text-red-500" />
                </div>
              ) : (
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                </div>
              )}

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {!isOnline() ? 'No Internet Connection' : 'Unable to Load Events'}
              </h3>
              <p className="text-red-600 mb-4 text-sm">{error}</p>

              {/* Helpful tips */}
              {!isOnline() && (
                <p className="text-sm text-gray-600 mb-4">
                  We'll automatically retry when you're back online.
                </p>
              )}

              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brick text-white font-medium rounded-lg hover:bg-brick-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon
                  className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`}
                />
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </button>

              {retryCountRef.current > 2 && (
                <p className="text-xs text-gray-500 mt-4">
                  Still having trouble? Try refreshing the page or check back later.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Events Display */}
        {!loading && !error && (
          <>
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">📅</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No events found</h3>
                <p className="text-stone">
                  {search || (selectedCategories && selectedCategories.length < categories.length)
                    ? 'Try adjusting your search or category filters.'
                    : section !== 'all'
                      ? `No events found for this section. Try checking all events.`
                      : 'Check back soon for upcoming events!'}
                </p>
                {(search || (selectedCategories && selectedCategories.length < categories.length)) && (
                  <button
                    onClick={() => {
                      setSearch('')
                      setSelectedCategories([...categories])
                    }}
                    className="mt-4 text-brick hover:text-brick-600 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Calendar View - Shows mobile or desktop version based on screen */}
                {viewMode === 'calendar' && (
                  <CalendarGrid events={filteredEvents} />
                )}

                {/* List View - Only when list mode selected */}
                {viewMode === 'list' && (
                  <div className="space-y-2">
                    {timeGroups.map((group) => {
                      const isExpanded = expandedGroups.has(group.label)
                      const visibleEvents = isExpanded ? group.events : group.events.slice(0, EVENTS_PER_GROUP)
                      const hiddenCount = group.events.length - EVENTS_PER_GROUP

                      return (
                        <div key={group.label}>
                          <TimeGroupHeader
                            label={group.label}
                            emoji={group.emoji}
                            color={group.color}
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {visibleEvents.map((event) => (
                              <EventCard key={event.id} event={event} />
                            ))}
                          </div>
                          {hiddenCount > 0 && (
                            <div className="text-center mt-6">
                              <button
                                onClick={() => toggleGroupExpansion(group.label)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-sand hover:bg-dogwood/20 text-stone hover:text-forest font-medium rounded-lg transition-colors"
                              >
                                {isExpanded ? (
                                  <>
                                    <span>Show Less</span>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                  </>
                                ) : (
                                  <>
                                    <span>Show {hiddenCount} More</span>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* Stats */}
            <div className="mt-12 text-center">
              <p className="text-stone text-sm">
                Showing {filteredEvents.length} upcoming events
                {filteredEvents.length < events.length && (
                  <span className="text-stone/60"> ({events.length - filteredEvents.length} filtered)</span>
                )}
              </p>
            </div>
          </>
        )}
      </section>

      {/* Calendar CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-6">
        <div className="bg-gradient-to-r from-brick to-brick-600 rounded-2xl p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="flex-1">
              <h3 className="font-display text-xl md:text-2xl font-semibold mb-2">
                Never Miss an Event
              </h3>
              <p className="text-white/80">
                Subscribe to our calendar and get Fayetteville events synced to your phone automatically.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/calendar"
                className="px-5 py-2.5 bg-white text-brick font-medium rounded-lg hover:bg-dogwood-50 transition-colors text-center flex items-center justify-center gap-2"
              >
                Subscribe Now
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Discord Community CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="bg-[#5865F2] rounded-2xl p-6 md:p-8 text-white overflow-hidden relative">
          {/* Discord background pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="absolute right-0 top-0 h-full w-auto" viewBox="0 0 200 200" fill="currentColor">
              <circle cx="100" cy="100" r="80" />
            </svg>
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="flex items-center gap-4">
              {/* Discord Logo */}
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-display text-xl md:text-2xl font-semibold mb-1">
                  Join the Fayetteville Community
                </h3>
                <p className="text-white/80 text-sm md:text-base">
                  Chat with locals, share event recommendations, and connect with your neighbors on Discord.
                </p>
              </div>
            </div>
            <a
              href="https://discord.gg/drEyQW5G"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-white text-[#5865F2] font-semibold rounded-lg hover:bg-gray-100 transition-colors text-center flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Join Discord
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
