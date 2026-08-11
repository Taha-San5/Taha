import "server-only";

import { createHash } from "node:crypto";

import { DEFAULT_MODEL, estimateTokens, modelSpec } from "@/lib/models";

/**
 * Model adapter.
 *
 * Wasl talks to any OpenAI-compatible endpoint (OpenAI, Azure, Groq, Together,
 * OpenRouter, Ollama, vLLM...). When no key is available we fall back to a
 * deterministic *simulated* model so that every flow, template and demo still
 * executes end to end. Simulated responses are clearly flagged via
 * `simulated: true` so the UI can badge them.
 *
 * The model *catalog* lives in `lib/models.ts` so the browser can read it
 * without pulling node:crypto into the client bundle.
 */

export { DEFAULT_MODEL, estimateTokens, MODELS, modelSpec, type ModelSpec } from "@/lib/models";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  model?: string;
  system?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** JSON mode: ask the model to reply with a single JSON object. */
  json?: boolean;
  /** Workspace-supplied key. When present the call is BYO-key (0 credits). */
  apiKey?: string;
  baseUrl?: string;
  signal?: AbortSignal;
}

export interface CompletionResult {
  text: string;
  model: string;
  simulated: boolean;
  promptTokens: number;
  completionTokens: number;
  /** Credits actually charged. BYO-key calls are free. */
  credits: number;
}

