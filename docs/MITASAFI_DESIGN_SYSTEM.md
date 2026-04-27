# Mitasafi Design System

**Version:** 1.0  
**Date:** December 30, 2025  
**Status:** Approved

---

## 1. Design Philosophy

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Clarity over cleverness** | Users understand instantly, no guessing |
| **Breathing room** | White space is a feature, not waste |
| **One focus per screen** | What's the ONE thing user should do? |
| **Progressive disclosure** | Show only what's needed now |
| **Consistency** | Same patterns everywhere = less cognitive load |

### The 10 Commandments of Mitasafi UI

1. **ONE FOCUS** → Every screen has ONE primary purpose
2. **BREATHE** → White space is mandatory, not optional
3. **HIERARCHY** → Size and weight guide the eye
4. **CONSISTENCY** → Same patterns across all screens
5. **MOBILE-FIRST** → Design for phones, enhance for desktop
6. **HIDE COMPLEXITY** → Progressive disclosure always
7. **LIMIT CHOICES** → Max 5-7 items in any list/menu
8. **GUIDE USERS** → Empty states, loading, errors all helpful
9. **SUBTLE MOTION** → Animations felt, not noticed
10. **ACCESSIBILITY** → Everyone can use Mitasafi

---

## 2. Color System

### Brand Colors

```
MITASAFI COLOR PALETTE
═══════════════════════════════════════════════════════════════

PRIMARY (Brand - Teal)
├── Teal 600      #0D9488    Main brand, headers, links
├── Teal 700      #0F766E    Hover state, darker accent
├── Teal 500      #14B8A6    Lighter accent, focus rings
└── Teal 50       #F0FDFA    Subtle teal background

SECONDARY (Actions/CTAs - Orange)
├── Orange 600    #EA580C    Primary buttons, main CTAs
├── Orange 700    #C2410C    Button hover state
├── Orange 500    #F97316    Secondary actions
└── Orange 50     #FFF7ED    Subtle orange background

SUCCESS (Positive/Money - Emerald)
├── Emerald 600   #059669    Success messages, verified badges
├── Emerald 700   #047857    Success hover
├── Emerald 500   #10B981    Lighter success
└── Emerald 50    #ECFDF5    Success background

WARNING (Attention - Amber)
├── Amber 600     #D97706    Warning messages
├── Amber 700     #B45309    Warning hover
├── Amber 500     #F59E0B    Lighter warning
└── Amber 50      #FFFBEB    Warning background

ERROR (Alert - Red)
├── Red 600       #DC2626    Error messages, destructive actions
├── Red 700       #B91C1C    Error hover
├── Red 500       #EF4444    Lighter error
└── Red 50        #FEF2F2    Error background

NEUTRAL (Text & Backgrounds - Gray)
├── Gray 900      #111827    Headings, footer background
├── Gray 800      #1F2937    Primary body text
├── Gray 600      #4B5563    Secondary text
├── Gray 500      #6B7280    Tertiary text, placeholders
├── Gray 400      #9CA3AF    Disabled text
├── Gray 300      #D1D5DB    Borders hover
├── Gray 200      #E5E7EB    Borders default
├── Gray 100      #F3F4F6    Dividers, subtle backgrounds
├── Gray 50       #F9FAFB    Page background
└── White         #FFFFFF    Cards, content areas

═══════════════════════════════════════════════════════════════
```

### Color Usage Guidelines

| Use Case | Color | Hex Code |
|----------|-------|----------|
| Brand headers/navigation | Teal 600 | #0D9488 |
| Primary CTA buttons | Orange 600 | #EA580C |
| Links | Teal 600 | #0D9488 |
| Verified badges | Emerald 600 | #059669 |
| Price display | Teal 600 | #0D9488 |
| Body text | Gray 800 | #1F2937 |
| Secondary text | Gray 500 | #6B7280 |
| Page background | Gray 50 | #F9FAFB |
| Card background | White | #FFFFFF |
| Footer background | Gray 900 | #111827 |
| Borders | Gray 200 | #E5E7EB |
| Focus rings | Teal 500 | #14B8A6 |

### Accessibility Contrast

