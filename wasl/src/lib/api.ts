import "server-only";

import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { getAuthContext } from "@/lib/auth";
import { hashToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data as object, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export const UNAUTHORIZED = () => fail("Not signed in", 401);
export const NOT_FOUND = (what = "Resource") => fail(`${what} not found`, 404);

export type AuthContext = NonNullable<Awaited<ReturnType<typeof getAuthContext>>>;

/** Wraps a route handler with session auth. */
export function withAuth<Args extends unknown[]>(
  handler: (context: AuthContext, request: Request, ...args: Args) => Promise<NextResponse>,
) {
  return async (request: Request, ...args: Args): Promise<NextResponse> => {
    const context = await getAuthContext();
    if (!context) return UNAUTHORIZED();
    try {
      return await handler(context, request, ...args);
    } catch (error) {
      return handleRouteError(error);
    }
  };
}

export function handleRouteError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error("[api]", error);
  return fail(message, 500);
}

/** Parses and validates a JSON body. Returns a NextResponse on failure. */
export async function readBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: fail("Expected a JSON body") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".");
    return { error: fail(path ? `${path}: ${first.message}` : (first?.message ?? "Invalid body"), 422) };
  }
  return { data: result.data };
}

/** Resolves an API key from the Authorization header for the public REST API. */
export async function authenticateApiKey(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const key = await prisma.apiKey.findUnique({
    where: { hash: hashToken(token) },
    include: { workspace: true },
  });
  if (!key || key.revokedAt) return null;

  await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  return key;
}

/** Guards runs against an exhausted credit balance. */
export function creditGuard(balance: number): NextResponse | null {
  if (balance > 0) return null;
  return fail(
    "Your workspace is out of credits. Top up, wait for the monthly reset, or attach your own model key to run for free.",
    402,
  );
}
