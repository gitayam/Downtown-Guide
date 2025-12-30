# Mobile-First Content-Driven UI Design

Key insight: **Show value immediately, hide chrome.** Mobile UI anti-patterns kill conversion.

---

## Common Anti-Patterns & Fixes

### 1. Vertical Tab Columns

**Problem:**
- Takes 25%+ screen width for navigation
- User must scroll past navigation to see content
- Each tab click adds cognitive load

**Fix:** Horizontal scrollable tabs at top
```tsx
<div className="flex overflow-x-auto scrollbar-hide gap-1 py-2">
  {tabs.map(tab => (
    <button className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap shrink-0">
      {tab.icon} {tab.label}
    </button>
  ))}
</div>
```

---

### 2. Empty Categories Visible

**Problem:**
- "Art Exhibitions (0)" wastes space and looks empty
- User taps, sees nothing, loses trust

**Fix:** Dynamic tabs that hide empty categories
```tsx
const getAvailableTabs = () => {
  const tabs = [{ id: 'upcoming', label: 'Upcoming', icon: '🔥' }]
  if (workshops.length > 0) tabs.push({ id: 'workshops', label: 'Workshops', icon: '🎨' })
  if (exhibitions.length > 0) tabs.push({ id: 'exhibitions', label: 'Exhibitions', icon: '🖼️' })
  return tabs
}
```

---

### 3. Calendar/Filters as Default View

**Problem:**
- User opens page, sees a calendar widget, no content
- Must interact before seeing any value

**Fix:** Content-first, calendar as toggle
```tsx
const [activeTab, setActiveTab] = useState('upcoming')  // NOT 'calendar'
const [showCalendar, setShowCalendar] = useState(false)  // Hidden by default

// Calendar is small icon button, not main tab
<button onClick={() => setShowCalendar(!showCalendar)}>📅</button>
```

---

### 4. Too Many Filters Upfront

**Problem:**
- Week/Month/Day/Agenda + Category filters = analysis paralysis
- User doesn't know what to click first

**Fix:** Progressive disclosure - show content first
```tsx
// Show events grouped by time (smart default filtering)
{todayEvents.length > 0 && <Section label="🔥 TODAY">{todayEvents}</Section>}
{tomorrowEvents.length > 0 && <Section label="⚡ TOMORROW">{tomorrowEvents}</Section>}
{thisWeekEvents.length > 0 && <Section label="📅 THIS WEEK">{thisWeekEvents}</Section>}
```

---

### 5. Large Cards with Too Much Info

**Problem:**
- Full description, instructor bio, location details visible
- User must scroll through each card

**Fix:** Compact cards with essential info only
```tsx
// Compact event card: 80px height, essential info only
<div className="flex gap-3 p-3">
  <div className="w-12 flex flex-col items-center">  {/* Date badge */}
    <span className="text-xs">Mon</span>
    <span className="text-xl font-bold">15</span>
  </div>
  <div className="flex-1 min-w-0">
    <h3 className="font-semibold line-clamp-1">{event.title}</h3>
    <p className="text-xs text-gray-500 line-clamp-1">{event.description}</p>
    <div className="flex justify-between">
      <span>🕐 {eventTime}</span>
      <span className="font-bold">${event.price}</span>
    </div>
  </div>
</div>
```

---

## Core Design Principles

### 1. Content Above the Fold
- First screen shows actual content, not navigation/filters
- User sees value in < 1 second

### 2. Time-Based Grouping
- TODAY > TOMORROW > THIS WEEK > COMING UP
- Natural mental model, no learning curve

### 3. Touch-Friendly Targets
- Minimum 44px tap targets
- Cards are tappable, not just buttons inside cards

---

## Preventing Horizontal Overflow

One of the most common mobile bugs is horizontal overflow causing unexpected scrolling.

### Root Causes

1. **CSS `overflow-x: clip`** - Use `overflow-x: hidden` instead (iOS Safari issues)
2. **Negative Margins** - `-mx-3 px-3` patterns can overflow on iOS
3. **Grid Layouts** - Two-column grids on phones < 375px can overflow
4. **Fixed-Width Elements** - `w-64`, `min-w-[300px]` can exceed viewport
5. **Tables** - Default to content-width, ignoring viewport

### Multi-Layer Fix

**Layer 1: Global CSS Reset**
```css
@media (max-width: 640px) {
  html, body, #root {
    overflow-x: hidden !important;
    max-width: 100vw !important;
    width: 100% !important;
  }

  main, section, article, div, form, table {
    max-width: 100vw;
  }

  table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  p, span, td, th, label {
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
}
```

**Layer 2: Layout Component**
```tsx
<main className="flex-1 min-w-0 overflow-x-hidden">
  <div className="p-4 max-w-[1600px] mx-auto w-full">
    {children}
  </div>
</main>
```
Key: `min-w-0` prevents flex children from expanding beyond parent.

**Layer 3: Scrollable Children (iOS Safari)**
```tsx
<div
  className="flex gap-2 scrollbar-hide"
  style={{
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollSnapType: 'x mandatory'
  }}
>
  {items.map(item => (
    <button className="shrink-0" style={{ scrollSnapAlign: 'start' }}>
      {item.label}
    </button>
  ))}
</div>
```

---

## Mobile List vs Grid Layout

**Problem:** Two-column grids on mobile are cramped and hard to tap.

**Solution:** Single-column list on phones, grid on tablets+.

```tsx
{/* Mobile: Single column list */}
<div className="flex flex-col gap-2 sm:hidden">
  {items.map(item => (
    <button className="flex items-center gap-3 p-2 bg-white rounded-xl">
      <img src={item.image} className="w-16 h-16 rounded-lg" />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate">{item.name}</h3>
        <span className="text-lg font-bold">${item.price}</span>
      </div>
    </button>
  ))}
</div>

{/* Tablet+: Grid view */}
<div className="hidden sm:grid sm:grid-cols-3 md:grid-cols-4 gap-2">
  {/* Grid cards */}
</div>
```

---

## Toast Notifications for Mobile Feedback

Actions need immediate visual feedback since UI changes may be off-screen.

```tsx
const [toast, setToast] = useState<{message: string; show: boolean}>({
  message: '', show: false
})

const showToast = (message: string) => {
  setToast({message, show: true})
  setTimeout(() => setToast({message: '', show: false}), 2000)
}

// Toast component - fixed position, above mobile nav
{toast.show && (
  <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] animate-slide-up lg:hidden">
    <div className="bg-gray-800 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2">
      <Check className="h-4 w-4 text-green-400" />
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  </div>
)}
```

---

## Testing Checklist

Before deploying mobile UI changes:

- [ ] Test on real iOS device (emulators miss CORS and scrolling bugs)
- [ ] Check for horizontal scroll by swiping left/right
- [ ] Verify all tap targets are >= 44px
- [ ] Test category/tab scrolling works horizontally
- [ ] Confirm images load (iOS Safari CORS issues)
- [ ] Check toast/feedback appears after actions
