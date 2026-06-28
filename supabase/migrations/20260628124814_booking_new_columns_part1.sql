ALTER TABLE public."Booking"
  ADD COLUMN "endTime" TIMESTAMP,
  ADD COLUMN "eventType" TEXT,
  ADD COLUMN "guestCount" INTEGER,
  ADD COLUMN "venueType" TEXT,
  ADD COLUMN "servicesJson" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "deliverablesJson" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "photoSpecJson" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "videoSpecJson" JSONB NOT NULL DEFAULT '{}';;
