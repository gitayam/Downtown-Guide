
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon, SparklesIcon, ShareIcon, MapPinIcon, GlobeAltIcon, TicketIcon } from '@heroicons/react/24/outline'
import { fetchDateSuggestions, generateDatePlan, saveDatePlan, getDatePlan, type DatePlan } from '../lib/api'
import DatePlanMap from '../components/date-planner/DatePlanMap'
import ShareModal from '../components/share/ShareModal'
import DirectionsModal from '../components/DirectionsModal'

export default function PlanDatePage() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [directionsModalOpen, setDirectionsModalOpen] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<any>(null)
  const [shareUrl, setShareUrl] = useState('')
  
  // Check if we are viewing a shared plan
  const urlParams = new URLSearchParams(window.location.search)
  const sharedId = urlParams.get('id')

  const [suggestions, setSuggestions] = useState<{
    event_types: string[]
    vibes: string[]
    budget_ranges: string[]
  } | null>(null)
  
  const [prefs, setPrefs] = useState({
    event_type: 'Date Night',
    budget_range: '$$',
    vibes: [] as string[],
    duration_hours: 4,
    date: new Date().toISOString().split('T')[0]
  })

  const [result, setResult] = useState<DatePlan | null>(null)

  useEffect(() => {
    // If shared ID present, load that plan
    if (sharedId) {
      getDatePlan(sharedId)
        .then(plan => {
          setResult(plan)
          setLoading(false)
        })
        .catch(() => {
          alert('Shared plan not found. Starting fresh.')
          setLoading(false)
        })
    } else {
      fetchDateSuggestions()
        .then(setSuggestions)
        .finally(() => setLoading(false))
    }
  }, [sharedId])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await generateDatePlan(prefs)
      setResult(res.plan)
      // Clear share URL when generating new plan
      setShareUrl('')
    } catch (e) {
      console.error(e)
      alert('Failed to generate plan. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    try {
      const res = await saveDatePlan(result)
      const link = `${window.location.origin}/plan-date?id=${res.shareId}`
      setShareUrl(link)
      setShareModalOpen(true)
    } catch (e) {
      console.error(e)
      alert('Failed to save plan.')
    } finally {
      setSaving(false)
    }
  }

  const handleDirections = (venue: any) => {
    setSelectedVenue({
      venue_name: venue.name,
      venue_address: venue.address,
      venue_city: venue.city,
      venue_state: venue.state,
      venue_zip: venue.zip,
      venue_google_maps_url: venue.google_maps_url,
      latitude: venue.latitude,
      longitude: venue.longitude
    })
    setDirectionsModalOpen(true)
  }

  const toggleVibe = (vibe: string) => {
    setPrefs(p => ({
      ...p,
      vibes: p.vibes.includes(vibe) 
        ? p.vibes.filter(v => v !== vibe)
        : [...p.vibes, vibe]
    }))
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        content={{
          type: 'event', // Reusing event type for now
          id: 'plan',
          title: result?.title || 'Date Plan',
          description: `Check out this date plan: ${result?.stops.map(s => s.activity).join(', ')}`,
          url: shareUrl,
        }}
      />

      {/* Directions Modal */}
      {selectedVenue && (
        <DirectionsModal
          isOpen={directionsModalOpen}
          onClose={() => setDirectionsModalOpen(false)}
          event={selectedVenue}
        />
      )}

      <Link to="/" className="inline-flex items-center text-stone hover:text-brick mb-6">
        <ArrowLeftIcon className="w-4 h-4 mr-1" />
        Back to Events
      </Link>

      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-2">
          {result && sharedId ? 'Shared Date Plan' : 'Plan Your Perfect Date'}
        </h1>
        <p className="text-lg text-stone">
          {result && sharedId 
            ? 'A curated itinerary for a perfect outing in Fayetteville.' 
            : "Tell us what you're looking for, and we'll curate a custom itinerary in Fayetteville."}
        </p>
      </div>

      {!result ? (
        <div className="bg-white rounded-2xl shadow-sm border border-sand p-6 md:p-8 space-y-8">
          {/* ... (Form Content - unchanged) ... */}
          {/* Occasion & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">What's the occasion?</label>
              <div className="flex flex-wrap gap-2">
                {suggestions?.event_types.map(type => (
                  <button
                    key={type}
                    onClick={() => setPrefs({ ...prefs, event_type: type })}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      prefs.event_type === type
                        ? 'bg-brick text-white'
                        : 'bg-sand/30 text-stone hover:bg-sand/50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">When?</label>
              <input
                type="date"
                value={prefs.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setPrefs({ ...prefs, date: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-sand focus:border-brick focus:ring-1 focus:ring-brick outline-none text-gray-900 bg-white"
              />
            </div>
          </div>

          {/* Vibes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select some vibes (optional)</label>
            <div className="flex flex-wrap gap-2">
              {suggestions?.vibes.map(vibe => (
                <button
                  key={vibe}
                  onClick={() => toggleVibe(vibe)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    prefs.vibes.includes(vibe)
                      ? 'bg-capefear text-white'
                      : 'bg-sand/30 text-stone hover:bg-sand/50'
                  }`}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Budget Range</label>
              <div className="flex bg-sand/20 rounded-lg p-1">
                {suggestions?.budget_ranges.map(range => (
                  <button
                    key={range}
                    onClick={() => setPrefs({ ...prefs, budget_range: range })}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      prefs.budget_range === range
                        ? 'bg-white shadow-sm text-brick'
                        : 'text-stone hover:text-gray-900'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Duration: {prefs.duration_hours} hours
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={prefs.duration_hours}
                onChange={(e) => setPrefs({ ...prefs, duration_hours: parseFloat(e.target.value) })}
                className="w-full accent-brick"
              />
              <div className="flex justify-between text-xs text-stone mt-1">
                <span>Quick (1h)</span>
                <span>All Day (8h)</span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-4 bg-brick hover:bg-brick-600 disabled:opacity-70 text-white rounded-xl font-bold text-lg shadow-lg shadow-brick/20 transition-all flex items-center justify-center gap-2"
            >
              {generating ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <SparklesIcon className="w-6 h-6" />
                  Generate Itinerary
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* Result Header */}
          <div className="bg-white p-6 rounded-xl border border-sand shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{result.title}</h2>
              <p className="text-stone mt-1">
                Est. Cost: ${result.estimatedCost} • Duration: {result.totalDuration / 60}h
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-brick hover:bg-brick-600 rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? 'Saving...' : (
                  <>
                    <ShareIcon className="w-4 h-4" />
                    Share Plan
                  </>
                )}
              </button>
              <button
                onClick={() => { setResult(null); window.history.pushState({}, '', '/plan-date'); }}
                className="px-4 py-2 text-sm font-medium text-stone hover:text-brick border border-sand rounded-lg hover:bg-sand/20"
              >
                Start Over
              </button>
            </div>
          </div>

          {/* Map Visualization */}
          <DatePlanMap stops={result.stops} className="h-[400px]" />

          {/* Itinerary Timeline */}
          <div className="relative border-l-2 border-dashed border-sand ml-4 md:ml-8 space-y-8 py-2">
            {result.stops.map((stop, i) => (
              <div key={i} className="relative pl-8 md:pl-12">
                {/* Number Badge */}
                <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-white border-2 border-brick text-brick font-bold flex items-center justify-center shadow-sm">
                  {stop.order}
                </div>
                
                {/* Content Card */}
                <div className="bg-white rounded-xl border border-sand p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-block px-2 py-1 bg-sand/30 text-stone text-xs font-semibold rounded uppercase tracking-wide">
                      {stop.activity}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {stop.duration} min
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {stop.event ? (
                      <Link to={`/events/${stop.event.id}`} className="hover:text-brick hover:underline">
                        {stop.event.title}
                      </Link>
                    ) : (
                      stop.venue?.name || stop.activity
                    )}
                  </h3>
                  
                  <p className="text-stone text-sm mb-3">
                    {stop.notes}
                  </p>

                  <div className="text-xs text-stone bg-sand/10 p-2 rounded inline-block mb-3">
                    💰 Est. ${stop.cost}
                  </div>

                  {stop.transitionTip && (
                    <div className="pt-3 border-t border-sand text-xs text-stone italic flex items-center gap-2 mb-3">
                      <span>👣</span> {stop.transitionTip}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {stop.venue && (
                      <button
                        onClick={() => handleDirections(stop.venue)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone bg-white border border-sand rounded-lg hover:bg-sand/20 hover:text-brick transition-colors"
                      >
                        <MapPinIcon className="w-3.5 h-3.5" />
                        Directions
                      </button>
                    )}
                    {stop.venue?.website && (
                      <a
                        href={stop.venue.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone bg-white border border-sand rounded-lg hover:bg-sand/20 hover:text-brick transition-colors"
                      >
                        <GlobeAltIcon className="w-3.5 h-3.5" />
                        Website
                      </a>
                    )}
                    {stop.event && (
                      <Link
                        to={`/events/${stop.event.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone bg-white border border-sand rounded-lg hover:bg-sand/20 hover:text-brick transition-colors"
                      >
                        <TicketIcon className="w-3.5 h-3.5" />
                        View Event
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
