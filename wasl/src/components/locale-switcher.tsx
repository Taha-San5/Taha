"use client";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, switching, d } = useI18n();

  return (
    <div
      role="group"
      aria-label={d.common.language}
      className={cn(
        "inline-flex items-center rounded-lg border border-ink-700 bg-ink-900/70 p-0.5",
        switching && "opacity-60",
      )}
    >
      {!compact ? (
        <Icon name="Languages" size={13} className="mx-1.5 text-ink-400" />
      ) : null}
      {(
        [
          { value: "ar", label: "ع" },
          { value: "en", label: "EN" },
        ] as const
      ).map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => option.value !== locale && setLocale(option.value)}
          aria-pressed={option.value === locale}
          className={cn(
            "rounded-md px-2 py-1 text-[12px] font-medium transition-colors",
            option.value === locale ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-200",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
