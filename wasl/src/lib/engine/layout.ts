import type { FlowGraph, WaslNode } from "@/lib/nodes/types";

const COLUMN_WIDTH = 340;
const ROW_HEIGHT = 190;
const ORIGIN = { x: 80, y: 80 };

/**
 * Layered left-to-right layout. Each node sits one column right of its deepest
 * parent; siblings in a column stack vertically. Deterministic and dependency
 * free, which is all a DAG this size needs.
 */
export function autoLayout(graph: FlowGraph): FlowGraph {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();

  for (const edge of graph.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) continue;
    (parents.get(edge.target) ?? parents.set(edge.target, []).get(edge.target)!).push(edge.source);
    (children.get(edge.source) ?? children.set(edge.source, []).get(edge.source)!).push(edge.target);
  }

  // Longest-path depth, guarded against cycles.
  const depth = new Map<string, number>();
  const visiting = new Set<string>();

  const computeDepth = (nodeId: string): number => {
    const cached = depth.get(nodeId);
    if (cached != null) return cached;
    if (visiting.has(nodeId)) return 0;

    visiting.add(nodeId);
    const incoming = parents.get(nodeId) ?? [];
    const value = incoming.length === 0 ? 0 : Math.max(...incoming.map((parent) => computeDepth(parent) + 1));
    visiting.delete(nodeId);
    depth.set(nodeId, value);
    return value;
  };

  for (const nodeId of nodes.keys()) computeDepth(nodeId);

  // Group by column, keeping the incoming visual order stable.
  const columns = new Map<number, string[]>();
  const ordered = [...graph.nodes].sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0));
  for (const node of ordered) {
    const column = depth.get(node.id) ?? 0;
    (columns.get(column) ?? columns.set(column, []).get(column)!).push(node.id);
  }

  const positioned = new Map<string, { x: number; y: number }>();
  for (const [column, ids] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
    ids.forEach((nodeId, row) => {
      positioned.set(nodeId, {
        x: ORIGIN.x + column * COLUMN_WIDTH,
        y: ORIGIN.y + row * ROW_HEIGHT,
      });
    });
  }

  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: positioned.get(node.id) ?? node.position,
    })),
    edges: graph.edges,
  };
}

/** Where to drop a brand new node so it does not land on top of another. */
export function nextFreeSlot(nodes: WaslNode[]): { x: number; y: number } {
  if (nodes.length === 0) return { ...ORIGIN };
  const rightmost = nodes.reduce((best, node) => (node.position.x > best.position.x ? node : best), nodes[0]);
  return { x: rightmost.position.x + COLUMN_WIDTH, y: rightmost.position.y };
}
