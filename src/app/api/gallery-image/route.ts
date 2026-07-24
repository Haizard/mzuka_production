import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

// We'll resolve folders dynamically from the filesystem to handle case/whitespace mismatches

const contentTypeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category")?.trim().toLowerCase();
    const file = searchParams.get("file")?.trim();

    if (!category || !file) {
      return NextResponse.json({ error: "Missing category or file" }, { status: 400 });
    }

    // Resolve folder case-insensitively from src/images
    const imagesDir = path.join(process.cwd(), "src", "images");
    if (!fs.existsSync(imagesDir)) return NextResponse.json({ error: "Images directory missing" }, { status: 500 });
    const dirFolders = fs.readdirSync(imagesDir);
    const matched = dirFolders.find((f) => f && f.toString().trim().toLowerCase() === category);
    if (!matched) return NextResponse.json({ error: "Invalid category" }, { status: 400 });

    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

    // Prevent traversal and accept only the basename
    if (file.includes("/") || file.includes("\\")) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    const safeBasename = path.basename(file);
    if (safeBasename !== file) return NextResponse.json({ error: "Invalid file name" }, { status: 400 });

    const ext = path.extname(safeBasename).toLowerCase();
    if (!Object.keys(contentTypeByExtension).includes(ext)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const folder = matched.toString();
    const imagePath = path.join(imagesDir, folder, safeBasename);
    const folderPath = path.join(imagesDir, folder);

    if (!imagePath.startsWith(folderPath)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    if (!fs.existsSync(imagePath)) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(imagePath);
    const contentType = contentTypeByExtension[ext] ?? "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
