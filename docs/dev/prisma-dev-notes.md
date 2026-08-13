# Prisma Dev Notes

## How schema management works in this project

Schemas are split across `prisma/schema/*.prisma` fragment files — one file per domain
(`base`, `auth`, `workspace`, `projects`, `tasks`, `wiki`, `chat`, `ai`, `files`, `calendar`).

Before any Prisma command runs, all fragments are **merged** into a single
`prisma/schema.prisma` file via `scripts/merge-prisma.js`. Every root script in
`package.json` calls this merge step automatically.

**Never run `prisma` CLI directly against `prisma/schema/` (the folder).
Always use the root scripts below.**

---

## ✅ Correct workflow — adding or changing schema

### Every time you create or modify a `prisma/schema/*.prisma` file:

```bash
# Step 1 — merge fragments + regenerate the Prisma TypeScript client
pnpm run prisma:generate

# Step 2 — generate a migration SQL file
#   (only writes a .sql file, does NOT connect to any DB)
pnpm run prisma:migrate:create
# Prisma prompts for a name, e.g. "add_notifications"
# Creates: prisma/migrations/<timestamp>_add_notifications/migration.sql

# Step 3 — review the SQL, then apply it to the live database
node --env-file=.env scripts/apply-migration.mjs \
  prisma/migrations/<timestamp>_add_notifications/migration.sql
```

That is the full workflow. Three commands every time.

---

## All available scripts

| Script | What it does |
|---|---|
| `pnpm run prisma:build` | Merges `prisma/schema/*.prisma` → `prisma/schema.prisma`. No DB contact. |
| `pnpm run prisma:generate` | `prisma:build` + regenerate Prisma client. **Run after every schema change.** |
| `pnpm run prisma:migrate:create` | `prisma:build` + generate migration SQL only. No shadow DB, no apply. |
| `pnpm run prisma:studio` | `prisma:build` + open Prisma Studio GUI against the live database. |
| `pnpm run prisma:push` | ⚠️ Broken for this project — see explanation below. Do not use. |

---

## Step-by-step example — adding a `Notification` model

```bash
# 1. Create prisma/schema/notifications.prisma with the new model
# 2. Add relations to any other *.prisma files that reference it
# 3. Regenerate client
pnpm run prisma:generate

# 4. Generate migration SQL
pnpm run prisma:migrate:create
#    → Prisma asks: Name of the migration: add_notifications
#    → File written: prisma/migrations/20261001120000_add_notifications/migration.sql

# 5. Apply it
node --env-file=.env scripts/apply-migration.mjs \
  prisma/migrations/20261001120000_add_notifications/migration.sql
```

---

## ⚠️ Why `prisma db push` is broken for this project

`db push` works by spinning up an internal **shadow database**, replaying the full
migration history into it, computing the diff against the current schema, and then
applying that diff to the live DB.

This project was bootstrapped with **raw SQL scripts** (not Prisma migrate), which means:

1. The migration history in `_prisma_migrations` does not reflect what is actually in
   the live DB.
2. When `db push` replays the old migration into its shadow DB, that shadow DB ends
   up with stale or incorrect data (e.g. projects referencing teams that don't exist in
   the shadow).
3. When `db push` then tries to add FK constraints, it hits a violation in the shadow
   DB — even though the live DB is perfectly correct.

This is not a data problem. It is a fundamental conflict between `db push`'s shadow DB
mechanism and a database that was not created through Prisma from the start.

### What was done to stabilise this (Phase 6 investigation)

| Action | Reason |
|---|---|
| Removed `multiSchema` and `prismaSchemaFolder` from `previewFeatures` in `base.prisma` | These flags were left over from early experiments. Neither is used. `multiSchema` changed how Prisma's schema engine handled enum creation and caused `workspace_role` to be re-created on every `db push`. |
| Cleared `_prisma_migrations` table | The two existing records (`20260809173250_` and `20260811191427_baseline`) caused the shadow DB to replay bad state. Cleared so `db push` had no history to replay. |
| Added `projects_team_id_fkey` and `teams_leader_id_fkey` directly via `scripts/add-missing-fks.mjs` | These two FKs were missing from the live DB because they were never in the raw SQL bootstrap scripts. Added manually. |
| Nulled orphaned `projects.team_id` rows | Two project rows had `team_id` values pointing to teams that no longer existed. Cleared via `scripts/fix-orphans.mjs`. |
| Replaced `prisma:push` workflow with `prisma:migrate:create` + `apply-migration.mjs` | `migrate --create-only` generates SQL without touching any database. `apply-migration.mjs` applies it directly, skipping the shadow DB entirely. |

---

## Helper scripts (in `scripts/`)

| Script | Purpose |
|---|---|
| `apply-migration.mjs` | Applies a migration SQL file directly to the DB. Skips shadow DB. |
| `add-missing-fks.mjs` | One-time fix — added `projects_team_id_fkey` + `teams_leader_id_fkey`. |
| `fix-orphans.mjs` | One-time fix — nulled orphaned `project.team_id` rows. |
| `check-fk.mjs` | Diagnostic — lists all FK constraints on the live DB. |
| `clear-migration-history.mjs` | One-time fix — cleared stale `_prisma_migrations` records. |

The `add-missing-fks`, `fix-orphans`, `clear-migration-history`, and `check-fk` scripts
were created during the Phase 6 investigation and are safe to delete. `apply-migration.mjs`
is permanent and part of the schema workflow.

---

## Raw SQL files in `prisma/` (legacy — do not re-run)

| File | Applied in |
|---|---|
| `chat_tables.sql` | Phase 7 |
| `wiki_tables.sql` | Phase 4 |
| `wiki_visibility_patch.sql` | Phase 4 patch |
| `patch.sql` | Misc patch |
| `phase6_tables.sql` | Phase 6 |

These are archived reference only. All their tables exist in the live DB.
Do not run them again.

---

## Common Windows lock error (EPERM on .dll.node)

```
EPERM: operation not permitted, unlink '...query_engine-windows.dll.node'
```

A Node process has the Prisma engine DLL locked — usually the running dev server.

**Fix:**
1. Stop the dev server (`Ctrl+C` in the turbo terminal)
2. Re-run `pnpm run prisma:generate`
3. Restart the dev server

If it still fails, open Task Manager → Details, find `node.exe` processes with high
memory usage in this project's path, and end them.

---

## Production / Dockerfile note

`docker/Dockerfile.api` does the following at build time:
1. `node scripts/merge-prisma.js` — merges fragments into `prisma/schema.prisma`
2. `prisma generate --schema prisma/schema.prisma` — builds the Prisma client

At container startup:
3. `prisma migrate deploy --schema prisma/schema.prisma` — applies any pending migrations

For production deployments: generate the migration SQL with `prisma:migrate:create`,
commit the file to the repo, and `migrate deploy` will apply it automatically on the
next container start.
