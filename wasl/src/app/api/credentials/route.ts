import { z } from "zod";

import { fail, ok, readBody, withAuth } from "@/lib/api";
import { encryptSecret, maskSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (context) => {
  const credentials = await prisma.credential.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, provider: true, meta: true, createdAt: true },
  });

  return ok({
    credentials: credentials.map((credential) => ({
      id: credential.id,
      name: credential.name,
      provider: credential.provider,
      hint: JSON.parse(credential.meta || "{}")?.hint ?? "",
      createdAt: credential.createdAt.toISOString(),
    })),
  });
});

const createSchema = z.object({
  name: z.string().trim().min(1, "Add a label").max(80),
  provider: z.enum(["openai", "slack", "http", "other"]),
  secret: z.string().trim().min(4, "That secret looks too short").max(4000),
});

export const POST = withAuth(async (context, request) => {
  const body = await readBody(request, createSchema);
  if (body.error) return body.error;

  const duplicate = await prisma.credential.findFirst({
    where: { workspaceId: context.workspace.id, name: body.data.name },
    select: { id: true },
  });
  if (duplicate) return fail("A credential with that label already exists", 409);

  const credential = await prisma.credential.create({
    data: {
      workspaceId: context.workspace.id,
      name: body.data.name,
      provider: body.data.provider,
      secretCipher: encryptSecret(body.data.secret),
      meta: JSON.stringify({ hint: maskSecret(body.data.secret) }),
    },
  });

  return ok(
    {
      credential: {
        id: credential.id,
        name: credential.name,
        provider: credential.provider,
        hint: maskSecret(body.data.secret),
        createdAt: credential.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
});
