import { useState, useEffect } from 'react'
import { XMarkIcon, MagnifyingGlassIcon, PlusIcon, MapPinIcon } from '@heroicons/react/24/outline'
import {
  fetchVenueCategories,
  fetchVenuesByCategory,
  scrapeMapUrl,
  addCustomVenue,
  type VenueCategory,
  type ScrapedVenue,
  type DateStop
} from '../../lib/api'

interface AddStopModalProps {
  isOpen: boolean
  onClose: () => void
  onAddStop: (stop: DateStop) => void
  insertAfterIndex: number
  planContext?: any
  planId?: string
}

type Mode = 'select-type' | 'browse-venues' | 'custom-input'

export default function AddStopModal({
  isOpen,
  onClose,
  onAddStop,
  insertAfterIndex,
  planContext,
  planId
}: AddStopModalProps) {
  const [mode, setMode] = useState<Mode>('select-type')
  const [categories, setCategories] = useState<VenueCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [venues, setVenues] = useState<any[]>([])
  const [loadingVenues, setLoadingVenues] = useState(false)

  // Custom venue form state
  const [customName, setCustomName] = useState('')
  const [customAddress, setCustomAddress] = useState('')
  const [customMapUrl, setCustomMapUrl] = useState('')
  const [customNotes, setCustomNotes] = useState('')
  const [customCategory, setCustomCategory] = useState('food')
  const [scrapedVenue, setScrapedVenue] = useState<ScrapedVenue | null>(null)
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Load categories on mount
  useEffect(() => {
    if (isOpen) {
      fetchVenueCategories().then(data => {
        setCategories(data.categories)
      }).catch(console.error)
    }
  }, [isOpen])

  // Load venues when category is selected
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'custom') {
      setLoadingVenues(true)
      fetchVenuesByCategory(selectedCategory, 20)
        .then(data => {
          setVenues(data.venues)
        })
        .catch(console.error)
        .finally(() => setLoadingVenues(false))
    }
  }, [selectedCategory])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMode('select-type')
      setSelectedCategory(null)
      setVenues([])
      setCustomName('')
      setCustomAddress('')
      setCustomMapUrl('')
      setCustomNotes('')
      setScrapedVenue(null)
      setScrapeError(null)
    }
  }, [isOpen])

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    if (categoryId === 'custom') {
      setMode('custom-input')
    } else {
      setMode('browse-venues')
    }
  }

  const handleVenueSelect = (venue: any) => {
    const stop: DateStop = {
      order: insertAfterIndex + 2,
      venue: {
        id: venue.id,
        name: venue.name,
        address: venue.address,
        city: venue.city,
        latitude: venue.latitude,
        longitude: venue.longitude
      },
      activity: getCategoryLabel(venue.category || selectedCategory || 'food'),
      duration: venue.typical_duration || 60,
      cost: venue.average_cost || 25,
      notes: venue.description || `Enjoy ${venue.name}!`
    }
    onAddStop(stop)
    onClose()
  }

  const handleScrapeUrl = async () => {
    if (!customMapUrl.trim()) return

    setScraping(true)
    setScrapeError(null)

    try {
      const result = await scrapeMapUrl(customMapUrl.trim())
      setScrapedVenue(result.venue)
      if (result.venue.name && !customName) {
        setCustomName(result.venue.name)
      }
      if (result.venue.address && !customAddress) {
        setCustomAddress(result.venue.address)
      }
    } catch (error: any) {
      setScrapeError(error.message || 'Failed to extract venue info from URL')
    } finally {
      setScraping(false)
    }
  }

  const handleAddCustomVenue = async () => {
    if (!customName.trim()) return

    setSubmitting(true)

    try {
      // Save to user_venue_requests for tracking demand
      const venueData = {
        name: customName.trim(),
        address: customAddress.trim() || scrapedVenue?.address,
        latitude: scrapedVenue?.latitude,
        longitude: scrapedVenue?.longitude,
        google_maps_url: scrapedVenue?.google_maps_url || (customMapUrl.includes('google') ? customMapUrl : undefined),
        apple_maps_url: scrapedVenue?.apple_maps_url || (customMapUrl.includes('apple') ? customMapUrl : undefined),
        suggested_category: customCategory,
        notes: customNotes.trim() || undefined
      }

      await addCustomVenue({
        venue: venueData,
        planContext,
        planId
      })

      // Create the stop for the itinerary
      const stop: DateStop = {
        order: insertAfterIndex + 2,
        venue: {
          id: `custom-${Date.now()}`,
          name: customName.trim(),
          address: customAddress.trim() || scrapedVenue?.address,
          latitude: scrapedVenue?.latitude,
          longitude: scrapedVenue?.longitude,
          google_maps_url: venueData.google_maps_url
        },
        activity: getCategoryLabel(customCategory),
        duration: 60,
        cost: 25,
        notes: customNotes.trim() || `Visit ${customName.trim()}`
      }

      onAddStop(stop)
      onClose()
    } catch (error) {
      console.error('Failed to add custom venue:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      food: 'Dining',
      drink: 'Drinks',
      nature: 'Outdoor Activity',
      activity: 'Activity',
      culture: 'Cultural Experience',
      entertainment: 'Entertainment',
      shopping: 'Shopping'
    }
    return labels[category] || 'Stop'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-charcoal">
            {mode === 'select-type' && 'Add a Stop'}
            {mode === 'browse-venues' && categories.find(c => c.id === selectedCategory)?.label}
            {mode === 'custom-input' && 'Add Custom Venue'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-sand/50 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Select Category/Type */}
          {mode === 'select-type' && (
            <div className="grid grid-cols-2 gap-3">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className="p-4 rounded-xl border-2 border-sand hover:border-brick transition-colors text-left"
                >
                  <span className="text-2xl mb-2 block">{category.icon}</span>
                  <span className="font-semibold text-charcoal block">{category.label}</span>
                  <span className="text-xs text-stone">{category.description}</span>
                </button>
              ))}
            </div>
          )}

          {/* Browse Venues */}
          {mode === 'browse-venues' && (
            <div className="space-y-3">
              <button
                onClick={() => setMode('select-type')}
                className="text-sm text-brick hover:underline mb-2"
              >
                &larr; Back to categories
              </button>

              {loadingVenues ? (
                <div className="text-center py-8 text-stone">Loading venues...</div>
              ) : venues.length === 0 ? (
                <div className="text-center py-8 text-stone">
                  <p>No venues found in this category.</p>
                  <button
                    onClick={() => handleCategorySelect('custom')}
                    className="mt-3 text-brick hover:underline"
                  >
                    Add a custom venue instead
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-stone mb-3">
                    Select a venue or <button
                      onClick={() => handleCategorySelect('custom')}
                      className="text-brick hover:underline"
                    >add your own</button>
                  </p>
                  {venues.map(venue => (
                    <button
                      key={venue.id}
                      onClick={() => handleVenueSelect(venue)}
                      className="w-full p-3 rounded-xl border border-sand hover:border-brick hover:bg-sand/20 transition-colors text-left"
                    >
                      <div className="flex items-start gap-3">
                        <MapPinIcon className="w-5 h-5 text-brick mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-charcoal truncate">{venue.name}</div>
                          {venue.address && (
                            <div className="text-xs text-stone truncate">{venue.address}</div>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-stone">
                            {venue.average_cost && <span>${venue.average_cost}/person</span>}
                            {venue.rating && <span>{venue.rating} stars</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Custom Input */}
          {mode === 'custom-input' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode('select-type')}
                className="text-sm text-brick hover:underline mb-2"
              >
                &larr; Back to categories
              </button>

              <p className="text-sm text-stone">
                Add a custom venue that's not in our database. We'll save it for future recommendations!
              </p>

              {/* Maps URL Scraper */}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Google Maps or Apple Maps Link (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customMapUrl}
                    onChange={(e) => setCustomMapUrl(e.target.value)}
                    placeholder="Paste a maps link to auto-fill..."
                    className="flex-1 px-3 py-2 border border-sand rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brick/50"
                  />
                  <button
                    onClick={handleScrapeUrl}
                    disabled={!customMapUrl.trim() || scraping}
                    className="px-4 py-2 bg-brick text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-brick/90 transition-colors flex items-center gap-1"
                  >
                    {scraping ? (
                      <span>Loading...</span>
                    ) : (
                      <>
                        <MagnifyingGlassIcon className="w-4 h-4" />
                        <span>Lookup</span>
                      </>
                    )}
                  </button>
                </div>
                {scrapeError && (
                  <p className="text-xs text-red-600 mt-1">{scrapeError}</p>
                )}
                {scrapedVenue && (
                  <p className="text-xs text-green-600 mt-1">
                    Found venue info! We detected: {scrapedVenue.name}
                  </p>
                )}
              </div>

              {/* Venue Name */}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Venue Name *
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., Joe's Coffee Shop"
                  className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brick/50"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Address (optional)
                </label>
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="123 Main St, Fayetteville, NC"
                  className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brick/50"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Category
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brick/50"
                >
                  {categories.filter(c => c.id !== 'custom').map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Any notes about this venue..."
                  rows={2}
                  className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brick/50 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === 'custom-input' && (
          <div className="p-4 border-t bg-sand/20">
            <button
              onClick={handleAddCustomVenue}
              disabled={!customName.trim() || submitting}
              className="w-full py-3 bg-brick text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-brick/90 transition-colors flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              {submitting ? 'Adding...' : 'Add to Itinerary'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
