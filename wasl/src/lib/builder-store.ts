"use client";

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { create } from "zustand";

import { autoLayout, nextFreeSlot } from "@/lib/engine/layout";
import { defaultConfig, nodeDef, resolveOutputs } from "@/lib/nodes/registry";
import type { FlowGraph, NodeStatus, RunView, WaslEdge, WaslNode } from "@/lib/nodes/types";
import { id as randomId } from "@/lib/utils";

export type WaslNodeData = Record<string, unknown> & {
  label?: string;
  notes?: string;
  config: Record<string, unknown>;
};

export type BuilderNode = Node<WaslNodeData>;
export type BuilderEdge = Edge;

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export interface FlowMeta {
  id: string;
  name: string;
  description: string;
  emoji: string;
  status: string;
  triggerType: string;
  webhookToken: string | null;
  version: number;
}

interface BuilderState extends FlowMeta {
  nodes: BuilderNode[];
  edges: BuilderEdge[];
  selectedNodeId: string | null;

  saveState: SaveState;
  /** Bumped on every graph mutation so the autosave effect can react. */
  revision: number;

  run: RunView | null;
  running: boolean;
  nodeStatus: Record<string, NodeStatus>;

  // meta -------------------------------------------------------------------
  setMeta: (patch: Partial<FlowMeta>) => void;

  // canvas -----------------------------------------------------------------
  onNodesChange: (changes: NodeChange<BuilderNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (type: string, position?: { x: number; y: number }) => string;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  updateConfig: (nodeId: string, key: string, value: unknown) => void;
  updateNode: (nodeId: string, patch: Partial<WaslNodeData>) => void;
  select: (nodeId: string | null) => void;

  replaceGraph: (graph: FlowGraph) => void;
  tidy: () => void;

  // persistence ------------------------------------------------------------
  setSaveState: (state: SaveState) => void;
  toGraph: () => FlowGraph;

  // runs -------------------------------------------------------------------
  setRun: (run: RunView | null) => void;
  setRunning: (running: boolean) => void;
}

function toBuilderNodes(graph: FlowGraph): BuilderNode[] {
  return graph.nodes.map((node) => ({
    id: node.id,
    type: "wasl",
    position: node.position,
    data: {
      label: node.data?.label,
      notes: node.data?.notes,
      config: node.data?.config ?? {},
      waslType: node.type,
    },
  }));
}

function toBuilderEdges(graph: FlowGraph): BuilderEdge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? "out",
    targetHandle: edge.targetHandle ?? "in",
    type: "smoothstep",
    animated: false,
  }));
}

/** The node's Wasl type is carried in data so React Flow can use one renderer. */
export function typeOf(node: BuilderNode): string {
  return String(node.data.waslType ?? "");
}

export function graphFrom(nodes: BuilderNode[], edges: BuilderEdge[]): FlowGraph {
  const waslNodes: WaslNode[] = nodes.map((node) => ({
    id: node.id,
    type: typeOf(node),
    position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
    data: {
      ...(node.data.label ? { label: node.data.label } : {}),
      ...(node.data.notes ? { notes: node.data.notes } : {}),
      config: node.data.config ?? {},
    },
  }));

  const waslEdges: WaslEdge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? "out",
    targetHandle: edge.targetHandle ?? "in",
  }));

  return { nodes: waslNodes, edges: waslEdges };
}

