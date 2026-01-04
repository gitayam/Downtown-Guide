import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon, SparklesIcon, ShareIcon, MapPinIcon, GlobeAltIcon, TicketIcon, ArrowPathIcon, PlusIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { fetchDateSuggestions, generateDatePlan, saveDatePlan, getDatePlan, swapDateStop, fetchEvents, type DatePlan, type DateSuggestions, type DateStop } from '../lib/api'
import type { Event } from '../lib/types'
import DatePlanMap from '../components/date-planner/DatePlanMap'
import ShareModal from '../components/share/ShareModal'
import DirectionsModal from '../components/DirectionsModal'
import AddStopModal from '../components/date-planner/AddStopModal'

// Helper functions for date calculations - use local dates to avoid timezone issues
const getToday = () => {
  const d = new Date()
  d.setHours(12, 0, 0, 0) // Noon to avoid timezone edge cases
  return d
}
const getTomorrow = () => {
  const d = getToday()
  d.setDate(d.getDate() + 1)
  return d
}
const getThisWeekend = () => {
  const today = getToday()
  const dayOfWeek = today.getDay()
  // If it's Sunday (0), this weekend's Saturday was yesterday - show next weekend
  // If it's Saturday (6), this weekend is today
  let daysUntilSaturday: number
  if (dayOfWeek === 0) {
    // Sunday - next Saturday is 6 days away
    daysUntilSaturday = 6
  } else if (dayOfWeek === 6) {
    // Saturday - today is Saturday
    daysUntilSaturday = 0
  } else {
    // Mon-Fri - calculate days until Saturday
    daysUntilSaturday = 6 - dayOfWeek
  }
  const saturday = new Date(today)
  saturday.setDate(today.getDate() + daysUntilSaturday)
  const sunday = new Date(saturday)
  sunday.setDate(saturday.getDate() + 1)
  return { saturday, sunday }
}
const getNextWeekend = () => {
  const { saturday } = getThisWeekend()
  const nextSaturday = new Date(saturday)
  nextSaturday.setDate(saturday.getDate() + 7)
  const nextSunday = new Date(nextSaturday)
  nextSunday.setDate(nextSaturday.getDate() + 1)
  return { saturday: nextSaturday, sunday: nextSunday }
}
const formatDateShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const formatDateFull = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
// Use local date string to avoid UTC timezone shift
const toDateString = (d: Date) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

type QuickDateOption = 'today' | 'tomorrow' | 'this_weekend' | 'next_weekend' | 'custom'

// Weekend comparison types
interface WeekendComparison {
  saturday: { date: string; plan: DatePlan | null; events: Event[] }
  sunday: { date: string; plan: DatePlan | null; events: Event[] }
}

