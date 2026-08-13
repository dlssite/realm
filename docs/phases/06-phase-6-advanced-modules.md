# 🎯 Phase 6: Files, Calendar & Deployment

**Status:** ✅ Complete  
**Completed:** 2026-08-11  
**Primary Goal:** Asset management backed by MinIO S3, unified calendar, and production self-hosting packaging.

---

## 📋 Task Checklist

### Step 8: Files, Calendar & Deployment Packaging
- [x] Create `files.prisma` and `calendar.prisma` schema models.
- [x] Build MinIO S3 presigned upload handler (`/api/v1/files/upload-url`).
- [x] Build in-app File Previewer (PDFs, Images, Code, Video).
- [x] Build Unified Calendar module (consolidating Events, Task due dates, and Milestones).
- [x] Write production `docker/Dockerfile.web` and `docker/Dockerfile.api`.
- [x] Set up **Caddy** reverse proxy with SSL configuration (`docker/Caddyfile`).
- [x] Create automated database & S3 backup maintenance scripts (`scripts/backup.sh`).

---

## ✅ Verification & Acceptance Criteria
- [x] Files upload directly to MinIO and preview cleanly in-app.
- [x] Docker Compose production deployment spins up cleanly behind Caddy.
- [x] Health check endpoint (`GET /api/health`) passes.

---

## 🏗️ What Was Built

### Database Schemas
- **`prisma/schema/files.prisma`** — `FileRecord` (storageKey, bucket, filename, contentType, sizeBytes BigInt, projectId scope) + `FileVersion` (version history)
- **`prisma/schema/calendar.prisma`** — `CalendarEvent` (type: EVENT/TASK/MILESTONE, startsAt/endsAt, isAllDay, color, projectId/teamId scope) + `EventAttendee` (rsvp: PENDING/ACCEPTED/DECLINED/MAYBE)
- Relations wired into `User`, `Workspace`, `Team`, `Project` models

### Backend API
- **`apps/api/src/infrastructure/storage/minio.ts`** — S3Client (AWS SDK v3, forcePathStyle for MinIO), `createPresignedUploadUrl`, `createPresignedDownloadUrl`, `deleteObject`, `objectExists`, `buildStorageKey`. Swap endpoint ENV vars to migrate to AWS S3 or Cloudflare R2 with zero code changes.
- **`apps/api/src/modules/files/file.routes.ts`** — `POST /upload-url`, `POST /confirm` (verifies object exists before creating DB record), `GET /` (paginated list), `GET /:fileId/download-url`, `DELETE /:fileId` (soft-delete + hard-delete from MinIO)
- **`apps/api/src/modules/calendar/calendar.routes.ts`** — `GET /feed` (unified events + task due dates + milestones by date range), full CRUD for events, `PATCH /events/:id/rsvp`
- Both registered in `main.ts` under `/api/v1/workspaces` prefix

### Frontend Modules

**Files (`/files`)**
- Full upload pipeline: drag-drop zone → presigned PUT to MinIO → confirm → DB record
- Per-file progress bars, auto-clear on success, error dismissal
- File table with MIME icon, project tag, uploader name, size, hover actions
- In-app previewer modal: images, video, PDF iframe, text/code, download fallback

**Calendar (`/calendar`)**
- Month-view grid (Mon–Sun, 42-cell layout with prev/next month padding)
- Colour-coded chips: purple=events, blue=tasks, amber=milestones. "+N more" overflow
- Today button, month navigation, legend
- Create Event modal: title, description, datetime picker, all-day toggle, 8-colour picker
- Event detail modal: time, description, project tag, attendees with RSVP badges, delete action
- Unified feed API call per month — one request covers all three entry types

### Deployment
- **`docker/Dockerfile.api`** — multi-stage Node 20 Alpine build, Prisma generate in builder, non-root user, runs `prisma migrate deploy` then `node dist/main.js`
- **`docker/Dockerfile.web`** — multi-stage Vite build, nginx:1.27-alpine runtime, SPA fallback route
- **`docker/nginx.conf`** — static asset caching (1 year immutable), SPA fallback, `/health` endpoint
- **`docker/Caddyfile`** — auto-HTTPS via Let's Encrypt, `/api/*` → API, `/ws/*` WebSocket upgrade, `/storage/*` → MinIO pass-through, `/*` → Web, HTTP→HTTPS permanent redirect
- **`docker/docker-compose.prod.yml`** — postgres:16-alpine, minio:latest, realm-api, realm-web, caddy:2-alpine. All services on `realm-internal` bridge network. Healthchecks on all services.
- **`scripts/backup.sh`** — `pg_dump | gzip -9` + `mc mirror` to `/var/backups/realm`. Auto-prunes DB dumps older than 30 days. Reads `.env` for credentials. Cron-ready.

### ADR
- **ADR 012** — MinIO S3-compatible storage. AWS SDK v3 `S3Client` with `forcePathStyle: true`. Presign-then-direct-upload pattern (API never receives file bytes). Migration to AWS S3 / Cloudflare R2 = one ENV var swap.
- **ADR 013** — Caddy as production reverse proxy. Auto-TLS via Let's Encrypt. Handles HTTP→HTTPS redirect, security headers, API/WS/MinIO/SPA routing in a single 60-line config.
