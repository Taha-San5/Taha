/**
 * Model catalog. Deliberately free of node-only imports so the browser
 * (node palette, inspector, pricing page) can render it too.
 */

export interface ModelSpec {
  id: string;
  label: string;
  provider: string;
  /** Credits charged per call when using the platform key. */
  credits: number;
  contextWindow: number;
}

export const MODELS: ModelSpec[] = [
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "openai", credits: 1, contextWindow: 128_000 },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai", credits: 6, contextWindow: 128_000 },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini", provider: "openai", credits: 2, contextWindow: 1_000_000 },
  { id: "gpt-4.1", label: "GPT-4.1", provider: "openai", credits: 8, contextWindow: 1_000_000 },
  { id: "o4-mini", label: "o4-mini (reasoning)", provider: "openai", credits: 10, contextWindow: 200_000 },
  { id: "claude-sonnet-4", label: "Claude Sonnet 4", provider: "anthropic", credits: 7, contextWindow: 200_000 },
  { id: "claude-haiku-4", label: "Claude Haiku 4", provider: "anthropic", credits: 2, contextWindow: 200_000 },
  { id: "llama-3.3-70b", label: "Llama 3.3 70B", provider: "meta", credits: 1, contextWindow: 128_000 },
];

export const DEFAULT_MODEL = "gpt-4o-mini";

export function modelSpec(modelId: string): ModelSpec {
  return MODELS.find((model) => model.id === modelId) ?? MODELS[0];
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
