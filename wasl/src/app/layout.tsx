import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono } from "next/font/google";

import { I18nProvider } from "@/components/i18n-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getAppUrl } from "@/lib/app-url";
import { dirFor, getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { getTheme } from "@/lib/theme-server";

import "./globals.css";
import "@xyflow/react/dist/style.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Resolved per request so `metadataBase` is the real public URL.
 *
 * Left to itself, Next infers the base from the incoming request, which behind a
 * proxy is the container's internal address — producing
 * `og:image=http://localhost:8080/...` that no social scraper can fetch. Every
 * relative metadata URL (og:image, twitter:image) depends on this.
 */
export async function generateMetadata(): Promise<Metadata> {
  const appUrl = await getAppUrl();

  return {
    ...baseMetadata,
    metadataBase: new URL(appUrl),
  };
}

const baseMetadata: Metadata = {
  title: {
    default: "Wasl · Build AI workflows visually",
    template: "%s · Wasl",
  },
  description:
    "Wasl is a visual builder for AI workflows. Drag nodes onto a canvas, wire them together, and ship automations that read the web, reason with a model and take action — with a live trace of every step.",
  applicationName: "Wasl",
  keywords: [
    "AI automation",
    "AI workflow builder",
    "no-code automation",
    "AI agents",
    "LLM orchestration",
    "workflow engine",
  ],
  openGraph: {
    title: "Wasl · Build AI workflows visually",
    description: "Visual AI workflow automation with live traces, branching, loops and bring-your-own-key pricing.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#06070a",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  const dir = dirFor(locale);
  const d = getDictionary(locale);

  return (
    <html lang={locale} dir={dir} className={theme} suppressHydrationWarning>
      <body className={`${inter.variable} ${arabic.variable} ${mono.variable} min-h-dvh antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-100 focus:rounded-lg focus:bg-brand-600 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          {dir === "rtl" ? "تخطَّ إلى المحتوى" : "Skip to content"}
        </a>
        <ThemeProvider initial={theme}>
          <I18nProvider locale={locale}>{children}</I18nProvider>
        </ThemeProvider>
        <span className="sr-only">{d.brand.tagline}</span>
      </body>
    </html>
  );
}
