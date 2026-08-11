"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { NewFlowDialog } from "@/components/app/new-flow-dialog";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { Alert, Badge, Button, EmptyState, Input, StatusDot } from "@/components/ui/kit";
import type { FlowSummary } from "@/lib/flows";
import type { RunView } from "@/lib/nodes/types";
import { cn, formatDuration, formatRelative } from "@/lib/utils";

type RunRow = RunView & { flowName: string; flowEmoji: string };

const TRIGGER_ICONS: Record<string, string> = {
  manual: "Play",
  webhook: "Webhook",
  schedule: "Clock",
  chat: "MessageSquare",
};

export function FlowsDashboard({
  flows,
  recentRuns,
  hasModelKey,
}: {
  flows: FlowSummary[];
  recentRuns: RunRow[];
  hasModelKey: boolean;
}) {
  const { d, locale } = useI18n();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return flows;
    return flows.filter(
      (flow) =>
        flow.name.toLowerCase().includes(needle) || flow.description.toLowerCase().includes(needle),
    );
  }, [flows, query]);

  async function act(flowId: string, action: "duplicate" | "delete") {
    setBusy(flowId);
    setError(null);
    try {
      if (action === "delete") {
        if (!window.confirm(d.common.confirmDelete)) {
          setBusy(null);
          return;
        }
        const response = await fetch(`/api/flows/${flowId}`, { method: "DELETE" });
        if (!response.ok) throw new Error((await response.json()).error);
      } else {
        const response = await fetch(`/api/flows/${flowId}/duplicate`, { method: "POST" });
        if (!response.ok) throw new Error((await response.json()).error);
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : d.common.error);
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageBody>
      <PageHeader
        title={d.app.flows}
        subtitle={locale === "ar" ? "أتمتتك كلها في مكان واحد." : "Every automation in your workspace."}
        actions={
          <>
            <Button variant="secondary" icon="Wand2" onClick={() => setDialogOpen(true)}>
              {d.app.newFlowFromPrompt}
            </Button>
            <Button icon="Plus" onClick={() => setDialogOpen(true)}>
              {d.app.newFlow}
            </Button>
          </>
        }
      />

      {!hasModelKey ? (
        <Alert tone="info" title={locale === "ar" ? "لا يوجد مفتاح موديل" : "No model key configured"}>
          {locale === "ar" ? (
            <>
              عُقد الذكاء الاصطناعي ستعيد مخرجات محاكاة حتى تضيف مفتاحاً.{" "}
              <Link href="/app/credentials" className="font-medium text-sky-200 underline underline-offset-2">
                أضف بيانات اعتماد
              </Link>{" "}
              ليصبح التشغيل حقيقياً — وبمفتاحك الخاص يكون مجانياً.
            </>
          ) : (
            <>
              AI nodes will return simulated output until you add a key.{" "}
              <Link href="/app/credentials" className="font-medium text-sky-200 underline underline-offset-2">
                Add a credential
              </Link>{" "}
              to run against a real model — on your own key it is free.
            </>
          )}
        </Alert>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {flows.length > 0 ? (
        <div className="relative max-w-sm">
          <Icon
            name="Search"
            size={14}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={d.app.searchFlows}
            className="ps-9"
            aria-label={d.app.searchFlows}
          />
        </div>
      ) : null}

      {flows.length === 0 ? (
        <EmptyState
          icon="Boxes"
          title={d.app.emptyFlowsTitle}
          body={d.app.emptyFlowsBody}
          action={
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Button icon="Wand2" onClick={() => setDialogOpen(true)}>
                {d.app.newFlowFromPrompt}
              </Button>
              <Link href="/templates">
                <Button variant="secondary" icon="Boxes">
                  {d.app.templates}
                </Button>
              </Link>
            </div>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState icon="Search" title={d.common.empty} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((flow) => (
            <article
              key={flow.id}
              className={cn(
                "panel group relative flex flex-col gap-3 p-4 transition-colors hover:border-ink-600",
                busy === flow.id && "opacity-60",
              )}
            >
              <Link href={`/app/flows/${flow.id}`} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-850 text-brand-300">
                  <Icon name={flow.emoji} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink-100">{flow.name}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[12px] leading-relaxed text-ink-400">
                    {flow.description || (locale === "ar" ? "بدون وصف" : "No description")}
                  </span>
                </span>
              </Link>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  tone={flow.status === "published" ? "success" : flow.status === "paused" ? "warning" : "neutral"}
                >
                  {d.app.status[flow.status as keyof typeof d.app.status] ?? flow.status}
                </Badge>
                <Badge tone="neutral" icon={TRIGGER_ICONS[flow.triggerType] ?? "Play"}>
                  {flow.triggerType}
                </Badge>
                <Badge tone="neutral">
                  {flow.nodeCount} {locale === "ar" ? "عقدة" : "nodes"}
                </Badge>
                {flow.estimatedCredits > 0 ? (
                  <Badge tone="brand">
                    ~{flow.estimatedCredits} {d.common.credits}
                  </Badge>
                ) : null}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-800 pt-3">
                <span className="min-w-0 truncate text-[11.5px] text-ink-500">
                  {flow.lastRunAt
                    ? `${d.app.lastRun} ${formatRelative(flow.lastRunAt, locale)}`
                    : d.app.neverRun}
                  {flow.runCount > 0 ? ` · ${flow.runCount} ${d.app.totalRuns}` : ""}
                </span>
                <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={d.common.duplicate}
                    title={d.common.duplicate}
                    onClick={() => act(flow.id, "duplicate")}
                  >
                    <Icon name="Copy" size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={d.common.delete}
                    title={d.common.delete}
                    className="hover:text-rose-300"
                    onClick={() => act(flow.id, "delete")}
                  >
                    <Icon name="Trash2" size={14} />
                  </Button>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------- recent runs */}
      {recentRuns.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[14px] font-semibold text-ink-100">{d.app.recentRuns}</h2>
            <Link href="/app/runs" className="text-[12.5px] text-brand-300 hover:underline">
              {d.common.all}
            </Link>
          </div>
          <div className="panel divide-y divide-ink-800 overflow-hidden p-0">
            {recentRuns.map((run) => (
              <Link
                key={run.id}
                href={`/app/runs/${run.id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ink-850/60"
              >
                <StatusDot status={run.status} />
                <Icon name={run.flowEmoji} size={14} className="shrink-0 text-ink-400" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink-200">{run.flowName}</span>
                <span className="hidden shrink-0 text-[11.5px] text-ink-500 sm:block">
                  {d.runs.status[run.status as keyof typeof d.runs.status] ?? run.status}
                </span>
                <span className="w-14 shrink-0 text-end text-[11.5px] text-ink-500 tabular">
                  {formatDuration(run.durationMs)}
                </span>
                <span className="hidden w-24 shrink-0 text-end text-[11.5px] text-ink-500 sm:block">
                  {formatRelative(run.startedAt, locale)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <NewFlowDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </PageBody>
  );
}
