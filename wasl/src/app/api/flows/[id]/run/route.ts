import { after } from "next/server";
import { z } from "zod";

import { fail, ok, readBody, withAuth } from "@/lib/api";
import { executeRun } from "@/lib/engine/executor";
import { toRunView } from "@/lib/flows";
import { createRun, RunRejected } from "@/lib/runs";
import type { FlowGraph } from "@/lib/nodes/types";

type Params = { params: Promise<{ id: string }> };

/**
 * Serverless hosts kill the function once this elapses, which also kills the
 * `after()` work below. On a container host it is ignored and the engine's own
 * 5-minute ceiling applies instead.
 */
export const maxDuration = 60;

const schema = z.object({
  inputs: z.record(z.string(), z.unknown()).optional(),
  /** Run the canvas as it currently looks, without saving first. */
  graph: z
    .object({
      nodes: z.array(z.record(z.string(), z.unknown())),
      edges: z.array(z.record(z.string(), z.unknown())),
    })
    .optional(),
});

export const POST = withAuth<[Params]>(async (context, request, { params }) => {
  const { id } = await params;
  const body = await readBody(request, schema);
  if (body.error) return body.error;

  try {
    const run = await createRun({
      flowId: id,
      workspaceId: context.workspace.id,
      userId: context.user.id,
      trigger: "manual",
      inputs: body.data.inputs ?? {},
      graphOverride: body.data.graph as FlowGraph | undefined,
    });

    // Execute after the response is flushed so the client can stream progress.
    after(async () => {
      try {
        await executeRun(run.id);
      } catch (error) {
        console.error("[run]", run.id, error);
      }
    });

    return ok({ run: toRunView(run) }, { status: 202 });
  } catch (error) {
    if (error instanceof RunRejected) {
      return fail(error.message, error.status, { issues: error.issues });
    }
    throw error;
  }
});
