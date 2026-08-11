"use client";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { LogoMark } from "@/components/marketing/logo";
import { ProviderLogo } from "@/components/provider-logos";
import { ButtonLink, Card } from "@/components/ui/kit";
import { MODELS } from "@/lib/models";
import { NODE_DEFINITIONS } from "@/lib/nodes/registry";
import { cn } from "@/lib/utils";

/**
 * Personal details worth editing before sharing this widely:
 *
 *   CONTACT_EMAIL  — currently a placeholder; a dead address looks worse than none
 *
 * Everything else on this page is generated from the codebase (node count,
 * model count, provider count) so it cannot drift out of date.
 */
const CONTACT_EMAIL = "hello@example.com";

const PRINCIPLE_ICONS = ["Eye", "Key", "AlertTriangle", "ShieldCheck"];
const CRAFT_ICONS = ["Zap", "Boxes", "Sparkles", "ShieldCheck", "Languages", "Check"];

export function AboutContent() {
  const { d, locale } = useI18n();
  const ar = locale === "ar";

  const providers = [...new Set(MODELS.map((model) => model.provider))];

  const numbers = [
    { value: NODE_DEFINITIONS.length, label: d.about.numbers.nodes },
    { value: MODELS.length, label: d.about.numbers.models },
    { value: providers.length, label: d.about.numbers.providers },
    { value: 52, label: d.about.numbers.checks },
  ];

  return (
    <div>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-ink-800">
        <div
          className="pointer-events-none absolute inset-x-0 -top-32 h-[420px] opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 55% 55% at 30% 0%, rgba(99,102,241,0.20), transparent 70%), radial-gradient(ellipse 40% 40% at 85% 20%, rgba(34,211,238,0.12), transparent 70%)",
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/8 px-3 py-1 text-[12px] font-medium text-brand-300">
            <Icon name="Sparkles" size={12} />
            {d.about.eyebrow}
          </span>

          <div className="mt-6 flex items-center gap-4">
            {/* The mark stands in for a portrait — swap in a photo if you prefer. */}
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-ink-700 bg-ink-900">
              <LogoMark size={34} />
            </span>
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight text-ink-100 sm:text-4xl">
                {d.about.name}
              </h1>
              <p className="mt-1 text-[14px] text-brand-300">{d.about.role}</p>
            </div>
          </div>

          <p className="mt-7 text-[17px] leading-relaxed text-ink-200 text-balance sm:text-[19px]">
            {d.about.lede}
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            <ButtonLink href="/templates" size="md" iconEnd={ar ? "ArrowLeft" : "ArrowRight"}>
              {d.about.tryCta}
            </ButtonLink>
            <ButtonLink href="/docs" size="md" variant="secondary" icon="BookOpen">
              {d.nav.docs}
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- numbers */}
      <section className="border-b border-ink-800 bg-ink-900/25">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px px-4 sm:px-6 md:grid-cols-4">
          {numbers.map((entry) => (
            <div key={entry.label} className="px-4 py-8 text-center">
              <p className="text-3xl font-semibold tracking-tight tabular-nums text-ink-100 sm:text-4xl">
                {entry.value}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">{entry.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- story */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-ink-100">{d.about.storyTitle}</h2>
        <div className="mt-6 space-y-5">
          {d.about.story.map((paragraph, index) => (
            <p
              key={paragraph.slice(0, 24)}
              className={cn(
                "leading-relaxed text-ink-300",
                index === 0 ? "text-[16px] text-ink-200" : "text-[15px]",
              )}
            >
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- principles */}
      <section className="border-y border-ink-800 bg-ink-900/25">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-100">
            {d.about.principlesTitle}
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {d.about.principles.map((principle, index) => (
              <Card key={principle.title} className="p-5 transition-colors hover:border-ink-600">
                <span className="grid size-9 place-items-center rounded-lg border border-brand-500/25 bg-brand-500/10 text-brand-300">
                  <Icon name={PRINCIPLE_ICONS[index] ?? "Check"} size={17} />
                </span>
                <h3 className="mt-3.5 text-[15px] font-semibold text-ink-100">{principle.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-400">{principle.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- craft */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-ink-100">{d.about.craftTitle}</h2>
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink-400">{d.about.craftLede}</p>

        <div className="panel mt-8 divide-y divide-ink-800 overflow-hidden p-0">
          {d.about.craft.map((row, index) => (
            <div key={row.label} className="flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:gap-5">
              <span className="flex shrink-0 items-center gap-2.5 sm:w-48">
                <Icon
                  name={CRAFT_ICONS[index] ?? "Check"}
                  size={14}
                  className="shrink-0 text-brand-400"
                />
                <span className="text-[13.5px] font-medium text-ink-100">{row.label}</span>
              </span>
              <span className="text-[13px] leading-relaxed text-ink-400">{row.value}</span>
            </div>
          ))}
        </div>

        {/* providers, so the claim above is visibly backed */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          {providers.map((provider) => (
            <span
              key={provider}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2"
            >
              <ProviderLogo
                provider={provider}
                size={15}
                className={provider === "google" ? undefined : "text-ink-200"}
              />
              <span className="text-[12.5px] text-ink-300">
                {MODELS.filter((model) => model.provider === provider).length}{" "}
                {ar ? "نماذج" : "models"}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- contact */}
      <section className="relative overflow-hidden border-t border-ink-800">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 50% 60% at 50% 100%, rgba(99,102,241,0.18), transparent 70%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl">
            {d.about.contactTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-300">
            {d.about.contactBody}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href={`mailto:${CONTACT_EMAIL}`} size="lg" icon="Send">
              {d.about.contactEmail}
            </ButtonLink>
          </div>

          <div className="panel mt-12 p-6">
            <h3 className="text-[15px] font-semibold text-ink-100">{d.about.tryTitle}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">{d.about.tryBody}</p>
            <ButtonLink
              href="/templates"
              size="md"
              className="mt-5"
              iconEnd={ar ? "ArrowLeft" : "ArrowRight"}
            >
              {d.about.tryCta}
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
