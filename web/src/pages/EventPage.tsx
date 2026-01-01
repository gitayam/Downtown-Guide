import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  TicketIcon,
  ArrowTopRightOnSquareIcon,
  ArrowLeftIcon,
  ShareIcon,
  PhoneIcon,
  InformationCircleIcon,
  MapIcon,
} from '@heroicons/react/24/outline'
import type { Event } from '../lib/types'
import { fetchEvent } from '../lib/api'
import {
  formatEventDateFull,
  formatEventTimeRange,
  getSectionBadge,
  getSourceBadge,
} from '../lib/utils'
import DirectionsModal from '../components/DirectionsModal'
import ShareModal from '../components/share/ShareModal'
import EventMap from '../components/EventMap'

export default function EventPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [directionsOpen, setDirectionsOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)

  useEffect(() => {
    async function loadEvent() {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const response = await fetchEvent(id)
        setEvent(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }
    loadEvent()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brick border-t-transparent" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <span className="text-4xl mb-4 block">😕</span>
        <h1 className="text-2xl font-display font-semibold mb-2">Event Not Found</h1>
        <p className="text-stone mb-6">{error || 'This event could not be found.'}</p>
        <Link to="/" className="btn-primary">
          Back to Events
        </Link>
      </div>
    )
  }

  const sectionBadge = getSectionBadge(event.section)
  const sourceBadge = getSourceBadge(event.source_id)

  const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render')
  googleCalendarUrl.searchParams.set('action', 'TEMPLATE')
  googleCalendarUrl.searchParams.set('text', event.title)
  googleCalendarUrl.searchParams.set('dates', `${event.start_datetime.replace(/[-:]/g, '').split('.')[0]}Z/${event.end_datetime.replace(/[-:]/g, '').split('.')[0]}Z`)
  if (event.location_name) googleCalendarUrl.searchParams.set('location', event.location_name)
  if (event.description) googleCalendarUrl.searchParams.set('details', event.description.slice(0, 500))

  return (
    <>
      <DirectionsModal
        isOpen={directionsOpen}
        onClose={() => setDirectionsOpen(false)}
        event={event}
      />
      
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        content={{
          type: 'event',
          id: event.id,
          title: event.title,
          description: event.description || '',
          url: window.location.href,
          image: event.image_url || undefined,
          date: formatEventDateFull(event.start_datetime),
          location: event.venue_name || event.location_name || undefined
        }}
      />

      {/* Header Image */}
      <header className="relative">
        {event.image_url ? (
          <div className="aspect-[21/9] md:aspect-[3/1] relative">
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>
        ) : (
          <div className="aspect-[21/9] md:aspect-[4/1] relative bg-gradient-to-br from-brick via-brick-600 to-forest">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-8xl opacity-20">📅</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}

        {/* Back Button */}
        <Link
          to="/"
          className="absolute top-4 left-4 px-3 py-2 bg-black/30 hover:bg-black/50 text-white rounded-lg backdrop-blur-sm transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </Link>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
          <div className="max-w-4xl mx-auto">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={sectionBadge.className}>
                <span>{sectionBadge.emoji}</span>
                {sectionBadge.label}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-white/20 text-white">
                {sourceBadge.emoji} {sourceBadge.label}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">
              {event.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-white/90">
              <span className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                {formatEventDateFull(event.start_datetime)}
              </span>
              {(event.venue_name || event.location_name) && (
                <span className="flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5" />
                  {event.venue_name || event.location_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {event.description && (
              <section>
                <h2 className="font-display text-xl font-semibold mb-4">About This Event</h2>
                <div className="prose prose-stone max-w-none">
                  <p className="text-stone whitespace-pre-wrap leading-relaxed">
                    {event.description}
                  </p>
                </div>
              </section>
            )}

            {/* Map */}
            {(event.venue_latitude && event.venue_longitude) && (
              <section>
                <h2 className="font-display text-xl font-semibold mb-4">Location</h2>
                <EventMap
                  latitude={event.venue_latitude}
                  longitude={event.venue_longitude}
                  venueName={event.venue_name || event.location_name || undefined}
                  address={event.venue_address ? `${event.venue_address}, ${event.venue_city || 'Fayetteville'}, ${event.venue_state || 'NC'}` : undefined}
                />
                {event.venue_parking_info && (
                  <p className="mt-3 text-sm text-stone">
                    <span className="font-medium">Parking:</span> {event.venue_parking_info}
                  </p>
                )}
                {event.venue_accessibility_info && (
                  <p className="mt-2 text-sm text-stone">
                    <span className="font-medium">Accessibility:</span> {event.venue_accessibility_info}
                  </p>
                )}
              </section>
            )}

            {/* Source Attribution */}
            <section className="pt-6 border-t border-sand">
              <p className="text-sm text-stone">
                Event information provided by{' '}
                <span className="font-medium">{event.source_name || event.source_id}</span>
              </p>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Event Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-sand p-6 space-y-6">
              {/* Venue Image */}
              {event.venue_image_url && (
                <div className="-mx-6 -mt-6 mb-4">
                  <img 
                    src={event.venue_image_url} 
                    alt={event.venue_name || 'Venue'} 
                    className="w-full h-48 object-cover rounded-t-xl"
                  />
                </div>
              )}

              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-brick/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ClockIcon className="w-5 h-5 text-brick" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {formatEventDateFull(event.start_datetime)}
                  </p>
                  <p className="text-sm text-stone">
                    {formatEventTimeRange(event.start_datetime, event.end_datetime)}
                  </p>
                </div>
              </div>

              {/* Location */}
              {(event.venue_name || event.location_name) && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-capefear/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPinIcon className="w-5 h-5 text-capefear" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {event.venue_name || event.location_name}
                      </p>
                      {event.venue_address && (
                        <p className="text-sm text-stone">{event.venue_address}</p>
                      )}
                      <p className="text-sm text-stone">
                        {event.venue_city || 'Fayetteville'}, {event.venue_state || 'NC'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setDirectionsOpen(true)}
                    className="w-full py-2 px-3 text-sm font-medium text-capefear bg-capefear/5 hover:bg-capefear/10 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <MapIcon className="w-4 h-4" />
                    Get Directions
                  </button>
                </div>
              )}

              {/* Phone */}
              {event.venue_phone && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-sand/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PhoneIcon className="w-5 h-5 text-stone" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-stone mb-0.5">Contact</p>
                    <a href={`tel:${event.venue_phone}`} className="font-medium text-gray-900 hover:text-brick">
                      {event.venue_phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Hours */}
              {event.venue_hours_of_operation && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-sand/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <InformationCircleIcon className="w-5 h-5 text-stone" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-stone mb-0.5">Venue Hours</p>
                    <p className="font-medium text-gray-900 text-sm whitespace-pre-wrap">
                      {event.venue_hours_of_operation}
                    </p>
                  </div>
                </div>
              )}

              {/* Divider */}
              <hr className="border-sand" />

              {/* Action Buttons */}
              <div className="space-y-3">
                {event.ticket_url && (
                  <a
                    href={event.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <TicketIcon className="w-5 h-5" />
                    Get Tickets
                  </a>
                )}

                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                    Event Website
                  </a>
                )}

                <a
                  href={googleCalendarUrl.toString()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost w-full flex items-center justify-center gap-2 border border-sand"
                >
                  <CalendarIcon className="w-5 h-5" />
                  Add to Calendar
                </a>

                <button
                  onClick={() => setShareModalOpen(true)}
                  className="btn-ghost w-full flex items-center justify-center gap-2 border border-sand"
                >
                  <ShareIcon className="w-5 h-5" />
                  Share Event
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
