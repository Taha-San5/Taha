import { NOT_FOUND, ok, withAuth } from "@/lib/api";
import { toRunView } from "@/lib/flows";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<[Params]>(async (context, _request, { params }) => {
  const { id } = await params;
  const run = await prisma.run.findFirst({
    where: { id, workspaceId: context.workspace.id },
    include: {
      nodeRuns: { orderBy: { order: "asc" } },
      flow: { select: { name: true, emoji: true } },
    },
  });
  if (!run) return NOT_FOUND("Run");

  return ok({ run: { ...toRunView(run), flowName: run.flow.name, flowEmoji: run.flow.emoji } });
});
