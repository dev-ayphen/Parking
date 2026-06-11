# 🎨 Color & Styling Quick Reference

## Core Brand Colors

```
Primary (Main):      #DC0159  - ParkSwift Pink
Primary Dark:        #A8003F  - Darker Pink (hover states)
Primary Light:       #FFF1F2  - Light Pink (backgrounds)
```

## Where Each Color Is Used

### 🔴 Primary Pink (#DC0159)
- Active navigation items
- Main CTA buttons
- Links and highlights
- Header accents
- Gradient color (left side)
- Focus rings
- Icon backgrounds

### 🔻 Primary Dark (#A8003F)
- Button hover states
- Gradient pairs (with primary)
- Darker emphasis
- Shadow effects

### 💗 Primary Light (#FFF1F2)
- Header backgrounds
- Section backgrounds
- Light theme backgrounds
- Alternate BG color

### 🟦 Indigo Palette (50-900)
- Secondary headers
- Accent elements
- Alternative gradients
- Demo/info sections
- Sidebar user profile
- Coming soon pages

### ✅ Status Colors

**Emerald** - Success / Approved
- Approve buttons
- Success badges
- Check marks

**Amber** - Pending / Warning
- Pending badges
- Warning elements
- Caution states

**Red** - Rejected / Error
- Reject buttons
- Error messages
- Critical states

---

## Gradient Combinations

### Header Gradients
```
from-indigo-50 to-primaryLight    - Soft gradient (headers)
from-indigo-600 to-primary        - Bold gradient (text)
from-neutral-900 to-neutral-800   - Dark gradient (sidebar)
```

### Button Gradients
```
from-primary to-primaryDark       - Primary buttons
from-emerald-500 to-emerald-600   - Approve buttons
from-red-500 to-red-600           - Reject buttons
from-indigo-500 to-indigo-600     - Secondary buttons
```

### Status Gradients
```
from-amber-400 to-amber-500       - Pending (top bar)
from-emerald-400 to-emerald-500   - Approved (top bar)
from-red-400 to-red-500           - Rejected (top bar)
```

---

## Component Color Usage

### Login Page
```
Background:  from-indigo-600 via-primary to-primaryDark
Logo Text:   from-primary to-indigo-600
Button:      from-primary to-primaryDark
Demo Box:    from-indigo-50 to-primaryLight
Focus Ring:  ring-primaryLight
```

### Sidebar
```
Background:  from-neutral-900 to-neutral-800
Active Item: from-primary to-primaryDark
Border:      border-primary (opacity-20)
Logo Box:    from-primary (opacity-100)
User Box:    from-indigo-900 to-primary/20
```

### Dashboard
```
Header:      from-indigo-50 to-primaryLight
Stat Cards:  Specific gradients per stat
Row Hover:   hover:bg-indigo-50
Table Head:  bg-neutral-900
Buttons:     from-primary to-primaryDark
```

### Spaces Page
```
Header:      from-indigo-50 to-primaryLight
Filter Btn:  from-primary to-primaryDark (active)
Space Cards: Status-based colors (amber/emerald/red)
Empty State: from-indigo-50 to-primaryLight
Error Box:   bg-red-50 with red border
```

### Space Card
```
PENDING:     from-amber-50 to-amber-100   + amber border
VERIFIED:    from-emerald-50 to-emerald-100 + emerald border
REJECTED:    from-red-50 to-red-100       + red border
Top Bar:     Status-specific gradient
Owner Box:   bg-white/40 with border
```

---

## Text Colors

### Headers
```
h1, h2:      text-gray-900 (or gradient text)
h3, h4:      text-gray-900 or text-primary
Labels:      text-gray-700 or text-gray-600
```

### Body Text
```
Primary:     text-gray-900
Secondary:   text-gray-700
Tertiary:    text-gray-600
Muted:       text-gray-500
```

### Status Text
```
Approved:    text-emerald-800
Pending:     text-amber-800
Rejected:    text-red-800
Brand:       text-primary
```

---

## Border & Outline Colors

### Borders
```
Default:     border-gray-200 or border-gray-300
Primary:     border-primary
Indigo:      border-indigo-200 or border-indigo-300
Status:      Matches status color (amber/emerald/red)
Dashed:      border-dashed border-indigo-300
```

### Focus Rings
```
Default:     focus:ring-2 focus:ring-primaryLight
Borders:     focus:border-primary
Text Input:  focus:ring-primaryLight focus:border-primary
```

---

