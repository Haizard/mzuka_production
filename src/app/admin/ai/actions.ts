"use server";

import { requireAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";
import OpenAI from "openai";
import { nanoid } from "nanoid";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function cuid() { return nanoid(25); }

function requireAiAccess() {
  return requireAdminAccess("/admin/ai");
}

// ── System prompt ─────────────────────────────────────────────────────────────

const MG_SYSTEM_PROMPT = `You are the MG AI Assistant for Muzuka Gilbert — a luxury photography and videography studio.

Your role is to help the studio owner and team with:
- Writing captions for social media (Instagram, Facebook, TikTok)
- Writing scripts for video reels and promotional content
- Summarizing client communications and project notes
- Drafting professional client emails and messages
- Generating business reports and summaries
- Translating content between English, Swahili, and French
- Answering questions about photography, videography, and the business

Brand voice: luxury, cinematic, powerful, intimate, professional. Never casual or generic.
Brand quote: "We don't just take pictures. We create masterpieces that tell your story."
Always sign off creative content with [MG] Muzuka Gilbert branding when appropriate.`;

// ── Chat CRUD ─────────────────────────────────────────────────────────────────

export async function createChatAction(firstMessage: string) {
  try {
    const admin = await requireAiAccess();
    const openai = getOpenAI();

    // Auto-generate a short title from the first message
    const titleRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Generate a very short (4 words max) title for this chat based on the user's first message. Return only the title, no quotes." },
        { role: "user", content: firstMessage },
      ],
      max_tokens: 20,
    });
    const title = titleRes.choices[0]?.message?.content?.trim() ?? "New Chat";

    const chat = await prisma.aiChat.create({
      data: {
        id: cuid(),
        userId: admin.id,
        title,
        messages: {
          create: [
            { id: cuid(), role: "system",  content: MG_SYSTEM_PROMPT },
            { id: cuid(), role: "user",    content: firstMessage },
          ],
        },
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    // Get AI reply
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: chat.messages.map((m) => ({ role: m.role as "system" | "user" | "assistant", content: m.content })),
    });

    const reply = completion.choices[0]?.message?.content ?? "I'm here to help.";

    await prisma.aiMessage.create({
      data: { id: cuid(), chatId: chat.id, role: "assistant", content: reply },
    });

    return { success: true, chatId: chat.id, reply, title };
  } catch (error) {
    console.error("Failed to create chat:", error);
    return { success: false, error: "Failed to start chat" };
  }
}

export async function sendMessageAction(chatId: string, content: string) {
  try {
    const admin = await requireAiAccess();
    const openai = getOpenAI();

    const chat = await prisma.aiChat.findFirst({
      where: { id: chatId, userId: admin.id },
      select: { id: true },
    });
    if (!chat) return { success: false, error: "Chat not found" };

    // Save user message
    await prisma.aiMessage.create({
      data: { id: cuid(), chatId, role: "user", content },
    });

    // Load full history
    const messages = await prisma.aiMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages.map((m) => ({ role: m.role as "system" | "user" | "assistant", content: m.content })),
    });

    const reply = completion.choices[0]?.message?.content ?? "I'm here to help.";

    await prisma.aiMessage.create({
      data: { id: cuid(), chatId, role: "assistant", content: reply },
    });

    // Update chat timestamp
    await prisma.aiChat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

    return { success: true, reply };
  } catch (error) {
    console.error("Failed to send message:", error);
    return { success: false, error: "Failed to get AI response" };
  }
}

export async function getChatsAction() {
  try {
    const admin = await requireAiAccess();
    const chats = await prisma.aiChat.findMany({
      where: { userId: admin.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return { success: true, chats };
  } catch (error) {
    console.error("Failed to load chats:", error);
    return { success: false, error: "Failed to load chats", chats: [] };
  }
}

export async function getChatMessagesAction(chatId: string) {
  try {
    const admin = await requireAiAccess();
    const chat = await prisma.aiChat.findFirst({
      where: { id: chatId, userId: admin.id },
      select: { id: true },
    });
    if (!chat) return { success: false, error: "Chat not found", messages: [] };
    const messages = await prisma.aiMessage.findMany({
      where: { chatId, role: { not: "system" } },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, messages };
  } catch (error) {
    console.error("Failed to load messages:", error);
    return { success: false, error: "Failed to load messages", messages: [] };
  }
}

export async function deleteChatAction(chatId: string) {
  try {
    const admin = await requireAiAccess();
    await prisma.aiChat.deleteMany({ where: { id: chatId, userId: admin.id } });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete chat:", error);
    return { success: false, error: "Failed to delete chat" };
  }
}

// ── Quick generation tools ────────────────────────────────────────────────────

export async function generateCaptionAction(data: {
  subject: string; tone: string; platform: string; hashtags: boolean;
}) {
  try {
    await requireAiAccess();
    const openai = getOpenAI();

    const prompt = `Write a ${data.tone} social media caption for ${data.platform} about: ${data.subject}.
${data.hashtags ? "Include 5-8 relevant hashtags at the end." : "No hashtags."}
Brand: Muzuka Gilbert — luxury photography & videography studio.
Brand voice: cinematic, powerful, luxury, emotional.`;

    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: MG_SYSTEM_PROMPT },
        { role: "user",   content: prompt },
      ],
    });

    return { success: true, content: res.choices[0]?.message?.content ?? "" };
  } catch (error) {
    console.error("Caption generation failed:", error);
    return { success: false, error: "Failed to generate caption", content: "" };
  }
}

export async function generateScriptAction(data: {
  type: string; duration: string; topic: string; style: string;
}) {
  try {
    await requireAiAccess();
    const openai = getOpenAI();

    const prompt = `Write a ${data.duration} ${data.type} script about: ${data.topic}.
Style: ${data.style}.
Format with clear sections: Hook, Body, Call to Action.
Brand: Muzuka Gilbert — luxury photography & videography.`;

    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: MG_SYSTEM_PROMPT },
        { role: "user",   content: prompt },
      ],
    });

    return { success: true, content: res.choices[0]?.message?.content ?? "" };
  } catch (error) {
    console.error("Script generation failed:", error);
    return { success: false, error: "Failed to generate script", content: "" };
  }
}

export async function translateContentAction(data: {
  content: string; targetLanguage: string;
}) {
  try {
    await requireAiAccess();
    const openai = getOpenAI();

    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a professional translator. Preserve tone, formatting, and brand voice." },
        { role: "user",   content: `Translate the following to ${data.targetLanguage}:\n\n${data.content}` },
      ],
    });

    return { success: true, content: res.choices[0]?.message?.content ?? "" };
  } catch (error) {
    console.error("Translation failed:", error);
    return { success: false, error: "Failed to translate", content: "" };
  }
}

export async function summarizeContentAction(content: string) {
  try {
    await requireAiAccess();
    const openai = getOpenAI();

    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Summarize clearly and concisely. Use bullet points for key facts." },
        { role: "user",   content: `Summarize this:\n\n${content}` },
      ],
    });

    return { success: true, content: res.choices[0]?.message?.content ?? "" };
  } catch (error) {
    console.error("Summarization failed:", error);
    return { success: false, error: "Failed to summarize", content: "" };
  }
}
