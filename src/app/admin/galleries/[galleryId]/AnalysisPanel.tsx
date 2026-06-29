"use client";

import { useRef, useState } from "react";
import { Sparkles, Loader2, Check, RotateCcw, ChevronDown, ChevronUp, Upload, X, ImagePlus } from "lucide-react";
import { analyzeGalleryAction, analyzeMediaAssetAction, releaseMediaAssetsAction, uploadMediaAssetAction, generatePreviewAction } from "../actions";

interface AiScore {
  sharpness: number;
  lighting: number;
  faceQuality: number | null;
  composition: number;
  colorGrade: number;
  background: number;
  emotion: number | null;
  overallScore: number;
  notes: string | null;
  recommendRelease?: boolean;
}

interface AssetRow {
  id: string;
  filename: string;
  kind: string;
  releaseStatus: string;
  previewKey: string | null;
  aiAnalysis: AiScore | null;
}

interface Props {
  galleryId: string;
  assets: AssetRow[];
  draftCount: number;
  onRefresh: () => void;
}

const SCORE_DIMS: { key: keyof AiScore; label: string }[] = [
  { key: "overallScore", label: "Overall" },
  { key: "sharpness",    label: "Sharpness" },
  { key: "lighting",     label: "Lighting" },
  { key: "composition",  label: "Composition" },
  { key: "colorGrade",   label: "Color Grade" },
  { key: "background",   label: "Background" },
  { key: "faceQuality",  label: "Face Quality" },
  { key: "emotion",      label: "Emotion" },
];

