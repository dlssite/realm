# 🎯 Phase 3: Projects & Tasks Core Engine

**Status:** ✅ Complete (+ Enhanced)
**Target Timeframe:** Weeks 9–16  
**Primary Goal:** Full project and task management with Data Table, Kanban Board, Timeline, Task Drawer, Milestones, Goals, Labels & Dependencies.

---

## 📋 Task Checklist

### Step 5: Projects & Tasks Core Engine (Original)
- [x] Create `projects.prisma` schema models (`Project`, `ProjectMember`, `Milestone`, `Goal`).
- [x] Create `tasks.prisma` schema models (`Task`, `TaskComment`, `Label`, `TaskLabel`, `TaskDependency`).
- [x] Update `auth.prisma` and `workspace.prisma` with reverse relations.
- [x] Implement backend `projects` module CRUD routes & services.
- [x] Implement backend `tasks` module CRUD routes, comments, and filter queries.
- [x] Add `generateIdentifier` utility for `PROJ-N` and `TASK-N` display IDs.
- [x] Register all new routes in `main.ts`.
- [x] Build **List View**: Data table with status dropdown, priority, assignee, due date.
- [x] Build **Kanban Board**: 6-column drag-and-drop board via HTML5 native DnD + PATCH status call.
- [x] Wire projects and tasks pages into React Router with lazy loading.

### Phase 3 Enhancement: Enterprise PM Upgrade
- [x] **Project Detail Page** (`/projects/:projectId`): Tabbed workspace with Overview, Tasks, and Timeline tabs.
- [x] **Milestones API**: `POST`, `PATCH`, `DELETE` milestone sub-routes on project; check-off toggle UI.
- [x] **Strategic Goals API**: `POST`, `PATCH`, `DELETE` goal sub-routes; progress bar visualization.
- [x] **Task Detail Drawer**: Slide-over panel with editable title, description, status/priority/due date.
- [x] **Subtasks**: Inline creation inside drawer; progress bar; expandable rows in List view.
- [x] **Task Dependencies (Blocking/Blocked-by)**: REST endpoints + dependency badge + "BLOCKED" indicator.
- [x] **Workspace Labels**: `GET /labels`, `POST /labels`, per-task add/remove label endpoints; color-coded tag picker.
- [x] **Multi-criteria Filter Toolbar**: Live search + project, status, priority, label filters on tasks page.
- [x] **Timeline / Gantt View**: 14-day rolling grid showing tasks as colored span bars and milestones as flag markers.
- [x] Router updated with `/projects/:projectId` lazy route.

---

## 🔍 Verification & Acceptance Criteria
- [x] Tasks can be created, viewed in List, Kanban, and Timeline views.
- [x] Tasks update status on Kanban drop (PATCH call).
- [x] Projects list shows identifier, task counts, and milestones.
- [x] Clicking a project row navigates to `/projects/:projectId` detail workspace.
- [x] Milestones can be created and checked off; completion is persisted.
- [x] Strategic goals show a live progress bar based on `currentValue / targetValue`.
- [x] Clicking any task row or card opens `TaskDetailDrawer`.
- [x] Subtasks can be added inline; toggling them off marks as DONE.
- [x] Dependency selector marks a task as "Blocked by TASK-X".
- [x] Workspace label tags can be assigned/removed from any task.
- [x] Filter toolbar narrows tasks by search text, project, status, priority, and label.
- [x] Timeline view renders task date spans and milestone flags on a 14-day calendar grid.
- [x] Full monorepo `pnpm build` passes with 0 TypeScript errors (7/7 packages).
