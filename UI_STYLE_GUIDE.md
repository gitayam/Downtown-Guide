# Fayetteville Central Calendar - UI Style Guide

A design system inspired by Fayetteville, NC's rich heritage: dogwood blossoms, historic downtown brick, military tradition, and Cape Fear River greenery.

---

## Brand Identity

### The Fayetteville Story

Fayetteville is a city where:
- **Dogwood blooms** paint the spring landscape pink and white
- **Historic downtown** brick buildings tell centuries of stories
- **Fort Liberty** (formerly Bragg) represents military excellence
- **Cape Fear River** and lush parks provide natural beauty

Our design captures this blend of **heritage, nature, and community spirit**.

---

## Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Dogwood Pink** | `#E8A4B8` | 232, 164, 184 | Accents, CTAs, highlights |
| **Downtown Brick** | `#A65D57` | 166, 93, 87 | Headers, primary actions |
| **Cape Fear Green** | `#2D5A47` | 45, 90, 71 | Success states, nature events |
| **Liberty Blue** | `#1E3A5F` | 30, 58, 95 | Fort Liberty section, trust |

### Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Dogwood White** | `#FDF8F5` | 253, 248, 245 | Backgrounds, cards |
| **Warm Sand** | `#F5E6D3` | 245, 230, 211 | Secondary backgrounds |
| **River Stone** | `#6B7B8A` | 107, 123, 138 | Secondary text, borders |
| **Deep Forest** | `#1A3D2E` | 26, 61, 46 | Dark mode background |

### Section Colors

| Section | Primary | Accent | Badge |
|---------|---------|--------|-------|
| **Downtown** | `#A65D57` (Brick) | `#E8A4B8` (Dogwood) | `bg-brick text-white` |
| **Fort Liberty** | `#1E3A5F` (Blue) | `#4A7C59` (Army Green) | `bg-liberty text-white` |

### Semantic Colors

| State | Color | Hex |
|-------|-------|-----|
| Success | Cape Fear Green | `#2D5A47` |
| Warning | Autumn Gold | `#D4A84B` |
| Error | Alert Red | `#C44536` |
| Info | River Blue | `#4A90A4` |

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Primary
        'dogwood': {
          50: '#FDF8F5',
          100: '#FCF1ED',
          200: '#F8D9E0',
          300: '#F2BDC9',
          400: '#E8A4B8',
          500: '#D47A94',
          600: '#B85A73',
          DEFAULT: '#E8A4B8',
        },
        'brick': {
          50: '#FAF5F4',
          100: '#F2E8E7',
          200: '#E5D1CF',
          300: '#D4B0AC',
          400: '#B98580',
          500: '#A65D57',
          600: '#8B4A45',
          700: '#6E3B38',
          DEFAULT: '#A65D57',
        },
        'capefear': {
          50: '#F0F5F3',
          100: '#E1EBE7',
          200: '#C3D7CF',
          300: '#94B8A8',
          400: '#5E9278',
          500: '#2D5A47',
          600: '#244A3A',
          700: '#1A3D2E',
          DEFAULT: '#2D5A47',
        },
        'liberty': {
          50: '#F2F5F8',
          100: '#E5EBF1',
          200: '#C7D4E3',
          300: '#9DB3CD',
          400: '#6A8AAF',
          500: '#1E3A5F',
          600: '#1A3250',
          700: '#152841',
          DEFAULT: '#1E3A5F',
        },
        // Neutrals
        'sand': '#F5E6D3',
        'stone': '#6B7B8A',
        'forest': '#1A3D2E',
      },
      fontFamily: {
        'display': ['Playfair Display', 'Georgia', 'serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
    },
  },
};
```

---

## Typography

### Font Stack

| Purpose | Font | Fallback |
|---------|------|----------|
| **Display/Headlines** | Playfair Display | Georgia, serif |
| **Body/UI** | Inter | system-ui, sans-serif |
| **Code/Data** | JetBrains Mono | monospace |

### Scale

| Level | Mobile | Desktop | Weight | Use |
|-------|--------|---------|--------|-----|
| **Display** | 2.5rem (40px) | 4rem (64px) | 700 | Hero headlines |
| **H1** | 2rem (32px) | 3rem (48px) | 700 | Page titles |
| **H2** | 1.5rem (24px) | 2rem (32px) | 600 | Section headers |
| **H3** | 1.25rem (20px) | 1.5rem (24px) | 600 | Card titles |
| **Body Large** | 1.125rem (18px) | 1.25rem (20px) | 400 | Lead text |
| **Body** | 1rem (16px) | 1rem (16px) | 400 | Default |
| **Small** | 0.875rem (14px) | 0.875rem (14px) | 400 | Captions, meta |
| **XS** | 0.75rem (12px) | 0.75rem (12px) | 500 | Badges, labels |

### Tailwind Classes

```html
<!-- Display -->
<h1 class="font-display text-4xl md:text-6xl font-bold text-brick">
  Discover Fayetteville
