import { ListBulletIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'

export type ViewMode = 'list' | 'calendar'

interface ViewToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
}

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-sand rounded-lg">
      <button
        onClick={() => onChange('list')}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          value === 'list'
            ? 'bg-white text-brick shadow-sm'
            : 'text-stone hover:text-brick'
        }`}
        aria-label="List view"
      >
        <ListBulletIcon className="w-4 h-4" />
        <span className="hidden sm:inline">List</span>
      </button>
      <button
        onClick={() => onChange('calendar')}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          value === 'calendar'
            ? 'bg-white text-brick shadow-sm'
            : 'text-stone hover:text-brick'
        }`}
        aria-label="Calendar view"
      >
        <CalendarDaysIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Calendar</span>
      </button>
    </div>
  )
}
