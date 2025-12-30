import { ICAL_URL, ICAL_DOWNTOWN_URL, ICAL_FORTLIBERTY_URL } from '../lib/api'

export default function Footer() {
  return (
    <footer className="bg-forest text-white mt-16">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🌸</span>
              <span className="font-display text-xl font-semibold">Fayetteville Events</span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Your central guide to Downtown Fayetteville and Fort Liberty events.
              Never miss a festival, show, or community gathering.
            </p>
          </div>

          {/* Calendar Feeds */}
          <div>
            <h3 className="font-semibold mb-4">Subscribe to Calendar</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={ICAL_URL}
                  className="text-white/70 hover:text-dogwood transition-colors flex items-center gap-2"
                >
                  <span>📅</span> All Events
                </a>
              </li>
              <li>
                <a
                  href={ICAL_DOWNTOWN_URL}
                  className="text-white/70 hover:text-dogwood transition-colors flex items-center gap-2"
                >
                  <span>🏙️</span> Downtown Only
                </a>
              </li>
              <li>
                <a
                  href={ICAL_FORTLIBERTY_URL}
                  className="text-white/70 hover:text-dogwood transition-colors flex items-center gap-2"
                >
                  <span>🎖️</span> Fort Liberty Only
                </a>
              </li>
            </ul>
          </div>

          {/* Sources */}
          <div>
            <h3 className="font-semibold mb-4">Event Sources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://www.distinctlyfayettevillenc.com/events/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-dogwood transition-colors"
                >
                  Distinctly Fayetteville (CVB)
                </a>
              </li>
              <li>
                <a
                  href="https://visitdowntownfayetteville.com/events/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-dogwood transition-colors"
                >
                  Visit Downtown Fayetteville
                </a>
              </li>
              <li>
                <a
                  href="https://www.segrastadium.com/events-calendar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-dogwood transition-colors"
                >
                  Segra Stadium
                </a>
              </li>
              <li>
                <a
                  href="https://bragg.armymwr.com/calendar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-dogwood transition-colors"
                >
                  Fort Liberty MWR
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center text-white/50 text-sm">
          <p>
            Made with 🌸 for the Fayetteville community
          </p>
          <p className="mt-2">
            <a
              href="https://downtown-guide.wemea-5ahhf.workers.dev/api/events"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              API
            </a>
            {' • '}
            <a
              href="https://github.com/gitayam/Downtown-Guide"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
