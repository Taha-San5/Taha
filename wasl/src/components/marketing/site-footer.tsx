"use client";

import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { Logo } from "@/components/marketing/logo";

export function SiteFooter() {
  const { d, locale } = useI18n();

  const columns = [
    {
      title: d.nav.product,
      links: [
        { href: "/templates", label: d.nav.templates },
        { href: "/pricing", label: d.nav.pricing },
        { href: "/docs", label: d.nav.docs },
      ],
    },
    {
      title: locale === "ar" ? "ابدأ" : "Get started",
      links: [
        { href: "/signup", label: d.common.signUp },
        { href: "/login", label: d.common.signIn },
        { href: "/app", label: d.nav.dashboard },
      ],
    },
    {
      title: locale === "ar" ? "المرجع" : "Reference",
      links: [
        { href: "/docs#nodes", label: locale === "ar" ? "مرجع العُقد" : "Node reference" },
        { href: "/docs#expressions", label: locale === "ar" ? "التعبيرات" : "Expressions" },
        { href: "/docs#api", label: locale === "ar" ? "واجهة REST" : "REST API" },
      ],
    },
  ];

  return (
    <footer className="border-t border-ink-800 bg-ink-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-[13px] leading-relaxed text-ink-400">{d.brand.tagline}</p>
        </div>

        {columns.map((column) => (
          <div key={column.title} className="space-y-3">
            <p className="text-[12px] font-semibold tracking-wide text-ink-300 uppercase">{column.title}</p>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13px] text-ink-400 transition-colors hover:text-ink-100">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-ink-800/70 px-4 py-5 sm:px-6">
        <p className="mx-auto max-w-6xl text-[12px] text-ink-500">
          © {new Date().getFullYear()} Wasl · وصل
        </p>
      </div>
    </footer>
  );
}
