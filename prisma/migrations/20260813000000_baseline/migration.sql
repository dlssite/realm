-- ─────────────────────────────────────────────────────────────────────────────
-- Realm — Clean Baseline Migration
-- Generated: 2026-08-13
-- Covers the full schema as of the clean-slate Postgres deployment.
-- All previous migrations (raw SQL bootstrap + workaround patches) are replaced
-- by this single file. Future migrations are added on top via prisma:migrate:create.
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE "workspace_role" AS ENUM (
  'OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'GUEST'
);

CREATE TYPE "audit_action" AS ENUM (
  'CREATED', 'UPDATED', 'DELETED', 'COMMENTED', 'ASSIGNED',
  'STATUS_CHANGED', 'PRIORITY_CHANGED', 'MOVED', 'RESTORED', 'UPLOADED', 'MENTIONED'
);

CREATE TYPE "audit_entity_type" AS ENUM (
  'TASK', 'PROJECT', 'MILESTONE', 'WIKI_PAGE', 'COMMENT',
  'CHANNEL', 'FILE', 'WORKSPACE', 'TEAM', 'MEMBER'
);

CREATE TYPE "ai_provider" AS ENUM (
  'OPENROUTER', 'OLLAMA', 'OPENAI', 'ANTHROPIC'
);

CREATE TYPE "event_type" AS ENUM (
  'EVENT', 'TASK', 'MILESTONE'
);

CREATE TYPE "rsvp_status" AS ENUM (
  'PENDING', 'ACCEPTED', 'DECLINED', 'MAYBE'
);

CREATE TYPE "channel_type" AS ENUM (
  'GENERAL', 'TEAM', 'PROJECT', 'CUSTOM'
);

CREATE TYPE "notification_type" AS ENUM (
  'TASK_ASSIGNED', 'TASK_MENTIONED', 'TASK_STATUS_CHANGED', 'TASK_COMMENT_ADDED', 'TASK_DUE_SOON',
  'PROJECT_MEMBER_ADDED', 'MILESTONE_COMPLETED',
  'WORKSPACE_INVITED', 'MEMBER_ROLE_CHANGED', 'TEAM_MEMBER_ADDED'
);

CREATE TYPE "project_status" AS ENUM (
  'PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE "task_status" AS ENUM (
  'BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'
);

CREATE TYPE "task_priority" AS ENUM (
  'URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'
);

CREATE TYPE "wiki_visibility" AS ENUM (
  'WORKSPACE', 'TEAM', 'PROJECT', 'ROLE'
);

-- ── Tables ────────────────────────────────────────────────────────────────────

-- users
CREATE TABLE "users" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  "deleted_at"    TIMESTAMP(3),
  "email"         VARCHAR(255) NOT NULL,
  "name"          VARCHAR(255) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "avatar_url"    VARCHAR(512),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- sessions
CREATE TABLE "sessions" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    UUID         NOT NULL,
  "token"      VARCHAR(255) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
CREATE INDEX "sessions_token_idx" ON "sessions"("token");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- workspaces
CREATE TABLE "workspaces" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  "deleted_at"   TIMESTAMP(3),
  "created_by_id" UUID        NOT NULL,
  "name"         VARCHAR(255) NOT NULL,
  "slug"         VARCHAR(100) NOT NULL,
  "logo_url"     VARCHAR(512),
  CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");
CREATE INDEX "workspaces_slug_idx" ON "workspaces"("slug");
CREATE INDEX "workspaces_deleted_at_idx" ON "workspaces"("deleted_at");

