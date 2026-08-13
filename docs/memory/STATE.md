# 🧠 Realm AI Memory & Architectural State Log

---

## 📌 Context Snapshot

- **Current Phase:** Phase 6 ✅ Complete — Files, Calendar & Deployment
- **Completed Phases:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 (chat shipped out of order, now all caught up)
- **Next Step:** Phase 6 done. Begin Phase 7 implementation or plan next phase.

---

## 🗂️ Frontend Module Status

| Module | Route | Page File | Status |
|---|---|---|---|
| Dashboard | `/dashboard` | `modules/dashboard/pages/dashboard-page.tsx` | ✅ Live |
| Projects | `/projects` | `modules/projects/pages/projects-page.tsx` | ✅ Live |
| Project Detail | `/projects/:projectId` | `modules/projects/pages/project-detail-page.tsx` | ✅ Live |
| Tasks | `/tasks` | `modules/tasks/pages/tasks-page.tsx` | ✅ Live |
| Wiki | `/wiki` | `modules/wiki/pages/wiki-page.tsx` | ✅ Live |
| Emberlyn AI | `/ai` | `modules/ai/pages/ai-page.tsx` | ✅ Live |
| Teams | `/teams` | `modules/teams/pages/teams-page.tsx` | ✅ Live |
| Chat | `/chat` | `modules/chat/pages/chat-page.tsx` | ✅ Live |
| Settings | `/settings` | `modules/settings/pages/settings-page.tsx` | ✅ Live |
| Profile | `/profile` | `modules/profile/pages/profile-page.tsx` | ✅ Live |
| **Files** | `/files` | `modules/files/pages/files-page.tsx` | ✅ **Live** (Phase 6) |
| **Calendar** | `/calendar` | `modules/calendar/pages/calendar-page.tsx` | ✅ **Live** (Phase 6) |
| Activity | `/activity` | `modules/activity/pages/activity-page.tsx` | 🚧 Coming Soon card |
| Analytics | `/analytics` | `modules/analytics/pages/analytics-page.tsx` | 🚧 Coming Soon card |
| Automations | `/automations` | `modules/automations/pages/automations-page.tsx` | 🚧 Coming Soon card |

---

## 📝 Architectural Decisions Log

### ADR 001 — Modular Monolith, pnpm monorepo
- `docs/constitution/01-architecture-philosophy.md`

### ADR 002 — 20-section Constitution + Phase memory tracking
- `docs/phases/INDEX.md`

### ADR 003 — Monorepo bootstrap (pnpm-workspace.yaml, turbo.json, packages/, docker/)
- `docs/phases/01-phase-1-foundation.md`

### ADR 004 — Auth: crypto.scrypt sessions, Fastify cookie/Bearer auth, Zustand store, Router guards
- `docs/phases/01-phase-1-foundation.md`

### ADR 005 — Workspaces: Invitation + TeamMember schemas, PermissionService rank RBAC, Settings UI
- `docs/phases/02-phase-2-workspace.md`

### ADR 006 — Projects & Tasks: Prisma schemas, CRUD REST routes, List/Kanban dual-view UI, HTML5 DnD
- `docs/phases/03-phase-3-projects-and-tasks.md`

### ADR 007 — Wiki & Rich Text: `wiki.prisma` schema, TipTap editor, frameless canvas UI, fold/unfold tree sidebar, slide-over version history drawer, template modal
- `docs/phases/04-phase-4-wiki.md`

### ADR 008 — Emberlyn AI: `ai.prisma` schema (`AiProviderConfig`, `AiConversation`, `AiMessage`), OpenRouter/Ollama provider abstraction, workspace-scoped `allowedModels`, full conversation memory, user/workspace context injection in system prompt, Gemini-style full-page AI UI at `/ai`
- `docs/phases/05-phase-5-ai.md`

### ADR 009 — Realtime Workspace Chat & Channel Messaging Engine: `chat.prisma` schema (`Channel`, `ChannelMember`, `ChatMessage`, `MessageReaction`), `@fastify/websocket` integration, channel-based group chat (strictly NO DMs), Owner/Admin channel creation, auto/manual Team and Project channel enablement, Team Leader moderation rights, workspace Admin omni-visibility, Zustand WS client store, responsive glassmorphism UI at `/chat`
- `docs/phases/07-phase-7-chat-module.md`

### ADR 010 — Coming Soon Page Pattern: Shared `ComingSoonPage` component at `src/shared/components/coming-soon-page.tsx`. Prop-driven (moduleName, tagline, ModuleIcon, accent tokens, features[], phase). Each unbuilt module has its own page file that simply renders this shared component with module-specific props. Routes are registered in `router.tsx` under a clearly marked comment block. Removal is: delete the module's page file, swap the router import to the real page. Zero changes to app-layout or nav required.