## Shadow & Elevation

### Shadow Levels
```
shadow:      0 1px 3px rgba(0,0,0,0.1)
shadow-md:   Medium depth
shadow-lg:   Strong depth
shadow-xl:   Deep depth
shadow-2xl:  Maximum depth (hover state)

Primary Shadow:  shadow-primary/50  (pink glow)
```

### Elevation
```
Cards:           shadow-md
Hover Cards:     shadow-lg (on hover)
Buttons:         shadow-lg (on hover)
Modals:          shadow-xl or shadow-2xl
Active Nav:      shadow-lg shadow-primary/50
```

---

## Spacing Guidelines

### Padding
```
Small:   px-4 py-2
Medium:  px-4 py-3 or px-6 py-3
Large:   px-6 py-4 or px-8 py-6
Page:    p-6 or p-8
```

### Gaps
```
Small:   gap-2 or gap-3
Medium:  gap-4
Large:   gap-6
```

### Margins
```
mt-1:    0.25rem
mt-2:    0.5rem
mt-4:    1rem
mt-6:    1.5rem
mt-8:    2rem
space-y-6:  6 items with 1.5rem gap
space-y-8:  8 items with 2rem gap
```

---

## Border Radius

```
rounded-lg:   0.5rem (buttons, inputs)
rounded-xl:   0.75rem (cards, containers)
rounded-2xl:  1rem (large containers, modals)
rounded-3xl:  1.5rem (very large elements)
rounded-full: 50% (circles, avatars)
```

---

## Opacity Values

```
opacity-10:   10% visible (backgrounds)
opacity-20:   20% visible (borders, accents)
opacity-50:   50% visible (disabled, secondary)
opacity-100:  100% visible (normal)
```

---

## Quick Color Swatches

### Primary Brand Color
```
■ #DC0159  Primary Pink      - Main brand color
■ #A8003F  Primary Dark      - Hover/press states
■ #FFF1F2  Primary Light     - Backgrounds
```

### Indigo Palette (Sample)
```
■ #F0F4FF  Indigo 50         - Very light
■ #6366F1  Indigo 500        - Medium
■ #4F46E5  Indigo 600        - Dark
■ #312E81  Indigo 900        - Very dark
```

### Status Colors
```
■ #10B981  Emerald (Success)
■ #F59E0B  Amber (Warning)
■ #EF4444  Red (Error)
■ #06B6D4  Cyan (Info)
```

### Grayscale
```
■ #F8FAFC  Neutral 50
■ #1E293B  Neutral 800
■ #0F172A  Neutral 900
```

---

## Animation Timing

```
200ms:  Standard interactions (most transitions)
300ms:  Color changes, complex animations
400ms:  Large movements
```

## Transition Effects

```
transition-all              - Smooth all changes
transition-colors           - Just color changes
transition-transform        - Just movement/scale
duration-200                - 200ms timing
duration-300                - 300ms timing
```

---

## Hover Effects

### Scale Animation
```
hover:scale-105             - Zoom 5% on hover
active:scale-95             - Shrink 5% on press
```

### Color Changes
```
hover:text-primary          - Text color change
hover:bg-gray-50            - Background change
hover:border-primary        - Border color change
```

### Elevation
```
hover:shadow-lg             - Shadow increase
hover:-translate-y-1        - Lift animation
```

---

## Dark Theme Elements

```
Sidebar:         bg-neutral-900 to neutral-800
Table Header:    bg-neutral-900
Dark Borders:    border-neutral-800
Dark Dividers:   divide-gray-200
```

---

## Summary Table

| Element | Color | Example |
|---------|-------|---------|
| Primary Button | `#DC0159` → `#A8003F` | Gradien button |
| Active Nav | `#DC0159` → `#A8003F` | Sidebar item |
| Success Badge | `#10B981` | ✅ Approved |
| Pending Badge | `#F59E0B` | ⏳ Pending |
| Reject Button | `#EF4444` | ❌ Reject |
| Headers | Gradient | Multiple colors |
| Text | `#1E293B` | Readable text |
| Borders | `#E2E8F0` | Card borders |
| Backgrounds | `#F8FAFC` | Page background |

---

**Remember:**
- 🎨 Primary pink (#DC0159) is the hero color
- 🟦 Indigo is the supporting accent
- ✅ Use green for success
- ⚠️ Use amber for warnings  
- ❌ Use red for errors
- 🎯 Consistent spacing and typography
- ✨ Smooth animations on interactions

