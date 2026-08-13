CREATE TYPE "audit_action" AS ENUM (
  'CREATED',
  'UPDATED',
  'DELETED',
  'COMMENTED',
  'ASSIGNED',
  'STATUS_CHANGED',
  'PRIORITY_CHANGED',
  'MOVED',
  'RESTORED',
  'UPLOADED',
  'MENTIONED'
);

CREATE TABLE "audit_logs" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "workspace_id" UUID        NOT NULL,
  "actor_id"     UUID        NOT NULL,
  "entity_type"  "audit_entity_type" NOT NULL,
  "entity_id"    UUID        NOT NULL,
  "entity_title" VARCHAR(255),
  "action"       "audit_action"      NOT NULL,
  "meta"         JSONB,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
  CONSTRAINT "audit_logs_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "audit_logs_workspace_id_created_at_idx"
  ON "audit_logs" ("workspace_id", "created_at" DESC);

CREATE INDEX "audit_logs_workspace_id_entity_type_idx"
  ON "audit_logs" ("workspace_id", "entity_type");

CREATE INDEX "audit_logs_workspace_id_actor_id_idx"
  ON "audit_logs" ("workspace_id", "actor_id");

CREATE INDEX "audit_logs_entity_id_idx"
  ON "audit_logs" ("entity_id")
