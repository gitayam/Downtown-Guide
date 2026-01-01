import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { divIcon, LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Link } from 'react-router-dom'
import { formatEventDateFull, formatEventTimeRange } from '../lib/utils'
import type { Event } from '../lib/types'

// Custom SVG Marker Icons
const createCustomIcon = (isFeatured: boolean) => {
  const color = isFeatured ? '#F59E0B' : '#A65D57' // Amber-500 (Gold) or Brick
  
  return divIcon({
    className: 'custom-marker',
    html: `
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M12 0C7.58 0 4 3.58 4 8C4 13.54 12 24 12 24C12 24 20 13.54 20 8C20 3.58 16.42 0 12 0Z" fill="${color}"/>
        <circle cx="12" cy="8" r="3.5" fill="white"/>
        ${isFeatured ? '<path d="M12 5.5L13.5 9H10.5L12 5.5Z" fill="#F59E0B"/>' : ''}
      </svg>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

interface MapViewProps {
  events: Event[]
}

// Component to auto-fit bounds
function FitBounds({ markers }: { markers: { lat: number; lng: number }[] }) {
  const map = useMap()

  useEffect(() => {
    if (markers.length === 0) return

    const bounds = new LatLngBounds(markers.map(m => [m.lat, m.lng]))
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  }, [markers, map])

  return null
}

export default function MapView({ events }: MapViewProps) {
  // Center of Fayetteville, NC (default)
  const center: [number, number] = [35.0527, -78.8784]

  // Filter events that have valid coordinates
  const validEvents = events.filter(e => 
    (e.venue_latitude && e.venue_longitude) || 
    (e.venue_coordinates?.lat && e.venue_coordinates?.lng)
  )

  // Group events by venue for cleaner display
  const eventsByVenue = validEvents.reduce((acc, event) => {
    const lat = event.venue_latitude || (event.venue_coordinates?.lat as number)
    const lng = event.venue_longitude || (event.venue_coordinates?.lng as number)
    
    if (lat && lng) {
      const key = `${lat},${lng}`
      if (!acc[key]) {
        acc[key] = {
          lat,
          lng,
          name: event.venue_name || event.location_name || 'Unknown Location',
          events: [],
          hasFeatured: false
        }
      }
      acc[key].events.push(event)
      if (event.featured) {
        acc[key].hasFeatured = true
      }
    }
    return acc
  }, {} as Record<string, { lat: number, lng: number, name: string, events: Event[], hasFeatured: boolean }>)

  const markers = Object.values(eventsByVenue)

  return (
    <div className="h-[600px] w-full rounded-2xl overflow-hidden shadow-sm border border-sand z-0 relative">
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={false} 
        className="h-full w-full"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds markers={markers} />

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={30} // Reduced radius to show dense downtown areas better
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
        >
          {markers.map((venue, index) => (
            <Marker 
              key={index} 
              position={[venue.lat, venue.lng]} 
              icon={createCustomIcon(venue.hasFeatured)}
              zIndexOffset={venue.hasFeatured ? 1000 : 0}
            >
              <Popup className="min-w-[250px]">
                <div className="p-1">
                  <h3 className="font-bold text-gray-900 mb-2 border-b pb-1">{venue.name}</h3>
                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {venue.events.map(event => (
                      <Link 
                        to={`/events/${event.id}`} 
                        key={event.id}
                        className={`block group hover:bg-gray-50 p-1.5 rounded transition-colors ${event.featured ? 'bg-amber-50 border-l-2 border-amber-400' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          {event.featured && <span className="text-xs">⭐</span>}
                          <div>
                            <div className="text-sm font-semibold text-brick group-hover:underline leading-tight">
                              {event.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {formatEventDateFull(event.start_datetime)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatEventTimeRange(event.start_datetime, event.end_datetime)}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  )
}
