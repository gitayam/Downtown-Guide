import { useState } from 'react'
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'

const API_BASE = 'https://ncfayetteville.com'

interface EndpointProps {
  method: string
  path: string
  description: string
  params?: { name: string; type: string; default?: string; description: string }[]
  example?: string
  response?: string
}

function Endpoint({ method, path, description, params, example, response }: EndpointProps) {
  const [copied, setCopied] = useState(false)
  const fullUrl = `${API_BASE}${path}`

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border border-sand rounded-xl overflow-hidden">
      <div className="bg-sand/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 bg-forest text-white text-xs font-bold rounded">
            {method}
          </span>
          <code className="text-sm font-mono text-gray-800">{path}</code>
        </div>
        <button
          onClick={() => copyToClipboard(fullUrl)}
          className="p-1.5 text-stone hover:text-brick rounded transition-colors"
          title="Copy URL"
        >
          {copied ? <CheckIcon className="w-4 h-4 text-forest" /> : <ClipboardIcon className="w-4 h-4" />}
        </button>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-gray-600">{description}</p>

        {params && params.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Parameters</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sand">
                    <th className="text-left py-2 pr-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-700">Type</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-700">Default</th>
                    <th className="text-left py-2 font-medium text-gray-700">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {params.map((param) => (
                    <tr key={param.name} className="border-b border-sand/50">
                      <td className="py-2 pr-4 font-mono text-brick">{param.name}</td>
                      <td className="py-2 pr-4 text-gray-600">{param.type}</td>
                      <td className="py-2 pr-4 text-gray-500">{param.default || '-'}</td>
                      <td className="py-2 text-gray-600">{param.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {example && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Example</h4>
            <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
              <code className="text-sm text-green-400 font-mono whitespace-pre">{example}</code>
            </div>
          </div>
        )}

        {response && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Response</h4>
            <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto max-h-64">
              <pre className="text-sm text-gray-300 font-mono">{response}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ApiDocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          API Documentation
        </h1>
        <p className="text-lg text-gray-600 mb-4">
          Access Fayetteville community events programmatically. Free to use, no authentication required.
        </p>
        <div className="flex flex-wrap gap-3">
          <div className="px-3 py-1.5 bg-sand/50 rounded-lg text-sm">
            <span className="text-stone">Base URL:</span>{' '}
            <code className="font-mono text-brick">{API_BASE}</code>
          </div>
          <div className="px-3 py-1.5 bg-sand/50 rounded-lg text-sm">
            <span className="text-stone">Format:</span>{' '}
            <span className="font-medium">JSON</span>
          </div>
          <div className="px-3 py-1.5 bg-sand/50 rounded-lg text-sm">
            <span className="text-stone">Cache:</span>{' '}
            <span className="font-medium">5 minutes</span>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Start</h2>
        <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <code className="text-sm text-green-400 font-mono">
            curl "{API_BASE}/api/events?section=downtown&limit=10"
          </code>
        </div>
      </section>

      {/* Endpoints */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Endpoints</h2>

        <Endpoint
          method="GET"
          path="/api/events"
          description="List events with optional filters. Returns paginated results sorted by featured status and start time."
          params={[
            { name: 'section', type: 'string', default: 'all', description: 'Filter by area: downtown, fort_bragg, crown, or all' },
            { name: 'from', type: 'string', default: 'now', description: 'Start date (ISO 8601 format, e.g., 2025-01-01)' },
            { name: 'to', type: 'string', description: 'End date (ISO 8601 format)' },
            { name: 'search', type: 'string', description: 'Text search in title and description' },
            { name: 'category', type: 'string', description: 'Filter by single category (e.g., Arts, Live Music)' },
            { name: 'categories', type: 'string', description: 'Filter by multiple categories (comma-separated)' },
            { name: 'featured', type: 'boolean', description: 'Filter featured events only (true/false)' },
            { name: 'source', type: 'string', description: 'Filter by source ID' },
            { name: 'limit', type: 'integer', default: '100', description: 'Results per page (max 500)' },
            { name: 'offset', type: 'integer', default: '0', description: 'Pagination offset' },
          ]}
          example={`curl "${API_BASE}/api/events?section=downtown&categories=Arts,Live%20Music&limit=20"`}
          response={`{
  "data": [
    {
      "id": "distinctly_12345",
      "title": "First Friday Art Walk",
      "description": "Monthly art walk...",
      "start_datetime": "2025-01-03T17:00:00.000Z",
      "end_datetime": "2025-01-03T21:00:00.000Z",
      "location_name": "Downtown Fayetteville",
      "categories": "[\\"Arts\\", \\"Community\\"]",
      "section": "downtown",
      "venue_latitude": 35.0527,
      "venue_longitude": -78.8784
    }
  ],
  "count": 1,
  "total": 156,
  "limit": 100,
  "offset": 0
}`}
        />

        <Endpoint
          method="GET"
          path="/api/events/today"
          description="Get all events happening today, including ongoing events that started earlier."
          example={`curl "${API_BASE}/api/events/today"`}
          response={`{
  "data": [...],
  "count": 12,
  "date": "2025-01-03"
}`}
        />

        <Endpoint
          method="GET"
          path="/api/events/upcoming"
          description="Get events for the next 7 days."
          example={`curl "${API_BASE}/api/events/upcoming"`}
          response={`{
  "data": [...],
  "count": 45,
  "range": {
    "from": "2025-01-03T12:00:00.000Z",
    "to": "2025-01-10T12:00:00.000Z"
  }
}`}
        />

        <Endpoint
          method="GET"
          path="/api/events/:id"
          description="Get detailed information for a specific event, including full venue details."
          example={`curl "${API_BASE}/api/events/distinctly_12345"`}
          response={`{
  "data": {
    "id": "distinctly_12345",
    "title": "First Friday Art Walk",
    "description": "Full description...",
    "venue_name": "Arts Council",
    "venue_address": "301 Hay St",
    "venue_city": "Fayetteville",
    "venue_google_maps_url": "https://maps.google.com/...",
    "venue_hours_of_operation": "Mon-Fri 9am-5pm"
  }
}`}
        />

        <Endpoint
          method="GET"
          path="/api/categories"
          description="Get all available event categories."
          example={`curl "${API_BASE}/api/categories"`}
          response={`{
  "data": [
    "Arts", "Community", "Expos", "Family",
    "Festivals", "FSU Sports", "Live Music",
    "Long Weekend", "Military", "Movies",
    "Nightlife", "Sports"
  ],
  "count": 12
}`}
        />

        <Endpoint
          method="GET"
          path="/api/sources"
          description="Get all event sources with sync status information."
          example={`curl "${API_BASE}/api/sources"`}
          response={`{
  "data": [
    {
      "id": "distinctly_fayetteville",
      "name": "Distinctly Fayetteville",
      "section": "downtown",
      "last_sync": "2025-01-03T12:00:00.000Z",
      "last_sync_status": "success",
      "last_sync_count": 45
    }
  ],
  "count": 8
}`}
        />

        <Endpoint
          method="GET"
          path="/cal/events.ics"
          description="Subscribe to events via iCal format. Compatible with Google Calendar, Apple Calendar, Outlook, etc."
          params={[
            { name: 'section', type: 'string', description: 'Filter by section: downtown, fort_bragg, crown, holidays' },
            { name: 'source', type: 'string', description: 'Filter by source ID' },
          ]}
          example={`# Subscribe in any calendar app:
${API_BASE}/cal/events.ics?section=downtown`}
        />

        <Endpoint
          method="GET"
          path="/api/health"
          description="Health check endpoint to verify API status."
          example={`curl "${API_BASE}/api/health"`}
          response={`{
  "status": "ok",
  "timestamp": "2025-01-03T12:00:00.000Z"
}`}
        />
      </section>

      {/* Code Examples */}
      <section className="mt-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Code Examples</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">JavaScript / TypeScript</h3>
            <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-sm text-gray-300 font-mono">{`const response = await fetch('${API_BASE}/api/events?section=downtown');
const { data: events, total } = await response.json();
console.log(\`Found \${total} events\`);`}</pre>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Python</h3>
            <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-sm text-gray-300 font-mono">{`import requests

response = requests.get('${API_BASE}/api/events', params={
    'section': 'downtown',
    'categories': 'Arts,Live Music',
    'limit': 50
})
events = response.json()['data']`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="mt-12 p-6 bg-sand/30 rounded-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Need Help?</h2>
        <p className="text-gray-600 mb-4">
          Full documentation available on GitHub. For questions or feature requests, join our Discord community.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://github.com/gitayam/Downtown-Guide/blob/main/docs/API.md"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            View on GitHub
          </a>
          <a
            href="https://discord.gg/drEyQW5G"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4] transition-colors text-sm font-medium"
          >
            Join Discord
          </a>
        </div>
      </section>
    </div>
  )
}
