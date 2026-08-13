# 9. Module Architecture

## 9.1 Module Registration Contract

The system supports future custom modules seamlessly. Modules register with the platform through explicit typed registration contracts:

```typescript
export interface ModuleDefinition {
  id: string;                    // Unique identifier: 'projects', 'tasks', 'wiki'
  name: string;                  // Display name: 'Projects', 'Tasks', 'Wiki'
  icon: LucideIcon;             // Sidebar icon
  description: string;          // Module summary

  // Frontend Registration
  routes: RouteObject[];        // React Router route definitions
  navigation: NavigationItem[]; // Sidebar menu integration
  searchProvider?: SearchProvider; // Search indexer integration

  // Backend Registration
  apiRoutes: (fastify: FastifyInstance) => void; // Fastify API route handler
  permissions: PermissionDefinition[];            // RBAC permission matrix
  events?: EventSubscription[];                   // Event bus listeners
  jobs?: JobDefinition[];                         // Background queue jobs
}
```

---

## 9.2 Module Isolation Rules

1. **No Direct Cross-Module Imports**: Module A (`projects`) must not import internal components or services from Module B (`wiki`).
2. **Communication Mechanisms**:
   - **Event Bus**: Modules emit asynchronous events (e.g. `task.completed`).
   - **Core Platform Services**: Auth, Permissions, Storage, and Search are mediated through platform core.
   - **Shared Contracts**: Cross-module DTOs live in `@realm/types`.
3. **Database Independence**: Services query only their own database tables. Cross-module data retrieval occurs via service calls or foreign key IDs.
4. **Zero-Modification Extension**: Adding a new module requires creating `modules/<new-module>` and listing it in `modules/index.ts` without modifying existing module code.