| Combination | Contrast Ratio | WCAG Rating |
|-------------|----------------|-------------|
| Teal 600 on White | 4.52:1 | AA ✅ |
| Orange 600 on White | 4.35:1 | AA ✅ |
| Gray 800 on Gray 50 | 12.6:1 | AAA ✅ |
| White on Teal 600 | 4.52:1 | AA ✅ |
| White on Orange 600 | 4.35:1 | AA ✅ |

---

## 3. Typography

### Font Family

**Primary Font:** Plus Jakarta Sans (Google Fonts)

| Attribute | Description |
|-----------|-------------|
| Style | Modern, geometric sans-serif |
| Readability | Excellent on screens at all sizes |
| Weights Used | 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold) |
| Character Set | Full Latin, extended language support |
| License | Open Font License (free) |

**Why Plus Jakarta Sans:**
- Perfect balance of trust + warmth (not cold like Inter, not too casual)
- Excellent number display for prices (KES 55,000)
- Modern tech feel without being generic
- Great hierarchy with bold headings and regular body
- Optimized for mobile screens
- Less overused than Inter, more distinctive

```css
/* Font Stack */
font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 
             'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
```

### Type Scale

| Name | Size | Weight | Line Height | Letter Spacing | Use Case |
|------|------|--------|-------------|----------------|----------|
| Display | 48px / 3rem | Bold (700) | 1.1 | -0.02em | Hero headlines |
| H1 | 36px / 2.25rem | Bold (700) | 1.2 | -0.01em | Page titles |
| H2 | 30px / 1.875rem | Semibold (600) | 1.3 | 0 | Section headers |
| H3 | 24px / 1.5rem | Semibold (600) | 1.4 | 0 | Card titles, subsections |
| H4 | 20px / 1.25rem | Medium (500) | 1.4 | 0 | List headers |
| Body Large | 18px / 1.125rem | Regular (400) | 1.6 | 0 | Important paragraphs |
| Body | 16px / 1rem | Regular (400) | 1.6 | 0 | Default text |
| Body Small | 14px / 0.875rem | Regular (400) | 1.5 | 0 | Secondary info |
| Caption | 12px / 0.75rem | Medium (500) | 1.4 | 0.01em | Labels, metadata |
| Price | 24px+ | Bold (700) | 1.2 | 0 | Money display (Teal 600) |

### Responsive Type Scale

```css
/* Mobile (default) */
--font-display: 32px;
--font-h1: 28px;
--font-h2: 24px;
--font-h3: 20px;

/* Tablet (640px+) */
@media (min-width: 640px) {
  --font-display: 40px;
  --font-h1: 32px;
  --font-h2: 28px;
  --font-h3: 22px;
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  --font-display: 48px;
  --font-h1: 36px;
  --font-h2: 30px;
  --font-h3: 24px;
}
```

### Typography Rules

| Rule | Implementation |
|------|----------------|
| Max font weights per page | 2 (Regular + Bold or Semibold) |
| Max sizes per page | 3-4 (Headline, body, caption) |
| Optimal line length | 50-75 characters |
| Paragraph spacing | 1.5× line height between paragraphs |
| Minimum body size | 16px (prevents iOS zoom on inputs) |
| No walls of text | Break into digestible chunks |

### Font Loading

