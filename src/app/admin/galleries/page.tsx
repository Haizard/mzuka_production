"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, Loader2, Check, X, Sparkles, Star, Trash2, AlertTriangle } from "lucide-react";
import {
  uploadMediaAssetAction,
  generatePreviewAction,
  analyzeGalleryAction,
  getAdminGalleries,
  releaseMediaAssetsAction,
  cleanupOrphanedAssetsAction,
} from "./actions";
import { prisma } from "@/lib/db";

interface AiAnalysis {
  overallScore: number;
  sharpness: number;
  lighting: number;
  composition: number;
  notes: string;
  recommendRelease?: boolean;
}

interface MediaAsset {
  id: string;
  filename: string;
  kind: string;
  releaseStatus: string;
  previewKey: string | null;
  originalKey: string;
  createdAt: Date;
  aiAnalysis?: AiAnalysis | null;
}

interface Gallery {
  id: string;
  title: string;
  slug: string;
  createdAt: Date;
  mediaAssets: MediaAsset[];
  booking: {
    id: string;
    title: string;
    client: { name: string };
    payments: { status: string }[];
  };
}

export default function AdminGalleriesPage() {
  const [galleries, setGalleries]         = useState<Gallery[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [uploadingId, setUploadingId]     = useState<string | null>(null);
  const [uploadError, setUploadError]     = useState<string | null>(null);
  const [releaseLoading, setReleaseLoading]   = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading]   = useState<string | null>(null);
  const [cleanupMsg, setCleanupMsg]           = useState<string | null>(null);

  const loadGalleries = useCallback(async () => {
    const result = await getAdminGalleries();
    if (result.success) setGalleries(result.galleries as unknown as Gallery[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGalleries();
  }, [loadGalleries]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    galleryId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected after a failure
    e.target.value = "";

    setUploadingId(galleryId);
    setUploadError(null);

    try {
      const mediaKind = file.type.startsWith("video/") ? "VIDEO" : "PHOTO";

      // Step 1 — create DB record + get presigned PUT URL
      const uploadResult = await uploadMediaAssetAction(
        galleryId,
        file.name,
        file.type,
        mediaKind,
        undefined,
        undefined,
        file.size
      );

      if (!uploadResult.success || !uploadResult.uploadUrl || !uploadResult.mediaAsset) {
        setUploadError(uploadResult.error ?? "Failed to prepare upload");
        return;
      }

      // Step 2 — PUT file directly to S3
      let s3Ok = false;
      try {
        const s3Response = await fetch(uploadResult.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        s3Ok = s3Response.ok;
      } catch (fetchErr) {
        console.error("S3 PUT failed:", fetchErr);
      }

      if (!s3Ok) {
        // S3 upload failed — clean up the orphaned DB record immediately
        await cleanupOrphanedAssetsAction(galleryId);
        setUploadError("Upload to storage failed. Please try again.");
        return;
      }

      // Step 3 — generate watermarked preview (server-side, photos only)
      // Non-blocking — if this fails the upload is still successful
      generatePreviewAction(uploadResult.mediaAsset.id)
        .catch((err) => console.error("[galleries] preview generation failed:", err));

      await loadGalleries();

    } catch (error) {
      console.error("Upload error:", error);
      setUploadError("An unexpected error occurred. Please try again.");
      // Clean up any orphaned record
      await cleanupOrphanedAssetsAction(galleryId);
    } finally {
      setUploadingId(null);
    }
  };

  const handleReleaseMedia = async (galleryId: string) => {
    setReleaseLoading(galleryId);
    await releaseMediaAssetsAction(galleryId);
    await loadGalleries();
    setReleaseLoading(null);
  };

  const handleAnalyzeGallery = async (galleryId: string) => {
    setAnalysisLoading(galleryId);
    await analyzeGalleryAction(galleryId);
    await loadGalleries();
    setAnalysisLoading(null);
  };

  const handleCleanup = async (galleryId: string) => {
    setCleanupLoading(galleryId);
    setCleanupMsg(null);
    const result = await cleanupOrphanedAssetsAction(galleryId);
    if (result.success) {
      setCleanupMsg(
        result.removed > 0
          ? `Removed ${result.removed} failed upload${result.removed > 1 ? "s" : ""}`
          : "No orphaned files found"
      );
      await loadGalleries();
    }
    setCleanupLoading(null);
    setTimeout(() => setCleanupMsg(null), 4000);
  };

  return (
    <main className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Galleries</h2>
        <p className="mt-1 text-sm text-zinc-400">Manage client photo and video galleries</p>
      </div>

      {cleanupMsg && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          ✓ {cleanupMsg}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-[var(--surface)]">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-400">Loading galleries…</div>
        ) : galleries.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">No galleries yet. Create one from a booking.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {galleries.map((gallery) => {
              // Count orphaned = assets with no previewKey AND kind=PHOTO (may have failed)
              const draftCount    = gallery.mediaAssets.filter((a) => a.releaseStatus === "DRAFT").length;
              const releasedCount = gallery.mediaAssets.filter((a) => a.releaseStatus === "RELEASED").length;
              const isPaid        = gallery.booking.payments.some((p) => p.status === "PAID");

              return (
                <div key={gallery.id} className="p-6 hover:bg-white/5 transition">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-semibold text-white">{gallery.title}</h3>
                      <p className="text-sm text-zinc-400">{gallery.booking.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Client: {gallery.booking.client.name}</p>
                    </div>
                    <div className="text-right text-xs text-zinc-500 space-y-0.5">
                      <p><span className="text-white font-semibold">{gallery.mediaAssets.length}</span> total</p>
                      <p><span className="text-emerald-400 font-semibold">{releasedCount}</span> released</p>
                      <p>{isPaid ? "✓ Paid" : "Unpaid"}</p>
                    </div>
                  </div>

                  {/* Media list */}
                  {gallery.mediaAssets.length > 0 && (
                    <div className="mb-4 rounded-lg bg-white/5 p-4">
                      <p className="text-xs text-zinc-500 uppercase mb-3">
                        Media ({gallery.mediaAssets.length})
                      </p>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {gallery.mediaAssets.map((asset) => {
                          const hasPreview = !!asset.previewKey;
                          const isOrphan   = !hasPreview && asset.kind === "PHOTO";
                          return (
                            <div
                              key={asset.id}
                              className={`flex items-center justify-between text-sm p-2 rounded ${
                                isOrphan ? "bg-red-500/10 border border-red-500/20" : "bg-white/5"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className={`truncate ${isOrphan ? "text-red-300" : "text-white"}`}>
                                  {asset.filename}
                                  {isOrphan && (
                                    <span className="ml-2 text-xs text-red-400 font-medium">(upload failed)</span>
                                  )}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  {asset.kind === "PHOTO" ? "📷" : "🎥"} {asset.kind}
                                  {hasPreview && <span className="ml-1 text-emerald-500">· preview ready</span>}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 ml-3 shrink-0">
                                {asset.kind === "PHOTO" && asset.aiAnalysis && (
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    asset.aiAnalysis.overallScore >= 70
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : "bg-red-500/20 text-red-300"
                                  }`}>
                                    <Star className="inline h-3 w-3 mb-0.5 mr-0.5" />
                                    {asset.aiAnalysis.overallScore}
                                  </span>
                                )}
                                {asset.releaseStatus === "RELEASED"
                                  ? <Check className="h-4 w-4 text-emerald-400" />
                                  : <X className="h-4 w-4 text-zinc-500" />
                                }
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Upload error */}
                  {uploadError && uploadingId === null && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {uploadError}
                    </div>
                  )}

                  {/* Actions row */}
                  <div className="flex flex-wrap gap-2">
                    {/* Upload */}
                    <label className="flex-1 min-w-[180px] relative cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/quicktime,video/x-matroska"
                        onChange={(e) => handleFileUpload(e, gallery.id)}
                        disabled={uploadingId === gallery.id}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-white/10 hover:border-[var(--gold)]/40 rounded-lg p-4 text-center transition">
                        {uploadingId === gallery.id ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-[var(--gold)]" />
                            <p className="text-sm text-zinc-400">Uploading…</p>
                          </>
                        ) : (
                          <>
                            <Upload className="h-5 w-5 mx-auto mb-2 text-zinc-500" />
                            <p className="text-sm text-zinc-400">Upload photo or video</p>
                            <p className="text-xs text-zinc-600 mt-0.5">jpg, png, webp, mp4, mov, mkv</p>
                          </>
                        )}
                      </div>
                    </label>

                    <div className="flex flex-col gap-2">
                      {/* Cleanup failed uploads — show if any asset has no previewKey */}
                      {gallery.mediaAssets.some((a) => !a.previewKey) && (
                        <button
                          onClick={() => handleCleanup(gallery.id)}
                          disabled={cleanupLoading === gallery.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-sm font-medium transition disabled:opacity-50"
                          title="Remove failed upload records"
                        >
                          {cleanupLoading === gallery.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />
                          }
                          Clean failed
                        </button>
                      )}

                      {/* AI Analyse */}
                      {gallery.mediaAssets.some((a) => a.kind === "PHOTO" && a.previewKey && !a.aiAnalysis) && (
                        <button
                          onClick={() => handleAnalyzeGallery(gallery.id)}
                          disabled={analysisLoading === gallery.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-700 hover:bg-violet-600 text-white text-sm font-semibold transition disabled:opacity-50"
                        >
                          {analysisLoading === gallery.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Sparkles className="h-4 w-4" />
                          }
                          Analyse
                        </button>
                      )}

                      {/* Release */}
                      {draftCount > 0 && gallery.mediaAssets.some((a) => a.previewKey) && (
                        <button
                          onClick={() => handleReleaseMedia(gallery.id)}
                          disabled={releaseLoading === gallery.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50"
                        >
                          {releaseLoading === gallery.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Check className="h-4 w-4" />
                          }
                          Release ({draftCount})
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
