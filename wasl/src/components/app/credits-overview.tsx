"use client";

import Link from "next/link";

import { PageBody, PageHeader } from "@/components/app/page-header";
import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { Alert, Badge, ButtonLink, Card, EmptyState } from "@/components/ui/kit";
import { cn, formatNumber, formatRelative } from "@/lib/utils";

interface LedgerRow {
  id: string;
  delta: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
  refId: string | null;
}

export function CreditsOverview({
  workspace,
  ledger,
  topFlows,
  usesOwnKey,
}: {
  workspace: { plan: string; creditBalance: number; creditsIncluded: number; periodStart: string };
  ledger: LedgerRow[];
  topFlows: { flowId: string; name: string; emoji: string; credits: number; runs: number }[];
  usesOwnKey: boolean;
}) {
  const { d, locale } = useI18n();

  const used = Math.max(0, workspace.creditsIncluded - workspace.creditBalance);
  const usedPercent =
    workspace.creditsIncluded > 0 ? Math.min(100, (used / workspace.creditsIncluded) * 100) : 0;

  const resetDate = new Date(workspace.periodStart);
  resetDate.setMonth(resetDate.getMonth() + 1);

  const reasonLabel = (reason: string) => {
    const map: Record<string, { en: string; ar: string }> = {
      run: { en: "Flow run", ar: "تشغيل سير عمل" },
      topup: { en: "Top up", ar: "إضافة رصيد" },
      monthly_reset: { en: "Monthly reset", ar: "تجديد شهري" },
      adjustment: { en: "Adjustment", ar: "تسوية" },
    };
    const entry = map[reason];
    return entry ? (locale === "ar" ? entry.ar : entry.en) : reason;
  };

  return (
    <PageBody>
      <PageHeader
        title={d.app.credits}
        subtitle={
          locale === "ar"
            ? "الرصيد يغطي فقط استدعاءات موديل المنصّة والأدوات الثقيلة."
            : "Credits only cover platform model calls and heavy tools."
        }
        actions={
          <ButtonLink href="/pricing" variant="secondary" size="sm" icon="CreditCard">
            {d.nav.pricing}
          </ButtonLink>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium tracking-wide text-ink-500 uppercase">{d.app.creditsLeft}</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-ink-100">
                {formatNumber(workspace.creditBalance, locale)}
              </p>
              <p className="mt-1 text-[12px] text-ink-500 tabular">
                {formatNumber(used, locale)} {d.common.of} {formatNumber(workspace.creditsIncluded, locale)}{" "}
                {d.app.creditsUsedThisPeriod}
              </p>
            </div>
            <Badge tone="brand" className="capitalize">
              {workspace.plan}
            </Badge>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-ink-800">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                usedPercent > 90 ? "bg-rose-500" : usedPercent > 70 ? "bg-amber-500" : "bg-brand-500",
              )}
              style={{ width: `${usedPercent}%` }}
            />
          </div>

          <p className="mt-2.5 text-[11.5px] text-ink-500">
            {d.app.resetsOn} {formatRelative(resetDate, locale)}
          </p>

          {workspace.creditBalance <= 0 ? (
            <Alert tone="danger" className="mt-4">
              {locale === "ar"
                ? "نفد الرصيد. أضف مفتاحك الخاص من بيانات الاعتماد ليعمل سير العمل مجاناً، أو انتظر التجديد."
                : "Out of credits. Attach your own key under Credentials to run free, or wait for the reset."}
            </Alert>
          ) : null}
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-100">
            <Icon name="Key" size={14} className={usesOwnKey ? "text-emerald-400" : "text-amber-400"} />
            {locale === "ar" ? "مفتاحك الخاص" : "Your own key"}
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-400">
            {usesOwnKey
              ? locale === "ar"
                ? "لديك مفتاح موديل في مساحة العمل. أي عقدة ذكاء اصطناعي تختاره فيها لا تستهلك أي رصيد."
                : "You have a model key in this workspace. Any AI node that selects it consumes zero credits."
              : locale === "ar"
                ? "أضف مفتاحاً متوافقاً مع OpenAI لتصبح استدعاءات الموديل مجانية بالكامل — يحاسبك مزوّدك مباشرة."
                : "Add an OpenAI-compatible key to make model calls completely free — your provider bills you directly."}
          </p>
          <ButtonLink
            href="/app/credentials"
            variant={usesOwnKey ? "secondary" : "primary"}
            size="sm"
            icon={usesOwnKey ? "Settings" : "Plus"}
            className="mt-4"
          >
            {usesOwnKey ? d.credentials.title : d.credentials.add}
          </ButtonLink>
        </Card>
      </div>

      {topFlows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[14px] font-semibold text-ink-100">
            {locale === "ar" ? "أكثر سير العمل استهلاكاً" : "Top consuming flows"}
          </h2>
          <div className="panel divide-y divide-ink-800 overflow-hidden p-0">
            {topFlows.map((flow) => {
              const share = topFlows[0].credits > 0 ? (flow.credits / topFlows[0].credits) * 100 : 0;
              return (
                <Link
                  key={flow.flowId}
                  href={`/app/flows/${flow.flowId}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-850/60"
                >
                  <Icon name={flow.emoji} size={14} className="shrink-0 text-ink-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink-200">{flow.name}</span>
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-ink-800">
                      <span className="block h-full rounded-full bg-brand-500/70" style={{ width: `${share}%` }} />
                    </span>
                  </span>
                  <span className="w-14 shrink-0 text-end text-[11.5px] text-ink-400 tabular">
                    {flow.runs} {locale === "ar" ? "تشغيل" : "runs"}
                  </span>
                  <span className="w-16 shrink-0 text-end text-[13px] font-medium text-ink-100 tabular">
                    {formatNumber(flow.credits, locale)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-[14px] font-semibold text-ink-100">
          {locale === "ar" ? "سجل الرصيد" : "Credit ledger"}
        </h2>
        {ledger.length === 0 ? (
          <EmptyState icon="CreditCard" title={d.common.empty} />
        ) : (
          <div className="panel divide-y divide-ink-800 overflow-hidden p-0">
            {ledger.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-lg border",
                    entry.delta >= 0
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-ink-700 bg-ink-850 text-ink-400",
                  )}
                >
                  <Icon name={entry.delta >= 0 ? "Plus" : "Zap"} size={12} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-ink-200">{reasonLabel(entry.reason)}</span>
                  {entry.refId && entry.reason === "run" ? (
                    <Link
                      href={`/app/runs/${entry.refId}`}
                      className="block truncate text-[10.5px] text-brand-400/80 hover:underline"
                    >
                      {entry.refId}
                    </Link>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "w-16 shrink-0 text-end text-[13px] font-medium tabular",
                    entry.delta >= 0 ? "text-emerald-300" : "text-ink-200",
                  )}
                >
                  {entry.delta >= 0 ? "+" : ""}
                  {formatNumber(entry.delta, locale)}
                </span>
                <span className="hidden w-20 shrink-0 text-end text-[11px] text-ink-500 tabular sm:block">
                  {formatNumber(entry.balanceAfter, locale)}
                </span>
                <span className="w-20 shrink-0 text-end text-[11px] text-ink-500">
                  {formatRelative(entry.createdAt, locale)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageBody>
  );
}
