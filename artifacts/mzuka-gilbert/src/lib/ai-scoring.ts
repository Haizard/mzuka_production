/**
 * AI photo quality scoring using OpenAI Vision (GPT-4o).
 *
 * Scores each photo across 7 dimensions (0–100):
 *   sharpness, lighting, faceQuality, composition,
 *   colorGrade, background, emotion
 * Plus an overall weighted score.
 *
 * Only photos with overallScore >= RELEASE_THRESHOLD are
 * recommended for release to the client.
 */
import OpenAI from "openai";

export const RELEASE_THRESHOLD = 70;

export interface PhotoScores {
  sharpness: number;
  lighting: number;
  faceQuality: number | null;
  composition: number;
  colorGrade: number;
  background: number;
  emotion: number | null;
  overallScore: number;
  notes: string;
  recommendRelease: boolean;
}

const SCORING_PROMPT = `
You are a professional photography quality evaluator for a luxury photography studio.
Analyse the provided image and respond with ONLY valid JSON matching this exact structure:

{
  "sharpness": <0-100>,
  "lighting": <0-100>,
  "faceQuality": <0-100 or null if no faces>,
  "composition": <0-100>,
  "colorGrade": <0-100>,
  "background": <0-100>,
  "emotion": <0-100 or null if no faces>,
  "overallScore": <0-100 weighted average>,
  "notes": "<one sentence of concise professional feedback>"
}

Scoring guide:
- sharpness: Is the subject in sharp focus? Blur/motion reduce score.
- lighting: Quality, direction and balance of light. Harsh shadows or blown highlights reduce score.
- faceQuality: Sharpness and expression of faces. null if no faces.
- composition: Rule of thirds, framing, leading lines, balance.
- colorGrade: Colour accuracy, tone consistency, professional grade.
- background: Cleanliness, relevance, separation from subject.
- emotion: Natural and genuine emotion captured. null if no faces.
- overallScore: Weighted average — weight sharpness and lighting highest.

Be strict. A score above 85 means print-ready. Below 60 means it should be retaken.
Respond with ONLY the JSON object, no markdown, no explanation.
`.trim();

/**
 * Returns a placeholder score when OpenAI is not configured.
 * Scores are 0 so no asset is auto-released without a real analysis.
 */
function placeholderScore(reason: string): PhotoScores {
  return {
    sharpness: 0,
    lighting: 0,
    faceQuality: null,
    composition: 0,
    colorGrade: 0,
    background: 0,
    emotion: null,
    overallScore: 0,
    notes: `[AI unavailable — ${reason}] Manual review required.`,
    recommendRelease: false,
  };
}

export async function scorePhoto(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<PhotoScores> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[ai-scoring] OPENAI_API_KEY not set — returning placeholder scores.");
    return placeholderScore("OPENAI_API_KEY not configured");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let response;
  try {
    response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SCORING_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "low",
              },
            },
          ],
        },
      ],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ai-scoring] OpenAI request failed:", msg);
    return placeholderScore(`API error: ${msg.slice(0, 120)}`);
  }

  const raw = response.choices[0]?.message?.content?.trim() ?? "";

  // Strip markdown code fences if present (```json ... ```)
  const jsonText = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error("[ai-scoring] Could not parse OpenAI response:", raw.slice(0, 300));
    return placeholderScore("non-JSON response from AI");
  }

  const scores: PhotoScores = {
    sharpness:    clamp(Number(parsed.sharpness)   || 0),
    lighting:     clamp(Number(parsed.lighting)     || 0),
    faceQuality:  parsed.faceQuality != null ? clamp(Number(parsed.faceQuality)) : null,
    composition:  clamp(Number(parsed.composition)  || 0),
    colorGrade:   clamp(Number(parsed.colorGrade)   || 0),
    background:   clamp(Number(parsed.background)   || 0),
    emotion:      parsed.emotion != null ? clamp(Number(parsed.emotion)) : null,
    overallScore: clamp(Number(parsed.overallScore) || 0),
    notes:        String(parsed.notes ?? "").slice(0, 500),
    recommendRelease: false,
  };

  scores.recommendRelease = scores.overallScore >= RELEASE_THRESHOLD;
  return scores;
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}
