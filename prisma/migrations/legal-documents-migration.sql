-- ============================================================
-- Legal Documents Migration for Supabase
-- ============================================================

-- 1. LegalDocument table
CREATE TABLE IF NOT EXISTS "LegalDocument" (
  "id"           TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "description"  TEXT,
  "category"     TEXT NOT NULL DEFAULT 'other',
  "fileUrl"      TEXT,
  "fileName"     TEXT,
  "fileSize"     INTEGER,
  "mimeType"     TEXT,
  "isPublished"  BOOLEAN NOT NULL DEFAULT true,
  "uploadedById" TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "LegalDocument_category_idx" ON "LegalDocument"("category");
CREATE INDEX IF NOT EXISTS "LegalDocument_uploadedById_idx" ON "LegalDocument"("uploadedById");
