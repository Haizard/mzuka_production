import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Lock, Download, Image as ImageIcon, ShieldAlert, Play } from "lucide-react";
import { getGalleryAccessUrls } from "@/app/admin/galleries/actions";
import { GalleryProtection } from "@/components/gallery-protection";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VideoPlayer } from "./video-player";

export const dynamic = "force-dynamic";

interface GalleryDetailPageProps {
  params: Promise<{ galleryId: string }>;
}

export default async function GalleryDetailPage({ params }: GalleryDetailPageProps) {
  const { galleryId } = await params;

  const headersList = await headers();
  const ip        = headersList.get("x-real-ip") ?? headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headersList.get("user-agent") ?? null;

  const result      = await getGalleryAccessUrls(galleryId, { ip, userAgent });
  const currentUser = await getCurrentUser();

  if (!result.success || !result.gallery) {
    return (
      <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
        <section className="mx-auto max-w-5xl">
          <Link href="/client" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
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
  const galleryRecord = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { isShareOpen: true },
  });
  const shareAllowed = galleryRecord?.isShareOpen ?? false;

  const photos = mediaAssets.filter((a) => a.kind === "PHOTO");
  const videos = mediaAssets.filter((a) => a.kind === "VIDEO");

  return (
    <main className="min-h-dvh bg-[var(--background)] text-white">
      <GalleryProtection isPreview={!gallery.isPaid} clientName={currentUser?.name} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div>
          <Link href="/client" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Gallery</p>
              <h1 className="text-3xl font-bold text-white mt-1">{gallery.title}</h1>
              {gallery.expiresAt && (
                <p className="text-sm text-zinc-400 mt-1">
                  Access expires {new Date(gallery.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {gallery.isPaid ? (
                <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-sm font-semibold">
                  ✓ Full Access
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-300 text-sm font-semibold">
                  🔒 Preview Only
                </span>
              )}
            </div>
          </div>
        </div>

        {mediaAssets.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-16 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">Gallery is empty. Check back soon!</p>
          </div>
        ) : (
          <>
            {/* ── VIDEO SECTION ── */}
            {videos.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Play className="h-5 w-5 text-[var(--gold)]" />
                  Videos {!gallery.isPaid && <span className="text-xs text-amber-400 font-normal ml-2">· Trailer Preview</span>}
                </h2>

                <div className="grid gap-6 md:grid-cols-2">
                  {videos.map((asset) => (
                    <VideoPlayer
                      key={asset.id}
                      asset={asset as Parameters<typeof VideoPlayer>[0]["asset"]}
                      isPaid={gallery.isPaid}
                      galleryId={galleryId}
                    />
                  ))}
                </div>

                {/* Paywall CTA for unpaid */}
                {!gallery.isPaid && videos.some((v) => (v as { hasTrailer?: boolean }).hasTrailer) && (
                  <div className="rounded-2xl border border-[var(--gold)]/20 bg-gradient-to-br from-[var(--gold)]/10 to-black p-8 text-center">
                    <div className="text-5xl mb-4">🎬</div>
                    <h3 className="text-xl font-bold text-white mb-2">Unlock the Full Film</h3>
                    <p className="text-zinc-400 mb-1 max-w-md mx-auto">
                      You&apos;re watching the trailer. Complete your payment to unlock the full-length video in {videos[0] ? "4K" : "high"} quality.
                    </p>
                    <p className="text-xs text-zinc-600 mb-6">Delivered securely through your private gallery — no USB, no waiting.</p>
                    <Link href="/client/bookings"
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--gold)] px-8 py-3 text-base font-bold text-black hover:bg-yellow-400 transition">
                      <Play className="h-5 w-5" /> Unlock Full Video
                    </Link>
                  </div>
                )}
              </section>
            )}

            {/* ── PHOTO SECTION ── */}
            {photos.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-[var(--gold)]" />
                  Photos ({photos.length})
                  {!gallery.isPaid && <span className="text-xs text-amber-400 font-normal ml-2">· Watermarked Preview</span>}
                </h2>

                {!gallery.isPaid && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 flex gap-3">
                    <Lock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-200 font-medium">Preview Mode</p>
                      <p className="text-xs text-amber-300/70 mt-0.5">
                        Watermarked previews only. Complete your payment to unlock full-resolution downloads.
                        All views are logged with your account details.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mg-protected-gallery grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((asset) => (
                    <div key={asset.id}
                      className="group rounded-xl border border-white/10 bg-[var(--surface)] overflow-hidden hover:border-white/20 transition">
                      <div className="relative aspect-square bg-black/50 overflow-hidden select-none">
                        {(asset.previewUrl ?? asset.downloadUrl) ? (
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
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                            <ImageIcon className="h-10 w-10 text-zinc-700" />
                          </div>
                        )}
                        {!gallery.isPaid && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                            <div className="bg-black/50 rounded-full p-3 backdrop-blur-sm">
                              <Lock className="h-6 w-6 text-[var(--gold)]" />
                            </div>
                            <span className="text-xs text-white/70 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">Preview</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-white truncate">{asset.filename}</p>
                        {asset.width && asset.height && (
                          <p className="text-xs text-zinc-500 mt-0.5">{asset.width} × {asset.height}</p>
                        )}
                        {gallery.isPaid && (asset.downloadUrl ?? asset.previewUrl) && (
                          <a href={(asset.downloadUrl ?? asset.previewUrl)!} download={asset.filename}
                            className="mt-3 flex items-center justify-center gap-2 w-full rounded-lg bg-[var(--gold)] px-3 py-2 text-sm font-semibold text-black hover:bg-yellow-400 transition">
                            <Download className="h-4 w-4" /> Download
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Photo paywall CTA */}
                {!gallery.isPaid && (
                  <div className="mt-6 rounded-2xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-8 text-center">
                    <h3 className="text-xl font-semibold text-white mb-2">Unlock Full-Quality Downloads</h3>
                    <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
                      Complete your payment to access all {photos.length} photo{photos.length !== 1 ? "s" : ""} in full resolution with no watermarks.
                    </p>
                    <Link href="/client/bookings"
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--gold)] px-8 py-3 font-bold text-black hover:bg-yellow-400 transition">
                      View Booking &amp; Pay
                    </Link>
                  </div>
                )}
              </section>
            )}

            {/* Legal */}
            <p className="text-xs text-zinc-600 text-center pb-4">
              🔒 This gallery is private and access-logged. All preview content carries traceable watermarks.
              Muzuka Gilbert cannot prevent photography of the screen by another device.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
