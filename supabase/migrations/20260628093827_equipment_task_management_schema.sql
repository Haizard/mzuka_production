-- Enums
CREATE TYPE "EquipmentStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'RETIRED');
CREATE TYPE "ConditionStatus" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED');
CREATE TYPE "ReturnRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- isProductionManager flag on User
ALTER TABLE public."User" ADD COLUMN "isProductionManager" BOOLEAN NOT NULL DEFAULT false;

-- uploadedByStaffId on MediaAsset
ALTER TABLE public."MediaAsset" ADD COLUMN "uploadedByStaffId" TEXT;
ALTER TABLE public."MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedByStaffId_fkey" FOREIGN KEY ("uploadedByStaffId") REFERENCES public."User"("id") ON DELETE SET NULL;

-- Equipment categories
CREATE TABLE public."EquipmentCategory" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EquipmentCategory_name_key" UNIQUE ("name")
);

-- Equipment items
CREATE TABLE public."EquipmentItem" (
  "id"           TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "categoryId"   TEXT NOT NULL,
  "serialNumber" TEXT,
  "condition"    "ConditionStatus" NOT NULL DEFAULT 'GOOD',
  "status"       "EquipmentStatus" NOT NULL DEFAULT 'AVAILABLE',
  "notes"        TEXT,
  "createdAt"    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EquipmentItem_serialNumber_key" UNIQUE ("serialNumber"),
  CONSTRAINT "EquipmentItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."EquipmentCategory"("id")
);

-- Equipment assignments (item loaned to staff for a task)
CREATE TABLE public."EquipmentAssignment" (
  "id"          TEXT NOT NULL,
  "itemId"      TEXT NOT NULL,
  "taskId"      TEXT NOT NULL,
  "assigneeId"  TEXT NOT NULL,
  "assignedAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "returnedAt"  TIMESTAMP,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EquipmentAssignment_itemId_fkey"     FOREIGN KEY ("itemId")     REFERENCES public."EquipmentItem"("id"),
  CONSTRAINT "EquipmentAssignment_taskId_fkey"     FOREIGN KEY ("taskId")     REFERENCES public."ProjectTask"("id") ON DELETE CASCADE,
  CONSTRAINT "EquipmentAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES public."User"("id")
);

-- Equipment return requests
CREATE TABLE public."EquipmentReturn" (
  "id"               TEXT NOT NULL,
  "assignmentId"     TEXT NOT NULL,
  "requestedById"    TEXT NOT NULL,
  "status"           "ReturnRequestStatus" NOT NULL DEFAULT 'PENDING',
  "returnNote"       TEXT,
  "rejectionReason"  TEXT,
  "reviewedById"     TEXT,
  "reviewedAt"       TIMESTAMP,
  "submittedAt"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EquipmentReturn_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EquipmentReturn_assignmentId_fkey"  FOREIGN KEY ("assignmentId")  REFERENCES public."EquipmentAssignment"("id") ON DELETE CASCADE,
  CONSTRAINT "EquipmentReturn_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public."User"("id"),
  CONSTRAINT "EquipmentReturn_reviewedById_fkey"  FOREIGN KEY ("reviewedById")  REFERENCES public."User"("id")
);

-- RLS
ALTER TABLE public."EquipmentCategory"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EquipmentItem"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EquipmentAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EquipmentReturn"     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public."EquipmentCategory"   TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."EquipmentItem"       TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."EquipmentAssignment" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."EquipmentReturn"     TO service_role USING (true) WITH CHECK (true);;
