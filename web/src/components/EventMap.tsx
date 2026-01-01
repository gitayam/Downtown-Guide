import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet with bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

// Google Maps icon
const GoogleMapsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
)

// Apple Maps icon
const AppleMapsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 1.74.5 3.37 1.41 4.84.95 1.54 2.2 2.86 3.16 4.4.47.75.81 1.45 1.17 2.26.26.55.47 1.5 1.26 1.5s1-.95 1.26-1.5c.36-.81.7-1.51 1.17-2.26.96-1.54 2.21-2.86 3.16-4.4C18.5 12.37 19 10.74 19 9c0-3.87-3.13-7-7-7zm0 9.75c-1.52 0-2.75-1.23-2.75-2.75S10.48 6.25 12 6.25s2.75 1.23 2.75 2.75-1.23 2.75-2.75 2.75z"/>
  </svg>
)

interface EventMapProps {
  latitude: number
  longitude: number
  venueName?: string
  address?: string
  className?: string
  googleMapsUrl?: string
  appleMapsUrl?: string
}

export default function EventMap({
  latitude,
  longitude,
  venueName,
  address,
  className = '',
  googleMapsUrl,
  appleMapsUrl
}: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  // Generate default URLs if not provided
  const defaultGoogleUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}${venueName ? `&destination_place_id=${encodeURIComponent(venueName)}` : ''}`
  const defaultAppleUrl = `https://maps.apple.com/?daddr=${latitude},${longitude}${venueName ? `&q=${encodeURIComponent(venueName)}` : ''}`

  const googleUrl = googleMapsUrl || defaultGoogleUrl
  const appleUrl = appleMapsUrl || defaultAppleUrl

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 16,
      scrollWheelZoom: false, // Disable scroll zoom to prevent accidental zooming
      attributionControl: true,
    })

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // Create custom marker with venue info
    const marker = L.marker([latitude, longitude]).addTo(map)

    // Add popup with venue info
    if (venueName || address) {
      const popupContent = `
        <div class="text-sm">
          ${venueName ? `<strong class="block">${venueName}</strong>` : ''}
          ${address ? `<span class="text-gray-600">${address}</span>` : ''}
        </div>
      `
      marker.bindPopup(popupContent).openPopup()
    }

    mapInstanceRef.current = map

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [latitude, longitude, venueName, address])

  return (
    <div className="space-y-3">
      <div
        ref={mapRef}
        className={`w-full h-64 rounded-xl overflow-hidden border border-sand ${className}`}
        aria-label={`Map showing location of ${venueName || 'event venue'}`}
      />

      {/* Navigation Buttons */}
      <div className="flex gap-2">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-sand rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm font-medium text-gray-700"
          aria-label="Get directions with Google Maps"
        >
          <GoogleMapsIcon className="w-5 h-5 text-[#4285F4]" />
          <span>Google Maps</span>
        </a>
        <a
          href={appleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-sand rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm font-medium text-gray-700"
          aria-label="Get directions with Apple Maps"
        >
          <AppleMapsIcon className="w-5 h-5 text-gray-800" />
          <span>Apple Maps</span>
        </a>
      </div>
    </div>
  )
}
