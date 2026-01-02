import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  XMarkIcon,
  ClipboardIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { toPng } from 'html-to-image'
import type { Event } from '../../lib/types'
import { type DateRange } from '../DateRangeFilter'
import EventExportList from './EventExportList'

interface SectionShareModalProps {
  isOpen: boolean
  onClose: () => void
  events: Event[]
  dateRange: DateRange
  sectionName: string
}

export default function SectionShareModal({
  isOpen,
  onClose,
  events,
  dateRange,
  sectionName
}: SectionShareModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const getTitle = () => {
    switch (dateRange) {
      case 'today': return 'Today\'s Events'
      case 'tomorrow': return 'Tomorrow\'s Events'
      case 'weekend': return 'Weekend Events'
      case 'all': return 'Upcoming Events'
      case 'custom': return 'Event Schedule'
      default: return 'Events'
    }
  }

  const getSubtitle = () => {
    const count = events.length
    const source = sectionName === 'all' ? 'All Locations' : 
                   sectionName === 'downtown' ? 'Downtown Fayetteville' : 
                   sectionName === 'crown' ? 'Crown Complex' : 
                   sectionName === 'fort_bragg' ? 'Fort Liberty' : sectionName
    return `${count} events • ${source}`
  }

  const generateTextSummary = () => {
    const title = getTitle()
    const subtitle = getSubtitle()
    
    let text = `📅 *${title}* - ${subtitle}\n\n`
    
    events.slice(0, 20).forEach(event => {
      const time = format(new Date(event.start_datetime), 'h:mm a')
      const location = event.location_name || event.venue_name || 'TBD'
      text += `• ${time}: ${event.title} @ ${location}\n`
    })

    if (events.length > 20) {
      text += `\n...and ${events.length - 20} more.\n`
    }

    text += `\n🔗 Full details: https://fayetteville.events`
    return text
  }

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateTextSummary())
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    } catch (err) {
      console.error('Failed to copy text', err)
    }
  }

  const generateImage = async (): Promise<Blob | null> => {
    if (!exportRef.current) return null

    const element = exportRef.current

    try {
      // html-to-image is much faster and handles styles better
      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: element.offsetHeight,
        pixelRatio: 2, // Retina quality
      })

      // Convert Data URL to Blob
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      return blob
    } catch (err) {
      console.error('Image generation failed', err)
      return null
    }
  }

  const handleCopyImage = async () => {
    setIsGenerating(true)
    setShareError(null)

    try {
      const blob = await generateImage()
      if (blob) {
          await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
          ])
          setCopiedImage(true)
          setTimeout(() => setCopiedImage(false), 2000)
      } else {
          setShareError("Failed to generate image.")
      }
    } catch (err) {
      console.error('Copy image failed', err)
      setShareError("Failed to copy image. Your browser might not support this.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadImage = async () => {
    setIsGenerating(true)
    setShareError(null)
    
    try {
      const blob = await generateImage()
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `fayetteville-events-${format(new Date(), 'yyyy-MM-dd')}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        setShareError("Failed to generate image. Try 'Copy Text Summary' instead.")
      }
    } catch (err) {
      console.error('Download failed', err)
      setShareError("Failed to download image.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleShareImage = async () => {
    setIsGenerating(true)
    setShareError(null)

    try {
      const blob = await generateImage()
      
      if (blob && navigator.share) {
        try {
          const file = new File([blob], 'events.png', { type: 'image/png' })
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: getTitle(),
              text: getSubtitle()
            })
          } else {
              setShareError("Your browser doesn't support image sharing.")
          }
        } catch (err) {
           if (err instanceof Error && err.name !== 'AbortError') {
               console.error('Share failed', err)
               setShareError('Failed to share image.')
           }
        }
      } else {
          setShareError("Sharing not supported on this device.")
      }
    } catch (err) {
      console.error('Share failed', err)
      setShareError("Failed to generate image.")
    } finally {
      setIsGenerating(false)
    }
  }

  const canShareFiles = typeof navigator !== 'undefined' && 
                        'share' in navigator && 
                        'canShare' in navigator

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:m-4 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-brick to-forest p-4 flex-shrink-0 flex items-center justify-between text-white">
          <h2 className="font-bold text-lg">Share List</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 mb-2">
            Share <strong>{events.length} events</strong> from <strong>{getTitle()}</strong>
          </p>

          {/* Action Buttons */}
          <div className="grid gap-3">
            
            {/* 1. Copy Text Summary */}
            <button
              onClick={handleCopyText}
              className="flex items-center gap-3 p-3 rounded-xl border border-sand hover:border-brick hover:bg-sand/30 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                {copiedText ? <CheckIcon className="w-5 h-5" /> : <ClipboardIcon className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Copy Text Summary</div>
                <div className="text-xs text-gray-500">Best for WhatsApp / Signal groups</div>
              </div>
            </button>

            {/* 2. Copy Image to Clipboard */}
             <button
              onClick={handleCopyImage}
              disabled={isGenerating}
              className="flex items-center gap-3 p-3 rounded-xl border border-sand hover:border-brick hover:bg-sand/30 transition-all group text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                {isGenerating && !copiedImage ? (
                     <div className="animate-spin w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full"/>
                ) : copiedImage ? (
                    <CheckIcon className="w-5 h-5" />
                ) : (
                    <PhotoIcon className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Copy Image</div>
                <div className="text-xs text-gray-500">Paste directly into apps</div>
              </div>
            </button>

            {/* 3. Download Image */}
            <button
              onClick={handleDownloadImage}
              disabled={isGenerating}
              className="flex items-center gap-3 p-3 rounded-xl border border-sand hover:border-brick hover:bg-sand/30 transition-all group text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                {isGenerating && !copiedImage ? <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"/> : <ArrowDownTrayIcon className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Download Image</div>
                <div className="text-xs text-gray-500">Save as a high-quality PNG flyer</div>
              </div>
            </button>

             {/* 4. Share Image (Mobile) */}
             {canShareFiles && (
                <button
                  onClick={handleShareImage}
                  disabled={isGenerating}
                  className="flex items-center gap-3 p-3 rounded-xl border border-sand hover:border-brick hover:bg-sand/30 transition-all group text-left disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {isGenerating ? <div className="animate-spin w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full"/> : <ShareIcon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Share Image</div>
                    <div className="text-xs text-gray-500">Post directly to Instagram / Stories</div>
                  </div>
                </button>
             )}
          </div>
          
          {shareError && (
              <p className="text-xs text-red-500 text-center">{shareError}</p>
          )}

        </div>
      </div>

      {/* Hidden Render Container for Image Generation */}
      <div 
        ref={exportRef}
        style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: -9999,
            opacity: 1,
            pointerEvents: 'none',
            backgroundColor: 'white'
        }}
      >
        <EventExportList 
          events={events} 
          title={getTitle()}
          subtitle={getSubtitle()}
        />
      </div>
    </div>,
    document.body
  )
}