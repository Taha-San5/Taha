import { defaultConfig } from "@/lib/nodes/registry";
import type { FlowGraph, WaslEdge, WaslNode } from "@/lib/nodes/types";

/**
 * Seed template gallery. Every graph here is executable as-is — the AI nodes
 * fall back to the simulated model when no key is configured, so a freshly
 * seeded install can demo any template immediately.
 */

function n(
  id: string,
  type: string,
  column: number,
  row: number,
  config: Record<string, unknown> = {},
  label?: string,
): WaslNode {
  return {
    id,
    type,
    position: { x: column * 340, y: row * 190 },
    data: {
      ...(label ? { label } : {}),
      config: { ...defaultConfig(type), ...config },
    },
  };
}

function e(source: string, target: string, sourceHandle?: string, targetHandle?: string): WaslEdge {
  return {
    id: `${source}-${sourceHandle ?? "out"}-${target}`,
    source,
    target,
    sourceHandle: sourceHandle ?? "out",
    targetHandle: targetHandle ?? "in",
  };
}

function graph(nodes: WaslNode[], edges: WaslEdge[]): FlowGraph {
  return { nodes, edges };
}

export interface TemplateSeed {
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: "research" | "content" | "sales" | "support" | "ops" | "developer";
  emoji: string;
  featured: boolean;
  installs: number;
  graph: FlowGraph;
  triggerType: string;
}