export function hasPlatformKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function complete(request: CompletionRequest): Promise<CompletionResult> {
  const modelId = request.model ?? DEFAULT_MODEL;
  const spec = modelSpec(modelId);
  const byoKey = request.apiKey?.trim();
  const apiKey = byoKey || process.env.OPENAI_API_KEY?.trim();
  const baseUrl = (request.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

  const messages: ChatMessage[] = request.system
    ? [{ role: "system", content: request.system }, ...request.messages]
    : request.messages;

  if (!apiKey) {
    return simulate(messages, modelId, request.json ?? false);
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: request.temperature ?? 0.4,
        max_tokens: request.maxTokens ?? 1200,
        ...(request.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: request.signal ?? AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Model request failed (${response.status}): ${detail.slice(0, 400)}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const text = payload.choices?.[0]?.message?.content ?? "";
    return {
      text,
      model: modelId,
      simulated: false,
      promptTokens: payload.usage?.prompt_tokens ?? estimateTokens(messages.map((m) => m.content).join(" ")),
      completionTokens: payload.usage?.completion_tokens ?? estimateTokens(text),
      // BYO-key runs cost the customer nothing on our side.
      credits: byoKey ? 0 : spec.credits,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Model request timed out after 90s");
    }
    throw error;
  }
}

/** Extract the first JSON object/array from a model reply. */
export function parseJsonReply<T = unknown>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.search(/[{[]/);
  if (start === -1) return null;
  // Walk forward to the matching close bracket so trailing prose is ignored.
  const open = candidate[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < candidate.length; index += 1) {
    const char = candidate[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(candidate.slice(start, index + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Simulated model
// ---------------------------------------------------------------------------

/**
 * Deterministic stand-in for a real model. It is intentionally simple but
 * *shape-correct*: JSON mode returns valid JSON, classification returns one of
 * the offered labels, and summaries return real sentences pulled from the input.
 */
function simulate(messages: ChatMessage[], modelId: string, json: boolean): CompletionResult {
  const prompt = messages.map((message) => message.content).join("\n\n");
  const rawUser = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  // Our node prompts wrap the actual source material in triple quotes. Using
  // that instead of the whole message keeps simulated output about the *data*
  // rather than echoing our own instructions back.
  const lastUser = extractSource(rawUser);
  const seed = createHash("sha1").update(prompt).digest("hex");

  let text: string;

  if (json) {
    text = JSON.stringify(simulateJson(prompt, lastUser, seed), null, 2);
  } else if (/\bclassify|categor|label\b/i.test(prompt)) {
    text = pickLabel(prompt, seed);
  } else if (/\bsummar|تلخيص|ملخص\b/i.test(prompt)) {
    text = summarize(lastUser);
  } else {
    text = draft(lastUser, seed);
  }

  return {
    text,
    model: `${modelId} (simulated)`,
    simulated: true,
    promptTokens: estimateTokens(prompt),
    completionTokens: estimateTokens(text),
    credits: 0,
  };
}

/** Pull the payload out of a `"""…"""` block, falling back to the whole text. */
function extractSource(text: string): string {
  const fenced = text.match(/"""\s*([\s\S]*?)\s*"""/);
  if (fenced?.[1]?.trim()) return fenced[1].trim();

  // Also handle "Source text:" / "Text:" style prompts without quotes.
  const labelled = text.match(/(?:^|\n)(?:source(?:\s+text)?|text|content|input)\s*:\s*\n?([\s\S]+)$/i);
  if (labelled?.[1]?.trim()) return labelled[1].trim();

  return text;
}

function simulateJson(prompt: string, lastUser: string, seed: string): unknown {
  // Honour an explicit key list when the prompt describes one ("fields: a, b").
  const keys = [...prompt.matchAll(/"([a-zA-Z_][a-zA-Z0-9_ ]{1,40})"\s*:/g)].map((match) => match[1]);
  const unique = [...new Set(keys)].slice(0, 12);
  if (unique.length > 0) {
    return Object.fromEntries(
      unique.map((key, index) => [key, sampleValue(key, lastUser, seed, index)]),
    );
  }
  return {
    result: summarize(lastUser) || "simulated result",
    confidence: 0.5 + (parseInt(seed.slice(0, 2), 16) % 50) / 100,
    simulated: true,
  };
}

function sampleValue(key: string, source: string, seed: string, index: number): unknown {
  const normalized = key.toLowerCase();
  const words = source.split(/\s+/).filter(Boolean);
  if (/count|number|score|qty|quantity|amount|age|total/.test(normalized)) {
    return parseInt(seed.slice(index * 2, index * 2 + 2) || "0", 16) % 100;
  }
  if (/is_|has_|should|flag|bool/.test(normalized)) {
    return parseInt(seed.slice(index, index + 1) || "0", 16) % 2 === 0;
  }
  if (/email/.test(normalized)) return "person@example.com";
  if (/url|link|website/.test(normalized)) return "https://example.com";
  if (/date|time/.test(normalized)) return new Date().toISOString().slice(0, 10);
  if (/list|items|tags|keywords/.test(normalized)) {
    return words.slice(index, index + 3).map((word) => word.replace(/[^\w\u0600-\u06FF]/g, "")).filter(Boolean);
  }
  const snippet = words.slice(index * 4, index * 4 + 8).join(" ");
  return snippet || `simulated ${key}`;
}

function pickLabel(prompt: string, seed: string): string {
  // Look for a bracketed or comma separated candidate list in the prompt.
  const bracket = prompt.match(/\[([^\]]{2,300})\]/);
  const listLine = prompt.match(/(?:categories|labels|options|classes)\s*[:：]\s*([^\n]{2,300})/i);
  const raw = bracket?.[1] ?? listLine?.[1];
  if (!raw) return "other";
  const options = raw
    .split(/[,،|]/)
    .map((option) => option.replace(/["'\s]+/g, " ").trim())
    .filter(Boolean);
  if (options.length === 0) return "other";
  return options[parseInt(seed.slice(0, 4), 16) % options.length];
}

function summarize(source: string): string {
  const sentences = source
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?؟।])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20);
  if (sentences.length === 0) {
    return source.trim().slice(0, 240);
  }
  return sentences.slice(0, 3).join(" ");
}

function draft(source: string, seed: string): string {
  const clean = source.replace(/\s+/g, " ").trim();
  if (!clean) return "Simulated model response. Add an API key to use a real model.";
  const topic = clean.slice(0, 160);
  const variant = parseInt(seed.slice(0, 2), 16) % 3;
  const openers = [
    "Here is a draft based on the provided input:",
    "Working from the input above, the key points are:",
    "Summary of the requested output:",
  ];
  return [
    openers[variant],
    "",
    topic,
    "",
    "— Generated by the Wasl simulated model. Connect an API key in Settings → Credentials to run this node against a real provider.",
  ].join("\n");
}
