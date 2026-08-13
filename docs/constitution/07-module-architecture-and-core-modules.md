# Section 7: Module Architecture & Core Modules

## 7.1 Dynamic Module Registry System

Modules register routes, navigation links, permission requirements, and background jobs automatically via standard registration contracts:

```typescript
// Shared Module Contract Interface
export interface ModuleManifest {
  id: string;
  name: string;
  icon: string;
  routes: RouteDefinition[];
  navigationItems: NavItem[];
  permissions: PermissionRule[];
  eventSubscriptions?: EventSubscriber[];
}
```

Adding a new custom module requires **zero modifications** to existing core module code — only registering the new manifest in `modules/index.ts`.

---

## 7.2 Core Modules Architecture

### 1. Workspace & Organization Module
- Roots all data. Every resource query filters by `workspaceId`.
- Manages multi-tenant Workspaces, Workspace Memberships, Teams, and Invitations.

### 2. Projects Module
- Manages Projects, Milestones, and Strategic Goals.
- Visualizations: List, Kanban, Gantt Timeline.

### 3. Tasks Module
- Tracks individual units of work (`TASK-101`).
- Supports Subtasks (1-level depth max), Blocking/Blocked-by Dependencies, Custom Statuses, and Task Comments with `@mentions`.

### 4. Wiki & Knowledge Base Module
- Notion-style hierarchical document editor powered by **TipTap**.
- Features auto-saving, version history comparison/rollback, page templates, inline page embeds, and full-text indexing.

### 5. AI Module
- Provider-agnostic abstraction wrapping LLM APIs (OpenAI, Anthropic, or local **Ollama** instances).
- Features: Workspace semantic chat assistant, document auto-summarization, smart search answer generation, and custom automated background AI agents.

### 6. Files & Media Storage Module
- Direct browser-to-MinIO uploads via secure presigned S3 URLs.
- In-app previews for PDFs, Images, Markdown, Code snippets, and Video files.

### 7. Calendar Module
- Consolidates project milestones, task due dates, and manual calendar events onto interactive Month, Week, and Day calendar views.
