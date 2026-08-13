-- Create Wiki tables
CREATE TABLE IF NOT EXISTS "wiki_pages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "workspace_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "parent_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "latest_version_id" UUID,

    CONSTRAINT "wiki_pages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wiki_pages_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
    CONSTRAINT "wiki_pages_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT,
    CONSTRAINT "wiki_pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "wiki_pages"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "wiki_page_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" JSONB,
    "version_number" INTEGER NOT NULL,
    "change_summary" TEXT,

    CONSTRAINT "wiki_page_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wiki_page_versions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "wiki_pages"("id") ON DELETE CASCADE,
    CONSTRAINT "wiki_page_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "wiki_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "content" JSONB,

    CONSTRAINT "wiki_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wiki_templates_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
    CONSTRAINT "wiki_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "wiki_pages_workspace_id_idx" ON "wiki_pages"("workspace_id");
CREATE INDEX IF NOT EXISTS "wiki_pages_parent_id_idx" ON "wiki_pages"("parent_id");
CREATE INDEX IF NOT EXISTS "wiki_page_versions_page_id_idx" ON "wiki_page_versions"("page_id");
CREATE INDEX IF NOT EXISTS "wiki_templates_workspace_id_idx" ON "wiki_templates"("workspace_id");
