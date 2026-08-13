# 4. Design System Specification

## 4.1 Visual Language & Aesthetic Philosophy

Realm follows a high-density, professional, clean visual style inspired by **Linear**, **Notion**, and **GitHub**.

- **Typography-Driven Hierarchy**: Hierarchy created via font sizing, weight, and subtle contrast rather than heavy borders.
- **Dark Mode Default**: Fine dark palette with low-saturation borders (`hsl(var(--border))`) and muted backgrounds.
- **Dense Data Presentation**: Compact UI density suited for power users (13px/14px standard body size).
- **Purposeful Motion**: Micro-animations communicate layout state changes rather than acting as visual decoration.

---

## 4.2 Typography Scale

- **Sans Stack**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`
- **Mono Stack**: `JetBrains Mono`, `Fira Code`, `monospace`

| Token | Size | Line Height | Weight | Application |
|---|---|---|---|---|
| `text-xs` | 12px (0.75rem) | 16px | 400 | Badges, captions, secondary timestamps |
| `text-sm` | 13px (0.8125rem) | 18px | 400/500 | Table cell content, sidebar navigation, metadata |
| `text-base` | 14px (0.875rem) | 20px | 400 | Primary body text, form inputs, markdown body |
| `text-lg` | 16px (1rem) | 24px | 500/600 | Card titles, section headers |
| `text-xl` | 20px (1.25rem) | 28px | 600 | Modal titles, section subheaders |
| `text-2xl` | 24px (1.5rem) | 32px | 600/700 | Primary page titles, metric headers |

---

## 4.3 Color Tokens (HSL System)

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

## 4.4 Component Design & Motion Rules

- **Borders**: Subtle `1px solid hsl(var(--border))`.
- **Border Radii**: Cards (`rounded-lg` / 8px), Buttons/Inputs (`rounded-md` / 6px), Badges (`rounded-full`).
- **Focus Rings**: All interactive elements render a 2px focus ring (`ring-ring`) on `:focus-visible`.
- **Animations**: Framer Motion spring physics for modals (200ms enter), drawer slide-overs, and drag-and-drop actions.
- **Accessibility**: WCAG 2.1 AA minimum contrast ratios across light and dark themes. Full keyboard accessibility.
