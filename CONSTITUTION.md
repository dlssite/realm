# Realm — Project Constitution & Architecture Specification

**Version:** 1.0.0  
**Status:** Ratified  
**Last Updated:** 2026-08-09  
**Classification:** Single Source of Truth  

---

> **Welcome to the Realm Platform Architecture Constitution.**  
> This engineering blueprint is the single source of truth for all future development. It is designed to guide a solo developer using AI coding assistants for years of long-term development.

---

## 📚 Table of Contents — 20 Core Constitution Sections

The complete constitution is divided into 20 modular specification documents located in `docs/constitution/`:

1. [01. Architecture Philosophy](file:///d:/My%20Projects/DLS/Realm/docs/constitution/01-architecture-philosophy.md) — Why this architecture was chosen, modular monolith, solo dev & AI assistance rules.
2. [02. Monorepo Architecture](file:///d:/My%20Projects/DLS/Realm/docs/constitution/02-monorepo-architecture.md) — pnpm monorepo structure, folder rules, shared packages vs isolated apps.
3. [03. Frontend Architecture](file:///d:/My%20Projects/DLS/Realm/docs/constitution/03-frontend-architecture.md) — Feature-first React structure, routing, server state, Zustand, loading & error boundaries.
4. [04. Design System Specification](file:///d:/My%20Projects/DLS/Realm/docs/constitution/04-design-system-specification.md) — Visual language, typography scale, HSL color tokens, dark mode & animations.
5. [05. Responsive Design System](file:///d:/My%20Projects/DLS/Realm/docs/constitution/05-responsive-design-system.md) — Desktop, tablet, mobile behaviors, responsive drawers, mobile tables & touch specs.
6. [06. Shared UI Components](file:///d:/My%20Projects/DLS/Realm/docs/constitution/06-shared-ui-components.md) — App shell, command palette, data tables, kanban, timeline, calendar, TipTap wiki editor.
7. [07. Backend Architecture](file:///d:/My%20Projects/DLS/Realm/docs/constitution/07-backend-architecture.md) — Fastify setup, service layer pattern, REST API guidelines, error handling & background jobs.
8. [08. Database Architecture](file:///d:/My%20Projects/DLS/Realm/docs/constitution/08-database-architecture.md) — PostgreSQL standards, multi-schema Prisma organization, UUIDs, soft deletes & audit logs.
9. [09. Module Architecture](file:///d:/My%20Projects/DLS/Realm/docs/constitution/09-module-architecture.md) — Extension mechanism, registration manifest for routes, navigation, search & permissions.
10. [10. Core Modules](file:///d:/My%20Projects/DLS/Realm/docs/constitution/10-core-modules.md) — Workspace, Projects, Tasks, Wiki, AI, Files & Calendar detailed specifications.
11. [11. Authentication & Permissions](file:///d:/My%20Projects/DLS/Realm/docs/constitution/11-authentication-and-permissions.md) — Better Auth, RBAC hierarchy (Owner, Admin, Manager, Member, Guest), permissions engine.
12. [12. Search Architecture](file:///d:/My%20Projects/DLS/Realm/docs/constitution/12-search-architecture.md) — Global search using PostgreSQL GIN trigrams, command palette integration & ranking.
13. [13. AI Development Rules](file:///d:/My%20Projects/DLS/Realm/docs/constitution/13-ai-development-rules.md) — 13 strict rules for AI coding assistants working in this repository.
14. [14. Coding Standards](file:///d:/My%20Projects/DLS/Realm/docs/constitution/14-coding-standards.md) — TypeScript rules, naming conventions, max file limits (<300 lines), JSDoc & imports.
15. [15. Development Workflow](file:///d:/My%20Projects/DLS/Realm/docs/constitution/15-development-workflow.md) — 8-step feature development pipeline, conventional git commits & code review checklist.
16. [16. Testing Strategy](file:///d:/My%20Projects/DLS/Realm/docs/constitution/16-testing-strategy.md) — Testing pyramid (Unit, Integration, E2E) with Vitest, React Testing Library & Playwright.
17. [17. Security Standards](file:///d:/My%20Projects/DLS/Realm/docs/constitution/17-security-standards.md) — Auth security, input validation, MinIO presigned URL security, secret encryption & API protection.
18. [18. Deployment Architecture](file:///d:/My%20Projects/DLS/Realm/docs/constitution/18-deployment-architecture.md) — Self-hosted Docker Compose setup, Caddy reverse proxy, environment variables & backup strategy.
19. [19. Development Roadmap](file:///d:/My%20Projects/DLS/Realm/docs/constitution/19-development-roadmap.md) — Realistic 6-phase engineering implementation roadmap from Foundation to AI & Advanced Modules.
20. [20. Final Rule](file:///d:/My%20Projects/DLS/Realm/docs/constitution/20-final-rule.md) — Quality hierarchy over feature quantity, solo developer validation test & amendment rules.

---

## 🛠️ Technology Stack Overview

| Domain | Selected Technology |
|---|---|
| **Monorepo** | pnpm workspaces + Turborepo |
| **Frontend Core** | React 19, Vite, TypeScript, React Router v7 |
| **Styling & UI** | Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons, Framer Motion |
| **State Management** | TanStack Query v5 (Server), Zustand (Client UI), React Hook Form + Zod (Forms) |
| **Data & Visuals** | TipTap (Rich Wiki), React Flow (Timeline/Workflows), dnd-kit (Kanban), Recharts |
| **Backend API** | Node.js, Fastify, TypeScript |
| **Database** | PostgreSQL 16+ with Prisma ORM (Split Multi-Schema) |
| **Auth** | Better Auth (HTTP-only sessions + OAuth + RBAC) |
| **Storage** | MinIO (S3-compatible Object Storage) |
| **Background Jobs** | pg-boss (PostgreSQL job queue) |

---