-- workspace_members
CREATE TABLE "workspace_members" (
  "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "workspace_id" UUID          NOT NULL,
  "user_id"      UUID          NOT NULL,
  "role"         "workspace_role" NOT NULL DEFAULT 'MEMBER',
  CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");
CREATE INDEX "workspace_members_workspace_id_idx" ON "workspace_members"("workspace_id");
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- teams
CREATE TABLE "teams" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  "workspace_id" UUID         NOT NULL,
  "leader_id"    UUID,
  "name"         VARCHAR(255) NOT NULL,
  "description"  TEXT,
  CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "teams_workspace_id_idx" ON "teams"("workspace_id");
CREATE INDEX "teams_leader_id_idx" ON "teams"("leader_id");

-- team_members
CREATE TABLE "team_members" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "team_id"    UUID         NOT NULL,
  "user_id"    UUID         NOT NULL,
  CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- invitations
CREATE TABLE "invitations" (
  "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at"   TIMESTAMP(3) NOT NULL,
  "workspace_id" UUID          NOT NULL,
  "email"        VARCHAR(255)  NOT NULL,
  "token"        VARCHAR(255)  NOT NULL,
  "role"         "workspace_role" NOT NULL DEFAULT 'MEMBER',
  "accepted_at"  TIMESTAMP(3),
  CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");
CREATE INDEX "invitations_token_idx" ON "invitations"("token");
CREATE INDEX "invitations_workspace_id_idx" ON "invitations"("workspace_id");

-- projects
CREATE TABLE "projects" (
  "id"            UUID            NOT NULL DEFAULT gen_random_uuid(),
  "created_at"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3)   NOT NULL,
  "deleted_at"    TIMESTAMP(3),
  "workspace_id"  UUID            NOT NULL,
  "created_by_id" UUID            NOT NULL,
  "team_id"       UUID,
  "name"          VARCHAR(255)    NOT NULL,
  "identifier"    VARCHAR(50)     NOT NULL,
  "description"   TEXT,
  "status"        "project_status" NOT NULL DEFAULT 'PLANNED',
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "projects_workspace_id_identifier_key" ON "projects"("workspace_id", "identifier");
CREATE INDEX "projects_workspace_id_idx" ON "projects"("workspace_id");
CREATE INDEX "projects_team_id_idx" ON "projects"("team_id");
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");

-- project_members
CREATE TABLE "project_members" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "project_id" UUID         NOT NULL,
  "user_id"    UUID         NOT NULL,
  "role"       TEXT         NOT NULL DEFAULT 'MEMBER',
  CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- milestones
CREATE TABLE "milestones" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  "project_id"    UUID         NOT NULL,
  "created_by_id" UUID         NOT NULL,
  "name"          VARCHAR(255) NOT NULL,
  "due_date"      TIMESTAMP(3),
  "is_completed"  BOOLEAN      NOT NULL DEFAULT false,
  CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- goals
CREATE TABLE "goals" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  "project_id"    UUID         NOT NULL,
  "created_by_id" UUID         NOT NULL,
  "name"          VARCHAR(255) NOT NULL,
  "target_value"  DOUBLE PRECISION NOT NULL DEFAULT 100.0,
  "current_value" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- tasks
CREATE TABLE "tasks" (
  "id"            UUID           NOT NULL DEFAULT gen_random_uuid(),
  "created_at"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3)  NOT NULL,
  "deleted_at"    TIMESTAMP(3),
  "workspace_id"  UUID           NOT NULL,
  "project_id"    UUID,
  "milestone_id"  UUID,
  "parent_id"     UUID,
  "created_by_id" UUID           NOT NULL,
  "assignee_id"   UUID,
  "identifier"    VARCHAR(50)    NOT NULL,
  "title"         VARCHAR(255)   NOT NULL,
  "description"   TEXT,
  "status"        "task_status"  NOT NULL DEFAULT 'TODO',
  "priority"      "task_priority" NOT NULL DEFAULT 'NONE',
  "due_date"      TIMESTAMP(3),
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tasks_workspace_id_identifier_key" ON "tasks"("workspace_id", "identifier");
CREATE INDEX "tasks_workspace_id_idx" ON "tasks"("workspace_id");
CREATE INDEX "tasks_project_id_idx" ON "tasks"("project_id");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_deleted_at_idx" ON "tasks"("deleted_at");

-- task_comments
CREATE TABLE "task_comments" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "task_id"    UUID         NOT NULL,
  "author_id"  UUID         NOT NULL,
  "body"       TEXT         NOT NULL,
  CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "task_comments_task_id_idx" ON "task_comments"("task_id");

-- labels
CREATE TABLE "labels" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" UUID         NOT NULL,
  "name"         VARCHAR(100) NOT NULL,
  "color"        VARCHAR(20)  NOT NULL DEFAULT '#6366f1',
  CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "labels_workspace_id_name_key" ON "labels"("workspace_id", "name");

-- task_labels
CREATE TABLE "task_labels" (
  "task_id"  UUID NOT NULL,
  "label_id" UUID NOT NULL,
  CONSTRAINT "task_labels_pkey" PRIMARY KEY ("task_id", "label_id")
);

-- task_dependencies
CREATE TABLE "task_dependencies" (
  "blocking_task_id" UUID NOT NULL,
  "blocked_task_id"  UUID NOT NULL,
  CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("blocking_task_id", "blocked_task_id")
);

-- wiki_pages
CREATE TABLE "wiki_pages" (
  "id"                UUID             NOT NULL DEFAULT gen_random_uuid(),
  "created_at"        TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3)    NOT NULL,
  "deleted_at"        TIMESTAMP(3),
  "workspace_id"      UUID             NOT NULL,
  "created_by_id"     UUID             NOT NULL,
  "parent_id"         UUID,
  "team_id"           UUID,
  "project_id"        UUID,
  "title"             VARCHAR(255)     NOT NULL,
  "slug"              VARCHAR(255)     NOT NULL,
  "is_published"      BOOLEAN          NOT NULL DEFAULT false,
  "latest_version_id" UUID,
  "visibility"        "wiki_visibility" NOT NULL DEFAULT 'WORKSPACE',
  "visibility_role"   "workspace_role",
  CONSTRAINT "wiki_pages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "wiki_pages_workspace_id_idx" ON "wiki_pages"("workspace_id");
CREATE INDEX "wiki_pages_parent_id_idx" ON "wiki_pages"("parent_id");
CREATE INDEX "wiki_pages_team_id_idx" ON "wiki_pages"("team_id");
CREATE INDEX "wiki_pages_project_id_idx" ON "wiki_pages"("project_id");

-- wiki_page_versions
CREATE TABLE "wiki_page_versions" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id"  UUID         NOT NULL,
  "page_id"        UUID         NOT NULL,
  "title"          VARCHAR(255) NOT NULL,
  "content"        JSONB,
  "version_number" INTEGER      NOT NULL,
  "change_summary" TEXT,
  CONSTRAINT "wiki_page_versions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "wiki_page_versions_page_id_idx" ON "wiki_page_versions"("page_id");

-- wiki_templates
CREATE TABLE "wiki_templates" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID        NOT NULL,
  "workspace_id" UUID         NOT NULL,
  "name"         VARCHAR(255) NOT NULL,
  "description"  TEXT,
  "content"      JSONB,
  CONSTRAINT "wiki_templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "wiki_templates_workspace_id_idx" ON "wiki_templates"("workspace_id");

-- channels
CREATE TABLE "channels" (
  "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  "deleted_at"   TIMESTAMP(3),
  "workspace_id" UUID          NOT NULL,
  "created_by_id" UUID         NOT NULL,
  "team_id"      UUID,
  "project_id"   UUID,
  "name"         VARCHAR(100)  NOT NULL,
  "description"  TEXT,
  "type"         "channel_type" NOT NULL DEFAULT 'CUSTOM',
  "is_archived"  BOOLEAN       NOT NULL DEFAULT false,
  CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "channels_workspace_id_name_key" ON "channels"("workspace_id", "name");
CREATE INDEX "channels_workspace_id_idx" ON "channels"("workspace_id");
CREATE INDEX "channels_team_id_idx" ON "channels"("team_id");
CREATE INDEX "channels_project_id_idx" ON "channels"("project_id");

-- channel_members
CREATE TABLE "channel_members" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "channel_id"   UUID         NOT NULL,
  "user_id"      UUID         NOT NULL,
  "role"         TEXT         NOT NULL DEFAULT 'MEMBER',
  "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "channel_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "channel_members_channel_id_user_id_key" ON "channel_members"("channel_id", "user_id");
CREATE INDEX "channel_members_channel_id_idx" ON "channel_members"("channel_id");
CREATE INDEX "channel_members_user_id_idx" ON "channel_members"("user_id");

-- chat_messages
CREATE TABLE "chat_messages" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  "deleted_at"  TIMESTAMP(3),
  "channel_id"  UUID         NOT NULL,
  "sender_id"   UUID         NOT NULL,
  "parent_id"   UUID,
  "content"     TEXT         NOT NULL,
  "attachments" JSONB        DEFAULT '[]',
  "is_pinned"   BOOLEAN      NOT NULL DEFAULT false,
  "is_edited"   BOOLEAN      NOT NULL DEFAULT false,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "chat_messages_channel_id_created_at_idx" ON "chat_messages"("channel_id", "created_at");
CREATE INDEX "chat_messages_sender_id_idx" ON "chat_messages"("sender_id");

-- message_reactions
CREATE TABLE "message_reactions" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "message_id" UUID         NOT NULL,
  "user_id"    UUID         NOT NULL,
  "emoji"      VARCHAR(50)  NOT NULL,
  CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "message_reactions_message_id_user_id_emoji_key" ON "message_reactions"("message_id", "user_id", "emoji");
CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions"("message_id");

-- file_records
CREATE TABLE "file_records" (
  "id"             UUID          NOT NULL DEFAULT gen_random_uuid(),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  "deleted_at"     TIMESTAMP(3),
  "workspace_id"   UUID          NOT NULL,
  "uploaded_by_id" UUID          NOT NULL,
  "project_id"     UUID,
  "storage_key"    VARCHAR(1024) NOT NULL,
  "bucket"         VARCHAR(255)  NOT NULL,
  "filename"       VARCHAR(512)  NOT NULL,
  "content_type"   VARCHAR(255)  NOT NULL,
  "size_bytes"     BIGINT        NOT NULL,
  CONSTRAINT "file_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "file_records_workspace_id_idx" ON "file_records"("workspace_id");
CREATE INDEX "file_records_project_id_idx" ON "file_records"("project_id");
CREATE INDEX "file_records_deleted_at_idx" ON "file_records"("deleted_at");

-- file_versions
CREATE TABLE "file_versions" (
  "id"             UUID          NOT NULL DEFAULT gen_random_uuid(),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "file_record_id" UUID          NOT NULL,
  "uploaded_by_id" UUID          NOT NULL,
  "storage_key"    VARCHAR(1024) NOT NULL,
  "size_bytes"     BIGINT        NOT NULL,
  "version_label"  VARCHAR(50)   NOT NULL DEFAULT 'v1',
  CONSTRAINT "file_versions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "file_versions_file_record_id_idx" ON "file_versions"("file_record_id");

-- calendar_events
CREATE TABLE "calendar_events" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  "deleted_at"    TIMESTAMP(3),
  "workspace_id"  UUID         NOT NULL,
  "created_by_id" UUID         NOT NULL,
  "project_id"    UUID,
  "team_id"       UUID,
  "title"         VARCHAR(255) NOT NULL,
  "description"   TEXT,
  "type"          "event_type" NOT NULL DEFAULT 'EVENT',
  "starts_at"     TIMESTAMP(3) NOT NULL,
  "ends_at"       TIMESTAMP(3) NOT NULL,
  "is_all_day"    BOOLEAN      NOT NULL DEFAULT false,
  "color"         VARCHAR(20)  NOT NULL DEFAULT '#7c3aed',
  CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "calendar_events_workspace_id_idx" ON "calendar_events"("workspace_id");
CREATE INDEX "calendar_events_workspace_id_starts_at_ends_at_idx" ON "calendar_events"("workspace_id", "starts_at", "ends_at");
CREATE INDEX "calendar_events_deleted_at_idx" ON "calendar_events"("deleted_at");

-- event_attendees
CREATE TABLE "event_attendees" (
  "id"       UUID         NOT NULL DEFAULT gen_random_uuid(),
  "event_id" UUID         NOT NULL,
  "user_id"  UUID         NOT NULL,
  "rsvp"     "rsvp_status" NOT NULL DEFAULT 'PENDING',
  CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "event_attendees_event_id_user_id_key" ON "event_attendees"("event_id", "user_id");
CREATE INDEX "event_attendees_event_id_idx" ON "event_attendees"("event_id");
CREATE INDEX "event_attendees_user_id_idx" ON "event_attendees"("user_id");

-- audit_logs
CREATE TABLE "audit_logs" (
  "id"           UUID                NOT NULL DEFAULT gen_random_uuid(),
  "created_at"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "workspace_id" UUID                NOT NULL,
  "actor_id"     UUID                NOT NULL,
  "entity_type"  "audit_entity_type" NOT NULL,
  "entity_id"    UUID                NOT NULL,
  "entity_title" VARCHAR(255),
  "action"       "audit_action"      NOT NULL,
  "meta"         JSONB,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_workspace_id_created_at_idx" ON "audit_logs"("workspace_id", "created_at" DESC);
CREATE INDEX "audit_logs_workspace_id_entity_type_idx" ON "audit_logs"("workspace_id", "entity_type");
CREATE INDEX "audit_logs_workspace_id_actor_id_idx" ON "audit_logs"("workspace_id", "actor_id");
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- ai_provider_configs
CREATE TABLE "ai_provider_configs" (
  "id"             UUID          NOT NULL DEFAULT gen_random_uuid(),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  "workspace_id"   UUID          NOT NULL,
  "provider"       "ai_provider" NOT NULL DEFAULT 'OPENROUTER',
  "api_key"        TEXT,
  "base_url"       VARCHAR(512),
  "model_name"     VARCHAR(255)  NOT NULL DEFAULT 'anthropic/claude-3.5-sonnet',
  "allowed_models" JSONB         NOT NULL DEFAULT '[]',
  "is_active"      BOOLEAN       NOT NULL DEFAULT true,
  CONSTRAINT "ai_provider_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ai_provider_configs_workspace_id_key" ON "ai_provider_configs"("workspace_id");

-- ai_conversations
CREATE TABLE "ai_conversations" (
  "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  "workspace_id"      UUID         NOT NULL,
  "created_by_id"     UUID         NOT NULL,
  "title"             VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
  "active_model_name" VARCHAR(255),
  CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_conversations_workspace_id_idx" ON "ai_conversations"("workspace_id");
CREATE INDEX "ai_conversations_created_by_id_idx" ON "ai_conversations"("created_by_id");

-- ai_messages
CREATE TABLE "ai_messages" (
  "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "conversation_id" UUID         NOT NULL,
  "role"            VARCHAR(50)  NOT NULL,
  "content"         TEXT         NOT NULL,
  "tokens"          INTEGER,
  "tool_calls"      JSONB,
  CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages"("conversation_id");

-- notifications
CREATE TABLE "notifications" (
  "id"           UUID                NOT NULL DEFAULT gen_random_uuid(),
  "created_at"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recipient_id" UUID                NOT NULL,
  "workspace_id" UUID,
  "type"         "notification_type" NOT NULL,
  "title"        VARCHAR(255)        NOT NULL,
  "body"         VARCHAR(1000),
  "entity_type"  VARCHAR(50)         NOT NULL,
  "entity_id"    UUID                NOT NULL,
  "entity_title" VARCHAR(255),
  "actor_id"     UUID,
  "actor_name"   VARCHAR(255),
  "is_read"      BOOLEAN             NOT NULL DEFAULT false,
  "read_at"      TIMESTAMP(3),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_recipient_id_is_read_created_at_idx" ON "notifications"("recipient_id", "is_read", "created_at" DESC);
CREATE INDEX "notifications_recipient_id_created_at_idx" ON "notifications"("recipient_id", "created_at" DESC);
CREATE INDEX "notifications_workspace_id_idx" ON "notifications"("workspace_id");

-- ── Foreign Keys ──────────────────────────────────────────────────────────────

-- sessions
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- workspaces
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;

-- workspace_members
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- teams
ALTER TABLE "teams" ADD CONSTRAINT "teams_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_leader_id_fkey"
  FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- team_members
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- invitations
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- projects
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- project_members
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- milestones
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- goals
ALTER TABLE "goals" ADD CONSTRAINT "goals_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- tasks
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestone_id_fkey"
  FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "tasks"("id") ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey"
  FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON UPDATE CASCADE;

-- task_comments
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON UPDATE CASCADE;

-- labels
ALTER TABLE "labels" ADD CONSTRAINT "labels_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- task_labels
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_label_id_fkey"
  FOREIGN KEY ("label_id") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- task_dependencies
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_blocking_task_id_fkey"
  FOREIGN KEY ("blocking_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_blocked_task_id_fkey"
  FOREIGN KEY ("blocked_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- wiki_pages
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON UPDATE CASCADE;
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "wiki_pages"("id") ON UPDATE CASCADE;
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON UPDATE CASCADE;
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON UPDATE CASCADE;

-- wiki_page_versions
ALTER TABLE "wiki_page_versions" ADD CONSTRAINT "wiki_page_versions_page_id_fkey"
  FOREIGN KEY ("page_id") REFERENCES "wiki_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wiki_page_versions" ADD CONSTRAINT "wiki_page_versions_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;

-- wiki_templates
ALTER TABLE "wiki_templates" ADD CONSTRAINT "wiki_templates_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON UPDATE CASCADE;
ALTER TABLE "wiki_templates" ADD CONSTRAINT "wiki_templates_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;

-- channels
ALTER TABLE "channels" ADD CONSTRAINT "channels_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "channels" ADD CONSTRAINT "channels_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "channels" ADD CONSTRAINT "channels_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "channels" ADD CONSTRAINT "channels_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- channel_members
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channel_id_fkey"
  FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- chat_messages
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_channel_id_fkey"
  FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey"
  FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- message_reactions
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- file_records
ALTER TABLE "file_records" ADD CONSTRAINT "file_records_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_records" ADD CONSTRAINT "file_records_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "file_records" ADD CONSTRAINT "file_records_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- file_versions
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_file_record_id_fkey"
  FOREIGN KEY ("file_record_id") REFERENCES "file_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;

-- calendar_events
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- event_attendees
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- audit_logs
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ai_provider_configs
ALTER TABLE "ai_provider_configs" ADD CONSTRAINT "ai_provider_configs_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ai_conversations
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;

-- ai_messages
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- notifications
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey"
  FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
