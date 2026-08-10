import { z } from "zod";

import { NOT_FOUND, ok, readBody, withAuth } from "@/lib/api";
import { toFlowDetail } from "@/lib/flows";
import { prisma } from "@/lib/prisma";
import { id as randomId, stringifyJson } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth<[Params]>(async (context, _request, { params }) => {
  const { id } = await params;
  const flow = await prisma.flow.findFirst({
    where: { id, workspaceId: context.workspace.id },
  });
  if (!flow) return NOT_FOUND("Flow");
  return ok({ flow: toFlowDetail(flow) });
});

const graphSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      position: z.object({ x: z.number(), y: z.number() }),
      data: z
        .object({
          label: z.string().optional(),
          notes: z.string().optional(),
          config: z.record(z.string(), z.unknown()).optional(),
        })
        .optional(),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      sourceHandle: z.string().nullish(),
      targetHandle: z.string().nullish(),
      label: z.string().optional(),
    }),
  ),
});

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  emoji: z.string().trim().max(40).optional(),
  status: z.enum(["draft", "published", "paused"]).optional(),
  triggerType: z.enum(["manual", "webhook", "schedule", "chat"]).optional(),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  graph: graphSchema.optional(),
  /** Snapshot the graph into the version history. */
  snapshot: z.boolean().optional(),
  snapshotLabel: z.string().trim().max(120).optional(),
});

export const PATCH = withAuth<[Params]>(async (context, request, { params }) => {
  const { id } = await params;
  const body = await readBody(request, patchSchema);
  if (body.error) return body.error;

  const existing = await prisma.flow.findFirst({
    where: { id, workspaceId: context.workspace.id },
  });
  if (!existing) return NOT_FOUND("Flow");

  const patch = body.data;
  const nextVersion = patch.snapshot ? existing.version + 1 : existing.version;

  // Switching to a webhook trigger mints a token the first time.
  let webhookToken = existing.webhookToken;
  if (patch.triggerType === "webhook" && !webhookToken) {
    webhookToken = `whk_${randomId(24)}`;
  }

  const flow = await prisma.flow.update({
    where: { id: existing.id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.triggerType !== undefined ? { triggerType: patch.triggerType, webhookToken } : {}),
      ...(patch.triggerConfig !== undefined ? { triggerConfig: stringifyJson(patch.triggerConfig) } : {}),
      ...(patch.graph !== undefined ? { graph: stringifyJson(patch.graph) } : {}),
      version: nextVersion,
      ...(patch.snapshot && patch.graph
        ? {
            versions: {
              create: {
                version: nextVersion,
                graph: stringifyJson(patch.graph),
                label: patch.snapshotLabel ?? "Manual save",
              },
            },
          }
        : {}),
    },
  });

  return ok({ flow: toFlowDetail(flow) });
});

export const DELETE = withAuth<[Params]>(async (context, _request, { params }) => {
  const { id } = await params;
  const existing = await prisma.flow.findFirst({
    where: { id, workspaceId: context.workspace.id },
    select: { id: true },
  });
  if (!existing) return NOT_FOUND("Flow");

  await prisma.flow.delete({ where: { id: existing.id } });
  return ok({ ok: true });
});
