"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Play, Lock, Download, Clock, Crown } from "lucide-react";

interface VideoAsset {
  id: string;
  filename: string;
  kind: string;
  previewUrl: string | null;
  downloadUrl: string | null;
  trailerUrl: string | null;
  isPaid: boolean;
  hasTrailer: boolean;
}

interface VideoPlayerProps {
  asset: VideoAsset;
  isPaid: boolean;
  galleryId: string;
}

export function VideoPlayer({ asset, isPaid }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoSrc = isPaid
    ? (asset.downloadUrl ?? asset.previewUrl)
    : asset.trailerUrl;

  const hasContent = !!videoSrc;

  const handlePlay = () => {
    if (!hasContent) return;
    setPlaying(true);
    setTimeout(() => videoRef.current?.play(), 100);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black overflow-hidden group">
      {/* Video container */}
      <div className="relative aspect-video bg-black">
        {playing && videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            autoPlay
            controlsList={isPaid ? undefined : "nodownload"}
            className="w-full h-full object-contain"
            onContextMenu={(e) => !isPaid && e.preventDefault()}
          />
        ) : (
          /* Thumbnail / poster state */
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-black relative">
            {/* Background film strip effect */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: "repeating-linear-gradient(90deg, #fff 0px, #fff 2px, transparent 2px, transparent 20px)",
            }} />

            {/* Play button */}
            {hasContent ? (
              <button
                onClick={handlePlay}
                className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-[var(--gold)] hover:bg-yellow-400 transition-all hover:scale-110 shadow-2xl shadow-[var(--gold)]/30"
              >
                <Play className="h-9 w-9 text-black ml-1" />
              </button>
            ) : (
              <div className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-zinc-800 border border-white/10">
                <Play className="h-9 w-9 text-zinc-600 ml-1" />
              </div>
            )}

            {/* Trailer badge */}
            {!isPaid && asset.hasTrailer && (
              <div className="relative z-10 mt-4 flex items-center gap-2 bg-black/70 backdrop-blur px-4 py-2 rounded-full border border-[var(--gold)]/30">
                <Clock className="h-3.5 w-3.5 text-[var(--gold)]" />
                <span className="text-xs text-[var(--gold)] font-semibold">TRAILER · ≤3 min preview</span>
              </div>
            )}

            {!isPaid && !asset.hasTrailer && (
              <div className="relative z-10 mt-4 flex items-center gap-2 bg-black/70 backdrop-blur px-4 py-2 rounded-full border border-white/10">
                <Lock className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-xs text-zinc-500">Trailer not yet available</span>
              </div>
            )}

            {isPaid && (
              <div className="relative z-10 mt-4 flex items-center gap-2 bg-emerald-500/20 backdrop-blur px-4 py-2 rounded-full border border-emerald-500/30">
                <Crown className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-300 font-semibold">FULL VIDEO · Unlocked</span>
              </div>
            )}
          </div>
        )}

        {/* Unpaid overlay with lock gradient — shows after video ended or on hover */}
        {!isPaid && (
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Info bar */}
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{asset.filename}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isPaid ? "Full quality video" : asset.hasTrailer ? "Trailer preview" : "Video — trailer pending"}
          </p>
        </div>

        {/* Paid: download button */}
        {isPaid && asset.downloadUrl && (
          <a
            href={asset.downloadUrl}
            download={asset.filename}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-400 transition shrink-0"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
        )}

        {/* Unpaid: unlock CTA */}
        {!isPaid && (
          <Link
            href="/client/bookings"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--gold)]/40 text-[var(--gold)] text-xs font-semibold hover:bg-[var(--gold)]/10 transition shrink-0"
          >
            <Lock className="h-3.5 w-3.5" />
            Unlock Full
          </Link>
        )}
      </div>

      {/* Unpaid: trailer end teaser strip */}
      {!isPaid && asset.hasTrailer && (
        <div className="border-t border-white/5 px-4 py-3 bg-gradient-to-r from-[var(--gold)]/5 to-transparent flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-400">
            <span className="text-[var(--gold)] font-semibold">This is a preview.</span> The full video is ready — unlock it after payment.
          </p>
          <Link href="/client/bookings"
            className="shrink-0 text-xs font-bold text-[var(--gold)] hover:underline">
            Pay Now →
          </Link>
        </div>
      )}
    </div>
  );
}