export default function PlanDatePage() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null)
  const [addStopModalOpen, setAddStopModalOpen] = useState(false)
  const [addingAfterIndex, setAddingAfterIndex] = useState<number>(-1)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [directionsModalOpen, setDirectionsModalOpen] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<any>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [quickDateOption, setQuickDateOption] = useState<QuickDateOption>('today')
  const [weekendDay, setWeekendDay] = useState<'saturday' | 'sunday'>('saturday')
  const [weekendComparison, setWeekendComparison] = useState<WeekendComparison | null>(null)

  const urlParams = new URLSearchParams(window.location.search)
  const sharedId = urlParams.get('id')

  // Calculate weekend dates
  const thisWeekend = useMemo(() => getThisWeekend(), [])
  const nextWeekend = useMemo(() => getNextWeekend(), [])

  const [suggestions, setSuggestions] = useState<DateSuggestions | null>(null)

  const [prefs, setPrefs] = useState({
    event_type: 'date_night',
    budget_range: '$$',
    vibes: [] as string[],
    duration_hours: 3,
    date: new Date().toISOString().split('T')[0],
    time_of_day: 'evening' as 'morning' | 'afternoon' | 'evening' | 'night',
    activity_level: 3,
    include_food: true,
    include_drinks: false,
    include_dessert: false,
    include_outdoors: false,
    has_military_access: false,
    is_21_plus: false,
    include_area_attractions: false,
    notes: ''
  })

  const [result, setResult] = useState<DatePlan | null>(null)

  useEffect(() => {
    if (sharedId) {
      getDatePlan(sharedId).then(setResult).catch(() => alert('Shared plan not found.')).finally(() => setLoading(false))
    } else {
      fetchDateSuggestions().then(setSuggestions).finally(() => setLoading(false))
    }
  }, [sharedId])

  const handleGenerate = async () => {
    setGenerating(true)
    setWeekendComparison(null)

    try {
      // If weekend mode, generate plans for BOTH days with VARIETY
      if (quickDateOption === 'this_weekend' || quickDateOption === 'next_weekend') {
        const weekend = quickDateOption === 'next_weekend' ? nextWeekend : thisWeekend
        const saturdayDate = toDateString(weekend.saturday)
        const sundayDate = toDateString(weekend.sunday)

        // Use full_day mode for comprehensive itineraries
        const fullDayPrefs = { ...prefs, time_of_day: 'full_day' as const, duration_hours: 12 }

        // Step 1: Generate Saturday's plan + fetch events in parallel
        const [satRes, satEvents, sunEvents] = await Promise.all([
          generateDatePlan({ ...fullDayPrefs, date: saturdayDate }),
          fetchEvents({ from: saturdayDate + 'T00:00:00', to: saturdayDate + 'T23:59:59', limit: 10 }),
          fetchEvents({ from: sundayDate + 'T00:00:00', to: sundayDate + 'T23:59:59', limit: 10 })
        ])

        // Step 2: Extract Saturday's venue IDs to exclude from Sunday for VARIETY
        const saturdayVenueIds = satRes.plan?.stops
          ?.map((s: any) => s.venue?.id)
          .filter(Boolean) || []

        // Step 3: Generate Sunday's plan excluding Saturday's venues
        const sunRes = await generateDatePlan({
          ...fullDayPrefs,
          date: sundayDate,
          exclude_venue_ids: saturdayVenueIds
        })

        setWeekendComparison({
          saturday: { date: saturdayDate, plan: satRes.plan, events: satEvents.data || [] },
          sunday: { date: sundayDate, plan: sunRes.plan, events: sunEvents.data || [] }
        })
        setResult(null) // Clear single result, show comparison instead
      } else {
        // Single day mode
        const res = await generateDatePlan(prefs)
        setResult(res.plan)
      }
      setShareUrl('')
    } catch (e) {
      console.error(e); alert('Failed to generate plan.')
    } finally {
      setGenerating(false)
    }
  }

  // Select a plan from weekend comparison
  const handleSelectWeekendPlan = (day: 'saturday' | 'sunday') => {
    if (!weekendComparison) return
    const selected = day === 'saturday' ? weekendComparison.saturday : weekendComparison.sunday
    if (selected.plan) {
      setResult(selected.plan)
      setPrefs(p => ({ ...p, date: selected.date }))
      setWeekendComparison(null)
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
      console.error(e); alert('Failed to save plan.')
    } finally {
      setSaving(false)
    }
  }

  const handleDirections = (venue: any) => {
    setSelectedVenue({
      venue_name: venue.name, venue_address: venue.address, venue_city: venue.city,
      venue_state: venue.state, venue_zip: venue.zip, venue_google_maps_url: venue.google_maps_url,
      latitude: venue.latitude, longitude: venue.longitude
    })
    setDirectionsModalOpen(true)
  }

  const handleSwap = async (stopIndex: number) => {
    if (!result) return;
    setSwappingIndex(stopIndex)
    try {
      const response = await swapDateStop({
        stopToSwap: result.stops[stopIndex], allStops: result.stops, preferences: prefs
      });
      if (response.newStop) {
        const newStops = [...result.stops];
        newStops[stopIndex] = { ...response.newStop, order: result.stops[stopIndex].order };
        const totalDuration = newStops.reduce((sum, s) => sum + s.duration, 0);
        const estimatedCost = newStops.reduce((sum, s) => sum + s.cost, 0);
        setResult({ ...result, stops: newStops, totalDuration, estimatedCost });
        setShareUrl('');
      }
    } catch (e) {
      console.error('Swap failed:', e); alert('Could not find an alternative.');
    } finally {
      setSwappingIndex(null);
    }
  }

  const handleEdit = () => {
    if (result) {
      setPrefs(p => ({
        ...p,
        event_type: result.title.includes('Anniversary') ? 'anniversary' : result.title.includes('First Date') ? 'first_date' : 'date_night',
        budget_range: result.estimatedCost > 100 ? '$$$' : result.estimatedCost > 50 ? '$$' : '$',
        vibes: result.title.toLowerCase().includes('romantic') ? ['romantic'] : result.title.toLowerCase().includes('adventurous') ? ['adventurous'] : [],
        duration_hours: Math.round(result.totalDuration / 60),
      }));
    }
    setResult(null);
    window.history.pushState({}, '', '/plan-date');
  }

  const openAddStopModal = (afterIndex: number) => {
    setAddingAfterIndex(afterIndex)
    setAddStopModalOpen(true)
  }

  const handleAddStop = (newStop: DateStop) => {
    if (!result) return

    // Insert the new stop after the specified index
    const newStops = [...result.stops]
    const insertIndex = addingAfterIndex + 1
    newStops.splice(insertIndex, 0, newStop)

    // Renumber all stops
    const renumberedStops = newStops.map((stop, idx) => ({
      ...stop,
      order: idx + 1
    }))

    // Recalculate totals
    const totalDuration = renumberedStops.reduce((sum, s) => sum + s.duration, 0)
    const estimatedCost = renumberedStops.reduce((sum, s) => sum + s.cost, 0)

    setResult({
      ...result,
      stops: renumberedStops,
      totalDuration,
      estimatedCost
    })
    setShareUrl('') // Clear share URL since plan changed
  }

  const toggleVibe = (vibe: string) => setPrefs(p => ({ ...p, vibes: p.vibes.includes(vibe) ? p.vibes.filter(v => v !== vibe) : [...p.vibes, vibe] }))

  // Handle quick date selection
  const handleQuickDate = (option: QuickDateOption, day?: 'saturday' | 'sunday') => {
    setQuickDateOption(option)
    let newDate: string

    switch (option) {
      case 'today':
        newDate = toDateString(getToday())
        break
      case 'tomorrow':
        newDate = toDateString(getTomorrow())
        break
      case 'this_weekend':
        setWeekendDay(day || 'saturday')
        newDate = toDateString(day === 'sunday' ? thisWeekend.sunday : thisWeekend.saturday)
        break
      case 'next_weekend':
        setWeekendDay(day || 'saturday')
        newDate = toDateString(day === 'sunday' ? nextWeekend.sunday : nextWeekend.saturday)
        break
      case 'custom':
      default:
        return // Don't change date for custom, user will pick
    }

    setPrefs(p => ({ ...p, date: newDate }))
  }


  const formatEventTime = (startDatetime?: string, endDatetime?: string) => {
    if (!startDatetime) return null
    try {
      const start = new Date(startDatetime)
      const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      const formatDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

      let result = `${formatDate(start)} at ${formatTime(start)}`
      if (endDatetime) {
        const end = new Date(endDatetime)
        result += ` - ${formatTime(end)}`
      }
      return result
    } catch {
      return null
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} content={{ type: 'event', id: 'plan', title: result?.title || 'Date Plan', description: `Check out this date plan: ${result?.stops.map(s => s.activity).join(', ')}`, url: shareUrl }} />
      {selectedVenue && <DirectionsModal isOpen={directionsModalOpen} onClose={() => setDirectionsModalOpen(false)} event={selectedVenue} />}
      <AddStopModal
        isOpen={addStopModalOpen}
        onClose={() => setAddStopModalOpen(false)}
        onAddStop={handleAddStop}
        insertAfterIndex={addingAfterIndex}
        planContext={prefs}
        planId={result?.id}
      />
      <Link to="/" className="inline-flex items-center text-stone hover:text-brick mb-6"><ArrowLeftIcon className="w-4 h-4 mr-1" />Back to Events</Link>
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-3">
          {weekendComparison ? 'Pick Your Day' : result && sharedId ? 'Shared Date Plan' : 'Plan Your Perfect Fayetteville Outing'}
        </h1>
        <p className="text-lg text-stone max-w-2xl mx-auto">
          {weekendComparison
            ? "Choose your starting point, then swap or add stops to create your perfect itinerary."
            : result && sharedId
            ? 'A curated itinerary for a perfect outing in Fayetteville.'
            : "Skip the endless scrolling. We've worked directly with downtown venues to build itineraries that actually flow—from the first coffee to the last nightcap."}
        </p>
        {!result && !weekendComparison && (
          <p className="text-sm text-stone/70 mt-2 max-w-xl mx-auto">
            70+ hand-curated venues • Real-time events • Swap any stop you don't like
          </p>
        )}
      </div>

      {/* Weekend Comparison View */}
      {weekendComparison && (
        <div className="space-y-6 animate-fade-in">
          {/* Help tip */}
          <div className="bg-gradient-to-r from-capefear/10 to-brick/10 rounded-xl p-4 border border-capefear/20">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-medium text-gray-900">How it works</p>
                <p className="text-sm text-stone mt-1">
                  Each day has different venue suggestions. Select a day to start, then <strong>swap</strong> any stops you don't like or <strong>add</strong> new ones to build your perfect itinerary.
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Saturday Plan */}
            <div className={`bg-white rounded-2xl border-2 ${weekendDay === 'saturday' ? 'border-brick shadow-lg' : 'border-sand'} p-4 sm:p-6 transition-all hover:shadow-lg`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl sm:text-3xl">🌞</span>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Saturday</h3>
                    <p className="text-xs sm:text-sm text-stone">{formatDateFull(new Date(weekendComparison.saturday.date + 'T12:00:00'))}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSelectWeekendPlan('saturday')}
                  className="w-full sm:w-auto px-4 py-2.5 bg-brick hover:bg-brick-600 text-white rounded-lg font-medium transition-colors text-center"
                >
                  <span className="text-sm sm:text-base">Select & Customize →</span>
                </button>
              </div>

              {weekendComparison.saturday.plan && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-stone border-b border-sand pb-3">
                    <span>💰 ~${weekendComparison.saturday.plan.estimatedCost}/person</span>
                    <span>📍 {weekendComparison.saturday.plan.stops.length} stops</span>
                  </div>

                  {/* Full Day Itinerary grouped by time */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {/* Morning */}
                    {weekendComparison.saturday.plan.stops.filter((_, i) => i < 3).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <span>🌅</span> Morning
                        </p>
                        <div className="space-y-1">
                          {weekendComparison.saturday.plan.stops.filter((_, i) => i < 3).map((stop, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-sm">
                              <div className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{stop.venue?.name || stop.event?.title || stop.activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Afternoon */}
                    {weekendComparison.saturday.plan.stops.filter((_, i) => i >= 3 && i < 6).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <span>☀️</span> Afternoon
                        </p>
                        <div className="space-y-1">
                          {weekendComparison.saturday.plan.stops.filter((_, i) => i >= 3 && i < 6).map((stop, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg text-sm">
                              <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {i + 4}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{stop.venue?.name || stop.event?.title || stop.activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Evening */}
                    {weekendComparison.saturday.plan.stops.filter((_, i) => i >= 6 && i < 9).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <span>🌆</span> Evening
                        </p>
                        <div className="space-y-1">
                          {weekendComparison.saturday.plan.stops.filter((_, i) => i >= 6 && i < 9).map((stop, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg text-sm">
                              <div className="w-5 h-5 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {i + 7}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{stop.venue?.name || stop.event?.title || stop.activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Night */}
                    {weekendComparison.saturday.plan.stops.filter((_, i) => i >= 9).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <span>🌙</span> Night
                        </p>
                        <div className="space-y-1">
                          {weekendComparison.saturday.plan.stops.filter((_, i) => i >= 9).map((stop, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg text-sm">
                              <div className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {i + 10}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{stop.venue?.name || stop.event?.title || stop.activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Events happening this day */}
              {weekendComparison.saturday.events.length > 0 && (
                <div className="mt-4 pt-4 border-t border-sand">
                  <p className="text-xs font-semibold text-capefear uppercase tracking-wide mb-2 flex items-center gap-1">
                    <TicketIcon className="w-3.5 h-3.5" />
                    Events on Saturday ({weekendComparison.saturday.events.length})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {weekendComparison.saturday.events.slice(0, 5).map((event) => (
                      <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                        className="block p-2 bg-capefear/5 hover:bg-capefear/10 rounded-lg transition-colors"
                      >
                        <p className="font-medium text-sm text-gray-900 truncate">{event.title}</p>
                        <p className="text-xs text-stone">
                          {new Date(event.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {event.location_name && ` • ${event.location_name}`}
                        </p>
                      </Link>
                    ))}
                    {weekendComparison.saturday.events.length > 5 && (
                      <p className="text-xs text-stone text-center pt-1">
                        +{weekendComparison.saturday.events.length - 5} more events
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sunday Plan */}
            <div className={`bg-white rounded-2xl border-2 ${weekendDay === 'sunday' ? 'border-brick shadow-lg' : 'border-sand'} p-4 sm:p-6 transition-all hover:shadow-lg`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl sm:text-3xl">☀️</span>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Sunday</h3>
                    <p className="text-xs sm:text-sm text-stone">{formatDateFull(new Date(weekendComparison.sunday.date + 'T12:00:00'))}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSelectWeekendPlan('sunday')}
                  className="w-full sm:w-auto px-4 py-2.5 bg-brick hover:bg-brick-600 text-white rounded-lg font-medium transition-colors text-center"
                >
                  <span className="text-sm sm:text-base">Select & Customize →</span>
                </button>
              </div>

              {weekendComparison.sunday.plan && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-stone border-b border-sand pb-3">
                    <span>💰 ~${weekendComparison.sunday.plan.estimatedCost}/person</span>
                    <span>📍 {weekendComparison.sunday.plan.stops.length} stops</span>
                  </div>

                  {/* Full Day Itinerary grouped by time */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {/* Morning */}
                    {weekendComparison.sunday.plan.stops.filter((_, i) => i < 3).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <span>🌅</span> Morning
                        </p>
                        <div className="space-y-1">
                          {weekendComparison.sunday.plan.stops.filter((_, i) => i < 3).map((stop, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-sm">
                              <div className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{stop.venue?.name || stop.event?.title || stop.activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Afternoon */}
                    {weekendComparison.sunday.plan.stops.filter((_, i) => i >= 3 && i < 6).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <span>☀️</span> Afternoon
                        </p>
                        <div className="space-y-1">
                          {weekendComparison.sunday.plan.stops.filter((_, i) => i >= 3 && i < 6).map((stop, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg text-sm">
                              <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {i + 4}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{stop.venue?.name || stop.event?.title || stop.activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Evening */}
                    {weekendComparison.sunday.plan.stops.filter((_, i) => i >= 6 && i < 9).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <span>🌆</span> Evening
                        </p>
                        <div className="space-y-1">
                          {weekendComparison.sunday.plan.stops.filter((_, i) => i >= 6 && i < 9).map((stop, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg text-sm">
                              <div className="w-5 h-5 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {i + 7}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{stop.venue?.name || stop.event?.title || stop.activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Night */}
                    {weekendComparison.sunday.plan.stops.filter((_, i) => i >= 9).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <span>🌙</span> Night
                        </p>
                        <div className="space-y-1">
                          {weekendComparison.sunday.plan.stops.filter((_, i) => i >= 9).map((stop, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg text-sm">
                              <div className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {i + 10}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{stop.venue?.name || stop.event?.title || stop.activity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Events happening this day */}
              {weekendComparison.sunday.events.length > 0 && (
                <div className="mt-4 pt-4 border-t border-sand">
                  <p className="text-xs font-semibold text-capefear uppercase tracking-wide mb-2 flex items-center gap-1">
                    <TicketIcon className="w-3.5 h-3.5" />
                    Events on Sunday ({weekendComparison.sunday.events.length})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {weekendComparison.sunday.events.slice(0, 5).map((event) => (
                      <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                        className="block p-2 bg-capefear/5 hover:bg-capefear/10 rounded-lg transition-colors"
                      >
                        <p className="font-medium text-sm text-gray-900 truncate">{event.title}</p>
                        <p className="text-xs text-stone">
                          {new Date(event.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {event.location_name && ` • ${event.location_name}`}
                        </p>
                      </Link>
                    ))}
                    {weekendComparison.sunday.events.length > 5 && (
                      <p className="text-xs text-stone text-center pt-1">
                        +{weekendComparison.sunday.events.length - 5} more events
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Back to Edit */}
          <div className="text-center">
            <button
              onClick={() => { setWeekendComparison(null); }}
              className="text-stone hover:text-brick underline text-sm"
            >
              ← Back to edit preferences
            </button>
          </div>
        </div>
      )}

      {!result && !weekendComparison && (
        <div className="bg-white rounded-2xl shadow-sm border border-sand p-6 md:p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">What's the occasion?</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {suggestions?.event_types.map(type => (
                <button key={type.id} onClick={() => setPrefs({ ...prefs, event_type: type.id })} className={`p-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 ${prefs.event_type === type.id ? 'bg-brick text-white shadow-md' : 'bg-sand/20 text-stone hover:bg-sand/40'}`} title={type.description}>
                  <span className="text-xl">{type.icon}</span><span className="text-xs text-center leading-tight">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* When Section - Quick Date Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">When?</label>

            {/* Quick Date Options */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
              <button
                onClick={() => handleQuickDate('today')}
                className={`p-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                  quickDateOption === 'today'
                    ? 'bg-brick text-white shadow-md ring-2 ring-brick ring-offset-2'
                    : 'bg-sand/20 text-stone hover:bg-sand/40'
                }`}
              >
                <span className="text-lg">📅</span>
                <span className="font-semibold text-xs sm:text-sm">Today</span>
                <span className="text-xs opacity-75">{formatDateShort(getToday())}</span>
              </button>

              <button
                onClick={() => handleQuickDate('tomorrow')}
                className={`p-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                  quickDateOption === 'tomorrow'
                    ? 'bg-brick text-white shadow-md ring-2 ring-brick ring-offset-2'
                    : 'bg-sand/20 text-stone hover:bg-sand/40'
                }`}
              >
                <span className="text-lg">🌅</span>
                <span className="font-semibold text-xs sm:text-sm">Tomorrow</span>
                <span className="text-xs opacity-75">{formatDateShort(getTomorrow())}</span>
              </button>

              <button
                onClick={() => handleQuickDate('this_weekend')}
                className={`p-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                  quickDateOption === 'this_weekend'
                    ? 'bg-brick text-white shadow-md ring-2 ring-brick ring-offset-2'
                    : 'bg-sand/20 text-stone hover:bg-sand/40'
                }`}
              >
                <span className="text-lg">🎉</span>
                <span className="font-semibold text-xs sm:text-sm">This Weekend</span>
                <span className="text-xs opacity-75">{formatDateShort(thisWeekend.saturday)}</span>
              </button>

              <button
                onClick={() => handleQuickDate('next_weekend')}
                className={`p-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                  quickDateOption === 'next_weekend'
                    ? 'bg-brick text-white shadow-md ring-2 ring-brick ring-offset-2'
                    : 'bg-sand/20 text-stone hover:bg-sand/40'
                }`}
              >
                <span className="text-lg">🗓️</span>
                <span className="font-semibold text-xs sm:text-sm">Next Weekend</span>
                <span className="text-xs opacity-75">{formatDateShort(nextWeekend.saturday)}</span>
              </button>

              <button
                onClick={() => handleQuickDate('custom')}
                className={`p-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 col-span-2 sm:col-span-1 ${
                  quickDateOption === 'custom'
                    ? 'bg-brick text-white shadow-md ring-2 ring-brick ring-offset-2'
                    : 'bg-sand/20 text-stone hover:bg-sand/40'
                }`}
              >
                <CalendarIcon className="w-5 h-5" />
                <span className="font-semibold text-xs sm:text-sm">Pick Date</span>
                <span className="text-xs opacity-75">Choose any</span>
              </button>
            </div>

            {/* Weekend Info - shows when This Weekend is selected */}
            {(quickDateOption === 'this_weekend' || quickDateOption === 'next_weekend') && (
              <div className="bg-gradient-to-r from-brick/5 to-capefear/5 rounded-xl p-4 mb-3 animate-fade-in border border-brick/10">
                <div className="flex items-center justify-center gap-2 text-brick">
                  <SparklesIcon className="w-5 h-5" />
                  <p className="text-sm font-medium">We'll create plans for both days so you can compare!</p>
                </div>
                <div className="flex justify-center gap-6 mt-3">
                  <div className="text-center">
                    <span className="text-2xl">🌞</span>
                    <p className="text-xs text-stone mt-1">
                      {formatDateShort(quickDateOption === 'next_weekend' ? nextWeekend.saturday : thisWeekend.saturday)}
                    </p>
                  </div>
                  <div className="text-stone text-xl">vs</div>
                  <div className="text-center">
                    <span className="text-2xl">☀️</span>
                    <p className="text-xs text-stone mt-1">
                      {formatDateShort(quickDateOption === 'next_weekend' ? nextWeekend.sunday : thisWeekend.sunday)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Date Picker - shows when Pick Date is selected */}
            {quickDateOption === 'custom' && (
              <div className="bg-sand/10 rounded-xl p-4 mb-3 animate-fade-in">
                <input
                  type="date"
                  value={prefs.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPrefs({ ...prefs, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-sand focus:border-brick focus:ring-2 focus:ring-brick/20 outline-none text-gray-900 bg-white text-center text-lg font-medium"
                />
                {prefs.date && (
                  <p className="text-center text-sm text-stone mt-2">
                    {formatDateFull(new Date(prefs.date + 'T12:00:00'))}
                  </p>
                )}
              </div>
            )}

            {/* Selected Date Confirmation - hide for weekend mode */}
            {quickDateOption !== 'this_weekend' && quickDateOption !== 'next_weekend' && (
              <div className="text-center py-2 px-4 bg-brick/5 rounded-lg">
                <span className="text-sm text-stone">Planning for: </span>
                <span className="text-sm font-semibold text-brick">
                  {formatDateFull(new Date(prefs.date + 'T12:00:00'))}
                </span>
              </div>
            )}
          </div>

          {/* Time of Day Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Time of Day</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {suggestions?.time_of_day.map(time => (
                <button
                  key={time.id}
                  onClick={() => setPrefs({ ...prefs, time_of_day: time.id as any })}
                  className={`py-3 px-2 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                    prefs.time_of_day === time.id
                      ? 'bg-brick text-white shadow-md ring-2 ring-brick ring-offset-2'
                      : 'bg-sand/20 text-stone hover:bg-sand/40'
                  }`}
                >
                  <span className="text-xl">{time.icon}</span>
                  <span className="text-xs font-medium">{time.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select vibes</label>
            <div className="flex flex-wrap gap-2">{suggestions?.vibes.map(vibe => (<button key={vibe.id} onClick={() => toggleVibe(vibe.id)} className={`px-3 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${prefs.vibes.includes(vibe.id) ? 'bg-capefear text-white' : 'bg-sand/20 text-stone hover:bg-sand/40'}`}><span>{vibe.icon}</span>{vibe.label}</button>))}</div>
          </div>
          {suggestions?.access_options && suggestions.access_options.length > 0 && (
            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">Access</label>
              <div className="space-y-2">
                {suggestions.access_options.map(option => (
                  <label key={option.id} className="flex items-start gap-3 p-3 rounded-lg bg-sand/10 hover:bg-sand/20 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={
                        option.id === 'has_military_access' ? prefs.has_military_access :
                        option.id === 'is_21_plus' ? prefs.is_21_plus :
                        option.id === 'include_area_attractions' ? prefs.include_area_attractions : false
                      }
                      onChange={(e) => {
                        if (option.id === 'has_military_access') {
                          setPrefs({ ...prefs, has_military_access: e.target.checked })
                        } else if (option.id === 'is_21_plus') {
                          setPrefs({ ...prefs, is_21_plus: e.target.checked })
                        } else if (option.id === 'include_area_attractions') {
                          setPrefs({ ...prefs, include_area_attractions: e.target.checked })
                        }
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-sand text-brick focus:ring-brick"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{option.label}</span>
                      <p className="text-xs text-stone mt-0.5">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="pt-4"><button onClick={handleGenerate} disabled={generating} className="w-full py-4 bg-brick hover:bg-brick-600 disabled:opacity-70 text-white rounded-xl font-bold text-lg shadow-lg shadow-brick/20 transition-all flex items-center justify-center gap-2">{generating ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><SparklesIcon className="w-6 h-6" />Generate Itinerary</>}</button></div>
        </div>
      )}

      {result && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in pb-24 sm:pb-0">
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-sand shadow-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{result.title}</h2>
                <p className="text-stone text-sm sm:text-base mt-1">
                  <span className="inline-block mr-3">💰 ${result.estimatedCost}/person</span>
                  <span className="inline-block">⏱️ {Math.round(result.totalDuration / 60)}h</span>
                </p>
              </div>
              {/* Desktop actions */}
              <div className="hidden sm:flex gap-2">
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brick hover:bg-brick-600 rounded-lg transition-colors flex items-center gap-2">{saving ? 'Saving...' : <><ShareIcon className="w-4 h-4" />Share</>}</button>
                <button onClick={handleEdit} className="px-4 py-2 text-sm font-medium text-stone hover:text-brick border border-sand rounded-lg hover:bg-sand/20">Edit</button>
                <button onClick={() => { setResult(null); window.history.pushState({}, '', '/plan-date'); }} className="px-4 py-2 text-sm font-medium text-stone hover:text-brick border border-sand rounded-lg hover:bg-sand/20">Start Over</button>
              </div>
            </div>
          </div>
          <DatePlanMap stops={result.stops} className="h-[250px] sm:h-[400px] rounded-xl overflow-hidden" />
          <div className="relative border-l-2 border-dashed border-sand ml-4 md:ml-8 space-y-4 py-2">
            {/* Add stop at beginning button */}
            <div className="relative pl-8 md:pl-12">
              <button
                onClick={() => openAddStopModal(-1)}
                className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-sand/50 hover:bg-brick hover:text-white text-stone flex items-center justify-center shadow-sm transition-colors group"
                title="Add stop at beginning"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
              <div className="h-4" />
            </div>
            {result.stops.map((stop, i) => (
              <div key={i} className="relative pl-8 md:pl-12 space-y-4">
                <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-white border-2 border-brick text-brick font-bold flex items-center justify-center shadow-sm">{stop.order}</div>
                <div className="bg-white rounded-xl border border-sand p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-block px-2 py-1 bg-sand/30 text-stone text-xs font-semibold rounded uppercase tracking-wide">{stop.activity}</span>
                    <span className="text-sm font-medium text-stone">~{stop.duration} min</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{stop.event ? <Link to={`/events/${stop.event.id}`} className="hover:text-brick hover:underline">{stop.event.title}</Link> : (stop.venue?.name || stop.activity)}</h3>
                  {stop.event?.start_datetime && (
                    <p className="text-sm text-brick font-medium mb-2 flex items-center gap-1.5">
                      <span>📅</span>
                      {formatEventTime(stop.event.start_datetime, stop.event.end_datetime)}
                    </p>
                  )}
                  <p className="text-stone text-sm mb-3">{stop.notes}</p>
                  <div className="text-xs text-stone bg-sand/10 p-2 rounded inline-block mb-3">💰 Est. ${stop.cost}/person</div>
                  {stop.transitionTip && i < result.stops.length - 1 && <div className="pt-3 border-t border-sand text-xs text-stone italic flex items-center gap-2 mb-3"><span>🚶</span><span>{stop.transitionTip}</span></div>}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button onClick={() => handleSwap(i)} disabled={swappingIndex !== null} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-brick hover:bg-brick-600 disabled:opacity-50 rounded-lg transition-colors min-h-[36px]">{swappingIndex === i ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ArrowPathIcon className="w-3.5 h-3.5" />}{swappingIndex === i ? 'Swapping...' : 'Swap'}</button>
                    {stop.venue && <button onClick={() => handleDirections(stop.venue)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone bg-white border border-sand rounded-lg hover:bg-sand/20 hover:text-brick transition-colors min-h-[36px]"><MapPinIcon className="w-3.5 h-3.5" />Directions</button>}
                    {stop.venue?.website && <a href={stop.venue.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone bg-white border border-sand rounded-lg hover:bg-sand/20 hover:text-brick transition-colors min-h-[36px]"><GlobeAltIcon className="w-3.5 h-3.5" />Website</a>}
                    {stop.event && <Link to={`/events/${stop.event.id}`} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone bg-white border border-sand rounded-lg hover:bg-sand/20 hover:text-brick transition-colors min-h-[36px]"><TicketIcon className="w-3.5 h-3.5" />Event</Link>}
                  </div>
                </div>
                {/* Add stop after this stop button */}
                <div className="relative">
                  <button
                    onClick={() => openAddStopModal(i)}
                    className="absolute -left-[49px] md:-left-[65px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-sand/50 hover:bg-brick hover:text-white text-stone flex items-center justify-center shadow-sm transition-colors group"
                    title="Add stop here"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                  <div className="h-2" />
                </div>
              </div>
            ))}
          </div>

          {/* Mobile sticky bottom CTA */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-sand p-3 sm:hidden z-50 safe-area-pb">
            <div className="flex gap-2 max-w-lg mx-auto">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 text-sm font-medium text-white bg-brick hover:bg-brick-600 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {saving ? 'Saving...' : <><ShareIcon className="w-4 h-4" />Share</>}
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-3 text-sm font-medium text-stone border border-sand rounded-lg hover:bg-sand/20"
              >
                Edit
              </button>
              <button
                onClick={() => { setResult(null); window.history.pushState({}, '', '/plan-date'); }}
                className="px-4 py-3 text-sm font-medium text-stone border border-sand rounded-lg hover:bg-sand/20"
              >
                New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}