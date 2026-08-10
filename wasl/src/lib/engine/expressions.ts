import { getPath, toText } from "@/lib/utils";

/**
 * Template expressions.
 *
 * Anywhere a field accepts data you can write:
 *   {{$input}}            the value arriving from the connected upstream node
 *   {{$input.body.title}} a path into that value
 *   {{$item}} {{$index}}  the current item when a node is fanning out over a list
 *   {{$trigger.topic}}    a field collected by the trigger
 *   {{abc123.text}}       any earlier node's output, by node id
 *   {{$now}} {{$runId}}   run metadata
 *
 * If a field contains exactly one expression the *raw* value is returned so
 * objects and arrays keep their type. Mixed text/expression fields are
 * stringified and concatenated.
 */

export interface ResolveContext {
  /** Primary value arriving from upstream. */
  input: unknown;
  /** Outputs of every completed node, keyed by node id. */
  nodeOutputs: Record<string, unknown>;
  /** Inputs supplied by the trigger. */
  trigger: Record<string, unknown>;
  /** Current item + index while fanning out over a list. */
  item?: unknown;
  index?: number;
  runId: string;
  /** Human labels so `{{My node.field}}` also works. */
  labelToId?: Record<string, string>;
}

const EXPRESSION = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function resolveExpression(raw: string, context: ResolveContext): unknown {
  if (typeof raw !== "string" || !raw.includes("{{")) return raw;

  const matches = [...raw.matchAll(EXPRESSION)];
  if (matches.length === 0) return raw;

  // Single expression that spans the whole string -> keep the native type.
  if (matches.length === 1 && matches[0][0].trim() === raw.trim()) {
    return lookup(matches[0][1], context);
  }

  return raw.replace(EXPRESSION, (_full, expression: string) => toText(lookup(expression, context)));
}

/** Resolve every string field of a config object (recursively). */
export function resolveConfig(
  config: Record<string, unknown>,
  context: ResolveContext,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    output[key] = resolveDeep(value, context);
  }
  return output;
}

function resolveDeep(value: unknown, context: ResolveContext): unknown {
  if (typeof value === "string") return resolveExpression(value, context);
  if (Array.isArray(value)) return value.map((entry) => resolveDeep(entry, context));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, resolveDeep(entry, context)]),
    );
  }
  return value;
}

function lookup(expression: string, context: ResolveContext): unknown {
  const trimmed = expression.trim();
  if (!trimmed) return "";

  // Split "head.rest.of.path"
  const dot = trimmed.indexOf(".");
  const head = dot === -1 ? trimmed : trimmed.slice(0, dot);
  const path = dot === -1 ? "" : trimmed.slice(dot + 1);

  switch (head) {
    case "$input":
    case "$prev":
      return path ? getPath(context.input, path) : context.input;
    case "$item":
      return path ? getPath(context.item, path) : context.item;
    case "$index":
      return context.index ?? 0;
    case "$trigger":
    case "$vars":
      return path ? getPath(context.trigger, path) : context.trigger;
    case "$now":
      return new Date().toISOString();
    case "$today":
      return new Date().toISOString().slice(0, 10);
    case "$runId":
      return context.runId;
    default:
      break;
  }

  // Node id reference.
  if (head in context.nodeOutputs) {
    const value = context.nodeOutputs[head];
    return path ? getPath(value, path) : value;
  }

  // Node label reference, e.g. {{Read web page.text}}
  if (context.labelToId) {
    const byLabel = context.labelToId[head] ?? context.labelToId[trimmed];
    if (byLabel && byLabel in context.nodeOutputs) {
      const value = context.nodeOutputs[byLabel];
      const remainder = context.labelToId[trimmed] ? "" : path;
      return remainder ? getPath(value, remainder) : value;
    }
  }

  // Fall back to a trigger field so {{topic}} works as shorthand.
  if (trimmed in context.trigger) return context.trigger[trimmed];

  return "";
}

/** List every reference used in a graph's config — powers the inspector hints. */
export function collectReferences(value: unknown, found = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    for (const match of value.matchAll(EXPRESSION)) found.add(match[1].trim());
  } else if (Array.isArray(value)) {
    for (const entry of value) collectReferences(entry, found);
  } else if (value && typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) collectReferences(entry, found);
  }
  return found;
}
