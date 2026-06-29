import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const galleryId = req.nextUrl.searchParams.get("galleryId");
    if (!galleryId) return NextResponse.json({ error: "galleryId required" }, { status: 400 });

    const assets = await prisma.mediaAsset.findMany({
      where: { galleryId },
      orderBy: { createdAt: "desc" },
      include: { aiAnalysis: true },
    });

    const draftCount = assets.filter((a) => a.releaseStatus === "DRAFT").length;

    return NextResponse.json({
      assets: assets.map((a) => ({
        id:            a.id,
        filename:      a.filename,
        kind:          a.kind,
        releaseStatus: a.releaseStatus,
        previewKey:    a.previewKey,
        aiAnalysis:    a.aiAnalysis
          ? {
              sharpness:    a.aiAnalysis.sharpness,
              lighting:     a.aiAnalysis.lighting,
              faceQuality:  a.aiAnalysis.faceQuality,
              composition:  a.aiAnalysis.composition,
              colorGrade:   a.aiAnalysis.colorGrade,
              background:   a.aiAnalysis.background,
              emotion:      a.aiAnalysis.emotion,
              overallScore: a.aiAnalysis.overallScore,
              notes:        a.aiAnalysis.notes,
            }
          : null,
      })),
      draftCount,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
