-- Add staffRole to User table
ALTER TABLE public."User" ADD COLUMN "staffRole" TEXT;

-- Set default staffRole for existing staff
UPDATE public."User" SET "staffRole" = 'PHOTOGRAPHER' WHERE role = 'STAFF' AND "isProductionManager" = false;
UPDATE public."User" SET "staffRole" = 'PRODUCTION_MANAGER' WHERE role = 'STAFF' AND "isProductionManager" = true;
UPDATE public."User" SET "staffRole" = 'ADMIN' WHERE role IN ('ADMIN', 'FOUNDER');;
