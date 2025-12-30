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
} from '@heroicons/react/24/outline'
import type { Event } from '../lib/types'
import { fetchEvent } from '../lib/api'
import {
  formatEventDateFull,
  formatEventTimeRange,
  getSectionBadge,
  getSourceBadge,
} from '../lib/utils'

export default function EventPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const handleShare = async () => {
    const shareData = {
      title: event.title,
      text: `Check out this event: ${event.title}`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render')
  googleCalendarUrl.searchParams.set('action', 'TEMPLATE')
  googleCalendarUrl.searchParams.set('text', event.title)
  googleCalendarUrl.searchParams.set('dates', `${event.start_datetime.replace(/[-:]/g, '').split('.')[0]}Z/${event.end_datetime.replace(/[-:]/g, '').split('.')[0]}Z`)
  if (event.location_name) googleCalendarUrl.searchParams.set('location', event.location_name)
  if (event.description) googleCalendarUrl.searchParams.set('details', event.description.slice(0, 500))

  return (
    <>
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
              {event.location_name && (
                <span className="flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5" />
                  {event.location_name}
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
            <div className="bg-white rounded-xl shadow-sm border border-sand p-6 space-y-4">
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
              {event.location_name && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-capefear/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPinIcon className="w-5 h-5 text-capefear" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{event.location_name}</p>
                    <p className="text-sm text-stone">Fayetteville, NC</p>
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
                  onClick={handleShare}
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
