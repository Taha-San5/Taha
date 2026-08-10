import { NOT_FOUND, ok, withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** Revokes rather than deletes so audit history survives. */
export const DELETE = withAuth<[Params]>(async (context, _request, { params }) => {
  const { id } = await params;
  const key = await prisma.apiKey.findFirst({
    where: { id, workspaceId: context.workspace.id },
    select: { id: true },
  });
  if (!key) return NOT_FOUND("API key");

  await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
  return ok({ ok: true });
});
