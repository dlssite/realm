# Prisma Dev Notes

## How schema management works in this project

Schemas are split across `prisma/schema/*.prisma` fragment files — one file per domain
(`base`, `auth`, `workspace`, `projects`, `tasks`, `wiki`, `chat`, `ai`, `files`, `calendar`,
`activity`, `notifications`).

Before any Prisma command runs, all fragments are **merged** into a single
`prisma/schema.prisma` file via `scripts/merge-prisma.js`. Every root script in
`package.json` calls this merge step automatically.

**Never run the `prisma` CLI directly. Always use the root scripts below.**

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
| `pnpm run prisma:push` | ⚠️ Do not use — shadow DB mechanism is incompatible with split-schema workflow. |

---

## Step-by-step example — adding a new feature schema

```bash
# 1. Create prisma/schema/my-feature.prisma with the new model(s)
# 2. Add relations in any other *.prisma files that reference it
# 3. Regenerate client
pnpm run prisma:generate

# 4. Generate migration SQL
pnpm run prisma:migrate:create
#    → Prisma asks: Name of the migration: add_my_feature
#    → File written: prisma/migrations/20261001120000_add_my_feature/migration.sql

# 5. Review the SQL file, then apply it
node --env-file=.env scripts/apply-migration.mjs \
  prisma/migrations/20261001120000_add_my_feature/migration.sql

# 6. Commit both the schema fragment and the migration SQL
git add prisma/schema/my-feature.prisma prisma/migrations/20261001120000_add_my_feature
git commit -m "feat: add my-feature schema"
```

---

## Production / Docker deployment

`docker/Dockerfile.api` does the following at **build time**:
1. `node scripts/merge-prisma.js` — merges fragments into `prisma/schema.prisma`
2. `prisma generate --schema prisma/schema.prisma` — builds the Prisma client

At **container startup**:
3. `node_modules/.bin/prisma migrate deploy --schema=/app/prisma/schema.prisma` — applies any pending migrations automatically

So the deployment workflow is:
- Generate your migration SQL locally with `prisma:migrate:create`
- Commit and push the migration file
- On the next `docker compose up -d --build` the container will apply it automatically

No manual intervention needed on the server.

---

## Migration history

| Migration | Description |
|---|---|
| `20260813000000_baseline` | Clean full-schema baseline for fresh Postgres. Replaces all legacy raw SQL bootstrap files. |

Add new migrations on top following the workflow above.

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
memory usage, and end them.
