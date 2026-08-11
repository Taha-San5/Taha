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

/** Personal workspace with a unique slug and the free monthly credit grant. */
async function createWorkspaceFor(user: { id: string; name: string }) {
  const baseSlug = slugify(user.name);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  return prisma.workspace.create({
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
}

function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/** Creates a user with their personal workspace. */
export async function registerUser(input: { email: string; name: string; password: string; locale?: string }) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AuthError("EMAIL_TAKEN");
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: input.name.trim() || email.split("@")[0],
      passwordHash: await hashPassword(input.password),
      avatarColor: randomAvatarColor(),
      locale: input.locale === "ar" ? "ar" : "en",
    },
  });

  const workspace = await createWorkspaceFor(user);
  return { user, workspace };
}

/**
 * Signs in (or registers) a user from a verified Google profile.
 *
 * Matching is by `googleId` first, then by email so someone who originally
 * signed up with a password can use Google afterwards without ending up with a
 * duplicate account. Linking by email is only safe because Google tells us the
 * address is verified — an unverified address is refused.
 */
export async function upsertGoogleUser(profile: {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}) {
  if (!profile.emailVerified) throw new AuthError("EMAIL_NOT_VERIFIED");

  const byGoogleId = await prisma.user.findUnique({
    where: { googleId: profile.sub },
    include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  let user = byGoogleId;

  if (!user) {
    const byEmail = await prisma.user.findUnique({
      where: { email: profile.email },
      include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
    });

    if (byEmail) {
      // Link Google to the existing password account.
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: profile.sub,
          avatarUrl: profile.picture ?? byEmail.avatarUrl,
        },
        include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
      });
    } else {
      const created = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.sub,
          avatarUrl: profile.picture,
          avatarColor: randomAvatarColor(),
          locale: "en",
        },
      });
      await createWorkspaceFor(created);
      user = await prisma.user.findUniqueOrThrow({
        where: { id: created.id },
        include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
      });
    }
  }

  // An account can exist without a workspace if creation previously failed.
  let workspaceId = user.memberships[0]?.workspaceId;
  if (!workspaceId) {
    workspaceId = (await createWorkspaceFor(user)).id;
  }

  return { user, workspaceId };
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!user) throw new AuthError("INVALID_CREDENTIALS");

  // Google-only accounts have no hash to compare against; say so rather than
  // reporting a wrong password for a password that does not exist.
  if (!user.passwordHash) throw new AuthError("USE_GOOGLE_SIGNIN");

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new AuthError("INVALID_CREDENTIALS");

  const workspaceId = user.memberships[0]?.workspaceId;
  if (!workspaceId) throw new AuthError("NO_WORKSPACE");

  return { user, workspaceId };
}

export class AuthError extends Error {
  constructor(
    public code:
      | "EMAIL_TAKEN"
      | "INVALID_CREDENTIALS"
      | "NO_WORKSPACE"
      | "USE_GOOGLE_SIGNIN"
      | "EMAIL_NOT_VERIFIED",
  ) {
    super(code);
    this.name = "AuthError";
  }
}
