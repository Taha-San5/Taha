import "server-only";

import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { resolveConfig, type ResolveContext } from "@/lib/engine/expressions";
import { topologicalOrder } from "@/lib/engine/validate";
import { type ExecResult } from "@/lib/nodes/executors";
import { getExecutor } from "@/lib/nodes/executors";
import { nodeDef, resolveOutputs } from "@/lib/nodes/registry";
import type { FlowGraph, NodeStatus, WaslEdge, WaslNode } from "@/lib/nodes/types";
import { parseJson, stringifyJson, truncate } from "@/lib/utils";

/** Safety rails so a runaway graph cannot drain credits or hang a worker. */
const LIMITS = {
  maxNodeExecutions: 400,
  maxFanOut: 100,
  runTimeoutMs: 5 * 60 * 1000,
};

interface NodeState {
  status: NodeStatus;
  output?: unknown;
  /** Single output handle taken by a branching node. */
  branch?: string;
  /** Handle -> items, produced when a branching node fans out over a list. */
  branchGroups?: Record<string, unknown[]>;
}

export interface RunOutcome {
  status: "succeeded" | "failed";
  outputs: Record<string, unknown>;
  creditsUsed: number;
  error?: string;
}

/**
 * Executes a queued run to completion.
 *
 * The graph is a DAG: nodes are topologically ordered, then each node runs once
 * (or once per item when it fans out over a list). Every node's inputs, output
 * and logs are persisted as they happen so the UI can stream progress.
 */
