/**
 * SEO handler for /plan-date
 * Serves pre-rendered HTML with meta tags to social media crawlers
 */

const CRAWLER_PATTERNS = [
  'facebookexternalhit', 'Facebot', 'Twitterbot', 'LinkedInBot',
  'Pinterest', 'Slackbot', 'TelegramBot', 'WhatsApp', 'Discordbot',
  'Googlebot', 'bingbot', 'Applebot',
]

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false
  return CRAWLER_PATTERNS.some(pattern =>
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  )
}

export const onRequestGet: PagesFunction = async (context) => {
  const userAgent = context.request.headers.get('user-agent')

  // If not a crawler, serve the SPA
  if (!isCrawler(userAgent)) {
    return context.next()
  }

  // Serve pre-rendered HTML for crawlers
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plan Your Perfect Fayetteville Outing | Date Planner</title>
  <meta name="description" content="Skip the endless scrolling. Our intelligent itinerary builder creates personalized outings in downtown Fayetteville—from morning coffee to evening entertainment. 70+ hand-curated venues, real-time events, fully customizable.">

  <!-- Open Graph -->
  <meta property="og:title" content="Plan Your Perfect Fayetteville Outing">
  <meta property="og:description" content="Skip the endless scrolling. We've worked directly with downtown venues to build itineraries that actually flow—from the first coffee to the last nightcap. 70+ hand-curated venues.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ncfayetteville.com/plan-date">
  <meta property="og:image" content="https://ncfayetteville.com/og-date-planner.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Fayetteville Events">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Plan Your Perfect Fayetteville Outing">
  <meta name="twitter:description" content="Skip the endless scrolling. Our intelligent itinerary builder creates personalized outings in downtown Fayetteville. 70+ hand-curated venues.">
  <meta name="twitter:image" content="https://ncfayetteville.com/og-date-planner.png">

  <link rel="canonical" href="https://ncfayetteville.com/plan-date">
</head>
<body>
  <h1>Plan Your Perfect Fayetteville Outing</h1>
  <p>Skip the endless scrolling. We've worked directly with downtown shop owners, restaurants, and venues to curate detailed information about each location.</p>
  <h2>How It Works</h2>
  <ul>
    <li>Tell us the occasion—date night, family outing, friends hangout</li>
    <li>Pick your vibe—romantic, adventurous, cultural, chill</li>
    <li>Choose when—today, tomorrow, this weekend, or any date</li>
    <li>Get a complete itinerary from morning to night</li>
    <li>Swap or add any stops to make it perfect</li>
  </ul>
  <h2>Features</h2>
  <ul>
    <li>70+ hand-curated downtown venues</li>
    <li>Real-time event integration</li>
    <li>Full-day itineraries (8-12 stops)</li>
    <li>Weekend comparison view</li>
    <li>Share your plans with friends</li>
  </ul>
  <a href="https://ncfayetteville.com/plan-date">Start Planning</a>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
