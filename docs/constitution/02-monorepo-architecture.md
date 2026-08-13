# 2. Monorepo Architecture

## 2.1 Monorepo Folder Structure

Managed using **pnpm workspaces** and **Turborepo** for build caching and task orchestration.

```
workspace-os/
├── apps/
│   ├── web/                    # React frontend application
│   │   ├── src/
│   │   │   ├── app/            # App shell, providers, layout
│   │   │   ├── modules/        # Feature modules (projects, tasks, wiki, etc.)
│   │   │   ├── shared/         # Shared frontend hooks, helpers, stores
│   │   │   └── main.tsx
│   │   ├── vite.config.ts
│   │   └── tailwind.config.ts
│   │
│   └── api/                    # Fastify REST API backend
│       ├── src/
│       │   ├── app/            # Server bootstrapper, fastify plugins
│       │   ├── core/           # Auth, permissions, search, event bus
│       │   ├── modules/        # Backend feature modules
│       │   ├── infrastructure/ # Database, storage, queue, logger
│       │   └── main.ts
│       └── tsconfig.json
│
├── packages/
│   ├── ui/                     # Shared UI component library (shadcn/ui based)
│   ├── types/                  # Shared TypeScript interfaces & DTOs
│   ├── utils/                  # Shared pure utility functions
│   ├── config/                 # Shared permission rules, constants, defaults
│   └── sdk/                    # Typed API client SDK for apps/web
│
├── prisma/
│   ├── schema/                 # Split Prisma schema files
│   │   ├── base.prisma
│   │   ├── auth.prisma
│   │   ├── workspace.prisma
│   │   ├── projects.prisma
│   │   ├── tasks.prisma
│   │   ├── wiki.prisma
│   │   ├── files.prisma
│   │   ├── ai.prisma
│   │   └── calendar.prisma
│   ├── migrations/
│   └── seed.ts
│
├── docker/
│   ├── Dockerfile.web
│   ├── Dockerfile.api
│   └── docker-compose.yml
│
├── pnpm-workspace.yaml
├── turbo.json
└── CONSTITUTION.md
```

---

## 2.2 Folder Responsibilities & Package Rules

| Location | Contents | Ownership Rules |
|---|---|---|
| `apps/web` | Client React application | Never import backend code from `apps/api`. |
| `apps/api` | Fastify backend API | Never import UI components from `apps/web`. |
| `packages/ui` | Pure presentational components | No business logic, state stores, or API requests. |
| `packages/types` | Shared domain & API TypeScript interfaces | Types only. No runtime logic or external dependencies. |
| `packages/utils` | Pure utility functions (dates, formatting) | Pure functions. No side effects. |
| `packages/config` | Constants, RBAC matrices, system settings | Static JSON/TS configuration data. |
| `packages/sdk` | Typed HTTP API client wrapper | Wraps REST calls for `apps/web`. |

---

## 2.3 Dependency & Isolation Matrix

```
apps/web  ──► packages/ui
apps/web  ──► packages/types
apps/web  ──► packages/utils
apps/web  ──► packages/config
apps/web  ──► packages/sdk

apps/api  ──► packages/types
apps/api  ──► packages/utils
apps/api  ──► packages/config

packages/ui   ──► packages/types (types only)
packages/sdk  ──► packages/types
```

**Forbidden Dependencies**:
- `apps/web` must **never** import `apps/api`.
- `apps/api` must **never** import `apps/web`.
- `packages/*` must **never** import `apps/*`.
- No circular dependencies between packages.
