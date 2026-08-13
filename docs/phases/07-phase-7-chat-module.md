# 🎯 Phase 7: Realtime Workspace Chat & Channel Messaging

**Status:** ⏸️ Planned / Pending  
**Target Timeframe:** Phase 7  
**Primary Goal:** Real-time WebSocket channel-based workspace group chat system with team & project scoping, leader moderation, strict role-based creation rules, no DMs, and high-aesthetic UI/UX.

---

## 📋 Task Checklist

### Step 9: Realtime Chat & Channel Messaging Engine
- [ ] Create `chat.prisma` schema models (`Channel`, `ChannelMember`, `ChatMessage`, `MessageReaction`).
- [ ] Register `@fastify/websocket` in Fastify API server with session cookie / Bearer token authentication handshake.
- [ ] Implement WebSocket Connection & Room Subscription Manager (joining channel rooms, broadcasting messages, typing indicators, online presence).
- [ ] Build REST API endpoints for Channel Management:
  - `GET /api/v1/workspaces/:workspaceId/channels` (List visible channels based on member roles & team/project memberships)
  - `POST /api/v1/workspaces/:workspaceId/channels` (Create custom channel — Owner & Admin only)
  - `POST /api/v1/workspaces/:workspaceId/teams/:teamId/channel` (Enable/Provision Team channel — Owner, Admin, Manager)
  - `POST /api/v1/workspaces/:workspaceId/projects/:projectId/channel` (Enable/Provision Project channel — Owner, Admin, Manager)
  - `GET /api/v1/workspaces/:workspaceId/channels/:channelId/messages` (Paginated historical messages)
  - `POST /api/v1/workspaces/:workspaceId/channels/:channelId/messages` (Send HTTP fallback message)
  - `DELETE /api/v1/workspaces/:workspaceId/channels/:channelId/messages/:messageId` (Delete message — Author, Team Leader, or Admin)
  - `POST /api/v1/workspaces/:workspaceId/channels/:channelId/messages/:messageId/pin` (Pin message — Team Leader or Admin)
  - `POST /api/v1/workspaces/:workspaceId/channels/:channelId/messages/:messageId/reactions` (Add/toggle emoji reaction)
- [ ] Enforce Access & Visibility Rules:
  - **No Direct Messages (DMs)**: System strictly operates on group channels.
  - **Team Channels**: Accessible by team members + Admins/Owners. Team Leaders can manage channel settings, pin messages, and moderate content.
  - **Project Channels**: Accessible by project members / assigned team + Admins/Owners.
  - **Admin View**: Workspace Admins & Owners have full visibility over all workspace channels.
- [ ] Build Frontend Chat Interface (`apps/web/src/modules/chat/`):
  - `ChatPage`: Main layout with sidebar and responsive channel drawer.
  - `ChannelSidebar`: Grouped sections for 🌐 General, 👥 Team, and 📁 Project channels with unread badges and search filter.
  - `CreateChannelModal`: Owner/Admin UI for provisioning new channels.
  - `ChatCanvas`: Active channel header, pinned messages banner, date-grouped message feed, sticky input bar.
  - `ChatMessageItem`: Author avatar, role badge (Leader, Admin, Owner), formatted content, attachment viewer, emoji reactions, message action menu.
  - `ChatInput`: Textarea with auto-resize, emoji picker, file dropzone attachment, typing status emitter.
- [ ] Build Frontend Real-time Store (`useChatStore`):
  - WS connection lifecycle management with exponential backoff auto-reconnect.
  - Optimistic UI message sending with delivery status (`sending`, `sent`, `error`).
  - Active channel typing indicators and member online presence.
- [ ] Add `/chat` route in `router.tsx` and sidebar navigation item in `AppLayout`.

---

## 🔍 Verification & Acceptance Criteria
- [ ] Real-time messages broadcast instantly across concurrent WebSocket connections without page refresh.
- [ ] Non-team/non-project members are forbidden from viewing or subscribing to private team/project channels unless they are Admins/Owners.
- [ ] Team Leaders can pin/delete messages and edit topics within their team channels.
- [ ] Attempting to send a DM is blocked by schema and API design.
- [ ] UI looks premium with glassmorphism, responsive sidebar toggle, dark mode, smooth message animations, and full monorepo build success (`pnpm build`).
