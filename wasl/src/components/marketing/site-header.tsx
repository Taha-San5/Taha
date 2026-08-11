"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/marketing/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, ButtonLink } from "@/components/ui/kit";
import { cn } from "@/lib/utils";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const { d } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const links = [
    { href: "/templates", label: d.nav.templates },
    { href: "/pricing", label: d.nav.pricing },
    { href: "/docs", label: d.nav.docs },
    { href: "/about", label: d.about.nav },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200",
        scrolled ? "border-ink-700 bg-ink-950/85 backdrop-blur-xl" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-15 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[13.5px] transition-colors",
                pathname === link.href ? "text-ink-100" : "text-ink-300 hover:text-ink-100",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
          {signedIn ? (
            <ButtonLink href="/app" size="sm" iconEnd="ArrowRight" className="hidden sm:inline-flex">
              {d.nav.dashboard}
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                {d.common.signIn}
              </ButtonLink>
              <ButtonLink href="/signup" size="sm" className="hidden sm:inline-flex">
                {d.common.signUp}
              </ButtonLink>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Menu"
            aria-expanded={open}
          >
            <Icon name={open ? "X" : "Menu"} size={18} />
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-ink-700 bg-ink-950/95 px-4 py-3 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm text-ink-200 hover:bg-ink-800"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 border-t border-ink-700 pt-3">
              {signedIn ? (
                <ButtonLink href="/app" size="sm" className="flex-1 justify-center">
                  {d.nav.dashboard}
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/login" variant="secondary" size="sm" className="flex-1 justify-center">
                    {d.common.signIn}
                  </ButtonLink>
                  <ButtonLink href="/signup" size="sm" className="flex-1 justify-center">
                    {d.common.signUp}
                  </ButtonLink>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
