import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAppUrl } from "@/lib/app-url";
import {
  buildAuthorizeUrl,
  createPkcePair,
  GOOGLE_NEXT_COOKIE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  isGoogleConfigured,
  transientCookieOptions,
} from "@/lib/oauth/google";

/** Starts the Google sign-in flow. */
export async function GET(request: Request) {
  // Never build redirects from `request.url`: behind a proxy that is the
  // container's internal address (e.g. https://0.0.0.0:8080), which would send
  // the browser somewhere unreachable.
  const appUrl = await getAppUrl();

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${appUrl}/login?error=google_not_configured`);
  }

  const { state, verifier, challenge } = createPkcePair();

  // `state` defeats CSRF; the PKCE verifier proves the callback came from the
  // same browser that started the flow. Both are httpOnly and short-lived.
  const store = await cookies();
  store.set(GOOGLE_STATE_COOKIE, state, transientCookieOptions);
  store.set(GOOGLE_VERIFIER_COOKIE, verifier, transientCookieOptions);

  // Only keep a relative path, so this cannot be used as an open redirect.
  const requested = new URL(request.url).searchParams.get("next");
  if (requested && requested.startsWith("/") && !requested.startsWith("//")) {
    store.set(GOOGLE_NEXT_COOKIE, requested, transientCookieOptions);
  }

  return NextResponse.redirect(buildAuthorizeUrl({ appUrl, state, challenge }));
}
