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
 */
export async function generateWatermarkedPreview(
  original: Buffer,
  opts: WatermarkOptions
): Promise<Buffer> {
  const maxWidth = opts.maxWidth ?? 1200;

  // Step 1 — resize to get the final output buffer first
  const resized = await sharp(original)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .toBuffer();

  // Step 2 — get the actual dimensions of the resized image
  const meta = await sharp(resized).metadata();
  const w = meta.width  ?? maxWidth;
  const h = meta.height ?? Math.round(maxWidth * 0.667);

  // Step 3 — build SVG overlay sized exactly to match the resized image
  const centreText = escapeXml(opts.clientLabel);
  const gridText   = escapeXml("[MG] Muzuka Gilbert — Preview Only");

  // Repeating diagonal grid tiles
  const tiles: string[] = [];
  const stepX = 260;
  const stepY = 120;
  for (let y = 0; y < h + stepY; y += stepY) {
    for (let x = -stepX / 2; x < w + stepX; x += stepX) {
      tiles.push(
        `<text x="${x}" y="${y}"
          transform="rotate(-30, ${x}, ${y})"
          fill="white" fill-opacity="0.18"
          font-size="13" font-family="Arial, sans-serif"
          font-weight="bold" letter-spacing="1"
        >${gridText}</text>`
      );
    }
  }

  const barHeight = Math.max(32, Math.round(h * 0.045)); // responsive bottom bar
  const barFontSize = Math.max(10, Math.round(barHeight * 0.42));
  const centreFontSize = Math.min(28, Math.round(w * 0.025));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  ${tiles.join("\n  ")}
  <text
    x="${Math.round(w / 2)}" y="${Math.round(h / 2)}"
    text-anchor="middle" dominant-baseline="middle"
    fill="white" fill-opacity="0.55"
    font-size="${centreFontSize}" font-family="Arial, sans-serif" font-weight="bold"
    transform="rotate(-30, ${Math.round(w / 2)}, ${Math.round(h / 2)})"
  >${centreText}</text>
  <rect x="0" y="${h - barHeight}" width="${w}" height="${barHeight}" fill="black" fill-opacity="0.60"/>
  <text
    x="${Math.round(w / 2)}" y="${h - Math.round(barHeight * 0.28)}"
    text-anchor="middle" fill="#FFD700" fill-opacity="0.95"
    font-size="${barFontSize}" font-family="Arial, sans-serif" font-weight="bold"
  >PREVIEW — Complete payment to unlock full quality</text>
</svg>`;

  const overlay = Buffer.from(svg);

  // Step 4 — composite the SVG overlay onto the already-resized image
  const result = await sharp(resized)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 72, progressive: true })
    .toBuffer();

  return result;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
