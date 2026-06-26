"use client";

import { useState, useEffect } from "react";
import { Upload, Loader2, Check, X } from "lucide-react";
import { uploadMediaAssetAction, getAdminGalleries, releaseMediaAssetsAction } from "./actions";

interface MediaAsset {
  id: string;
  filename: string;
  kind: string;
  releaseStatus: string;
  createdAt: Date;
}

interface BookingWithGallery {
  id: string;
  title: string;
  clientId: string;
  client: { name: string };
  gallery?: {
    id: string;
    title: string;
    mediaAssets: MediaAsset[];
  };
  payments: any[];
}

interface Gallery {
  id: string;
  title: string;
  slug: string;
  createdAt: Date;
  mediaAssets: MediaAsset[];
  booking: BookingWithGallery;
}

export default function AdminGalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [releaseLoading, setReleaseLoading] = useState<string | null>(null);

  useEffect(() => {
    loadGalleries();
  }, []);

  const loadGalleries = async () => {
    const result = await getAdminGalleries();
    if (result.success) {
      setGalleries(result.galleries);
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    galleryId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(galleryId);

    try {
      const mediaKind = file.type.startsWith("video/") ? "VIDEO" : "PHOTO";

      const uploadResult = await uploadMediaAssetAction(
        galleryId,
        file.name,
        file.type,
        mediaKind,
        undefined,
        undefined,
        file.size
      );

      if (uploadResult.success && uploadResult.uploadUrl) {
        // Upload file to S3
        const s3Response = await fetch(uploadResult.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (s3Response.ok) {
          loadGalleries();
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploadingId(null);
    }
  };

  const handleReleaseMedia = async (galleryId: string) => {
    setReleaseLoading(galleryId);
    const result = await releaseMediaAssetsAction(galleryId);
    if (result.success) {
      loadGalleries();
    }
    setReleaseLoading(null);
  };

  return (
    <main className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Galleries</h2>
        <p className="mt-1 text-sm text-zinc-400">Manage client photo and video galleries</p>
      </div>

      <div className="rounded-lg border border-white/10 bg-[var(--surface)]">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-400">Loading galleries...</div>
        ) : galleries.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">No galleries yet. Create one from a booking.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {galleries.map((gallery) => (
              <div key={gallery.id} className="p-6 hover:bg-white/5 transition">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-white">{gallery.title}</h3>
                    <p className="text-sm text-zinc-400">
                      Booking: {gallery.booking.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Client: {gallery.booking.client.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {gallery.mediaAssets.length} items
                    </p>
                    <p className="text-xs text-zinc-500">
                      {gallery.booking.payments.some((p) => p.status === "PAID")
                        ? "Paid ✓"
                        : "Unpaid"}
                    </p>
                  </div>
                </div>

                {/* Media Assets List */}
                {gallery.mediaAssets.length > 0 && (
                  <div className="mb-4 p-4 bg-white/5 rounded-lg">
                    <p className="text-xs text-zinc-500 uppercase mb-3">Media</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {gallery.mediaAssets.map((asset) => (
                        <div
                          key={asset.id}
                          className="flex items-center justify-between text-sm p-2 bg-white/5 rounded"
                        >
                          <div>
                            <p className="text-white truncate">{asset.filename}</p>
                            <p className="text-xs text-zinc-500">
                              {asset.kind === "PHOTO" ? "📷" : "🎥"} {asset.kind}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {asset.releaseStatus === "RELEASED" ? (
                              <Check className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <X className="h-4 w-4 text-zinc-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Area */}
                <div className="flex gap-3">
                  <label className="flex-1 relative cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => handleFileUpload(e, gallery.id)}
                      disabled={uploadingId === gallery.id}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-white/10 hover:border-white/20 rounded-lg p-4 text-center transition">
                      {uploadingId === gallery.id ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-[var(--gold)]" />
                          <p className="text-sm text-zinc-400">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mx-auto mb-2 text-zinc-500" />
                          <p className="text-sm text-zinc-400">Upload photo or video</p>
                        </>
                      )}
                    </div>
                  </label>

                  {gallery.mediaAssets.some((a) => a.releaseStatus === "DRAFT") && (
                    <button
                      onClick={() => handleReleaseMedia(gallery.id)}
                      disabled={releaseLoading === gallery.id}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 flex items-center gap-2 transition"
                    >
                      {releaseLoading === gallery.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Release
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
