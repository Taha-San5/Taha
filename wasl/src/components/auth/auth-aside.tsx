"use client";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { FlowPreview } from "@/components/marketing/flow-preview";

export function AuthAside() {
  const { d, locale } = useI18n();

  const points = locale === "ar"
    ? [
        "٢٨ نوع عقدة قابلة للتنفيذ",
        "تتبّع مباشر لكل عقدة",
        "بمفتاحك الخاص: تشغيل مجاني",
        "واجهة عربية كاملة من اليمين لليسار",
      ]
    : [
        "28 executable node types",
        "Live per-node run traces",
        "Free runs on your own model key",
        "Complete Arabic RTL interface",
      ];

  return (
    <aside className="relative hidden overflow-hidden border-s border-ink-800 bg-ink-900/40 lg:block">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 70% 20%, rgba(99,102,241,0.20), transparent 70%), radial-gradient(ellipse 50% 50% at 20% 90%, rgba(34,211,238,0.10), transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative flex h-full flex-col justify-center gap-8 px-10 py-12">
        <div>
          <h2 className="max-w-md text-2xl font-semibold tracking-tight text-ink-100 text-balance">
            {d.landing.heroTitle} {d.landing.heroTitleAccent}
          </h2>
          <ul className="mt-5 space-y-2.5">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-2.5 text-[13.5px] text-ink-300">
                <span className="grid size-5 shrink-0 place-items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  <Icon name="Check" size={11} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden">
          <FlowPreview className="w-full min-w-[760px] origin-top-left scale-[0.82] rtl:origin-top-right" />
        </div>
      </div>
    </aside>
  );
}
