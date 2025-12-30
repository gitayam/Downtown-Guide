import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns'
import type { Event } from '../lib/types'
import { formatEventTime } from '../lib/utils'

interface CalendarGridProps {
  events: Event[]
  onDateSelect?: (date: Date) => void
}

export default function CalendarGrid({ events, onDateSelect }: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const dateScrollRef = useRef<HTMLDivElement>(null)

  // Get all days in the current month for the horizontal picker
  const monthDates = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    return eachDayOfInterval({ start: monthStart, end: monthEnd })
  }, [currentMonth])

  // Get all days to display in the calendar grid (for desktop)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>()
    events.forEach((event) => {
      const dateKey = format(parseISO(event.start_datetime), 'yyyy-MM-dd')
      const existing = map.get(dateKey) || []
      map.set(dateKey, [...existing, event])
    })
    return map
  }, [events])

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return []
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    return eventsByDate.get(dateKey) || []
  }, [selectedDate, eventsByDate])

  // Group events by date for mobile list view
  const groupedEventsList = useMemo(() => {
    const datesWithEvents: [string, Event[]][] = []
    monthDates.forEach((date) => {
      const dateKey = format(date, 'yyyy-MM-dd')
      const dayEvents = eventsByDate.get(dateKey)
      if (dayEvents && dayEvents.length > 0) {
        datesWithEvents.push([dateKey, dayEvents])
      }
    })
    return datesWithEvents
  }, [monthDates, eventsByDate])

  // Auto-scroll to first date with events on month change
  useEffect(() => {
    if (dateScrollRef.current) {
      // Find first date with events
      const firstEventDate = monthDates.find((date) => {
        const dateKey = format(date, 'yyyy-MM-dd')
        const events = eventsByDate.get(dateKey)
        return events && events.length > 0
      })

      if (firstEventDate) {
        const dateElement = dateScrollRef.current.querySelector(
          `[data-date="${firstEventDate.getDate()}"]`
        ) as HTMLElement

        if (dateElement) {
          setTimeout(() => {
            dateElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
          }, 100)
        }
      }
    }
  }, [currentMonth, monthDates, eventsByDate])

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => {
    setCurrentMonth(new Date())
    setSelectedDate(new Date())
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    onDateSelect?.(date)
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Get section color classes
  const getSectionColor = (section: string) => {
    return section === 'downtown' ? 'bg-brick' : 'bg-liberty'
  }

  return (
    <div>
      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE VIEW - Horizontal Date Picker + Vertical List
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="block lg:hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm font-medium text-brick bg-brick/10 hover:bg-brick/20 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-sand rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="w-5 h-5 text-stone" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-sand rounded-lg transition-colors"
              aria-label="Next month"
            >
              <ChevronRightIcon className="w-5 h-5 text-stone" />
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Date Picker */}
        <div
          ref={dateScrollRef}
          className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4"
        >
          {monthDates.map((date) => {
            const dateKey = format(date, 'yyyy-MM-dd')
            const dayEvents = eventsByDate.get(dateKey) || []
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const isTodayDate = isToday(date)
            const hasEvents = dayEvents.length > 0

            // Count events by section for dots
            const downtownCount = dayEvents.filter(e => e.section === 'downtown').length
            const libertyCount = dayEvents.filter(e => e.section === 'fort_bragg').length

            return (
              <button
                key={dateKey}
                data-date={date.getDate()}
                onClick={() => handleDateClick(date)}
                className={`
                  flex-shrink-0 snap-start flex flex-col items-center justify-center
                  w-14 min-h-[72px] rounded-2xl transition-all
                  ${isSelected
                    ? 'bg-gradient-to-br from-brick to-brick-600 text-white shadow-lg scale-105'
                    : isTodayDate
                      ? 'bg-brick/10 text-brick ring-2 ring-brick'
                      : hasEvents
                        ? 'bg-sand hover:bg-sand/80'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-400'
                  }
                `}
              >
                <span className={`text-[10px] uppercase font-medium ${isSelected ? 'text-white/80' : ''}`}>
                  {format(date, 'EEE')}
                </span>
                <span className={`text-lg font-bold ${isSelected ? 'text-white' : ''}`}>
                  {date.getDate()}
                </span>
                {/* Event dots */}
                {hasEvents && (
                  <div className="flex gap-0.5 mt-1">
                    {downtownCount > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-white/80' : 'bg-brick'
                        }`}
                      />
                    )}
                    {libertyCount > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-white/80' : 'bg-liberty'
                        }`}
                      />
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-1.5 text-xs text-stone">
            <span className="w-2 h-2 rounded-full bg-brick" />
            Downtown
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone">
            <span className="w-2 h-2 rounded-full bg-liberty" />
            Fort Liberty
          </div>
        </div>

        {/* Events List - Grouped by Date */}
        <div className="space-y-6">
          {groupedEventsList.length === 0 ? (
            <div className="text-center py-8 bg-sand/50 rounded-2xl">
              <span className="text-3xl mb-2 block">📅</span>
              <p className="text-stone text-sm">No events this month</p>
            </div>
          ) : (
            groupedEventsList.map(([dateStr, dayEvents]) => {
              const eventDate = parseISO(dateStr)
              return (
                <div key={dateStr} id={`date-${dateStr}`}>
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`rounded-xl px-3 py-2 ${
                        isToday(eventDate)
                          ? 'bg-gradient-to-br from-brick to-brick-600 text-white'
                          : 'bg-sand'
                      }`}
                    >
                      <div className={`text-xs uppercase font-medium ${isToday(eventDate) ? 'text-white/80' : 'text-stone'}`}>
                        {format(eventDate, 'EEE')}
                      </div>
                      <div className={`text-lg font-bold ${isToday(eventDate) ? 'text-white' : 'text-gray-900'}`}>
                        {format(eventDate, 'd')}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="h-px bg-gradient-to-r from-gray-200 to-transparent" />
                      <p className="text-xs text-stone mt-1">
                        {format(eventDate, 'MMMM yyyy')}
                        {isToday(eventDate) && <span className="ml-2 text-brick font-medium">Today</span>}
                      </p>
                    </div>
                  </div>

                  {/* Event Cards */}
                  <div className="space-y-2 pl-2">
                    {dayEvents.map((event) => (
                      <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                        className="block p-3 bg-white rounded-xl border border-sand hover:border-brick/30 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`w-1 self-stretch rounded-full flex-shrink-0 ${getSectionColor(event.section)}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 line-clamp-2">
                              {event.title}
                            </p>
                            <p className="text-sm text-stone mt-1">
                              {formatEventTime(event.start_datetime)}
                            </p>
                            {event.location_name && (
                              <p className="text-sm text-stone truncate">
                                📍 {event.location_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP VIEW - Full Calendar Grid
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-sand overflow-hidden">
        {/* Calendar Header */}
        <div className="px-6 py-4 border-b border-sand flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="font-display text-xl font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm font-medium text-brick hover:bg-brick/5 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-sand rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="w-5 h-5 text-stone" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-sand rounded-lg transition-colors"
              aria-label="Next month"
            >
              <ChevronRightIcon className="w-5 h-5 text-stone" />
            </button>
          </div>
        </div>

        <div className="flex">
          {/* Calendar Grid */}
          <div className="flex-1 p-4">
            {/* Week day headers */}
            <div className="grid grid-cols-7 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-stone py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const dayEvents = eventsByDate.get(dateKey) || []
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const isTodayDate = isToday(day)

                // Count events by section
                const downtownCount = dayEvents.filter(e => e.section === 'downtown').length
                const libertyCount = dayEvents.filter(e => e.section === 'fort_bragg').length

                return (
                  <button
                    key={dateKey}
                    onClick={() => handleDateClick(day)}
                    className={`
                      relative aspect-square p-1 rounded-lg transition-all text-left
                      ${isCurrentMonth ? 'hover:bg-sand' : 'opacity-40'}
                      ${isSelected ? 'bg-brick text-white hover:bg-brick-600' : ''}
                      ${isTodayDate && !isSelected ? 'ring-2 ring-brick ring-inset' : ''}
                    `}
                  >
                    <span
                      className={`
                        text-sm font-medium
                        ${isSelected ? 'text-white' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                      `}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Event indicators */}
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-0.5">
                        {downtownCount > 0 && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-white/80' : 'bg-brick'
                            }`}
                            title={`${downtownCount} downtown event${downtownCount > 1 ? 's' : ''}`}
                          />
                        )}
                        {libertyCount > 0 && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-white/80' : 'bg-liberty'
                            }`}
                            title={`${libertyCount} Fort Liberty event${libertyCount > 1 ? 's' : ''}`}
                          />
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-sand">
              <div className="flex items-center gap-1.5 text-xs text-stone">
                <span className="w-2 h-2 rounded-full bg-brick" />
                Downtown
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone">
                <span className="w-2 h-2 rounded-full bg-liberty" />
                Fort Liberty
              </div>
            </div>
          </div>

          {/* Selected Date Events Panel */}
          <div className="w-80 border-l border-sand bg-dogwood-50/50 p-4 max-h-[500px] overflow-y-auto">
            {selectedDate ? (
              <>
                <h3 className="font-semibold text-gray-900 mb-3">
                  {isToday(selectedDate)
                    ? 'Today'
                    : format(selectedDate, 'EEEE, MMM d')}
                </h3>

                {selectedDateEvents.length === 0 ? (
                  <p className="text-sm text-stone">No events on this day</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDateEvents.map((event) => (
                        <Link
                          key={event.id}
                          to={`/events/${event.id}`}
                          className="block p-3 bg-white rounded-lg border border-sand hover:border-brick/30 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`w-1 h-full min-h-[40px] rounded-full flex-shrink-0 ${
                                event.section === 'downtown' ? 'bg-brick' : 'bg-liberty'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                {event.title}
                              </p>
                              <p className="text-xs text-stone mt-1">
                                {formatEventTime(event.start_datetime)}
                                {event.location_name && (
                                  <> · {event.location_name}</>
                                )}
                              </p>
                            </div>
                          </div>
                        </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <span className="text-3xl mb-2 block">📅</span>
                <p className="text-sm text-stone">
                  Select a date to see events
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
