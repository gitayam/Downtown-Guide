interface TimeGroupHeaderProps {
  label: string
  emoji: string
  color: 'dogwood' | 'capefear' | 'liberty' | 'brick'
}

const colorClasses = {
  dogwood: 'bg-dogwood/20 text-brick',
  capefear: 'bg-capefear/10 text-capefear',
  liberty: 'bg-liberty/10 text-liberty',
  brick: 'bg-brick/10 text-brick-600',
}

const lineClasses = {
  dogwood: 'bg-dogwood/30',
  capefear: 'bg-capefear/20',
  liberty: 'bg-liberty/20',
  brick: 'bg-brick/20',
}

export default function TimeGroupHeader({ label, emoji, color }: TimeGroupHeaderProps) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${colorClasses[color]}`}>
        <span className="text-lg">{emoji}</span>
        <span className="font-semibold text-sm uppercase tracking-wide">{label}</span>
      </div>
      <div className={`flex-1 h-px ${lineClasses[color]}`}></div>
    </div>
  )
}
