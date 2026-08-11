import "server-only";

import { validateGraph } from "@/lib/engine/validate";
import { prisma } from "@/lib/prisma";
import { EMPTY_GRAPH, type FlowGraph } from "@/lib/nodes/types";
import { parseJson, stringifyJson } from "@/lib/utils";

export class RunRejected extends Error {
  constructor(
    message: string,
    public status = 400,
    public issues?: unknown,
  ) {
    super(message);
    this.name = "RunRejected";
  }
}

/**
 * Creates a queued run for a flow after validating the graph and the
 * workspace's credit balance. Execution itself is kicked off by the caller
 * (usually inside `after()`) so the HTTP response returns immediately.
 */
export async function createRun(options: {
  flowId: string;
  workspaceId: string;
  userId?: string | null;
  trigger: "manual" | "webhook" | "schedule" | "api" | "chat";
  inputs: Record<string, unknown>;
  /** Use this graph instead of the saved one (unsaved builder state). */
  graphOverride?: FlowGraph;
}) {
  const flow = await prisma.flow.findFirst({
    where: { id: options.flowId, workspaceId: options.workspaceId },
  });
  if (!flow) throw new RunRejected("Flow not found", 404);

  const graph = options.graphOverride ?? parseJson<FlowGraph>(flow.graph, EMPTY_GRAPH);

  const issues = validateGraph(graph);
  const blocking = issues.filter((issue) => issue.level === "error");
  if (blocking.length > 0) {
    throw new RunRejected(blocking[0].message, 422, issues);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: options.workspaceId },
    select: { creditBalance: true },
  });
  if (!workspace || workspace.creditBalance <= 0) {
    throw new RunRejected(
      "Out of credits. Top up, wait for the monthly reset, or attach your own model key so AI nodes run free.",
      402,
    );
  }

  return prisma.run.create({
    data: {
      flowId: flow.id,
      workspaceId: options.workspaceId,
      userId: options.userId ?? null,
      status: "queued",
      trigger: options.trigger,
      inputs: stringifyJson(options.inputs),
      graphSnapshot: stringifyJson(graph),
    },
  });
}
