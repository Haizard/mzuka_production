import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAdminAccess } from "@/lib/admin-permissions";

export async function POST(req: NextRequest) {
  try {
    await requireAdminAccess("/admin/reports");

    const body = await req.json() as { prompt?: string };
    if (!body.prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional business analyst for Muzuka Gilbert — a luxury photography & videography studio. Generate structured, professional reports with clear headings, bullet points where appropriate, and actionable insights. Use data provided to make the report specific and accurate.",
        },
        { role: "user", content: body.prompt },
      ],
    });

    return NextResponse.json({ content: res.choices[0]?.message?.content ?? "" });
  } catch (error) {
    console.error("AI report error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
