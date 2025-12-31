import { useState, useCallback } from 'react'

/**
 * Shareable content types
 */
export type ShareContentType = 'event' | 'page'

/**
 * Content to be shared
 */
export interface ShareableContent {
  type: ShareContentType
  id?: string
  title: string
  description: string
  url: string
  image?: string
  date?: string
  location?: string
  hashtags?: string[]
}

/**
 * Share result
 */
export interface ShareResult {
  success: boolean
  method: 'native' | 'copy' | 'modal' | 'platform'
  platform?: string
}

/**
 * Share Hook - Unified sharing logic for Fayetteville Events
 *
 * Features:
 * - Native Web Share API detection (mobile-first)
 * - Fallback to copy-to-clipboard or modal
 * - Social platform share URLs
 */
export function useShare() {
  const [isSharing, setIsSharing] = useState(false)
  const [showModal, setShowModal] = useState(false)

  /**
   * Check if native Web Share API is available
   */
  const canUseNativeShare = useCallback((): boolean => {
    return typeof navigator !== 'undefined' && 'share' in navigator
  }, [])

  /**
   * Check if on mobile device
   */
  const isMobile = useCallback((): boolean => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }, [])

  /**
   * Generate the full share URL
   */
  const generateShareUrl = useCallback((content: ShareableContent): string => {
    const baseUrl = content.url.startsWith('http')
      ? content.url
      : `${window.location.origin}${content.url}`
    return baseUrl
  }, [])

  /**
   * Generate share text based on content type
   */
  const generateShareText = useCallback((content: ShareableContent): string => {
    switch (content.type) {
      case 'event':
        return `Check out ${content.title}${content.date ? ` on ${content.date}` : ''}${content.location ? ` at ${content.location}` : ''} - Fayetteville Events`

      default:
        return `Check out ${content.title} on Fayetteville Events!`
    }
  }, [])

  /**
   * Copy link to clipboard
   */
  const copyToClipboard = useCallback(async (content: ShareableContent): Promise<ShareResult> => {
    const shareUrl = generateShareUrl(content)

    try {
      await navigator.clipboard.writeText(shareUrl)
      return { success: true, method: 'copy' }
    } catch (err) {
      console.error('Clipboard copy failed:', err)
      return { success: false, method: 'copy' }
    }
  }, [generateShareUrl])

  /**
   * Trigger native share (mobile)
   */
  const triggerNativeShare = useCallback(async (content: ShareableContent): Promise<ShareResult> => {
    if (!canUseNativeShare()) {
      return { success: false, method: 'native' }
    }

    const shareUrl = generateShareUrl(content)
    const shareText = generateShareText(content)

    setIsSharing(true)

    try {
      await navigator.share({
        title: content.title,
        text: shareText,
        url: shareUrl
      })
      return { success: true, method: 'native' }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, method: 'native' }
      }
      console.error('Native share failed:', err)
      return { success: false, method: 'native' }
    } finally {
      setIsSharing(false)
    }
  }, [canUseNativeShare, generateShareUrl, generateShareText])

  /**
   * Open share modal
   */
  const openShareModal = useCallback(() => {
    setShowModal(true)
  }, [])

  /**
   * Close share modal
   */
  const closeShareModal = useCallback(() => {
    setShowModal(false)
  }, [])

  /**
   * Generate social media share URL
   */
  const getSocialShareUrl = useCallback((
    platform: 'facebook' | 'twitter' | 'whatsapp' | 'linkedin' | 'email' | 'sms',
    content: ShareableContent
  ): string => {
    const shareUrl = encodeURIComponent(generateShareUrl(content))
    const shareText = encodeURIComponent(generateShareText(content))
    const title = encodeURIComponent(content.title)
    const hashtags = content.hashtags?.join(',') || 'fayetteville,events'

    switch (platform) {
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`

      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}&hashtags=${hashtags}`

      case 'whatsapp':
        return `https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`

      case 'linkedin':
        return `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`

      case 'email':
        const emailBody = encodeURIComponent(
          `Check out this event:\n\n${content.title}${content.date ? `\nDate: ${content.date}` : ''}${content.location ? `\nLocation: ${content.location}` : ''}${content.description ? `\n\n${content.description}` : ''}`
        )
        return `mailto:?subject=${title}&body=${emailBody}%0A%0A${shareUrl}`

      case 'sms':
        return `sms:?body=${shareText}%20${shareUrl}`

      default:
        return generateShareUrl(content)
    }
  }, [generateShareUrl, generateShareText])

  /**
   * Share to a specific platform
   */
  const shareToSocialPlatform = useCallback((
    platform: 'facebook' | 'twitter' | 'whatsapp' | 'linkedin' | 'email' | 'sms',
    content: ShareableContent
  ) => {
    const url = getSocialShareUrl(platform, content)
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [getSocialShareUrl])

  /**
   * Smart Share - automatically chooses the best share method
   */
  const smartShare = useCallback(async (content: ShareableContent): Promise<ShareResult> => {
    // Mobile with native share - use it
    if (isMobile() && canUseNativeShare()) {
      const result = await triggerNativeShare(content)
      if (result.success) return result
    }

    // Desktop or native share unavailable - open modal
    if (!isMobile() || !canUseNativeShare()) {
      openShareModal()
      return { success: true, method: 'modal' }
    }

    // Fallback - copy to clipboard
    return copyToClipboard(content)
  }, [isMobile, canUseNativeShare, triggerNativeShare, openShareModal, copyToClipboard])

  return {
    // State
    isSharing,
    showModal,

    // Capabilities
    canUseNativeShare: canUseNativeShare(),
    isMobile: isMobile(),

    // URL generation
    generateShareUrl,
    generateShareText,
    getSocialShareUrl,

    // Actions
    smartShare,
    copyToClipboard,
    triggerNativeShare,
    openShareModal,
    closeShareModal,
    shareToSocialPlatform
  }
}
