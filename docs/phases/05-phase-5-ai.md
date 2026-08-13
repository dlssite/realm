# 🎯 Phase 5: Search & Workspace AI Engine (Emberlyn)

**Status:** ✅ COMPLETE (Enhanced with Modular Tools)
**Completed:** 2026-08-10 | **Enhanced:** 2026-08-12
**Primary Goal:** PostgreSQL trigram global search, AI workspace assistant integration, and full agentic tool-calling system.

---

## 📋 Task Checklist

### Step 7: Full-Text Search & AI Integration (Original)
- [x] Add `pg_trgm` GIN search indexes across Tasks, Projects, Wiki pages, and Files.
- [x] Connect global search endpoint to `cmdk` Command Palette (`⌘K`).
- [x] Create `ai.prisma` schema models (`AiConversation`, `AiMessage`, `AiProviderConfig`).
- [x] Build AI provider abstraction layer (OpenRouter + local **Ollama** models).
- [x] Build full-page Emberlyn AI chat interface at `/ai` (Gemini/ChatGPT-style UI).
- [x] Implement workspace-scoped `allowedModels` curation by Owner/Admin in Settings.
- [x] Implement in-chat model switcher pill (default = `allowedModels[0]`).
- [x] Implement full **conversation memory** — all prior messages sent to model on every call.
- [x] Inject rich **user & workspace context** into Emberlyn system prompt (name, email, workspace, date/time).
- [x] Emberlyn persona: female, wise, mature, caring, concise & professional on tasks.
- [x] ChatGPT/Gemini chat bubble layout (right-aligned user pill, borderless assistant flow).
- [x] Message action bar: Copy, Thumbs Up, Thumbs Down.
- [x] Code block syntax highlighting with language badge & Copy Code button.
- [x] Conversation history sidebar with per-conversation delete.

### Step 7B: Emberlyn Modular Tools — Agentic System (Enhancement)
- [x] Extend `ai.prisma` — add `toolCalls Json?` field to `AiMessage` for persisting tool execution metadata.
- [x] Create `ToolContext` interface and `EmberlynTool` contract at `apps/api/src/core/ai/tool-context.ts`.
- [x] Build **Tasks tools** — `search_tasks`, `get_task`, `create_task`, `update_task`, `add_task_comment`, `create_subtask`, `assign_task`, `set_task_due_date`.
- [x] Build **Projects tools** — `list_projects`, `get_project`, `create_project`, `update_project`, `create_milestone`, `update_milestone`, `create_goal`, `update_goal`.
- [x] Build **Wiki tools** — `search_wiki`, `get_wiki_page`, `list_wiki_pages`, `create_wiki_page`, `update_wiki_page`.
- [x] Build **Calendar tools** — `get_calendar_feed`, `create_event`, `update_event`, `delete_event`, `rsvp_event`.
- [x] Build **Workspace tools** — `list_workspace_members`, `get_member`, `list_teams`, `get_team`, `list_files`, `get_file_info`, `global_search`.
- [x] Create `emberlyn-tools.ts` — central tool registry exporting OpenAI-compatible `tools[]` array + `executeToolCall` dispatcher.
- [x] Upgrade `POST /:workspaceId/ai/chat` with full agentic loop: tool definitions injected into LLM request, `tool_calls` response handling, server-side execution, result fed back to model (5-iteration cap).
- [x] All tool calls executed **as the authenticated user** — inherits RBAC permissions, enforced by existing route-level checks.
- [x] All tool invocations persisted on `AiMessage.toolCalls` JSON field for audit and replay.
- [x] Extend Emberlyn system prompt with **Capabilities block** describing available tools.

---

## 🧰 Emberlyn Tool Catalog

### Module: Tasks (8 tools)
| Tool | Description |
|---|---|
| `search_tasks` | List/filter tasks by project, status, priority, assignee, or text query |
| `get_task` | Read a single task with comments, subtasks, labels, and dependencies |
| `create_task` | Create a new task with title, description, project, status, priority, assignee, due date |
| `update_task` | Update any task field (status, priority, assignee, due date, title, description) |
| `add_task_comment` | Post a comment on a task on behalf of the user |
| `create_subtask` | Create a subtask under a parent task |
| `assign_task` | Assign or reassign a task to a workspace member |
| `set_task_due_date` | Set or clear a task's due date |

### Module: Projects (8 tools)
| Tool | Description |
|---|---|
| `list_projects` | List all workspace projects with status and member count |
| `get_project` | Get a project with milestones, goals, and member list |
| `create_project` | Create a new project with name, description, status, team |
| `update_project` | Update project name, description, or status |
| `create_milestone` | Add a milestone to a project with optional due date |
| `update_milestone` | Mark a milestone complete or update its due date |
| `create_goal` | Add a strategic goal with target value |
| `update_goal` | Update goal progress (currentValue) |

