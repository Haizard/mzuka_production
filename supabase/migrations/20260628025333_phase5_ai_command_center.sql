-- AI Chat sessions
CREATE TABLE public."AiChat" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "title"     TEXT NOT NULL DEFAULT 'New Chat',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiChat_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE CASCADE
);

-- AI Chat messages
CREATE TABLE public."AiMessage" (
  "id"        TEXT NOT NULL,
  "chatId"    TEXT NOT NULL,
  "role"      TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES public."AiChat"("id") ON DELETE CASCADE
);

-- Academy / training modules
CREATE TABLE public."AcademyModule" (
  "id"          TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "content"     TEXT NOT NULL,
  "category"    TEXT NOT NULL DEFAULT 'general',
  "order"       INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademyModule_pkey" PRIMARY KEY ("id")
);

-- RLS
ALTER TABLE public."AiChat"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AiMessage"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AcademyModule" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public."AiChat"        TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."AiMessage"     TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."AcademyModule" TO service_role USING (true) WITH CHECK (true);;
