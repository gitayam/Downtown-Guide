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

interface DirectionsModalProps {
  isOpen: boolean
  onClose: () => void
  event: Event
}

export default function DirectionsModal({ isOpen, onClose, event }: DirectionsModalProps) {
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [copiedLink, setCopiedLink] = useState<'google' | 'apple' | null>(null)

  if (!isOpen) return null

  const fullAddress = event.venue_address
    ? `${event.venue_address}, ${event.venue_city || 'Fayetteville'}, ${event.venue_state || 'NC'} ${event.venue_zip || ''}`
    : event.location_name || 'Fayetteville, NC'

  const googleMapsUrl = event.venue_google_maps_url || 
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`

  const appleMapsUrl = event.venue_apple_maps_url || 
    `http://maps.apple.com/?q=${encodeURIComponent(event.venue_name || fullAddress)}&address=${encodeURIComponent(fullAddress)}`

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(fullAddress)
    setCopiedAddress(true)
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  const handleCopyLink = async (type: 'google' | 'apple', url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiedLink(type)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-capefear to-forest p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <MapPinIcon className="w-5 h-5" />
              <h2 className="font-bold text-lg">Get Directions</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-white/80 text-sm mt-1 truncate">
            {event.venue_name || event.location_name}
          </p>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-6 overflow-y-auto flex-1 bg-stone-50">
          {/* Address Section */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-sand">
            <label className="text-xs font-medium text-stone uppercase tracking-wide mb-2 block">
              Destination Address
            </label>
            <div className="flex items-start gap-3">
              <div className="flex-1 font-medium text-gray-900 leading-snug">
                {event.venue_name && <span className="block text-brick mb-0.5">{event.venue_name}</span>}
                {fullAddress}
              </div>
              <button
                onClick={handleCopyAddress}
                className={`p-2 rounded-lg border transition-all ${
                  copiedAddress
                    ? 'bg-green-50 border-green-200 text-green-600'
                    : 'bg-white border-sand hover:border-brick text-stone hover:text-brick'
                }`}
                title="Copy address"
              >
                {copiedAddress ? <CheckIcon className="w-5 h-5" /> : <DocumentDuplicateIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Maps Actions */}
          <div className="space-y-3">
            {/* Apple Maps */}
            <div className="flex gap-2">
              <a
                href={appleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-sand hover:border-gray-300 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700">
                    <AppleMapsIcon />
                  </div>
                  <div className="text-left">
                    <span className="block font-semibold text-gray-900">Apple Maps</span>
                    <span className="text-xs text-stone group-hover:text-brick transition-colors">
                      Open in app
                    </span>
                  </div>
                </div>
                <ArrowTopRightOnSquareIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              </a>
              <button
                onClick={() => handleCopyLink('apple', appleMapsUrl)}
                className={`w-14 flex items-center justify-center rounded-xl border transition-all ${
                  copiedLink === 'apple'
                    ? 'bg-green-50 border-green-200 text-green-600'
                    : 'bg-white border-sand hover:border-brick text-stone hover:text-brick'
                }`}
                title="Copy link"
              >
                {copiedLink === 'apple' ? <CheckIcon className="w-6 h-6" /> : <DocumentDuplicateIcon className="w-6 h-6" />}
              </button>
            </div>

            {/* Google Maps */}
            <div className="flex gap-2">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-sand hover:border-gray-300 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <GoogleMapsIcon />
                  </div>
                  <div className="text-left">
                    <span className="block font-semibold text-gray-900">Google Maps</span>
                    <span className="text-xs text-stone group-hover:text-brick transition-colors">
                      Open in app or browser
                    </span>
                  </div>
                </div>
                <ArrowTopRightOnSquareIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              </a>
              <button
                onClick={() => handleCopyLink('google', googleMapsUrl)}
                className={`w-14 flex items-center justify-center rounded-xl border transition-all ${
                  copiedLink === 'google'
                    ? 'bg-green-50 border-green-200 text-green-600'
                    : 'bg-white border-sand hover:border-brick text-stone hover:text-brick'
                }`}
                title="Copy link"
              >
                {copiedLink === 'google' ? <CheckIcon className="w-6 h-6" /> : <DocumentDuplicateIcon className="w-6 h-6" />}
              </button>
            </div>
          </div>
          
          <div className="text-center text-xs text-stone">
             Tip: You can allow the app to open directly on your mobile device.
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
