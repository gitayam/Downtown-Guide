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
      className="bg-white w-[800px] font-sans block relative overflow-hidden"
      style={{
        width: '800px',
        minHeight: '600px',
      }}
    >
      {/* Decorative Background Pattern */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brick/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-forest/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

      {/* Header */}
      <div className="bg-gradient-to-br from-brick via-brick-600 to-forest text-white p-8 relative overflow-hidden">
        {/* Abstract shapes in header */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-8 -mb-8" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold font-display mb-2 tracking-tight">{title}</h1>
              {subtitle && <p className="text-white/90 text-xl font-medium">{subtitle}</p>}
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
              <span className="font-bold tracking-wide">FAYETTEVILLE.EVENTS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="p-8 space-y-6 relative z-10">
        {events.length === 0 ? (
          <p className="text-center text-gray-500 py-12 text-lg">No events scheduled.</p>
        ) : (
          events.slice(0, 12).map((event) => { // Limit to 12 for better density
            const startDate = new Date(event.start_datetime)
            const categories = event.categories 
              ? (typeof event.categories === 'string' ? JSON.parse(event.categories) : event.categories)
              : []

            // Prioritize event image, then venue image
            const imageUrl = event.image_url || event.venue_image_url

            return (
              <div key={event.id} className="flex gap-5 border-b border-gray-100 pb-5 last:border-0 last:pb-0 items-start">
                
                {/* Date Box */}
                <div className="flex-shrink-0 w-20 text-center bg-sand/30 rounded-xl p-2 border border-sand">
                  <div className="font-bold text-gray-900 text-lg leading-none mb-1">
                    {format(startDate, 'd')}
                  </div>
                  <div className="text-xs font-bold text-brick uppercase tracking-wider">
                    {format(startDate, 'MMM')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 border-t border-sand pt-1">
                    {format(startDate, 'h:mm a')}
                  </div>
                </div>

                {/* Thumbnail (Optional) */}
                {imageUrl && (
                  <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                    <img 
                      src={imageUrl} 
                      alt="" 
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous" // Important for canvas export
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 truncate">
                    {event.title}
                  </h3>
                  
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <span className="font-medium text-gray-900 mr-2">
                      {event.location_name || event.venue_name || 'Location TBD'}
                    </span>
                    {event.venue_address && (
                      <span className="text-gray-400 truncate border-l border-gray-300 pl-2">
                        {event.venue_address}
                      </span>
                    )}
                  </div>

                  {/* Categories */}
                  {categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {categories.slice(0, 3).map((cat: string) => (
                        <span key={cat} className="px-2 py-0.5 rounded-full bg-sand/50 text-stone text-[10px] uppercase font-bold tracking-wide border border-sand">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        
        {events.length > 12 && (
            <div className="text-center pt-4">
                <span className="inline-block px-4 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                  + {events.length - 12} more upcoming events
                </span>
            </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-sand/30 p-6 border-t border-sand flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brick rounded-lg flex items-center justify-center text-white font-bold text-xl">
                F
            </div>
            <div>
                <p className="font-bold text-gray-900 text-sm">Fayetteville Events</p>
                <p className="text-xs text-gray-500">The central guide to Downtown & Fort Liberty</p>
            </div>
        </div>
        <div className="text-right">
             <p className="text-sm font-medium text-brick">fayetteville.events</p>
             <p className="text-xs text-gray-400">Scan QR or visit site for tickets</p>
        </div>
      </div>
    </div>
  )
}
