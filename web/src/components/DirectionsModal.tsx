import { createPortal } from 'react-dom'
import {
  XMarkIcon,
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import type { Event } from '../lib/types'

// Apple Maps Icon
const AppleMapsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M16.53 14.777v-2.126l-1.92-2.112-2.317.848-.396 2.378 1.968 2.053 2.665-1.04zm-4.706 4.25l-.946-1.528-2.39-1.39-2.025 1.724 1.152 2.766 2.21 1.05 1.999-2.622zm-4.04-12.01l-1.464 2.64 1.554 1.545 2.155-1.85-.347-2.616-1.9-.281.002.562zm2.062 1.34l-1.405 1.34 1.252 2.052 2.508-.34.72-2.156-3.075-.896zM22.034 5.925l-.903-1.636-2.668-.31-2.193 1.58.583 2.193 2.41 1.635 2.77-3.462zM6.92 2.553L3.84 2.5l-2.06 1.77 1.56 2.454 2.924-.622.656-3.55zm5.006 13.91l-2.345 2.128.536 2.593 2.872 1.026 1.838-2.302-.917-2.29-1.984-1.156zm10.74 1.996l-2.637 1.12-1.353 2.42 1.54 2.22 2.564-.474 1.218-2.625-1.332-2.66zM11.993.005C5.37.005 0 5.378 0 12.005c0 6.626 5.37 12 11.993 12 6.627 0 12-5.374 12-12 0-6.627-5.373-12-12-12zm0 22.153c-5.602 0-10.144-4.545-10.144-10.148 0-5.603 4.542-10.148 10.144-10.148 5.602 0 10.144 4.545 10.144 10.148 0 5.603-4.542 10.148-10.144 10.148z"/>
  </svg>
)

// Google Maps Icon
const GoogleMapsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12 0C7.31 0 3.5 3.81 3.5 8.5c0 5.42 7.79 14.85 8.13 15.25.19.23.55.23.74 0 .34-.4 8.13-9.83 8.13-15.25C20.5 3.81 16.69 0 12 0zm0 11.5c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
  </svg>
)

// OpenStreetMap Icon
const OpenStreetMapIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
)

type VenueLike = Event | {
  venue_name?: string
  location_name?: string
  venue_address?: string
  venue_city?: string
  venue_state?: string
  venue_zip?: string
  venue_google_maps_url?: string
  venue_apple_maps_url?: string
  latitude?: number
  longitude?: number
}

interface DirectionsModalProps {
  isOpen: boolean
  onClose: () => void
  event: VenueLike
}

export default function DirectionsModal({ isOpen, onClose, event }: DirectionsModalProps) {
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [copiedLink, setCopiedLink] = useState<'google' | 'apple' | 'osm' | null>(null)

  if (!isOpen) return null

  // Type guards to handle different object shapes
  const getLat = (e: VenueLike) => 'venue_latitude' in e ? e.venue_latitude : e.latitude;
  const getLng = (e: VenueLike) => 'venue_longitude' in e ? e.venue_longitude : e.longitude;
  const getName = (e: VenueLike) => 'venue_name' in e ? e.venue_name : e.venue_name;

  const lat = getLat(event);
  const lng = getLng(event);

  const fullAddress = event.venue_address
    ? `${event.venue_address}, ${event.venue_city || 'Fayetteville'}, ${event.venue_state || 'NC'} ${event.venue_zip || ''}`
    : event.location_name || 'Fayetteville, NC'

  const googleMapsUrl = event.venue_google_maps_url || 
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`

  const appleMapsUrl = event.venue_apple_maps_url || 
    `http://maps.apple.com/?q=${encodeURIComponent(getName(event) || fullAddress)}&address=${encodeURIComponent(fullAddress)}`

  const osmUrl = (lat && lng)
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(fullAddress)}`

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(fullAddress)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  const handleCopyLink = async (type: 'google' | 'apple' | 'osm', url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedLink(type)
    setTimeout(() => setCopiedLink(null), 2000)
  }
