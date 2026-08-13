# Section 6: Backend & Database Architecture

## 6.1 Fastify Server Structure (`apps/api`)

The backend API is built using **Node.js + Fastify + TypeScript**:

```
apps/api/src/
├── app/
│   ├── server.ts             # Fastify Server instantiation
│   └── plugins/              # Global Fastify Plugins (CORS, Rate Limit, Auth, Error Handler)
├── core/
│   ├── auth/                 # Better Auth session & auth handlers
│   ├── permissions/          # RBAC engine & permission policies
│   ├── search/               # Search indexing & query execution
│   └── events/               # Application-wide In-memory Event Bus
├── infrastructure/
│   ├── database/             # Prisma client instance & extensions
│   ├── storage/              # MinIO S3 client wrapper
│   ├── queue/                # pg-boss background worker queues
│   └── logger/               # Pino logger setup
└── modules/
    ├── workspace/
    ├── projects/
    ├── tasks/
    ├── wiki/
    ├── ai/
    ├── files/
    └── calendar/
```

---

## 6.2 Service Layer & Route Controller Pattern

Business logic **MUST NOT** reside in route handlers. Controllers parse inputs, authorize, and hand off execution to services:

```typescript
// ✅ Correct API Pattern
// modules/projects/projects.routes.ts
export async function projectRoutes(fastify: FastifyInstance) {
  fastify.post('/', {
    schema: { body: createProjectSchema },
    preHandler: [fastify.authenticate, fastify.authorize('projects', 'create')]
  }, async (request, reply) => {
    const project = await projectService.createProject(request.body, request.user);
    return reply.status(201).send(project);
  });
}
```

---

## 6.3 Database Standards (PostgreSQL + Prisma)

- **PostgreSQL 16+** with `uuid-ossp`, `pg_trgm` (trigram search), and `btree_gist`.
- **Multi-Schema File Organization**: Split Prisma schemas stored under `prisma/schema/*.prisma`.

### Standard Model Base Schema
Every domain entity contains standard audit columns:

```prisma
model Task {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId String    @map("workspace_id") @db.Uuid
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at") // Soft delete timestamp
  createdById String    @map("created_by_id") @db.Uuid

  // Domain Fields
  title       String    @db.VarChar(255)
  status      TaskStatus @default(TODO)
  
  // Relations & Indexes
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  createdBy   User      @relation(fields: [createdById], references: [id])

  @@index([workspaceId, status])
  @@index([workspaceId, deletedAt])
  @@map("tasks")
}
```

### Key Database Conventions
1. **UUID Primary Keys**: All database primary keys use PostgreSQL native UUIDs.
2. **Human-Readable Displays**: User-facing identifiers (e.g. `PROJ-102`, `TASK-404`) are separate indexed fields generated sequentially per workspace.
3. **Soft Deletes**: Standard queries automatically filter out records where `deleted_at IS NOT NULL`. Hard deletes are executed asynchronously via `pg-boss` background retention cleanup jobs.
4. **Audit Logging**: All write operations (Create/Update/Delete) stream mutation events into an immutable `audit_logs` table.
