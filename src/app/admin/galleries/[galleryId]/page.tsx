import Link from "next/link";
import { ArrowLeft, GalleryHorizontalEnd, User, CreditCard } from "lucide-react";
import { requireAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { GalleryDetailWrapper } from "./GalleryDetailWrapper";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ galleryId: string }>;
}

export default async function AdminGalleryDetailPage({ params }: Props) {
  await requireAdminAccess("/admin/galleries");
  const { galleryId } = await params;

  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    include: {
      booking: {
        include: {
          client: { select: { name: true, email: true } },
          payments: { select: { status: true, amountCents: true } },
        },
      },
      mediaAssets: {
        orderBy: { createdAt: "desc" },
        include: { aiAnalysis: true },
      },
    },
  });

  if (!gallery) notFound();

  const isPaid    = gallery.booking.payments.some((p) => p.status === "PAID");
  const draftCount = gallery.mediaAssets.filter((a) => a.releaseStatus === "DRAFT").length;
  const totalPaid  = gallery.booking.payments.reduce((s, p) => s + p.amountCents, 0);

  const assets = gallery.mediaAssets.map((a) => ({
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
  }));

  return (
    <main className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admin/galleries"
          className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Galleries
        </Link>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-700/30 flex items-center justify-center shrink-0">
            <GalleryHorizontalEnd className="h-5 w-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Gallery Detail</p>
            <h1 className="text-2xl font-bold text-white">{gallery.title}</h1>
            <p className="text-sm text-zinc-400 mt-0.5">{gallery.booking.title}</p>
          </div>
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-zinc-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Client</p>
          </div>
          <p className="text-sm font-semibold text-white truncate">{gallery.booking.client.name}</p>
          <p className="text-xs text-zinc-500 truncate">{gallery.booking.client.email}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-zinc-500" />
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Payment</p>
          </div>
          <p className={`text-sm font-semibold ${isPaid ? "text-emerald-400" : "text-amber-400"}`}>
            {isPaid ? "Fully Paid" : "Unpaid"}
          </p>
          {totalPaid > 0 && (
            <p className="text-xs text-zinc-500">${(totalPaid / 100).toFixed(2)} received</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Expires</p>
          <p className="text-sm font-semibold text-white">
            {gallery.expiresAt
              ? new Date(gallery.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "No expiry"}
          </p>
          <p className="text-xs text-zinc-500">
            {gallery.mediaAssets.length} asset{gallery.mediaAssets.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* AI Analysis Panel — interactive client component */}
      <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-5">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-widest text-violet-400 font-semibold">AI Photo Scoring</p>
          <h2 className="text-lg font-bold text-white mt-0.5">Analyze &amp; Release</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Scores: sharpness, lighting, composition, colour, background, faces, emotion (0–100).
            {" "}≥70 = recommended for release.
            {" "}Works immediately — shows placeholder scores when API key not yet configured.
          </p>
        </div>
        <GalleryDetailWrapper
          galleryId={gallery.id}
          initialAssets={assets}
          draftCount={draftCount}
        />
      </div>
    </main>
  );
}
