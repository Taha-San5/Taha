"use client";

import Link from "next/link";

import { useI18n } from "@/components/i18n-provider";
import { LogoMark } from "@/components/marketing/logo";

/**
 * Branded 404, replacing Next's bare default page.
 *
 * Deliberately a client component reading locale from context rather than a
 * server component calling cookies(): a dynamic API here forces the segment to
 * render dynamically, the response starts streaming before notFound() runs, and
 * the status is stuck at 200. The smoke suite catches exactly that regression.
 */
export default function NotFound() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  const links = [
    { href: "/", label: ar ? "الرئيسية" : "Home" },
    { href: "/templates", label: ar ? "القوالب" : "Templates" },
    { href: "/docs", label: ar ? "المستندات" : "Docs" },
    { href: "/app", label: ar ? "لوحة التحكم" : "Dashboard" },
  ];

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 45% 45% at 50% 30%, rgba(99,102,241,0.18), transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative max-w-md text-center">
        <Link href="/" className="inline-flex" aria-label="Wasl">
          <LogoMark size={40} />
        </Link>

        <p className="mt-8 text-[64px] leading-none font-semibold tracking-tight text-ink-100 tabular-nums">
          404
        </p>

        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink-100">
          {ar ? "الصفحة غير موجودة" : "This page does not exist"}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-400">
          {ar
            ? "الرابط قد يكون قديماً أو مكتوباً بشكل خاطئ. جرّب أحد هذه:"
            : "The link may be out of date or mistyped. Try one of these:"}
        </p>

        <nav className="mt-7 flex flex-wrap justify-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-ink-700 bg-ink-900/60 px-3.5 py-2 text-[13px] text-ink-200 transition-colors hover:border-ink-500 hover:bg-ink-800 hover:text-ink-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
