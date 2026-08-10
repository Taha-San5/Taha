import { NOT_FOUND, ok, withAuth } from "@/lib/api";
import { toFlowSummary } from "@/lib/flows";
import { prisma } from "@/lib/prisma";
import { id as randomId } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export const POST = withAuth<[Params]>(async (context, _request, { params }) => {
  const { id } = await params;
  const source = await prisma.flow.findFirst({
    where: { id, workspaceId: context.workspace.id },
  });
  if (!source) return NOT_FOUND("Flow");

  const copy = await prisma.flow.create({
    data: {
      workspaceId: context.workspace.id,
      authorId: context.user.id,
      name: `${source.name} (copy)`,
      description: source.description,
      emoji: source.emoji,
      graph: source.graph,
      triggerType: source.triggerType,
      triggerConfig: source.triggerConfig,
      webhookToken: source.triggerType === "webhook" ? `whk_${randomId(24)}` : null,
      status: "draft",
      versions: { create: { version: 1, graph: source.graph, label: `Copied from ${source.name}` } },
    },
  });

  return ok({ flow: toFlowSummary(copy) }, { status: 201 });
});
