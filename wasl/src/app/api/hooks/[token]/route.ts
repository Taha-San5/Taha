import { after } from "next/server";

import { fail, ok } from "@/lib/api";
import { executeRun } from "@/lib/engine/executor";
import { prisma } from "@/lib/prisma";
import { createRun, RunRejected } from "@/lib/runs";
import { EMPTY_GRAPH, type FlowGraph } from "@/lib/nodes/types";
import { parseJson } from "@/lib/utils";

type Params = { params: Promise<{ token: string }> };

export const maxDuration = 60;

/**
 * Public webhook entry point: POST /api/hooks/<token>
 * The JSON body becomes the flow's trigger inputs.
 */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params;

  const flow = await prisma.flow.findUnique({ where: { webhookToken: token } });
  if (!flow) return fail("Unknown webhook", 404);
  if (flow.status !== "published") {
    return fail("This flow is not published. Publish it to accept webhook calls.", 409);
  }

  // Optional shared secret declared on the trigger node.
  const graph = parseJson<FlowGraph>(flow.graph, EMPTY_GRAPH);
  const trigger = graph.nodes.find((node) => node.type === "trigger.webhook");
  const expectedSecret = trigger?.data?.config?.secret;
  if (typeof expectedSecret === "string" && expectedSecret.trim()) {
    if (request.headers.get("x-wasl-secret") !== expectedSecret.trim()) {
      return fail("Invalid or missing X-Wasl-Secret header", 401);
    }
  }

  let inputs: Record<string, unknown> = {};
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const parsed = await request.json();
      inputs = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : { body: parsed };
    } else if (contentType.includes("form")) {
      inputs = Object.fromEntries((await request.formData()).entries());
    } else {
      const text = await request.text();
      inputs = text ? { body: text } : {};
    }
  } catch {
    inputs = {};
  }

  try {
    const run = await createRun({
      flowId: flow.id,
      workspaceId: flow.workspaceId,
      trigger: "webhook",
      inputs,
    });

    after(async () => {
      try {
        await executeRun(run.id);
      } catch (error) {
        console.error("[webhook run]", run.id, error);
      }
    });

    return ok({ ok: true, runId: run.id, status: "queued" }, { status: 202 });
  } catch (error) {
    if (error instanceof RunRejected) return fail(error.message, error.status);
    throw error;
  }
}

export async function GET() {
  return fail("Send a POST request with a JSON body to trigger this flow.", 405);
}
