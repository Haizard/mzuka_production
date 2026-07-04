"use client";

import { useCallback, useState } from "react";
import { AnalysisPanel } from "./AnalysisPanel";

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
  initialAssets: AssetRow[];
  draftCount: number;
}

export function GalleryDetailWrapper({ galleryId, initialAssets, draftCount: initialDraft }: Props) {
  const [assets, setAssets]     = useState<AssetRow[]>(initialAssets);
  const [draft, setDraft]       = useState(initialDraft);

  const handleRefresh = useCallback(async () => {
    const res = await fetch(`/api/admin/gallery-assets?galleryId=${galleryId}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json() as { assets: AssetRow[]; draftCount: number };
      setAssets(data.assets);
      setDraft(data.draftCount);
    }
  }, [galleryId]);

  return (
    <AnalysisPanel
      galleryId={galleryId}
      assets={assets}
      draftCount={draft}
      onRefresh={handleRefresh}
    />
  );
}
