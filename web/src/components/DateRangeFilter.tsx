import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'

export type DateRange = 'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'custom'

export interface CustomDateRange {
  from: Date
  to: Date
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
  customRange?: CustomDateRange
  onCustomRangeChange?: (range: CustomDateRange) => void
}

const RANGES: { id: DateRange; label: string; emoji: string }[] = [
  { id: 'today', label: 'Today', emoji: '📅' },
  { id: 'tomorrow', label: 'Tomorrow', emoji: '⏩' },
  { id: 'week', label: 'This Week', emoji: '🗓️' },
  { id: 'month', label: 'This Month', emoji: '📆' },
  { id: 'all', label: 'All Upcoming', emoji: '∞' },
  { id: 'custom', label: 'Custom', emoji: '✨' },
]

export default function DateRangeFilter({
  value,
  onChange,
  customRange,
  onCustomRangeChange
}: DateRangeFilterProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempFrom, setTempFrom] = useState<string>(
    customRange ? format(customRange.from, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  )
  const [tempTo, setTempTo] = useState<string>(
    customRange ? format(customRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  )
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCustomClick = () => {
    if (value === 'custom') {
      setShowDatePicker(!showDatePicker)
    } else {
      onChange('custom')
      setShowDatePicker(true)
    }
  }

  const handleApplyCustomRange = () => {
    if (onCustomRangeChange) {
      onCustomRangeChange({
        from: new Date(tempFrom + 'T00:00:00'),
        to: new Date(tempTo + 'T23:59:59')
      })
    }
    setShowDatePicker(false)
  }

  const formatCustomLabel = () => {
    if (!customRange) return 'Custom'
    const fromStr = format(customRange.from, 'MMM d')
    const toStr = format(customRange.to, 'MMM d')
    if (fromStr === toStr) return fromStr
    return `${fromStr} - ${toStr}`
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2">
        {RANGES.map((range) => (
          <button
            key={range.id}
            onClick={() => range.id === 'custom' ? handleCustomClick() : onChange(range.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
              value === range.id
                ? 'bg-brick text-white shadow-sm'
                : 'bg-sand/50 text-stone hover:bg-sand hover:text-gray-900'
            }`}
          >
            <span>{range.emoji}</span>
            {range.id === 'custom' && value === 'custom' && customRange
              ? formatCustomLabel()
              : range.label}
          </button>
        ))}
      </div>

      {/* Custom Date Picker Dropdown */}
      {showDatePicker && (
        <div
          ref={pickerRef}
          className="absolute top-full left-0 mt-2 p-4 bg-white rounded-xl shadow-lg border border-sand z-50 min-w-[280px]"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={tempFrom}
                onChange={(e) => setTempFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brick focus:border-brick text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={tempTo}
                min={tempFrom}
                onChange={(e) => setTempTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brick focus:border-brick text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDatePicker(false)}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCustomRange}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-brick rounded-lg hover:bg-brick-600 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
