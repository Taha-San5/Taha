import { z } from "zod";

import { NOT_FOUND, ok, readBody, withAuth } from "@/lib/api";
import { toFlowDetail } from "@/lib/flows";
import { prisma } from "@/lib/prisma";
import { EMPTY_GRAPH, type FlowGraph } from "@/lib/nodes/types";
import { parseJson } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<[Params]>(async (context, _request, { params }) => {
  const { id } = await params;
  const flow = await prisma.flow.findFirst({
    where: { id, workspaceId: context.workspace.id },
    select: { id: true },
  });
  if (!flow) return NOT_FOUND("Flow");

  const versions = await prisma.flowVersion.findMany({
    where: { flowId: flow.id },
    orderBy: { version: "desc" },
    take: 50,
  });

  return ok({
    versions: versions.map((version) => ({
      id: version.id,
      version: version.version,
      label: version.label,
      createdAt: version.createdAt.toISOString(),
      nodeCount: parseJson<FlowGraph>(version.graph, EMPTY_GRAPH).nodes.length,
    })),
  });
});

const restoreSchema = z.object({ version: z.number().int().positive() });

/** Restores a historical version as the current graph (as a new version). */
export const POST = withAuth<[Params]>(async (context, request, { params }) => {
  const { id } = await params;
  const body = await readBody(request, restoreSchema);
  if (body.error) return body.error;

  const flow = await prisma.flow.findFirst({
    where: { id, workspaceId: context.workspace.id },
  });
  if (!flow) return NOT_FOUND("Flow");

  const snapshot = await prisma.flowVersion.findUnique({
    where: { flowId_version: { flowId: flow.id, version: body.data.version } },
  });
  if (!snapshot) return NOT_FOUND("Version");

  const nextVersion = flow.version + 1;
  const updated = await prisma.flow.update({
    where: { id: flow.id },
    data: {
      graph: snapshot.graph,
      version: nextVersion,
      versions: {
        create: {
          version: nextVersion,
          graph: snapshot.graph,
          label: `Restored v${snapshot.version}`,
        },
      },
    },
  });

  return ok({ flow: toFlowDetail(updated) });
});
