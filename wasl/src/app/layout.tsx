import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono } from "next/font/google";

import { I18nProvider } from "@/components/i18n-provider";
import { dirFor, getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

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

export const metadata: Metadata = {
  title: {
    default: "Wasl · Build AI workflows visually",
    template: "%s · Wasl",
  },
  description:
    "Wasl is an Arabic-first visual builder for AI workflows. Drag nodes onto a canvas, wire them together, and ship automations that read the web, reason with a model and take action.",
  applicationName: "Wasl",
  keywords: [
    "AI automation",
    "workflow builder",
    "no-code",
    "AI agents",
    "أتمتة",
    "الذكاء الاصطناعي",
    "سير عمل",
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
  const locale = await getLocale();
  const dir = dirFor(locale);
  const d = getDictionary(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${inter.variable} ${arabic.variable} ${mono.variable} min-h-dvh antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-100 focus:rounded-lg focus:bg-brand-600 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          {dir === "rtl" ? "تخطَّ إلى المحتوى" : "Skip to content"}
        </a>
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <span className="sr-only">{d.brand.tagline}</span>
      </body>
    </html>
  );
}
