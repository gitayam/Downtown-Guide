interface CategoryFilterProps {
  categories: string[]
  value: string
  onChange: (value: string) => void
}

export default function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  // Add "All" option at the beginning
  const allCategories = ['all', ...categories]

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {allCategories.map((category) => {
        const isActive = category === value || (category === 'all' && !value)
        const label = category === 'all' ? 'All' : category

        return (
          <button
            key={category}
            onClick={() => onChange(category === 'all' ? '' : category)}
            className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-brick text-white'
                : 'bg-white text-stone border border-dogwood/30 hover:border-brick hover:text-brick'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
