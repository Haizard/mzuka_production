"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function ok<T>(data: T) { return { success: true, data } as const; }
function fail(message: string) { return { success: false, error: message } as const; }

/* ── List all legal documents ─────────────────────────────────────────────── */

export async function listLegalDocuments() {
  const user = await requireAdmin();

  const docs = await prisma.legalDocument.findMany({
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ category: "asc" }, { createdAt: "desc" }],
  });

  return ok(docs);
}

/* ── Create a legal document record ───────────────────────────────────────── */

export async function createLegalDocument(input: {
  title: string;
  description?: string;
  category: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}) {
  const user = await requireAdmin();
  if (!["FOUNDER", "ADMIN"].includes(user.role)) {
    return fail("Only FOUNDER/ADMIN can upload legal documents.");
  }

  const doc = await prisma.legalDocument.create({
    data: {
      title: input.title,
      description: input.description || null,
      category: input.category,
      fileUrl: input.fileUrl || null,
      fileName: input.fileName || null,
      fileSize: input.fileSize || null,
      mimeType: input.mimeType || null,
      uploadedById: user.id,
    },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  return ok(doc);
}

/* ── Toggle published state ───────────────────────────────────────────────── */

export async function toggleLegalDocument(docId: string) {
  const user = await requireAdmin();

  const doc = await prisma.legalDocument.findUnique({ where: { id: docId } });
  if (!doc) return fail("Document not found.");

  const updated = await prisma.legalDocument.update({
    where: { id: docId },
    data: { isPublished: !doc.isPublished },
  });

  return ok(updated);
}

/* ── Delete a legal document ──────────────────────────────────────────────── */

export async function deleteLegalDocument(docId: string) {
  const user = await requireAdmin();
  if (!["FOUNDER", "ADMIN"].includes(user.role)) {
    return fail("Only FOUNDER/ADMIN can delete legal documents.");
  }

  await prisma.legalDocument.delete({ where: { id: docId } });

  return ok({ deleted: true });
}

/* ── Update a legal document ──────────────────────────────────────────────── */

export async function updateLegalDocument(docId: string, input: {
  title?: string;
  description?: string;
  category?: string;
}) {
  const user = await requireAdmin();

  const doc = await prisma.legalDocument.findUnique({ where: { id: docId } });
  if (!doc) return fail("Document not found.");

  const updated = await prisma.legalDocument.update({
    where: { id: docId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category !== undefined && { category: input.category }),
    },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  return ok(updated);
}
