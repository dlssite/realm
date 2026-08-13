# 14. Coding Standards

## 14.1 TypeScript Rules
- `strict: true` and `noUncheckedIndexedAccess: true` enabled globally.
- **No `any` types**: Explicit types or `unknown` required.
- Explicit return types required for exported service functions.

---

## 14.2 Naming Conventions

| Code Element | Naming Convention | Example |
|---|---|---|
| React Components | `kebab-case.tsx` file / `PascalCase` export | `project-card.tsx` → `export function ProjectCard()` |
| Services & Utilities | `kebab-case.ts` file | `project.service.ts` |
| Custom Hooks | `use-*.ts` file / `camelCase` export | `use-projects.ts` → `export function useProjects()` |
| Zod Schemas | `*.schema.ts` file | `create-project.schema.ts` |
| Database Tables | `snake_case` (plural) | `project_members` |
| API Routes | `kebab-case` | `/api/v1/project-members` |

---

## 14.3 Documentation & File Limits
- **Max File Length**: 300 lines max per file (hard constraint).
- **JSDoc**: Required on all exported backend services and shared UI components.
- **Import Ordering**: Node built-ins → Third-party packages → `@realm/*` packages → Relative imports.
