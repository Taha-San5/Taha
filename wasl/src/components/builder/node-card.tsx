"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import { useBuilder } from "@/components/builder/store-context";
import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { ProviderLogo } from "@/components/provider-logos";
import type { BuilderNode } from "@/lib/builder-store";
import { DEFAULT_MODEL, modelSpec } from "@/lib/models";
import { CATEGORY_META, nodeDef, resolveInputs, resolveOutputs } from "@/lib/nodes/registry";
import { cn, toText, truncate } from "@/lib/utils";

const STATUS_STYLES: Record<string, { ring: string; badge: string; icon: string }> = {
  running: { ring: "ring-4 ring-brand-500/30 border-brand-500", badge: "bg-brand-500 text-white", icon: "Loader2" },
  succeeded: { ring: "border-emerald-500/60", badge: "bg-emerald-500 text-ink-950", icon: "Check" },
  failed: { ring: "border-rose-500/70", badge: "bg-rose-500 text-white", icon: "X" },
  skipped: { ring: "border-ink-700 opacity-55", badge: "bg-ink-600 text-ink-200", icon: "ChevronRight" },
  pending: { ring: "border-ink-700", badge: "bg-ink-700 text-ink-300", icon: "CircleDot" },
};

/**
 * One canvas node. Shows the node's identity, a one-line summary of its most
 * important setting, and its live run status.
 */