export const TEMPLATES: TemplateSeed[] = [
  {
    slug: "page-summary-arabic",
    name: "Summarise any page in Arabic",
    nameAr: "لخّص أي صفحة بالعربية",
    description: "Give it a URL, get a clean Arabic bullet summary of the page.",
    descriptionAr: "أعطه رابطاً لتحصل على ملخص عربي منظم في نقاط.",
    category: "research",
    emoji: "FileSearch",
    featured: true,
    installs: 1284,
    triggerType: "manual",
    graph: graph(
      [
        n("trigger", "trigger.manual", 0, 0, { inputs: ["url"] }),
        n("read", "data.scrape", 1, 0, { url: "{{$trigger.url}}", maxChars: 12000 }),
        n("sum", "ai.summarize", 2, 0, {
          source: "{{read.text}}",
          style: "bullets",
          language: "ar",
        }),
        n("out", "output.result", 3, 0, { name: "summary", value: "{{$input}}" }),
      ],
      [e("trigger", "read"), e("read", "sum"), e("sum", "out")],
    ),
  },
  {
    slug: "daily-news-digest-slack",
    name: "Daily news digest to Slack",
    nameAr: "ملخص أخبار يومي إلى Slack",
    description:
      "Every morning: read a news page, pull the top headlines, summarise each one, and post a numbered digest to Slack.",
    descriptionAr:
      "كل صباح: اقرأ صفحة أخبار، واستخرج أبرز العناوين، ولخّص كل واحد، وأرسل ملخصاً مرقّماً إلى Slack.",
    category: "content",
    emoji: "Send",
    featured: true,
    installs: 942,
    triggerType: "schedule",
    graph: graph(
      [
        n("trigger", "trigger.schedule", 0, 0, { interval: "daily", hour: 6 }),
        n("read", "data.scrape", 1, 0, { url: "https://news.ycombinator.com", maxChars: 20000 }),
        n("pick", "ai.ask", 2, 0, {
          system: "You extract clean lists. Never add commentary.",
          prompt:
            "From the page text below, list the 5 most interesting story titles.\nOutput one title per line, nothing else.\n\n{{read.text}}",
          temperature: 0,
        }),
        n("split", "data.split", 3, 0, { mode: "lines", trim: true }),
        n("limit", "data.slice", 4, 0, { count: 5, offset: 0 }),
        n("brief", "ai.ask", 5, 0, {
          prompt: "In one Arabic sentence, explain why this headline matters to a tech team:\n\n{{$item}}",
          temperature: 0.3,
          maxTokens: 160,
        }),
        n("join", "data.join", 6, 0, { separator: "numbered" }),
        n("compose", "data.template", 7, 0, {
          template: "*ملخص اليوم*\n\n{{$input}}\n\n_أُنشئ بواسطة وصل_",
        }),
        n("slack", "action.slack", 8, 0, { text: "{{$input}}" }),
        n("out", "output.result", 8, 1, { name: "digest", value: "{{compose}}" }),
      ],
      [
        e("trigger", "read"),
        e("read", "pick"),
        e("pick", "split"),
        e("split", "limit"),
        e("limit", "brief"),
        e("brief", "join"),
        e("join", "compose"),
        e("compose", "slack"),
        e("compose", "out"),
      ],
    ),
  },
  {
    slug: "lead-enrichment",
    name: "Enrich a lead from its website",
    nameAr: "إثراء بيانات عميل من موقعه",
    description: "Read a company site and return structured fields: what they do, industry, size and contact email.",
    descriptionAr: "اقرأ موقع الشركة وأعد حقولاً منظمة: نشاطها، مجالها، حجمها، وبريد التواصل.",
    category: "sales",
    emoji: "Braces",
    featured: true,
    installs: 1671,
    triggerType: "manual",
    graph: graph(
      [
        n("trigger", "trigger.manual", 0, 0, { inputs: ["website"] }),
        n("read", "data.scrape", 1, 0, { url: "{{$trigger.website}}", maxChars: 15000, includeLinks: false }),
        n("extract", "ai.extract", 2, 0, {
          source: "{{read.text}}",
          schema: [
            { key: "company_name", value: "the official company name" },
            { key: "one_liner", value: "what the company does in one sentence" },
            { key: "industry", value: "primary industry" },
            { key: "employee_range", value: "estimated company size, e.g. 11-50" },
            { key: "contact_email", value: "any contact email found, else null" },
            { key: "target_customer", value: "who they sell to" },
          ],
        }),
        n("out", "output.result", 3, 0, { name: "lead", value: "{{$input}}" }),
      ],
      [e("trigger", "read"), e("read", "extract"), e("extract", "out")],
    ),
  },
  {
    slug: "support-ticket-triage",
    name: "Triage inbound support tickets",
    nameAr: "تصنيف تذاكر الدعم الواردة",
    description:
      "Receive a ticket by webhook, classify it as urgent / billing / general / spam, and alert Slack only for urgent ones.",
    descriptionAr:
      "استقبل التذكرة عبر ويب هوك، وصنّفها إلى عاجلة / فواتير / عامة / مزعجة، ونبّه Slack للعاجلة فقط.",
    category: "support",
    emoji: "GitBranch",
    featured: true,
    installs: 1105,
    triggerType: "webhook",
    graph: graph(
      [
        n("trigger", "trigger.webhook", 0, 1, {}),
        n("text", "data.template", 1, 1, {
          template: "From: {{$trigger.email}}\nSubject: {{$trigger.subject}}\n\n{{$trigger.body}}",
        }),
        n("triage", "ai.classify", 2, 1, {
          source: "{{$input}}",
          categories: ["urgent", "billing", "general", "spam"],
          instructions:
            "Outages, data loss, security issues and angry churn threats are urgent. Invoice and refund questions are billing.",
        }),
        n("alert", "data.template", 3, 0, {
          template: ":rotating_light: *Urgent ticket*\n\n{{text}}",
        }),
        n("slack", "action.slack", 4, 0, { text: "{{$input}}" }),
        n("queue", "output.result", 3, 1, { name: "routed", value: "{{triage}}" }),
        n("drop", "output.result", 3, 2, { name: "ignored", value: "spam" }),
      ],
      [
        e("trigger", "text"),
        e("text", "triage"),
        e("triage", "alert", "urgent"),
        e("alert", "slack"),
        e("triage", "queue", "billing"),
        e("triage", "queue", "general"),
        e("triage", "drop", "spam"),
      ],
    ),
  },
  {
    slug: "article-to-social-posts",
    name: "Turn an article into social posts",
    nameAr: "حوّل مقالاً إلى منشورات اجتماعية",
    description: "Read an article and produce five ready-to-post variations, each under 280 characters.",
    descriptionAr: "اقرأ مقالاً وأنتج خمس صيغ جاهزة للنشر، كل واحدة أقل من ٢٨٠ حرفاً.",
    category: "content",
    emoji: "Sparkles",
    featured: false,
    installs: 806,
    triggerType: "manual",
    graph: graph(
      [
        n("trigger", "trigger.manual", 0, 0, { inputs: ["url", "tone"] }),
        n("read", "data.scrape", 1, 0, { url: "{{$trigger.url}}", maxChars: 14000 }),
        n("write", "ai.ask", 2, 0, {
          system: "You are a social media editor who writes with zero fluff and no hashtags unless asked.",
          prompt:
            "Write 5 standalone posts about the article below.\nTone: {{$trigger.tone}}\nEach post must be under 280 characters.\nOutput one post per line with no numbering.\n\n{{read.text}}",
          temperature: 0.8,
        }),
        n("split", "data.split", 3, 0, { mode: "lines", trim: true }),
        n("limit", "data.slice", 4, 0, { count: 5 }),
        n("out", "output.result", 5, 0, { name: "posts", value: "{{$input}}" }),
      ],
      [e("trigger", "read"), e("read", "write"), e("write", "split"), e("split", "limit"), e("limit", "out")],
    ),
  },
  {
    slug: "competitor-watch-report",
    name: "Competitor watch report",
    nameAr: "تقرير مراقبة المنافسين",
    description: "Loop over a list of competitor URLs, summarise each page, and export one markdown report file.",
    descriptionAr: "كرّر على قائمة روابط المنافسين، ولخّص كل صفحة، وأصدر تقرير Markdown واحداً.",
    category: "research",
    emoji: "Layers",
    featured: false,
    installs: 517,
    triggerType: "schedule",
    graph: graph(
      [
        n("trigger", "trigger.schedule", 0, 0, { interval: "weekly", hour: 8 }),
        n("urls", "data.code", 1, 0, {
          code: "// Edit this list to track your own competitors.\nreturn [\n  'https://example.com',\n  'https://example.org',\n];",
        }),
        n("each", "logic.foreach", 2, 0, { limit: 10 }),
        n("read", "data.scrape", 3, 0, { url: "{{$item}}", maxChars: 10000 }),
        n("sum", "ai.summarize", 4, 0, { source: "{{read.text}}", style: "bullets", language: "auto" }),
        n("block", "data.template", 5, 0, { template: "## {{read.title}}\n{{read.url}}\n\n{{sum}}" }),
        n("join", "data.join", 6, 0, { separator: "blank" }),
        n("file", "action.file", 7, 0, { filename: "competitor-watch.md", format: "text" }),
      ],
      [
        e("trigger", "urls"),
        e("urls", "each"),
        e("each", "read"),
        e("read", "sum"),
        e("sum", "block"),
        e("block", "join"),
        e("join", "file"),
      ],
    ),
  },
  {
    slug: "api-health-check",
    name: "API health check with alerting",
    nameAr: "فحص صحة واجهة API مع تنبيه",
    description: "Ping an endpoint on a schedule; if it is not healthy, post the failure detail to Slack.",
    descriptionAr: "افحص نقطة نهاية دورياً، وإن لم تكن سليمة أرسل تفاصيل الخطأ إلى Slack.",
    category: "developer",
    emoji: "Radio",
    featured: false,
    installs: 634,
    triggerType: "schedule",
    graph: graph(
      [
        n("trigger", "trigger.schedule", 0, 1, { interval: "15m" }),
        n("ping", "data.http", 1, 1, {
          method: "GET",
          url: "https://httpbin.org/status/200",
          retries: 2,
        }),
        n("check", "logic.if", 2, 1, {
          left: "{{ping.status}}",
          operator: "equals",
          right: "200",
        }),
        n("ok", "output.result", 3, 0, { name: "healthy", value: "true" }),
        n("alarm", "data.template", 3, 2, {
          template: ":warning: Health check failed\nStatus: {{ping.status}}\nBody: {{ping.body}}",
        }),
        n("slack", "action.slack", 4, 2, { text: "{{$input}}" }),
        n("failout", "output.result", 4, 3, { name: "healthy", value: "false" }),
      ],
      [
        e("trigger", "ping"),
        e("ping", "check", "out"),
        e("ping", "check", "error"),
        e("check", "ok", "true"),
        e("check", "alarm", "false"),
        e("alarm", "slack"),
        e("alarm", "failout"),
      ],
    ),
  },
  {
    slug: "ask-a-webpage",
    name: "Ask a question about a page",
    nameAr: "اسأل سؤالاً عن صفحة",
    description: "Grounded Q&A: fetch a URL, then answer strictly from its content with a quote.",
    descriptionAr: "أسئلة وأجوبة مبنية على المصدر: أحضر رابطاً ثم أجب من محتواه فقط مع اقتباس.",
    category: "research",
    emoji: "MessageSquare",
    featured: true,
    installs: 1443,
    triggerType: "manual",
    graph: graph(
      [
        n("trigger", "trigger.manual", 0, 0, { inputs: ["url", "question"] }),
        n("read", "data.scrape", 1, 0, { url: "{{$trigger.url}}", maxChars: 18000 }),
        n("answer", "ai.ask", 2, 0, {
          system:
            "Answer only from the supplied source. If the answer is not present, say so plainly. Always include one short verbatim quote as evidence.",
          prompt:
            "Question: {{$trigger.question}}\n\nSource ({{read.url}}):\n\"\"\"\n{{read.text}}\n\"\"\"",
          temperature: 0.1,
        }),
        n("out", "output.result", 3, 0, { name: "answer", value: "{{$input}}" }),
      ],
      [e("trigger", "read"), e("read", "answer"), e("answer", "out")],
    ),
  },
  {
    slug: "research-agent-brief",
    name: "Research agent brief",
    nameAr: "موجز من وكيل بحثي",
    description: "Give the agent a topic; it browses, gathers facts across steps, and returns a sourced brief.",
    descriptionAr: "أعطِ الوكيل موضوعاً ليتنقّل ويجمع الحقائق على خطوات ويعيد موجزاً مع المصادر.",
    category: "research",
    emoji: "Bot",
    featured: false,
    installs: 389,
    triggerType: "manual",
    graph: graph(
      [
        n("trigger", "trigger.manual", 0, 0, { inputs: ["topic"] }),
        n("agent", "ai.agent", 1, 0, {
          goal: "Research \"{{$trigger.topic}}\" and report the 3 most important, verifiable facts with the URL you found each on.",
          tools: "fetch",
          maxSteps: 4,
        }),
        n("brief", "data.template", 2, 0, {
          template: "# {{$trigger.topic}}\n\n{{agent.answer}}\n\n---\nSteps taken: {{$index}}",
        }),
        n("file", "action.file", 3, 0, { filename: "brief.md", format: "text" }),
      ],
      [e("trigger", "agent"), e("agent", "brief"), e("brief", "file")],
    ),
  },
  {
    slug: "clean-and-dedupe-list",
    name: "Clean, dedupe and classify a list",
    nameAr: "تنظيف قائمة وإزالة تكرارها وتصنيفها",
    description: "Paste rows, drop blanks and duplicates, classify each one, then export a CSV.",
    descriptionAr: "الصق صفوفاً، واحذف الفراغات والمكرر، وصنّف كل صف، ثم أصدر ملف CSV.",
    category: "ops",
    emoji: "Filter",
    featured: false,
    installs: 452,
    triggerType: "manual",
    graph: graph(
      [
        n("trigger", "trigger.manual", 0, 0, { inputs: ["rows"] }),
        n("split", "data.split", 1, 0, { mode: "lines", trim: true }),
        n("unique", "data.unique", 2, 0, { caseInsensitive: true }),
        n("limit", "data.slice", 3, 0, { count: 25 }),
        n("label", "ai.classify", 4, 0, {
          source: "{{$item}}",
          categories: ["question", "complaint", "praise", "other"],
        }),
        n("rows", "data.code", 5, 0, {
          code: "// Pair each original row with the label the AI node produced.\nconst labels = Array.isArray(inputs.in) ? inputs.in : [inputs.in];\nreturn labels.map((label, i) => ({ row: i + 1, label }));",
        }),
        n("csv", "action.file", 6, 0, { filename: "classified.csv", format: "csv" }),
      ],
      [
        e("trigger", "split"),
        e("split", "unique"),
        e("unique", "limit"),
        e("limit", "label"),
        e("label", "rows", "question"),
        e("label", "rows", "complaint"),
        e("label", "rows", "praise"),
        e("label", "rows", "other"),
        e("rows", "csv"),
      ],
    ),
  },
];

export const BLANK_GRAPH: FlowGraph = graph(
  [n("trigger", "trigger.manual", 0, 0, { inputs: ["topic"] })],
  [],
);
