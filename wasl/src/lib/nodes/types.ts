/**
 * Node type system. This module is imported by both the browser (palette,
 * inspector, canvas) and the server (execution engine), so it must stay free of
 * node-only imports.
 */

export type NodeCategory = "trigger" | "ai" | "data" | "logic" | "action" | "output";

export type FieldType =
  | "text"
  | "textarea"
  | "prompt"
  | "number"
  | "boolean"
  | "select"
  | "code"
  | "json"
  | "keyvalue"
  | "list"
  | "credential"
  | "model";

export interface FieldOption {
  value: string;
  label: string;
  labelAr?: string;
}

export interface NodeField {
  key: string;
  label: string;
  labelAr: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  helpAr?: string;
  options?: FieldOption[];
  default?: unknown;
  required?: boolean;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  /** Only show this field when another field has one of these values. */
  visibleWhen?: { key: string; values: string[] };
  /** Restrict credential picker to a provider. */
  provider?: string;
}

export interface HandleSpec {
  id: string;
  label: string;
  labelAr: string;
  /** Rendered in a warm colour for "false"/error style branches. */
  tone?: "default" | "positive" | "negative" | "muted";
}

export interface NodeDefinition {
  type: string;
  category: NodeCategory;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  /** lucide-react icon name, resolved through components/icon.tsx */
  icon: string;
  inputs: HandleSpec[];
  outputs: HandleSpec[];
  fields: NodeField[];
  /** Base credit cost per execution (AI nodes add model cost on top). */
  credits: number;
  /**
   * When true and the primary input resolves to an array, the node runs once
   * per item and returns an array. This is how Wasl expresses loops without an
   * explicit subgraph — the same model Gumloop uses.
   */
  fanOut: boolean;
  /** Terminal nodes contribute to the run's `outputs` payload. */
  terminal?: boolean;
  /** Docs-facing example of the node's output shape. */
  outputShape?: string;
  keywords?: string[];
}

export interface WaslNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label?: string;
    config: Record<string, unknown>;
    notes?: string;
  };
}

export interface WaslEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
}

export interface FlowGraph {
  nodes: WaslNode[];
  edges: WaslEdge[];
}

export const EMPTY_GRAPH: FlowGraph = { nodes: [], edges: [] };

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type NodeStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

export interface NodeRunView {
  id: string;
  nodeId: string;
  type: string;
  label: string;
  status: NodeStatus;
  inputs: unknown;
  output: unknown;
  logs: string[];
  error: string | null;
  creditsUsed: number;
  durationMs: number | null;
  order: number;
}

export interface RunView {
  id: string;
  flowId: string;
  status: RunStatus;
  trigger: string;
  inputs: unknown;
  outputs: unknown;
  error: string | null;
  creditsUsed: number;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  nodeRuns: NodeRunView[];
}

/** Signal returned by branching nodes to tell the engine which edge is live. */
export const BRANCH_KEY = "__waslBranch";

export interface BranchResult {
  [BRANCH_KEY]: string;
  value: unknown;
}

export function isBranchResult(value: unknown): value is BranchResult {
  return (
    typeof value === "object" &&
    value !== null &&
    BRANCH_KEY in value &&
    typeof (value as Record<string, unknown>)[BRANCH_KEY] === "string"
  );
}

export function unwrapBranch(value: unknown): unknown {
  return isBranchResult(value) ? value.value : value;
}