export const WaslNodeCard = memo(function WaslNodeCard({ id, data, selected }: NodeProps<BuilderNode>) {
  const { pick, locale } = useI18n();
  const type = String(data.waslType ?? "");
  const definition = nodeDef(type);

  const status = useBuilder((state) => state.nodeStatus[id]);
  const running = useBuilder((state) => state.running);

  if (!definition) {
    return (
      <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
        Unknown node: {type}
      </div>
    );
  }

  const meta = CATEGORY_META[definition.category];
  const inputs = resolveInputs(type);
  const outputs = resolveOutputs(type, data.config ?? {});
  const statusStyle = status ? STATUS_STYLES[status] : undefined;
  const summary = summarise(type, data.config ?? {}, locale);

  return (
    <div
      className={cn(
        "group relative w-[248px] rounded-xl border bg-ink-850/95 shadow-lg backdrop-blur transition-all duration-150",
        selected ? "border-brand-500 ring-2 ring-brand-500/30" : "border-ink-700 hover:border-ink-600",
        statusStyle?.ring,
      )}
    >
      {/* input handles */}
      {inputs.map((handle, index) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="target"
          position={Position.Left}
          style={{
            top: inputs.length === 1 ? 26 : 22 + index * 18,
            background: "var(--color-ink-400)",
            borderColor: "var(--color-ink-900)",
          }}
          title={handle.label}
        />
      ))}

      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <span
          className={cn(
            "mt-px grid size-7 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-900",
            meta.text,
          )}
        >
          <Icon name={definition.icon} size={14} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] font-medium text-ink-100">
              {data.label || pick(definition.label, definition.labelAr)}
            </span>
            {definition.fanOut ? (
              <Icon name="Repeat" size={10} className="shrink-0 text-ink-500" />
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[10.5px] text-ink-500" title={summary}>
            {summary || definition.type}
          </span>
        </span>

        {/* Which provider this node calls, readable without opening it. */}
        {definition.category === "ai" ? (
          <ProviderLogo
            provider={modelSpec(String((data.config ?? {}).model ?? DEFAULT_MODEL)).provider}
            size={12}
            className="mt-1 shrink-0 text-ink-400"
          />
        ) : null}

        {status ? (
          <span
            className={cn(
              "mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full text-[9px]",
              statusStyle?.badge,
            )}
            title={status}
          >
            <Icon
              name={statusStyle?.icon ?? "CircleDot"}
              size={10}
              className={status === "running" ? "animate-spin" : undefined}
            />
          </span>
        ) : running ? (
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-ink-600" />
        ) : null}
      </div>

      {/*
        Output handles are absolutely positioned at fixed offsets so the edge
        anchors always line up with their labels, whatever the locale.
        Single-output nodes anchor next to the header icon; multi-output nodes
        get one labelled row each.
      */}
      {outputs.length === 1 ? (
        <Handle
          id={outputs[0].id}
          type="source"
          position={Position.Right}
          style={{ top: 26, background: "var(--color-ink-300)", borderColor: "var(--color-ink-900)" }}
          title={outputs[0].label}
        />
      ) : outputs.length > 1 ? (
        <div className="border-t border-ink-700/70 py-1">
          {outputs.map((handle, index) => (
            <div key={handle.id} className="relative flex h-5 items-center justify-end pe-3">
              <span
                className={cn(
                  "text-[9.5px] leading-none",
                  handle.tone === "negative"
                    ? "text-rose-300"
                    : handle.tone === "positive"
                      ? "text-emerald-300"
                      : handle.tone === "muted"
                        ? "text-ink-500"
                        : "text-ink-400",
                )}
              >
                {pick(handle.label, handle.labelAr)}
              </span>
              <Handle
                id={handle.id}
                type="source"
                position={Position.Right}
                style={{
                  top: OUTPUT_ROWS_TOP + index * OUTPUT_ROW_HEIGHT + OUTPUT_ROW_HEIGHT / 2,
                  background: HANDLE_COLORS[handle.tone ?? "default"],
                  borderColor: "var(--color-ink-900)",
                }}
                title={handle.label}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
});

/** Header height + top padding of the outputs block, in px. */
const OUTPUT_ROWS_TOP = 52;
const OUTPUT_ROW_HEIGHT = 20;

const HANDLE_COLORS: Record<string, string> = {
  default: "var(--color-ink-300)",
  positive: "#34d399",
  negative: "#fb7185",
  muted: "var(--color-ink-500)",
};

/** A short, human summary of the node's key setting for the card subtitle. */
function summarise(type: string, config: Record<string, unknown>, locale: string): string {
  const value = (key: string) => toText(config[key]).replace(/\s+/g, " ").trim();

  switch (type) {
    case "trigger.manual": {
      const inputs = Array.isArray(config.inputs) ? config.inputs : [];
      return inputs.length > 0 ? inputs.join(", ") : locale === "ar" ? "بدون مدخلات" : "no inputs";
    }
    case "trigger.schedule":
      return value("interval");
    case "trigger.webhook":
      return "POST /api/hooks/…";
    case "ai.ask":
    case "ai.agent":
      return truncate(value("prompt") || value("goal"), 46);
    case "ai.summarize":
      return `${value("style")} · ${value("language")}`;
    case "ai.classify": {
      const categories = Array.isArray(config.categories) ? config.categories : [];
      return categories.join(" / ");
    }
    case "ai.extract": {
      const schema = Array.isArray(config.schema) ? config.schema : [];
      return schema
        .map((entry) => (entry && typeof entry === "object" ? String((entry as { key?: unknown }).key ?? "") : ""))
        .filter(Boolean)
        .join(", ");
    }
    case "data.http":
      return `${value("method")} ${truncate(value("url"), 34)}`;
    case "data.scrape":
      return truncate(value("url"), 42);
    case "data.json":
      return value("path");
    case "data.split":
      return value("mode");
    case "data.join":
      return value("separator");
    case "data.filter":
      return `${value("path") || "item"} ${value("operator")} ${truncate(value("value"), 16)}`;
    case "data.slice":
      return `${locale === "ar" ? "أول" : "first"} ${value("count")}`;
    case "data.template":
      return truncate(value("template"), 46);
    case "data.code":
      return truncate(value("code").split("\n").find((line) => line.trim() && !line.trim().startsWith("//")) ?? "", 42);
    case "logic.if":
      return `${truncate(value("left"), 18)} ${value("operator")} ${truncate(value("right"), 16)}`;
    case "logic.switch": {
      const cases = Array.isArray(config.cases) ? config.cases : [];
      return cases.join(" / ");
    }
    case "logic.foreach":
      return `max ${value("limit")}`;
    case "logic.delay":
      return `${value("ms")}ms`;
    case "action.slack":
      return truncate(value("text"), 42);
    case "action.webhook":
      return truncate(value("url"), 42);
    case "action.file":
      return `${value("filename")} · ${value("format")}`;
    case "output.result":
      return value("name");
    default:
      return "";
  }
}
