# 6. Shared UI Components

## 6.1 Component Library Architecture (`packages/ui`)

Built on **Radix UI Primitives** styled with **Tailwind CSS**:

```
packages/ui/src/
├── components/          # Base Primitives (Radix + Tailwind)
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── popover.tsx
│   ├── tooltip.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── data-table.tsx
│   └── form.tsx
│
└── composites/          # Higher-Order App Components
    ├── app-shell.tsx
    ├── sidebar.tsx
    ├── top-bar.tsx
    ├── page-header.tsx
    ├── command-palette.tsx
    ├── kanban-board.tsx
    ├── timeline-gantt.tsx
    ├── calendar-view.tsx
    ├── activity-feed.tsx
    ├── comment-thread.tsx
    ├── file-preview.tsx
    └── empty-state.tsx
```

---

## 6.2 Component Catalog & Usage Rules

| Component | Primary Purpose | Key Features & Libraries |
|---|---|---|
| **App Shell** | Root layout container | Hosts collapsible sidebar, top bar, content viewport. |
| **Sidebar** | Primary workspace nav | Workspace switcher, module links, user favorites, team shortcuts. |
| **Top Bar** | Page header & breadcrumbs | Navigation trail, global search trigger, user avatar menu. |
| **Command Palette** | Global quick-action search | Instant fuzzy search (`cmdk`), keybinding (`⌘K`). |
| **Data Tables** | High-density tabular views | Reordering, multi-sort, virtualization (`@tanstack/react-table`). |
| **Kanban Board** | Visual workflow board | Drag-and-drop (`dnd-kit`), status column management. |
| **Timeline / Gantt** | Project milestone tracking | Interactive task bars, date range adjustments, dependencies. |
| **Calendar View** | Scheduling & deadlines | Month/Week/Day grids for events & task due dates. |
| **Wiki Editor** | Rich documentation | Notion-style slash commands, markdown, code blocks (TipTap). |
| **Activity Feed** | Audit & history timeline | Chronological log of workspace updates, task edits, comments. |
| **Comment Thread** | Discussion on resources | Rich text, `@mentions`, attachments, emoji reactions. |
| **File Previewer** | In-app document viewer | PDF, Image, Code syntax highlighting, Video modal viewer. |
| **Empty States** | Friendly no-data displays | Custom illustration/icon, clear title, CTA action button. |
| **Loading States** | Asynchronous progress | Skeleton matching final content layout, top progress bar. |
| **Error States** | Graceful error presentation | Inline field errors, query retry banners, full-page error boundary. |
