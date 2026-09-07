-- ============================================================
-- Notifications & Client Memory Migration for Supabase
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── 1. In-App Notifications ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "InAppNotification" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "link"      TEXT,
  "readAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "InAppNotification_userId_readAt_idx" ON "InAppNotification"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "InAppNotification_userId_createdAt_idx" ON "InAppNotification"("userId", "createdAt");

-- ── 2. Client Memory ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ClientMemory" (
  "id"               TEXT NOT NULL,
  "clientId"         TEXT NOT NULL,
  "preferredName"    TEXT,
  "birthday"         TIMESTAMP(3),
  "anniversary"      TIMESTAMP(3),
  "preferredContact" TEXT DEFAULT 'email',
  "notes"            TEXT,
  "preferences"      JSONB,
  "totalSessions"    INTEGER NOT NULL DEFAULT 0,
  "totalSpentCents"  INTEGER NOT NULL DEFAULT 0,
  "lastSessionAt"    TIMESTAMP(3),
  "lastContactAt"    TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClientMemory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClientMemory_clientId_key" UNIQUE ("clientId")
);

DO $$ BEGIN
  ALTER TABLE "ClientMemory" ADD CONSTRAINT "ClientMemory_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 3. Notification Preferences ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "id"              TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "emailEnabled"    BOOLEAN NOT NULL DEFAULT true,
  "smsEnabled"      BOOLEAN NOT NULL DEFAULT true,
  "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
  "pushEnabled"     BOOLEAN NOT NULL DEFAULT true,
  "typeOverrides"   JSONB,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationPreference_userId_key" UNIQUE ("userId")
);

DO $$ BEGIN
  ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Done ───────────────────────────────────────────────────────────────────