export async function executeRun(runId: string): Promise<RunOutcome> {
  const run = await prisma.run.findUnique({ where: { id: runId } });
  if (!run) throw new Error(`Run ${runId} not found`);

  const graph = parseJson<FlowGraph>(run.graphSnapshot, { nodes: [], edges: [] });
  const triggerInputs = parseJson<Record<string, unknown>>(run.inputs, {});
  const deadline = Date.now() + LIMITS.runTimeoutMs;

  await prisma.run.update({
    where: { id: runId },
    data: { status: "running", startedAt: new Date() },
  });

  const credentialCache = new Map<string, string | null>();
  const getCredential = async (credentialId: unknown): Promise<string | null> => {
    if (typeof credentialId !== "string" || !credentialId.trim()) return null;
    if (credentialCache.has(credentialId)) return credentialCache.get(credentialId) ?? null;
    const credential = await prisma.credential.findFirst({
      where: { id: credentialId, workspaceId: run.workspaceId },
    });
    let secret: string | null = null;
    if (credential) {
      try {
        secret = decryptSecret(credential.secretCipher);
      } catch {
        secret = null;
      }
    }
    credentialCache.set(credentialId, secret);
    return secret;
  };

  const nodes = new Map<string, WaslNode>(graph.nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, WaslEdge[]>();
  const outgoing = new Map<string, WaslEdge[]>();
  for (const edge of graph.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) continue;
    (incoming.get(edge.target) ?? incoming.set(edge.target, []).get(edge.target)!).push(edge);
    (outgoing.get(edge.source) ?? outgoing.set(edge.source, []).get(edge.source)!).push(edge);
  }

  const labelToId: Record<string, string> = {};
  for (const node of graph.nodes) {
    const label = node.data?.label ?? nodeDef(node.type)?.label;
    if (label) labelToId[label] = node.id;
  }

  const state = new Map<string, NodeState>();
  const nodeOutputs: Record<string, unknown> = {};
  const outputs: Record<string, unknown> = {};
  let creditsUsed = 0;
  let order = 0;
  let executions = 0;

  const ordered = topologicalOrder(graph, nodes, incoming);
  if (!ordered) {
    return finish(runId, {
      status: "failed",
      outputs: {},
      creditsUsed: 0,
      error: "The flow contains a loop. Remove the circular connection and try again.",
    });
  }

  if (ordered.length === 0) {
    return finish(runId, {
      status: "failed",
      outputs: {},
      creditsUsed: 0,
      error: "This flow has no nodes yet. Add a trigger and at least one action.",
    });
  }

  const edgeValue = (edge: WaslEdge): unknown => {
    const source = state.get(edge.source);
    if (!source) return undefined;
    const handle = edge.sourceHandle || "out";
    if (source.branchGroups) return source.branchGroups[handle];
    return source.output;
  };

  const isEdgeLive = (edge: WaslEdge): boolean => {
    const source = state.get(edge.source);
    if (!source || source.status !== "succeeded") return false;
    const handle = edge.sourceHandle || "out";
    if (source.branchGroups) {
      const group = source.branchGroups[handle];
      return Array.isArray(group) && group.length > 0;
    }
    if (source.branch) return handle === source.branch;
    return true;
  };

  for (const nodeId of ordered) {
    const node = nodes.get(nodeId)!;
    const definition = nodeDef(node.type);
    const incomingEdges = incoming.get(nodeId) ?? [];

    if (!definition) {
      state.set(nodeId, { status: "failed" });
      await recordNodeRun(runId, node, order++, {
        status: "failed",
        error: `Unknown node type "${node.type}"`,
      });
      return finish(runId, {
        status: "failed",
        outputs,
        creditsUsed,
        error: `Unknown node type "${node.type}"`,
      });
    }

    // A node runs only if at least one incoming connection carried a value.
    const liveEdges = incomingEdges.filter(isEdgeLive);
    if (incomingEdges.length > 0 && liveEdges.length === 0) {
      state.set(nodeId, { status: "skipped" });
      await recordNodeRun(runId, node, order++, { status: "skipped" });
      continue;
    }

    const inputsByHandle: Record<string, unknown> = {};
    for (const edge of liveEdges) {
      inputsByHandle[edge.targetHandle || "in"] = edgeValue(edge);
    }
    const primaryInput = liveEdges.length > 0 ? edgeValue(liveEdges[0]) : triggerInputs;

    const baseResolveContext: Omit<ResolveContext, "item" | "index"> = {
      input: primaryInput,
      nodeOutputs,
      trigger: triggerInputs,
      runId,
      labelToId,
    };

    const logs: string[] = [];
    const log = (message: string) => {
      if (logs.length < 200) logs.push(`${new Date().toISOString().slice(11, 23)} ${message}`);
    };

    const nodeRunId = await startNodeRun(runId, node, order++, primaryInput);
    const startedAt = Date.now();

    try {
      if (Date.now() > deadline) throw new Error("Run exceeded the 5 minute time limit");

      const shouldFanOut = definition.fanOut && Array.isArray(primaryInput);
      const executor = getExecutor(node.type);

      let result: ExecResult;

      if (shouldFanOut) {
        const items = (primaryInput as unknown[]).slice(0, LIMITS.maxFanOut);
        if ((primaryInput as unknown[]).length > items.length) {
          log(`Input had ${(primaryInput as unknown[]).length} items; capped at ${LIMITS.maxFanOut}`);
        }
        log(`Running once per item (${items.length})`);

        const perItem: unknown[] = [];
        const groups: Record<string, unknown[]> = {};
        let fanCredits = 0;
        let outputKey: string | undefined;

        for (let index = 0; index < items.length; index += 1) {
          if (Date.now() > deadline) throw new Error("Run exceeded the 5 minute time limit");
          executions += 1;
          if (executions > LIMITS.maxNodeExecutions) {
            throw new Error(`Run exceeded ${LIMITS.maxNodeExecutions} node executions`);
          }

          const item = items[index];
          const resolveContext: ResolveContext = { ...baseResolveContext, input: item, item, index };
          const config = resolveConfig(node.data?.config ?? {}, resolveContext);
          const itemResult = await executor({
            workspaceId: run.workspaceId,
            runId,
            nodeId,
            nodeType: node.type,
            config,
            input: item,
            inputsByHandle: { in: item },
            trigger: triggerInputs,
            item,
            index,
            log: (message) => log(`[${index + 1}] ${message}`),
            getCredential,
          });

          perItem.push(itemResult.output);
          fanCredits += itemResult.credits ?? 0;
          if (itemResult.outputKey) outputKey = itemResult.outputKey;
          if (itemResult.branch) {
            (groups[itemResult.branch] ??= []).push(item);
          }
        }

        result = {
          output: perItem,
          // Base cost is per item so fanning out over 20 pages costs 20x.
          credits: fanCredits + definition.credits * Math.max(0, items.length - 1),
          outputKey,
        };

        state.set(nodeId, {
          status: "succeeded",
          output: perItem,
          ...(Object.keys(groups).length > 0 ? { branchGroups: groups } : {}),
        });
      } else {
        executions += 1;
        if (executions > LIMITS.maxNodeExecutions) {
          throw new Error(`Run exceeded ${LIMITS.maxNodeExecutions} node executions`);
        }

        const resolveContext: ResolveContext = { ...baseResolveContext };
        const config = resolveConfig(node.data?.config ?? {}, resolveContext);
        result = await executor({
          workspaceId: run.workspaceId,
          runId,
          nodeId,
          nodeType: node.type,
          config,
          input: primaryInput,
          inputsByHandle,
          trigger: triggerInputs,
          log,
          getCredential,
        });

        const handles = resolveOutputs(node.type, node.data?.config ?? {});
        // When a node has several outputs but the executor stayed silent, take
        // the first handle (e.g. HTTP success rather than the error branch).
        const branch = result.branch ?? (handles.length > 1 ? handles[0].id : undefined);
        state.set(nodeId, { status: "succeeded", output: result.output, ...(branch ? { branch } : {}) });
      }

      nodeOutputs[nodeId] = result.output;
      creditsUsed += result.credits ?? 0;
      creditsUsed += definition.credits;

      if (result.outputKey) {
        outputs[result.outputKey] = result.output;
      }

      await prisma.nodeRun.update({
        where: { id: nodeRunId },
        data: {
          status: "succeeded",
          output: stringifyJson(result.output),
          logs: stringifyJson(logs),
          creditsUsed: (result.credits ?? 0) + definition.credits,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`Failed: ${message}`);

      // If the node exposes an `error` handle that is wired up, route the
      // failure there instead of killing the whole run.
      const handles = resolveOutputs(node.type, node.data?.config ?? {});
      const hasErrorHandle = handles.some((handle) => handle.id === "error");
      const errorEdgeConnected = (outgoing.get(nodeId) ?? []).some((edge) => (edge.sourceHandle || "out") === "error");

      await prisma.nodeRun.update({
        where: { id: nodeRunId },
        data: {
          status: "failed",
          error: truncate(message, 2000),
          logs: stringifyJson(logs),
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt,
        },
      });

      if (hasErrorHandle && errorEdgeConnected) {
        state.set(nodeId, {
          status: "succeeded",
          output: { error: message },
          branch: "error",
        });
        nodeOutputs[nodeId] = { error: message };
        continue;
      }

      state.set(nodeId, { status: "failed" });
      const label = node.data?.label ?? definition.label;
      return finish(runId, {
        status: "failed",
        outputs,
        creditsUsed,
        error: `${label}: ${message}`,
      });
    }
  }

  // Nothing explicitly marked as output? Fall back to the last node's value.
  if (Object.keys(outputs).length === 0) {
    const lastSucceeded = [...ordered].reverse().find((nodeId) => state.get(nodeId)?.status === "succeeded");
    if (lastSucceeded) outputs.result = state.get(lastSucceeded)?.output ?? null;
  }

  return finish(runId, { status: "succeeded", outputs, creditsUsed });
}

// ---------------------------------------------------------------------------
// persistence helpers
// ---------------------------------------------------------------------------

async function startNodeRun(runId: string, node: WaslNode, order: number, inputs: unknown): Promise<string> {
  const created = await prisma.nodeRun.create({
    data: {
      runId,
      nodeId: node.id,
      type: node.type,
      label: node.data?.label ?? nodeDef(node.type)?.label ?? node.type,
      status: "running",
      inputs: stringifyJson(inputs),
      order,
    },
  });
  return created.id;
}

async function recordNodeRun(
  runId: string,
  node: WaslNode,
  order: number,
  data: { status: NodeStatus; error?: string },
): Promise<void> {
  await prisma.nodeRun.create({
    data: {
      runId,
      nodeId: node.id,
      type: node.type,
      label: node.data?.label ?? nodeDef(node.type)?.label ?? node.type,
      status: data.status,
      error: data.error,
      order,
      finishedAt: new Date(),
      durationMs: 0,
    },
  });
}

async function finish(runId: string, outcome: RunOutcome): Promise<RunOutcome> {
  const run = await prisma.run.findUnique({ where: { id: runId }, select: { startedAt: true, workspaceId: true, flowId: true } });
  const durationMs = run ? Date.now() - run.startedAt.getTime() : null;

  await prisma.run.update({
    where: { id: runId },
    data: {
      status: outcome.status,
      outputs: stringifyJson(outcome.outputs),
      error: outcome.error ? truncate(outcome.error, 2000) : null,
      creditsUsed: outcome.creditsUsed,
      finishedAt: new Date(),
      durationMs,
    },
  });

  if (run) {
    await prisma.flow.update({
      where: { id: run.flowId },
      data: { lastRunAt: new Date(), runCount: { increment: 1 } },
    });

    if (outcome.creditsUsed > 0) {
      const workspace = await prisma.workspace.update({
        where: { id: run.workspaceId },
        data: { creditBalance: { decrement: outcome.creditsUsed } },
      });
      await prisma.creditLedger.create({
        data: {
          workspaceId: run.workspaceId,
          delta: -outcome.creditsUsed,
          reason: "run",
          refId: runId,
          balanceAfter: workspace.creditBalance,
        },
      });
    }
  }

  void durationMs;
  return outcome;
}

// ---------------------------------------------------------------------------
// graph ordering + validation
// ---------------------------------------------------------------------------

// Shared with the browser so the builder surfaces the same issues the engine
// would raise. See lib/engine/validate.ts.
export { buildAdjacency, topologicalOrder, validateGraph, type ValidationIssue } from "@/lib/engine/validate";
