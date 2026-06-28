import Link from "next/link";
import { ArrowRight, Lock, GalleryHorizontalEnd, ShieldCheck } from "lucide-react";
import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClientGalleriesPage() {
  let user;
  try {
    user = await requireApprovedUser();
  } catch {
    redirect("/login");
  }

  const galleries = await prisma.gallery.findMany({
    where: { booking: { clientId: user.id } },
    include: {
      booking: { select: { title: true, serviceType: true, paymentStatus: true } },
      mediaAssets: { select: { id: true, thumbnailUrl: true, type: true }, take: 4 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-dvh bg-[var(--background)] text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">Your Galleries</p>
            <h1 className="mt-2 text-3xl font-semibold">Protected Media</h1>
            <p className="mt-1 text-sm text-zinc-400">Access your private photo and video galleries.</p>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--gold)]" />
            <span className="text-xs text-zinc-500">End-to-end protected</span>
          </div>
        </header>

        {/* Gallery grid */}
        <div className="mt-6">
          {galleries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[var(--surface)] p-12 text-center">
              <GalleryHorizontalEnd className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 font-medium">No galleries yet</p>
              <p className="text-sm text-zinc-600 mt-2">Your galleries will appear here after your session is completed.</p>
              <Link href="/client/bookings/new"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-black hover:bg-yellow-400 transition">
                Book a Session
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {galleries.map((gallery) => {
                const isPaid = gallery.booking.paymentStatus === "PAID";
                const thumbs = gallery.mediaAssets.filter(a => a.thumbnailUrl).slice(0, 4);
                return (
                  <Link
                    key={gallery.id}
                    href={`/client/galleries/${gallery.id}`}
                    className="group relative rounded-2xl border border-white/10 bg-[var(--surface)] overflow-hidden hover:border-[var(--gold)]/30 transition-all duration-200 active:scale-[0.98]"
                  >
                    {/* Thumbnail preview */}
                    <div className="aspect-square bg-black/40 relative overflow-hidden">
                      {thumbs.length > 0 ? (
                        <div className="grid grid-cols-2 gap-0.5 h-full">
                          {thumbs.map((asset) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={asset.id}
                              src={asset.thumbnailUrl!}
                              alt=""
                              className={`w-full h-full object-cover ${!isPaid ? "blur-sm opacity-50" : ""}`}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <GalleryHorizontalEnd className="h-8 w-8 text-zinc-700" />
                        </div>
                      )}

                      {/* Lock overlay for unpaid */}
                      {!isPaid && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 gap-2">
                          <Lock className="h-7 w-7 text-[var(--gold)]" />
                          <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider">Payment Required</span>
                        </div>
                      )}

                      {/* Count badge */}
                      <div className="absolute top-2 right-2 bg-black/70 text-xs text-zinc-300 px-2 py-0.5 rounded-full backdrop-blur">
                        {gallery.mediaAssets.length} items
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="font-semibold text-white text-sm truncate">{gallery.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{gallery.booking.serviceType}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isPaid ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                        }`}>
                          {isPaid ? "Unlocked" : "Locked"}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-[var(--gold)] transition" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
