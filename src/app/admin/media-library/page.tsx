"use server";

import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Camera, Film, Eye, Download, Star, GalleryHorizontalEnd } from "lucide-react";

async function getMediaLibraryData() {
  await requireAdmin();

  const [totalAssets, photos, videos, released, totalDownloads, galleries, recentAssets] = await Promise.all([
    prisma.mediaAsset.count(),
    prisma.mediaAsset.count({ where: { kind: "PHOTO" } }),
    prisma.mediaAsset.count({ where: { kind: "VIDEO" } }),
    prisma.mediaAsset.count({ where: { releaseStatus: "RELEASED" } }),
    prisma.download.count(),
    prisma.gallery.findMany({
      include: {
        _count: { select: { mediaAssets: true } },
        booking: { select: { title: true, client: { select: { name: true } } } },
        mediaAssets: {
          where: { releaseStatus: "RELEASED" },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        gallery: {
          select: {
            title: true,
            booking: { select: { title: true, client: { select: { name: true } } } },
          },
        },
        aiAnalysis: { select: { overallScore: true } },
        _count: { select: { downloads: true } },
      },
    }),
  ]);

  return { totalAssets, photos, videos, released, totalDownloads, galleries, recentAssets };
}

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fileSize(bytes: bigint | null) {
  if (!bytes) return "—";
  const n = Number(bytes);
  if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(n / 1_000)} KB`;
}

const STATUS_COLOURS: Record<string, string> = {
  DRAFT:    "bg-zinc-700/50 text-zinc-400",
  REVIEWED: "bg-blue-500/15 text-blue-300",
  RELEASED: "bg-emerald-500/15 text-emerald-300",
  HIDDEN:   "bg-red-500/15 text-red-400",
};

export default async function MediaLibraryPage() {
  const data = await getMediaLibraryData();

  return (
    <main className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">MG AI Command Center</p>
        <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <GalleryHorizontalEnd className="h-6 w-6 text-[var(--gold)]" />
          Media Library
        </h2>
        <p className="mt-1 text-sm text-zinc-400">All photos and videos across every gallery</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Assets",   value: data.totalAssets,   icon: GalleryHorizontalEnd, colour: "text-white" },
          { label: "Photos",         value: data.photos,         icon: Camera,               colour: "text-blue-400" },
          { label: "Videos",         value: data.videos,         icon: Film,                 colour: "text-violet-400" },
          { label: "Released",       value: data.released,       icon: Eye,                  colour: "text-emerald-400" },
          { label: "Downloads",      value: data.totalDownloads, icon: Download,             colour: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/10 bg-[var(--surface)] p-4 flex items-center gap-3">
            <s.icon className={`h-6 w-6 ${s.colour} shrink-0`} />
            <div>
              <p className={`text-xl font-bold ${s.colour}`}>{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Galleries overview */}
      <div className="rounded-lg border border-white/10 bg-[var(--surface)] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Galleries</h3>
          <Link href="/admin/galleries" className="text-xs text-[var(--gold)] hover:underline">Manage galleries →</Link>
        </div>
        {data.galleries.length === 0 ? (
          <p className="px-6 py-8 text-center text-zinc-500 text-sm">No galleries yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-zinc-500 uppercase">
                  <th className="px-5 py-3">Gallery</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Released</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.galleries.map((g) => (
                  <tr key={g.id} className="hover:bg-white/5 transition">
                    <td className="px-5 py-3">
                      <p className="text-white font-medium">{g.title}</p>
                      <p className="text-xs text-zinc-500">{g.booking?.title}</p>
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{g.booking?.client?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-right text-zinc-300">{g._count.mediaAssets}</td>
                    <td className="px-5 py-3 text-right text-emerald-400">{g.mediaAssets.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent assets */}
      <div className="rounded-lg border border-white/10 bg-[var(--surface)]">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white">Recent Media Assets</h3>
        </div>
        {data.recentAssets.length === 0 ? (
          <p className="px-6 py-8 text-center text-zinc-500 text-sm">No media uploaded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-zinc-500 uppercase">
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3">Gallery</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">AI Score</th>
                  <th className="px-5 py-3 text-right">DLs</th>
                  <th className="px-5 py-3 text-right">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.recentAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-white/5 transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {asset.kind === "PHOTO"
                          ? <Camera className="h-4 w-4 text-blue-400 shrink-0" />
                          : <Film className="h-4 w-4 text-violet-400 shrink-0" />}
                        <p className="text-white truncate max-w-[160px]">{asset.filename}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-400 text-xs">{asset.gallery?.title ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOURS[asset.releaseStatus] ?? "text-zinc-400"}`}>
                        {asset.releaseStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {asset.aiAnalysis ? (
                        <span className={`text-xs font-bold flex items-center justify-end gap-1 ${asset.aiAnalysis.overallScore >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
                          <Star className="h-3 w-3" />{asset.aiAnalysis.overallScore}
                        </span>
                      ) : <span className="text-zinc-600 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-400 text-xs">{asset._count.downloads}</td>
                    <td className="px-5 py-3 text-right text-zinc-500 text-xs">{fileSize(asset.sizeBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
