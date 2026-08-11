import "server-only";

import { autoLayout } from "@/lib/engine/layout";
import { complete, parseJsonReply } from "@/lib/llm";
import { defaultConfig, NODE_DEFINITIONS, nodeDef, resolveOutputs } from "@/lib/nodes/registry";
import type { FlowGraph, WaslEdge, WaslNode } from "@/lib/nodes/types";
import { id } from "@/lib/utils";

export interface GeneratedFlow {
  name: string;
  description: string;
  emoji: string;
  graph: FlowGraph;
  /** True when the graph came from the keyword planner instead of a model. */
  heuristic: boolean;
  notes: string[];
}

/** Compact catalog handed to the model so it only invents valid nodes. */
function catalogForPrompt(): string {
  return NODE_DEFINITIONS.map((definition) => {
    const fields = definition.fields
      .map((field) => `${field.key}${field.required ? "*" : ""}:${field.type}`)
      .join(", ");
    const outputs = definition.outputs.map((output) => output.id).join("|") || "(dynamic)";
    return `- ${definition.type} [${definition.category}] ${definition.description} | fields: ${fields || "none"} | outputs: ${outputs}`;
  }).join("\n");
}

const SYSTEM = `You design automation graphs for Wasl, a visual AI workflow platform.
Reply with ONE JSON object and nothing else:
{
  "name": "short flow name",
  "description": "one sentence",
  "nodes": [{ "id": "kebab-id", "type": "<node type>", "config": { ... } }],
  "edges": [{ "source": "id", "target": "id", "sourceHandle": "out" }]
}

Rules:
- The first node MUST be a trigger.* node.
- Use only the node types listed below, and only their listed fields.
- Reference data with {{$input}}, {{$item}}, {{$trigger.fieldName}} or {{nodeId.path}}.
- data.scrape output is { url, title, text }; data.http output is { status, body, headers }.
- Prefer few, well-configured nodes over many empty ones. 3-8 nodes is ideal.
- End with an output.result node (or action.file when the user wants a file).
- For logic.if use sourceHandle "true"/"false". For ai.classify / logic.switch the
  sourceHandle must be the lowercased category with non-letters replaced by "_".`;

