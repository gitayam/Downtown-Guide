interface SectionTabsProps {
  value: string
  onChange: (value: string) => void
}

const tabs = [
  { id: 'all', label: 'All Events', emoji: '📅' },
  { id: 'downtown', label: 'Downtown', emoji: '🏙️' },
  { id: 'fort_bragg', label: 'Fort Liberty', emoji: '🎖️' },
]

export default function SectionTabs({ value, onChange }: SectionTabsProps) {
  return (
    <nav className="flex gap-1 p-1 bg-sand rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
            value === tab.id
              ? 'bg-white text-brick shadow-sm'
              : 'text-stone hover:text-brick hover:bg-white/50'
          }`}
        >
          <span className="hidden sm:inline">{tab.emoji}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
