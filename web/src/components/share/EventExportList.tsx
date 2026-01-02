import { format } from 'date-fns'
import type { Event } from '../../lib/types'

interface EventExportListProps {
  events: Event[]
  title: string
  subtitle?: string
}

export default function EventExportList({ events, title, subtitle }: EventExportListProps) {
  return (
    <div 
      id="event-export-container"
      className="bg-white p-8 w-[600px] font-sans"
      style={{
        // Ensure consistent rendering for capture
        width: '600px',
        minHeight: '600px',
        position: 'absolute',
        left: '-9999px',
        top: 0,
      }}
    >
      {/* Header */}
      <div className="bg-brick text-white p-6 rounded-t-xl mb-6">
        <h1 className="text-3xl font-bold font-display mb-2">{title}</h1>
        {subtitle && <p className="text-white/90 text-lg">{subtitle}</p>}
        <div className="mt-4 flex items-center gap-2 text-sm text-white/80">
          <span>fayetteville.events</span>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No events scheduled.</p>
        ) : (
          events.slice(0, 15).map((event) => { // Limit to 15 to fit reasonably
            const startDate = new Date(event.start_datetime)
            return (
              <div key={event.id} className="flex gap-4 border-b border-gray-100 pb-3 last:border-0">
                <div className="flex-shrink-0 w-20 text-right">
                  <div className="font-bold text-gray-900">
                    {format(startDate, 'h:mm a')}
                  </div>
                  <div className="text-xs text-gray-500 uppercase">
                    {format(startDate, 'MMM d')}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {event.title}
                  </h3>
                  <div className="text-sm text-gray-600 truncate">
                    {event.location_name || event.venue_name || 'Location TBD'}
                  </div>
                </div>
              </div>
            )
          })
        )}
        {events.length > 15 && (
            <div className="text-center text-gray-500 text-sm pt-2">
                + {events.length - 15} more events
            </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-100 text-center text-gray-400 text-sm">
        <p>Visit <strong>fayetteville.events</strong> for full details</p>
      </div>
    </div>
  )
}
