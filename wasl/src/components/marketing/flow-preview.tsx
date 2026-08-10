"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

interface PreviewNode {
  id: string;
  icon: string;
  accent: string;
  en: string;
  ar: string;
  detail: string;
  column: number;
  row: number;
}

const NODES: PreviewNode[] = [
  { id: "trigger", icon: "Clock", accent: "emerald", en: "Schedule", ar: "مُجدول", detail: "daily 06:00", column: 0, row: 1 },
  { id: "scrape", icon: "FileSearch", accent: "sky", en: "Read web page", ar: "قراءة صفحة", detail: "news.example.com", column: 1, row: 1 },
  { id: "split", icon: "Split", accent: "sky", en: "Split into list", ar: "تقسيم لقائمة", detail: "5 items", column: 2, row: 1 },
  { id: "ai", icon: "Sparkles", accent: "violet", en: "Summarise", ar: "تلخيص", detail: "Arabic · bullets", column: 3, row: 0 },
  { id: "classify", icon: "GitBranch", accent: "violet", en: "Categorise", ar: "تصنيف", detail: "urgent / normal", column: 3, row: 2 },
  { id: "slack", icon: "Send", accent: "rose", en: "Send to Slack", ar: "إرسال إلى Slack", detail: "#daily-digest", column: 4, row: 1 },
];

const EDGES: [string, string][] = [
  ["trigger", "scrape"],
  ["scrape", "split"],
  ["split", "ai"],
  ["split", "classify"],
  ["ai", "slack"],
  ["classify", "slack"],
];

const ACCENTS: Record<string, { dot: string; ring: string; text: string }> = {
  emerald: { dot: "bg-emerald-400", ring: "ring-emerald-500/25", text: "text-emerald-300" },
  sky: { dot: "bg-sky-400", ring: "ring-sky-500/25", text: "text-sky-300" },
  violet: { dot: "bg-violet-400", ring: "ring-violet-500/25", text: "text-violet-300" },
  rose: { dot: "bg-rose-400", ring: "ring-rose-500/25", text: "text-rose-300" },
};

const CELL_W = 168;
const CELL_H = 92;
const NODE_W = 146;
const NODE_H = 56;

/**
 * A decorative, non-interactive mock of the builder canvas. It replays a run so
 * the landing page shows what "live traces" actually look like. Always LTR:
 * graphs read left to right in both locales.
 */
export function FlowPreview({ className }: { className?: string }) {
  const { locale } = useI18n();
  const [step, setStep] = useState(-1);

  useEffect(() => {
    const order = ["trigger", "scrape", "split", "ai", "classify", "slack"];
    let index = -1;
    const timer = setInterval(() => {
      index = index >= order.length ? -1 : index + 1;
      setStep(index);
    }, 900);
    return () => clearInterval(timer);
  }, []);

  const order = ["trigger", "scrape", "split", "ai", "classify", "slack"];
  const activeIndex = step;

  const position = (node: PreviewNode) => ({
    x: node.column * CELL_W + 16,
    y: node.row * CELL_H + 14,
  });

  const width = 5 * CELL_W + 24;
  const height = 3 * CELL_H + 20;

  return (
    <div
      className={cn(
        "panel surface-grid relative overflow-hidden bg-ink-900/60 p-0 shadow-[0_40px_120px_-40px_rgba(79,70,229,0.35)]",
        className,
      )}
      style={{ direction: "ltr" }}
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-ink-700 bg-ink-900/80 px-3.5 py-2.5">
        <span className="size-2 rounded-full bg-rose-400/70" />
        <span className="size-2 rounded-full bg-amber-400/70" />
        <span className="size-2 rounded-full bg-emerald-400/70" />
        <span className="ms-2 text-[11.5px] text-ink-400">
          {locale === "ar" ? "ملخص أخبار يومي إلى Slack" : "Daily news digest to Slack"}
        </span>
        <span className="ms-auto inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[10.5px] font-medium text-brand-300">
          <span className="size-1.5 animate-pulse rounded-full bg-brand-400" />
          {locale === "ar" ? "قيد التشغيل" : "Running"}
        </span>
      </div>

      <div className="relative mx-auto" style={{ width, height, minWidth: width }}>
        <svg className="absolute inset-0 overflow-visible" width={width} height={height}>
          {EDGES.map(([from, to]) => {
            const source = NODES.find((node) => node.id === from)!;
            const target = NODES.find((node) => node.id === to)!;
            const start = position(source);
            const end = position(target);
            const x1 = start.x + NODE_W;
            const y1 = start.y + NODE_H / 2;
            const x2 = end.x;
            const y2 = end.y + NODE_H / 2;
            const midX = (x1 + x2) / 2;

            const done = activeIndex >= order.indexOf(to);
            const flowing = activeIndex === order.indexOf(to);

            return (
              <path
                key={`${from}-${to}`}
                d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                fill="none"
                strokeWidth={flowing ? 2.2 : 1.6}
                className={cn(
                  "transition-all duration-500",
                  flowing
                    ? "stroke-brand-400 [stroke-dasharray:6_6] [animation:wasl-dash_.7s_linear_infinite]"
                    : done
                      ? "stroke-brand-500/55"
                      : "stroke-ink-600",
                )}
              />
            );
          })}
        </svg>

        {NODES.map((node) => {
          const { x, y } = position(node);
          const accent = ACCENTS[node.accent];
          const nodeIndex = order.indexOf(node.id);
          const running = activeIndex === nodeIndex;
          const done = activeIndex > nodeIndex;

          return (
            <div
              key={node.id}
              className={cn(
                "absolute flex items-center gap-2.5 rounded-xl border bg-ink-850/95 px-2.5 py-2 backdrop-blur transition-all duration-300",
                running
                  ? `border-brand-500/70 ring-4 ${accent.ring} scale-[1.03]`
                  : done
                    ? "border-ink-600"
                    : "border-ink-700 opacity-70",
              )}
              style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-900",
                  accent.text,
                )}
              >
                <Icon name={node.icon} size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-medium text-ink-100">
                  {locale === "ar" ? node.ar : node.en}
                </span>
                <span className="block truncate text-[10px] text-ink-500">{node.detail}</span>
              </span>
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full transition-colors",
                  running ? "bg-brand-400" : done ? accent.dot : "bg-ink-600",
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 border-t border-ink-700 bg-ink-900/80 px-3.5 py-2 text-[10.5px] text-ink-500">
        <span className="tabular">
          {locale === "ar" ? "٦ عُقد" : "6 nodes"}
        </span>
        <span className="text-ink-700">·</span>
        <span className="tabular">{locale === "ar" ? "٥ رصيد" : "5 credits"}</span>
        <span className="text-ink-700">·</span>
        <span className="tabular">1.8s</span>
      </div>
    </div>
  );
}
