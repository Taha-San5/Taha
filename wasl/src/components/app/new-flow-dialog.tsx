"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { Alert, Button, Field, Modal, Textarea } from "@/components/ui/kit";
import type { FlowGraph } from "@/lib/nodes/types";
import { nodeDef } from "@/lib/nodes/registry";

interface GeneratedFlow {
  name: string;
  description: string;
  emoji: string;
  graph: FlowGraph;
  heuristic: boolean;
  notes: string[];
}

const EXAMPLES_EN = [
  "Every morning read the top stories from a news page, summarise each in Arabic, and post the digest to Slack.",
  "When a support ticket arrives by webhook, classify it as urgent, billing or general and alert Slack for urgent ones.",
  "Given a company website, extract the company name, industry, size and contact email as structured fields.",
  "Read an article URL and turn it into five social posts under 280 characters each.",
];

const EXAMPLES_AR = [
  "كل صباح اقرأ أهم الأخبار من صفحة أخبار، ولخّص كل واحدة بالعربية، وأرسل الملخص إلى Slack.",
  "عند وصول تذكرة دعم عبر ويب هوك، صنّفها إلى عاجلة أو فواتير أو عامة، ونبّه Slack للعاجلة.",
  "من رابط موقع شركة، استخرج اسم الشركة ومجالها وحجمها وبريد التواصل كحقول منظمة.",
  "اقرأ رابط مقال وحوّله إلى خمسة منشورات اجتماعية كل واحد أقل من ٢٨٠ حرفاً.",
];

export function NewFlowDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { d, locale, pick } = useI18n();
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<GeneratedFlow | null>(null);

  const examples = locale === "ar" ? EXAMPLES_AR : EXAMPLES_EN;

  function reset() {
    setPrompt("");
    setDraft(null);
    setError(null);
    setGenerating(false);
    setCreating(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setDraft(null);
    try {
      const response = await fetch("/api/ai/generate-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? d.common.error);
      setDraft(payload.generated as GeneratedFlow);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : d.common.error);
    } finally {
      setGenerating(false);
    }
  }

  async function create(payload?: GeneratedFlow) {
    setCreating(true);
    setError(null);
    try {
      const trigger = payload?.graph.nodes.find((node) => nodeDef(node.type)?.category === "trigger");
      const triggerType = (trigger?.type.replace("trigger.", "") ?? "manual") as
        | "manual"
        | "webhook"
        | "schedule"
        | "chat";

      const response = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          payload
            ? {
                name: payload.name,
                description: payload.description,
                emoji: payload.emoji,
                graph: payload.graph,
                triggerType,
              }
            : {},
        ),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? d.common.error);

      close();
      router.push(`/app/flows/${result.flow.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : d.common.error);
      setCreating(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={d.builder.generateTitle}
      description={d.builder.generateBody}
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            {d.common.cancel}
          </Button>
          <Button variant="secondary" icon="Plus" loading={creating && !draft} onClick={() => create()}>
            {d.app.startBlank}
          </Button>
          {draft ? (
            <Button icon="Check" loading={creating} onClick={() => create(draft)}>
              {d.common.create}
            </Button>
          ) : (
            <Button
              icon="Wand2"
              loading={generating}
              disabled={prompt.trim().length < 8}
              onClick={generate}
            >
              {generating ? d.builder.generating : d.builder.generate}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <Field label={d.builder.generateTitle}>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            placeholder={d.builder.generatePlaceholder}
            maxLength={4000}
          />
        </Field>

        {!draft ? (
          <div className="space-y-1.5">
            <p className="text-[11.5px] font-medium tracking-wide text-ink-500 uppercase">
              {locale === "ar" ? "أمثلة" : "Examples"}
            </p>
            {examples.map((example) => (
              <button
                key={example}
                onClick={() => setPrompt(example)}
                className="flex w-full items-start gap-2 rounded-lg border border-ink-800 px-3 py-2 text-start text-[12.5px] leading-relaxed text-ink-400 transition-colors hover:border-ink-600 hover:text-ink-200"
              >
                <Icon name="Sparkles" size={12} className="mt-1 shrink-0 text-brand-400" />
                {example}
              </button>
            ))}
          </div>
        ) : null}

        {error ? <Alert tone="danger">{error}</Alert> : null}

        {draft ? (
          <div className="space-y-3">
            <div className="panel bg-ink-850/60 p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-900 text-brand-300">
                  <Icon name={draft.emoji} size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink-100">{draft.name}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-400">{draft.description}</p>
                </div>
              </div>

              <ol className="mt-4 space-y-1.5">
                {draft.graph.nodes.map((node, index) => {
                  const definition = nodeDef(node.type);
                  return (
                    <li key={node.id} className="flex items-center gap-2.5 text-[12.5px] text-ink-300">
                      <span className="w-4 shrink-0 text-end text-[10.5px] tabular-nums text-ink-600">
                        {index + 1}
                      </span>
                      <Icon name={definition?.icon ?? "CircleDot"} size={13} className="shrink-0 text-ink-400" />
                      <span className="truncate">
                        {definition ? pick(definition.label, definition.labelAr) : node.type}
                      </span>
                      <code className="ms-auto shrink-0 text-[10.5px] text-ink-600">{node.id}</code>
                    </li>
                  );
                })}
              </ol>

              <p className="mt-3 border-t border-ink-800 pt-2.5 text-[11.5px] text-ink-500 tabular">
                {draft.graph.nodes.length} {locale === "ar" ? "عقدة" : "nodes"} · {draft.graph.edges.length}{" "}
                {locale === "ar" ? "وصلة" : "connections"}
              </p>
            </div>

            {draft.heuristic ? (
              <Alert tone="warning">{draft.notes[0]}</Alert>
            ) : draft.notes.length > 0 ? (
              <Alert tone="info">
                <ul className="space-y-0.5">
                  {draft.notes.slice(0, 4).map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
