import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import type { Event } from '../lib/types'
import { fetchEvents } from '../lib/api'
import { groupEventsByTime } from '../lib/utils'
import EventCard from '../components/EventCard'
import SectionTabs from '../components/SectionTabs'
import TimeGroupHeader from '../components/TimeGroupHeader'
import ViewToggle, { type ViewMode } from '../components/ViewToggle'
import CalendarGrid from '../components/CalendarGrid'

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [section, setSection] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  useEffect(() => {
    async function loadEvents() {
      setLoading(true)
      setError(null)
      try {
        const params = section !== 'all' ? { section, limit: 100 } : { limit: 100 }
        const response = await fetchEvents(params)
        setEvents(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events')
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [section])

  const timeGroups = groupEventsByTime(events)

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
            Your central guide to Downtown and Fort Liberty events. Never miss a festival, show, or community gathering.
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
              <span>🎖️</span> Fort Liberty Events
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Controls Bar: Section Tabs + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <SectionTabs value={section} onChange={setSection} />

          {/* View Toggle - Show on all screens */}
          <ViewToggle value={viewMode} onChange={setViewMode} />
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
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Events Display */}
        {!loading && !error && (
          <>
            {events.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">📅</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming events</h3>
                <p className="text-stone">
                  {section !== 'all'
                    ? `No events found for ${section === 'downtown' ? 'Downtown' : 'Fort Liberty'}. Try checking all events.`
                    : 'Check back soon for upcoming events!'}
                </p>
              </div>
            ) : (
              <>
                {/* Calendar View - Shows mobile or desktop version based on screen */}
                {viewMode === 'calendar' && (
                  <CalendarGrid events={events} />
                )}

                {/* List View - Only when list mode selected */}
                {viewMode === 'list' && (
                  <div className="space-y-2">
                    {timeGroups.map((group) => (
                      <div key={group.label}>
                        <TimeGroupHeader
                          label={group.label}
                          emoji={group.emoji}
                          color={group.color}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                          {group.events.slice(0, 6).map((event) => (
                            <EventCard key={event.id} event={event} />
                          ))}
                        </div>
                        {group.events.length > 6 && (
                          <div className="text-center mt-4">
                            <span className="text-sm text-stone">
                              +{group.events.length - 6} more events
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Stats */}
            <div className="mt-12 text-center">
              <p className="text-stone text-sm">
                Showing {events.length} upcoming events from 6 local sources
              </p>
            </div>
          </>
        )}
      </section>

      {/* Calendar CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
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
    </>
  )
}
