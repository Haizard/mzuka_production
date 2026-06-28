-- Enums
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "ExpenseCategory" AS ENUM ('EQUIPMENT', 'TRAVEL', 'EDITING', 'MARKETING', 'SOFTWARE', 'VENUE', 'STAFF', 'OTHER');
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'EXPIRED', 'CANCELLED');

-- Invoice table
CREATE TABLE public."Invoice" (
  "id"            TEXT NOT NULL,
  "bookingId"     TEXT,
  "clientId"      TEXT NOT NULL,
  "number"        TEXT NOT NULL,
  "status"        "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotalCents" INTEGER NOT NULL DEFAULT 0,
  "taxCents"      INTEGER NOT NULL DEFAULT 0,
  "totalCents"    INTEGER NOT NULL DEFAULT 0,
  "currency"      TEXT NOT NULL DEFAULT 'USD',
  "notes"         TEXT,
  "dueAt"         TIMESTAMP,
  "paidAt"        TIMESTAMP,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Invoice_number_key" UNIQUE ("number"),
  CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"("id") ON DELETE SET NULL,
  CONSTRAINT "Invoice_clientId_fkey"  FOREIGN KEY ("clientId")  REFERENCES public."User"("id")
);

-- Invoice line items
CREATE TABLE public."InvoiceItem" (
  "id"          TEXT NOT NULL,
  "invoiceId"   TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity"    INTEGER NOT NULL DEFAULT 1,
  "unitCents"   INTEGER NOT NULL DEFAULT 0,
  "totalCents"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"("id") ON DELETE CASCADE
);

-- Expense table
CREATE TABLE public."Expense" (
  "id"          TEXT NOT NULL,
  "category"    "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
  "description" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL DEFAULT 0,
  "currency"    TEXT NOT NULL DEFAULT 'USD',
  "receiptUrl"  TEXT,
  "bookingId"   TEXT,
  "recordedAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Expense_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"("id") ON DELETE SET NULL
);

-- Contract table
CREATE TABLE public."Contract" (
  "id"         TEXT NOT NULL,
  "bookingId"  TEXT,
  "clientId"   TEXT NOT NULL,
  "title"      TEXT NOT NULL,
  "body"       TEXT NOT NULL,
  "status"     "ContractStatus" NOT NULL DEFAULT 'DRAFT',
  "signedAt"   TIMESTAMP,
  "expiresAt"  TIMESTAMP,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Contract_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Contract_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"("id") ON DELETE SET NULL,
  CONSTRAINT "Contract_clientId_fkey"  FOREIGN KEY ("clientId")  REFERENCES public."User"("id")
);

-- RLS
ALTER TABLE public."Invoice"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InvoiceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Expense"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Contract"    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public."Invoice"     TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."InvoiceItem" TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."Expense"     TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public."Contract"    TO service_role USING (true) WITH CHECK (true);;
