import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon, SparklesIcon, ShareIcon, MapPinIcon, GlobeAltIcon, TicketIcon, ArrowPathIcon, PlusIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import { fetchDateSuggestions, generateDatePlan, saveDatePlan, getDatePlan, swapDateStop, type DatePlan, type DateStop, type DateSuggestions } from '../lib/api'
import DatePlanMap from '../components/date-planner/DatePlanMap'
import ShareModal from '../components/share/ShareModal'
import DirectionsModal from '../components/DirectionsModal'

// This is the merged and resolved file content.
// I have adopted the more advanced UI and re-integrated the swap and edit features.

export default function PlanDatePage() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null)
  const [addingAfterIndex, setAddingAfterIndex] = useState<number | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [directionsModalOpen, setDirectionsModalOpen] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<any>(null)
  const [shareUrl, setShareUrl] = useState('')
  
  const urlParams = new URLSearchParams(window.location.search)
  const sharedId = urlParams.get('id')

  const [suggestions, setSuggestions] = useState<DateSuggestions | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [whenSelection, setWhenSelection] = useState<string>('pick_date')

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
    try {
      const res = await generateDatePlan(prefs)
      setResult(res.plan)
      setShareUrl('')
    } catch (e) {
      console.error(e); alert('Failed to generate plan.')
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

  const toggleVibe = (vibe: string) => setPrefs(p => ({ ...p, vibes: p.vibes.includes(vibe) ? p.vibes.filter(v => v !== vibe) : [...p.vibes, vibe] }))

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} content={{ type: 'event', id: 'plan', title: result?.title || 'Date Plan', description: `Check out this date plan: ${result?.stops.map(s => s.activity).join(', ')}`, url: shareUrl }} />
      {selectedVenue && <DirectionsModal isOpen={directionsModalOpen} onClose={() => setDirectionsModalOpen(false)} event={selectedVenue} />}
      <Link to="/" className="inline-flex items-center text-stone hover:text-brick mb-6"><ArrowLeftIcon className="w-4 h-4 mr-1" />Back to Events</Link>
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-2">{result && sharedId ? 'Shared Date Plan' : 'Plan Your Perfect Date'}</h1>
        <p className="text-lg text-stone">{result && sharedId ? 'A curated itinerary for a perfect outing in Fayetteville.' : "Tell us what you're looking for, and we'll curate a custom itinerary."}</p>
      </div>

      {!result ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">When?</label>
              <input type="date" value={prefs.date} min={new Date().toISOString().split('T')[0]} onChange={(e) => setPrefs({ ...prefs, date: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-sand focus:border-brick focus:ring-1 focus:ring-brick outline-none text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Time of Day</label>
              <div className="flex gap-2">
                {suggestions?.time_of_day.map(time => (
                  <button key={time.id} onClick={() => setPrefs({ ...prefs, time_of_day: time.id as any })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex flex-col items-center gap-1 ${prefs.time_of_day === time.id ? 'bg-brick text-white' : 'bg-sand/20 text-stone hover:bg-sand/40'}`}>
                    <span>{time.icon}</span><span className="text-xs">{time.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select vibes</label>
            <div className="flex flex-wrap gap-2">{suggestions?.vibes.map(vibe => (<button key={vibe.id} onClick={() => toggleVibe(vibe.id)} className={`px-3 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${prefs.vibes.includes(vibe.id) ? 'bg-capefear text-white' : 'bg-sand/20 text-stone hover:bg-sand/40'}`}><span>{vibe.icon}</span>{vibe.label}</button>))}</div>
          </div>
          <div className="pt-4"><button onClick={handleGenerate} disabled={generating} className="w-full py-4 bg-brick hover:bg-brick-600 disabled:opacity-70 text-white rounded-xl font-bold text-lg shadow-lg shadow-brick/20 transition-all flex items-center justify-center gap-2">{generating ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><SparklesIcon className="w-6 h-6" />Generate Itinerary</>}</button></div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-white p-6 rounded-xl border border-sand shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div><h2 className="text-2xl font-bold text-gray-900">{result.title}</h2><p className="text-stone mt-1">Est. Cost: ${result.estimatedCost}/person • Duration: {result.totalDuration / 60}h</p></div>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-brick hover:bg-brick-600 rounded-lg transition-colors flex items-center gap-2">{saving ? 'Saving...' : <><ShareIcon className="w-4 h-4" />Share</>}</button>
              <button onClick={handleEdit} className="px-4 py-2 text-sm font-medium text-stone hover:text-brick border border-sand rounded-lg hover:bg-sand/20">Edit</button>
              <button onClick={() => { setResult(null); window.history.pushState({}, '', '/plan-date'); }} className="px-4 py-2 text-sm font-medium text-stone hover:text-brick border border-sand rounded-lg hover:bg-sand/20">Start Over</button>
            </div>
          </div>
          <DatePlanMap stops={result.stops} className="h-[400px]" />
          <div className="relative border-l-2 border-dashed border-sand ml-4 md:ml-8 space-y-4 py-2">
            {result.stops.map((stop, i) => (
              <div key={i} className="relative pl-8 md:pl-12 space-y-4">
                <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-white border-2 border-brick text-brick font-bold flex items-center justify-center shadow-sm">{stop.order}</div>
                <div className="bg-white rounded-xl border border-sand p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-block px-2 py-1 bg-sand/30 text-stone text-xs font-semibold rounded uppercase tracking-wide">{stop.activity}</span>
                    <span className="text-sm font-medium text-stone">~{stop.duration} min</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{stop.event ? <Link to={`/events/${stop.event.id}`} className="hover:text-brick hover:underline">{stop.event.title}</Link> : (stop.venue?.name || stop.activity)}</h3>
                  <p className="text-stone text-sm mb-3">{stop.notes}</p>
                  <div className="text-xs text-stone bg-sand/10 p-2 rounded inline-block mb-3">💰 Est. ${stop.cost}/person</div>
                  {stop.transitionTip && i < result.stops.length - 1 && <div className="pt-3 border-t border-sand text-xs text-stone italic flex items-center gap-2 mb-3"><span>🚶</span><span>{stop.transitionTip}</span></div>}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button onClick={() => handleSwap(i)} disabled={swappingIndex !== null} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brick hover:bg-brick-600 disabled:opacity-50 rounded-lg transition-colors">{swappingIndex === i ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ArrowPathIcon className="w-3.5 h-3.5" />}{swappingIndex === i ? 'Swapping...' : 'Swap'}</button>
                    {stop.venue && <button onClick={() => handleDirections(stop.venue)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone bg-white border border-sand rounded-lg hover:bg-sand/20 hover:text-brick transition-colors"><MapPinIcon className="w-3.5 h-3.5" />Directions</button>}
                    {stop.venue?.website && <a href={stop.venue.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone bg-white border border-sand rounded-lg hover:bg-sand/20 hover:text-brick transition-colors"><GlobeAltIcon className="w-3.5 h-3.5" />Website</a>}
                    {stop.event && <Link to={`/events/${stop.event.id}`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone bg-white border border-sand rounded-lg hover:bg-sand/20 hover:text-brick transition-colors"><TicketIcon className="w-3.5 h-3.5" />View Event</Link>}
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