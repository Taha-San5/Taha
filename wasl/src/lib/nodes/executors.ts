import "server-only";

import vm from "node:vm";

import { complete, DEFAULT_MODEL, modelSpec, parseJsonReply } from "@/lib/llm";
import { requireNodeDef, slugHandle, toStringList } from "@/lib/nodes/registry";
import { getPath, isTruthy, sleep, stringifyJson, toText } from "@/lib/utils";

export interface ExecContext {
  workspaceId: string;
  runId: string;
  nodeId: string;
  nodeType: string;
  /** Config with all {{expressions}} already resolved. */
  config: Record<string, unknown>;
  /** Primary value from the connected upstream node. */
  input: unknown;
  /** All upstream values keyed by the input handle they arrived on. */
  inputsByHandle: Record<string, unknown>;
  trigger: Record<string, unknown>;
  item?: unknown;
  index?: number;
  log: (message: string) => void;
  /** Decrypts a workspace credential; returns null when absent. */
  getCredential: (credentialId: unknown) => Promise<string | null>;
  signal?: AbortSignal;
}

export interface ExecResult {
  output: unknown;
  /** Extra credits consumed beyond the node's base cost. */
  credits?: number;
  /** Output handle the run should follow (branching nodes only). */
  branch?: string;
  /** Contributes to the run's outputs object. */
  outputKey?: string;
}

export type Executor = (context: ExecContext) => Promise<ExecResult>;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function str(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  return typeof value === "string" ? value : toText(value);
}

function num(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1";
  return fallback;
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [value];
}

/** keyvalue fields arrive as [{key,value}] but tolerate plain objects too. */
function keyValuePairs(value: unknown): [string, string][] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (entry && typeof entry === "object") {
          const record = entry as Record<string, unknown>;
          return [str(record.key), str(record.value)] as [string, string];
        }
        return ["", ""] as [string, string];
      })
      .filter(([key]) => key.trim().length > 0);
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, str(entry)]);
  }
  return [];
}

function compare(left: unknown, operator: string, right: unknown): boolean {
  const leftText = toText(left);
  const rightText = toText(right);
  const leftNum = Number(leftText);
  const rightNum = Number(rightText);
  const numeric = Number.isFinite(leftNum) && Number.isFinite(rightNum);

  switch (operator) {
    case "equals":
      return numeric ? leftNum === rightNum : leftText.trim() === rightText.trim();
    case "not_equals":
      return !(numeric ? leftNum === rightNum : leftText.trim() === rightText.trim());
    case "contains":
      return leftText.toLowerCase().includes(rightText.toLowerCase());
    case "not_contains":
      return !leftText.toLowerCase().includes(rightText.toLowerCase());
    case "gt":
      return numeric ? leftNum > rightNum : leftText > rightText;
    case "gte":
      return numeric ? leftNum >= rightNum : leftText >= rightText;
    case "lt":
      return numeric ? leftNum < rightNum : leftText < rightText;
    case "lte":
      return numeric ? leftNum <= rightNum : leftText <= rightText;
    case "matches":
      try {
        return new RegExp(rightText, "i").test(leftText);
      } catch {
        return false;
      }
    case "is_empty":
      return !isTruthy(left);
    case "not_empty":
      return isTruthy(left);
    default:
      return false;
  }
}

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254", // cloud instance metadata
  "metadata.google.internal",
];

/**
 * Basic SSRF guard for user-supplied URLs. A production deployment should also
 * resolve DNS and reject private ranges at the socket level.
 */
function assertSafeUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl.slice(0, 120)}`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`Only http and https URLs are allowed (got ${url.protocol})`);
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw new Error(`Requests to internal address ${host} are blocked`);
  }
  return url;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 30_000): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

/** Extremely small HTML -> readable text converter. No deps, good enough. */
export function htmlToText(html: string): { title: string; text: string; links: string[] } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeEntities(titleMatch?.[1] ?? "").trim();

  const links: string[] = [];
  for (const match of html.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)) {
    const href = match[1];
    if (href.startsWith("http")) links.push(href);
  }

  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  return { title, text, links: [...new Set(links)] };
}

function decodeEntities(input: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    mdash: "—",
    ndash: "–",
    hellip: "…",
    rsquo: "’",
    lsquo: "‘",
    ldquo: "“",
    rdquo: "”",
  };
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (full, name: string) => named[name.toLowerCase()] ?? full);
}

function safeCodePoint(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

function toCsv(rows: unknown[]): string {
  if (rows.length === 0) return "";
  const objects = rows.map((row) =>
    row && typeof row === "object" && !Array.isArray(row) ? (row as Record<string, unknown>) : { value: row },
  );
  const columns = [...new Set(objects.flatMap((row) => Object.keys(row)))];
  const escape = (value: unknown) => {
    const text = toText(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [columns.join(","), ...objects.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
}

// ---------------------------------------------------------------------------
// executors
// ---------------------------------------------------------------------------

const passthroughTrigger: Executor = async (context) => ({
  output: Object.keys(context.trigger).length > 0 ? context.trigger : null,
});

const aiCall = async (
  context: ExecContext,
  options: { system?: string; prompt: string; json?: boolean; temperature?: number; maxTokens?: number },
) => {
  const model = str(context.config.model) || undefined;
  const apiKey = (await context.getCredential(context.config.credentialId)) ?? undefined;
  if (apiKey) context.log("Using workspace credential (0 credits)");

  const result = await complete({
    model,
    system: options.system,
    messages: [{ role: "user", content: options.prompt }],
    temperature: options.temperature ?? num(context.config.temperature, 0.4),
    maxTokens: options.maxTokens ?? num(context.config.maxTokens, 1200),
    json: options.json,
    apiKey,
    signal: context.signal,
  });

  context.log(
    result.simulated
      ? `Simulated model reply (${result.completionTokens} tok) — add an API key for real output`
      : `${result.model}: ${result.promptTokens} in / ${result.completionTokens} out`,
  );
  return result;
};

export const EXECUTORS: Record<string, Executor> = {
  // ------------------------------------------------------------------ triggers
  "trigger.manual": passthroughTrigger,
  "trigger.webhook": passthroughTrigger,
  "trigger.schedule": async (context) => ({
    output: { firedAt: new Date().toISOString(), ...context.trigger },
  }),
  "trigger.chat": async (context) => ({
    output: {
      message: str(context.trigger.message),
      history: asList(context.trigger.history),
    },
  }),

  // ----------------------------------------------------------------------- ai
  "ai.ask": async (context) => {
    const prompt = str(context.config.prompt);
    if (!prompt.trim()) throw new Error("Prompt is empty");
    const result = await aiCall(context, {
      system: str(context.config.system) || undefined,
      prompt,
    });
    return { output: result.text, credits: result.credits };
  },

  "ai.extract": async (context) => {
    const source = str(context.config.source);
    const pairs = keyValuePairs(context.config.schema);
    if (pairs.length === 0) throw new Error("Add at least one field to extract");

    const shape = `{\n${pairs.map(([key, description]) => `  "${key}": ${JSON.stringify(description || "value")}`).join(",\n")}\n}`;
    const prompt = [
      "Extract the requested fields from the source text.",
      "Reply with a single JSON object using exactly these keys. Use null when a value is absent.",
      "",
      `Shape:\n${shape}`,
      "",
      `Source text:\n"""\n${source}\n"""`,
    ].join("\n");

    const result = await aiCall(context, { prompt, json: true, temperature: 0 });
    const parsed = parseJsonReply<Record<string, unknown>>(result.text);
    if (!parsed) {
      context.log("Model did not return valid JSON; wrapping raw text");
      return { output: { raw: result.text }, credits: result.credits };
    }
    // Guarantee every requested key exists so downstream paths never break.
    const normalized: Record<string, unknown> = {};
    for (const [key] of pairs) normalized[key] = parsed[key] ?? null;
    return { output: normalized, credits: result.credits };
  },

  "ai.classify": async (context) => {
    const source = str(context.config.source);
    const categories = toStringList(context.config.categories, ["urgent", "normal", "spam"]);
    const guidance = str(context.config.instructions);

    const prompt = [
      "Classify the text into exactly one category.",
      `Categories: [${categories.join(", ")}]`,
      guidance ? `Guidance: ${guidance}` : "",
      "Reply with the category name only — no punctuation, no explanation.",
      "",
      `Text:\n"""\n${source}\n"""`,
    ]
      .filter(Boolean)
      .join("\n");

    const result = await aiCall(context, { prompt, temperature: 0, maxTokens: 24 });
    const reply = result.text.trim().toLowerCase();
    const matched =
      categories.find((category) => category.toLowerCase() === reply) ??
      categories.find((category) => reply.includes(category.toLowerCase())) ??
      categories[0];

    context.log(`Classified as "${matched}"`);
    return { output: matched, credits: result.credits, branch: slugHandle(matched) };
  },

  "ai.summarize": async (context) => {
    const source = str(context.config.source);
    if (!source.trim()) return { output: "" };
    const style = str(context.config.style, "bullets");
    const language = str(context.config.language, "auto");

    const styleInstruction =
      style === "bullets"
        ? "Reply with 3-6 concise bullet points, one per line, each starting with '• '."
        : style === "headline"
          ? "Reply with a single headline of at most 15 words."
          : "Reply with one tight paragraph of at most 90 words.";

    const languageInstruction =
      language === "ar"
        ? "Write the summary in Arabic."
        : language === "en"
          ? "Write the summary in English."
          : "Write the summary in the same language as the source.";

    const result = await aiCall(context, {
      system: "You are an editor who writes dense, factual summaries with no preamble.",
      prompt: `Summarise the text below.\n${styleInstruction}\n${languageInstruction}\n\nText:\n"""\n${source}\n"""`,
      temperature: 0.2,
    });
    return { output: result.text.trim(), credits: result.credits };
  },

  "ai.agent": async (context) => {
    const goal = str(context.config.goal);
    if (!goal.trim()) throw new Error("Agent goal is empty");
    const maxSteps = Math.min(10, Math.max(1, num(context.config.maxSteps, 4)));
    const toolsEnabled = str(context.config.tools, "fetch") === "fetch";

    const toolDoc = toolsEnabled
      ? 'Available tool: {"tool":"fetch","url":"https://…"} fetches a web page and returns its text.'
      : "You have no tools; answer from reasoning alone.";

    const transcript: { step: number; thought: string; action: string; observation: string }[] = [];
    let credits = 0;
    let answer = "";

    for (let step = 1; step <= maxSteps; step += 1) {
      const history = transcript
        .map((entry) => `Step ${entry.step}\naction: ${entry.action}\nobservation: ${entry.observation.slice(0, 2000)}`)
        .join("\n\n");

      const prompt = [
        `Goal: ${goal}`,
        toolDoc,
        "",
        'Respond with a single JSON object. To use a tool: {"thought":"…","tool":"fetch","url":"…"}.',
        'When you can answer: {"thought":"…","answer":"…"}.',
        history ? `\nWork so far:\n${history}` : "",
        step === maxSteps ? "\nThis is your final step — you must return an answer." : "",
      ].join("\n");

      const result = await aiCall(context, {
        system: "You are a careful research agent. Always reply with one JSON object and nothing else.",
        prompt,
        json: true,
        temperature: 0.2,
      });
      credits += result.credits;

      const decision = parseJsonReply<{ thought?: string; tool?: string; url?: string; answer?: string }>(result.text);
      if (!decision) {
        answer = result.text.trim();
        transcript.push({ step, thought: "", action: "answer (unparsed)", observation: "" });
        break;
      }

      if (decision.answer || !toolsEnabled || step === maxSteps || decision.tool !== "fetch") {
        answer = str(decision.answer) || result.text.trim();
        transcript.push({ step, thought: str(decision.thought), action: "answer", observation: "" });
        break;
      }

      let observation: string;
      try {
        const url = assertSafeUrl(str(decision.url));
        context.log(`Step ${step}: fetching ${url.href}`);
        const response = await fetchWithTimeout(url.href, {
          headers: { "User-Agent": "WaslBot/1.0 (+https://wasl.app)" },
        });
        const html = await response.text();
        observation = htmlToText(html).text.slice(0, 6000);
      } catch (error) {
        observation = `fetch failed: ${error instanceof Error ? error.message : String(error)}`;
        context.log(`Step ${step}: ${observation}`);
      }

      transcript.push({
        step,
        thought: str(decision.thought),
        action: `fetch ${str(decision.url)}`,
        observation,
      });
    }

    return {
      output: { answer, steps: transcript },
      credits,
    };
  },

  // --------------------------------------------------------------------- data
  "data.http": async (context) => {
    const method = str(context.config.method, "GET").toUpperCase();
    const url = assertSafeUrl(str(context.config.url));
    const headers: Record<string, string> = Object.fromEntries(keyValuePairs(context.config.headers));

    const token = await context.getCredential(context.config.credentialId);
    if (token) headers.Authorization = headers.Authorization ?? `Bearer ${token}`;

    let body: string | undefined;
    if (!["GET", "HEAD"].includes(method)) {
      const raw = context.config.body;
      if (raw != null && raw !== "") {
        body = typeof raw === "string" ? raw : stringifyJson(raw);
        if (!headers["Content-Type"] && !headers["content-type"]) {
          headers["Content-Type"] = body.trimStart().startsWith("{") || body.trimStart().startsWith("[")
            ? "application/json"
            : "text/plain";
        }
      }
    }

    const retries = Math.min(5, Math.max(0, num(context.config.retries, 1)));
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      if (attempt > 0) {
        const backoff = 400 * 2 ** (attempt - 1);
        context.log(`Retry ${attempt}/${retries} after ${backoff}ms`);
        await sleep(backoff);
      }
      try {
        const response = await fetchWithTimeout(url.href, { method, headers, body });
        const text = await response.text();
        const contentType = response.headers.get("content-type") ?? "";
        const parsed = contentType.includes("json") ? (parseJsonSafe(text) ?? text) : text;

        context.log(`${method} ${url.href} -> ${response.status}`);

        const payload = {
          status: response.status,
          ok: response.ok,
          body: parsed,
          headers: Object.fromEntries(response.headers.entries()),
        };

        if (!response.ok) {
          if (attempt < retries && response.status >= 500) {
            lastError = new Error(`HTTP ${response.status}`);
            continue;
          }
          return { output: payload, branch: "error" };
        }
        return { output: payload };
      } catch (error) {
        lastError = error;
        if (attempt >= retries) break;
      }
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError);
    context.log(`Request failed: ${message}`);
    return { output: { status: 0, ok: false, error: message, body: null, headers: {} }, branch: "error" };
  },

  "data.scrape": async (context) => {
    const url = assertSafeUrl(str(context.config.url));
    const maxChars = num(context.config.maxChars, 8000);

    const response = await fetchWithTimeout(url.href, {
      headers: {
        "User-Agent": "WaslBot/1.0 (+https://wasl.app)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) throw new Error(`Could not read ${url.href} (HTTP ${response.status})`);

    const raw = await response.text();
    const { title, text, links } = htmlToText(raw);
    const clipped = text.slice(0, maxChars);
    context.log(`Read ${url.hostname}: ${clipped.length} chars, ${links.length} links`);

    return {
      output: {
        url: url.href,
        title,
        text: clipped,
        truncated: text.length > maxChars,
        ...(bool(context.config.includeLinks) ? { links } : {}),
      },
    };
  },

  "data.template": async (context) => ({ output: str(context.config.template) }),

  "data.code": async (context) => {
    const code = str(context.config.code);
    if (!code.trim()) return { output: context.input };
    const timeout = Math.min(15_000, Math.max(50, num(context.config.timeoutMs, 2000)));

    const logs: string[] = [];
    const sandbox = {
      input: context.input,
      inputs: context.inputsByHandle,
      vars: context.trigger,
      item: context.item,
      index: context.index ?? 0,
      JSON,
      Math,
      Date,
      Number,
      String,
      Boolean,
      Array,
      Object,
      RegExp,
      Map,
      Set,
      isNaN,
      parseInt,
      parseFloat,
      encodeURIComponent,
      decodeURIComponent,
      console: {
        log: (...args: unknown[]) => logs.push(args.map(toText).join(" ")),
        warn: (...args: unknown[]) => logs.push(`warn: ${args.map(toText).join(" ")}`),
        error: (...args: unknown[]) => logs.push(`error: ${args.map(toText).join(" ")}`),
      },
      __result: undefined as unknown,
    };

    try {
      // node:vm enforces the timeout for synchronous code. It is NOT a security
      // boundary — run untrusted code in isolated-vm or a separate process.
      vm.runInNewContext(`__result = (function(){\n${code}\n})();`, sandbox, {
        timeout,
        displayErrors: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const line of logs) context.log(line);
      throw new Error(`JavaScript error: ${message}`);
    }

    for (const line of logs) context.log(line);
    return { output: sandbox.__result ?? null };
  },

  "data.json": async (context) => {
    const path = str(context.config.path);
    const value = path ? getPath(context.input, path) : context.input;
    if (value === undefined) {
      const fallback = context.config.fallback;
      context.log(`Path "${path}" not found; using fallback`);
      return { output: fallback ?? null };
    }
    return { output: value };
  },

  "data.split": async (context) => {
    const mode = str(context.config.mode, "lines");
    const trim = bool(context.config.trim, true);
    const source = Array.isArray(context.input) ? context.input.map(toText).join("\n") : toText(context.input);

    let parts: string[];
    switch (mode) {
      case "comma":
        parts = source.split(/[,،]/);
        break;
      case "paragraph":
        parts = source.split(/\n\s*\n/);
        break;
      case "custom":
        parts = source.split(str(context.config.separator, "|"));
        break;
      case "chunk": {
        const size = Math.max(100, num(context.config.chunkSize, 2000));
        parts = [];
        for (let index = 0; index < source.length; index += size) {
          parts.push(source.slice(index, index + size));
        }
        break;
      }
      default:
        parts = source.split(/\r?\n/);
    }

    const result = trim ? parts.map((part) => part.trim()).filter(Boolean) : parts;
    context.log(`Split into ${result.length} item(s)`);
    return { output: result };
  },

  "data.join": async (context) => {
    const items = asList(context.input).map(toText);
    const separator = str(context.config.separator, "newline");
    let output: string;
    switch (separator) {
      case "blank":
        output = items.join("\n\n");
        break;
      case "comma":
        output = items.join(", ");
        break;
      case "bullet":
        output = items.map((item) => `• ${item}`).join("\n");
        break;
      case "numbered":
        output = items.map((item, index) => `${index + 1}. ${item}`).join("\n");
        break;
      default:
        output = items.join("\n");
    }
    return { output };
  },

  "data.filter": async (context) => {
    const items = asList(context.input);
    const path = str(context.config.path);
    const operator = str(context.config.operator, "contains");
    const value = context.config.value;

    const kept = items.filter((item) => {
      const target = path ? getPath(item, path) : item;
      return compare(target, operator, value);
    });
    context.log(`Kept ${kept.length} of ${items.length}`);
    return { output: kept };
  },

  "data.unique": async (context) => {
    const items = asList(context.input);
    const path = str(context.config.path);
    const caseInsensitive = bool(context.config.caseInsensitive, true);
    const seen = new Set<string>();
    const kept: unknown[] = [];

    for (const item of items) {
      const target = path ? getPath(item, path) : item;
      let key = toText(target);
      if (caseInsensitive) key = key.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push(item);
    }
    context.log(`Removed ${items.length - kept.length} duplicate(s)`);
    return { output: kept };
  },

  "data.slice": async (context) => {
    const items = asList(context.input);
    const offset = Math.max(0, num(context.config.offset, 0));
    const count = Math.max(1, num(context.config.count, 10));
    return { output: items.slice(offset, offset + count) };
  },

  // -------------------------------------------------------------------- logic
  "logic.if": async (context) => {
    const operator = str(context.config.operator, "contains");
    const result = compare(context.config.left, operator, context.config.right);
    context.log(`Condition -> ${result ? "true" : "false"}`);
    return { output: context.input, branch: result ? "true" : "false" };
  },

  "logic.switch": async (context) => {
    const value = toText(context.config.value).toLowerCase();
    const cases = toStringList(context.config.cases, []);
    const matched = cases.find((entry) => value.includes(entry.toLowerCase()));
    const branch = matched ? slugHandle(matched) : "else";
    context.log(`Routed to "${matched ?? "else"}"`);
    return { output: context.input, branch };
  },

  "logic.foreach": async (context) => {
    const items = asList(context.input);
    const limit = Math.max(1, num(context.config.limit, 25));
    const capped = items.slice(0, limit);
    if (items.length > capped.length) {
      context.log(`Limited ${items.length} items to ${capped.length}`);
    }
    context.log(`Fanning out over ${capped.length} item(s)`);
    return { output: capped };
  },

  "logic.merge": async (context) => {
    const mode = str(context.config.mode, "first");
    const live = Object.entries(context.inputsByHandle)
      .filter(([, value]) => value !== undefined)
      .map(([, value]) => value);
    if (mode === "collect") return { output: live };
    return { output: live[0] ?? null };
  },

  "logic.delay": async (context) => {
    const ms = Math.min(30_000, Math.max(0, num(context.config.ms, 1000)));
    context.log(`Waiting ${ms}ms`);
    await sleep(ms);
    return { output: context.input };
  },

  // ------------------------------------------------------------------ actions
  "action.slack": async (context) => {
    const webhook = await context.getCredential(context.config.credentialId);
    const text = str(context.config.text);

    // Without a credential we run in preview mode: the run still completes and
    // the trace shows exactly what *would* have been sent, flagged as not
    // delivered. This keeps templates testable before Slack is connected.
    if (!webhook) {
      context.log("No Slack credential attached — previewing instead of sending");
      return {
        output: {
          delivered: false,
          reason: "no_credential",
          preview: text,
        },
      };
    }

    const url = assertSafeUrl(webhook);
    const response = await fetchWithTimeout(url.href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Slack rejected the message (${response.status}): ${body.slice(0, 200)}`);
    context.log("Message delivered to Slack");
    return { output: { delivered: true, text } };
  },

  "action.webhook": async (context) => {
    const url = assertSafeUrl(str(context.config.url));
    const mode = str(context.config.payloadMode, "wrapped");
    const payload =
      mode === "raw"
        ? context.input
        : mode === "custom"
          ? (parseJsonSafe(str(context.config.body)) ?? str(context.config.body))
          : { data: context.input, runId: context.runId };

    const response = await fetchWithTimeout(url.href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof payload === "string" ? payload : stringifyJson(payload),
    });
    const text = await response.text();
    context.log(`POST ${url.href} -> ${response.status}`);
    if (!response.ok) throw new Error(`Webhook returned ${response.status}: ${text.slice(0, 200)}`);
    return { output: { status: response.status, body: parseJsonSafe(text) ?? text } };
  },

  "action.file": async (context) => {
    const format = str(context.config.format, "text");
    const filename = str(context.config.filename, "output.txt") || "output.txt";
    let content: string;
    if (format === "json") content = stringifyJson(context.input);
    else if (format === "csv") content = toCsv(asList(context.input));
    else content = Array.isArray(context.input) ? context.input.map(toText).join("\n") : toText(context.input);

    context.log(`Created ${filename} (${content.length} bytes)`);
    return {
      output: { filename, format, size: content.length, content },
      outputKey: filename,
    };
  },

  // ------------------------------------------------------------------- output
  "output.result": async (context) => {
    const name = str(context.config.name, "result") || "result";
    const value = context.config.value === undefined ? context.input : context.config.value;
    return { output: value, outputKey: name };
  },
};

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function getExecutor(type: string): Executor {
  const executor = EXECUTORS[type];
  if (!executor) {
    requireNodeDef(type); // throws a clearer message for unknown types
    throw new Error(`Node type "${type}" has no executor`);
  }
  return executor;
}

/**
 * Static credit estimate for a node, used to show cost before a run.
 * Actual charges come from the executor result (BYO-key AI calls cost 0).
 */
export function estimateNodeCredits(type: string, config: Record<string, unknown>): number {
  const definition = requireNodeDef(type);
  if (definition.category !== "ai") return definition.credits;
  if (config.credentialId) return definition.credits; // BYO key -> model is free
  return definition.credits + modelSpec(str(config.model, DEFAULT_MODEL)).credits;
}
