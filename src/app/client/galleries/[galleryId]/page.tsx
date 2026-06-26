import Link from "next/link";
import { ArrowLeft, Lock, Download, Image as ImageIcon } from "lucide-react";
import { getGalleryAccessUrls } from "@/app/admin/galleries/actions";

export const dynamic = "force-dynamic";

interface GalleryDetailPageProps {
  params: {
    galleryId: string;
  };
}

export default async function GalleryDetailPage({ params }: GalleryDetailPageProps) {
  const result = await getGalleryAccessUrls(params.galleryId);

  if (!result.success || !result.gallery) {
    return (
      <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
        <section className="mx-auto max-w-5xl">
          <Link
            href="/client"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <div className="mt-8 rounded-lg border border-red-500/20 bg-red-500/10 p-8 text-center">
            <p className="text-red-200">{result.error}</p>
          </div>
        </section>
      </main>
    );
  }

  const { gallery, mediaAssets } = result;

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <Link
          href="/client"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <header className="mt-6 mb-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
                Gallery
              </p>
              <h1 className="mt-2 text-3xl font-semibold">{gallery.title}</h1>
            </div>
            {gallery.isPaid && (
              <div className="inline-block px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-sm font-medium">
                ✓ Full Access
              </div>
            )}
            {!gallery.isPaid && (
              <div className="inline-block px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-sm font-medium">
                🔒 Preview Only
              </div>
            )}
          </div>
          {gallery.expiresAt && (
            <p className="text-sm text-zinc-400">
              Access expires {new Date(gallery.expiresAt).toLocaleDateString()}
            </p>
          )}
        </header>

        {/* Gallery Grid */}
        {mediaAssets.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">Gallery is empty. Check back soon!</p>
          </div>
        ) : (
          <>
            {/* Payment Required Notice */}
            {!gallery.isPaid && (
              <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="text-sm text-amber-200">
                  📸 This is a preview of your gallery. To download full-quality images, complete your payment.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mediaAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="group rounded-lg border border-white/10 bg-[var(--surface)] overflow-hidden hover:border-white/20 transition"
                >
                  {/* Media Preview */}
                  <div className="relative aspect-square bg-black/50 overflow-hidden">
                    {asset.kind === "PHOTO" && asset.previewUrl && (
                      <img
                        src={asset.previewUrl}
                        alt={asset.filename}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition"
                      />
                    )}
                    {asset.kind === "VIDEO" && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-zinc-400">🎥 Video</div>
                      </div>
                    )}

                    {!gallery.isPaid && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <Lock className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Media Info */}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white truncate">{asset.filename}</p>
                    {asset.width && asset.height && (
                      <p className="text-xs text-zinc-400">
                        {asset.width} × {asset.height}
                      </p>
                    )}

                    {/* Download Button */}
                    {gallery.isPaid && asset.downloadUrl && (
                      <a
                        href={asset.downloadUrl}
                        download={asset.filename}
                        className="mt-3 flex items-center justify-center gap-2 w-full rounded-lg bg-[var(--gold)] px-3 py-2 text-sm font-semibold text-black hover:bg-yellow-500 transition"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Full Access CTA */}
            {!gallery.isPaid && (
              <div className="mt-8 rounded-lg border border-[var(--gold)]/20 bg-[var(--gold)]/10 p-8 text-center">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Unlock Full-Quality Downloads
                </h2>
                <p className="text-zinc-400 mb-4">
                  Complete your payment to access all photos and videos in full resolution.
                </p>
                <Link
                  href="/client/bookings"
                  className="inline-block rounded-lg bg-[var(--gold)] px-6 py-3 font-semibold text-black hover:bg-yellow-500 transition"
                >
                  View Booking & Payment
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
