# 5. Responsive Design System

## 5.1 Breakpoints

Built **Mobile-First** with Tailwind CSS breakpoint utilities:

| Name | Range | Target Device Class | Layout Adaptation |
|---|---|---|---|
| `xs` | 0px – 639px | Small / Medium Smartphones | Single-column, bottom navigation, drawer modals |
| `sm` | 640px – 767px | Large Smartphones | Expanded form grids, responsive card lists |
| `md` | 768px – 1023px | Tablets (Portrait) | Collapsed icon-only sidebar, 2-column cards |
| `lg` | 1024px – 1279px | Tablets (Landscape) / Laptops | Full 240px sidebar, multi-column tables |
| `xl` | 1280px+ | Desktop Workstations | Expanded multi-panel workspace layouts |

---

## 5.2 Layout Behaviors Across Breakpoints

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

---

## 5.3 Component Responsive Transformations

- **Sidebar**: Full width (240px) on desktop → Icon-only rail (56px) on tablet → Hidden behind hamburger drawer on mobile.
- **Data Tables**: Render full interactive tables on desktop/tablet → Transform into stacked, swipeable card views on mobile.
- **Kanban Board**: Multi-column scrollable board on desktop → Tabbed single-column swipe view on mobile.
- **Modals & Dialogs**: Centered dialog panels on desktop → Bottom slide-up drawers (`vaul` style) on mobile.
- **Command Palette (`⌘K`)**: Centered 640px search box on desktop → Fullscreen touch search overlay on mobile.
- **Touch Targets**: Minimum 44×44px interactive tap area with 16px touch target padding on mobile views.
