import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Google OAuth 2.0 (OpenID Connect) with PKCE.
 *
 * Enabled only when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are present, so
 * the sign-in button is hidden rather than shown-and-broken on a deployment
 * that has not configured it.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export const GOOGLE_STATE_COOKIE = "wasl_oauth_state";
export const GOOGLE_VERIFIER_COOKIE = "wasl_oauth_verifier";
export const GOOGLE_NEXT_COOKIE = "wasl_oauth_next";

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function redirectUri(appUrl: string): string {
  return `${appUrl.replace(/\/+$/, "")}/api/auth/google/callback`;
}

/** Short-lived cookies that only need to survive the round trip to Google. */
export const transientCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 600,
};

export interface PkcePair {
  state: string;
  verifier: string;
  challenge: string;
}

export function createPkcePair(): PkcePair {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function buildAuthorizeUrl(options: { appUrl: string; state: string; challenge: string }): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: redirectUri(options.appUrl),
    response_type: "code",
    scope: "openid email profile",
    state: options.state,
    code_challenge: options.challenge,
    code_challenge_method: "S256",
    // Always let the user pick an account rather than silently reusing one.
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

export async function exchangeCodeForProfile(options: {
  code: string;
  verifier: string;
  appUrl: string;
}): Promise<GoogleProfile> {
  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      code: options.code,
      code_verifier: options.verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(options.appUrl),
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!tokenResponse.ok) {
    const detail = await tokenResponse.text().catch(() => "");
    throw new Error(`Token exchange failed (${tokenResponse.status}): ${detail.slice(0, 300)}`);
  }

  const tokens = (await tokenResponse.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error("Google did not return an access token");

  const userResponse = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!userResponse.ok) throw new Error(`Could not read the Google profile (${userResponse.status})`);

  const profile = (await userResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    picture?: string;
  };

  if (!profile.sub || !profile.email) {
    throw new Error("Google profile is missing an id or email");
  }

  return {
    sub: profile.sub,
    email: profile.email.toLowerCase(),
    emailVerified: profile.email_verified !== false,
    name: profile.name || profile.given_name || profile.email.split("@")[0],
    picture: profile.picture,
  };
}
