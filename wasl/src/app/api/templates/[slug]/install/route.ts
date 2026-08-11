import { NOT_FOUND, ok, withAuth } from "@/lib/api";
import { toFlowSummary } from "@/lib/flows";
import { prisma } from "@/lib/prisma";
import { nodeDef } from "@/lib/nodes/registry";
import { EMPTY_GRAPH, type FlowGraph } from "@/lib/nodes/types";
import { id as randomId, parseJson } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

export const POST = withAuth<[Params]>(async (context, _request, { params }) => {
  const { slug } = await params;
  const template = await prisma.template.findUnique({ where: { slug } });
  if (!template) return NOT_FOUND("Template");

  const graph = parseJson<FlowGraph>(template.graph, EMPTY_GRAPH);

  // Derive the trigger type from the graph so the flow's settings match.
  const trigger = graph.nodes.find((node) => nodeDef(node.type)?.category === "trigger");
  const triggerType = trigger?.type.replace("trigger.", "") ?? "manual";

  const flow = await prisma.flow.create({
    data: {
      workspaceId: context.workspace.id,
      authorId: context.user.id,
      name: template.name,
      description: template.description,
      emoji: template.emoji,
      graph: template.graph,
      triggerType,
      webhookToken: triggerType === "webhook" ? `whk_${randomId(24)}` : null,
      versions: {
        create: { version: 1, graph: template.graph, label: `Installed from ${template.slug}` },
      },
    },
  });

  await prisma.template.update({
    where: { id: template.id },
    data: { installs: { increment: 1 } },
  });

  return ok({ flow: toFlowSummary(flow) }, { status: 201 });
});
