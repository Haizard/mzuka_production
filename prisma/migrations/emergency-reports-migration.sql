-- ============================================================
-- Emergency Reports Migration for Supabase
-- ============================================================

-- 1. Add new values to AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMERGENCY_REPORT_FILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMERGENCY_REPORT_ESCALATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EMERGENCY_REPORT_RESOLVED';

-- 2. Create enums
DO $$ BEGIN
  CREATE TYPE "ReportSeverity" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ReportCategory" AS ENUM (
    'SICKNESS','INJURY','ACCIDENT','EQUIPMENT_DAMAGE',
    'CLIENT_COMPLAINT','STAFF_CONFLICT','SAFETY_INCIDENT',
    'PROPERTY_DAMAGE','FINANCIAL_DISCREPANCY','OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ReportStatus" AS ENUM ('OPEN','UNDER_REVIEW','RESOLVED','ESCALATED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. EmergencyReport table
CREATE TABLE IF NOT EXISTS "EmergencyReport" (
  "id"               TEXT NOT NULL,
  "title"            TEXT NOT NULL,
  "category"         "ReportCategory" NOT NULL,
  "severity"         "ReportSeverity" NOT NULL DEFAULT 'MEDIUM',
  "description"      TEXT NOT NULL,
  "staffInvolved"    TEXT,
  "witnesses"        TEXT,
  "location"         TEXT,
  "dateOfIncident"   TIMESTAMP(3) NOT NULL,
  "status"           "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "resolutionNotes"  TEXT,
  "resolvedById"     TEXT,
  "resolvedAt"       TIMESTAMP(3),
  "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
  "followUpDate"     TIMESTAMP(3),
  "followUpNotes"    TEXT,
  "attachments"      JSONB,
  "reportedById"     TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmergencyReport_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "EmergencyReport" ADD CONSTRAINT "EmergencyReport_reportedById_fkey"
    FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "EmergencyReport" ADD CONSTRAINT "EmergencyReport_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "EmergencyReport_status_idx" ON "EmergencyReport"("status");
CREATE INDEX IF NOT EXISTS "EmergencyReport_severity_idx" ON "EmergencyReport"("severity");
CREATE INDEX IF NOT EXISTS "EmergencyReport_category_idx" ON "EmergencyReport"("category");
CREATE INDEX IF NOT EXISTS "EmergencyReport_reportedById_idx" ON "EmergencyReport"("reportedById");

-- 4. ReportUpdate table
CREATE TABLE IF NOT EXISTS "ReportUpdate" (
  "id"           TEXT NOT NULL,
  "reportId"     TEXT NOT NULL,
  "authorId"     TEXT NOT NULL,
  "body"         TEXT NOT NULL,
  "isEscalation" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportUpdate_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "ReportUpdate" ADD CONSTRAINT "ReportUpdate_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "EmergencyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ReportUpdate" ADD CONSTRAINT "ReportUpdate_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "ReportUpdate_reportId_idx" ON "ReportUpdate"("reportId");
