"use client";

import Link from "next/link";
import { useState } from "react";

import { useBuilder } from "@/components/builder/store-context";
import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { Alert, Badge, Button, Modal, Select, Spinner } from "@/components/ui/kit";
import type { FlowGraph } from "@/lib/nodes/types";
import { cn, formatRelative } from "@/lib/utils";

interface VersionRow {
  id: string;
  version: number;
  label: string;
  createdAt: string;
  nodeCount: number;
}

export function BuilderTopBar({
  paletteOpen,
  panelOpen,
  onTogglePalette,
  onTogglePanel,
}: {
  paletteOpen: boolean;
  panelOpen: boolean;
  onTogglePalette: () => void;
  onTogglePanel: () => void;
}) {
  const { d, locale } = useI18n();
  const flowId = useBuilder((state) => state.id);
  const name = useBuilder((state) => state.name);
  const status = useBuilder((state) => state.status);
  const triggerType = useBuilder((state) => state.triggerType);
  const saveState = useBuilder((state) => state.saveState);
  const setMeta = useBuilder((state) => state.setMeta);
  const tidy = useBuilder((state) => state.tidy);
  const replaceGraph = useBuilder((state) => state.replaceGraph);
  const toGraph = useBuilder((state) => state.toGraph);
  const nodeCount = useBuilder((state) => state.nodes.length);

  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function togglePublish() {
    const next = status === "published" ? "paused" : "published";
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/flows/${flowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? d.common.error);
      setMeta({ status: next, webhookToken: payload.flow?.webhookToken ?? null });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : d.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function saveVersion() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/flows/${flowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graph: toGraph(), snapshot: true, snapshotLabel: "Manual save" }),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? d.common.error);
      setVersions(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : d.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function openVersions() {
    setVersionsOpen(true);
    if (versions) return;
    try {
      const response = await fetch(`/api/flows/${flowId}/versions`);
      const payload = await response.json();
      setVersions(payload.versions ?? []);
    } catch {
      setVersions([]);
    }
  }

  async function restore(version: number) {
    setBusy(true);
    try {
      const response = await fetch(`/api/flows/${flowId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? d.common.error);
      replaceGraph(payload.flow.graph as FlowGraph);
      setVersionsOpen(false);
      setVersions(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : d.common.error);
    } finally {
      setBusy(false);
    }
  }

  const saveLabel =
    saveState === "saving"
      ? d.common.saving
      : saveState === "saved"
        ? d.common.saved
        : saveState === "error"
          ? d.common.error
          : saveState === "dirty"
            ? locale === "ar"
              ? "تغييرات غير محفوظة"
              : "Unsaved changes"
            : "";

  return (
    <>
      <header className="flex h-13 shrink-0 items-center gap-2 border-b border-ink-800 bg-ink-950 px-2.5">
        <Link
          href="/app"
          className="grid size-8 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
          aria-label={d.common.back}
          title={d.common.back}
        >
          <Icon name={locale === "ar" ? "ChevronRight" : "ChevronLeft"} size={17} />
        </Link>

        <input
          value={name}
          onChange={(event) => setMeta({ name: event.target.value })}
          className="min-w-0 max-w-[280px] flex-shrink rounded-lg bg-transparent px-2 py-1.5 text-[14px] font-medium text-ink-100 transition-colors hover:bg-ink-900 focus:bg-ink-900 focus:outline-none"
          aria-label={d.common.rename}
          maxLength={120}
        />

        <Badge tone={status === "published" ? "success" : status === "paused" ? "warning" : "neutral"}>
          {d.app.status[status as keyof typeof d.app.status] ?? status}
        </Badge>

        <span className="hidden items-center gap-1.5 text-[11.5px] text-ink-500 sm:flex">
          {saveState === "saving" ? <Spinner size={11} /> : null}
          {saveState === "saved" ? <Icon name="Check" size={11} className="text-emerald-400" /> : null}
          {saveLabel}
        </span>

        <div className="ms-auto flex items-center gap-1.5">
          <span className="hidden text-[11.5px] text-ink-500 tabular lg:inline">
            {nodeCount} {locale === "ar" ? "عقدة" : "nodes"}
          </span>

          <Select
            value={triggerType}
            onChange={(event) => setMeta({ triggerType: event.target.value })}
            className="h-8 w-auto text-[12px]"
            aria-label={d.builder.triggerTab}
          >
            <option value="manual">manual</option>
            <option value="webhook">webhook</option>
            <option value="schedule">schedule</option>
            <option value="chat">chat</option>
          </Select>

          <Button variant="ghost" size="icon" title={d.builder.autoLayout} onClick={tidy}>
            <Icon name="Maximize2" size={15} />
          </Button>

          <Button variant="ghost" size="icon" title={d.builder.versionHistory} onClick={openVersions}>
            <Icon name="History" size={15} />
          </Button>

          <Button
            variant={status === "published" ? "secondary" : "primary"}
            size="sm"
            icon={status === "published" ? "Pause" : "Rocket"}
            loading={busy}
            onClick={togglePublish}
          >
            {status === "published" ? d.builder.unpublish : d.builder.publish}
          </Button>

          <span className="mx-0.5 h-6 w-px bg-ink-800" />

          <Button
            variant="ghost"
            size="icon"
            title={d.builder.nodeLibrary}
            onClick={onTogglePalette}
            className={cn(!paletteOpen && "text-ink-500")}
          >
            <Icon name="LayoutGrid" size={15} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={d.builder.inspector}
            onClick={onTogglePanel}
            className={cn(!panelOpen && "text-ink-500")}
          >
            <Icon name="Settings" size={15} />
          </Button>
        </div>
      </header>

      {error ? (
        <div className="px-3 pt-2">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      <Modal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        title={d.builder.versionHistory}
        footer={
          <>
            <Button variant="ghost" onClick={() => setVersionsOpen(false)}>
              {d.common.close}
            </Button>
            <Button variant="secondary" icon="Check" loading={busy} onClick={saveVersion}>
              {locale === "ar" ? "احفظ إصداراً الآن" : "Snapshot now"}
            </Button>
          </>
        }
      >
        {versions === null ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : versions.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-ink-500">{d.common.empty}</p>
        ) : (
          <ul className="divide-y divide-ink-800">
            {versions.map((version) => (
              <li key={version.id} className="flex items-center gap-3 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-850 text-[11px] font-semibold tabular-nums text-ink-300">
                  v{version.version}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink-200">{version.label || "—"}</span>
                  <span className="block text-[11px] text-ink-500">
                    {formatRelative(version.createdAt, locale)} · {version.nodeCount}{" "}
                    {locale === "ar" ? "عقدة" : "nodes"}
                  </span>
                </span>
                <Button size="sm" variant="secondary" loading={busy} onClick={() => restore(version.version)}>
                  {d.builder.restoreVersion}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

    </>
  );
}
