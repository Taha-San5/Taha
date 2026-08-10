"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useBuilder } from "@/components/builder/store-context";
import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { Alert, Badge, Button, CodeBlock, CopyButton, Field, Input, JsonView, StatusDot, Tabs } from "@/components/ui/kit";
import { validateGraph } from "@/lib/engine/validate";
import { typeOf } from "@/lib/builder-store";
import { nodeDef } from "@/lib/nodes/registry";
import { cn, formatDuration } from "@/lib/utils";

type PanelTab = "run" | "trace" | "issues" | "trigger";

export function RunPanel({
  appUrl,
  onStartRun,
  triggerInputs,
}: {
  appUrl: string;
  onStartRun: (inputs: Record<string, string>) => void;
  triggerInputs: string[];
}) {
  const { d, locale, pick } = useI18n();

  const run = useBuilder((state) => state.run);
  const running = useBuilder((state) => state.running);
  const nodes = useBuilder((state) => state.nodes);
  const edges = useBuilder((state) => state.edges);
  const select = useBuilder((state) => state.select);
  const triggerType = useBuilder((state) => state.triggerType);
  const webhookToken = useBuilder((state) => state.webhookToken);
  const flowId = useBuilder((state) => state.id);
  const status = useBuilder((state) => state.status);

  const [tab, setTab] = useState<PanelTab>("run");
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const issues = useMemo(() => {
    const graph = {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: typeOf(node),
        position: node.position,
        data: { label: node.data.label, config: node.data.config ?? {} },
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? "out",
        targetHandle: edge.targetHandle ?? "in",
      })),
    };
    return validateGraph(graph);
  }, [nodes, edges]);

  const errorCount = issues.filter((issue) => issue.level === "error").length;
  const estimatedCredits = useMemo(
    () =>
      nodes.reduce((total, node) => {
        const definition = nodeDef(typeOf(node));
        return total + (definition?.credits ?? 0);
      }, 0),
    [nodes],
  );

  const webhookUrl = webhookToken ? `${appUrl}/api/hooks/${webhookToken}` : null;

  return (
    <div className="flex h-full flex-col">
      <Tabs
        className="px-2"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "run", label: d.builder.runFlow, icon: "Play" },
          { value: "trace", label: d.builder.trace, icon: "History", count: run?.nodeRuns.length },
          { value: "issues", label: d.builder.validation, icon: "AlertTriangle", count: issues.length || undefined },
          { value: "trigger", label: d.builder.triggerTab, icon: "Webhook" },
        ]}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
        {/* ------------------------------------------------------------- run */}
        {tab === "run" ? (
          <div className="space-y-3.5">
            <p className="text-[12px] leading-relaxed text-ink-400">{d.builder.runInputsBody}</p>

            {triggerInputs.length > 0 ? (
              <div className="space-y-2.5">
                {triggerInputs.map((name) => (
                  <Field key={name} label={name}>
                    <Input
                      value={inputs[name] ?? ""}
                      onChange={(event) => setInputs((current) => ({ ...current, [name]: event.target.value }))}
                      placeholder={name === "url" ? "https://example.com" : ""}
                      dir="auto"
                    />
                  </Field>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-ink-700 px-3 py-2.5 text-[12px] text-ink-500">
                {locale === "ar"
                  ? "هذا المشغّل لا يجمع مدخلات."
                  : "This trigger collects no inputs."}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-ink-800 pt-3">
              <span className="text-[11.5px] text-ink-500 tabular">
                {d.builder.estCost}: ~{estimatedCredits} {d.common.credits}
              </span>
              <Button
                icon="Play"
                loading={running}
                disabled={errorCount > 0}
                onClick={() => onStartRun(inputs)}
              >
                {running ? d.common.running : d.builder.startRun}
              </Button>
            </div>

            {errorCount > 0 ? (
              <Alert tone="danger">
                {locale === "ar"
                  ? `أصلح ${errorCount} مشكلة قبل التشغيل.`
                  : `Fix ${errorCount} issue${errorCount > 1 ? "s" : ""} before running.`}
              </Alert>
            ) : null}

            {run ? <RunSummary /> : null}
          </div>
        ) : null}

        {/* ----------------------------------------------------------- trace */}
        {tab === "trace" ? (
          run ? (
            <div className="space-y-2">
              <RunSummary />
              {run.nodeRuns.length === 0 ? (
                <p className="text-[12px] text-ink-500">{d.runs.noNodeRuns}</p>
              ) : (
                run.nodeRuns.map((nodeRun) => {
                  const definition = nodeDef(nodeRun.type);
                  return (
                    <details
                      key={nodeRun.id}
                      className="rounded-lg border border-ink-800 bg-ink-900/40 open:bg-ink-900/70"
                    >
                      <summary
                        className="flex cursor-pointer items-center gap-2 px-2.5 py-2"
                        onClick={() => select(nodeRun.nodeId)}
                      >
                        <StatusDot status={nodeRun.status} />
                        <Icon
                          name={definition?.icon ?? "CircleDot"}
                          size={13}
                          className="shrink-0 text-ink-400"
                        />
                        <span className="min-w-0 flex-1 truncate text-[12px] text-ink-200">
                          {nodeRun.label ||
                            (definition ? pick(definition.label, definition.labelAr) : nodeRun.type)}
                        </span>
                        {nodeRun.creditsUsed > 0 ? (
                          <span className="shrink-0 text-[10px] text-amber-400/80 tabular-nums">
                            {nodeRun.creditsUsed}
                          </span>
                        ) : null}
                        <span className="w-11 shrink-0 text-end text-[10.5px] text-ink-500 tabular">
                          {formatDuration(nodeRun.durationMs)}
                        </span>
                      </summary>

                      <div className="space-y-2 border-t border-ink-800 px-2.5 py-2">
                        {nodeRun.error ? (
                          <p className="rounded border border-rose-500/30 bg-rose-500/8 px-2 py-1.5 text-[11.5px] leading-relaxed text-rose-200">
                            {nodeRun.error}
                          </p>
                        ) : null}
                        <div>
                          <p className="mb-1 text-[10.5px] tracking-wide text-ink-500 uppercase">{d.builder.inputs}</p>
                          <JsonView value={nodeRun.inputs} maxHeight={130} />
                        </div>
                        <div>
                          <p className="mb-1 text-[10.5px] tracking-wide text-ink-500 uppercase">{d.builder.output}</p>
                          <JsonView value={nodeRun.output} maxHeight={170} />
                        </div>
                        {nodeRun.logs.length > 0 ? (
                          <div>
                            <p className="mb-1 text-[10.5px] tracking-wide text-ink-500 uppercase">{d.builder.logs}</p>
                            <pre className="max-h-28 overflow-auto rounded border border-ink-800 bg-ink-950 px-2 py-1.5 text-[10.5px] leading-relaxed text-ink-300">
                              {nodeRun.logs.join("\n")}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    </details>
                  );
                })
              )}
            </div>
          ) : (
            <p className="py-8 text-center text-[12px] text-ink-500">{d.app.noRuns}</p>
          )
        ) : null}

        {/* ---------------------------------------------------------- issues */}
        {tab === "issues" ? (
          issues.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5 text-[12.5px] text-emerald-200">
              <Icon name="CheckCircle2" size={14} />
              {d.builder.noIssues}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {issues.map((issue, index) => (
                <li key={index}>
                  <button
                    onClick={() => issue.nodeId && select(issue.nodeId)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-start text-[12px] leading-relaxed transition-colors",
                      issue.level === "error"
                        ? "border-rose-500/30 bg-rose-500/8 text-rose-200 hover:border-rose-500/50"
                        : "border-amber-500/30 bg-amber-500/8 text-amber-200 hover:border-amber-500/50",
                    )}
                  >
                    <Icon name="AlertTriangle" size={13} className="mt-0.5 shrink-0" />
                    {locale === "ar" ? issue.messageAr : issue.message}
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {/* --------------------------------------------------------- trigger */}
        {tab === "trigger" ? (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{triggerType}</Badge>
              <Badge tone={status === "published" ? "success" : "neutral"}>
                {d.app.status[status as keyof typeof d.app.status] ?? status}
              </Badge>
            </div>

            {triggerType === "webhook" ? (
              webhookUrl ? (
                <div className="space-y-2">
                  <p className="text-[12px] leading-relaxed text-ink-400">{d.builder.webhookHint}</p>
                  <div className="flex items-center gap-1.5">
                    <code className="min-w-0 flex-1 truncate rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-2 text-[11px] text-brand-300">
                      {webhookUrl}
                    </code>
                    <CopyButton value={webhookUrl} />
                  </div>
                  {status !== "published" ? (
                    <Alert tone="warning">
                      {locale === "ar"
                        ? "انشر سير العمل ليبدأ قبول طلبات الويب هوك."
                        : "Publish the flow before it will accept webhook calls."}
                    </Alert>
                  ) : null}
                  <CodeBlock
                    language="bash"
                    code={`curl -X POST ${webhookUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '{"subject":"…","body":"…"}'`}
                  />
                </div>
              ) : (
                <Alert tone="info">
                  {locale === "ar" ? "احفظ سير العمل لتوليد الرابط." : "Save the flow to mint its URL."}
                </Alert>
              )
            ) : null}

            {triggerType === "schedule" ? <Alert tone="info">{d.builder.scheduleHint}</Alert> : null}

            <div className="space-y-2 border-t border-ink-800 pt-3">
              <p className="text-[12px] text-ink-400">{d.builder.apiHint}</p>
              <CodeBlock
                language="bash"
                code={`curl -X POST ${appUrl}/api/v1/flows/${flowId}/run \\\n  -H "Authorization: Bearer wsl_your_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"inputs":{${triggerInputs.map((name) => `"${name}":"…"`).join(",")}},"wait":true}'`}
              />
              <Link href="/app/keys" className="inline-flex items-center gap-1.5 text-[12px] text-brand-300 hover:underline">
                <Icon name="Key" size={12} />
                {d.app.apiKeys}
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RunSummary() {
  const { d, locale } = useI18n();
  const run = useBuilder((state) => state.run);
  if (!run) return null;

  const tone =
    run.status === "succeeded"
      ? "success"
      : run.status === "failed"
        ? "danger"
        : run.status === "running"
          ? "brand"
          : "neutral";

  return (
    <div className="space-y-2 rounded-lg border border-ink-800 bg-ink-900/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{d.runs.status[run.status] ?? run.status}</Badge>
        <span className="text-[11.5px] text-ink-500 tabular">{formatDuration(run.durationMs)}</span>
        <span className="text-[11.5px] text-ink-500 tabular">
          {run.creditsUsed} {d.common.credits}
        </span>
        <Link href={`/app/runs/${run.id}`} className="ms-auto text-[11.5px] text-brand-300 hover:underline">
          {d.runs.viewTrace}
        </Link>
      </div>

      {run.error ? (
        <p className="rounded border border-rose-500/30 bg-rose-500/8 px-2 py-1.5 text-[11.5px] leading-relaxed text-rose-200">
          {run.error}
        </p>
      ) : null}

      {run.status === "succeeded" ? (
        <div>
          <p className="mb-1 text-[10.5px] tracking-wide text-ink-500 uppercase">{d.runs.outputTitle}</p>
          <JsonView value={run.outputs} maxHeight={200} />
        </div>
      ) : null}

      {run.nodeRuns.some((nodeRun) => nodeRun.logs.some((log) => log.includes("Simulated model"))) ? (
        <p className="text-[11px] leading-relaxed text-amber-300/90">
          <Icon name="Info" size={11} className="me-1 inline" />
          {locale === "ar" ? d.runs.simulatedNotice : d.runs.simulatedNotice}
        </p>
      ) : null}
    </div>
  );
}
