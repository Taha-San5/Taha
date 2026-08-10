"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Inspector, useCredentials } from "@/components/builder/inspector";
import { WaslNodeCard } from "@/components/builder/node-card";
import { NodePalette } from "@/components/builder/node-palette";
import { RunPanel } from "@/components/builder/run-panel";
import { BuilderStoreProvider, useBuilder } from "@/components/builder/store-context";
import { BuilderTopBar } from "@/components/builder/top-bar";
import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/kit";
import { typeOf, type BuilderEdge, type BuilderNode, type FlowMeta } from "@/lib/builder-store";
import { nodeDef } from "@/lib/nodes/registry";
import type { FlowGraph, RunView } from "@/lib/nodes/types";
import { cn } from "@/lib/utils";

const NODE_TYPES: NodeTypes = { wasl: WaslNodeCard };

export function Builder({
  meta,
  graph,
  appUrl,
}: {
  meta: FlowMeta;
  graph: FlowGraph;
  appUrl: string;
}) {
  return (
    <BuilderStoreProvider meta={meta} graph={graph}>
      <ReactFlowProvider>
        <BuilderLayout appUrl={appUrl} />
      </ReactFlowProvider>
    </BuilderStoreProvider>
  );
}

function BuilderLayout({ appUrl }: { appUrl: string }) {
  const { d, locale } = useI18n();
  const credentials = useCredentials();

  const nodes = useBuilder((state) => state.nodes);
  const edges = useBuilder((state) => state.edges);
  const onNodesChange = useBuilder((state) => state.onNodesChange);
  const onEdgesChange = useBuilder((state) => state.onEdgesChange);
  const onConnect = useBuilder((state) => state.onConnect);
  const select = useBuilder((state) => state.select);
  const selectedNodeId = useBuilder((state) => state.selectedNodeId);
  const addNode = useBuilder((state) => state.addNode);
  const deleteNode = useBuilder((state) => state.deleteNode);
  const running = useBuilder((state) => state.running);
  const nodeStatus = useBuilder((state) => state.nodeStatus);

  const [paletteOpen, setPaletteOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const wrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const { startRun } = useRunController();
  const triggerInputs = useTriggerInputs();

  useAutosave();

  // Delete / Backspace removes the selected node (unless typing in a field).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (target?.isContentEditable) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedNodeId) {
        event.preventDefault();
        deleteNode(selectedNodeId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNodeId, deleteNode]);

  // Highlight edges that carried data during the most recent run.
  const decoratedEdges = useMemo<BuilderEdge[]>(
    () =>
      edges.map((edge) => {
        const sourceStatus = nodeStatus[edge.source];
        const targetStatus = nodeStatus[edge.target];
        const live = sourceStatus === "succeeded" && targetStatus === "running";
        const traversed = sourceStatus === "succeeded" && targetStatus === "succeeded";
        return {
          ...edge,
          className: live ? "wasl-edge-active" : undefined,
          animated: live,
          style: traversed
            ? { stroke: "var(--color-brand-500)", strokeWidth: 2 }
            : targetStatus === "skipped"
              ? { stroke: "var(--color-ink-700)", strokeDasharray: "4 4" }
              : undefined,
        };
      }),
    [edges, nodeStatus],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/wasl-node");
      if (!type || !nodeDef(type)) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(type, { x: position.x - 124, y: position.y - 28 });
    },
    [addNode, screenToFlowPosition],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BuilderTopBar
        paletteOpen={paletteOpen}
        panelOpen={panelOpen}
        onTogglePalette={() => setPaletteOpen((value) => !value)}
        onTogglePanel={() => setPanelOpen((value) => !value)}
      />

      <div className="flex min-h-0 flex-1">
        {/* ------------------------------------------------------- palette */}
        <aside
          className={cn(
            "shrink-0 border-e border-ink-800 bg-ink-950 transition-[width] duration-200",
            paletteOpen ? "w-60" : "w-0 overflow-hidden",
          )}
        >
          {paletteOpen ? <NodePalette /> : null}
        </aside>

        {/* -------------------------------------------------------- canvas */}
        <div ref={wrapper} className="relative min-w-0 flex-1">
          <ReactFlow<BuilderNode, BuilderEdge>
            nodes={nodes}
            edges={decoratedEdges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_event, node) => select(node.id)}
            onPaneClick={() => select(null)}
            onDrop={onDrop}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onInit={(instance: ReactFlowInstance<BuilderNode, BuilderEdge>) => {
              window.setTimeout(() => instance.fitView({ padding: 0.25, maxZoom: 1 }), 0);
            }}
            defaultEdgeOptions={{ type: "smoothstep" }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.2}
            maxZoom={1.8}
            fitView
            fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
            deleteKeyCode={null}
            className="bg-ink-950"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--color-ink-700)" />
            <Controls position={locale === "ar" ? "bottom-right" : "bottom-left"} showInteractive={false} />
            <MiniMap
              position={locale === "ar" ? "bottom-left" : "bottom-right"}
              pannable
              zoomable
              maskColor="rgba(6,7,10,0.75)"
              nodeColor={(node) => {
                const definition = nodeDef(typeOf(node as BuilderNode));
                switch (definition?.category) {
                  case "trigger":
                    return "#10b981";
                  case "ai":
                    return "#8b5cf6";
                  case "data":
                    return "#0ea5e9";
                  case "logic":
                    return "#f59e0b";
                  case "action":
                    return "#f43f5e";
                  default:
                    return "#94a3b8";
                }
              }}
            />
          </ReactFlow>

          {nodes.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink-700 bg-ink-950/80 px-8 py-10 text-center backdrop-blur">
                <Icon name="Boxes" size={22} className="text-ink-500" />
                <p className="text-[13px] text-ink-300">
                  {locale === "ar" ? "اللوحة فارغة" : "The canvas is empty"}
                </p>
                <Button size="sm" icon="Plus" onClick={() => addNode("trigger.manual")}>
                  {locale === "ar" ? "أضف مشغّلاً" : "Add a trigger"}
                </Button>
              </div>
            </div>
          ) : null}

          {running ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden">
              <div className="h-full w-1/3 animate-[wasl-shimmer_1.2s_infinite] bg-brand-400" />
            </div>
          ) : null}
        </div>

        {/* ------------------------------------------ inspector + run panel */}
        <aside
          className={cn(
            "flex shrink-0 flex-col border-s border-ink-800 bg-ink-950 transition-[width] duration-200",
            panelOpen ? "w-[352px]" : "w-0 overflow-hidden",
          )}
        >
          {panelOpen ? (
            <>
              <div className="min-h-0 flex-[1.35] overflow-hidden border-b border-ink-800">
                <Inspector credentials={credentials} />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <RunPanel appUrl={appUrl} onStartRun={startRun} triggerInputs={triggerInputs} />
              </div>
            </>
          ) : null}
        </aside>
      </div>

      <p className="sr-only">{d.builder.inspector}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// autosave
