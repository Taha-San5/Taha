import { DEFAULT_MODEL, MODELS } from "@/lib/models";
import type { HandleSpec, NodeCategory, NodeDefinition } from "@/lib/nodes/types";

const IN: HandleSpec[] = [{ id: "in", label: "Input", labelAr: "دخل" }];
const OUT: HandleSpec[] = [{ id: "out", label: "Output", labelAr: "خرج" }];

const MODEL_OPTIONS = MODELS.map((model) => ({ value: model.id, label: `${model.label} · ${model.credits}cr` }));

const MODEL_FIELD = {
  key: "model",
  label: "Model",
  labelAr: "الموديل",
  type: "model" as const,
  options: MODEL_OPTIONS,
  default: DEFAULT_MODEL,
  help: "BYO-key runs are free — connect your own provider key in Credentials.",
  helpAr: "التشغيل بمفتاحك الخاص مجاني — أضف مفتاح المزوّد من صفحة بيانات الاعتماد.",
};

const CREDENTIAL_FIELD = {
  key: "credentialId",
  label: "API credential",
  labelAr: "مفتاح الـ API",
  type: "credential" as const,
  provider: "openai",
  help: "Leave empty to use the platform key (charges credits).",
  helpAr: "اتركه فارغاً لاستخدام مفتاح المنصة (يخصم رصيداً).",
};

const TEMPERATURE_FIELD = {
  key: "temperature",
  label: "Temperature",
  labelAr: "درجة الإبداع",
  type: "number" as const,
  default: 0.4,
  min: 0,
  max: 2,
  step: 0.1,
};

/**
 * The node catalog. Every entry here is executable — see
 * `lib/nodes/executors.ts` for the matching runtime implementation.
 */
