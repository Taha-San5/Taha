import { z } from "zod";

import { ok, readBody, withAuth } from "@/lib/api";
import { hashToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { id } from "@/lib/utils";

export const GET = withAuth(async (context) => {
  const keys = await prisma.apiKey.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: { createdAt: "desc" },
  });

  return ok({
    keys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
      revokedAt: key.revokedAt?.toISOString() ?? null,
      createdAt: key.createdAt.toISOString(),
    })),
  });
});

const createSchema = z.object({ name: z.string().trim().min(1).max(80) });

export const POST = withAuth(async (context, request) => {
  const body = await readBody(request, createSchema);
  if (body.error) return body.error;

  // Shown to the user exactly once; we only persist the hash.
  const token = `wsl_${id(32)}`;
  const key = await prisma.apiKey.create({
    data: {
      workspaceId: context.workspace.id,
      name: body.data.name,
      prefix: token.slice(0, 11),
      hash: hashToken(token),
    },
  });

  return ok(
    {
      key: {
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        createdAt: key.createdAt.toISOString(),
        lastUsedAt: null,
        revokedAt: null,
      },
      token,
    },
    { status: 201 },
  );
});
