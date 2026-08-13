-- ── Phase 6 Tables: Files & Calendar ─────────────────────────────────────────
-- Run this against the database to add the Phase 6 tables without touching
-- existing data or migration history.
-- Safe to run multiple times (IF NOT EXISTS guards on everything).

-- ── Enums ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "event_type" AS ENUM ('EVENT', 'TASK', 'MILESTONE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "rsvp_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'MAYBE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── file_records ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS file_records (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP(3),
  workspace_id    UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uploaded_by_id  UUID        NOT NULL REFERENCES users(id),
  project_id      UUID        REFERENCES projects(id) ON DELETE SET NULL,
  storage_key     VARCHAR(1024) NOT NULL,
  bucket          VARCHAR(255)  NOT NULL,
  filename        VARCHAR(512)  NOT NULL,
  content_type    VARCHAR(255)  NOT NULL,
  size_bytes      BIGINT        NOT NULL
);

CREATE INDEX IF NOT EXISTS file_records_workspace_id_idx ON file_records(workspace_id);
CREATE INDEX IF NOT EXISTS file_records_project_id_idx   ON file_records(project_id);
CREATE INDEX IF NOT EXISTS file_records_deleted_at_idx   ON file_records(deleted_at);

-- ── file_versions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS file_versions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  file_record_id  UUID        NOT NULL REFERENCES file_records(id) ON DELETE CASCADE,
  uploaded_by_id  UUID        NOT NULL REFERENCES users(id),
  storage_key     VARCHAR(1024) NOT NULL,
  size_bytes      BIGINT        NOT NULL,
  version_label   VARCHAR(50)   NOT NULL DEFAULT 'v1'
);

CREATE INDEX IF NOT EXISTS file_versions_file_record_id_idx ON file_versions(file_record_id);

-- ── calendar_events ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS calendar_events (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP(3),
  workspace_id UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by_id UUID        NOT NULL REFERENCES users(id),
  project_id   UUID         REFERENCES projects(id) ON DELETE SET NULL,
  team_id      UUID         REFERENCES teams(id)    ON DELETE SET NULL,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  type         "event_type" NOT NULL DEFAULT 'EVENT',
  starts_at    TIMESTAMP(3) NOT NULL,
  ends_at      TIMESTAMP(3) NOT NULL,
  is_all_day   BOOLEAN      NOT NULL DEFAULT false,
  color        VARCHAR(20)  NOT NULL DEFAULT '#7c3aed'
);

CREATE INDEX IF NOT EXISTS calendar_events_workspace_id_idx
  ON calendar_events(workspace_id);
CREATE INDEX IF NOT EXISTS calendar_events_workspace_range_idx
  ON calendar_events(workspace_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS calendar_events_deleted_at_idx
  ON calendar_events(deleted_at);

-- ── event_attendees ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_attendees (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID        NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id  UUID        NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
  rsvp     "rsvp_status" NOT NULL DEFAULT 'PENDING',
  CONSTRAINT event_attendees_event_id_user_id_key UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS event_attendees_event_id_idx ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS event_attendees_user_id_idx  ON event_attendees(user_id);
