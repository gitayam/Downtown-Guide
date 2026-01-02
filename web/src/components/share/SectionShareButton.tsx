import { useState } from 'react'
import { ShareIcon } from '@heroicons/react/24/outline'
import type { Event } from '../../lib/types'
import SectionShareModal from './SectionShareModal'
import { type DateRange } from '../DateRangeFilter'

interface SectionShareButtonProps {
  events: Event[]
  dateRange: DateRange
  sectionName: string // e.g. "All Events", "Downtown"
  className?: string
}

export default function SectionShareButton({
  events,
  dateRange,
  sectionName,
  className = ''
}: SectionShareButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`
          inline-flex items-center justify-center gap-2 rounded-lg font-medium
          h-10 px-3 text-sm border border-sand bg-white text-gray-700 
          hover:bg-sand/50 hover:text-brick transition-all duration-200 
          hover:scale-[1.02] active:scale-[0.98]
          ${className}
        `}
        title="Share this list"
      >
        <ShareIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Share List</span>
      </button>

      <SectionShareModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        events={events}
        dateRange={dateRange}
        sectionName={sectionName}
      />
    </>
  )
}
