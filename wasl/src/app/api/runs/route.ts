import { ok, withAuth } from "@/lib/api";
import { toRunView } from "@/lib/flows";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (context, request) => {
  const url = new URL(request.url);
  const flowId = url.searchParams.get("flowId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 30) || 30));

  const runs = await prisma.run.findMany({
    where: {
      workspaceId: context.workspace.id,
      ...(flowId ? { flowId } : {}),
      ...(status && status !== "all" ? { status } : {}),
    },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { flow: { select: { name: true, emoji: true } } },
  });

  return ok({
    runs: runs.map((run) => ({
      ...toRunView(run),
      flowName: run.flow.name,
      flowEmoji: run.flow.emoji,
    })),
  });
});
