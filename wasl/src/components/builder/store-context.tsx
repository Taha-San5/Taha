"use client";

import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";

import { createBuilderStore, type BuilderStore, type FlowMeta } from "@/lib/builder-store";
import type { FlowGraph } from "@/lib/nodes/types";

const BuilderStoreContext = createContext<BuilderStore | null>(null);

export function BuilderStoreProvider({
  meta,
  graph,
  children,
}: {
  meta: FlowMeta;
  graph: FlowGraph;
  children: React.ReactNode;
}) {
  // One store per mounted flow; never recreated on re-render.
  const storeRef = useRef<BuilderStore | null>(null);
  if (!storeRef.current) storeRef.current = createBuilderStore(meta, graph);

  return <BuilderStoreContext.Provider value={storeRef.current}>{children}</BuilderStoreContext.Provider>;
}

export function useBuilderStoreApi(): BuilderStore {
  const store = useContext(BuilderStoreContext);
  if (!store) throw new Error("useBuilder must be used inside <BuilderStoreProvider>");
  return store;
}

export function useBuilder<T>(selector: (state: ReturnType<BuilderStore["getState"]>) => T): T {
  return useStore(useBuilderStoreApi(), selector);
}