</h1>

<!-- Section Header -->
<h2 class="font-display text-2xl md:text-3xl font-semibold text-forest">
  This Week's Events
</h2>

<!-- Card Title -->
<h3 class="font-body text-lg md:text-xl font-semibold text-gray-900">
  Downtown Art Walk
</h3>

<!-- Body Text -->
<p class="font-body text-base text-stone leading-relaxed">
  Join us for an evening of art...
</p>
```

---

## Components

### Event Cards

#### Standard Card

```html
<article class="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-sand overflow-hidden">
  <!-- Image -->
  <div class="aspect-video relative overflow-hidden">
    <img src="..." alt="..." class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
    <!-- Section Badge -->
    <span class="absolute top-3 left-3 px-2 py-1 text-xs font-medium rounded-full bg-brick text-white">
      Downtown
    </span>
  </div>

  <!-- Content -->
  <div class="p-4 space-y-2">
    <!-- Date -->
    <div class="flex items-center gap-2 text-sm text-stone">
      <svg class="w-4 h-4" />
      <time datetime="2025-01-15">Wed, Jan 15</time>
      <span class="text-dogwood">•</span>
      <span>7:00 PM</span>
    </div>

    <!-- Title -->
    <h3 class="font-body text-lg font-semibold text-gray-900 group-hover:text-brick transition-colors">
      First Friday Art Walk
    </h3>

    <!-- Location -->
    <p class="text-sm text-stone flex items-center gap-1">
      <svg class="w-4 h-4" />
      Downtown Fayetteville
    </p>
  </div>
</article>
```

#### Compact Card (List View)

```html
<article class="flex gap-4 p-3 bg-white rounded-lg hover:bg-sand/50 transition-colors border border-transparent hover:border-dogwood/30">
  <!-- Date Block -->
  <div class="flex-shrink-0 w-14 h-14 bg-brick/10 rounded-lg flex flex-col items-center justify-center">
    <span class="text-xs font-medium text-brick uppercase">Jan</span>
    <span class="text-xl font-bold text-brick">15</span>
  </div>

  <!-- Content -->
  <div class="flex-1 min-w-0">
    <h3 class="font-medium text-gray-900 truncate">First Friday Art Walk</h3>
    <p class="text-sm text-stone">7:00 PM • Downtown Fayetteville</p>
  </div>

  <!-- Arrow -->
  <svg class="w-5 h-5 text-stone self-center" />
</article>
```

### Section Tabs

```html
<nav class="flex gap-1 p-1 bg-sand rounded-lg">
  <!-- Active Tab -->
  <button class="flex-1 px-4 py-2 text-sm font-medium rounded-md bg-white text-brick shadow-sm">
    Downtown
  </button>

  <!-- Inactive Tab -->
  <button class="flex-1 px-4 py-2 text-sm font-medium rounded-md text-stone hover:text-brick hover:bg-white/50 transition-colors">
    Fort Liberty
  </button>

  <button class="flex-1 px-4 py-2 text-sm font-medium rounded-md text-stone hover:text-brick hover:bg-white/50 transition-colors">
    All Events
  </button>
</nav>
```

### Time Group Headers

```html
<!-- Today -->
<div class="flex items-center gap-3 py-4">
  <div class="flex items-center gap-2 px-3 py-1.5 bg-dogwood/20 text-brick rounded-full">
    <span class="text-lg">🔥</span>
    <span class="font-semibold text-sm uppercase tracking-wide">Today</span>
  </div>
  <div class="flex-1 h-px bg-dogwood/30"></div>
</div>

<!-- Tomorrow -->
<div class="flex items-center gap-3 py-4">
  <div class="flex items-center gap-2 px-3 py-1.5 bg-capefear/10 text-capefear rounded-full">
    <span class="text-lg">⚡</span>
    <span class="font-semibold text-sm uppercase tracking-wide">Tomorrow</span>
  </div>
  <div class="flex-1 h-px bg-capefear/20"></div>
</div>

<!-- This Week -->
<div class="flex items-center gap-3 py-4">
  <div class="flex items-center gap-2 px-3 py-1.5 bg-liberty/10 text-liberty rounded-full">
    <span class="text-lg">📅</span>
    <span class="font-semibold text-sm uppercase tracking-wide">This Week</span>
  </div>
  <div class="flex-1 h-px bg-liberty/20"></div>
</div>
```

### Buttons

```html
<!-- Primary (Brick) -->
<button class="px-6 py-3 bg-brick text-white font-medium rounded-lg hover:bg-brick-600 active:bg-brick-700 transition-colors shadow-sm">
  View Events
</button>

