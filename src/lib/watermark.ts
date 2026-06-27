/**
 * Watermark generation for Muzuka Gilbert preview images.
 *
 * Applies a semi-transparent diagonal text watermark with:
 *  - Client name / email in the centre
 *  - "[MG] Muzuka Gilbert — Preview Only" repeated in a grid
 *  - Reduced resolution (max 1200px wide) so originals stay protected
 */
import sharp from "sharp";

export interface WatermarkOptions {
  /** Text shown in the large centre stamp */
  clientLabel: string;
  /** Maximum width for the preview (default 1200) */
  maxWidth?: number;
}

/**
 * Generates a watermarked, downscaled preview buffer from the original image buffer.
 *
 * @param original  Raw image bytes from S3 (any format sharp understands)
 * @param opts      Watermark options
 * @returns         JPEG buffer ready to upload to the preview bucket
 */
export async function generateWatermarkedPreview(
  original: Buffer,
  opts: WatermarkOptions
): Promise<Buffer> {
  const maxWidth = opts.maxWidth ?? 1200;

  // Load and resize — keeps aspect ratio, never upscales
  const base = sharp(original).resize({ width: maxWidth, withoutEnlargement: true });
  const { width = maxWidth, height = Math.round(maxWidth * 0.667) } =
    await base.metadata();

  const w = width ?? maxWidth;
  const h = height ?? Math.round(maxWidth * 0.667);

  // ── Build the SVG watermark overlay ──────────────────────────────────────

  // Centre stamp
  const centreText = escapeXml(opts.clientLabel);
  const gridText = escapeXml("[MG] Muzuka Gilbert — Preview Only");

  // Repeating grid tiles (every ~200×200 px)
  const tiles: string[] = [];
  const stepX = 260;
  const stepY = 120;
  for (let y = 0; y < h + stepY; y += stepY) {
    for (let x = -stepX / 2; x < w + stepX; x += stepX) {
      tiles.push(
        `<text
          x="${x}"
          y="${y}"
          transform="rotate(-30, ${x}, ${y})"
          fill="white"
          fill-opacity="0.18"
          font-size="13"
          font-family="Arial, sans-serif"
          font-weight="bold"
          letter-spacing="1"
        >${gridText}</text>`
      );
    }
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <style>
      text { user-select: none; }
    </style>
  </defs>

  <!-- Repeating grid watermark -->
  ${tiles.join("\n")}

  <!-- Centre label -->
  <text
    x="${Math.round(w / 2)}"
    y="${Math.round(h / 2)}"
    text-anchor="middle"
    dominant-baseline="middle"
    fill="white"
    fill-opacity="0.55"
    font-size="28"
    font-family="Arial, sans-serif"
    font-weight="bold"
    transform="rotate(-30, ${Math.round(w / 2)}, ${Math.round(h / 2)})"
  >${centreText}</text>

  <!-- Bottom bar -->
  <rect x="0" y="${h - 36}" width="${w}" height="36" fill="black" fill-opacity="0.55"/>
  <text
    x="${Math.round(w / 2)}"
    y="${h - 12}"
    text-anchor="middle"
    fill="#FFD700"
    fill-opacity="0.9"
    font-size="13"
    font-family="Arial, sans-serif"
    font-weight="bold"
  >🔒 PREVIEW — Complete payment to unlock full quality</text>
</svg>`;

  const overlay = Buffer.from(svg);

  const result = await sharp(original)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 72, progressive: true })
    .toBuffer();

  return result;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
