# Section 5: Shared UI Component Library

## 5.1 Component Library Architecture (`packages/ui`)

Built on top of **Radix UI Primitives** and styled with **Tailwind CSS** (shadcn/ui convention).

```
packages/ui/src/
├── primitives/          # Atomic components
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── popover.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   └── tooltip.tsx
│
├── composite/           # Layout & Complex App Widgets
│   ├── app-shell.tsx
│   ├── sidebar.tsx
│   ├── top-bar.tsx
│   ├── command-palette.tsx
│   ├── data-table.tsx
│   ├── kanban-board.tsx
│   ├── timeline-gantt.tsx
│   ├── calendar-view.tsx
│   ├── activity-feed.tsx
│   ├── comment-thread.tsx
│   ├── file-preview.tsx
│   ├── empty-state.tsx
│   └── page-header.tsx
```

---

## 5.2 Composite Component Specifications

### 1. App Shell & Navigation (`app-shell.tsx`)
- Hosts the collapsible sidebar, global breadcrumbs, notification center, command palette, and workspace switcher.
- Automatically handles breakpoint changes between desktop, tablet, and mobile layouts.

### 2. Command Palette (`command-palette.tsx`)
- Global `⌘K` / `Ctrl+K` keybinding listener.
- Instant fuzzy searching powered by `cmdk`.
- Executes quick actions (Create Task, Switch Workspace, Open Wiki Page, Trigger AI Chat).

### 3. High-Performance Data Table (`data-table.tsx`)
- Powered by `@tanstack/react-table`.
- Supports column reordering, multi-column sorting, custom column visibilities, and virtualized scrolling (`@tanstack/react-virtual`) for datasets with > 1,000 rows.

### 4. Drag & Drop Kanban Board (`kanban-board.tsx`)
- Built with `@dnd-kit/core` and `@dnd-kit/sortable`.
- Allows moving tasks between status columns with optimistic client updates.
- Keyboard-accessible card movements.

### 5. TipTap Wiki & Rich Text Editor (`wiki-editor.tsx`)
- Modular TipTap setup supporting Notion-like `/` slash commands, callouts, syntax-highlighted code blocks, tables, image uploads, and `@mentions`.

### 6. Timeline / Gantt View (`timeline-gantt.tsx`)
- Rendered using custom React SVG or React Flow integration.
- Shows dependencies between tasks, milestone markers, and date span adjustments via click-and-drag.