<!-- Secondary (Outline) -->
<button class="px-6 py-3 bg-transparent text-brick font-medium rounded-lg border-2 border-brick hover:bg-brick/5 transition-colors">
  Subscribe to Calendar
</button>

<!-- Fort Liberty Variant -->
<button class="px-6 py-3 bg-liberty text-white font-medium rounded-lg hover:bg-liberty-600 active:bg-liberty-700 transition-colors shadow-sm">
  Fort Liberty Events
</button>

<!-- Ghost -->
<button class="px-4 py-2 text-stone hover:text-brick hover:bg-sand rounded-lg transition-colors">
  Learn More
</button>
```

### Section Badges

```html
<!-- Downtown Badge -->
<span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-brick text-white">
  <span>🏙️</span> Downtown
</span>

<!-- Fort Liberty Badge -->
<span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-liberty text-white">
  <span>🎖️</span> Fort Liberty
</span>

<!-- Source Badges -->
<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-dogwood/20 text-brick">
  CVB
</span>

<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-capefear/20 text-capefear">
  ⚾ Segra
</span>
```

### Calendar Subscribe CTA

```html
<div class="bg-gradient-to-r from-brick to-brick-600 rounded-2xl p-6 md:p-8 text-white">
  <div class="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
    <div class="flex-1">
      <h3 class="font-display text-xl md:text-2xl font-semibold mb-2">
        Never Miss an Event
      </h3>
      <p class="text-white/80">
        Subscribe to our calendar and get Fayetteville events synced to your phone.
      </p>
    </div>
    <div class="flex flex-col sm:flex-row gap-3">
      <button class="px-5 py-2.5 bg-white text-brick font-medium rounded-lg hover:bg-dogwood-50 transition-colors">
        📱 Apple Calendar
      </button>
      <button class="px-5 py-2.5 bg-white/20 text-white font-medium rounded-lg hover:bg-white/30 transition-colors border border-white/30">
        📅 Google Calendar
      </button>
    </div>
  </div>
</div>
```

---

## Layout

### Page Structure

```html
<div class="min-h-screen bg-dogwood-50">
  <!-- Header -->
  <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-sand">
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <!-- Logo -->
      <a href="/" class="flex items-center gap-2">
        <span class="text-2xl">🌸</span>
        <span class="font-display text-xl font-semibold text-brick">Fayetteville Events</span>
      </a>

      <!-- Navigation -->
      <nav class="hidden md:flex items-center gap-6">
        <a href="/events" class="text-stone hover:text-brick transition-colors">Events</a>
        <a href="/calendar" class="text-stone hover:text-brick transition-colors">Calendar</a>
        <button class="px-4 py-2 bg-brick text-white rounded-lg text-sm font-medium hover:bg-brick-600">
          Subscribe
        </button>
      </nav>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-6xl mx-auto px-4 py-8">
    <!-- Content here -->
  </main>

  <!-- Footer -->
  <footer class="bg-forest text-white mt-16">
    <div class="max-w-6xl mx-auto px-4 py-12">
      <!-- Footer content -->
    </div>
  </footer>
</div>
```

### Responsive Grid

```html
<!-- Event Grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  <!-- Event cards -->
</div>

<!-- Two Column Layout -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <div class="lg:col-span-2">
    <!-- Main content -->
  </div>
  <aside class="lg:col-span-1">
    <!-- Sidebar -->
  </aside>
</div>
```

### Mobile-First Spacing

| Spacing | Mobile | Desktop | Use |
|---------|--------|---------|-----|
| Section gap | `py-8` | `py-16` | Between sections |
| Card gap | `gap-4` | `gap-6` | Card grids |
| Container padding | `px-4` | `px-6` | Page edges |
| Component padding | `p-4` | `p-6` | Card interiors |

---

## Iconography

### Recommended Icon Set

Use **Heroicons** (outline style) for consistency:

```bash
npm install @heroicons/react
```

### Common Icons

| Purpose | Icon | Class |
|---------|------|-------|
| Calendar | `CalendarIcon` | Event dates |
| Location | `MapPinIcon` | Venue/address |
| Clock | `ClockIcon` | Event time |
| Ticket | `TicketIcon` | Ticketed events |
| External Link | `ArrowTopRightOnSquareIcon` | Event URLs |
| Share | `ShareIcon` | Social sharing |
| Filter | `FunnelIcon` | Filtering |
| Search | `MagnifyingGlassIcon` | Search |
| Menu | `Bars3Icon` | Mobile menu |
| Close | `XMarkIcon` | Close/dismiss |

### Icon Sizing

| Size | Class | Use |
|------|-------|-----|
| XS | `w-4 h-4` | Inline with text |
| SM | `w-5 h-5` | Buttons, badges |
| MD | `w-6 h-6` | Navigation |
| LG | `w-8 h-8` | Feature icons |

---

## Motion & Animation

### Transitions

```css
/* Default transition */
.transition-default {
  transition: all 150ms ease-out;
}