function ScoreBar({ score, label }: { score: number | null; label: string }) {
  if (score === null) return null;
  const color =
    score >= 80 ? "bg-emerald-500" :
    score >= 60 ? "bg-amber-400" :
    "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-zinc-500 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`w-6 text-right font-bold ${
        score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400"
      }`}>{score}</span>
    </div>
  );
}

function PhotoCard({ asset, onAnalyzeSingle }: { asset: AssetRow; onAnalyzeSingle: (id: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const a = asset.aiAnalysis;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await onAnalyzeSingle(asset.id);
    setAnalyzing(false);
  };

  const scoreColor = !a ? "text-zinc-500" :
    a.overallScore >= 80 ? "text-emerald-400" :
    a.overallScore >= 60 ? "text-amber-400" : "text-red-400";

  const isPlaceholder = a?.overallScore === 0 && a?.notes?.startsWith("[AI unavailable");

  return (
    <div className={`rounded-xl border transition ${
      asset.releaseStatus === "RELEASED"
        ? "border-emerald-500/20 bg-emerald-500/5"
        : "border-white/10 bg-white/5"
    }`}>
      {/* Row */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-base">
          {asset.kind === "PHOTO" ? "📷" : "🎥"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white truncate font-medium">{asset.filename}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {asset.releaseStatus === "RELEASED"
              ? <span className="text-emerald-400">Released</span>
              : <span className="text-zinc-500">Draft</span>}
            {!asset.previewKey && asset.kind === "PHOTO" && (
              <span className="ml-2 text-red-400">· no preview</span>
            )}
          </p>
        </div>

        {/* Score badge */}
        {a && !isPlaceholder && (
          <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>
            {a.overallScore}
          </span>
        )}

        {/* Actions */}
        {asset.kind === "PHOTO" && (
          <div className="flex items-center gap-1 shrink-0">
            {(!a || isPlaceholder) && asset.previewKey && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                title="Analyze this photo"
                className="p-1.5 rounded-lg bg-violet-700/50 hover:bg-violet-600 text-white transition disabled:opacity-50"
              >
                {analyzing
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5" />
                }
              </button>
            )}
            {a && !isPlaceholder && (
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                title="Re-analyze"
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition disabled:opacity-50"
              >
                {analyzing
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <RotateCcw className="h-3.5 w-3.5" />
                }
              </button>
            )}
            {a && (
              <button
                onClick={() => setExpanded((x) => !x)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition"
              >
                {expanded
                  ? <ChevronUp className="h-3.5 w-3.5" />
                  : <ChevronDown className="h-3.5 w-3.5" />
                }
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expanded analysis */}
      {expanded && a && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-white/10 pt-3">
          {isPlaceholder ? (
            <p className="text-xs text-amber-400">{a.notes}</p>
          ) : (
            <>
              {SCORE_DIMS.map((d) => (
                <ScoreBar
                  key={d.key}
                  score={a[d.key] as number | null}
                  label={d.label}
                />
              ))}
              {a.notes && (
                <p className="text-xs text-zinc-400 mt-2 italic border-t border-white/10 pt-2">
                  &ldquo;{a.notes}&rdquo;
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface UploadState {
  file: File;
  progress: "idle" | "uploading" | "preview" | "done" | "error";
  error?: string;
}

function UploadSection({ galleryId, onRefresh }: { galleryId: string; onRefresh: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue]     = useState<UploadState[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(0);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files)
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((f) => ({ file: f, progress: "idle" as const }));
    setQueue((q) => [...q, ...next]);
  };

  const removeQueued = (idx: number) =>
    setQueue((q) => q.filter((_, i) => i !== idx));

  const uploadAll = async () => {
    setRunning(true);
    setDone(0);
    const pending = queue.filter((u) => u.progress === "idle");
    for (let i = 0; i < pending.length; i++) {
      const { file } = pending[i];
      const mediaKind: "PHOTO" | "VIDEO" = file.type.startsWith("image/") ? "PHOTO" : "VIDEO";

      setQueue((q) =>
        q.map((u) => (u.file === file ? { ...u, progress: "uploading" } : u))
      );

      try {
        const result = await uploadMediaAssetAction(galleryId, file.name, file.type, mediaKind, undefined, undefined, file.size);
        if (!result.success || !result.uploadUrl) throw new Error(result.error ?? "Upload failed");

        await fetch(result.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        setQueue((q) =>
          q.map((u) => (u.file === file ? { ...u, progress: "preview" } : u))
        );

        if (mediaKind === "PHOTO" && result.mediaAsset?.id) {
          await generatePreviewAction(result.mediaAsset.id as string);
        }

        setQueue((q) =>
          q.map((u) => (u.file === file ? { ...u, progress: "done" } : u))
        );
        setDone((d) => d + 1);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload error";
        setQueue((q) =>
          q.map((u) => (u.file === file ? { ...u, progress: "error", error: msg } : u))
        );
      }
    }
    setRunning(false);
    await onRefresh();
    setTimeout(() => {
      setQueue((q) => q.filter((u) => u.progress !== "done"));
    }, 2000);
  };

  const pendingCount = queue.filter((u) => u.progress === "idle").length;

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-[var(--gold)]" />
          Upload Media
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 transition"
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {queue.length === 0 && (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-white/10 hover:border-[var(--gold)]/30 rounded-xl py-6 flex flex-col items-center gap-2 text-zinc-500 hover:text-zinc-300 transition"
        >
          <Upload className="h-6 w-6" />
          <span className="text-sm">Click or drag photos &amp; videos here</span>
        </button>
      )}

      {queue.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {queue.map((u, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/8">
              <div className="text-base shrink-0">
                {u.file.type.startsWith("image/") ? "📷" : "🎥"}
              </div>
              <p className="text-xs text-zinc-300 truncate flex-1">{u.file.name}</p>
              <span className={`text-[10px] font-semibold shrink-0 ${
                u.progress === "done"     ? "text-emerald-400" :
                u.progress === "error"    ? "text-red-400" :
                u.progress === "idle"     ? "text-zinc-500" :
                "text-amber-400"
              }`}>
                {u.progress === "uploading" ? "↑ uploading…" :
                 u.progress === "preview"   ? "⚙ preview…" :
                 u.progress === "done"      ? "✓ done" :
                 u.progress === "error"     ? (u.error ?? "error") :
                 `${(u.file.size / 1024 / 1024).toFixed(1)} MB`}
              </span>
              {u.progress === "idle" && (
                <button onClick={() => removeQueued(idx)} className="p-1 hover:text-red-400 text-zinc-600 transition">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {pendingCount > 0 && (
        <button
          onClick={uploadAll}
          disabled={running}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--gold)] hover:bg-yellow-400 text-black text-sm font-semibold transition disabled:opacity-60"
        >
          {running
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading {done + 1} of {pendingCount}…</>
            : <><Upload className="h-4 w-4" /> Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}</>
          }
        </button>
      )}
    </div>
  );
}

export function AnalysisPanel({ galleryId, assets, draftCount, onRefresh }: Props) {
  const [analyzingAll, setAnalyzingAll]   = useState(false);
  const [releasing, setReleasing]         = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<string | null>(null);

  const photos = assets.filter((a) => a.kind === "PHOTO");
  const analyzed = photos.filter((a) => a.aiAnalysis && a.aiAnalysis.overallScore > 0);
  const recommended = analyzed.filter((a) => (a.aiAnalysis?.overallScore ?? 0) >= 70);
  const avgScore = analyzed.length > 0
    ? Math.round(analyzed.reduce((s, a) => s + (a.aiAnalysis?.overallScore ?? 0), 0) / analyzed.length)
    : null;

  const handleAnalyzeAll = async () => {
    setAnalyzingAll(true);
    setAnalyzeResult(null);
    const result = await analyzeGalleryAction(galleryId);
    if (result.success) {
      const scored = (result.scored ?? []).filter((r) => !("cached" in r && r.cached));
      setAnalyzeResult(`Analyzed ${scored.length} photo${scored.length !== 1 ? "s" : ""}`);
    } else {
      setAnalyzeResult("Analysis failed — check server logs");
    }
    await onRefresh();
    setAnalyzingAll(false);
    setTimeout(() => setAnalyzeResult(null), 5000);
  };

  const handleRelease = async () => {
    setReleasing(true);
    await releaseMediaAssetsAction(galleryId);
    await onRefresh();
    setReleasing(false);
  };

  const handleAnalyzeSingle = async (assetId: string) => {
    await analyzeMediaAssetAction(assetId);
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Upload section */}
      <UploadSection galleryId={galleryId} onRefresh={onRefresh} />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total photos", value: photos.length, color: "text-white" },
          { label: "Analyzed", value: analyzed.length, color: "text-violet-400" },
          { label: "Avg score", value: avgScore !== null ? avgScore : "—", color: avgScore !== null && avgScore >= 70 ? "text-emerald-400" : "text-amber-400" },
          { label: "Recommended", value: recommended.length, color: "text-emerald-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-[var(--surface)] p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-zinc-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleAnalyzeAll}
          disabled={analyzingAll || photos.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-600 text-white text-sm font-semibold transition disabled:opacity-50"
        >
          {analyzingAll
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
            : <><Sparkles className="h-4 w-4" /> Analyze All Photos</>
          }
        </button>

        {draftCount > 0 && (
          <button
            onClick={handleRelease}
            disabled={releasing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {releasing
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Releasing…</>
              : <><Check className="h-4 w-4" /> Release {draftCount} Draft{draftCount !== 1 ? "s" : ""}</>
            }
          </button>
        )}
      </div>

      {analyzeResult && (
        <p className="text-xs text-emerald-400 font-medium">✓ {analyzeResult}</p>
      )}

      {/* Per-photo cards */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
          Photos &amp; Scores
        </p>
        {assets.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4 text-center">No media uploaded yet.</p>
        ) : (
          assets.map((asset) => (
            <PhotoCard
              key={asset.id}
              asset={asset}
              onAnalyzeSingle={handleAnalyzeSingle}
            />
          ))
        )}
      </div>
    </div>
  );
}