### ADR 011 — User Profile Module: First frontend module fully structured to constitution spec (api/, types/, components/, pages/). Backend adds `apps/api/src/modules/users/user.routes.ts` registered at `/api/v1/users`. Three endpoints: `GET /me` (full profile + workspace memberships), `PATCH /me` (name / avatarUrl), `POST /me/change-password` (scrypt verify + rehash). Frontend module at `apps/web/src/modules/profile/` with:
  - `types/index.ts` — `UserProfile`, `UpdateProfilePayload`, `ChangePasswordPayload`
  - `api/profile-keys.ts` — TanStack Query key factory
  - `api/profile-api.ts` — `fetchProfile`, `updateProfile`, `changePassword`
  - `components/profile-avatar.tsx` — avatar display, URL-paste change, remove
  - `components/profile-password-form.tsx` — current/new/confirm with 4-tier strength meter
  - `components/profile-workspaces.tsx` — read-only membership list with role badges (Crown/Shield/Users/UserCircle/Eye icons per role)
  - `pages/profile-page.tsx` — 5-section page: Avatar · Account Details · Password & Security · Workspace Memberships · Danger Zone
  - PATCH response is merged into local state (`{ ...prev, ...updated }`) to preserve `workspaceMembers` (not returned by the partial update endpoint)
  - Name/avatar saves sync the Zustand auth store immediately so sidebar initial updates without a reload
  - Sidebar 3-dot user menu updated: identity header (name + email) added at top; Profile link (User icon) inserted above Notifications
  - Route `/profile` lazy-loads `ProfilePage` (named export, no `.default` fallback) inside `ProtectedRoute / AppLayout`

### ADR 012 — MinIO S3-Compatible Storage: AWS SDK v3 `S3Client` with `forcePathStyle: true` at `apps/api/src/infrastructure/storage/minio.ts`. Presign-then-direct-upload pattern — API generates a presigned PUT URL, client uploads directly to MinIO, API verifies via `HeadObject` then creates `FileRecord` in DB. Migration to AWS S3 or Cloudflare R2 = swap `MINIO_ENDPOINT` + credentials in `.env`, zero code changes.
  - `prisma/schema/files.prisma` — `FileRecord` (storageKey, bucket, filename, contentType, sizeBytes BigInt, projectId scope) + `FileVersion`
  - `apps/api/src/modules/files/file.routes.ts` — `POST /upload-url`, `POST /confirm`, `GET /`, `GET /:id/download-url`, `DELETE /:id`
  - Frontend: `modules/files/` — full upload pipeline (drag-drop → XHR progress → confirm), file table, in-app previewer (image/video/PDF/text/fallback)

### ADR 013 — Unified Calendar Module: `prisma/schema/calendar.prisma` — `CalendarEvent` (type: EVENT/TASK/MILESTONE, startsAt/endsAt, isAllDay, color, scoped to project/team) + `EventAttendee` (rsvp enum). Backend feed endpoint merges custom events + task due dates + project milestones into one response per date range. Frontend month-view grid with colour-coded chips, create/detail modals, RSVP support.
  - `apps/api/src/modules/calendar/calendar.routes.ts` — `GET /feed`, full CRUD for events, `PATCH /rsvp`
  - Frontend: `modules/calendar/` — pure date-math utils (no external deps), month grid (42-cell Mon-Sun), EventChip, CreateEventModal, EventDetailModal

### ADR 014 — Production Deployment Stack: Multi-stage Docker builds for API (Node 20 Alpine) and Web (Vite → nginx:1.27-alpine). Caddy 2 as reverse proxy with automatic Let's Encrypt TLS, HTTP→HTTPS redirect, security headers, `/api/*` → API, `/ws/*` WebSocket, `/storage/*` → MinIO, `/*` → Web SPA. `scripts/backup.sh` runs `pg_dump | gzip -9` + `mc mirror` for MinIO, 30-day DB dump retention, cron-ready.
  - `docker/Dockerfile.api`, `docker/Dockerfile.web`, `docker/nginx.conf`
  - `docker/Caddyfile`, `docker/docker-compose.prod.yml`
  - `scripts/backup.sh`

