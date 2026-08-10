"use client";

import { createContext, useCallback, useContext, useMemo, useTransition } from "react";

import {
  dirFor,
  getDictionary,
  LOCALE_COOKIE,
  type Dictionary,
  type Locale,
} from "@/lib/i18n/dictionaries";

interface I18nValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  d: Dictionary;
  isRtl: boolean;
  setLocale: (next: Locale) => void;
  switching: boolean;
  /** Picks the Arabic variant of a bilingual pair (used for node labels). */
  pick: (en: string, ar: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const [switching, startTransition] = useTransition();

  const setLocale = useCallback((next: Locale) => {
    // One year, lax — the server layout reads this to set <html lang/dir>.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      window.location.reload();
    });
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dictionary = getDictionary(locale);
    return {
      locale,
      dir: dirFor(locale),
      d: dictionary,
      isRtl: locale === "ar",
      setLocale,
      switching,
      pick: (en, ar) => (locale === "ar" ? ar || en : en),
    };
  }, [locale, setLocale, switching]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
