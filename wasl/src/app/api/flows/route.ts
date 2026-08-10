import { z } from "zod";

import { ok, readBody, withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toFlowSummary } from "@/lib/flows";
import { BLANK_GRAPH } from "@/lib/templates/catalog";
import { id, stringifyJson } from "@/lib/utils";

export const GET = withAuth(async (context, request) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim().toLowerCase();

  const flows = await prisma.flow.findMany({
    where: { workspaceId: context.workspace.id, isArchived: false },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const summaries = flows.map(toFlowSummary);
  const filtered = query
    ? summaries.filter(
        (flow) =>
          flow.name.toLowerCase().includes(query) || flow.description.toLowerCase().includes(query),
      )
    : summaries;

  return ok({ flows: filtered });
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  emoji: z.string().trim().max(40).optional(),
  graph: z
    .object({
      nodes: z.array(z.record(z.string(), z.unknown())),
      edges: z.array(z.record(z.string(), z.unknown())),
    })
    .optional(),
  triggerType: z.enum(["manual", "webhook", "schedule", "chat"]).optional(),
});

export const POST = withAuth(async (context, request) => {
  const body = await readBody(request, createSchema);
  if (body.error) return body.error;

  const graph = body.data.graph ?? BLANK_GRAPH;
  const triggerType = body.data.triggerType ?? "manual";

  const flow = await prisma.flow.create({
    data: {
      workspaceId: context.workspace.id,
      authorId: context.user.id,
      name: body.data.name ?? "Untitled flow",
      description: body.data.description ?? "",
      emoji: body.data.emoji ?? "Zap",
      graph: stringifyJson(graph),
      triggerType,
      webhookToken: triggerType === "webhook" ? `whk_${id(24)}` : null,
      versions: { create: { version: 1, graph: stringifyJson(graph), label: "Created" } },
    },
  });

  return ok({ flow: toFlowSummary(flow) }, { status: 201 });
});
