import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'

interface CategoryFilterProps {
  categories: string[]
  selectedCategories: string[]
  onSelectionChange: (selected: string[]) => void
}

// Category icons for visual appeal
const CATEGORY_ICONS: Record<string, string> = {
  'Community': '🏘️',
  'Arts': '🎨',
  'Live Music': '🎵',
  'Movies': '🎬',
  'Family': '👨‍👩‍👧‍👦',
  'Festivals': '🎉',
  'Sports': '⚽',
  'FSU Sports': '🏀',
  'Military': '🎖️',
  'Long Weekend': '📅',
  'Nightlife': '🌙',
  'Expos': '🏛️',
}

// Preferred display order for categories
const CATEGORY_ORDER = [
  'Community',
  'Arts',
  'Live Music',
  'Movies',
  'Family',
  'Festivals',
  'Sports',
  'FSU Sports',
  'Military',
  'Long Weekend',
  'Nightlife',
  'Expos',
]

export default function CategoryFilter({
  categories,
  selectedCategories,
  onSelectionChange,
}: CategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sort categories by preferred order
  const sortedCategories = [...categories].sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(a)
    const bIdx = CATEGORY_ORDER.indexOf(b)
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b)
    if (aIdx === -1) return 1
    if (bIdx === -1) return -1
    return aIdx - bIdx
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onSelectionChange(selectedCategories.filter(c => c !== category))
    } else {
      onSelectionChange([...selectedCategories, category])
    }
  }

  const selectAll = () => onSelectionChange([...categories])
  const selectNone = () => onSelectionChange([])

  // Calculate what to show in the button
  const allSelected = selectedCategories.length === categories.length
  const noneSelected = selectedCategories.length === 0
  const hiddenCount = categories.length - selectedCategories.length

  // Get display summary
  const getFilterSummary = () => {
    if (allSelected) return 'All Categories'
    if (noneSelected) return 'No Categories'
    if (selectedCategories.length === 1) {
      const cat = selectedCategories[0]
      return `${CATEGORY_ICONS[cat] || '📌'} ${cat}`
    }
    if (hiddenCount === 1) {
      const hidden = categories.find(c => !selectedCategories.includes(c))
      return `All except ${hidden}`
    }
    if (selectedCategories.length <= 3) {
      return selectedCategories.map(c => CATEGORY_ICONS[c] || '📌').join(' ')
    }
    return `${selectedCategories.length} categories`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium whitespace-nowrap ${
          isOpen
            ? 'bg-brick text-white border-brick'
            : hiddenCount > 0
              ? 'bg-brick/10 text-brick border-brick'
              : 'bg-white text-stone border-dogwood/30 hover:border-brick hover:text-brick'
        }`}
      >
        <FunnelIcon className="w-4 h-4" />
        <span className="hidden sm:inline">{getFilterSummary()}</span>
        <span className="sm:hidden">
          {hiddenCount > 0 ? `Filter (${hiddenCount})` : 'Filter'}
        </span>
        {hiddenCount > 0 && (
          <span className="bg-brick text-white text-xs px-1.5 py-0.5 rounded-full hidden sm:inline">
            {hiddenCount} hidden
          </span>
        )}
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-dogwood/20 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-sand/50 border-b border-dogwood/10">
            <div className="flex items-center justify-between">
              <span className="font-medium text-forest">Show Categories</span>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={selectAll}
                  className={`px-2 py-1 rounded transition-colors ${
                    allSelected
                      ? 'bg-brick/20 text-brick'
                      : 'hover:bg-stone/10 text-stone'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={selectNone}
                  className={`px-2 py-1 rounded transition-colors ${
                    noneSelected
                      ? 'bg-brick/20 text-brick'
                      : 'hover:bg-stone/10 text-stone'
                  }`}
                >
                  None
                </button>
              </div>
            </div>
          </div>

          {/* Category List */}
          <div className="max-h-80 overflow-y-auto p-2">
            {sortedCategories.map((category) => {
              const isSelected = selectedCategories.includes(category)
              const icon = CATEGORY_ICONS[category] || '📌'

              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-brick/10 text-forest'
                      : 'text-stone/60 hover:bg-stone/5'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-brick border-brick'
                      : 'border-stone/30'
                  }`}>
                    {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                  </div>

                  {/* Icon and Label */}
                  <span className="text-lg">{icon}</span>
                  <span className={`flex-1 text-left text-sm ${isSelected ? 'font-medium' : ''}`}>
                    {category}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 bg-sand/30 border-t border-dogwood/10 text-xs text-stone text-center">
            {allSelected ? 'Showing all event types' :
             noneSelected ? 'No events will be shown' :
             `Showing ${selectedCategories.length} of ${categories.length} categories`}
          </div>
        </div>
      )}
    </div>
  )
}
