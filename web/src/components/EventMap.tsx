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

interface EventMapProps {
  latitude: number
  longitude: number
  venueName?: string
  address?: string
  className?: string
}

export default function EventMap({ latitude, longitude, venueName, address, className = '' }: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

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
    <div
      ref={mapRef}
      className={`w-full h-64 rounded-xl overflow-hidden border border-sand ${className}`}
      aria-label={`Map showing location of ${venueName || 'event venue'}`}
    />
  )
}
