-- Add teamId to file_records so files can be tagged to a team directly
-- (in addition to the existing projectId which scopes to a project)

ALTER TABLE "file_records"
  ADD COLUMN "team_id" UUID REFERENCES "teams"("id") ON DELETE SET NULL;

CREATE INDEX "file_records_team_id_idx" ON "file_records"("team_id");
