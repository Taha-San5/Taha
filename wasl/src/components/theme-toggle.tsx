"use client";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const { locale } = useI18n();

  const label =
    theme === "dark"
      ? locale === "ar"
        ? "التبديل إلى الوضع الفاتح"
        : "Switch to light mode"
      : locale === "ar"
        ? "التبديل إلى الوضع الغامق"
        : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={cn(
        "grid size-9 place-items-center rounded-lg border border-ink-700 bg-ink-900/70 text-ink-300",
        "transition-colors hover:border-ink-600 hover:text-ink-100",
        className,
      )}
    >
      {/* Both icons are rendered and cross-faded, so the swap has no layout shift. */}
      <span className="relative grid size-4 place-items-center">
        <Icon
          name="Sun"
          size={16}
          className={cn(
            "absolute transition-all duration-200",
            theme === "light" ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
        <Icon
          name="Moon"
          size={16}
          className={cn(
            "absolute transition-all duration-200",
            theme === "dark" ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
      </span>
    </button>
  );
}
