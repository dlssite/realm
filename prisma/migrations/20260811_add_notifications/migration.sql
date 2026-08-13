CREATE TYPE "notification_type" AS ENUM (
  'TASK_ASSIGNED',
  'TASK_MENTIONED',
  'TASK_STATUS_CHANGED',
  'TASK_COMMENT_ADDED',
  'TASK_DUE_SOON',
  'PROJECT_MEMBER_ADDED',
  'MILESTONE_COMPLETED',
  'WORKSPACE_INVITED',
  'MEMBER_ROLE_CHANGED',
  'TEAM_MEMBER_ADDED'
);

CREATE TABLE "notifications" (
  "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
  "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  "recipient_id" UUID          NOT NULL,
  "workspace_id" UUID,
  "type"         "notification_type" NOT NULL,
  "title"        VARCHAR(255)  NOT NULL,
  "body"         VARCHAR(1000),
  "entity_type"  VARCHAR(50)   NOT NULL,
  "entity_id"    UUID          NOT NULL,
  "entity_title" VARCHAR(255),
  "actor_id"     UUID,
  "actor_name"   VARCHAR(255),
  "is_read"      BOOLEAN       NOT NULL DEFAULT false,
  "read_at"      TIMESTAMPTZ,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_recipient_id_fkey"
    FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "notifications_recipient_unread_idx"
  ON "notifications" ("recipient_id", "is_read", "created_at" DESC);

CREATE INDEX "notifications_recipient_created_idx"
  ON "notifications" ("recipient_id", "created_at" DESC);

CREATE INDEX "notifications_workspace_idx"
  ON "notifications" ("workspace_id")
