DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wiki_visibility') THEN
    CREATE TYPE "wiki_visibility" AS ENUM ('WORKSPACE', 'TEAM', 'PROJECT', 'ROLE');
  END IF;
END$$;

ALTER TABLE "wiki_pages"
  ADD COLUMN IF NOT EXISTS "team_id" UUID,
  ADD COLUMN IF NOT EXISTS "project_id" UUID,
  ADD COLUMN IF NOT EXISTS "visibility" "wiki_visibility" NOT NULL DEFAULT 'WORKSPACE',
  ADD COLUMN IF NOT EXISTS "visibility_role" "workspace_role";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wiki_pages_team_id_fkey'
  ) THEN
    ALTER TABLE "wiki_pages"
      ADD CONSTRAINT "wiki_pages_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wiki_pages_project_id_fkey'
  ) THEN
    ALTER TABLE "wiki_pages"
      ADD CONSTRAINT "wiki_pages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "wiki_pages_team_id_idx" ON "wiki_pages"("team_id");
CREATE INDEX IF NOT EXISTS "wiki_pages_project_id_idx" ON "wiki_pages"("project_id");