```html
<!-- Preload for performance -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```css
/* Font display strategy */
font-display: swap;  /* Show fallback immediately, swap when loaded */
```

---

## 4. Spacing System

Based on 8px grid for visual harmony.

### Spacing Scale

| Token | Size | Rem | Use Case |
|-------|------|-----|----------|
| xs | 4px | 0.25rem | Tight gaps (icon to text) |
| sm | 8px | 0.5rem | Small gaps |
| md | 16px | 1rem | Default spacing |
| lg | 24px | 1.5rem | Section gaps |
| xl | 32px | 2rem | Major sections |
| 2xl | 48px | 3rem | Page sections |
| 3xl | 64px | 4rem | Hero spacing |
| 4xl | 96px | 6rem | Major page breaks |

### Padding Standards

| Component | Padding |
|-----------|---------|
| Buttons | 12px 24px (sm: 8px 16px, lg: 16px 32px) |
| Cards | 16px all sides |
| Form inputs | 12px 16px |
| Sections | 48px vertical |
| Container | 16px horizontal (mobile), 24px (tablet+) |

---

## 5. Layout System

### Container Widths

| Container | Max Width | Use Case |
|-----------|-----------|----------|
| Full | 100% | Header, hero backgrounds |
| Wide | 1280px | Main content container |
| Default | 1024px | Standard content |
| Narrow | 768px | Text content, forms |
| Tight | 512px | Auth pages, narrow forms |

### Breakpoints

| Name | Width | Columns | Description |
|------|-------|---------|-------------|
| Mobile | 320px - 639px | 1 | Stacked layout |
| Tablet | 640px - 1023px | 2 | Adjusted layout |
| Desktop | 1024px - 1279px | 3-4 | Full layout |
| Wide | 1280px+ | 3-4 | Max container, centered |

### Grid System

```
PROPERTY GRID BEHAVIOR
─────────────────────────────────────────────────────────────

