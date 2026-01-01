/**
 * Cloudflare Pages Function for dynamic event meta tags
 *
 * Serves rich Open Graph and Twitter Card meta tags to social media crawlers
 * while passing through to the SPA for regular users.
 */

interface Env {
  ASSETS: Fetcher
}

const API_BASE = 'https://downtown-guide.wemea-5ahhf.workers.dev'

// Social media and search engine crawler patterns
const CRAWLER_PATTERNS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'Pinterest',
  'Slackbot',
  'TelegramBot',
  'WhatsApp',
  'Discordbot',
  'Googlebot',
  'bingbot',
  'Applebot',
  'Embedly',
  'Quora Link Preview',
  'Showyoubot',
  'outbrain',
  'vkShare',
  'W3C_Validator',
]

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  return CRAWLER_PATTERNS.some(pattern =>
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  })
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, params, env } = context
  const userAgent = request.headers.get('user-agent')
  const eventId = params.id as string

  // If not a crawler, serve the SPA
  if (!isCrawler(userAgent)) {
    return env.ASSETS.fetch(request)
  }

  // Fetch event data from API
  try {
    const apiResponse = await fetch(`${API_BASE}/api/events/${eventId}`)

    if (!apiResponse.ok) {
      // Event not found, serve SPA (will show 404)
      return env.ASSETS.fetch(request)
    }

    const { data: event } = await apiResponse.json() as { data: any }

    const title = escapeHtml(event.title)
    const description = escapeHtml(truncate(event.description || `Event in Fayetteville, NC`, 200))
    const imageUrl = event.image_url || 'https://ncfayetteville.com/og-default.png'
    const url = `https://ncfayetteville.com/events/${eventId}`
    const dateFormatted = formatDate(event.start_datetime)
    const location = event.venue_name || event.location_name || 'Fayetteville, NC'

    // Build Schema.org JSON-LD for Event
    const schemaOrg = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.title,
      description: event.description,
      startDate: event.start_datetime,
      endDate: event.end_datetime,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: location,
        address: {
          '@type': 'PostalAddress',
          streetAddress: event.venue_address || '',
          addressLocality: event.venue_city || 'Fayetteville',
          addressRegion: event.venue_state || 'NC',
          postalCode: event.venue_zip || '',
          addressCountry: 'US'
        }
      },
      image: imageUrl,
      url: url,
      organizer: {
        '@type': 'Organization',
        name: event.source_name || 'Fayetteville Events',
        url: 'https://ncfayetteville.com'
      }
    }

    // Return HTML with rich meta tags
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Fayetteville Events</title>
  <meta name="description" content="${description}">

  <!-- Open Graph -->
  <meta property="og:type" content="event">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Fayetteville Events">
  <meta property="og:locale" content="en_US">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">

  <!-- Event-specific meta -->
  <meta property="event:start_time" content="${event.start_datetime}">
  <meta property="event:end_time" content="${event.end_datetime}">
  <meta property="event:location" content="${escapeHtml(location)}">

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">${JSON.stringify(schemaOrg)}</script>

  <!-- Redirect to SPA after brief delay for crawlers that execute JS -->
  <meta http-equiv="refresh" content="0;url=${url}">
</head>
<body>
  <h1>${title}</h1>
  <p><strong>Date:</strong> ${dateFormatted}</p>
  <p><strong>Location:</strong> ${escapeHtml(location)}</p>
  <p>${description}</p>
  <p><a href="${url}">View event details</a></p>
</body>
</html>`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600', // 1 hour cache
      },
    })

  } catch (error) {
    // On error, serve the SPA
    console.error('Error fetching event for crawler:', error)
    return env.ASSETS.fetch(request)
  }
}
