import "server-only";

import type { Flow, NodeRun, Run } from "@prisma/client";

import { estimateNodeCredits } from "@/lib/nodes/executors";
import { nodeDef } from "@/lib/nodes/registry";
import { EMPTY_GRAPH, type FlowGraph, type NodeRunView, type RunView } from "@/lib/nodes/types";
import { parseJson } from "@/lib/utils";

export interface FlowSummary {
  id: string;
  name: string;
  description: string;
  emoji: string;
  status: string;
  triggerType: string;
  nodeCount: number;
  runCount: number;
  lastRunAt: string | null;
  updatedAt: string;
  webhookToken: string | null;
  estimatedCredits: number;
}

export interface FlowDetail extends FlowSummary {
  graph: FlowGraph;
  version: number;
  triggerConfig: Record<string, unknown>;
  createdAt: string;
}

export function toFlowSummary(flow: Flow): FlowSummary {
  const graph = parseJson<FlowGraph>(flow.graph, EMPTY_GRAPH);
  return {
    id: flow.id,
    name: flow.name,
    description: flow.description,
    emoji: flow.emoji,
    status: flow.status,
    triggerType: flow.triggerType,
    nodeCount: graph.nodes.length,
    runCount: flow.runCount,
    lastRunAt: flow.lastRunAt?.toISOString() ?? null,
    updatedAt: flow.updatedAt.toISOString(),
    webhookToken: flow.webhookToken,
    estimatedCredits: estimateGraphCredits(graph),
  };
}

export function toFlowDetail(flow: Flow): FlowDetail {
  const graph = parseJson<FlowGraph>(flow.graph, EMPTY_GRAPH);
  return {
    ...toFlowSummary(flow),
    graph,
    version: flow.version,
    triggerConfig: parseJson<Record<string, unknown>>(flow.triggerConfig, {}),
    createdAt: flow.createdAt.toISOString(),
  };
}

/** Best-effort cost estimate shown in the builder before running. */
export function estimateGraphCredits(graph: FlowGraph): number {
  return graph.nodes.reduce((total, node) => {
    if (!nodeDef(node.type)) return total;
    try {
      return total + estimateNodeCredits(node.type, (node.data?.config ?? {}) as Record<string, unknown>);
    } catch {
      return total;
    }
  }, 0);
}

export function toNodeRunView(nodeRun: NodeRun): NodeRunView {
  return {
    id: nodeRun.id,
    nodeId: nodeRun.nodeId,
    type: nodeRun.type,
    label: nodeRun.label,
    status: nodeRun.status as NodeRunView["status"],
    inputs: parseJson<unknown>(nodeRun.inputs, null),
    output: parseJson<unknown>(nodeRun.output, null),
    logs: parseJson<string[]>(nodeRun.logs, []),
    error: nodeRun.error,
    creditsUsed: nodeRun.creditsUsed,
    durationMs: nodeRun.durationMs,
    order: nodeRun.order,
  };
}

export function toRunView(run: Run & { nodeRuns?: NodeRun[] }): RunView {
  return {
    id: run.id,
    flowId: run.flowId,
    status: run.status as RunView["status"],
    trigger: run.trigger,
    inputs: parseJson<unknown>(run.inputs, {}),
    outputs: parseJson<unknown>(run.outputs, {}),
    error: run.error,
    creditsUsed: run.creditsUsed,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    durationMs: run.durationMs,
    nodeRuns: (run.nodeRuns ?? []).map(toNodeRunView),
  };
}

/** Input field names declared on the flow's trigger node. */
export function triggerInputFields(graph: FlowGraph): string[] {
  const trigger = graph.nodes.find((node) => nodeDef(node.type)?.category === "trigger");
  if (!trigger) return [];
  if (trigger.type === "trigger.chat") return ["message"];
  const declared = trigger.data?.config?.inputs;
  if (Array.isArray(declared)) return declared.map((entry) => String(entry)).filter(Boolean);
  return [];
}
