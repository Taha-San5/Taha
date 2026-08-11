"use client";

import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { ProviderBadge } from "@/components/provider-logos";
import { Badge, ButtonLink, Card } from "@/components/ui/kit";
import { MODELS, PROVIDER_LABELS } from "@/lib/models";
import { NODE_DEFINITIONS } from "@/lib/nodes/registry";
import { cn } from "@/lib/utils";

const YEARLY_FACTOR = 10 / 12; // two months free

export function PricingContent() {
  const { d, locale } = useI18n();
  const [yearly, setYearly] = useState(false);

  const priceFor = (raw: string) => {
    const amount = Number(raw.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(amount) || amount === 0) return raw;
    const value = yearly ? Math.round(amount * YEARLY_FACTOR) : amount;
    return locale === "ar" ? `${value} $` : `$${value}`;
  };

  const paidNodes = NODE_DEFINITIONS.filter((definition) => definition.credits > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-100 text-balance sm:text-4xl">
          {d.pricing.title}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-300">{d.pricing.subtitle}</p>
      </header>

      <div className="mt-8 flex items-center justify-center">
        <div className="inline-flex items-center rounded-xl border border-ink-700 bg-ink-900/70 p-1">
          {(
            [
              { value: false, label: d.pricing.monthly },
              { value: true, label: d.pricing.yearly },
            ] as const
          ).map((option) => (
            <button
              key={String(option.value)}
              onClick={() => setYearly(option.value)}
              aria-pressed={yearly === option.value}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors",
                yearly === option.value ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-200",
              )}
            >
              {option.label}
              {option.value ? (
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10.5px] text-emerald-300">
                  {d.pricing.yearlyNote}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-4">
        {d.pricing.plans.map((plan, index) => {
          const highlighted = index === 2;
          return (
            <div
              key={plan.name}
              className={cn(
                "panel relative flex flex-col p-5",
                highlighted && "border-brand-500/45 bg-brand-500/[0.04] ring-1 ring-brand-500/20",
              )}
            >
              {highlighted ? (
                <span className="absolute -top-2.5 start-5">
                  <Badge tone="brand">{d.pricing.mostPopular}</Badge>
                </span>
              ) : null}

              <h2 className="text-[15px] font-semibold text-ink-100">{plan.name}</h2>
              <p className="mt-1.5 min-h-9 text-[12.5px] leading-relaxed text-ink-400">{plan.blurb}</p>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight tabular-nums text-ink-100">
                  {priceFor(plan.price)}
                </span>
                {plan.price !== "Custom" && plan.price !== "حسب الطلب" ? (
                  <span className="text-[12.5px] text-ink-500">{d.pricing.perMonth}</span>
                ) : null}
              </div>
              <p className="mt-1 text-[12px] text-brand-300">
                {plan.credits} {d.pricing.creditsPerMonth}
              </p>

              <ul className="mt-5 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-300">
                    <Icon name="Check" size={13} className="mt-0.5 shrink-0 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>

              <ButtonLink
                href={index === 3 ? "/docs#selfhost" : "/signup"}
                variant={highlighted ? "primary" : "secondary"}
                size="md"
                className="mt-6 justify-center"
              >
                {index === 3 ? d.pricing.ctaEnterprise : d.pricing.cta}
              </ButtonLink>
            </div>
          );
        })}
      </div>

      {/* ------------------------------------------------ what a credit buys */}
      <section className="mt-16 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 text-[14.5px] font-semibold text-ink-100">
            <Icon name="Sparkles" size={15} className="text-brand-300" />
            {locale === "ar" ? "تكلفة الموديلات" : "Model costs"}
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">
            {locale === "ar"
              ? "بالمفتاح الخاص بك: صفر رصيد لكل هذه الموديلات."
              : "With your own key: zero credits for every model below."}
          </p>
          <div className="mt-4 divide-y divide-ink-800">
            {MODELS.map((model) => (
              <div key={model.id} className="flex items-center gap-3 py-2">
                <ProviderBadge provider={model.provider} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-ink-200">{model.label}</p>
                  <p className="text-[11px] text-ink-500 tabular">
                    {PROVIDER_LABELS[model.provider]} · {(model.contextWindow / 1000).toFixed(0)}k context · $
                    {model.inputPerM}/${model.outputPerM} per 1M
                  </p>
                </div>
                <Badge tone={model.credits <= 2 ? "success" : model.credits <= 5 ? "warning" : "danger"}>
                  {model.credits} {d.common.credits}
                </Badge>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
            {locale === "ar"
              ? "الرصيد مشتق من سعر المزوّد: رصيد واحد = ٠٫٠٠٥ دولار من الاستهلاك، محسوباً على نداء نموذجي (٣ آلاف مدخل + ٨٠٠ مخرج)."
              : "Credits are derived from provider list price: 1 credit = $0.005 of spend, costed against a typical call (3K in + 800 out)."}
          </p>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-[14.5px] font-semibold text-ink-100">
            <Icon name="Database" size={15} className="text-sky-300" />
            {locale === "ar" ? "العُقد التي تستهلك رصيداً" : "Nodes that consume credits"}
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">
            {locale === "ar"
              ? `كل العُقد الأخرى (${NODE_DEFINITIONS.length - paidNodes.length} عقدة) مجانية تماماً.`
              : `Every other node (${NODE_DEFINITIONS.length - paidNodes.length} of them) is completely free.`}
          </p>
          <div className="mt-4 space-y-2">
            {paidNodes.map((definition) => (
              <div
                key={definition.type}
                className="flex items-center justify-between gap-3 rounded-lg border border-ink-800 bg-ink-900/40 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon name={definition.icon} size={14} className="shrink-0 text-ink-300" />
                  <span className="truncate text-[13px] text-ink-200">
                    {locale === "ar" ? definition.labelAr : definition.label}
                  </span>
                </span>
                <Badge tone="neutral">
                  {definition.credits} {d.common.credits}
                </Badge>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5 text-[12px] leading-relaxed text-emerald-200">
            <Icon name="ShieldCheck" size={13} className="me-1.5 inline" />
            {locale === "ar"
              ? "المنطق والتفريعات والحلقات والقوالب والتسليم: مجانية دائماً."
              : "Logic, branching, loops, templating and delivery: always free."}
          </div>
        </Card>
      </section>

      {/* --------------------------------------------------------------- faq */}
      <section className="mx-auto mt-16 max-w-3xl">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-ink-100">{d.pricing.faqTitle}</h2>
        <div className="mt-8 space-y-3">
          {d.pricing.faq.map((entry) => (
            <details key={entry.q} className="panel group px-4 py-3.5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-[14px] font-medium text-ink-100">
                {entry.q}
                <Icon
                  name="ChevronDown"
                  size={16}
                  className="shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink-400">{entry.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
