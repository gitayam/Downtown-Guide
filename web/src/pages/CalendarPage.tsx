import { useState } from 'react'
import {
  CalendarIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline'
import { ICAL_URL, ICAL_DOWNTOWN_URL, ICAL_CROWN_URL, ICAL_FORTBRAGG_URL } from '../lib/api'

export default function CalendarPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const feeds = [
    {
      id: 'all',
      label: 'All Events',
      description: 'Downtown, Crown Complex & Fort Bragg events',
      emoji: '📅',
      url: ICAL_URL,
      color: 'brick',
    },
    {
      id: 'downtown',
      label: 'Downtown Only',
      description: 'Events in Downtown Fayetteville',
      emoji: '🏙️',
      url: ICAL_DOWNTOWN_URL,
      color: 'brick',
    },
    {
      id: 'crown',
      label: 'Crown Only',
      description: 'Crown Coliseum, Arena & Expo Center',
      emoji: '🏟️',
      url: ICAL_CROWN_URL,
      color: 'capefear',
    },
    {
      id: 'fortbragg',
      label: 'Fort Bragg Only',
      description: 'MWR events at Fort Bragg',
      emoji: '🎖️',
      url: ICAL_FORTBRAGG_URL,
      color: 'liberty',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-brick/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CalendarIcon className="w-8 h-8 text-brick" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Subscribe to Calendar
        </h1>
        <p className="text-lg text-stone max-w-2xl mx-auto">
          Add Fayetteville events to your calendar app. Events sync automatically so you'll always have the latest updates.
        </p>
      </div>

      {/* Feed Options */}
      <div className="grid gap-4 mb-12">
        {feeds.map((feed) => (
          <div
            key={feed.id}
            className="bg-white rounded-xl shadow-sm border border-sand p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-12 h-12 bg-${feed.color}/10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <span className="text-2xl">{feed.emoji}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{feed.label}</h3>
                  <p className="text-sm text-stone">{feed.description}</p>
                </div>
              </div>

              <div className="flex gap-2 sm:flex-shrink-0">
                <a
                  href={feed.url}
                  className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                >
                  <CalendarIcon className="w-4 h-4" />
                  Subscribe
                </a>
                <button
                  onClick={() => copyToClipboard(feed.url, feed.id)}
                  className="btn-ghost text-sm px-4 py-2 flex items-center gap-2 border border-sand"
                >
                  {copied === feed.id ? (
                    <>
                      <CheckIcon className="w-4 h-4 text-capefear" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      Copy URL
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* URL Display */}
            <div className="mt-4 p-3 bg-sand/50 rounded-lg">
              <code className="text-xs text-stone break-all">{feed.url}</code>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="space-y-8">
        <h2 className="font-display text-2xl font-semibold text-center">How to Subscribe</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* iPhone/Mac */}
          <div className="bg-white rounded-xl shadow-sm border border-sand p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <DevicePhoneMobileIcon className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900">iPhone & Mac</h3>
            </div>
            <ol className="space-y-3 text-sm text-stone">
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-brick/10 text-brick rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                <span>Click the <strong>Subscribe</strong> button above</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-brick/10 text-brick rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                <span>Select <strong>Open in Calendar</strong> when prompted</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-brick/10 text-brick rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                <span>Tap <strong>Subscribe</strong> to confirm</span>
              </li>
            </ol>
          </div>

          {/* Google Calendar */}
          <div className="bg-white rounded-xl shadow-sm border border-sand p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <ComputerDesktopIcon className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Google Calendar</h3>
            </div>
            <ol className="space-y-3 text-sm text-stone">
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-brick/10 text-brick rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                <span>Copy the calendar URL above</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-brick/10 text-brick rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                <span>Open Google Calendar → Settings → Add calendar</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-brick/10 text-brick rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                <span>Select <strong>From URL</strong> and paste the link</span>
              </li>
            </ol>
          </div>

          {/* Outlook */}
          <div className="bg-white rounded-xl shadow-sm border border-sand p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Outlook</h3>
            </div>
            <ol className="space-y-3 text-sm text-stone">
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-brick/10 text-brick rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                <span>Copy the calendar URL above</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-brick/10 text-brick rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                <span>Open Outlook → Add calendar → Subscribe from web</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-brick/10 text-brick rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                <span>Paste the URL and click <strong>Import</strong></span>
              </li>
            </ol>
          </div>

          {/* Android */}
          <div className="bg-white rounded-xl shadow-sm border border-sand p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <DevicePhoneMobileIcon className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Android</h3>
            </div>
            <ol className="space-y-3 text-sm text-stone">
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-brick/10 text-brick rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                <span>Use Google Calendar app (recommended)</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-brick/10 text-brick rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                <span>Follow Google Calendar instructions above</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-brick/10 text-brick rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                <span>Events will sync to your phone automatically</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Note */}
        <div className="bg-capefear/5 border border-capefear/20 rounded-xl p-6 text-center">
          <p className="text-sm text-capefear">
            <strong>💡 Tip:</strong> Calendar subscriptions update automatically. You don't need to re-subscribe when new events are added.
          </p>
        </div>
      </div>
    </div>
  )
}