export async function generateFlow(prompt: string, apiKey?: string): Promise<GeneratedFlow> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("Describe what the flow should do");

  const result = await complete({
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Available nodes:\n${catalogForPrompt()}\n\nBuild a flow that does this:\n"""\n${trimmed}\n"""`,
      },
    ],
    json: true,
    temperature: 0.2,
    maxTokens: 2400,
    apiKey,
  });

  // The simulated model cannot author a real graph, so fall back to the planner.
  if (result.simulated) {
    return planFromKeywords(trimmed);
  }

  const parsed = parseJsonReply<{
    name?: string;
    description?: string;
    nodes?: { id?: string; type?: string; config?: Record<string, unknown>; label?: string }[];
    edges?: { source?: string; target?: string; sourceHandle?: string; targetHandle?: string }[];
  }>(result.text);

  if (!parsed?.nodes?.length) {
    const fallback = planFromKeywords(trimmed);
    fallback.notes.unshift("The model did not return a usable graph, so a keyword plan was used instead.");
    return fallback;
  }

  const { graph, notes } = normalise(parsed.nodes, parsed.edges ?? []);
  if (graph.nodes.length === 0) {
    const fallback = planFromKeywords(trimmed);
    fallback.notes.unshift("The model returned only unknown node types, so a keyword plan was used instead.");
    return fallback;
  }

  return {
    name: (parsed.name ?? "Generated flow").slice(0, 100),
    description: (parsed.description ?? trimmed).slice(0, 400),
    emoji: graph.nodes.find((node) => nodeDef(node.type)?.category === "ai") ? "Sparkles" : "Zap",
    graph: autoLayout(graph),
    heuristic: false,
    notes,
  };
}

/** Drops unknown nodes/edges, fills defaults, and repairs handles. */
function normalise(
  rawNodes: { id?: string; type?: string; config?: Record<string, unknown>; label?: string }[],
  rawEdges: { source?: string; target?: string; sourceHandle?: string; targetHandle?: string }[],
): { graph: FlowGraph; notes: string[] } {
  const notes: string[] = [];
  const nodes: WaslNode[] = [];
  const idMap = new Map<string, string>();

  rawNodes.forEach((raw, index) => {
    const type = String(raw.type ?? "");
    const definition = nodeDef(type);
    if (!definition) {
      notes.push(`Skipped unknown node type "${type}".`);
      return;
    }
    const originalId = String(raw.id ?? `n${index}`);
    const nodeId = idMap.has(originalId) ? `${originalId}-${id(4)}` : originalId;
    idMap.set(originalId, nodeId);

    const config = { ...defaultConfig(type) };
    for (const [key, value] of Object.entries(raw.config ?? {})) {
      if (definition.fields.some((field) => field.key === key)) {
        config[key] = value;
      } else {
        notes.push(`Ignored unsupported field "${key}" on ${type}.`);
      }
    }

    nodes.push({
      id: nodeId,
      type,
      position: { x: 0, y: index * 180 },
      data: { ...(raw.label ? { label: String(raw.label).slice(0, 80) } : {}), config },
    });
  });

  const known = new Set(nodes.map((node) => node.id));
  const edges: WaslEdge[] = [];

  for (const raw of rawEdges) {
    const source = idMap.get(String(raw.source ?? "")) ?? String(raw.source ?? "");
    const target = idMap.get(String(raw.target ?? "")) ?? String(raw.target ?? "");
    if (!known.has(source) || !known.has(target) || source === target) continue;

    const sourceNode = nodes.find((node) => node.id === source)!;
    const handles = resolveOutputs(sourceNode.type, sourceNode.data.config);
    const requested = raw.sourceHandle ?? "out";
    const sourceHandle = handles.some((handle) => handle.id === requested) ? requested : handles[0]?.id ?? "out";

    const edgeId = `${source}-${sourceHandle}-${target}`;
    if (edges.some((edge) => edge.id === edgeId)) continue;

    edges.push({ id: edgeId, source, target, sourceHandle, targetHandle: raw.targetHandle ?? "in" });
  }

  return { graph: { nodes, edges }, notes };
}

// ---------------------------------------------------------------------------
// Keyword planner — the offline / no-key path
// ---------------------------------------------------------------------------

interface Step {
  type: string;
  config?: Record<string, unknown>;
}

/**
 * Builds a sensible graph from the words in the request. This keeps the
 * "describe your flow" feature useful on a fresh install with no model key,
 * and it is a reasonable safety net when a model reply cannot be parsed.
 */
export function planFromKeywords(prompt: string): GeneratedFlow {
  const text = prompt.toLowerCase();
  const notes: string[] = [
    "Drafted from keywords because no model key is configured. Add an OpenAI-compatible credential for richer graphs.",
  ];

  const has = (...patterns: (string | RegExp)[]) =>
    patterns.some((pattern) =>
      typeof pattern === "string" ? text.includes(pattern) : pattern.test(text),
    );

  const scheduled = has("every day", "daily", "each morning", "every morning", "hourly", "every week", "weekly", "كل يوم", "كل صباح", "أسبوعي", "يومياً", "دورياً");
  const webhookish = has("webhook", "when a", "whenever", "incoming", "ticket", "form submit", "ويب هوك", "عند وصول");
  const chatish = has("chatbot", "chat", "assistant", "محادثة", "مساعد");

  const wantsScrape = has("url", "website", "web page", "page", "article", "link", "scrape", "read the", "رابط", "موقع", "صفحة", "مقال");
  const wantsHttp = has("api", "endpoint", "rest", "request", "http", "واجهة", "نقطة نهاية");
  const wantsSummary = has("summar", "digest", "tldr", "brief", "لخص", "تلخيص", "ملخص", "موجز");
  const wantsExtract = has("extract", "structured", "fields", "enrich", "parse out", "استخرج", "استخراج", "حقول", "إثراء");
  const wantsClassify = has("classif", "categor", "triage", "route", "label", "sentiment", "spam", "صنف", "تصنيف", "توجيه");
  const wantsTranslateAr = has("arabic", "in arabic", "بالعربية", "العربية", "ترجم");
  const wantsList = has("each", "every item", "list of", "loop", "for each", "top ", "لكل", "قائمة", "كرر");
  const wantsSlack = has("slack", "سلاك");
  const wantsFile = has("csv", "file", "export", "download", "spreadsheet", "ملف", "تصدير");
  const wantsWrite = has("write", "draft", "generate", "post", "tweet", "email copy", "اكتب", "أنشئ", "صياغة", "منشور");

  const steps: Step[] = [];

  // 1. trigger
  if (scheduled) {
    steps.push({ type: "trigger.schedule", config: { interval: has("hour", "ساعة") ? "hourly" : has("week", "أسبوع") ? "weekly" : "daily", hour: 8 } });
  } else if (webhookish) {
    steps.push({ type: "trigger.webhook" });
  } else if (chatish) {
    steps.push({ type: "trigger.chat" });
  } else {
    const inputs = wantsScrape ? ["url"] : wantsHttp ? ["query"] : ["topic"];
    if (has("question", "ask", "سؤال", "اسأل")) inputs.push("question");
    steps.push({ type: "trigger.manual", config: { inputs } });
  }

  const triggerType = steps[0].type;
  const seed =
    triggerType === "trigger.manual"
      ? wantsScrape
        ? "{{$trigger.url}}"
        : "{{$trigger.topic}}"
      : "{{$input}}";

  // 2. gather
  if (wantsScrape) {
    steps.push({ type: "data.scrape", config: { url: seed, maxChars: 12000 } });
  } else if (wantsHttp) {
    steps.push({ type: "data.http", config: { method: "GET", url: "https://api.example.com/search?q=" + seed, retries: 1 } });
  }

  const gathered = wantsScrape ? "{{$input.text}}" : "{{$input}}";

  // 3. fan out over a list when the request implies "for each"
  if (wantsList && !wantsClassify) {
    steps.push({
      type: "ai.ask",
      config: {
        system: "You extract clean lists and never add commentary.",
        prompt: `List the most relevant items from the content below.\nOutput one item per line, nothing else.\n\n${gathered}`,
        temperature: 0,
      },
    });
    steps.push({ type: "data.split", config: { mode: "lines", trim: true } });
    steps.push({ type: "data.slice", config: { count: 5, offset: 0 } });
  }

  // 4. reason
  const perItem = wantsList && !wantsClassify;
  const reasonSource = perItem ? "{{$item}}" : gathered;

  if (wantsClassify) {
    steps.push({
      type: "ai.classify",
      config: {
        source: reasonSource,
        categories: has("spam") ? ["urgent", "normal", "spam"] : ["urgent", "normal", "low"],
      },
    });
  } else if (wantsExtract) {
    steps.push({
      type: "ai.extract",
      config: {
        source: reasonSource,
        schema: [
          { key: "title", value: "the main title or subject" },
          { key: "summary", value: "one sentence summary" },
          { key: "contact_email", value: "any email found, else null" },
        ],
      },
    });
  } else if (wantsSummary) {
    steps.push({
      type: "ai.summarize",
      config: { source: reasonSource, style: "bullets", language: wantsTranslateAr ? "ar" : "auto" },
    });
  } else if (wantsWrite || wantsTranslateAr) {
    steps.push({
      type: "ai.ask",
      config: {
        prompt: wantsTranslateAr
          ? `اكتب النتيجة المطلوبة بالعربية الفصحى بناءً على المحتوى التالي:\n\n${reasonSource}`
          : `${prompt.trim()}\n\nContent:\n${reasonSource}`,
        temperature: 0.6,
      },
    });
  } else {
    steps.push({
      type: "ai.ask",
      config: { prompt: `${prompt.trim()}\n\nInput:\n${reasonSource}`, temperature: 0.4 },
    });
  }

  // 5. collapse a fan-out back to one value
  if (perItem) {
    steps.push({ type: "data.join", config: { separator: "numbered" } });
  }

  // 6. deliver
  if (wantsSlack) {
    steps.push({ type: "data.template", config: { template: "{{$input}}" } });
    steps.push({ type: "action.slack", config: { text: "{{$input}}" } });
  } else if (wantsFile) {
    steps.push({
      type: "action.file",
      config: { filename: has("csv") ? "output.csv" : "output.md", format: has("csv") ? "csv" : "text" },
    });
  } else {
    steps.push({ type: "output.result", config: { name: "result", value: "{{$input}}" } });
  }

  // Build the linear graph.
  const nodes: WaslNode[] = steps.map((step, index) => {
    const short = step.type.split(".")[1] ?? step.type;
    return {
      id: `${short}-${index + 1}`,
      type: step.type,
      position: { x: 0, y: index * 180 },
      data: { config: { ...defaultConfig(step.type), ...(step.config ?? {}) } },
    };
  });

  const edges: WaslEdge[] = [];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    const source = nodes[index];
    const target = nodes[index + 1];
    const handles = resolveOutputs(source.type, source.data.config);
    const sourceHandle = handles[0]?.id ?? "out";
    edges.push({
      id: `${source.id}-${sourceHandle}-${target.id}`,
      source: source.id,
      target: target.id,
      sourceHandle,
      targetHandle: "in",
    });
  }

  // A classifier only wires its first branch above; connect the rest too so no
  // category silently dead-ends.
  const classifier = nodes.find((node) => node.type === "ai.classify");
  if (classifier) {
    const next = nodes[nodes.indexOf(classifier) + 1];
    if (next) {
      for (const handle of resolveOutputs(classifier.type, classifier.data.config)) {
        const edgeId = `${classifier.id}-${handle.id}-${next.id}`;
        if (!edges.some((edge) => edge.id === edgeId)) {
          edges.push({
            id: edgeId,
            source: classifier.id,
            target: next.id,
            sourceHandle: handle.id,
            targetHandle: "in",
          });
        }
      }
    }
  }

  notes.push(`Planned ${nodes.length} nodes. Adjust any prompt or condition before running.`);

  return {
    name: titleFrom(prompt),
    description: prompt.trim().slice(0, 400),
    emoji: wantsSlack ? "Send" : wantsSummary ? "AlignLeft" : "Sparkles",
    graph: autoLayout({ nodes, edges }),
    heuristic: true,
    notes,
  };
}

function titleFrom(prompt: string): string {
  const words = prompt.trim().replace(/\s+/g, " ").split(" ");
  const title = words.slice(0, 7).join(" ");
  return (title.charAt(0).toUpperCase() + title.slice(1)).slice(0, 80) || "Generated flow";
}
