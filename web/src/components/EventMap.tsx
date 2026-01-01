import { useState } from 'react'
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

interface EventMapProps {
  latitude: number
  longitude: number
  venueName?: string
  address?: string
  className?: string
}

export default function EventMap({
  latitude,
  longitude,
  venueName,
  address,
  className = '',
}: EventMapProps) {
  const [showPopup, setShowPopup] = useState(true)

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
  const appleMapsUrl = `https://maps.apple.com/?daddr=${latitude},${longitude}&q=${encodeURIComponent(venueName || '')}`

  // Offset center south so popup is visible above marker
  const centerLatitude = latitude - 0.002

  return (
    <div className={`w-full h-64 rounded-xl overflow-hidden border border-sand ${className}`}>
      <Map
        initialViewState={{
          latitude: centerLatitude,
          longitude,
          zoom: 15
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        scrollZoom={false}
      >
        <NavigationControl position="top-right" showCompass={false} />

        <Marker
          latitude={latitude}
          longitude={longitude}
          anchor="bottom"
          onClick={() => setShowPopup(true)}
        >
          <div className="cursor-pointer">
            <svg
              width="32"
              height="40"
              viewBox="0 0 32 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-lg"
            >
              <path
                d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24c0-8.84-7.16-16-16-16z"
                fill="#A65D57"
              />
              <circle cx="16" cy="16" r="6" fill="white"/>
            </svg>
          </div>
        </Marker>

        {showPopup && (
          <Popup
            latitude={latitude}
            longitude={longitude}
            anchor="bottom"
            offset={[0, -40] as [number, number]}
            onClose={() => setShowPopup(false)}
            closeButton={true}
            closeOnClick={false}
            className="event-map-popup"
          >
            <div className="p-2 min-w-[200px]">
              {venueName && (
                <h3 className="font-bold text-gray-900 text-sm mb-1">{venueName}</h3>
              )}
              {address && (
                <p className="text-xs text-gray-500 mb-3">{address}</p>
              )}

              {/* Navigation Links */}
              <div className="flex gap-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-xs font-medium text-gray-700"
                  aria-label="Get directions with Google Maps"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#34A853"/>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 1.74.5 3.37 1.41 4.84L12 9V2z" fill="#4285F4"/>
                    <path d="M12 2v7l5.59 4.84C18.5 12.37 19 10.74 19 9c0-3.87-3.13-7-7-7z" fill="#FBBC04"/>
                    <path d="M6.41 13.84C7.86 16.08 10.18 19.25 12 22c1.82-2.75 4.14-5.92 5.59-8.16L12 9l-5.59 4.84z" fill="#EA4335"/>
                    <circle cx="12" cy="9" r="2.5" fill="white"/>
                  </svg>
                  <span>Google</span>
                </a>
                <a
                  href={appleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-xs font-medium text-gray-700"
                  aria-label="Get directions with Apple Maps"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 1.74.5 3.37 1.41 4.84.95 1.54 2.2 2.86 3.16 4.4.47.75.81 1.45 1.17 2.26.26.55.47 1.5 1.26 1.5s1-.95 1.26-1.5c.36-.81.7-1.51 1.17-2.26.96-1.54 2.21-2.86 3.16-4.4C18.5 12.37 19 10.74 19 9c0-3.87-3.13-7-7-7z" fill="#333"/>
                    <circle cx="12" cy="9" r="2.5" fill="white"/>
                  </svg>
                  <span>Apple</span>
                </a>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
