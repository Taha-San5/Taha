"use client";

import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { FlowPreview } from "@/components/marketing/flow-preview";
import { ProviderLogo } from "@/components/provider-logos";
import { Badge, ButtonLink } from "@/components/ui/kit";
import { MODELS, PROVIDER_LABELS } from "@/lib/models";
import { CATEGORY_META, CATEGORY_ORDER, NODE_DEFINITIONS } from "@/lib/nodes/registry";
import { cn, formatNumber } from "@/lib/utils";

const FEATURE_ICONS = ["LayoutGrid", "Repeat", "History", "GitFork", "Key", "Terminal"];

export function Hero() {
  const { d, locale } = useI18n();

  return (
    <section className="relative overflow-hidden">
      {/* ambient glow */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 h-[520px] opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.22), transparent 70%), radial-gradient(ellipse 40% 40% at 80% 10%, rgba(34,211,238,0.12), transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-8 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/8 px-3 py-1 text-[12px] font-medium text-brand-300">
            <Icon name="Sparkles" size={12} />
            {d.landing.badge}
          </span>

          <h1
            className="animate-fade-up mt-5 text-4xl leading-[1.1] font-semibold tracking-tight text-ink-100 text-balance sm:text-6xl"
            style={{ animationDelay: "60ms" }}
          >
            {d.landing.heroTitle}{" "}
            <span className="bg-gradient-to-br from-brand-300 via-brand-400 to-accent-400 bg-clip-text text-transparent">
              {d.landing.heroTitleAccent}
            </span>
          </h1>

          <p
            className="animate-fade-up mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-300 sm:text-[16.5px]"
            style={{ animationDelay: "120ms" }}
          >
            {d.landing.heroSubtitle}
          </p>

          <div
            className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "180ms" }}
          >
            <ButtonLink href="/signup" size="lg" iconEnd={locale === "ar" ? "ArrowLeft" : "ArrowRight"}>
              {d.landing.ctaPrimary}
            </ButtonLink>
            <ButtonLink href="/templates" size="lg" variant="secondary" icon="LayoutGrid">
              {d.landing.ctaSecondary}
            </ButtonLink>
          </div>

          <p className="animate-fade-up mt-4 text-[12.5px] text-ink-500" style={{ animationDelay: "240ms" }}>
            {d.landing.heroNote}
          </p>
        </div>

        <div className="animate-fade-up mt-14 overflow-x-auto pb-2" style={{ animationDelay: "300ms" }}>
          <FlowPreview className="mx-auto min-w-[760px] max-w-4xl" />
        </div>
      </div>
    </section>
  );
}

