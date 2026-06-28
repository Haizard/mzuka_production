import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Lock, Download, Image as ImageIcon, ShieldAlert } from "lucide-react";
import { getGalleryAccessUrls } from "@/app/admin/galleries/actions";
import { GalleryProtection } from "@/components/gallery-protection";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface GalleryDetailPageProps {
  params: Promise<{ galleryId: string }>;
}

export default async function GalleryDetailPage({ params }: GalleryDetailPageProps) {
  const { galleryId } = await params;

  // Capture IP and user-agent for access logging
  const headersList = await headers();
  const ip =
    headersList.get("x-real-ip") ??
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const userAgent = headersList.get("user-agent") ?? null;

  const result = await getGalleryAccessUrls(galleryId, { ip, userAgent });
  const currentUser = await getCurrentUser();

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
            <ShieldAlert className="h-10 w-10 mx-auto text-red-400 mb-3" />
            <p className="text-red-200 font-medium">{result.error}</p>
          </div>
        </section>
      </main>
    );
  }

  const { gallery, mediaAssets } = result;

  // Fetch gallery's share permission for conditional UI
  const galleryRecord = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { isShareOpen: true, isDownloadOpen: true, watermarkText: true },
  });

  const shareAllowed = galleryRecord?.isShareOpen ?? false;

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
      {/* Browser-side screenshot deterrence — only in preview mode */}
      <GalleryProtection
        isPreview={!gallery.isPaid}
        clientName={currentUser?.name}
      />

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
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {gallery.isPaid ? (
                <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-sm font-medium">
                  ✓ Full Access
                </span>
              ) : (
                <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-sm font-medium">
                  🔒 Preview Only
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-2">
            {gallery.expiresAt && (
              <p className="text-sm text-zinc-400">
                <Clock className="inline h-3.5 w-3.5 mr-1 text-zinc-500" />
                Access expires {new Date(gallery.expiresAt).toLocaleDateString()}
              </p>
            )}
            {/* Share link — only if admin has opened sharing */}
            {shareAllowed && (
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                }}
                className="text-sm text-blue-400 hover:text-blue-300 transition"
              >
                📋 Copy gallery link
              </button>
            )}
          </div>
        </header>

        {/* Gallery grid */}
        {mediaAssets.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">Gallery is empty. Check back soon!</p>
          </div>
        ) : (
          <>
            {/* Preview notice */}
            {!gallery.isPaid && (
              <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 flex gap-3">
                <Lock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-200 font-medium">Preview Mode</p>
                  <p className="text-xs text-amber-300/70 mt-0.5">
                    Watermarked previews only. Complete your payment to unlock full-resolution downloads.
                    All views are logged and watermarks contain your account details.
                  </p>
                </div>
              </div>
            )}

            <div className="mg-protected-gallery grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mediaAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="group rounded-lg border border-white/10 bg-[var(--surface)] overflow-hidden hover:border-white/20 transition"
                >
                  {/* Media preview */}
                  <div className="relative aspect-square bg-black/50 overflow-hidden select-none">
                    {asset.kind === "PHOTO" && (asset.previewUrl ?? asset.downloadUrl) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={(asset.previewUrl ?? asset.downloadUrl)!}
                        alt={asset.filename}
                        draggable={false}
                        className="w-full h-full object-cover transition group-hover:scale-105 duration-500"
                        style={{
                          filter: !gallery.isPaid ? "blur(2px) brightness(0.6)" : "none",
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    {asset.kind === "PHOTO" && !asset.previewUrl && !asset.downloadUrl && (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                        <ImageIcon className="h-10 w-10 text-zinc-700" />
                      </div>
                    )}
                    {asset.kind === "VIDEO" && (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                        <div className="text-5xl">🎥</div>
                      </div>
                    )}
                    {/* Lock overlay — sits ON TOP of the blurred preview */}
                    {!gallery.isPaid && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                        <div className="bg-black/50 rounded-full p-3 backdrop-blur-sm">
                          <Lock className="h-6 w-6 text-[var(--gold)]" />
                        </div>
                        <span className="text-xs text-white/70 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">Preview</span>
                      </div>
                    )}
                  </div>

                  {/* Info + actions */}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white truncate">{asset.filename}</p>
                    {asset.width && asset.height && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {asset.width} × {asset.height}
                      </p>
                    )}

                    {gallery.isPaid && (asset.downloadUrl ?? asset.previewUrl) && (
                      <a
                        href={(asset.downloadUrl ?? asset.previewUrl)!}
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

            {/* Payment CTA */}
            {!gallery.isPaid && (
              <div className="mt-8 rounded-lg border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-8 text-center">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Unlock Full-Quality Downloads
                </h2>
                <p className="text-zinc-400 mb-1">
                  Complete your payment to access all photos and videos in full resolution.
                </p>
                <p className="text-xs text-zinc-600 mb-6">
                  Each preview is watermarked with your account details. Downloads require payment confirmation.
                </p>
                <Link
                  href="/client/bookings"
                  className="inline-block rounded-lg bg-[var(--gold)] px-6 py-3 font-semibold text-black hover:bg-yellow-500 transition"
                >
                  View Booking &amp; Payment
                </Link>
              </div>
            )}

            {/* Legal notice */}
            <div className="mt-6 rounded-lg border border-white/5 bg-white/3 p-4">
              <p className="text-xs text-zinc-600 text-center">
                🔒 This gallery is private and access-logged. All preview images carry a dynamic watermark linked to your account.
                Unauthorised reproduction, distribution, or sharing is prohibited.
                Muzuka Gilbert cannot technically prevent photography of the screen by another device —
                however all previews contain traceable identification data.
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

// Inline the Clock icon used in JSX above
function Clock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
