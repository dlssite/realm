# 10. Core Modules

## 10.1 Workspace Module
- **Purpose**: Root multi-tenant container for all data.
- **Models**: `Workspace`, `WorkspaceMember`, `Team`, `TeamMember`, `Invitation`.
- **Features**: Workspace settings, custom branding, team groupings, role assignments, user invitations.

## 10.2 Projects Module
- **Purpose**: Manage high-level initiatives, strategic goals, and checkpoints.
- **Models**: `Project`, `ProjectMember`, `Milestone`, `Goal`, `ProjectView`.
- **Views**: Data Table, Kanban Board (by status/stage), Milestone Timeline (Gantt).

## 10.3 Tasks Module
- **Purpose**: Track discrete actionable items (`TASK-101`).
- **Models**: `Task`, `TaskComment`, `TaskAttachment`, `TaskDependency`, `TaskLabel`.
- **Features**: Subtasks (1 level deep), Blocking/Blocked-by dependencies, custom priorities, Kanban drag-and-drop, List, Timeline, and Calendar views.

## 10.4 Wiki Module
- **Purpose**: Centralized team documentation system powered by **TipTap**.
- **Models**: `WikiPage`, `WikiPageVersion`, `WikiTemplate`.
- **Features**: Hierarchical document tree, Notion-style `/` slash commands, callouts, syntax-highlighted code blocks, version history comparison/rollback, page templates, `@mentions`.

## 10.5 AI Module
- **Purpose**: Workspace-wide AI assistant with provider abstraction.
- **Models**: `AiConversation`, `AiMessage`, `AiProviderConfig`.
- **Features**: Connects to OpenAI, Anthropic, or local **Ollama** models. Offers contextual chat assistant, document auto-summarization, smart task generation, and background agent automations.

## 10.6 Files Module
- **Purpose**: Asset management backed by **MinIO** S3 object storage.
- **Models**: `File`, `FileVersion`.
- **Features**: Direct S3 presigned URL uploads, in-app file previews (PDFs, Images, Code, Videos), version replacement.

## 10.7 Calendar Module
- **Purpose**: Unified scheduling and deadline tracking.
- **Models**: `CalendarEvent`, `EventAttendee`.
- **Features**: Consolidates task due dates, project milestones, and calendar events across Month, Week, and Day views.
