"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageBody, PageHeader } from "@/components/app/page-header";
import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { Alert, Badge, ButtonLink, Card, JsonView, StatusDot } from "@/components/ui/kit";
import { CATEGORY_META, nodeDef } from "@/lib/nodes/registry";
import type { RunView } from "@/lib/nodes/types";
import { cn, formatDuration, formatRelative } from "@/lib/utils";

export function RunDetail({
  run: initialRun,
  flow,
}: {
  run: RunView;
  flow: { id: string; name: string; emoji: string };
}) {
  const { d, locale, pick } = useI18n();
  const [run, setRun] = useState(initialRun);

  // Keep streaming while the run is still in flight.
  useEffect(() => {
    if (run.status !== "running" && run.status !== "queued") return;
    const stream = new EventSource(`/api/runs/${run.id}/stream`);
    stream.addEventListener("progress", (event) => setRun(JSON.parse((event as MessageEvent).data) as RunView));
    stream.addEventListener("done", (event) => {
      setRun(JSON.parse((event as MessageEvent).data) as RunView);
      stream.close();
    });
    stream.addEventListener("error", () => stream.close());
    return () => stream.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.id]);

  const simulated = run.nodeRuns.some((nodeRun) =>
    nodeRun.logs.some((log) => log.includes("Simulated model")),
  );

  const tone =
    run.status === "succeeded"
      ? "success"
      : run.status === "failed"
        ? "danger"
        : run.status === "running"
          ? "brand"
          : "neutral";

  return (
    <PageBody>
      <PageHeader
        title={flow.name}
        subtitle={`${d.runs.status[run.status] ?? run.status} · ${formatRelative(run.startedAt, locale)}`}
        actions={
          <>
            <ButtonLink href="/app/runs" variant="ghost" size="sm" icon="ChevronLeft">
              {d.runs.title}
            </ButtonLink>
            <ButtonLink href={`/app/flows/${flow.id}`} variant="secondary" size="sm" icon="Pencil">
              {locale === "ar" ? "افتح المحرّر" : "Open builder"}
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label={d.common.run} value={<Badge tone={tone}>{d.runs.status[run.status] ?? run.status}</Badge>} />
        <Stat label={d.runs.duration} value={formatDuration(run.durationMs)} />
        <Stat label={d.runs.creditsUsed} value={String(run.creditsUsed)} />
        <Stat label={d.runs.trigger} value={run.trigger} />
      </div>

      {run.error ? (
        <Alert tone="danger" title={d.runs.errorTitle}>
          {run.error}
        </Alert>
      ) : null}

      {simulated ? <Alert tone="warning">{d.runs.simulatedNotice}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* -------------------------------------------------------- timeline */}
        <section className="space-y-2">
          <h2 className="text-[14px] font-semibold text-ink-100">{d.builder.trace}</h2>

          {run.nodeRuns.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink-700 px-4 py-6 text-center text-[12.5px] text-ink-500">
              {d.runs.noNodeRuns}
            </p>
          ) : (
            <ol className="space-y-2">
              {run.nodeRuns.map((nodeRun, index) => {
                const definition = nodeDef(nodeRun.type);
                const meta = definition ? CATEGORY_META[definition.category] : null;

                return (
                  <li key={nodeRun.id} className="relative ps-7">
                    {index < run.nodeRuns.length - 1 ? (
                      <span className="absolute start-[11px] top-7 bottom-[-8px] w-px bg-ink-800" aria-hidden />
                    ) : null}
                    <span className="absolute start-0 top-2.5">
                      <StatusDot status={nodeRun.status} />
                    </span>

                    <details className="panel overflow-hidden p-0" open={nodeRun.status === "failed"}>
                      <summary className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5">
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-850",
                            meta?.text ?? "text-ink-300",
                          )}
                        >
                          <Icon name={definition?.icon ?? "CircleDot"} size={13} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-ink-100">
                            {nodeRun.label ||
                              (definition ? pick(definition.label, definition.labelAr) : nodeRun.type)}
                          </span>
                          <span className="block truncate text-[10.5px] text-ink-500">
                            <code>{nodeRun.nodeId}</code> · {d.runs.nodeStatus[nodeRun.status] ?? nodeRun.status}
                          </span>
                        </span>
                        {nodeRun.creditsUsed > 0 ? (
                          <Badge tone="warning">{nodeRun.creditsUsed}</Badge>
                        ) : null}
                        <span className="w-14 shrink-0 text-end text-[11px] text-ink-500 tabular">
                          {formatDuration(nodeRun.durationMs)}
                        </span>
                        <Icon name="ChevronDown" size={14} className="shrink-0 text-ink-500" />
                      </summary>

                      <div className="space-y-3 border-t border-ink-800 bg-ink-950/40 px-3.5 py-3">
                        {nodeRun.error ? (
                          <p className="rounded-lg border border-rose-500/30 bg-rose-500/8 px-2.5 py-2 text-[12px] leading-relaxed text-rose-200">
                            {nodeRun.error}
                          </p>
                        ) : null}

                        <div>
                          <p className="mb-1.5 text-[10.5px] tracking-wide text-ink-500 uppercase">
                            {d.builder.inputs}
                          </p>
                          <JsonView value={nodeRun.inputs} maxHeight={180} />
                        </div>

                        <div>
                          <p className="mb-1.5 text-[10.5px] tracking-wide text-ink-500 uppercase">
                            {d.builder.output}
                          </p>
                          <JsonView value={nodeRun.output} maxHeight={260} />
                        </div>

                        {nodeRun.logs.length > 0 ? (
                          <div>
                            <p className="mb-1.5 text-[10.5px] tracking-wide text-ink-500 uppercase">
                              {d.builder.logs}
                            </p>
                            <pre className="max-h-40 overflow-auto rounded-lg border border-ink-800 bg-ink-950 px-2.5 py-2 text-[10.5px] leading-relaxed text-ink-300">
                              {nodeRun.logs.join("\n")}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* ------------------------------------------------- inputs/outputs */}
        <aside className="space-y-4">
          <Card className="p-4">
            <h2 className="text-[13px] font-semibold text-ink-100">{d.builder.runInputs}</h2>
            <div className="mt-2">
              <JsonView value={run.inputs} maxHeight={200} />
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-[13px] font-semibold text-ink-100">{d.runs.outputTitle}</h2>
            <div className="mt-2">
              <JsonView value={run.outputs} maxHeight={340} />
            </div>
          </Card>

          <Link
            href={`/app/flows/${flow.id}`}
            className="panel flex items-center gap-2.5 p-3 text-[12.5px] text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100"
          >
            <Icon name={flow.emoji} size={15} className="text-brand-300" />
            {flow.name}
            <Icon name="ArrowUpRight" size={13} className="ms-auto text-ink-500" />
          </Link>
        </aside>
      </div>
    </PageBody>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="panel p-3.5">
      <p className="text-[10.5px] font-medium tracking-wide text-ink-500 uppercase">{label}</p>
      <p className="mt-1 text-[15px] font-medium text-ink-100 tabular">{value}</p>
    </div>
  );
}
