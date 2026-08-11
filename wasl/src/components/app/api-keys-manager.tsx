"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageBody, PageHeader } from "@/components/app/page-header";
import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { Alert, Badge, Button, CodeBlock, EmptyState, Field, Input, Modal } from "@/components/ui/kit";
import { formatRelative } from "@/lib/utils";

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export function ApiKeysManager({ keys, appUrl }: { keys: KeyRow[]; appUrl: string }) {
  const { d, locale } = useI18n();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? d.common.error);
      setFreshToken(payload.token);
      setName("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : d.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm(d.common.confirmDelete)) return;
    try {
      const response = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error ?? d.common.error);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : d.common.error);
    }
  }

  function close() {
    setOpen(false);
    setFreshToken(null);
    setError(null);
  }

  return (
    <PageBody>
      <PageHeader
        title={d.apiKeys.title}
        subtitle={d.apiKeys.subtitle}
        actions={
          <Button icon="Plus" onClick={() => setOpen(true)}>
            {d.apiKeys.create}
          </Button>
        }
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {keys.length === 0 ? (
        <EmptyState
          icon="Terminal"
          title={d.apiKeys.empty}
          action={
            <Button icon="Plus" onClick={() => setOpen(true)}>
              {d.apiKeys.create}
            </Button>
          }
        />
      ) : (
        <div className="panel divide-y divide-ink-800 overflow-hidden p-0">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-850 text-ink-300">
                <Icon name="Terminal" size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] text-ink-100">{key.name}</span>
                <code className="block truncate text-[11px] text-ink-500">{key.prefix}…</code>
              </span>
              {key.revokedAt ? (
                <Badge tone="danger">{d.apiKeys.revoked}</Badge>
              ) : (
                <span className="hidden text-[11px] text-ink-500 sm:block">
                  {d.apiKeys.lastUsed}:{" "}
                  {key.lastUsedAt ? formatRelative(key.lastUsedAt, locale) : d.apiKeys.never}
                </span>
              )}
              {!key.revokedAt ? (
                <Button variant="ghost" size="sm" className="hover:text-rose-300" onClick={() => revoke(key.id)}>
                  {d.apiKeys.revoke}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="panel space-y-2.5 p-4">
        <h2 className="text-[13.5px] font-semibold text-ink-100">
          {locale === "ar" ? "مثال استخدام" : "Example usage"}
        </h2>
        <CodeBlock
          language="bash"
          code={`curl -X POST ${appUrl}/api/v1/flows/FLOW_ID/run \\
  -H "Authorization: Bearer wsl_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"inputs":{"url":"https://example.com"},"wait":true}'`}
        />
      </div>

      <Modal
        open={open}
        onClose={close}
        title={d.apiKeys.create}
        footer={
          freshToken ? (
            <Button onClick={close}>{d.common.close}</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={close}>
                {d.common.cancel}
              </Button>
              <Button icon="Check" loading={busy} disabled={name.trim().length === 0} onClick={create}>
                {d.common.create}
              </Button>
            </>
          )
        }
      >
        {freshToken ? (
          <div className="space-y-3">
            <Alert tone="warning">{d.apiKeys.onceWarning}</Alert>
            <CodeBlock code={freshToken} />
          </div>
        ) : (
          <Field label={d.apiKeys.name}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={locale === "ar" ? "خدمة الإنتاج" : "Production service"}
              maxLength={80}
            />
          </Field>
        )}
      </Modal>
    </PageBody>
  );
}
