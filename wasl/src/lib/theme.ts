export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

/** Dark is the brand default; the cookie only records an explicit choice. */
export const DEFAULT_THEME: Theme = "dark";
export const THEME_COOKIE = "wasl_theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}
