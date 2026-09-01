-- Migration: Add DEACTIVATED status and new audit actions
-- Run this in the Supabase SQL Editor before deploying the updated Prisma schema.
-- Safe to run multiple times (IF NOT EXISTS guards).

-- 1. Add DEACTIVATED to ApprovalStatus enum (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ApprovalStatus' AND e.enumlabel = 'DEACTIVATED'
  ) THEN
    ALTER TYPE "ApprovalStatus" ADD VALUE 'DEACTIVATED';
  END IF;
END $$;

-- 2. Add ROLE_CHANGED to AuditAction enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ROLE_CHANGED'
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'ROLE_CHANGED';
  END IF;
END $$;

-- 3. Add STAFF_SUSPENDED to AuditAction enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AuditAction' AND e.enumlabel = 'STAFF_SUSPENDED'
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'STAFF_SUSPENDED';
  END IF;
END $$;

-- 4. Add STAFF_ACTIVATED to AuditAction enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AuditAction' AND e.enumlabel = 'STAFF_ACTIVATED'
  ) THEN
    ALTER TYPE "AuditAction" ADD VALUE 'STAFF_ACTIVATED';
  END IF;
END $$;
