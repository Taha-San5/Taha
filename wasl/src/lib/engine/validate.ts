import { nodeDef } from "@/lib/nodes/registry";
import type { FlowGraph, WaslEdge, WaslNode } from "@/lib/nodes/types";

/**
 * Graph ordering and static validation. Deliberately free of server-only
 * imports so the builder can show the exact same issues the engine would raise,
 * before a run is even started.
 */

/** Kahn's algorithm. Returns null when the graph contains a cycle. */
export function topologicalOrder(
  graph: FlowGraph,
  nodes: Map<string, WaslNode>,
  incoming: Map<string, WaslEdge[]>,
): string[] | null {
  const indegree = new Map<string, number>();
  for (const nodeId of nodes.keys()) {
    indegree.set(nodeId, (incoming.get(nodeId) ?? []).length);
  }

  // Deterministic ordering: left-to-right, then top-to-bottom.
  const ready = [...nodes.values()]
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .sort(byPosition)
    .map((node) => node.id);

  const outgoing = new Map<string, WaslEdge[]>();
  for (const edge of graph.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) continue;
    (outgoing.get(edge.source) ?? outgoing.set(edge.source, []).get(edge.source)!).push(edge);
  }

  const result: string[] = [];
  while (ready.length > 0) {
    const nodeId = ready.shift()!;
    result.push(nodeId);
    for (const edge of outgoing.get(nodeId) ?? []) {
      const remaining = (indegree.get(edge.target) ?? 0) - 1;
      indegree.set(edge.target, remaining);
      if (remaining === 0) {
        ready.push(edge.target);
        ready.sort((a, b) => byPosition(nodes.get(a)!, nodes.get(b)!));
      }
    }
  }

  return result.length === nodes.size ? result : null;
}

function byPosition(a: WaslNode, b: WaslNode): number {
  const ax = a.position?.x ?? 0;
  const bx = b.position?.x ?? 0;
  if (ax !== bx) return ax - bx;
  return (a.position?.y ?? 0) - (b.position?.y ?? 0);
}

export function buildAdjacency(graph: FlowGraph) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, WaslEdge[]>();
  const outgoing = new Map<string, WaslEdge[]>();

  for (const edge of graph.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) continue;
    (incoming.get(edge.target) ?? incoming.set(edge.target, []).get(edge.target)!).push(edge);
    (outgoing.get(edge.source) ?? outgoing.set(edge.source, []).get(edge.source)!).push(edge);
  }

  return { nodes, incoming, outgoing };
}

export interface ValidationIssue {
  nodeId?: string;
  level: "error" | "warning";
  message: string;
  messageAr: string;
}

export function validateGraph(graph: FlowGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (graph.nodes.length === 0) {
    issues.push({
      level: "error",
      message: "Add a trigger to get started.",
      messageAr: "أضف مشغّلاً للبدء.",
    });
    return issues;
  }

  const { nodes, incoming } = buildAdjacency(graph);

  const triggers = graph.nodes.filter((node) => nodeDef(node.type)?.category === "trigger");
  if (triggers.length === 0) {
    issues.push({
      level: "error",
      message: "This flow has no trigger node.",
      messageAr: "لا يوجد مشغّل في سير العمل.",
    });
  }
  if (triggers.length > 1) {
    issues.push({
      level: "warning",
      message: "Multiple triggers found — only the first will supply inputs.",
      messageAr: "توجد أكثر من عقدة مشغّل — الأولى فقط ستوفّر المدخلات.",
    });
  }

  if (!topologicalOrder(graph, nodes, incoming)) {
    issues.push({
      level: "error",
      message: "The connections form a loop.",
      messageAr: "الوصلات تُشكّل حلقة مغلقة.",
    });
  }

  for (const node of graph.nodes) {
    const definition = nodeDef(node.type);
    const label = node.data?.label;

    if (!definition) {
      issues.push({
        nodeId: node.id,
        level: "error",
        message: `Unknown node type "${node.type}".`,
        messageAr: `نوع عقدة غير معروف "${node.type}".`,
      });
      continue;
    }

    if (definition.category !== "trigger" && (incoming.get(node.id) ?? []).length === 0) {
      issues.push({
        nodeId: node.id,
        level: "warning",
        message: `"${label ?? definition.label}" is not connected to anything upstream.`,
        messageAr: `"${label ?? definition.labelAr}" غير موصولة بأي عقدة سابقة.`,
      });
    }

    // Delivery nodes still run without a credential, but in preview mode —
    // surface that so nobody thinks a message actually went out.
    if (node.type === "action.slack" && !node.data?.config?.credentialId) {
      issues.push({
        nodeId: node.id,
        level: "warning",
        message: `"${label ?? definition.label}" has no Slack credential, so it will preview the message instead of sending it.`,
        messageAr: `"${label ?? definition.labelAr}" بدون بيانات اعتماد Slack، لذا ستعرض الرسالة بدل إرسالها.`,
      });
    }

    for (const field of definition.fields) {
      if (!field.required) continue;
      if (field.visibleWhen) {
        const current = String(node.data?.config?.[field.visibleWhen.key] ?? "");
        if (!field.visibleWhen.values.includes(current)) continue;
      }
      const value = node.data?.config?.[field.key];
      const empty = value == null || value === "" || (Array.isArray(value) && value.length === 0);
      if (empty) {
        issues.push({
          nodeId: node.id,
          level: "error",
          message: `"${label ?? definition.label}" needs ${field.label}.`,
          messageAr: `"${label ?? definition.labelAr}" تحتاج ${field.labelAr}.`,
        });
      }
    }
  }

  return issues;
}
