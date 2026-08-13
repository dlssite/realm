# 7. Backend Architecture

## 7.1 Fastify Application Structure (`apps/api`)

The backend API is built with **Node.js**, **Fastify**, and **TypeScript**:

```
apps/api/src/
├── app/
│   ├── server.ts               # Fastify initialization
│   ├── plugins/                # Fastify plugins (CORS, Rate limit, Auth, Error Handler)
│   └── hooks/                  # Global request lifecycle hooks
├── core/
│   ├── auth/                   # Better Auth integration & session checking
│   ├── permissions/            # RBAC authorization engine & resource policies
│   ├── search/                 # Search indexing service
│   ├── events/                 # Internal event bus
│   └── notifications/          # Notification dispatcher
├── infrastructure/
│   ├── database/               # Prisma client singleton & extensions
│   ├── storage/                # MinIO S3 client wrapper
│   ├── queue/                  # pg-boss job queue handlers
│   └── logger/                 # Pino structured logger
└── modules/                    # Feature modules (projects, tasks, wiki, etc.)
```

---

## 7.2 Service Layer Pattern (Thin Routes)

Routes must not contain business logic. Routes validate input, perform permission checks, and delegate execution to service methods:

```typescript
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

## 7.3 Request Validation & Error Handling

- **Request Validation**: All route inputs (body, query, params) validated using **Zod** or TypeBox schemas prior to controller execution.
- **Typed Application Errors**: Standardized error classes (`NotFoundError`, `ForbiddenError`, `ValidationError`, `ConflictError`).
- **Global Error Handler**: Converts typed errors into structured JSON responses:
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "Task with id TASK-404 not found",
      "details": null
    }
  }
  ```

---

## 7.4 Logging & Background Job Processing

- **Structured Logging**: Fastify native **Pino** logger. Structured JSON in production; pretty-printed in development. Logs include `requestId`, `userId`, and `workspaceId`.
- **Background Job Queue**: **pg-boss** (PostgreSQL-backed job queue — zero Redis requirement). Handles email notifications, search index updates, file processing, and AI summarizations with exponential retries.
