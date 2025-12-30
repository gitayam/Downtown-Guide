import { format, isToday, isTomorrow, isThisWeek, parseISO, differenceInDays } from 'date-fns'
import type { Event, TimeGroup } from './types'

export function formatEventDate(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'EEE, MMM d')
}

export function formatEventTime(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'h:mm a')
}

export function formatEventDateFull(dateString: string): string {
  const date = parseISO(dateString)
  return format(date, 'EEEE, MMMM d, yyyy')
}

export function formatEventTimeRange(start: string, end: string): string {
  const startDate = parseISO(start)
  const endDate = parseISO(end)
  return `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`
}

export function getRelativeDay(dateString: string): string {
  const date = parseISO(dateString)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return formatEventDate(dateString)
}

export function groupEventsByTime(events: Event[]): TimeGroup[] {
  const today: Event[] = []
  const tomorrow: Event[] = []
  const thisWeek: Event[] = []
  const later: Event[] = []

  const now = new Date()

  events.forEach(event => {
    const date = parseISO(event.start_datetime)

    if (isToday(date)) {
      today.push(event)
    } else if (isTomorrow(date)) {
      tomorrow.push(event)
    } else if (isThisWeek(date, { weekStartsOn: 0 }) && differenceInDays(date, now) <= 7) {
      thisWeek.push(event)
    } else {
      later.push(event)
    }
  })

  const groups: TimeGroup[] = []

  if (today.length > 0) {
    groups.push({
      label: 'Today',
      emoji: '🔥',
      color: 'dogwood',
      events: today,
    })
  }

  if (tomorrow.length > 0) {
    groups.push({
      label: 'Tomorrow',
      emoji: '⚡',
      color: 'capefear',
      events: tomorrow,
    })
  }

  if (thisWeek.length > 0) {
    groups.push({
      label: 'This Week',
      emoji: '📅',
      color: 'liberty',
      events: thisWeek,
    })
  }

  if (later.length > 0) {
    groups.push({
      label: 'Coming Up',
      emoji: '🗓️',
      color: 'brick',
      events: later,
    })
  }

  return groups
}

export function parseCategories(categoriesJson: string | null): string[] {
  if (!categoriesJson) return []
  try {
    return JSON.parse(categoriesJson)
  } catch {
    return []
  }
}

export function getSectionBadge(section: string): { label: string; emoji: string; className: string } {
  if (section === 'fort_bragg') {
    return {
      label: 'Fort Liberty',
      emoji: '🎖️',
      className: 'section-badge-liberty',
    }
  }
  return {
    label: 'Downtown',
    emoji: '🏙️',
    className: 'section-badge-downtown',
  }
}

export function getSourceBadge(sourceId: string): { label: string; emoji: string } {
  const badges: Record<string, { label: string; emoji: string }> = {
    visit_downtown: { label: 'Downtown', emoji: '🏙️' },
    segra_stadium: { label: 'Segra', emoji: '⚾' },
    distinctly_fayetteville: { label: 'CVB', emoji: '🎭' },
    dogwood_festival: { label: 'Dogwood', emoji: '🌸' },
    fort_liberty_mwr: { label: 'Fort Liberty', emoji: '🎖️' },
  }
  return badges[sourceId] || { label: 'Event', emoji: '📅' }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}
