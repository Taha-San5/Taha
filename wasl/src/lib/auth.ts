import "server-only";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession, type SessionPayload } from "@/lib/jwt";
import { slugify } from "@/lib/utils";

const AVATAR_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 11);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Full authenticated context, including the active workspace. */
export async function getAuthContext() {
  const session = await getSession();
  if (!session) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, workspaceId: session.workspaceId },
    include: { user: true, workspace: true },
  });
  if (!membership) return null;

  return {
    user: membership.user,
    workspace: membership.workspace,
    role: membership.role,
  };
}

export async function requireAuth() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  return context;
}

/** Creates a user with their personal workspace in one transaction. */
export async function registerUser(input: { email: string; name: string; password: string; locale?: string }) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AuthError("EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(input.password);
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const user = await prisma.user.create({
    data: {
      email,
      name: input.name.trim() || email.split("@")[0],
      passwordHash,
      avatarColor,
      locale: input.locale === "en" ? "en" : "ar",
    },
  });

  const baseSlug = slugify(user.name);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: `${user.name}'s workspace`,
      slug,
      memberships: { create: { userId: user.id, role: "owner" } },
      ledger: {
        create: {
          delta: 5000,
          reason: "monthly_reset",
          balanceAfter: 5000,
        },
      },
    },
  });

  return { user, workspace };
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!user) throw new AuthError("INVALID_CREDENTIALS");

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new AuthError("INVALID_CREDENTIALS");

  const workspaceId = user.memberships[0]?.workspaceId;
  if (!workspaceId) throw new AuthError("NO_WORKSPACE");

  return { user, workspaceId };
}

export class AuthError extends Error {
  constructor(public code: "EMAIL_TAKEN" | "INVALID_CREDENTIALS" | "NO_WORKSPACE") {
    super(code);
    this.name = "AuthError";
  }
}
