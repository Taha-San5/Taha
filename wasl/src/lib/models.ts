/**
 * Model catalog. Deliberately free of node-only imports so the browser
 * (node palette, inspector, pricing page) can render it too.
 *
 * Credit cost is derived, not invented. One credit is $0.005 of provider spend
 * (so $1 buys 200 credits). A "typical" automation call is assumed to be
 * 3K input + 800 output tokens:
 *
 *   credits = ceil(((3000 * inputPricePerM) + (800 * outputPricePerM)) / 1e6 / 0.005)
 *
 * Prices below are the provider list prices as of August 2026. When a provider
 * changes its pricing, update `inputPerM` / `outputPerM` and re-run
 * `npm run models:credits` to recompute the credit column.
 */

export interface ModelSpec {
  id: string;
  label: string;
  provider: "openai" | "anthropic" | "google";
  /** Credits charged per call when using the platform key. */
  credits: number;
  contextWindow: number;
  /** USD per 1M input tokens (provider list price). */
  inputPerM: number;
  /** USD per 1M output tokens (provider list price). */
  outputPerM: number;
  /** Shown in the model picker to explain when to reach for it. */
  blurb: string;
  blurbAr: string;
}

export const MODELS: ModelSpec[] = [
  // ------------------------------------------------------------------ OpenAI
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    provider: "openai",
    credits: 1,
    contextWindow: 1_050_000,
    inputPerM: 0.2,
    outputPerM: 1.2,
    blurb: "Fastest and cheapest. The right default for high-volume steps.",
    blurbAr: "الأسرع والأرخص. الخيار المناسب للخطوات كثيفة التكرار.",
  },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    provider: "openai",
    credits: 4,
    contextWindow: 1_050_000,
    inputPerM: 2,
    outputPerM: 12,
    blurb: "Balances intelligence and cost for everyday work.",
    blurbAr: "يوازن بين الجودة والتكلفة للعمل اليومي.",
  },
  {
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    provider: "openai",
    credits: 8,
    contextWindow: 1_050_000,
    inputPerM: 5,
    outputPerM: 30,
    blurb: "Frontier reasoning for complex, multi-step judgement.",
    blurbAr: "أعلى قدرة استنتاج للمهام المركّبة متعددة الخطوات.",
  },

  // --------------------------------------------------------------- Anthropic
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "anthropic",
    credits: 2,
    contextWindow: 200_000,
    inputPerM: 1,
    outputPerM: 5,
    blurb: "Quick and inexpensive for classification and extraction.",
    blurbAr: "سريع وزهيد للتصنيف والاستخراج.",
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    provider: "anthropic",
    credits: 5,
    contextWindow: 1_000_000,
    inputPerM: 3,
    outputPerM: 15,
    blurb: "Strong all-rounder for writing and agentic steps.",
    blurbAr: "متوازن وقوي في الكتابة وخطوات الوكلاء.",
  },
  {
    id: "claude-opus-5",
    label: "Claude Opus 5",
    provider: "anthropic",
    credits: 8,
    contextWindow: 1_000_000,
    inputPerM: 5,
    outputPerM: 25,
    blurb: "Anthropic's most capable model for hard problems.",
    blurbAr: "أقوى موديلات Anthropic للمسائل الصعبة.",
  },

  // ------------------------------------------------------------------ Google
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite",
    provider: "google",
    credits: 1,
    contextWindow: 1_000_000,
    inputPerM: 0.3,
    outputPerM: 2.5,
    blurb: "High-throughput work where latency matters most.",
    blurbAr: "للأعمال عالية الحجم حيث السرعة هي الأهم.",
  },
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    provider: "google",
    credits: 3,
    contextWindow: 1_000_000,
    inputPerM: 1.5,
    outputPerM: 7.5,
    blurb: "Efficient multimodal model, good at agentic loops.",
    blurbAr: "موديل متعدد الوسائط فعّال، جيد في حلقات الوكلاء.",
  },
  {
    id: "gemini-3.1-pro",
    label: "Gemini 3.1 Pro",
    provider: "google",
    credits: 4,
    contextWindow: 1_000_000,
    inputPerM: 2,
    outputPerM: 12,
    blurb: "Google's flagship for long-context reasoning.",
    blurbAr: "الموديل الرائد من Google للسياقات الطويلة.",
  },
];

/** Cheap and fast: most flows run many calls, so this is the sane default. */
export const DEFAULT_MODEL = "gpt-5.6-luna";

export const PROVIDER_LABELS: Record<ModelSpec["provider"], string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
};

export function modelSpec(modelId: string): ModelSpec {
  // Unknown ids fall back rather than throw, so flows saved against a
  // retired model keep running after a catalog update.
  return MODELS.find((model) => model.id === modelId) ?? MODELS[0];
}

/** The formula documented at the top of this file. */
export const CREDIT_UNIT_USD = 0.005;

export function creditsForPricing(inputPerM: number, outputPerM: number): number {
  const usd = (3000 * inputPerM + 800 * outputPerM) / 1_000_000;
  return Math.max(1, Math.ceil(usd / CREDIT_UNIT_USD));
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