/* Card hover */
.card-hover {
  transition: transform 300ms ease, box-shadow 200ms ease;
}
.card-hover:hover {
  transform: translateY(-2px);
}

/* Button press */
.btn-press:active {
  transform: scale(0.98);
}
```

### Tailwind Utilities

```html
<!-- Smooth color transition -->
<a class="transition-colors duration-150">

<!-- Card lift effect -->
<div class="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">

<!-- Image zoom on hover -->
<img class="group-hover:scale-105 transition-transform duration-300">
```

---

## Dark Mode (Optional)

### Color Mappings

| Light | Dark |
|-------|------|
| `bg-dogwood-50` | `dark:bg-forest` |
| `bg-white` | `dark:bg-forest/95` |
| `text-gray-900` | `dark:text-white` |
| `text-stone` | `dark:text-stone/70` |
| `border-sand` | `dark:border-white/10` |
| `bg-brick` | `dark:bg-brick-400` |

---

## Accessibility

### Requirements

1. **Color Contrast**: All text meets WCAG AA (4.5:1 body, 3:1 large)
2. **Focus States**: Visible focus rings on all interactive elements
3. **Motion**: Respect `prefers-reduced-motion`
4. **Touch Targets**: Minimum 44x44px on mobile

### Focus Ring

```html
<button class="focus:outline-none focus:ring-2 focus:ring-brick focus:ring-offset-2">
  Click me
</button>
```

### Skip Link

```html
<a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brick focus:text-white focus:rounded">
  Skip to main content
</a>
```

---

## Component Examples

### Hero Section

```html
<section class="relative bg-gradient-to-br from-brick via-brick-600 to-forest overflow-hidden">
  <!-- Background Pattern -->
  <div class="absolute inset-0 opacity-10">
    <svg class="w-full h-full" />
  </div>

  <div class="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-white">
    <h1 class="font-display text-4xl md:text-6xl font-bold mb-4">
      What's Happening in<br/>
      <span class="text-dogwood">Fayetteville</span>
    </h1>
    <p class="text-lg md:text-xl text-white/80 max-w-xl mb-8">
      Your central guide to Downtown and Fort Liberty events. Never miss a festival, show, or community gathering.
    </p>

    <!-- Section Quick Links -->
    <div class="flex flex-wrap gap-3">
      <a href="#downtown" class="px-5 py-2.5 bg-white text-brick font-medium rounded-lg hover:bg-dogwood-50 transition-colors">
        🏙️ Downtown Events
      </a>
      <a href="#fortliberty" class="px-5 py-2.5 bg-white/20 text-white font-medium rounded-lg hover:bg-white/30 transition-colors border border-white/30">
        🎖️ Fort Liberty Events
      </a>
    </div>
  </div>
</section>
```

### Event Detail Header

```html
<header class="relative">
  <!-- Hero Image -->
  <div class="aspect-[21/9] md:aspect-[3/1] relative">
    <img src="..." alt="..." class="w-full h-full object-cover" />
    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
  </div>

  <!-- Content Overlay -->
  <div class="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
    <div class="max-w-4xl mx-auto">
      <!-- Badge -->
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-brick mb-4">
        🏙️ Downtown
      </span>

      <!-- Title -->
      <h1 class="font-display text-3xl md:text-5xl font-bold mb-3">
        Dogwood Festival 2025
      </h1>

      <!-- Meta -->
      <div class="flex flex-wrap items-center gap-4 text-white/90">
        <span class="flex items-center gap-2">
          <svg class="w-5 h-5" />
          April 25-27, 2025
        </span>
        <span class="flex items-center gap-2">
          <svg class="w-5 h-5" />
          Festival Park
        </span>
      </div>
    </div>
  </div>
</header>
```

---

## File Organization

```
app/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   └── Tabs.tsx
│   ├── events/
│   │   ├── EventCard.tsx
│   │   ├── EventList.tsx
│   │   ├── EventGrid.tsx
│   │   └── TimeGroupHeader.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Container.tsx
│   └── shared/
│       ├── SectionTabs.tsx
│       └── CalendarCTA.tsx
├── styles/
│   └── globals.css
└── routes/
    ├── _index.tsx
    └── events.$id.tsx
```

---

## Quick Reference

### Brand Colors (Copy-Paste)

```
Dogwood Pink:    #E8A4B8
Downtown Brick:  #A65D57
Cape Fear Green: #2D5A47
Liberty Blue:    #1E3A5F
Dogwood White:   #FDF8F5
Warm Sand:       #F5E6D3
River Stone:     #6B7B8A
Deep Forest:     #1A3D2E
```

### Font CDN Links

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
```

---

*Last updated: December 30, 2025*
