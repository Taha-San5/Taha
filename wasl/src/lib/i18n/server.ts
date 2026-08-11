import "server-only";

import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  dirFor,
  getDictionary,
  isLocale,
  LOCALE_COOKIE,
  type Dictionary,
  type Locale,
} from "@/lib/i18n/dictionaries";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getI18n(): Promise<{ locale: Locale; dir: "rtl" | "ltr"; d: Dictionary }> {
  const locale = await getLocale();
  return { locale, dir: dirFor(locale), d: getDictionary(locale) };
}
