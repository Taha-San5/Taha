"use client";

import { useMemo, useState } from "react";

import { useBuilder } from "@/components/builder/store-context";
import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { Input } from "@/components/ui/kit";
import { CATEGORY_META, CATEGORY_ORDER, NODE_DEFINITIONS } from "@/lib/nodes/registry";
import type { NodeCategory } from "@/lib/nodes/types";
import { cn } from "@/lib/utils";

export function NodePalette() {
  const { d, pick, locale } = useI18n();
  const addNode = useBuilder((state) => state.addNode);

  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<NodeCategory>>(new Set());

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return CATEGORY_ORDER.map((category) => ({
      category,
      nodes: NODE_DEFINITIONS.filter((definition) => {
        if (definition.category !== category) return false;
        if (!needle) return true;
        return [
          definition.label,
          definition.labelAr,
          definition.description,
          definition.descriptionAr,
          definition.type,
          ...(definition.keywords ?? []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      }),
    })).filter((group) => group.nodes.length > 0);
  }, [query]);

  function toggle(category: NodeCategory) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-800 p-3">
        <div className="relative">
          <Icon
            name="Search"
            size={13}
            className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-ink-500"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={d.builder.searchNodes}
            className="h-8 ps-8 text-[12.5px]"
            aria-label={d.builder.searchNodes}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {grouped.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-ink-500">{d.common.empty}</p>
        ) : (
          grouped.map(({ category, nodes }) => {
            const meta = CATEGORY_META[category];
            const isCollapsed = collapsed.has(category) && !query;

            return (
              <section key={category} className="mb-1">
                <button
                  onClick={() => toggle(category)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-ink-900"
                >
                  <span className={cn("size-1.5 rounded-full", meta.color)} />
                  <span className="text-[11px] font-semibold tracking-wide text-ink-300 uppercase">
                    {pick(meta.label, meta.labelAr)}
                  </span>
                  <span className="text-[10px] text-ink-600 tabular-nums">{nodes.length}</span>
                  <Icon
                    name="ChevronDown"
                    size={12}
                    className={cn(
                      "ms-auto text-ink-600 transition-transform",
                      isCollapsed && "-rotate-90 rtl:rotate-90",
                    )}
                  />
                </button>

                {!isCollapsed ? (
                  <div className="mt-0.5 space-y-0.5">
                    {nodes.map((definition) => (
                      <button
                        key={definition.type}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("application/wasl-node", definition.type);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={() => addNode(definition.type)}
                        title={pick(definition.description, definition.descriptionAr)}
                        className="group flex w-full cursor-grab items-start gap-2.5 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-ink-800 active:cursor-grabbing"
                      >
                        <span
                          className={cn(
                            "mt-px grid size-6 shrink-0 place-items-center rounded-md border border-ink-700 bg-ink-900",
                            meta.text,
                          )}
                        >
                          <Icon name={definition.icon} size={12} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] text-ink-200 group-hover:text-ink-100">
                            {pick(definition.label, definition.labelAr)}
                          </span>
                          <span className="block truncate text-[10px] text-ink-500">
                            {pick(definition.description, definition.descriptionAr)}
                          </span>
                        </span>
                        {definition.credits > 0 ? (
                          <span className="mt-1 shrink-0 text-[9.5px] text-amber-400/80 tabular-nums">
                            {definition.credits}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })
        )}
      </div>

      <p className="border-t border-ink-800 px-3 py-2 text-[10.5px] leading-relaxed text-ink-600">
        {locale === "ar" ? "اسحب عقدة إلى اللوحة أو اضغط عليها لإضافتها." : "Drag a node onto the canvas, or click to add."}
      </p>
    </div>
  );
}
