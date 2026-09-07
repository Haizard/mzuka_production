/**
 * ai-client.ts — Centralized AWS Bedrock AI client for Muzuka Gilbert
 *
 * Uses the Bedrock Converse API which provides a unified interface
 * across all Bedrock models (DeepSeek, Claude, Titan, Llama, etc.)
 *
 * Environment variables:
 *   BEDROCK_ACCESS_KEY_ID     — AWS access key for Bedrock
 *   BEDROCK_SECRET_ACCESS_KEY — AWS secret key for Bedrock
 *   AWS_BEDROCK_REGION         — AWS region (e.g. us-east-1)
 *   AWS_BEDROCK_MODEL_ID       — Model ID (e.g. deepseek.v3-v1:0)
 *
 * Recommended models for customer service:
 *   deepseek.v3-v1:0          — DeepSeek V3.1 (fast, light, cost-effective)
 *   anthropic.claude-3-haiku-20240307-v1:0 — Claude 3 Haiku (fast, high quality)
 *   amazon.titan-text-express-v1 — Amazon Titan Express
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type SystemContentBlock,
} from "@aws-sdk/client-bedrock-runtime";

// ── Client singleton ────────────────────────────────────────────────────────

let client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (client) return client;

  const region = process.env.AWS_BEDROCK_REGION || "us-east-1";
  const accessKeyId = process.env.BEDROCK_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS_BEDROCK credentials not configured. Set BEDROCK_ACCESS_KEY_ID and BEDROCK_SECRET_ACCESS_KEY.");
  }

  client = new BedrockRuntimeClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  return client;
}

function getModelId(): string {
  return process.env.AWS_BEDROCK_MODEL_ID || "us.deepseek.v3-v1:0";
}

// ── Chat completion interface ───────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface ChatCompletionResult {
  content: string;
  stopReason?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

// ── Core chat function ──────────────────────────────────────────────────────

export async function chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const { messages, maxTokens = 2048, temperature = 0.7, model } = options;

  const bedrock = getClient();
  const modelId = model || getModelId();

  // Separate system message from conversation messages
  const systemMessages: SystemContentBlock[] = [];
  const conversationMessages: Message[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemMessages.push({ text: msg.content });
    } else {
      conversationMessages.push({
        role: msg.role as "user" | "assistant",
        content: [{ text: msg.content }],
      });
    }
  }

  // Ensure conversation starts with user message (Bedrock requirement)
  if (conversationMessages.length > 0 && conversationMessages[0].role !== "user") {
    conversationMessages.unshift({ role: "user", content: [{ text: "Please help me with the following:" }] });
  }

  // Ensure alternating roles (Bedrock requirement)
  const cleanedMessages: Message[] = [];
  for (const msg of conversationMessages) {
    const lastMsg = cleanedMessages[cleanedMessages.length - 1];
    if (lastMsg && lastMsg.role === msg.role) {
      // Merge consecutive same-role messages
      const existingText = (lastMsg.content as Array<{ text: string }>).map((c) => c.text).join("\n");
      const newText = (msg.content as Array<{ text: string }>).map((c) => c.text).join("\n");
      lastMsg.content = [{ text: `${existingText}\n\n${newText}` }];
    } else {
      cleanedMessages.push({ ...msg });
    }
  }

  if (cleanedMessages.length === 0) {
    cleanedMessages.push({ role: "user", content: [{ text: "Hello" }] });
  }

  const command = new ConverseCommand({
    modelId,
    system: systemMessages.length > 0 ? systemMessages : undefined,
    messages: cleanedMessages,
    inferenceConfig: {
      maxTokens,
      temperature,
    },
  });

  let response;
  try {
    response = await bedrock.send(command);
  } catch (err: unknown) {
    // If the model ID is invalid, log a helpful message
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("model identifier is invalid") || msg.includes("ValidationException")) {
      console.error(
        `[ai] Invalid model ID "${modelId}". Check your AWS_BEDROCK_MODEL_ID env var. ` +
        `Valid options: us.deepseek.v3-v1:0, anthropic.claude-3-haiku-20240307-v1:0, ` +
        `anthropic.claude-3-5-sonnet-20241022-v2:0, amazon.titan-text-express-v1`
      );
    }
    throw err;
  }

  const outputMessage = response.output?.message;
  const textContent = outputMessage?.content
    ?.filter((c): c is { text: string } => "text" in c)
    .map((c) => c.text)
    .join("") ?? "";

  return {
    content: textContent,
    stopReason: response.stopReason,
    usage: response.usage
      ? { inputTokens: response.usage.inputTokens ?? 0, outputTokens: response.usage.outputTokens ?? 0 }
      : undefined,
  };
}

// ── Convenience: simple prompt → response ───────────────────────────────────

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number; model?: string }
): Promise<string> {
  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    ...options,
  });
  return result.content;
}

// ── Health check ────────────────────────────────────────────────────────────

export async function checkBedrockHealth(): Promise<{ ok: boolean; model: string; error?: string }> {
  try {
    const result = await chatCompletion({
      messages: [
        { role: "system", content: "Reply with just 'OK'." },
        { role: "user", content: "Health check" },
      ],
      maxTokens: 10,
      temperature: 0,
    });
    return { ok: true, model: getModelId() };
  } catch (error) {
    return {
      ok: false,
      model: getModelId(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
