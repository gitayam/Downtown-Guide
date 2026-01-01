import { Link, NavLink } from 'react-router-dom'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

// Discord icon component
const DiscordIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
)

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-sand">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl">🌸</span>
          <span className="font-display text-xl font-semibold text-brick">
            Fayetteville Events
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive ? 'text-brick' : 'text-stone hover:text-brick'
              }`
            }
          >
            Events
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive ? 'text-brick' : 'text-stone hover:text-brick'
              }`
            }
          >
            About
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive ? 'text-brick' : 'text-stone hover:text-brick'
              }`
            }
          >
            Subscribe
          </NavLink>
          <NavLink
            to="/api"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive ? 'text-brick' : 'text-stone hover:text-brick'
              }`
            }
          >
            API
          </NavLink>
          <a
            href="https://discord.gg/drEyQW5G"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-[#5865F2] hover:bg-[#5865F2]/10 rounded-lg transition-colors"
            title="Join our Discord"
          >
            <DiscordIcon className="w-5 h-5" />
          </a>
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden p-2 text-stone hover:text-brick rounded-lg hover:bg-sand transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-sand bg-white">
          <div className="px-4 py-4 space-y-3">
            <NavLink
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive ? 'bg-brick text-white' : 'text-stone hover:bg-sand'
                }`
              }
            >
              Events
            </NavLink>
            <NavLink
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive ? 'bg-brick text-white' : 'text-stone hover:bg-sand'
                }`
              }
            >
              About
            </NavLink>
            <NavLink
              to="/calendar"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive ? 'bg-brick text-white' : 'text-stone hover:bg-sand'
                }`
              }
            >
              Subscribe to Calendar
            </NavLink>
            <NavLink
              to="/api"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive ? 'bg-brick text-white' : 'text-stone hover:bg-sand'
                }`
              }
            >
              API Documentation
            </NavLink>
            <a
              href="https://discord.gg/drEyQW5G"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2 rounded-lg font-medium text-[#5865F2] hover:bg-[#5865F2]/10 transition-colors"
            >
              <DiscordIcon className="w-5 h-5" />
              Join Discord Community
            </a>
          </div>
        </nav>
      )}
    </header>
  )
}
