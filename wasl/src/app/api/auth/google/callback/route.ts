import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAppUrl } from "@/lib/app-url";
import { AuthError, createSessionCookie, upsertGoogleUser } from "@/lib/auth";
import {
  exchangeCodeForProfile,
  GOOGLE_NEXT_COOKIE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  isGoogleConfigured,
} from "@/lib/oauth/google";

/** Completes the Google sign-in flow and establishes the session. */
export async function GET(request: Request) {
  const url = new URL(request.url);

  // Redirects are built from the public URL, not `request.url`: behind a proxy
  // the latter is the container's internal address (https://0.0.0.0:8080).
  const appUrl = await getAppUrl();
  const fail = (reason: string) => NextResponse.redirect(`${appUrl}/login?error=${reason}`);

  if (!isGoogleConfigured()) return fail("google_not_configured");

  // The user can decline on Google's screen.
  if (url.searchParams.get("error")) return fail("google_cancelled");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("google_bad_response");

  const store = await cookies();
  const expectedState = store.get(GOOGLE_STATE_COOKIE)?.value;
  const verifier = store.get(GOOGLE_VERIFIER_COOKIE)?.value;
  const next = store.get(GOOGLE_NEXT_COOKIE)?.value;

  // Clear the transient cookies whatever happens next.
  store.delete(GOOGLE_STATE_COOKIE);
  store.delete(GOOGLE_VERIFIER_COOKIE);
  store.delete(GOOGLE_NEXT_COOKIE);

  if (!expectedState || !verifier) return fail("google_expired");
  if (state !== expectedState) return fail("google_state_mismatch");

  try {
    const profile = await exchangeCodeForProfile({ code, verifier, appUrl });
    const { user, workspaceId } = await upsertGoogleUser(profile);

    await createSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      workspaceId,
    });

    const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
    return NextResponse.redirect(`${appUrl}${destination}`);
  } catch (error) {
    if (error instanceof AuthError && error.code === "EMAIL_NOT_VERIFIED") {
      return fail("google_email_unverified");
    }
    console.error("[google oauth]", error);
    return fail("google_failed");
  }
}
