"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { analyzeGalleryAction, analyzeMediaAssetAction, releaseMediaAssetsAction } from "../actions";

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
