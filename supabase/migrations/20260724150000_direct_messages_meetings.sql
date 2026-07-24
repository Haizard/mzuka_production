-- Direct messaging and virtual-meeting support. Safe to run in Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS public."DirectConversation" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectConversation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DirectConversation_adminId_participantId_key" UNIQUE ("adminId", "participantId"),
  CONSTRAINT "DirectConversation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."User"("id"),
  CONSTRAINT "DirectConversation_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES public."User"("id")
);
CREATE TABLE IF NOT EXISTS public."DirectMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public."DirectConversation"("id") ON DELETE CASCADE,
  CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"("id")
);
CREATE TABLE IF NOT EXISTS public."Meeting" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "roomId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP NOT NULL,
  "endsAt" TIMESTAMP,
  "createdById" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Meeting_roomId_key" UNIQUE ("roomId"),
  CONSTRAINT "Meeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"("id")
);
CREATE INDEX IF NOT EXISTS "DirectConversation_adminId_updatedAt_idx" ON public."DirectConversation" ("adminId", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "DirectConversation_participantId_updatedAt_idx" ON public."DirectConversation" ("participantId", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "DirectMessage_conversationId_createdAt_idx" ON public."DirectMessage" ("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Meeting_isActive_scheduledAt_idx" ON public."Meeting" ("isActive", "scheduledAt");
ALTER TABLE public."DirectConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DirectMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Meeting" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'DirectConversation' AND policyname = 'service_role_all') THEN CREATE POLICY "service_role_all" ON public."DirectConversation" TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'DirectMessage' AND policyname = 'service_role_all') THEN CREATE POLICY "service_role_all" ON public."DirectMessage" TO service_role USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Meeting' AND policyname = 'service_role_all') THEN CREATE POLICY "service_role_all" ON public."Meeting" TO service_role USING (true) WITH CHECK (true); END IF;
END $$;
