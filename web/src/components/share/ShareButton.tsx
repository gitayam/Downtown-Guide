import { useState } from 'react'
import { ShareIcon } from '@heroicons/react/24/outline'
import { useShare } from '../../hooks/useShare'
import type { ShareableContent } from '../../hooks/useShare'
import ShareModal from './ShareModal'

interface ShareButtonProps {
  content: ShareableContent
  variant?: 'default' | 'outline' | 'ghost' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showLabel?: boolean
  label?: string
}

/**
 * Reusable Share Button that handles the entire share flow
 *
 * Usage:
 * ```tsx
 * <ShareButton
 *   content={{
 *     type: 'event',
 *     id: event.id,
 *     title: event.title,
 *     description: event.description,
 *     url: `/events/${event.id}`,
 *     date: '2025-01-15',
 *     location: 'Downtown Fayetteville'
 *   }}
 * />
 * ```
 */
export default function ShareButton({
  content,
  variant = 'outline',
  size = 'md',
  className = '',
  showLabel = true,
  label = 'Share'
}: ShareButtonProps) {
  const { smartShare, closeShareModal, isSharing } = useShare()
  const [localShowModal, setLocalShowModal] = useState(false)

  const handleClick = async () => {
    const result = await smartShare(content)
    if (result.method === 'modal') {
      setLocalShowModal(true)
    }
  }

  const handleCloseModal = () => {
    setLocalShowModal(false)
    closeShareModal()
  }

  const sizeClasses = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-10 px-3 text-sm',
    lg: 'h-12 px-4 text-base'
  }

  const variantClasses = {
    default: 'bg-brick text-white hover:bg-brick/90',
    outline: 'border border-sand bg-white text-gray-700 hover:bg-sand/50 hover:text-brick',
    ghost: 'text-stone hover:text-gray-900 hover:bg-sand/50',
    icon: 'w-9 h-9 p-0 rounded-full border border-sand bg-white hover:bg-sand/50 text-stone hover:text-brick'
  }

  const applySizeClasses = variant !== 'icon'

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isSharing}
        className={`
          inline-flex items-center justify-center gap-2 rounded-lg font-medium
          transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${applySizeClasses ? sizeClasses[size] : ''}
          ${variantClasses[variant]}
          ${className}
        `}
      >
        <ShareIcon
          className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}
        />
        {showLabel && variant !== 'icon' && label}
      </button>

      <ShareModal
        isOpen={localShowModal}
        onClose={handleCloseModal}
        content={content}
      />
    </>
  )
}

/**
 * Simplified icon-only share button for compact spaces
 */
export function ShareIconButton({
  content,
  className = ''
}: {
  content: ShareableContent
  className?: string
}) {
  return (
    <ShareButton
      content={content}
      variant="icon"
      showLabel={false}
      className={className}
    />
  )
}
