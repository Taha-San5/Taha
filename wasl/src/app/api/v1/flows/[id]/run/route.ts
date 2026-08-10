import { after } from "next/server";

import { authenticateApiKey, fail, ok } from "@/lib/api";
import { executeRun } from "@/lib/engine/executor";
import { toRunView } from "@/lib/flows";
import { prisma } from "@/lib/prisma";
import { createRun, RunRejected } from "@/lib/runs";

type Params = { params: Promise<{ id: string }> };

/** `wait: true` blocks on the run, so ask the host for as long as it allows. */
export const maxDuration = 300;

/**
 * Public REST API.
 *
 *   POST /api/v1/flows/<flowId>/run
 *   Authorization: Bearer wsl_…
 *   { "inputs": { "url": "https://…" }, "wait": true }
 *
 * `wait: true` blocks until the run finishes and returns its outputs, which is
 * the shape most callers want. Otherwise the run id comes back immediately.
 */
export async function POST(request: Request, { params }: Params) {
  const key = await authenticateApiKey(request);
  if (!key) return fail("Provide a valid API key in the Authorization header", 401);

  const { id } = await params;

  let payload: { inputs?: Record<string, unknown>; wait?: boolean } = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      payload = raw as typeof payload;
    }
  } catch {
    payload = {};
  }

  try {
    const run = await createRun({
      flowId: id,
      workspaceId: key.workspaceId,
      trigger: "api",
      inputs: payload.inputs ?? {},
    });

    if (payload.wait) {
      const outcome = await executeRun(run.id);
      const finished = await prisma.run.findUnique({
        where: { id: run.id },
        include: { nodeRuns: { orderBy: { order: "asc" } } },
      });
      return ok(
        {
          runId: run.id,
          status: outcome.status,
          outputs: outcome.outputs,
          error: outcome.error ?? null,
          creditsUsed: outcome.creditsUsed,
          run: finished ? toRunView(finished) : null,
        },
        { status: outcome.status === "succeeded" ? 200 : 422 },
      );
    }

    after(async () => {
      try {
        await executeRun(run.id);
      } catch (error) {
        console.error("[api run]", run.id, error);
      }
    });

    return ok({ runId: run.id, status: "queued" }, { status: 202 });
  } catch (error) {
    if (error instanceof RunRejected) return fail(error.message, error.status);
    throw error;
  }
}