// ---------------------------------------------------------------------------

/** Debounced PATCH of the graph + metadata whenever the canvas changes. */
function useAutosave() {
  const revision = useBuilder((state) => state.revision);
  const flowId = useBuilder((state) => state.id);
  const name = useBuilder((state) => state.name);
  const description = useBuilder((state) => state.description);
  const emoji = useBuilder((state) => state.emoji);
  const triggerType = useBuilder((state) => state.triggerType);
  const toGraph = useBuilder((state) => state.toGraph);
  const setSaveState = useBuilder((state) => state.setSaveState);
  const setMeta = useBuilder((state) => state.setMeta);

  const lastSaved = useRef(0);

  useEffect(() => {
    if (revision === 0 || revision === lastSaved.current) return;

    const timer = setTimeout(async () => {
      const target = revision;
      setSaveState("saving");
      try {
        const response = await fetch(`/api/flows/${flowId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            emoji,
            triggerType,
            graph: toGraph(),
          }),
        });
        if (!response.ok) throw new Error("save failed");
        const payload = await response.json();

        lastSaved.current = target;
        setSaveState("saved");

        // A webhook token is minted server-side the first time it is needed.
        if (payload.flow?.webhookToken) {
          setMeta({ webhookToken: payload.flow.webhookToken });
          lastSaved.current = target + 1;
        }
      } catch {
        setSaveState("error");
      }
    }, 900);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  // Warn before leaving with unsaved edits.
  const saveState = useBuilder((state) => state.saveState);
  useEffect(() => {
    if (saveState !== "dirty" && saveState !== "saving") return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);
}

// ---------------------------------------------------------------------------
// run controller
// ---------------------------------------------------------------------------

function useRunController() {
  const flowId = useBuilder((state) => state.id);
  const toGraph = useBuilder((state) => state.toGraph);
  const setRun = useBuilder((state) => state.setRun);
  const setRunning = useBuilder((state) => state.setRunning);
  const source = useRef<EventSource | null>(null);

  useEffect(
    () => () => {
      source.current?.close();
    },
    [],
  );

  const startRun = useCallback(
    async (inputs: Record<string, string>) => {
      source.current?.close();
      setRunning(true);
      setRun(null);

      try {
        const response = await fetch(`/api/flows/${flowId}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inputs, graph: toGraph() }),
        });
        const payload = await response.json();

        if (!response.ok) {
          setRun({
            id: "",
            flowId,
            status: "failed",
            trigger: "manual",
            inputs,
            outputs: {},
            error: payload.error ?? "Run rejected",
            creditsUsed: 0,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: 0,
            nodeRuns: [],
          } satisfies RunView);
          setRunning(false);
          return;
        }

        setRun(payload.run as RunView);

        // Stream progress until the run settles.
        const stream = new EventSource(`/api/runs/${payload.run.id}/stream`);
        source.current = stream;

        stream.addEventListener("progress", (event) => {
          setRun(JSON.parse((event as MessageEvent).data) as RunView);
        });
        stream.addEventListener("done", (event) => {
          setRun(JSON.parse((event as MessageEvent).data) as RunView);
          setRunning(false);
          stream.close();
        });
        stream.addEventListener("error", () => {
          setRunning(false);
          stream.close();
        });
      } catch {
        setRunning(false);
      }
    },
    [flowId, toGraph, setRun, setRunning],
  );

  return { startRun };
}

/** Input names declared on the flow's trigger node. */
function useTriggerInputs(): string[] {
  const nodes = useBuilder((state) => state.nodes);

  return useMemo(() => {
    const trigger = nodes.find((node) => nodeDef(typeOf(node))?.category === "trigger");
    if (!trigger) return [];
    if (typeOf(trigger) === "trigger.chat") return ["message"];
    const declared = trigger.data.config?.inputs;
    if (Array.isArray(declared)) return declared.map((entry) => String(entry)).filter(Boolean);
    return [];
  }, [nodes]);
}
