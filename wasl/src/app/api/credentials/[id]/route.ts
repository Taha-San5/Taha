import { NOT_FOUND, ok, withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export const DELETE = withAuth<[Params]>(async (context, _request, { params }) => {
  const { id } = await params;
  const credential = await prisma.credential.findFirst({
    where: { id, workspaceId: context.workspace.id },
    select: { id: true },
  });
  if (!credential) return NOT_FOUND("Credential");

  await prisma.credential.delete({ where: { id: credential.id } });
  return ok({ ok: true });
});
