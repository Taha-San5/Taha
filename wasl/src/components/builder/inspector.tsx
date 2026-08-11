"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ModelPicker } from "@/components/builder/model-picker";
import { useBuilder } from "@/components/builder/store-context";
import { useI18n } from "@/components/i18n-provider";
import { DEFAULT_MODEL } from "@/lib/models";
import { Icon } from "@/components/icon";
import { Badge, Button, EmptyState, Field, Input, JsonView, Select, Switch, Textarea } from "@/components/ui/kit";
import { typeOf, type BuilderNode } from "@/lib/builder-store";
import { CATEGORY_META, nodeDef, resolveOutputs } from "@/lib/nodes/registry";
import type { NodeField } from "@/lib/nodes/types";
import { cn, toText } from "@/lib/utils";

export interface CredentialOption {
  id: string;
  name: string;
  provider: string;
  hint: string;
}

export function Inspector({ credentials }: { credentials: CredentialOption[] }) {
  const { d, pick, locale } = useI18n();

  const selectedId = useBuilder((state) => state.selectedNodeId);
  const node = useBuilder((state) => state.nodes.find((entry) => entry.id === state.selectedNodeId) ?? null);
  const nodeRun = useBuilder((state) =>
    state.run?.nodeRuns.find((entry) => entry.nodeId === state.selectedNodeId) ?? null,
  );
  const updateConfig = useBuilder((state) => state.updateConfig);
  const updateNode = useBuilder((state) => state.updateNode);
  const deleteNode = useBuilder((state) => state.deleteNode);
  const duplicateNode = useBuilder((state) => state.duplicateNode);
  const references = useUpstreamReferences(selectedId);

  /** The field that last had focus, so reference chips know where to insert. */
  const lastFocused = useRef<{ key: string; element: HTMLTextAreaElement | HTMLInputElement } | null>(null);

  if (!node) {
    return (
      <div className="p-4">
        <EmptyState icon="Settings" title={d.builder.noSelection} body={d.builder.noSelectionBody} />
      </div>
    );
  }

  const type = typeOf(node);
  const definition = nodeDef(type);
  if (!definition) {
    return (
      <div className="p-4">
        <EmptyState icon="AlertTriangle" title={`Unknown node type: ${type}`} />
      </div>
    );
  }

  const meta = CATEGORY_META[definition.category];
  const config = node.data.config ?? {};

  const visibleFields = definition.fields.filter((field) => {
    if (!field.visibleWhen) return true;
    const current = String(config[field.visibleWhen.key] ?? "");
    return field.visibleWhen.values.includes(current);
  });

  // An arrow const rather than a hoisted declaration so `node` stays narrowed.
  const insertReference = (token: string) => {
    const target = lastFocused.current;
    if (!target) return;
    const element = target.element;
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? start;
    const next = `${element.value.slice(0, start)}${token}${element.value.slice(end)}`;
    updateConfig(node.id, target.key, next);
    requestAnimationFrame(() => {
      element.focus();
      const caret = start + token.length;
      element.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* ------------------------------------------------------------ header */}
      <div className="border-b border-ink-800 p-3.5">
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-850",
              meta.text,
            )}
          >
            <Icon name={definition.icon} size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <input
              value={node.data.label ?? ""}
              onChange={(event) => updateNode(node.id, { label: event.target.value })}
              placeholder={pick(definition.label, definition.labelAr)}
              className="w-full truncate bg-transparent text-[14px] font-medium text-ink-100 placeholder:text-ink-300 focus:outline-none"
              aria-label={d.common.rename}
            />
            <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-ink-500">
              <code>{definition.type}</code>
              <span className="text-ink-700">·</span>
              <code>{node.id}</code>
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="icon"
              title={d.builder.duplicateNode}
              aria-label={d.builder.duplicateNode}
              onClick={() => duplicateNode(node.id)}
            >
              <Icon name="Copy" size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title={d.builder.deleteNode}
              aria-label={d.builder.deleteNode}
              className="hover:text-rose-300"
              onClick={() => deleteNode(node.id)}
            >
              <Icon name="Trash2" size={14} />
            </Button>
          </div>
        </div>

        <p className="mt-2.5 text-[12px] leading-relaxed text-ink-400">
          {pick(definition.description, definition.descriptionAr)}
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge tone="neutral">{pick(meta.label, meta.labelAr)}</Badge>
          {definition.fanOut ? (
            <Badge tone="info" icon="Repeat">
              {locale === "ar" ? "توسّع على القوائم" : "fans out over lists"}
            </Badge>
          ) : null}
          {definition.credits > 0 ? (
            <Badge tone="warning">
              {definition.credits} {d.common.credits}
            </Badge>
          ) : (
            <Badge tone="success">{locale === "ar" ? "مجانية" : "free"}</Badge>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ fields */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3.5">
        {visibleFields.map((field) => (
          <FieldEditor
            key={field.key}
            field={field}
            value={config[field.key]}
            credentials={credentials}
            onChange={(value) => updateConfig(node.id, field.key, value)}
            onFocusCapture={(element) => {
              lastFocused.current = { key: field.key, element };
            }}
          />
        ))}

        {references.length > 0 ? (
          <div className="space-y-1.5 rounded-lg border border-ink-800 bg-ink-900/40 p-2.5">
            <p className="text-[11px] font-medium tracking-wide text-ink-400 uppercase">{d.builder.insertReference}</p>
            <p className="text-[10.5px] leading-relaxed text-ink-500">{d.builder.referenceHint}</p>
            <div className="flex flex-wrap gap-1 pt-0.5">
              {references.map((reference) => (
                <button
                  key={reference.token}
                  onClick={() => insertReference(reference.token)}
                  title={reference.description}
                  className="rounded-md border border-ink-700 bg-ink-850 px-1.5 py-1 font-mono text-[10.5px] text-brand-300 transition-colors hover:border-brand-500/50 hover:bg-ink-800"
                >
                  {reference.token}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <Field label={d.builder.nodeNotes}>
          <Textarea
            value={node.data.notes ?? ""}
            onChange={(event) => updateNode(node.id, { notes: event.target.value })}
            rows={2}
            placeholder={locale === "ar" ? "ملاحظة لك أو لفريقك…" : "A note for you or your team…"}
            className="text-[12.5px]"
          />
        </Field>
      </div>

      {/* --------------------------------------------------------- last run */}
      {nodeRun ? (
        <div className="max-h-[42%] shrink-0 overflow-y-auto border-t border-ink-800 bg-ink-900/40 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium tracking-wide text-ink-400 uppercase">{d.builder.output}</p>
            <Badge
              tone={
                nodeRun.status === "succeeded"
                  ? "success"
                  : nodeRun.status === "failed"
                    ? "danger"
                    : nodeRun.status === "running"
                      ? "brand"
                      : "neutral"
              }
            >
              {d.runs.nodeStatus[nodeRun.status] ?? nodeRun.status}
            </Badge>
          </div>

          {nodeRun.error ? (
            <p className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/8 px-2.5 py-2 text-[11.5px] leading-relaxed text-rose-200">
              {nodeRun.error}
            </p>
          ) : null}

          <div className="mt-2">
            <JsonView value={nodeRun.output} maxHeight={180} />
          </div>

          {nodeRun.logs.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-ink-400">
                {d.builder.logs} ({nodeRun.logs.length})
              </summary>
              <pre className="mt-1.5 max-h-32 overflow-auto rounded-lg border border-ink-800 bg-ink-950 px-2.5 py-2 text-[10.5px] leading-relaxed text-ink-300">
                {nodeRun.logs.join("\n")}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// field editors
// ---------------------------------------------------------------------------

function FieldEditor({
  field,
  value,
  credentials,
  onChange,
  onFocusCapture,
}: {
  field: NodeField;
  value: unknown;
  credentials: CredentialOption[];
  onChange: (value: unknown) => void;
  onFocusCapture: (element: HTMLTextAreaElement | HTMLInputElement) => void;
}) {
  const { d, pick, locale } = useI18n();
  const label = pick(field.label, field.labelAr);
  const help = field.help ? pick(field.help, field.helpAr ?? field.help) : undefined;
  const hint = field.required ? d.common.required : undefined;

  switch (field.type) {
    case "textarea":
    case "prompt":
      return (
        <Field label={label} hint={hint} help={help}>
          <Textarea
            value={toText(value)}
            onChange={(event) => onChange(event.target.value)}
            onFocus={(event) => onFocusCapture(event.currentTarget)}
            rows={field.rows ?? 4}
            placeholder={field.placeholder}
            className={cn("text-[12.5px]", field.type === "prompt" && "font-mono")}
            dir={field.type === "prompt" ? "auto" : undefined}
          />
        </Field>
      );

    case "code":
      return (
        <Field label={label} hint="JavaScript" help={help}>
          <Textarea
            value={toText(value)}
            onChange={(event) => onChange(event.target.value)}
            onFocus={(event) => onFocusCapture(event.currentTarget)}
            rows={field.rows ?? 10}
            spellCheck={false}
            dir="ltr"
            className="font-mono text-[12px] leading-relaxed"
          />
        </Field>
      );

    case "number":
      return (
        <Field label={label} hint={hint} help={help}>
          <Input
            type="number"
            value={value == null || value === "" ? "" : Number(value)}
            min={field.min}
            max={field.max}
            step={field.step}
            dir="ltr"
            onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
          />
        </Field>
      );

    case "boolean":
      return (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-ink-800 bg-ink-900/40 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-ink-200">{label}</p>
            {help ? <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{help}</p> : null}
          </div>
          <Switch checked={Boolean(value)} onChange={onChange} label={label} />
        </div>
      );

    case "model":
      return (
        <Field label={label} hint={hint} help={help}>
          <ModelPicker value={toText(value) || DEFAULT_MODEL} onChange={onChange} />
        </Field>
      );

    case "select":
      return (
        <Field label={label} hint={hint} help={help}>
          <Select value={toText(value)} onChange={(event) => onChange(event.target.value)}>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {locale === "ar" && option.labelAr ? option.labelAr : option.label}
              </option>
            ))}
          </Select>
        </Field>
      );

    case "credential":
      return (
        <Field
          label={label}
          hint={hint}
          help={credentials.length === 0 ? undefined : help}
          error={undefined}
        >
          {credentials.length === 0 ? (
            <Link
              href="/app/credentials"
              className="flex items-center gap-2 rounded-lg border border-dashed border-ink-600 px-3 py-2.5 text-[12px] text-ink-400 transition-colors hover:border-brand-500/50 hover:text-ink-200"
            >
              <Icon name="Plus" size={13} />
              {locale === "ar" ? "أضف بيانات اعتماد أولاً" : "Add a credential first"}
            </Link>
          ) : (
            <Select value={toText(value)} onChange={(event) => onChange(event.target.value || undefined)}>
              <option value="">
                {locale === "ar" ? "— استخدم مفتاح المنصّة —" : "— use the platform key —"}
              </option>
              {credentials
                .filter((credential) => !field.provider || credential.provider === field.provider)
                .map((credential) => (
                  <option key={credential.id} value={credential.id}>
                    {credential.name} {credential.hint ? `(${credential.hint})` : ""}
                  </option>
                ))}
            </Select>
          )}
        </Field>
      );

    case "list":
      return <ListEditor field={field} value={value} onChange={onChange} />;

    case "keyvalue":
      return <KeyValueEditor field={field} value={value} onChange={onChange} onFocusCapture={onFocusCapture} />;

    case "json":
      return (
        <Field label={label} hint="JSON" help={help}>
          <Textarea
            value={typeof value === "string" ? value : JSON.stringify(value ?? null, null, 2)}
            onChange={(event) => onChange(event.target.value)}
            rows={field.rows ?? 5}
            dir="ltr"
            className="font-mono text-[12px]"
          />
        </Field>
      );

    default:
      return (
        <Field label={label} hint={hint} help={help}>
          <Input
            value={toText(value)}
            onChange={(event) => onChange(event.target.value)}
            onFocus={(event) => onFocusCapture(event.currentTarget)}
            placeholder={field.placeholder}
          />
        </Field>
      );
  }
}

function ListEditor({
  field,
  value,
  onChange,
}: {
  field: NodeField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { d, pick, locale } = useI18n();
  const items = useMemo(() => (Array.isArray(value) ? value.map((entry) => String(entry)) : []), [value]);

  const update = (index: number, next: string) =>
    onChange(items.map((entry, position) => (position === index ? next : entry)));

  return (
    <Field
      label={pick(field.label, field.labelAr)}
      help={field.help ? pick(field.help, field.helpAr ?? field.help) : undefined}
    >
      <div className="space-y-1.5">
        {items.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <span className="w-4 shrink-0 text-end text-[10.5px] tabular-nums text-ink-600">{index + 1}</span>
            <Input
              value={entry}
              onChange={(event) => update(index, event.target.value)}
              className="h-8 text-[12.5px]"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 hover:text-rose-300"
              aria-label={d.common.delete}
              onClick={() => onChange(items.filter((_, position) => position !== index))}
            >
              <Icon name="X" size={13} />
            </Button>
          </div>
        ))}
        <Button variant="secondary" size="sm" icon="Plus" onClick={() => onChange([...items, ""])}>
          {locale === "ar" ? "أضف" : "Add"}
        </Button>
      </div>
    </Field>
  );
}

function KeyValueEditor({
  field,
  value,
  onChange,
  onFocusCapture,
}: {
  field: NodeField;
  value: unknown;
  onChange: (value: unknown) => void;
  onFocusCapture: (element: HTMLTextAreaElement | HTMLInputElement) => void;
}) {
  const { d, pick, locale } = useI18n();

  const pairs = useMemo(() => {
    if (Array.isArray(value)) {
      return value.map((entry) => {
        const record = (entry ?? {}) as Record<string, unknown>;
        return { key: toText(record.key), value: toText(record.value) };
      });
    }
    return [] as { key: string; value: string }[];
  }, [value]);

  const update = (index: number, patch: Partial<{ key: string; value: string }>) =>
    onChange(pairs.map((pair, position) => (position === index ? { ...pair, ...patch } : pair)));

  return (
    <Field
      label={pick(field.label, field.labelAr)}
      help={field.help ? pick(field.help, field.helpAr ?? field.help) : undefined}
    >
      <div className="space-y-1.5">
        {pairs.map((pair, index) => (
          <div key={index} className="flex items-start gap-1.5">
            <Input
              value={pair.key}
              onChange={(event) => update(index, { key: event.target.value })}
              placeholder={locale === "ar" ? "المفتاح" : "key"}
              className="h-8 w-[38%] font-mono text-[12px]"
              dir="ltr"
            />
            <Input
              value={pair.value}
              onChange={(event) => update(index, { value: event.target.value })}
              onFocus={(event) => onFocusCapture(event.currentTarget)}
              placeholder={locale === "ar" ? "القيمة أو الوصف" : "value or description"}
              className="h-8 flex-1 text-[12px]"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 hover:text-rose-300"
              aria-label={d.common.delete}
              onClick={() => onChange(pairs.filter((_, position) => position !== index))}
            >
              <Icon name="X" size={13} />
            </Button>
          </div>
        ))}
        <Button
          variant="secondary"
          size="sm"
          icon="Plus"
          onClick={() => onChange([...pairs, { key: "", value: "" }])}
        >
          {locale === "ar" ? "أضف صفاً" : "Add row"}
        </Button>
      </div>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// upstream reference discovery
// ---------------------------------------------------------------------------

interface Reference {
  token: string;
  description: string;
}

/**
 * Everything the selected node can legally reference: the trigger's declared
 * inputs, every node that can reach it, plus the run-scoped helpers.
 */
function useUpstreamReferences(nodeId: string | null): Reference[] {
  const nodes = useBuilder((state) => state.nodes);
  const edges = useBuilder((state) => state.edges);
  const { locale } = useI18n();

  return useMemo(() => {
    if (!nodeId) return [];

    const byId = new Map(nodes.map((node) => [node.id, node]));
    const parents = new Map<string, string[]>();
    for (const edge of edges) {
      (parents.get(edge.target) ?? parents.set(edge.target, []).get(edge.target)!).push(edge.source);
    }

    // Walk backwards to collect ancestors.
    const ancestors: string[] = [];
    const seen = new Set<string>([nodeId]);
    const queue = [...(parents.get(nodeId) ?? [])];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (seen.has(current)) continue;
      seen.add(current);
      ancestors.push(current);
      queue.push(...(parents.get(current) ?? []));
    }

    const references: Reference[] = [
      { token: "{{$input}}", description: locale === "ar" ? "القيمة القادمة من العقدة السابقة" : "value from the upstream node" },
    ];

    const trigger = nodes.find((node) => nodeDef(typeOf(node))?.category === "trigger");
    if (trigger) {
      const declared = trigger.data.config?.inputs;
      if (Array.isArray(declared)) {
        for (const name of declared) {
          const key = String(name).trim();
          if (key) {
            references.push({
              token: `{{$trigger.${key}}}`,
              description: locale === "ar" ? "حقل من المشغّل" : "trigger input",
            });
          }
        }
      }
      if (typeOf(trigger) === "trigger.chat") {
        references.push({ token: "{{$trigger.message}}", description: locale === "ar" ? "رسالة المستخدم" : "user message" });
      }
    }

    for (const ancestorId of ancestors) {
      const ancestor = byId.get(ancestorId);
      if (!ancestor) continue;
      const definition = nodeDef(typeOf(ancestor));
      if (!definition) continue;

      references.push({
        token: `{{${ancestorId}}}`,
        description: definition.label,
      });

      // Offer the obvious sub-paths for nodes with object outputs.
      for (const path of SUBPATHS[typeOf(ancestor)] ?? []) {
        references.push({ token: `{{${ancestorId}.${path}}}`, description: `${definition.label} → ${path}` });
      }
    }

    const selected = byId.get(nodeId);
    if (selected && nodeDef(typeOf(selected))?.fanOut) {
      references.push({ token: "{{$item}}", description: locale === "ar" ? "العنصر الحالي" : "current list item" });
      references.push({ token: "{{$index}}", description: locale === "ar" ? "ترتيب العنصر" : "current index" });
    }

    references.push({ token: "{{$today}}", description: locale === "ar" ? "تاريخ اليوم" : "today's date" });

    return references;
  }, [nodeId, nodes, edges, locale]);
}

const SUBPATHS: Record<string, string[]> = {
  "data.scrape": ["text", "title", "url"],
  "data.http": ["status", "body", "headers"],
  "ai.agent": ["answer", "steps"],
  "action.file": ["filename", "content"],
};

/** Re-export so the builder can prefetch the workspace credential list. */
export function useCredentials(): CredentialOption[] {
  const [credentials, setCredentials] = useState<CredentialOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/credentials")
      .then((response) => (response.ok ? response.json() : { credentials: [] }))
      .then((payload) => {
        if (!cancelled) setCredentials(payload.credentials ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return credentials;
}

/** Exposed for the run panel's dead-end warning. */
export function unconnectedOutputs(node: BuilderNode, edges: { source: string; sourceHandle?: string | null }[]) {
  const handles = resolveOutputs(typeOf(node), node.data.config ?? {});
  const used = new Set(edges.filter((edge) => edge.source === node.id).map((edge) => edge.sourceHandle ?? "out"));
  return handles.filter((handle) => !used.has(handle.id));
}