export function createBuilderStore(meta: FlowMeta, graph: FlowGraph) {
  return create<BuilderState>((set, get) => ({
    ...meta,
    nodes: toBuilderNodes(graph),
    edges: toBuilderEdges(graph),
    selectedNodeId: graph.nodes[0]?.id ?? null,

    saveState: "idle",
    revision: 0,

    run: null,
    running: false,
    nodeStatus: {},

    setMeta: (patch) => set({ ...patch, saveState: "dirty", revision: get().revision + 1 }),

    onNodesChange: (changes) => {
      const meaningful = changes.some(
        (change) =>
          change.type === "remove" ||
          change.type === "add" ||
          (change.type === "position" && change.dragging === false),
      );
      set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes),
        ...(meaningful ? { saveState: "dirty" as SaveState, revision: state.revision + 1 } : {}),
      }));
    },

    onEdgesChange: (changes) => {
      const meaningful = changes.some((change) => change.type === "remove" || change.type === "add");
      set((state) => ({
        edges: applyEdgeChanges(changes, state.edges),
        ...(meaningful ? { saveState: "dirty" as SaveState, revision: state.revision + 1 } : {}),
      }));
    },

    onConnect: (connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) return;
      set((state) => {
        const sourceHandle = connection.sourceHandle ?? "out";
        const targetHandle = connection.targetHandle ?? "in";
        const edgeId = `${connection.source}-${sourceHandle}-${connection.target}-${targetHandle}`;
        if (state.edges.some((edge) => edge.id === edgeId)) return state;

        return {
          edges: addEdge(
            {
              ...connection,
              id: edgeId,
              sourceHandle,
              targetHandle,
              type: "smoothstep",
            },
            state.edges,
          ),
          saveState: "dirty",
          revision: state.revision + 1,
        };
      });
    },

    addNode: (type, position) => {
      const definition = nodeDef(type);
      if (!definition) return "";
      const short = type.split(".")[1] ?? type;
      const nodeId = `${short}-${randomId(5)}`;

      set((state) => ({
        nodes: [
          ...state.nodes,
          {
            id: nodeId,
            type: "wasl",
            position: position ?? nextFreeSlot(graphFrom(state.nodes, state.edges).nodes),
            data: { config: defaultConfig(type), waslType: type },
          },
        ],
        selectedNodeId: nodeId,
        saveState: "dirty",
        revision: state.revision + 1,
      }));

      return nodeId;
    },

    deleteNode: (nodeId) =>
      set((state) => ({
        nodes: state.nodes.filter((node) => node.id !== nodeId),
        edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        saveState: "dirty",
        revision: state.revision + 1,
      })),

    duplicateNode: (nodeId) =>
      set((state) => {
        const source = state.nodes.find((node) => node.id === nodeId);
        if (!source) return state;
        const type = typeOf(source);
        const short = type.split(".")[1] ?? type;
        const copyId = `${short}-${randomId(5)}`;
        return {
          nodes: [
            ...state.nodes,
            {
              ...source,
              id: copyId,
              position: { x: source.position.x + 40, y: source.position.y + 60 },
              selected: false,
              data: {
                ...source.data,
                config: structuredClone(source.data.config ?? {}),
              },
            },
          ],
          selectedNodeId: copyId,
          saveState: "dirty",
          revision: state.revision + 1,
        };
      }),

    updateConfig: (nodeId, key, value) =>
      set((state) => {
        const nodes = state.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, config: { ...(node.data.config ?? {}), [key]: value } } }
            : node,
        );

        // Changing the cases of a branching node can orphan edges on handles
        // that no longer exist, so prune them here.
        const changed = nodes.find((node) => node.id === nodeId);
        let edges = state.edges;
        if (changed) {
          const valid = new Set(resolveOutputs(typeOf(changed), changed.data.config ?? {}).map((handle) => handle.id));
          edges = state.edges.filter(
            (edge) => edge.source !== nodeId || valid.has(edge.sourceHandle ?? "out"),
          );
        }

        return { nodes, edges, saveState: "dirty", revision: state.revision + 1 };
      }),

    updateNode: (nodeId, patch) =>
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node,
        ),
        saveState: "dirty",
        revision: state.revision + 1,
      })),

    select: (nodeId) => set({ selectedNodeId: nodeId }),

    replaceGraph: (next) =>
      set((state) => ({
        nodes: toBuilderNodes(next),
        edges: toBuilderEdges(next),
        selectedNodeId: next.nodes[0]?.id ?? null,
        saveState: "dirty",
        revision: state.revision + 1,
        run: null,
        nodeStatus: {},
      })),

    tidy: () =>
      set((state) => {
        const laid = autoLayout(graphFrom(state.nodes, state.edges));
        const positions = new Map(laid.nodes.map((node) => [node.id, node.position]));
        return {
          nodes: state.nodes.map((node) => ({ ...node, position: positions.get(node.id) ?? node.position })),
          saveState: "dirty",
          revision: state.revision + 1,
        };
      }),

    setSaveState: (saveState) => set({ saveState }),

    toGraph: () => graphFrom(get().nodes, get().edges),

    setRun: (run) =>
      set({
        run,
        nodeStatus: run
          ? Object.fromEntries(run.nodeRuns.map((nodeRun) => [nodeRun.nodeId, nodeRun.status]))
          : {},
      }),

    setRunning: (running) => set({ running }),
  }));
}

export type BuilderStore = ReturnType<typeof createBuilderStore>;
