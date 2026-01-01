import {
  ListBulletIcon,
  CalendarIcon,
  MapIcon,
  GlobeAmericasIcon,
} from '@heroicons/react/24/outline'

export type ViewMode = 'list' | 'calendar' | 'map' | 'maplibre'

interface ViewToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="bg-sand p-1 rounded-lg flex items-center">
      <button
        onClick={() => onChange('list')}
        className={`p-2 rounded-md transition-all ${
          value === 'list'
            ? 'bg-white text-brick shadow-sm'
            : 'text-stone hover:text-gray-900'
        }`}
        title="List View"
      >
        <ListBulletIcon className="w-5 h-5" />
      </button>
      <button
        onClick={() => onChange('calendar')}
        className={`p-2 rounded-md transition-all ${
          value === 'calendar'
            ? 'bg-white text-brick shadow-sm'
            : 'text-stone hover:text-gray-900'
        }`}
        title="Calendar View"
      >
        <CalendarIcon className="w-5 h-5" />
      </button>
      <button
        onClick={() => onChange('map')}
        className={`p-2 rounded-md transition-all ${
          value === 'map'
            ? 'bg-white text-brick shadow-sm'
            : 'text-stone hover:text-gray-900'
        }`}
        title="Leaflet Map"
      >
        <MapIcon className="w-5 h-5" />
      </button>
      <button
        onClick={() => onChange('maplibre')}
        className={`p-2 rounded-md transition-all ${
          value === 'maplibre'
            ? 'bg-white text-brick shadow-sm'
            : 'text-stone hover:text-gray-900'
        }`}
        title="MapLibre (Beta)"
      >
        <GlobeAmericasIcon className="w-5 h-5" />
      </button>
    </div>
  )
}
