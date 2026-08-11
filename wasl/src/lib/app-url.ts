import "server-only";

import { headers } from "next/headers";

/**
 * The app's own public URL, used in the webhook and REST snippets we show people.
 *
 * Resolved per request rather than baked in at build time, so attaching a custom
 * domain works immediately with no rebuild and no environment change. Order:
 *
 *   1. APP_URL            — explicit override, wins when set
 *   2. request headers    — what the visitor actually typed, honouring the
 *                           proxy headers Railway/Vercel/Fly/nginx set
 *   3. RAILWAY_PUBLIC_DOMAIN — the platform's own idea of the hostname
 *   4. localhost          — development fallback
 *
 * Deliberately reads `APP_URL` and *not* `NEXT_PUBLIC_APP_URL`: Next inlines
 * NEXT_PUBLIC_* at build time, so a value baked into the image can never be
 * corrected at runtime — verified by unsetting it and still getting the old
 * value back. A build-frozen hostname is exactly the bug this module exists to
 * prevent.
 */
export async function getAppUrl(): Promise<string> {
  const explicit = process.env.APP_URL;
  if (explicit?.trim()) return stripTrailingSlash(explicit.trim());

  try {
    const store = await headers();

    // x-forwarded-host can be a comma-separated chain; the first entry is the
    // hostname the client asked for.
    const forwardedHost = store.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || store.get("host")?.trim();

    if (host) {
      const forwardedProto = store.get("x-forwarded-proto")?.split(",")[0]?.trim();
      const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
      const protocol = forwardedProto || (isLocal ? "http" : "https");
      return stripTrailingSlash(`${protocol}://${host}`);
    }
  } catch {
    // headers() is unavailable outside a request scope; fall through.
  }

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) return `https://${railwayDomain}`;

  return "http://localhost:3000";
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
