import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  XMarkIcon,
  ClipboardIcon,
  CheckIcon,
  ShareIcon,
  QrCodeIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline'
import { useShare } from '../../hooks/useShare'
import type { ShareableContent } from '../../hooks/useShare'

// Twitter/X icon component
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

// Facebook icon component
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

// WhatsApp icon component
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

// LinkedIn icon component
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  content: ShareableContent
}

export default function ShareModal({ isOpen, onClose, content }: ShareModalProps) {
  const {
    generateShareUrl,
    copyToClipboard,
    shareToSocialPlatform,
    canUseNativeShare,
    triggerNativeShare
  } = useShare()

  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)

  const shareUrl = generateShareUrl(content)

  // Generate QR code when requested
  useEffect(() => {
    if (showQR && !qrCodeDataUrl) {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`
      setQrCodeDataUrl(qrApiUrl)
    }
  }, [showQR, qrCodeDataUrl, shareUrl])

  const handleCopy = async () => {
    const result = await copyToClipboard(content)
    if (result.success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleNativeShare = async () => {
    await triggerNativeShare(content)
  }

  const handleSocialShare = (platform: 'facebook' | 'twitter' | 'whatsapp' | 'linkedin' | 'email' | 'sms') => {
    shareToSocialPlatform(platform, content)
  }

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col sm:m-4 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-brick to-forest p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <ShareIcon className="w-5 h-5" />
              <h2 className="font-bold text-lg">Share Event</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-white/80 text-sm mt-1 truncate">{content.title}</p>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Share Link */}
          <div>
            <label className="text-xs font-medium text-stone uppercase tracking-wide mb-2 block">
              Share Link
            </label>
            <div className="flex gap-2">
              <code className="flex-1 bg-sand/50 rounded-lg px-3 py-2.5 font-mono text-sm truncate text-gray-700 border border-sand">
                {shareUrl}
              </code>
              <button
                onClick={handleCopy}
                className={`flex-shrink-0 px-3 py-2 rounded-lg border transition-all ${
                  copied
                    ? 'bg-capefear/10 border-capefear text-capefear'
                    : 'bg-white border-sand hover:border-brick text-gray-600 hover:text-brick'
                }`}
              >
                {copied ? <CheckIcon className="w-5 h-5" /> : <ClipboardIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div>
            <label className="text-xs font-medium text-stone uppercase tracking-wide mb-3 block">
              Share on Social
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <SocialButton
                icon={<WhatsAppIcon />}
                label="WhatsApp"
                onClick={() => handleSocialShare('whatsapp')}
                className="bg-green-500 hover:bg-green-600"
              />
              <SocialButton
                icon={<FacebookIcon />}
                label="Facebook"
                onClick={() => handleSocialShare('facebook')}
                className="bg-blue-600 hover:bg-blue-700"
              />
              <SocialButton
                icon={<TwitterIcon />}
                label="X / Twitter"
                onClick={() => handleSocialShare('twitter')}
                className="bg-black hover:bg-gray-800"
              />
              <SocialButton
                icon={<LinkedInIcon />}
                label="LinkedIn"
                onClick={() => handleSocialShare('linkedin')}
                className="bg-blue-700 hover:bg-blue-800"
              />
              <SocialButton
                icon={<EnvelopeIcon className="w-5 h-5" />}
                label="Email"
                onClick={() => handleSocialShare('email')}
                className="bg-gray-600 hover:bg-gray-700"
              />
              <SocialButton
                icon={<ChatBubbleLeftIcon className="w-5 h-5" />}
                label="SMS"
                onClick={() => handleSocialShare('sms')}
                className="bg-purple-600 hover:bg-purple-700"
              />
            </div>
          </div>

          {/* QR Code Toggle */}
          <div className="pt-2 border-t border-sand">
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex items-center gap-2 text-sm text-stone hover:text-gray-900 transition-colors w-full justify-center py-2"
            >
              <QrCodeIcon className="w-4 h-4" />
              {showQR ? 'Hide QR Code' : 'Show QR Code'}
            </button>

            {showQR && qrCodeDataUrl && (
              <div className="mt-3 flex flex-col items-center">
                <div className="bg-white p-3 rounded-xl border border-sand shadow-sm">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code"
                    className="w-40 h-40"
                  />
                </div>
                <p className="text-xs text-stone mt-2">
                  Scan to open event
                </p>
              </div>
            )}
          </div>

          {/* Native Share (Mobile) */}
          {canUseNativeShare && (
            <button
              onClick={handleNativeShare}
              className="w-full bg-brick text-white py-3 px-4 rounded-lg font-medium hover:bg-brick/90 transition-colors flex items-center justify-center gap-2"
            >
              <ShareIcon className="w-4 h-4" />
              More Sharing Options
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

/**
 * Social share button component
 */
function SocialButton({
  icon,
  label,
  onClick,
  className = ''
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl text-white transition-all duration-200 hover:scale-105 ${className}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}