export function ProviderStrip() {
  const { locale } = useI18n();

  // Group the catalog by provider so this never drifts from what is selectable.
  const providers = [...new Set(MODELS.map((model) => model.provider))].map((provider) => ({
    provider,
    label: PROVIDER_LABELS[provider],
    count: MODELS.filter((model) => model.provider === provider).length,
  }));

  return (
    <section className="border-y border-ink-800 bg-ink-900/20">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-center text-[11.5px] font-medium tracking-[0.12em] text-ink-500 uppercase">
          {locale === "ar" ? "يعمل مع أحدث النماذج من" : "Runs on the latest models from"}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {providers.map(({ provider, label, count }) => (
            <div
              key={provider}
              className="group flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-900/50 px-4 py-3 transition-colors hover:border-ink-600"
            >
              <ProviderLogo
                provider={provider}
                size={22}
                className={cn(
                  "shrink-0 transition-transform duration-200 group-hover:scale-110",
                  provider === "google" ? undefined : "text-ink-100",
                )}
              />
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-ink-100">{label}</p>
                <p className="text-[11px] text-ink-500 tabular">
                  {count} {locale === "ar" ? "نماذج" : "models"}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-[12.5px] text-ink-400">
          {locale === "ar" ? (
            <>
              أو أي نقطة نهاية متوافقة مع OpenAI.{" "}
              <span className="text-brand-300">بمفتاحك الخاص، استدعاءات الموديل بصفر رصيد.</span>
            </>
          ) : (
            <>
              Or any OpenAI-compatible endpoint.{" "}
              <span className="text-brand-300">On your own key, model calls cost zero credits.</span>
            </>
          )}
        </p>
      </div>
    </section>
  );
}

export function NodeCatalogue() {
  const { d, pick } = useI18n();

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <SectionHeading title={d.landing.nodesTitle} subtitle={d.landing.nodesSubtitle} />

      <div className="mt-10 space-y-6">
        {CATEGORY_ORDER.map((category) => {
          const meta = CATEGORY_META[category];
          const nodes = NODE_DEFINITIONS.filter((definition) => definition.category === category);
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", meta.color)} />
                <h3 className="text-[13px] font-semibold tracking-wide text-ink-200 uppercase">
                  {pick(meta.label, meta.labelAr)}
                </h3>
                <span className="text-[11px] text-ink-500">{nodes.length}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {nodes.map((definition) => (
                  <div
                    key={definition.type}
                    className="group flex items-start gap-3 rounded-xl border border-ink-800 bg-ink-900/40 p-3 transition-colors hover:border-ink-600 hover:bg-ink-900"
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-850",
                        meta.text,
                      )}
                    >
                      <Icon name={definition.icon} size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-ink-100">
                        {pick(definition.label, definition.labelAr)}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-400">
                        {pick(definition.description, definition.descriptionAr)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Features() {
  const { d } = useI18n();

  return (
    <section className="border-y border-ink-800 bg-ink-900/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading title={d.landing.featuresTitle} subtitle={d.landing.featuresSubtitle} />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {d.landing.features.map((feature, index) => (
            <div
              key={feature.title}
              className="panel group relative overflow-hidden p-5 transition-colors hover:border-ink-600"
            >
              <div
                className="pointer-events-none absolute -end-16 -top-16 size-32 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "rgba(99,102,241,0.25)" }}
                aria-hidden
              />
              <span className="relative grid size-9 place-items-center rounded-lg border border-brand-500/25 bg-brand-500/10 text-brand-300">
                <Icon name={FEATURE_ICONS[index] ?? "Sparkles"} size={17} />
              </span>
              <h3 className="relative mt-3.5 text-[14.5px] font-semibold text-ink-100">{feature.title}</h3>
              <p className="relative mt-1.5 text-[13px] leading-relaxed text-ink-400">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { d } = useI18n();

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <SectionHeading title={d.landing.howTitle} />

      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {d.landing.howSteps.map((step, index) => (
          <li key={step.title} className="panel relative p-5">
            <span className="grid size-8 place-items-center rounded-lg border border-ink-600 bg-ink-850 text-[13px] font-semibold tabular-nums text-brand-300">
              {index + 1}
            </span>
            <h3 className="mt-3.5 text-[14.5px] font-semibold text-ink-100">{step.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{step.body}</p>
            {index < 2 ? (
              <Icon
                name="ChevronRight"
                size={18}
                className="absolute -end-2.5 top-1/2 hidden -translate-y-1/2 text-ink-600 md:block rtl:rotate-180"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Comparison() {
  const { d, locale } = useI18n();

  return (
    <section className="border-y border-ink-800 bg-ink-900/30">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <SectionHeading title={d.landing.compareTitle} />

        <div className="panel mt-9 overflow-hidden p-0">
          <table className="w-full text-start">
            <thead>
              <tr className="border-b border-ink-700 bg-ink-850/60">
                <th className="px-4 py-3 text-start text-[12px] font-medium text-ink-400" />
                <th className="px-4 py-3 text-start text-[12.5px] font-semibold text-brand-300">
                  {locale === "ar" ? "وصل" : "Wasl"}
                </th>
                <th className="px-4 py-3 text-start text-[12.5px] font-medium text-ink-400">
                  {locale === "ar" ? "الأدوات الأخرى" : "Typical tools"}
                </th>
              </tr>
            </thead>
            <tbody>
              {d.landing.compareRows.map((row) => (
                <tr key={row.label} className="border-b border-ink-800 last:border-0">
                  <td className="px-4 py-3 text-[13px] text-ink-200">{row.label}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-300">
                      <Icon name="Check" size={13} />
                      {row.wasl}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-500">{row.others}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function TemplateShowcase({
  templates,
}: {
  templates: {
    slug: string;
    name: string;
    nameAr: string;
    description: string;
    descriptionAr: string;
    emoji: string;
    installs: number;
    nodeCount: number;
  }[];
}) {
  const { d, pick, locale } = useI18n();
  if (templates.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl">{d.templates.title}</h2>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-400">{d.templates.subtitle}</p>
        </div>
        <ButtonLink href="/templates" variant="secondary" size="sm" iconEnd={locale === "ar" ? "ArrowLeft" : "ArrowRight"}>
          {d.common.all}
        </ButtonLink>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Link
            key={template.slug}
            href={`/templates#${template.slug}`}
            className="panel group flex flex-col gap-3 p-5 transition-colors hover:border-brand-500/40"
          >
            <span className="grid size-9 place-items-center rounded-lg border border-ink-700 bg-ink-850 text-brand-300">
              <Icon name={template.emoji} size={17} />
            </span>
            <span className="text-[14.5px] font-semibold text-ink-100">{pick(template.name, template.nameAr)}</span>
            <span className="text-[13px] leading-relaxed text-ink-400">
              {pick(template.description, template.descriptionAr)}
            </span>
            <span className="mt-auto flex items-center gap-2 pt-1 text-[11.5px] text-ink-500">
              <Badge tone="neutral">{template.nodeCount} {locale === "ar" ? "عقدة" : "nodes"}</Badge>
              <span className="tabular">
                {formatNumber(template.installs, locale)} {d.templates.installs}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  const { d, locale } = useI18n();

  return (
    <section className="relative overflow-hidden border-t border-ink-800">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 100%, rgba(99,102,241,0.22), transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-ink-100 text-balance sm:text-4xl">
          {d.landing.ctaTitle}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-300">{d.landing.ctaBody}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/signup" size="lg" iconEnd={locale === "ar" ? "ArrowLeft" : "ArrowRight"}>
            {d.landing.ctaPrimary}
          </ButtonLink>
          <ButtonLink href="/docs" size="lg" variant="ghost" icon="BookOpen">
            {d.nav.docs}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-2xl font-semibold tracking-tight text-ink-100 text-balance sm:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-[14.5px] leading-relaxed text-ink-400">{subtitle}</p> : null}
    </div>
  );
}