### Module: Wiki (5 tools)
| Tool | Description |
|---|---|
| `search_wiki` | Full-text search across wiki pages |
| `get_wiki_page` | Read the full content of a wiki page |
| `list_wiki_pages` | List all pages in the workspace or a project |
| `create_wiki_page` | Create a new wiki page with optional content |
| `update_wiki_page` | Update a wiki page's title or content |

### Module: Calendar (5 tools)
| Tool | Description |
|---|---|
| `get_calendar_feed` | Get all events, task due dates, and milestones for a date range |
| `create_event` | Create a calendar event with title, time, color, project/team scope |
| `update_event` | Update an existing calendar event |
| `delete_event` | Delete a calendar event |
| `rsvp_event` | RSVP to a calendar event (ACCEPTED/DECLINED/MAYBE) |

### Module: Workspace & Files (7 tools)
| Tool | Description |
|---|---|
| `list_workspace_members` | List all workspace members with roles |
| `get_member` | Look up a member by name or email |
| `list_teams` | List all teams in the workspace |
| `get_team` | Get a team with its full member list |
| `list_files` | List files in the workspace or within a project |
| `get_file_info` | Get metadata for a specific file |
| `global_search` | Cross-module full-text search across tasks, projects, wiki, and files |

**Total: 33 tools across 5 modules**

---

## 🏗️ Architecture

```
User Message
    │
    ▼
POST /ai/chat
    │
    ├─ Build Emberlyn system prompt (with Capabilities block)
    ├─ Load conversation history
    ├─ Attach tools[] array (OpenAI function-calling format)
    │
    ▼
LLM Request (OpenRouter / Ollama)
    │
    ├─ [Choice A] text response  ──────────────────► Save & return to user
    │
    └─ [Choice B] tool_calls[]
           │
           ▼
      Execute tool server-side (as authenticated user, RBAC enforced)
           │
           ▼
      Append tool result message
           │
           ▼
      Re-call LLM (loop, max 5 iterations)
           │
           ▼
      Final text response  ─────────────────────────► Save & return to user
```

### Permission Model
- Emberlyn executes tools **as the calling user** — she inherits their RBAC role
- All DB writes carry `createdById = userId` — audit trail is accurate
- `AiMessage.toolCalls` JSON field persists every tool call and its result summary
- The 5-iteration loop cap prevents runaway agentic loops

---

## 🔍 Verification & Acceptance Criteria

### Original (Phase 5)
- [x] Command Palette returns debounced fuzzy search hits.
- [x] AI assistant responds contextually with full conversation history.
- [x] AI assistant knows the user's name, workspace, and current date/time.
- [x] Workspace can switch to local Ollama instance without code alterations.
- [x] All 7 monorepo packages build cleanly (`pnpm build` — 7/7 successful).

### Enhancement (Phase 5B)
- [x] Emberlyn can list, read, create, and update tasks via tool calls.
- [x] Emberlyn can list, read, create, and update projects, milestones, and goals.
- [x] Emberlyn can search and read wiki pages.
- [x] Emberlyn can query the calendar feed and create/RSVP events.
- [x] Emberlyn can look up workspace members and teams by name.
- [x] Emberlyn can search files and return metadata.
- [x] All tool calls are persisted on `AiMessage.toolCalls` for audit.
- [x] Tool execution respects user RBAC — no permission bypass.
- [x] Agentic loop capped at 5 iterations to prevent runaway execution.
- [x] TypeScript compiles with zero errors.

---

## 📁 New Files Created

```
apps/api/src/core/ai/
├── tool-context.ts          # EmberlynTool interface + ToolContext type
├── emberlyn-tools.ts        # Central registry + executeToolCall dispatcher
└── tools/
    ├── tasks.tools.ts       # 8 task tools
    ├── projects.tools.ts    # 8 project tools
    ├── wiki.tools.ts        # 5 wiki tools
    ├── calendar.tools.ts    # 5 calendar tools
    └── workspace.tools.ts   # 7 workspace/files/search tools
```

### Modified Files
- `prisma/schema/ai.prisma` — Added `toolCalls Json?` to `AiMessage`
- `apps/api/src/modules/ai/ai.routes.ts` — Upgraded chat endpoint with agentic loop
- `docs/phases/05-phase-5-ai.md` — This file
- `docs/memory/STATE.md` — ADR 015
