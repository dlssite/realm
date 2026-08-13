# 8. Database Architecture

## 8.1 PostgreSQL Standards

- **Engine**: PostgreSQL 16+
- **Extensions**:
  - `uuid-ossp`: Native UUID generation.
  - `pg_trgm`: Trigram fuzzy search indexes.
  - `btree_gist`: GiST index support for range constraints (scheduling/calendar).

---

## 8.2 Multi-Schema Prisma Organization

Prisma schemas are modularized into domain files under `prisma/schema/*.prisma`:

```
prisma/schema/
├── base.prisma         # Generator & datasource config
├── auth.prisma         # Users, Sessions, Accounts
├── workspace.prisma    # Workspaces, WorkspaceMembers, Teams
├── projects.prisma     # Projects, Milestones, Goals
├── tasks.prisma        # Tasks, Comments, Dependencies, Labels
├── wiki.prisma         # WikiPages, Versions, Templates
├── files.prisma        # File metadata, Versions
├── ai.prisma           # AiConversations, Messages, ProviderConfigs
└── calendar.prisma     # CalendarEvents, Attendees
```

---

## 8.3 Standard Model Blueprint

Every user-facing model includes standard audit fields:

```prisma
model Task {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId String    @map("workspace_id") @db.Uuid
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")
  createdById String    @map("created_by_id") @db.Uuid

  title       String    @db.VarChar(255)
  identifier  String    @map("identifier") // e.g. "TASK-102"
  status      TaskStatus @default(TODO)

  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  createdBy   User      @relation(fields: [createdById], references: [id])

  @@index([workspaceId, status])
  @@index([workspaceId, deletedAt])
  @@map("tasks")
}
```

---

## 8.4 Database Rules & Strategies

1. **UUID Primary Keys**: All database PKs use native UUIDs (`gen_random_uuid()`).
2. **Human Display Identifiers**: Display keys (`PROJ-12`, `TASK-404`) are separate indexed string fields generated sequentially per workspace.
3. **Soft Deletes**: Deletion operations populate `deleted_at`. Prisma extension automatically filters out soft-deleted records. Cleanup background jobs hard-delete records after 30 days.
4. **Audit Log Table**: Write operations stream events into an immutable append-only `audit_logs` table.
5. **Forward-Only Migrations**: All migration files are forward-only and named descriptively (`20260801_add_task_dependencies`).