### ADR 015 — Emberlyn Modular Tools (Agentic System): Extends Phase 5 AI with full OpenAI-compatible function-calling. Emberlyn can now read and write live workspace data across all 5 modules via 33 server-side tools. Architecture: `EmberlynTool` contract + `ToolContext` interface → 5 tool modules → central `emberlyn-tools.ts` registry → agentic loop in `POST /ai/chat` (max 5 iterations). All tool calls persisted on `AiMessage.toolCalls Json?` for audit. Emberlyn executes as the authenticated user — inherits their RBAC role, no permission bypass. `summarize` endpoint upgraded from stub to real LLM-backed JSON response.
  - `prisma/schema/ai.prisma` — Added `toolCalls Json?` to `AiMessage`
  - `apps/api/src/core/ai/tool-context.ts` — `EmberlynTool`, `ToolContext`, `OpenAIToolDefinition`, `PersistedToolCall` types
  - `apps/api/src/core/ai/tools/tasks.tools.ts` — 8 tools: `search_tasks`, `get_task`, `create_task`, `update_task`, `add_task_comment`, `create_subtask`, `assign_task`, `set_task_due_date`
  - `apps/api/src/core/ai/tools/projects.tools.ts` — 8 tools: `list_projects`, `get_project`, `create_project`, `update_project`, `create_milestone`, `update_milestone`, `create_goal`, `update_goal`
  - `apps/api/src/core/ai/tools/wiki.tools.ts` — 5 tools: `search_wiki`, `get_wiki_page`, `list_wiki_pages`, `create_wiki_page`, `update_wiki_page`
  - `apps/api/src/core/ai/tools/calendar.tools.ts` — 5 tools: `get_calendar_feed`, `create_event`, `update_event`, `delete_event`, `rsvp_event`
  - `apps/api/src/core/ai/tools/workspace.tools.ts` — 7 tools: `list_workspace_members`, `get_member`, `list_teams`, `get_team`, `list_files`, `get_file_info`, `global_search`
  - `apps/api/src/core/ai/emberlyn-tools.ts` — Central registry (`ALL_TOOLS` array, `TOOL_MAP`, `emberlynToolDefinitions`, `executeToolCall` dispatcher, `buildPersistedRecord`, `buildSummary`)
  - `apps/api/src/modules/ai/ai.routes.ts` — Full rewrite: `callLLM` provider abstraction, agentic loop (5-iteration cap), tool result messages (`role: 'tool'`), LLM-backed summarize endpoint
  - `docs/phases/05-phase-5-ai.md` — Updated with full tool catalog, architecture diagram, and new verification criteria

---

## 🛠️ Stack Quick-Reference

| Component | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, React Router v7, Zustand, Tailwind CSS, Lucide Icons, TipTap |
| Backend | Node.js, Fastify, TypeScript, Zod, native crypto |
| Database | PostgreSQL 16, Prisma ORM multi-schema (`prisma/schema/*.prisma`) |
| Infrastructure | MinIO S3 (AWS SDK v3), pg-boss queue, Docker Compose, Caddy reverse proxy |
| Packages | `@realm/types`, `@realm/utils`, `@realm/config`, `@realm/ui`, `@realm/sdk` |

---

## 🗓️ Session Log

| Date | Work Done |
|---|---|
| 2026-08-11 | Created `src/shared/components/coming-soon-page.tsx` — reusable prop-driven placeholder component. Created Coming Soon pages for Activity (violet), Calendar (green), Files (orange), Analytics (blue), Automations (yellow). Registered all 5 routes in `router.tsx` under a clearly marked comment block. TypeScript check passes (exit 0). Updated `docs/memory/STATE.md` and `docs/phases/INDEX.md`. |
| 2026-08-11 | Built User Profile module end-to-end (ADR 011). New API endpoint at `/api/v1/users` (GET /me, PATCH /me, POST /me/change-password). New frontend module at `modules/profile/` — first module fully structured to constitution spec with `api/`, `types/`, `components/`, `pages/` folders. Route `/profile` added to router. Sidebar 3-dot menu updated with identity header + Profile link above Notifications. Fixed post-save crash caused by PATCH response not including `workspaceMembers` — now uses merge strategy. Build passes 7/7. |
| 2026-08-11 | **Phase 6 complete** (ADR 012, 013, 014). Prisma schemas: `files.prisma` (FileRecord, FileVersion) + `calendar.prisma` (CalendarEvent, EventAttendee). Relations wired into User, Workspace, Team, Project. MinIO storage client (AWS SDK v3, forcePathStyle). Files API: presign→confirm upload flow, list, download-url, delete. Calendar API: unified feed (events+tasks+milestones), full CRUD, RSVP. Both registered in main.ts. `@realm/types` updated with FileRecordDto + CalendarEventDto. Files frontend: drag-drop upload zone with XHR progress, file table, in-app previewer (image/video/PDF/text). Calendar frontend: month grid (pure date-math, no deps), colour-coded chips, create/detail modals. Production Docker: multi-stage Dockerfile.api + Dockerfile.web (nginx), Caddyfile (auto-TLS, HTTP→HTTPS), docker-compose.prod.yml (5-service stack). scripts/backup.sh (pg_dump + mc mirror, 30-day retention). `pnpm run prisma:generate` — merged schema written to `prisma/schema.prisma`, Prisma client regenerated. Both `tsc --noEmit` pass (exit 0). |
| 2026-08-12 | **Emberlyn Modular Tools complete** (ADR 015). Extended Phase 5 AI with full agentic tool-calling system. 33 server-side tools across 5 modules (Tasks ×8, Projects ×8, Workspace/Files/Search ×7, Calendar ×5, Wiki ×5). New files: `core/ai/tool-context.ts`, `core/ai/emberlyn-tools.ts`, `core/ai/tools/{tasks,projects,wiki,calendar,workspace}.tools.ts`. `ai.prisma` updated — `AiMessage.toolCalls Json?` added, Prisma client regenerated. `ai.routes.ts` fully rewritten with `callLLM` provider abstraction, agentic loop (5-iteration cap), tool result messages, and LLM-backed summarize endpoint. `docs/phases/05-phase-5-ai.md` updated with complete spec. `tsc --noEmit` passes. |
