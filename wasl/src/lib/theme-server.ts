import "server-only";

import { cookies } from "next/headers";

import { DEFAULT_THEME, isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

/**
 * Read on every request so the correct class is on <html> in the very first
 * byte of HTML. That is what prevents a flash of the wrong theme — no inline
 * blocking script required.
 */
export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}