Mobile (< 640px):   1 column, full width cards
Tablet (640-1023):  2 columns, 16px gap
Desktop (1024px+):  3 columns, 24px gap
Wide (1280px+):     3-4 columns, 24px gap, max-width container
```

---

## 6. Component Specifications

### Buttons

#### Primary Button (CTA)
```
Background:   Orange 600 (#EA580C)
Text:         White (#FFFFFF)
Padding:      12px 24px
Border:       None
Radius:       8px
Font:         16px, Semibold
Hover:        Orange 700 (#C2410C)
Active:       Scale 0.98
Disabled:     50% opacity
```

#### Secondary Button
```
Background:   White (#FFFFFF)
Text:         Teal 600 (#0D9488)
Padding:      12px 24px
Border:       1px solid Teal 600
Radius:       8px
Font:         16px, Semibold
Hover:        Teal 50 background (#F0FDFA)
```

#### Ghost Button
```
Background:   Transparent
Text:         Gray 600 (#4B5563)
Padding:      12px 24px
Border:       None
Radius:       8px
Font:         16px, Medium
Hover:        Gray 100 background (#F3F4F6)
```

### Form Inputs

```
Background:   White (#FFFFFF)
Border:       1px solid Gray 200 (#E5E7EB)
Radius:       8px
Padding:      12px 16px
Font:         16px, Regular
Text:         Gray 800 (#1F2937)
Placeholder:  Gray 400 (#9CA3AF)

Focus:
  Border:     Teal 500 (#14B8A6)
  Ring:       2px Teal 500 with 50% opacity

Error:
  Border:     Red 500 (#EF4444)
  Message:    Red 600, 14px, below input

Disabled:
  Background: Gray 100 (#F3F4F6)
  Text:       Gray 400 (#9CA3AF)
```

### Cards

```
PROPERTY CARD
─────────────────────────────────────────────────────────────
Background:     White (#FFFFFF)
Border:         1px solid Gray 200 (#E5E7EB)
Radius:         12px
Shadow:         0 1px 3px rgba(0,0,0,0.1)
Padding:        0 (image bleeds to edge)
Content:        16px padding

Hover:
  Shadow:       0 4px 12px rgba(0,0,0,0.15)
  Transform:    translateY(-2px)
  Transition:   200ms ease

Image:
  Aspect ratio: 16:9 or 4:3
  Border radius: 12px 12px 0 0 (top only)
```

### Badges

| Type | Background | Text | Border |
|------|------------|------|--------|
| Verified | Emerald 50 | Emerald 700 | None |
| Pending | Amber 50 | Amber 700 | None |
| Unavailable | Red 50 | Red 700 | None |
| Premium | Teal 50 | Teal 700 | None |
| Default | Gray 100 | Gray 700 | None |

```
Padding:      4px 8px
Radius:       4px
Font:         12px, Medium
```

### Navigation

#### Desktop Header
```
Background:   Teal 600 (#0D9488)
Text:         White (#FFFFFF)
Height:       64px
Logo:         Left aligned
Nav items:    Center (max 4 items)
Actions:      Right aligned (Login, Sign Up)
```

#### Mobile Header
```
Background:   Teal 600 (#0D9488)
Text:         White (#FFFFFF)
Height:       56px
Logo:         Left aligned
Menu:         Hamburger icon, right aligned
```

---

## 7. UI Patterns

### Progressive Disclosure

Show only essential filters initially, expand for advanced options.

```
SEARCH FILTERS
─────────────────────────────────────────────────────────────

Default view (3-4 filters):
┌────────────────────────────────────────────────────────────┐
│ 📍 Location     💰 Budget      🛏️ Bedrooms    [+ Filters] │
│ [Westlands ▼]   [20k-50k ▼]    [2+ ▼]         (12 more)   │
└────────────────────────────────────────────────────────────┘

Expanded view:
- Property type
- Amenities (multi-select)
- Availability date
- Verified only toggle
- Pet-friendly toggle
```

### One Primary Action Rule

Each section should have ONE clear primary action.

```
PROPERTY CARD ACTIONS
─────────────────────────────────────────────────────────────

Primary (Orange button):
  [Contact Landlord]

Secondary (Icon + text, subtle):
  ♡ Save   ↗ Share   ⚖ Compare
```

### Empty States

Always provide helpful context and actions.

```
EMPTY STATE TEMPLATE
─────────────────────────────────────────────────────────────

Components:
1. Illustration or icon (subtle, on-brand)
2. Headline (what's missing)
3. Description (why, context)
4. Actions (what user can do)

Example:
  🏠 [Icon]
  "No properties in Muthaiga yet"
  "We're expanding there soon!"
  [Parklands] [Westlands] [Runda]   ← Alternative areas
  [Get notified when available]     ← CTA
```

### Loading States

Use skeleton loaders, not spinners.

```
SKELETON LOADER
─────────────────────────────────────────────────────────────

Card skeleton:
┌────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← Image placeholder
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │    (animate shimmer)
├────────────────────────────────────────┤
│ ░░░░░░░░░░░░░░░░                       │  ← Title
│ ░░░░░░░░░░░░░░░░░░░░░░                 │  ← Description
│ ░░░░░░░░░░                             │  ← Price
└────────────────────────────────────────┘

Animation:
  Background gradient shimmer
  Duration: 1.5s
  Direction: left to right
  Loop: infinite
```

---

## 8. Micro-Interactions

### Transition Durations

| Type | Duration | Easing |
|------|----------|--------|
| Hover states | 150ms | ease |
| Button press | 100ms | ease-out |
| Card lift | 200ms | ease |
| Modal appear | 200ms | ease-out |
| Page fade | 150ms | ease |
| Focus ring | 150ms | ease |

### Interaction Details

| Element | Interaction | Specification |
|---------|-------------|---------------|
| Buttons | Press | scale(0.98) |
| Cards | Hover | translateY(-2px), shadow increase |
| Links | Hover | Color darken 10% |
| Inputs | Focus | Border color + ring |
| Checkboxes | Check | Checkmark draw animation |
| Modals | Open | Fade in + slide up 8px |
| Toasts | Appear | Slide in from right |

**Rule:** Animations should be felt, not noticed. Max 300ms for any transition.

---

## 9. Iconography

### Icon System

**Library:** Lucide React (consistent, clean, MIT license)

### Icon Sizes

| Size | Pixels | Use Case |
|------|--------|----------|
| xs | 16px | Inline with small text |
| sm | 20px | Buttons, form elements |
| md | 24px | Default, navigation |
| lg | 32px | Feature highlights |
| xl | 48px | Empty states, heroes |

### Icon Colors

| Context | Color |
|---------|-------|
| Default | Gray 500 (#6B7280) |
| Active/Selected | Teal 600 (#0D9488) |
| On dark background | White |
| Success | Emerald 600 (#059669) |
| Warning | Amber 600 (#D97706) |
| Error | Red 600 (#DC2626) |

---

## 10. Shadows & Elevation

### Shadow Scale

| Level | Shadow | Use Case |
|-------|--------|----------|
| None | none | Flat elements |
| sm | 0 1px 2px rgba(0,0,0,0.05) | Subtle depth |
| Default | 0 1px 3px rgba(0,0,0,0.1) | Cards at rest |
| md | 0 4px 6px rgba(0,0,0,0.1) | Dropdowns, popovers |
| lg | 0 10px 15px rgba(0,0,0,0.1) | Modals, dialogs |
| xl | 0 20px 25px rgba(0,0,0,0.15) | Large overlays |

### Elevation Usage

| Z-Index | Element |
|---------|---------|
| 0 | Base content |
| 10 | Sticky elements |
| 20 | Dropdowns |
| 30 | Fixed navigation |
| 40 | Modals |
| 50 | Toasts, notifications |

---

## 11. Border Radius

### Radius Scale

| Token | Size | Use Case |
|-------|------|----------|
| none | 0 | Sharp corners |
| sm | 4px | Badges, small elements |
| md | 8px | Buttons, inputs |
| lg | 12px | Cards |
| xl | 16px | Large cards, modals |
| full | 9999px | Pills, avatars |

---

## 12. Responsive Design

### Mobile-First Approach

Design for mobile first, then enhance for larger screens.

### Responsive Patterns

| Pattern | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Navigation | Hamburger menu | Hamburger or tabs | Full nav bar |
| Cards grid | 1 column | 2 columns | 3-4 columns |
| Filters | Bottom sheet | Side panel | Inline |
| Forms | Full width | 75% width | 50% width (max 512px) |
| Modals | Full screen | Centered, 90% width | Centered, max 640px |
| Tables | Card view | Horizontal scroll | Full table |

### Touch Targets

Minimum touch target size: **44px × 44px** (Apple HIG / WCAG)

---

## 13. Accessibility

### Requirements

| Standard | Requirement |
|----------|-------------|
| Color contrast | 4.5:1 minimum for text |
| Focus visible | Clear focus indicators on all interactive elements |
| Keyboard nav | All functions accessible via keyboard |
| Screen readers | Proper ARIA labels and semantic HTML |
| Motion | Respect prefers-reduced-motion |

### Implementation Checklist

- [ ] All images have alt text
- [ ] Form inputs have associated labels
- [ ] Links are descriptive (not "click here")
- [ ] Color is not the only indicator
- [ ] Error messages are announced to screen readers
- [ ] Skip link available for main content
- [ ] Heading hierarchy is logical (H1 → H2 → H3)
- [ ] Focus order is logical
- [ ] Touch targets are 44px minimum

---

## 14. Design Tokens (Tailwind Config)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        action: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'card': '12px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.15)',
      },
    },
  },
}
```

---

## 15. Page-Specific Guidelines

### Homepage

- Hero with clear value proposition
- Search bar prominent and centered
- Featured properties (max 6)
- Trust indicators (user count, verified badge explanation)
- How it works (3 steps max)

### Search Results

- Filters accessible but not overwhelming
- Map optional toggle
- Grid view default
- Infinite scroll or pagination
- Sort options (3-4 max)

### Property Detail

- Image gallery (swipeable on mobile)
- Key info immediately visible (price, beds, location)
- Contact CTA sticky on mobile
- Description collapsible if long
- Similar properties at bottom

### Dashboard

- Overview stats at top
- Recent activity feed
- Quick actions prominent
- Navigation clear (sidebar on desktop, bottom nav on mobile)

---

## 16. Quality Checklist

### Before Each Screen Launch

- [ ] One clear purpose - Can describe the page in 5 words
- [ ] One primary CTA - What should user do?
- [ ] Visual hierarchy - Squint test shows structure
- [ ] Adequate white space - Nothing feels cramped
- [ ] Readable text - 16px minimum body, proper contrast
- [ ] Mobile-first - Designed for mobile, enhanced for desktop
- [ ] Loading states - Skeleton loaders in place
- [ ] Empty states - Helpful, with actions
- [ ] Error states - Clear, with recovery path
- [ ] Accessibility - Keyboard navigable, screen reader friendly

---

**Document Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 30, 2025 | Team | Initial Design System |
| 1.1 | Dec 30, 2025 | Team | Added Typography section (Plus Jakarta Sans) |

---

*This design system is the source of truth for all Mitasafi UI development.*
