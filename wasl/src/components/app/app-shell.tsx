"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoMark } from "@/components/marketing/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge, Button } from "@/components/ui/kit";
import { cn, formatNumber } from "@/lib/utils";

export interface ShellUser {
  name: string;
  email: string;
  avatarColor: string;
}

export interface ShellWorkspace {
  name: string;
  plan: string;
  creditBalance: number;
  creditsIncluded: number;
  periodStart: string;
}

export function AppShell({
  user,
  workspace,
  role,
  children,
}: {
  user: ShellUser;
  workspace: ShellWorkspace;
  role: string;
  children: React.ReactNode;
}) {
  const { d, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  // The builder needs the full viewport, so the shell drops its padding there.
  const isBuilder = /^\/app\/flows\/[^/]+$/.test(pathname);

  const nav = [
    { href: "/app", label: d.app.flows, icon: "LayoutGrid", exact: true },
    { href: "/app/runs", label: d.app.runs, icon: "History" },
    { href: "/app/credentials", label: d.app.credentials, icon: "Key" },
    { href: "/app/keys", label: d.app.apiKeys, icon: "Terminal" },
    { href: "/app/credits", label: d.app.credits, icon: "CreditCard" },
  ];

  const used = Math.max(0, workspace.creditsIncluded - workspace.creditBalance);
  const usedPercent = workspace.creditsIncluded > 0 ? Math.min(100, (used / workspace.creditsIncluded) * 100) : 0;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-1 p-3">
      <div className="flex items-center gap-2.5 px-1.5 py-2">
        <Link href="/" aria-label="Wasl">
          <LogoMark size={24} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink-100">{workspace.name}</p>
          <p className="text-[11px] text-ink-500 capitalize">
            {workspace.plan} · {role}
          </p>
        </div>
      </div>

      <nav className="mt-2 space-y-0.5">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                active
                  ? "bg-ink-800 font-medium text-ink-100"
                  : "text-ink-400 hover:bg-ink-900 hover:text-ink-200",
              )}
            >
              <Icon name={item.icon} size={15} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 space-y-0.5 border-t border-ink-800 pt-3">
        <Link
          href="/templates"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-400 transition-colors hover:bg-ink-900 hover:text-ink-200"
        >
          <Icon name="Boxes" size={15} />
          {d.app.templates}
        </Link>
        <Link
          href="/docs"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-400 transition-colors hover:bg-ink-900 hover:text-ink-200"
        >
          <Icon name="BookOpen" size={15} />
          {d.common.docs}
        </Link>
      </div>

      {/* credits meter */}
      <Link
        href="/app/credits"
        className="mt-auto block rounded-xl border border-ink-700 bg-ink-900/60 p-3 transition-colors hover:border-ink-600"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium tracking-wide text-ink-400 uppercase">{d.app.credits}</span>
          {workspace.creditBalance <= 0 ? <Badge tone="danger">0</Badge> : null}
        </div>
        <p className="mt-1 text-[17px] font-semibold tabular-nums text-ink-100">
          {formatNumber(workspace.creditBalance, locale)}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              usedPercent > 90 ? "bg-rose-500" : usedPercent > 70 ? "bg-amber-500" : "bg-brand-500",
            )}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10.5px] text-ink-500 tabular">
          {formatNumber(used, locale)} {d.app.creditsUsedThisPeriod}
        </p>
      </Link>

      {/* user */}
      <div className="relative mt-2">
        <button
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-start transition-colors hover:bg-ink-900"
        >
          <span
            className="grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white"
            style={{ backgroundColor: user.avatarColor }}
          >
            {user.name.trim().charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] text-ink-200">{user.name}</span>
            <span className="block truncate text-[10.5px] text-ink-500">{user.email}</span>
          </span>
          <Icon name="ChevronDown" size={14} className="shrink-0 text-ink-500" />
        </button>

        {menuOpen ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} role="presentation" />
            <div className="panel absolute bottom-full z-20 mb-2 w-full bg-ink-850 p-1.5 shadow-2xl">
              <div className="flex items-center justify-between gap-2 px-1.5 py-1">
                <span className="text-[11.5px] text-ink-400">{d.common.language}</span>
                <LocaleSwitcher compact />
              </div>
              <div className="flex items-center justify-between gap-2 px-1.5 py-1">
                <span className="text-[11.5px] text-ink-400">
                  {locale === "ar" ? "المظهر" : "Appearance"}
                </span>
                <ThemeToggle className="size-7" />
              </div>
              <button
                onClick={logout}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-ink-300 transition-colors hover:bg-ink-800 hover:text-rose-300"
              >
                <Icon name="LogOut" size={14} />
                {d.common.logout}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-60 shrink-0 border-e border-ink-800 bg-ink-950 lg:block">{sidebar}</aside>

      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            role="presentation"
          />
          <aside className="fixed inset-y-0 start-0 z-50 w-64 border-e border-ink-800 bg-ink-950 lg:hidden">
            {sidebar}
          </aside>
        </>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center gap-2 border-b border-ink-800 px-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Icon name="Menu" size={18} />
          </Button>
          <LogoMark size={22} />
          <span className="text-[13px] font-medium text-ink-200">Wasl</span>
        </div>

        <main id="main" className={cn("min-h-0 flex-1", isBuilder ? "overflow-hidden" : "overflow-y-auto")}>
          {children}
        </main>
      </div>
    </div>
  );
}
