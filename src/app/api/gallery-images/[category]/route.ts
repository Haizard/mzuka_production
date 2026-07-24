import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request, { params }: { params: Promise<{ category: string }> }) {
  try {
    const { category } = await params;
    const imagesRoot = path.join(process.cwd(), 'src', 'images');
    const entries = fs.readdirSync(imagesRoot);
    const matched = entries.find((n) => n.trim().toLowerCase() === category.trim().toLowerCase());
    if (!matched) return NextResponse.json({ files: [] });
    const base = path.join(imagesRoot, matched);
    if (!fs.existsSync(base)) return NextResponse.json({ files: [] });
    const files = fs.readdirSync(base).filter((f) => !f.startsWith('.'));
    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json({ files: [] });
  }
}
