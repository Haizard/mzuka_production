-- ============================================================
-- HR Module Migration Script for Supabase
-- Run this in the Supabase SQL Editor to add:
--   • LeaveRequest table
--   • OnboardingTask table
--   • StaffCommission table
--   • Updated AuditAction enum values
-- ============================================================

-- ── 1. Add new values to AuditAction enum ──────────────────────────────────
-- PostgreSQL requires adding enum values one at a time

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GALLERY_PERMISSIONS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LEAVE_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LEAVE_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LEAVE_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ONBOARDING_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COMMISSION_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COMMISSION_PAID';

-- ── 2. Create LeaveType enum ───────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ── 3. Create LeaveStatus enum ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ── 4. Create OnboardingStatus enum ────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ── 5. Create LeaveRequest table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "LeaveRequest" (
  "id"           TEXT NOT NULL,
  "staffId"      TEXT NOT NULL,
  "type"         "LeaveType" NOT NULL DEFAULT 'ANNUAL',
  "startDate"    TIMESTAMP(3) NOT NULL,
  "endDate"      TIMESTAMP(3) NOT NULL,
  "reason"       TEXT,
  "status"       "LeaveStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewNote"   TEXT,
  "reviewedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "LeaveRequest_staffId_idx" ON "LeaveRequest"("staffId");
CREATE INDEX IF NOT EXISTS "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- ── 6. Create OnboardingTask table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "OnboardingTask" (
  "id"          TEXT NOT NULL,
  "staffId"     TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "category"    TEXT NOT NULL DEFAULT 'general',
  "status"      "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
  "completedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "OnboardingTask_staffId_idx" ON "OnboardingTask"("staffId");

-- ── 7. Create StaffCommission table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "StaffCommission" (
  "id"           TEXT NOT NULL,
  "staffId"      TEXT NOT NULL,
  "bookingId"    TEXT NOT NULL,
  "role"         TEXT NOT NULL,
  "amountCents"  INTEGER NOT NULL DEFAULT 0,
  "percent"      DOUBLE PRECISION,
  "notes"        TEXT,
  "status"       TEXT NOT NULL DEFAULT 'PENDING',
  "approvedById" TEXT,
  "approvedAt"   TIMESTAMP(3),
  "paidAt"       TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StaffCommission_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "StaffCommission" ADD CONSTRAINT "StaffCommission_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "StaffCommission" ADD CONSTRAINT "StaffCommission_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "StaffCommission" ADD CONSTRAINT "StaffCommission_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "StaffCommission_staffId_idx" ON "StaffCommission"("staffId");
CREATE INDEX IF NOT EXISTS "StaffCommission_bookingId_idx" ON "StaffCommission"("bookingId");

-- ── Done ───────────────────────────────────────────────────────────────────
-- All HR tables are now created. Run `npx prisma generate` to regenerate
-- the Prisma client types after applying this migration.
