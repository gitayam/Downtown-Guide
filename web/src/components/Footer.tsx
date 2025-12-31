import { ICAL_URL, ICAL_DOWNTOWN_URL, ICAL_CROWN_URL, ICAL_FORTBRAGG_URL } from '../lib/api'

// Discord icon component
const DiscordIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
)

export default function Footer() {
  return (
    <footer className="bg-forest text-white mt-16">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🌸</span>
              <span className="font-display text-xl font-semibold">Fayetteville Events</span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Your central guide to Downtown Fayetteville and Fort Bragg events.
              Never miss a festival, show, or community gathering.
            </p>
            {/* Discord CTA */}
            <a
              href="https://discord.gg/drEyQW5G"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <DiscordIcon className="w-5 h-5" />
              Join Our Discord
            </a>
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
                  href={ICAL_CROWN_URL}
                  className="text-white/70 hover:text-dogwood transition-colors flex items-center gap-2"
                >
                  <span>🏟️</span> Crown Only
                </a>
              </li>
              <li>
                <a
                  href={ICAL_FORTBRAGG_URL}
                  className="text-white/70 hover:text-dogwood transition-colors flex items-center gap-2"
                >
                  <span>🎖️</span> Fort Bragg Only
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
                  href="https://www.faydta.com/our-events/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-dogwood transition-colors"
                >
                  Downtown Alliance (FayDTA)
                </a>
              </li>
              <li>
                <a
                  href="https://www.thedogwoodfestival.com/2025-2026-events"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-dogwood transition-colors"
                >
                  Dogwood Festival
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
                  href="https://www.crowncomplexnc.com/events/all"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-dogwood transition-colors"
                >
                  Crown Complex
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
              <li>
                <a
                  href="https://mlkmemorialpark.org/upcoming-events/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-dogwood transition-colors"
                >
                  MLK Committee
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
