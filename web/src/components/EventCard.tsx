import { Link } from 'react-router-dom'
import { MapPinIcon, ClockIcon, TicketIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import type { Event } from '../lib/types'
import { formatEventDate, formatEventTime, getSectionBadge, truncateText, parseCategories } from '../lib/utils'
import { ShareIconButton } from './share/ShareButton'
import type { ShareableContent } from '../hooks/useShare'

interface EventCardProps {
  event: Event
  variant?: 'default' | 'compact'
}

export default function EventCard({ event, variant = 'default' }: EventCardProps) {
  const badge = getSectionBadge(event.section)
  const isFeatured = event.featured === 1 || event.featured === true

  const shareContent: ShareableContent = {
    type: 'event',
    id: event.id,
    title: event.title,
    description: event.description || '',
    url: `/events/${event.id}`,
    date: formatEventDate(event.start_datetime),
    location: event.location_name || undefined,
  }

  if (variant === 'compact') {
    return (
      <Link
        to={`/events/${event.id}`}
        className="flex gap-4 p-3 bg-white rounded-lg hover:bg-sand/50 transition-colors border border-transparent hover:border-dogwood/30 group"
        aria-label={`${event.title} on ${formatEventDate(event.start_datetime)}${event.location_name ? ` at ${event.location_name}` : ''}`}
      >
        {/* Date Block */}
        <div className="flex-shrink-0 w-14 h-14 bg-brick/10 rounded-lg flex flex-col items-center justify-center">
          <span className="text-xs font-medium text-brick uppercase">
            {formatEventDate(event.start_datetime).split(', ')[1]?.split(' ')[0]}
          </span>
          <span className="text-xl font-bold text-brick">
            {formatEventDate(event.start_datetime).split(' ').pop()}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate group-hover:text-brick transition-colors">
            {event.title}
          </h3>
          <p className="text-sm text-stone">
            {formatEventTime(event.start_datetime)}
            {event.location_name && ` • ${event.location_name}`}
          </p>
        </div>

        {/* Badge */}
        <span className={`${badge.className} self-center hidden sm:flex`}>
          <span>{badge.emoji}</span>
          {badge.label}
        </span>
      </Link>
    )
  }

  return (
    <article>
      <Link
        to={`/events/${event.id}`}
        className={`card group block ${isFeatured ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-100' : ''}`}
        aria-label={`${isFeatured ? 'Featured: ' : ''}${event.title} on ${formatEventDate(event.start_datetime)}${event.location_name ? ` at ${event.location_name}` : ''}`}
      >
      {/* Image */}
      {event.image_url ? (
        <div className="aspect-video relative overflow-hidden bg-sand">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {/* Featured Badge */}
          {isFeatured && (
            <span className="absolute top-3 left-3 bg-gradient-to-r from-amber-400 to-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-md">
              <StarIconSolid className="w-3.5 h-3.5" />
              Featured
            </span>
          )}
          {/* Section Badge - move down if featured */}
          <span className={`absolute ${isFeatured ? 'top-12' : 'top-3'} left-3 ${badge.className}`}>
            <span>{badge.emoji}</span>
            {badge.label}
          </span>
          {/* Share Button */}
          <span
            className="absolute top-3 right-3"
            onClick={(e) => e.preventDefault()}
          >
            <ShareIconButton content={shareContent} className="shadow-md" />
          </span>
        </div>
      ) : (
        <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-brick/10 to-capefear/10 flex items-center justify-center">
          <span className="text-4xl opacity-50">📅</span>
          {/* Featured Badge */}
          {isFeatured && (
            <span className="absolute top-3 left-3 bg-gradient-to-r from-amber-400 to-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-md">
              <StarIconSolid className="w-3.5 h-3.5" />
              Featured
            </span>
          )}
          {/* Section Badge - move down if featured */}
          <span className={`absolute ${isFeatured ? 'top-12' : 'top-3'} left-3 ${badge.className}`}>
            <span>{badge.emoji}</span>
            {badge.label}
          </span>
          {/* Share Button */}
          <span
            className="absolute top-3 right-3"
            onClick={(e) => e.preventDefault()}
          >
            <ShareIconButton content={shareContent} className="shadow-md" />
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm text-stone">
          <ClockIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <time dateTime={event.start_datetime}>{formatEventDate(event.start_datetime)}</time>
          <span className="text-dogwood" aria-hidden="true">•</span>
          <span>{formatEventTime(event.start_datetime)}</span>
        </div>

        {/* Title */}
        <h3 className="font-body text-lg font-semibold text-gray-900 group-hover:text-brick transition-colors line-clamp-2">
          {event.title}
        </h3>

        {/* Categories */}
        {parseCategories(event.categories).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {parseCategories(event.categories).slice(0, 2).map((cat) => (
              <span
                key={cat}
                className="px-2 py-0.5 text-xs font-medium bg-sand text-stone rounded-full"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Location */}
        {event.location_name && (
          <p className="text-sm text-stone flex items-center gap-1">
            <MapPinIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{event.location_name}</span>
          </p>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-sm text-stone/80 line-clamp-2">
            {truncateText(event.description, 120)}
          </p>
        )}

        {/* Ticket indicator */}
        {event.ticket_url && (
          <div className="flex items-center gap-1 text-xs text-capefear font-medium pt-1">
            <TicketIcon className="w-4 h-4" aria-hidden="true" />
            <span>Tickets Available</span>
          </div>
        )}
      </div>
      </Link>
    </article>
  )
}
