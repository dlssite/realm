# Section 9: AI Development Rules, Coding Standards & Testing Workflow

## 9.1 The 10 AI Assistant Engineering Rules

1. **Read Before Editing**: AI must inspect relevant `docs/constitution/` files and current module implementations prior to writing code.
2. **No Premature Abstractions**: Avoid generic wrappers or pattern factories unless serving ≥ 3 distinct implementations.
3. **Strict Scope Boundaries**: When modifying one module (e.g. `tasks`), do not alter files in unrelated modules without user consent.
4. **Architecture Rationale First**: AI must state technical intent and list target files before outputting code blocks.
5. **Keep Files Small**: Enforce < 300 lines per file limit. Split oversized components or services logically.
6. **Follow Codebase Patterns**: Mirror existing module conventions, folder layouts, and naming styles.
7. **Explicit Permission Request for Major Changes**: Ask user approval before altering schemas, introducing npm dependencies, or modifying core infrastructure.
8. **Incremental Implementation**: Build data model → backend routes → frontend state → UI layout sequentially.
9. **Write Types First**: Define TypeScript interfaces in `@realm/types` and Zod schemas before coding logic.
10. **Happy Path Testing**: Include unit tests for new service logic upon creation.

---

## 9.2 TypeScript & Code Formatting Standards

- **Strict Mode Enabled**: `"strict": true`, `"noUncheckedIndexedAccess": true`.
- **No `any` Types**: Explicit interfaces required for all data contracts.
- **Naming Conventions**:
  - React Components: `PascalCase.tsx` (`project-card.tsx` -> export `ProjectCard`)
  - Utilities & Services: `kebab-case.ts` (`project.service.ts`)
  - Custom Hooks: `use-*.ts` (`use-projects.ts`)
  - Enums / Constant Arrays: `UPPER_SNAKE_CASE`

---

## 9.3 Testing Strategy

```
      /\
     /  \       E2E Tests (Playwright) — Critical paths (Auth, Task creation flow)
    /----\
   /      \     Integration Tests (Vitest + Supertest) — API endpoints & Prisma queries
  /--------\
 /          \   Unit Tests (Vitest) — Services, Utility functions, Custom Hooks
/------------\
```

- **Target Thresholds**: 80% coverage on core services; 60% coverage on UI components.
- **Database Testing**: API integration tests run against a dedicated isolated test PostgreSQL instance.
