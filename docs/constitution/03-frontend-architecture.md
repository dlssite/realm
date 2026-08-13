# 3. Frontend Architecture

## 3.1 Feature-First Directory Structure

Every module in `apps/web/src/modules/` adheres strictly to this structure:

```
modules/projects/
├── components/             # Module-specific UI components
│   ├── project-card.tsx
│   ├── project-list.tsx
│   └── project-header.tsx
├── hooks/                  # Custom hooks for module data & UI
│   ├── use-projects.ts
│   └── use-project-mutations.ts
├── services/               # Client-side data transformers & helpers
│   └── project-utils.ts
├── api/                    # API client calls & Query Key factories
│   ├── project-api.ts
│   └── project-keys.ts
├── schemas/                # Form validation schemas (Zod)
│   └── create-project.schema.ts
├── types/                  # UI-specific TypeScript types
│   └── index.ts
├── pages/                  # Route-level page components
│   ├── projects-page.tsx
│   └── project-detail-page.tsx
├── routes.tsx              # Code-split module route definitions
└── index.ts                # Barrel export for module public interface
```

---

## 3.2 Routing Strategy (React Router v7)

Module routes are lazy-loaded to optimize bundle size:

```typescript
// app/router.tsx
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: 'projects/*', lazy: () => import('@/modules/projects/routes') },
      { path: 'tasks/*',    lazy: () => import('@/modules/tasks/routes') },
      { path: 'wiki/*',     lazy: () => import('@/modules/wiki/routes') },
      { path: 'ai/*',       lazy: () => import('@/modules/ai/routes') },
      { path: 'files/*',    lazy: () => import('@/modules/files/routes') },
      { path: 'calendar/*', lazy: () => import('@/modules/calendar/routes') },
    ],
  },
]);
```

---

## 3.3 State Management Rules

| State Category | Solution | Usage Rules |
|---|---|---|
| **Server State** | TanStack Query v5 | All backend data fetching, caching, revalidation. Source of truth. |
| **Client UI State** | Zustand | Global UI state (Sidebar open state, active modal, theme). |
| **Form State** | React Hook Form + Zod | All form management, validation, and submission states. |
| **URL State** | React Router SearchParams | Search filters, active view modes, selected item IDs. |
| **Component State**| React `useState` / `useReducer` | Component-private UI toggles (dropdown open, tooltips). |

---

## 3.4 Error Handling & Loading States

- **Error Boundaries**: Root `<AppErrorBoundary>` catches uncaught application errors, while `<ModuleErrorBoundary>` wraps individual modules.
- **Query Retries**: TanStack Query handles network glitches with inline retry interfaces.
- **Skeleton Screens**: Content skeletons matching final UI components display during loading to eliminate Cumulative Layout Shift (CLS).
- **Suspense Code-Splitting**: Route navigation renders light skeleton fallbacks during dynamic chunk loading.
