import { Link, NavLink } from 'react-router-dom'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

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
            to="/calendar"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive ? 'text-brick' : 'text-stone hover:text-brick'
              }`
            }
          >
            Subscribe
          </NavLink>
          <a
            href="https://downtown-guide.wemea-5ahhf.workers.dev/api/events"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-stone hover:text-brick transition-colors"
          >
            API
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
            <a
              href="https://downtown-guide.wemea-5ahhf.workers.dev/api/events"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 rounded-lg font-medium text-stone hover:bg-sand transition-colors"
            >
              API Documentation
            </a>
          </div>
        </nav>
      )}
    </header>
  )
}
