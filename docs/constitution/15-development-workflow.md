# 15. Development Workflow

## 15.1 Feature Development Pipeline

```
1. Requirement Analysis    ──► Understand requirements & affected modules
2. Architecture Decision   ──► Draft technical approach or ADR if major change
3. Database Design         ──► Define Prisma schema changes & migrations
4. API Specification       ──► Define REST routes & Zod validation schemas
5. UI Layout Design        ──► Wireframe responsive layout & state requirements
6. Implementation          ──► Types → Migration → Backend → SDK → Frontend
7. Automated Testing       ──► Service unit tests & integration checks
8. Documentation           ──► Update module README & API docs
```

---

## 15.2 Git & Commit Conventions

- **Branch Naming**: `<type>/<task-id>-<short-description>` (e.g. `feature/TASK-102-add-task-dependencies`).
- **Conventional Commit Messages**:
  - `feat(tasks): add task dependency management`
  - `fix(wiki): resolve editor image upload memory leak`
  - `chore(deps): update prisma ORM to v6.2`

---

## 15.3 Pre-Merge Code Checklist

- [ ] All TypeScript types are explicit (zero `any`).
- [ ] Zod schema validation applied to API request handlers.
- [ ] Permission checks enforced on backend endpoints.
- [ ] Responsive design verified across Desktop, Tablet, and Mobile breakpoints.
- [ ] Loading skeletons and error boundaries present for new views.
- [ ] Unit/Integration tests pass clean.