export const NODE_DEFINITIONS: NodeDefinition[] = [
  // ---------------------------------------------------------------- triggers
  {
    type: "trigger.manual",
    category: "trigger",
    label: "Manual input",
    labelAr: "تشغيل يدوي",
    description: "Start the flow by hand and collect input fields from the operator.",
    descriptionAr: "ابدأ سير العمل يدوياً مع جمع مدخلات من المستخدم.",
    icon: "Play",
    inputs: [],
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: '{ "topic": "…", "url": "…" }',
    keywords: ["start", "manual", "form", "input"],
    fields: [
      {
        key: "inputs",
        label: "Input fields",
        labelAr: "حقول الإدخال",
        type: "list",
        default: ["topic"],
        help: "Each name becomes available as {{$input.name}} anywhere in the flow.",
        helpAr: "كل اسم يصبح متاحاً بالصيغة {{$input.name}} في أي مكان.",
      },
    ],
  },
  {
    type: "trigger.webhook",
    category: "trigger",
    label: "Webhook",
    labelAr: "ويب هوك",
    description: "Run whenever an HTTP POST hits this flow's unique URL.",
    descriptionAr: "يعمل عند وصول طلب HTTP POST إلى رابط سير العمل.",
    icon: "Webhook",
    inputs: [],
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: "the parsed JSON body of the request",
    keywords: ["http", "trigger", "incoming", "api"],
    fields: [
      {
        key: "secret",
        label: "Shared secret (optional)",
        labelAr: "كلمة سر مشتركة (اختياري)",
        type: "text",
        placeholder: "checked against the X-Wasl-Secret header",
        help: "When set, requests must send a matching X-Wasl-Secret header.",
        helpAr: "عند تعيينها، يجب أن يحتوي الطلب على ترويسة X-Wasl-Secret مطابقة.",
      },
    ],
  },
  {
    type: "trigger.schedule",
    category: "trigger",
    label: "Schedule",
    labelAr: "مُجدول",
    description: "Run the flow on a recurring interval.",
    descriptionAr: "تشغيل سير العمل على فترات متكررة.",
    icon: "Clock",
    inputs: [],
    outputs: OUT,
    credits: 0,
    fanOut: false,
    keywords: ["cron", "timer", "recurring"],
    fields: [
      {
        key: "interval",
        label: "Frequency",
        labelAr: "التكرار",
        type: "select",
        default: "daily",
        options: [
          { value: "15m", label: "Every 15 minutes", labelAr: "كل ١٥ دقيقة" },
          { value: "hourly", label: "Hourly", labelAr: "كل ساعة" },
          { value: "daily", label: "Daily", labelAr: "يومياً" },
          { value: "weekly", label: "Weekly", labelAr: "أسبوعياً" },
        ],
      },
      {
        key: "hour",
        label: "Hour (UTC)",
        labelAr: "الساعة (UTC)",
        type: "number",
        default: 9,
        min: 0,
        max: 23,
        visibleWhen: { key: "interval", values: ["daily", "weekly"] },
      },
    ],
  },
  {
    type: "trigger.chat",
    category: "trigger",
    label: "Chat message",
    labelAr: "رسالة محادثة",
    description: "Expose the flow as a chat endpoint that receives a user message.",
    descriptionAr: "اجعل سير العمل واجهة محادثة تستقبل رسالة المستخدم.",
    icon: "MessageSquare",
    inputs: [],
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: '{ "message": "…", "history": [] }',
    keywords: ["chatbot", "agent", "conversation"],
    fields: [
      {
        key: "greeting",
        label: "Greeting",
        labelAr: "رسالة الترحيب",
        type: "text",
        default: "How can I help?",
      },
    ],
  },

  // --------------------------------------------------------------------- ai
  {
    type: "ai.ask",
    category: "ai",
    label: "Ask AI",
    labelAr: "اسأل الذكاء الاصطناعي",
    description: "Send a prompt to a language model and use its text reply.",
    descriptionAr: "أرسل تعليمات إلى موديل لغوي واستخدم الردّ النصي.",
    icon: "Sparkles",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: true,
    outputShape: "string",
    keywords: ["llm", "gpt", "claude", "prompt", "generate", "write"],
    fields: [
      {
        key: "system",
        label: "System instructions",
        labelAr: "تعليمات النظام",
        type: "textarea",
        rows: 3,
        placeholder: "You are a precise research assistant.",
      },
      {
        key: "prompt",
        label: "Prompt",
        labelAr: "التعليمات",
        type: "prompt",
        rows: 8,
        required: true,
        default: "Summarise the following:\n\n{{$input}}",
        help: "Insert data with {{$input}}, {{$item}} or {{nodeId.path}}.",
        helpAr: "أدرج البيانات باستخدام {{$input}} أو {{$item}} أو {{nodeId.path}}.",
      },
      MODEL_FIELD,
      TEMPERATURE_FIELD,
      {
        key: "maxTokens",
        label: "Max output tokens",
        labelAr: "أقصى عدد للمخرجات",
        type: "number",
        default: 1200,
        min: 64,
        max: 32_000,
      },
      CREDENTIAL_FIELD,
    ],
  },
  {
    type: "ai.extract",
    category: "ai",
    label: "Extract data",
    labelAr: "استخراج بيانات",
    description: "Pull structured JSON fields out of messy text.",
    descriptionAr: "استخرج حقول JSON منظمة من نص غير منظم.",
    icon: "Braces",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: true,
    outputShape: '{ "field": value, … }',
    keywords: ["structured", "json", "parse", "schema", "enrich"],
    fields: [
      {
        key: "source",
        label: "Text to read",
        labelAr: "النص المصدر",
        type: "prompt",
        rows: 4,
        default: "{{$input}}",
        required: true,
      },
      {
        key: "schema",
        label: "Fields to extract",
        labelAr: "الحقول المطلوبة",
        type: "keyvalue",
        default: [
          { key: "name", value: "the person or company name" },
          { key: "email", value: "contact email if present" },
        ],
        help: "Field name on the left, a plain-language description on the right.",
        helpAr: "اسم الحقل على اليسار ووصفه بلغة بسيطة على اليمين.",
      },
      MODEL_FIELD,
      CREDENTIAL_FIELD,
    ],
  },
  {
    type: "ai.classify",
    category: "ai",
    label: "Categorise",
    labelAr: "تصنيف",
    description: "Sort each item into one of your categories and branch on the result.",
    descriptionAr: "صنّف كل عنصر إلى إحدى الفئات وتفرّع حسب النتيجة.",
    icon: "GitBranch",
    inputs: IN,
    outputs: [],
    credits: 0,
    fanOut: true,
    outputShape: "the chosen category label",
    keywords: ["route", "triage", "label", "sentiment", "intent"],
    fields: [
      {
        key: "source",
        label: "Text to classify",
        labelAr: "النص المُصنَّف",
        type: "prompt",
        rows: 4,
        default: "{{$input}}",
        required: true,
      },
      {
        key: "categories",
        label: "Categories",
        labelAr: "الفئات",
        type: "list",
        default: ["urgent", "normal", "spam"],
        help: "Each category becomes its own output branch.",
        helpAr: "كل فئة تصبح مخرجاً منفصلاً.",
      },
      {
        key: "instructions",
        label: "Extra guidance",
        labelAr: "إرشادات إضافية",
        type: "textarea",
        rows: 3,
        placeholder: "Treat billing complaints as urgent.",
      },
      MODEL_FIELD,
      CREDENTIAL_FIELD,
    ],
  },
  {
    type: "ai.summarize",
    category: "ai",
    label: "Summarise",
    labelAr: "تلخيص",
    description: "Condense long text to a target length or bullet list.",
    descriptionAr: "اختصر النصوص الطويلة إلى طول محدد أو نقاط.",
    icon: "AlignLeft",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: true,
    outputShape: "string",
    keywords: ["tldr", "condense", "digest"],
    fields: [
      {
        key: "source",
        label: "Text",
        labelAr: "النص",
        type: "prompt",
        rows: 4,
        default: "{{$input}}",
        required: true,
      },
      {
        key: "style",
        label: "Format",
        labelAr: "الشكل",
        type: "select",
        default: "bullets",
        options: [
          { value: "bullets", label: "Bullet points", labelAr: "نقاط" },
          { value: "paragraph", label: "Short paragraph", labelAr: "فقرة قصيرة" },
          { value: "headline", label: "One-line headline", labelAr: "سطر واحد" },
        ],
      },
      {
        key: "language",
        label: "Output language",
        labelAr: "لغة المخرجات",
        type: "select",
        default: "auto",
        options: [
          { value: "auto", label: "Same as input", labelAr: "نفس لغة المصدر" },
          { value: "ar", label: "Arabic", labelAr: "العربية" },
          { value: "en", label: "English", labelAr: "الإنجليزية" },
        ],
      },
      MODEL_FIELD,
      CREDENTIAL_FIELD,
    ],
  },
  {
    type: "ai.agent",
    category: "ai",
    label: "AI agent",
    labelAr: "وكيل ذكي",
    description: "Give a goal and let the model call web fetch / search tools in a loop.",
    descriptionAr: "حدّد هدفاً واترك الموديل يستخدم أدوات الويب في حلقة حتى ينجزه.",
    icon: "Bot",
    inputs: IN,
    outputs: OUT,
    credits: 2,
    fanOut: true,
    outputShape: '{ "answer": "…", "steps": [ … ] }',
    keywords: ["agent", "tools", "research", "autonomous", "react"],
    fields: [
      {
        key: "goal",
        label: "Goal",
        labelAr: "الهدف",
        type: "prompt",
        rows: 5,
        required: true,
        default: "Research {{$input}} and report the three most important facts.",
      },
      {
        key: "tools",
        label: "Allowed tools",
        labelAr: "الأدوات المسموحة",
        type: "select",
        default: "fetch",
        options: [
          { value: "fetch", label: "Fetch web page", labelAr: "قراءة صفحة ويب" },
          { value: "none", label: "Reasoning only", labelAr: "استنتاج فقط" },
        ],
      },
      {
        key: "maxSteps",
        label: "Max steps",
        labelAr: "أقصى عدد خطوات",
        type: "number",
        default: 4,
        min: 1,
        max: 10,
      },
      MODEL_FIELD,
      CREDENTIAL_FIELD,
    ],
  },

  // ------------------------------------------------------------------- data
  {
    type: "data.http",
    category: "data",
    label: "HTTP request",
    labelAr: "طلب HTTP",
    description: "Call any REST API and use the response.",
    descriptionAr: "استدعِ أي واجهة REST واستخدم الاستجابة.",
    icon: "Globe",
    inputs: IN,
    outputs: [
      { id: "out", label: "Success", labelAr: "نجاح", tone: "positive" },
      { id: "error", label: "Error", labelAr: "خطأ", tone: "negative" },
    ],
    credits: 0,
    fanOut: true,
    outputShape: '{ "status": 200, "body": … , "headers": { … } }',
    keywords: ["api", "rest", "fetch", "get", "post", "request"],
    fields: [
      {
        key: "method",
        label: "Method",
        labelAr: "الطريقة",
        type: "select",
        default: "GET",
        options: ["GET", "POST", "PUT", "PATCH", "DELETE"].map((verb) => ({ value: verb, label: verb })),
      },
      {
        key: "url",
        label: "URL",
        labelAr: "الرابط",
        type: "prompt",
        required: true,
        placeholder: "https://api.example.com/v1/items?q={{$input}}",
      },
      {
        key: "headers",
        label: "Headers",
        labelAr: "الترويسات",
        type: "keyvalue",
        default: [],
      },
      {
        key: "body",
        label: "Request body",
        labelAr: "جسم الطلب",
        type: "prompt",
        rows: 6,
        placeholder: '{ "query": "{{$input}}" }',
        visibleWhen: { key: "method", values: ["POST", "PUT", "PATCH", "DELETE"] },
      },
      {
        key: "credentialId",
        label: "Bearer credential",
        labelAr: "مفتاح المصادقة",
        type: "credential",
        provider: "http",
        help: "Sent as Authorization: Bearer <secret>.",
        helpAr: "يُرسل في ترويسة Authorization: Bearer.",
      },
      {
        key: "retries",
        label: "Retries",
        labelAr: "إعادة المحاولة",
        type: "number",
        default: 1,
        min: 0,
        max: 5,
      },
    ],
  },
  {
    type: "data.scrape",
    category: "data",
    label: "Read web page",
    labelAr: "قراءة صفحة ويب",
    description: "Fetch a URL and return clean readable text plus links.",
    descriptionAr: "أحضر رابطاً وأعد نصاً نظيفاً قابلاً للقراءة مع الروابط.",
    icon: "FileSearch",
    inputs: IN,
    outputs: OUT,
    credits: 1,
    fanOut: true,
    outputShape: '{ "url": "…", "title": "…", "text": "…", "links": [ … ] }',
    keywords: ["scrape", "crawl", "website", "extract", "firecrawl"],
    fields: [
      {
        key: "url",
        label: "URL",
        labelAr: "الرابط",
        type: "prompt",
        required: true,
        default: "{{$input}}",
      },
      {
        key: "maxChars",
        label: "Max characters",
        labelAr: "أقصى عدد أحرف",
        type: "number",
        default: 8000,
        min: 200,
        max: 200_000,
      },
      {
        key: "includeLinks",
        label: "Collect links",
        labelAr: "جمع الروابط",
        type: "boolean",
        default: false,
      },
    ],
  },
  {
    type: "data.template",
    category: "data",
    label: "Compose text",
    labelAr: "تكوين نص",
    description: "Merge values from earlier nodes into a text template.",
    descriptionAr: "ادمج قيم العُقد السابقة في قالب نصي.",
    icon: "Type",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: "string",
    keywords: ["template", "text", "format", "combine", "merge"],
    fields: [
      {
        key: "template",
        label: "Template",
        labelAr: "القالب",
        type: "prompt",
        rows: 8,
        required: true,
        default: "Report\n=====\n\n{{$input}}",
      },
    ],
  },
  {
    type: "data.code",
    category: "data",
    label: "Run JavaScript",
    labelAr: "تشغيل JavaScript",
    description: "Transform data with a small JS function when no node fits.",
    descriptionAr: "حوّل البيانات بدالة JavaScript صغيرة عند عدم وجود عقدة مناسبة.",
    icon: "Code",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: "whatever you return",
    keywords: ["javascript", "code", "custom", "transform", "function"],
    fields: [
      {
        key: "code",
        label: "Function body",
        labelAr: "جسم الدالة",
        type: "code",
        rows: 12,
        default:
          "// `input` is the value coming in, `inputs` is a map keyed by node id,\n// `vars` holds the trigger inputs. Return the new value.\nreturn String(input).trim().toUpperCase();",
      },
      {
        key: "timeoutMs",
        label: "Timeout (ms)",
        labelAr: "المهلة (ملّي ثانية)",
        type: "number",
        default: 2000,
        min: 50,
        max: 15_000,
      },
    ],
  },
  {
    type: "data.json",
    category: "data",
    label: "Pick value",
    labelAr: "اختيار قيمة",
    description: "Read a value out of a nested object with a dotted path.",
    descriptionAr: "اقرأ قيمة من كائن متداخل باستخدام مسار منقوط.",
    icon: "Crosshair",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: "the value at the path",
    keywords: ["json", "path", "select", "field", "pluck"],
    fields: [
      {
        key: "path",
        label: "Path",
        labelAr: "المسار",
        type: "text",
        required: true,
        placeholder: "body.items[0].title",
      },
      {
        key: "fallback",
        label: "Fallback when missing",
        labelAr: "بديل عند الغياب",
        type: "text",
      },
    ],
  },
  {
    type: "data.split",
    category: "data",
    label: "Split into list",
    labelAr: "تقسيم إلى قائمة",
    description: "Turn text into a list so later nodes run once per item.",
    descriptionAr: "حوّل النص إلى قائمة لتعمل العُقد التالية على كل عنصر.",
    icon: "Split",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: "string[]",
    keywords: ["split", "lines", "csv", "list", "chunk"],
    fields: [
      {
        key: "mode",
        label: "Split by",
        labelAr: "التقسيم حسب",
        type: "select",
        default: "lines",
        options: [
          { value: "lines", label: "Line breaks", labelAr: "أسطر" },
          { value: "comma", label: "Commas", labelAr: "فواصل" },
          { value: "paragraph", label: "Paragraphs", labelAr: "فقرات" },
          { value: "custom", label: "Custom separator", labelAr: "فاصل مخصص" },
          { value: "chunk", label: "Fixed-size chunks", labelAr: "أجزاء بحجم ثابت" },
        ],
      },
      {
        key: "separator",
        label: "Separator",
        labelAr: "الفاصل",
        type: "text",
        default: "|",
        visibleWhen: { key: "mode", values: ["custom"] },
      },
      {
        key: "chunkSize",
        label: "Chunk size (characters)",
        labelAr: "حجم الجزء (أحرف)",
        type: "number",
        default: 2000,
        min: 100,
        max: 50_000,
        visibleWhen: { key: "mode", values: ["chunk"] },
      },
      { key: "trim", label: "Trim and drop empties", labelAr: "تنظيف وحذف الفراغات", type: "boolean", default: true },
    ],
  },
  {
    type: "data.join",
    category: "data",
    label: "Combine list",
    labelAr: "دمج قائمة",
    description: "Collapse a list back into a single piece of text.",
    descriptionAr: "اجمع قائمة في نص واحد.",
    icon: "Merge",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: "string",
    keywords: ["join", "concat", "reduce", "collect"],
    fields: [
      {
        key: "separator",
        label: "Separator",
        labelAr: "الفاصل",
        type: "select",
        default: "newline",
        options: [
          { value: "newline", label: "New line", labelAr: "سطر جديد" },
          { value: "blank", label: "Blank line", labelAr: "سطر فارغ" },
          { value: "comma", label: "Comma", labelAr: "فاصلة" },
          { value: "bullet", label: "Bulleted list", labelAr: "قائمة نقطية" },
          { value: "numbered", label: "Numbered list", labelAr: "قائمة مرقمة" },
        ],
      },
    ],
  },
  {
    type: "data.filter",
    category: "data",
    label: "Filter list",
    labelAr: "تصفية قائمة",
    description: "Keep only the list items that match a condition.",
    descriptionAr: "أبقِ فقط العناصر التي تطابق الشرط.",
    icon: "Filter",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: "the filtered list",
    keywords: ["filter", "where", "keep", "remove"],
    fields: [
      {
        key: "path",
        label: "Field to test",
        labelAr: "الحقل المُختبر",
        type: "text",
        placeholder: "leave blank to test the item itself",
      },
      {
        key: "operator",
        label: "Condition",
        labelAr: "الشرط",
        type: "select",
        default: "contains",
        options: [
          { value: "contains", label: "contains", labelAr: "يحتوي" },
          { value: "not_contains", label: "does not contain", labelAr: "لا يحتوي" },
          { value: "equals", label: "equals", labelAr: "يساوي" },
          { value: "not_equals", label: "does not equal", labelAr: "لا يساوي" },
          { value: "gt", label: "greater than", labelAr: "أكبر من" },
          { value: "lt", label: "less than", labelAr: "أصغر من" },
          { value: "matches", label: "matches regex", labelAr: "يطابق regex" },
          { value: "not_empty", label: "is not empty", labelAr: "غير فارغ" },
        ],
      },
      {
        key: "value",
        label: "Compare to",
        labelAr: "القيمة المقارنة",
        type: "prompt",
        visibleWhen: {
          key: "operator",
          values: ["contains", "not_contains", "equals", "not_equals", "gt", "lt", "matches"],
        },
      },
    ],
  },
  {
    type: "data.unique",
    category: "data",
    label: "Remove duplicates",
    labelAr: "إزالة المكرر",
    description: "Deduplicate a list, optionally by one field.",
    descriptionAr: "احذف العناصر المكررة من قائمة، مع إمكانية التمييز بحقل واحد.",
    icon: "Layers",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: "the deduplicated list",
    keywords: ["dedupe", "unique", "distinct"],
    fields: [
      { key: "path", label: "Compare by field", labelAr: "المقارنة بالحقل", type: "text", placeholder: "e.g. email" },
      { key: "caseInsensitive", label: "Ignore case", labelAr: "تجاهل حالة الأحرف", type: "boolean", default: true },
    ],
  },
  {
    type: "data.slice",
    category: "data",
    label: "Limit list",
    labelAr: "تحديد عدد",
    description: "Take the first N items — handy for keeping runs cheap.",
    descriptionAr: "خُذ أول N عنصر — مفيد لتقليل تكلفة التشغيل.",
    icon: "Scissors",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: "the shortened list",
    keywords: ["limit", "take", "head", "top"],
    fields: [
      { key: "count", label: "Keep", labelAr: "الاحتفاظ بعدد", type: "number", default: 10, min: 1, max: 1000 },
      { key: "offset", label: "Skip first", labelAr: "تخطَّ أول", type: "number", default: 0, min: 0 },
    ],
  },

  // ------------------------------------------------------------------ logic
  {
    type: "logic.if",
    category: "logic",
    label: "Condition",
    labelAr: "شرط",
    description: "Send the run down one of two paths.",
    descriptionAr: "وجّه التنفيذ إلى أحد مسارين.",
    icon: "GitFork",
    inputs: IN,
    outputs: [
      { id: "true", label: "True", labelAr: "صحيح", tone: "positive" },
      { id: "false", label: "False", labelAr: "خطأ", tone: "negative" },
    ],
    credits: 0,
    fanOut: false,
    outputShape: "the incoming value, passed through the taken branch",
    keywords: ["if", "condition", "branch", "gate"],
    fields: [
      { key: "left", label: "Value", labelAr: "القيمة", type: "prompt", default: "{{$input}}", required: true },
      {
        key: "operator",
        label: "Comparison",
        labelAr: "المقارنة",
        type: "select",
        default: "contains",
        options: [
          { value: "contains", label: "contains", labelAr: "يحتوي" },
          { value: "not_contains", label: "does not contain", labelAr: "لا يحتوي" },
          { value: "equals", label: "equals", labelAr: "يساوي" },
          { value: "not_equals", label: "does not equal", labelAr: "لا يساوي" },
          { value: "gt", label: "greater than", labelAr: "أكبر من" },
          { value: "gte", label: "greater or equal", labelAr: "أكبر أو يساوي" },
          { value: "lt", label: "less than", labelAr: "أصغر من" },
          { value: "lte", label: "less or equal", labelAr: "أصغر أو يساوي" },
          { value: "matches", label: "matches regex", labelAr: "يطابق regex" },
          { value: "is_empty", label: "is empty", labelAr: "فارغ" },
          { value: "not_empty", label: "is not empty", labelAr: "غير فارغ" },
        ],
      },
      {
        key: "right",
        label: "Compare to",
        labelAr: "القيمة المقارنة",
        type: "prompt",
        visibleWhen: {
          key: "operator",
          values: ["contains", "not_contains", "equals", "not_equals", "gt", "gte", "lt", "lte", "matches"],
        },
      },
    ],
  },
  {
    type: "logic.switch",
    category: "logic",
    label: "Router",
    labelAr: "موجّه",
    description: "Match a value against several cases and branch accordingly.",
    descriptionAr: "قارن قيمة بعدة حالات وتفرّع حسب المطابقة.",
    icon: "Route",
    inputs: IN,
    outputs: [],
    credits: 0,
    fanOut: false,
    keywords: ["switch", "router", "case", "branch"],
    fields: [
      { key: "value", label: "Value to match", labelAr: "القيمة", type: "prompt", default: "{{$input}}", required: true },
      {
        key: "cases",
        label: "Cases",
        labelAr: "الحالات",
        type: "list",
        default: ["sales", "support"],
        help: "Matched case-insensitively as a substring. An extra 'else' branch is always added.",
        helpAr: "تتم المطابقة كنص جزئي دون حساسية للأحرف. يُضاف مخرج 'else' دائماً.",
      },
    ],
  },
  {
    type: "logic.foreach",
    category: "logic",
    label: "For each",
    labelAr: "لكل عنصر",
    description: "Explicitly loop over a list; downstream nodes run per item.",
    descriptionAr: "كرّر على عناصر قائمة؛ العُقد التالية تعمل لكل عنصر.",
    icon: "Repeat",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: "the list (each downstream node runs per item)",
    keywords: ["loop", "iterate", "map", "each"],
    fields: [
      {
        key: "limit",
        label: "Max items",
        labelAr: "أقصى عدد عناصر",
        type: "number",
        default: 25,
        min: 1,
        max: 500,
        help: "Guard rail so a huge list cannot drain your credits.",
        helpAr: "حدّ أمان يمنع استهلاك الرصيد بقائمة ضخمة.",
      },
    ],
  },
  {
    type: "logic.merge",
    category: "logic",
    label: "Merge paths",
    labelAr: "دمج المسارات",
    description: "Continue as soon as any incoming branch produced a value.",
    descriptionAr: "أكمل بمجرد أن ينتج أي مسار قادم قيمة.",
    icon: "GitMerge",
    inputs: [
      { id: "a", label: "A", labelAr: "أ" },
      { id: "b", label: "B", labelAr: "ب" },
      { id: "c", label: "C", labelAr: "ج" },
    ],
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: "first live branch value, or an array in 'collect all' mode",
    keywords: ["merge", "join", "collect", "wait"],
    fields: [
      {
        key: "mode",
        label: "Mode",
        labelAr: "الوضع",
        type: "select",
        default: "first",
        options: [
          { value: "first", label: "First live branch", labelAr: "أول مسار نشط" },
          { value: "collect", label: "Collect all into a list", labelAr: "جمع الكل في قائمة" },
        ],
      },
    ],
  },
  {
    type: "logic.delay",
    category: "logic",
    label: "Wait",
    labelAr: "انتظار",
    description: "Pause before continuing — useful for rate limits.",
    descriptionAr: "توقّف قبل المتابعة — مفيد مع حدود المعدل.",
    icon: "Timer",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: "the incoming value, unchanged",
    keywords: ["wait", "sleep", "delay", "throttle"],
    fields: [
      { key: "ms", label: "Milliseconds", labelAr: "ملّي ثانية", type: "number", default: 1000, min: 0, max: 30_000 },
    ],
  },

  // ----------------------------------------------------------------- actions
  {
    type: "action.slack",
    category: "action",
    label: "Send to Slack",
    labelAr: "إرسال إلى Slack",
    description: "Post a message to a Slack channel via an incoming webhook.",
    descriptionAr: "انشر رسالة في قناة Slack عبر ويب هوك.",
    icon: "Send",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: '{ "delivered": true }',
    keywords: ["slack", "notify", "message", "alert"],
    fields: [
      {
        key: "credentialId",
        label: "Slack webhook URL",
        labelAr: "رابط ويب هوك Slack",
        type: "credential",
        provider: "slack",
        help: "Store the https://hooks.slack.com/… URL as a credential. Without one the node previews the message instead of sending it.",
        helpAr:
          "احفظ رابط hooks.slack.com كبيانات اعتماد. وبدونه تعرض العقدة الرسالة بدل إرسالها.",
      },
      {
        key: "text",
        label: "Message",
        labelAr: "الرسالة",
        type: "prompt",
        rows: 6,
        required: true,
        default: "{{$input}}",
      },
    ],
  },
  {
    type: "action.webhook",
    category: "action",
    label: "Call webhook",
    labelAr: "استدعاء ويب هوك",
    description: "POST the result to any external URL.",
    descriptionAr: "أرسل النتيجة بطلب POST إلى أي رابط خارجي.",
    icon: "Radio",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: false,
    outputShape: '{ "status": 200, "body": … }',
    keywords: ["webhook", "post", "notify", "zapier", "make"],
    fields: [
      { key: "url", label: "URL", labelAr: "الرابط", type: "prompt", required: true, placeholder: "https://…" },
      {
        key: "payloadMode",
        label: "Payload",
        labelAr: "الحمولة",
        type: "select",
        default: "wrapped",
        options: [
          { value: "wrapped", label: '{ "data": <value> }', labelAr: '{ "data": القيمة }' },
          { value: "raw", label: "The value itself", labelAr: "القيمة نفسها" },
          { value: "custom", label: "Custom JSON", labelAr: "JSON مخصص" },
        ],
      },
      {
        key: "body",
        label: "Custom JSON",
        labelAr: "JSON مخصص",
        type: "prompt",
        rows: 6,
        visibleWhen: { key: "payloadMode", values: ["custom"] },
      },
    ],
  },
  {
    type: "action.file",
    category: "action",
    label: "Create file",
    labelAr: "إنشاء ملف",
    description: "Turn the result into a downloadable file attached to the run.",
    descriptionAr: "حوّل النتيجة إلى ملف قابل للتنزيل مرفق بالتشغيل.",
    icon: "FileDown",
    inputs: IN,
    outputs: OUT,
    credits: 0,
    fanOut: false,
    terminal: true,
    outputShape: '{ "filename": "…", "size": 1234, "content": "…" }',
    keywords: ["file", "csv", "download", "export", "markdown"],
    fields: [
      { key: "filename", label: "File name", labelAr: "اسم الملف", type: "prompt", default: "report.md" },
      {
        key: "format",
        label: "Format",
        labelAr: "الصيغة",
        type: "select",
        default: "text",
        options: [
          { value: "text", label: "Plain text / Markdown", labelAr: "نص / Markdown" },
          { value: "json", label: "JSON", labelAr: "JSON" },
          { value: "csv", label: "CSV (from a list)", labelAr: "CSV (من قائمة)" },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ output
  {
    type: "output.result",
    category: "output",
    label: "Flow output",
    labelAr: "مخرج سير العمل",
    description: "Mark a value as the flow's result — returned to API callers.",
    descriptionAr: "حدّد قيمة كنتيجة سير العمل — تُعاد لمستدعي الـ API.",
    icon: "CheckCircle2",
    inputs: IN,
    outputs: [],
    credits: 0,
    fanOut: false,
    terminal: true,
    outputShape: "the value you pass in",
    keywords: ["output", "result", "return", "finish", "end"],
    fields: [
      {
        key: "name",
        label: "Output name",
        labelAr: "اسم المخرج",
        type: "text",
        default: "result",
        help: "Key used in the run's outputs object.",
        helpAr: "المفتاح المستخدم في كائن المخرجات.",
      },
      {
        key: "value",
        label: "Value",
        labelAr: "القيمة",
        type: "prompt",
        rows: 4,
        default: "{{$input}}",
        help: "Leave as {{$input}} to pass the incoming value straight through.",
        helpAr: "اتركها {{$input}} لتمرير القيمة القادمة كما هي.",
      },
    ],
  },
];

export const NODE_MAP: Record<string, NodeDefinition> = Object.fromEntries(
  NODE_DEFINITIONS.map((definition) => [definition.type, definition]),
);

export function nodeDef(type: string): NodeDefinition | undefined {
  return NODE_MAP[type];
}

export function requireNodeDef(type: string): NodeDefinition {
  const definition = NODE_MAP[type];
  if (!definition) throw new Error(`Unknown node type: ${type}`);
  return definition;
}

/**
 * Some nodes grow their output handles from config (categories, router cases).
 * Resolved here so the canvas and the engine always agree.
 */
export function resolveOutputs(type: string, config: Record<string, unknown>): HandleSpec[] {
  const definition = NODE_MAP[type];
  if (!definition) return OUT;

  if (type === "ai.classify") {
    const categories = toStringList(config.categories, ["urgent", "normal", "spam"]);
    return categories.map((category) => ({ id: slugHandle(category), label: category, labelAr: category }));
  }

  if (type === "logic.switch") {
    const cases = toStringList(config.cases, ["a", "b"]);
    return [
      ...cases.map((entry) => ({ id: slugHandle(entry), label: entry, labelAr: entry })),
      { id: "else", label: "Else", labelAr: "غير ذلك", tone: "muted" as const },
    ];
  }

  return definition.outputs;
}

export function resolveInputs(type: string): HandleSpec[] {
  return NODE_MAP[type]?.inputs ?? IN;
}

export function slugHandle(value: string): string {
  const slug = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "case";
}

export function toStringList(value: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(value)) {
    const items = value.map((entry) => String(entry).trim()).filter(Boolean);
    return items.length > 0 ? items : fallback;
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[\n,،]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return fallback;
}

/** Config object pre-filled with a definition's defaults. */
export function defaultConfig(type: string): Record<string, unknown> {
  const definition = NODE_MAP[type];
  if (!definition) return {};
  const config: Record<string, unknown> = {};
  for (const field of definition.fields) {
    if (field.default !== undefined) {
      config[field.key] = structuredClone(field.default);
    }
  }
  return config;
}

export const CATEGORY_META: Record<
  NodeCategory,
  { label: string; labelAr: string; color: string; ring: string; text: string; icon: string }
> = {
  trigger: {
    label: "Triggers",
    labelAr: "المشغّلات",
    color: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    text: "text-emerald-300",
    icon: "Zap",
  },
  ai: {
    label: "AI",
    labelAr: "الذكاء الاصطناعي",
    color: "bg-violet-500",
    ring: "ring-violet-500/30",
    text: "text-violet-300",
    icon: "Sparkles",
  },
  data: {
    label: "Data",
    labelAr: "البيانات",
    color: "bg-sky-500",
    ring: "ring-sky-500/30",
    text: "text-sky-300",
    icon: "Database",
  },
  logic: {
    label: "Logic",
    labelAr: "المنطق",
    color: "bg-amber-500",
    ring: "ring-amber-500/30",
    text: "text-amber-300",
    icon: "GitFork",
  },
  action: {
    label: "Actions",
    labelAr: "الإجراءات",
    color: "bg-rose-500",
    ring: "ring-rose-500/30",
    text: "text-rose-300",
    icon: "Send",
  },
  output: {
    label: "Output",
    labelAr: "المخرجات",
    color: "bg-slate-400",
    ring: "ring-slate-400/30",
    text: "text-slate-200",
    icon: "CheckCircle2",
  },
};

export const CATEGORY_ORDER: NodeCategory[] = ["trigger", "ai", "data", "logic", "action", "output"];

export const TRIGGER_TYPES = ["trigger.manual", "trigger.webhook", "trigger.schedule", "trigger.chat"];

export function isTriggerType(type: string): boolean {
  return TRIGGER_TYPES.includes(type);
}
