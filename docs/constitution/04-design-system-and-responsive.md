# Section 4: Design System Specification & Responsive UI

## 4.1 Visual Language & Aesthetic Philosophy

Realm follows a high-density, professional, precision design language inspired by **Linear**, **Notion**, and **GitHub**.

- **Typography First**: Hierarchy established primarily via font weight, size, and color tone rather than heavy borders.
- **Dark Mode Default**: Sleek dark aesthetic with fine contrast, low-saturation borders, and subtle glow highlights.
- **Dense Data Presentation**: Compact UI sizing suitable for complex workflows (13px/14px default body font sizes).
- **Subtle Micro-Animations**: Smooth Framer Motion transitions for drawers, modals, dropdowns, and drag-and-drop actions.

---

## 4.2 Design Tokens (HSL Color Architecture)

Defined in Tailwind CSS custom variables:

```css
:root {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 5.9%;
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 5.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 263.4 70% 50.4%;       /* Violet Accent */
  --primary-foreground: 210 20% 98%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 263.4 70% 50.4%;
  --radius: 0.5rem;
}
```

---

## 4.3 Typography Scale

- **Primary Sans**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`
- **Monospace**: `JetBrains Mono`, `Fira Code`, `monospace`

| Token | Size | Line Height | Usage |
|---|---|---|---|
| `text-xs` | 12px (0.75rem) | 16px | Badges, timestamps, secondary metadata |
| `text-sm` | 13px (0.8125rem) | 18px | Table rows, sidebar links, button text |
| `text-base` | 14px (0.875rem) | 20px | Standard body text, inputs, markdown body |
| `text-lg` | 16px (1rem) | 24px | Section headers, card titles |
| `text-xl` | 20px (1.25rem) | 28px | Modal titles, page subheaders |
| `text-2xl` | 24px (1.5rem) | 32px | Top page titles, analytics metrics |

---

## 4.4 Responsive Breakdown & Mobile Adaptation

The application is built **Mobile-First** with adaptive mobile layouts:

```
Desktop (≥ 1024px)              Tablet (768px - 1023px)         Mobile (< 768px)
┌──────┬──────────────────────┐ ┌───┬─────────────────────────┐ ┌─────────────────────────┐
│Side  │ Main Workspace Area  │ │S  │ Main Workspace Area     │ │ Top Header + Hamburger  │
│bar   │                      │ │i  │                         │ ├─────────────────────────┤
│(240px│                      │ │d  │                         │ │ Main Workspace Area     │
│fixed)│                      │ │e  │                         │ │ (Full Width Scrollable) │
│      │                      │ │(icon)                       │ ├─────────────────────────┤
└──────┴──────────────────────┘ └───┴─────────────────────────┘ │ Bottom Quick Nav (5 key)│
                                                                └─────────────────────────┘
```

### Component Mobile Transformations
- **Data Tables**: Convert into stacked, swipeable cards on screens below 768px.
- **Kanban Board**: Converts to a swipeable horizontal tabbed view per column on small touch displays.
- **Modals / Dialogs**: Transformed into bottom-anchored, drag-to-dismiss Drawers (`vaul` drawer style).
- **Command Palette (`⌘K`)**: Fullscreen search interface on mobile screens with top search input.
