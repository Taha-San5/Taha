"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageBody, PageHeader } from "@/components/app/page-header";
import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { EmptyState, StatusDot, Tabs } from "@/components/ui/kit";
import type { RunView } from "@/lib/nodes/types";
import { formatDuration, formatRelative } from "@/lib/utils";

type RunRow = RunView & { flowName: string; flowEmoji: string };
type Filter = "all" | "succeeded" | "failed" | "running";

export function RunsList({ runs }: { runs: RunRow[] }) {
  const { d, locale } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: runs.length,
      succeeded: runs.filter((run) => run.status === "succeeded").length,
      failed: runs.filter((run) => run.status === "failed").length,
      running: runs.filter((run) => run.status === "running" || run.status === "queued").length,
    }),
    [runs],
  );

  const visible = useMemo(() => {
    if (filter === "all") return runs;
    if (filter === "running") return runs.filter((run) => run.status === "running" || run.status === "queued");
    return runs.filter((run) => run.status === filter);
  }, [runs, filter]);

  return (
    <PageBody>
      <PageHeader title={d.runs.title} subtitle={d.runs.subtitle} />

      <Tabs
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: "all", label: d.common.all, count: counts.all },
          { value: "succeeded", label: d.runs.status.succeeded, count: counts.succeeded },
          { value: "failed", label: d.runs.status.failed, count: counts.failed },
          { value: "running", label: d.runs.status.running, count: counts.running },
        ]}
      />

      {visible.length === 0 ? (
        <EmptyState icon="History" title={d.app.noRuns} />
      ) : (
        <div className="panel overflow-hidden p-0">
          <div className="hidden items-center gap-3 border-b border-ink-800 bg-ink-900/50 px-4 py-2 text-[11px] font-medium tracking-wide text-ink-500 uppercase sm:flex">
            <span className="w-2" />
            <span className="flex-1">{d.app.flows}</span>
            <span className="w-20">{d.runs.trigger}</span>
            <span className="w-16 text-end">{d.runs.creditsUsed}</span>
            <span className="w-16 text-end">{d.runs.duration}</span>
            <span className="w-24 text-end">{d.runs.started}</span>
          </div>

          <div className="divide-y divide-ink-800">
            {visible.map((run) => (
              <Link
                key={run.id}
                href={`/app/runs/${run.id}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-850/60"
              >
                <StatusDot status={run.status} />
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <Icon name={run.flowEmoji} size={14} className="shrink-0 text-ink-400" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-ink-200">{run.flowName}</span>
                    {run.error ? (
                      <span className="block truncate text-[11px] text-rose-300/90">{run.error}</span>
                    ) : (
                      <span className="block text-[11px] text-ink-500">
                        {d.runs.status[run.status] ?? run.status}
                        {run.nodeRuns.length > 0 ? ` · ${run.nodeRuns.length} ${locale === "ar" ? "عقدة" : "nodes"}` : ""}
                      </span>
                    )}
                  </span>
                </span>
                <span className="w-20 shrink-0 text-[11.5px] text-ink-500">{run.trigger}</span>
                <span className="w-16 shrink-0 text-end text-[11.5px] text-ink-400 tabular">{run.creditsUsed}</span>
                <span className="w-16 shrink-0 text-end text-[11.5px] text-ink-400 tabular">
                  {formatDuration(run.durationMs)}
                </span>
                <span className="w-24 shrink-0 text-end text-[11.5px] text-ink-500">
                  {formatRelative(run.startedAt, locale)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PageBody>
  );
}
