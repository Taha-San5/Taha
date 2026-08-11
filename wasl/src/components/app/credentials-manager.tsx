"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageBody, PageHeader } from "@/components/app/page-header";
import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { Alert, Badge, Button, EmptyState, Field, Input, Modal, Select } from "@/components/ui/kit";
import { formatRelative } from "@/lib/utils";

interface CredentialRow {
  id: string;
  name: string;
  provider: string;
  hint: string;
  createdAt: string;
}

const PROVIDER_ICONS: Record<string, string> = {
  openai: "Sparkles",
  slack: "Send",
  http: "Globe",
  other: "Key",
};

export function CredentialsManager({
  credentials,
  platformKeyAvailable,
}: {
  credentials: CredentialRow[];
  platformKeyAvailable: boolean;
}) {
  const { d, locale } = useI18n();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("openai");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, provider, secret }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? d.common.error);
      setOpen(false);
      setName("");
      setSecret("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : d.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(d.common.confirmDelete)) return;
    setError(null);
    try {
      const response = await fetch(`/api/credentials/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error ?? d.common.error);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : d.common.error);
    }
  }

  const providerLabel = (value: string) =>
    (d.credentials.providers as Record<string, string>)[value] ?? value;

  const hasModelKey = credentials.some((credential) => credential.provider === "openai");

  return (
    <PageBody>
      <PageHeader
        title={d.credentials.title}
        subtitle={d.credentials.subtitle}
        actions={
          <Button icon="Plus" onClick={() => setOpen(true)}>
            {d.credentials.add}
          </Button>
        }
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {!hasModelKey ? (
        <Alert
          tone={platformKeyAvailable ? "info" : "warning"}
          title={
            platformKeyAvailable
              ? locale === "ar"
                ? "تستخدم حالياً مفتاح المنصّة"
                : "Currently using the platform key"
              : locale === "ar"
                ? "لا يوجد مفتاح موديل"
                : "No model key available"
          }
        >
          {platformKeyAvailable
            ? locale === "ar"
              ? "استدعاءات الموديل تُخصم من رصيدك. أضف مفتاحك الخاص هنا ليصبح استهلاك الموديل مجانياً."
              : "Model calls draw down your credits. Add your own key here and model usage becomes free."
            : locale === "ar"
              ? "عُقد الذكاء الاصطناعي تعيد مخرجات محاكاة. أضف مفتاحاً متوافقاً مع OpenAI للتشغيل الحقيقي."
              : "AI nodes return simulated output. Add an OpenAI-compatible key to run for real."}
        </Alert>
      ) : null}

      {credentials.length === 0 ? (
        <EmptyState
          icon="Key"
          title={d.credentials.empty}
          action={
            <Button icon="Plus" onClick={() => setOpen(true)}>
              {d.credentials.add}
            </Button>
          }
        />
      ) : (
        <div className="panel divide-y divide-ink-800 overflow-hidden p-0">
          {credentials.map((credential) => (
            <div key={credential.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-850 text-ink-300">
                <Icon name={PROVIDER_ICONS[credential.provider] ?? "Key"} size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] text-ink-100">{credential.name}</span>
                <span className="block truncate text-[11px] text-ink-500">
                  {providerLabel(credential.provider)}
                  {credential.hint ? ` · ${credential.hint}` : ""}
                </span>
              </span>
              <Badge tone={credential.provider === "openai" ? "success" : "neutral"}>{credential.provider}</Badge>
              <span className="hidden w-24 shrink-0 text-end text-[11px] text-ink-500 sm:block">
                {formatRelative(credential.createdAt, locale)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="hover:text-rose-300"
                aria-label={d.common.delete}
                onClick={() => remove(credential.id)}
              >
                <Icon name="Trash2" size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="panel space-y-2 p-4">
        <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-100">
          <Icon name="ShieldCheck" size={14} className="text-emerald-400" />
          {locale === "ar" ? "كيف تُحفظ الأسرار" : "How secrets are stored"}
        </h2>
        <p className="text-[12.5px] leading-relaxed text-ink-400">
          {locale === "ar"
            ? "كل سر يُشفَّر بمعيار AES-256-GCM بمفتاح مشتق من ENCRYPTION_KEY قبل كتابته في قاعدة البيانات. لا يُعاد السر كاملاً إلى المتصفح أبداً — تظهر لك بصمة مختصرة فقط، ويُفَك التشفير على السيرفر لحظة التنفيذ."
            : "Every secret is encrypted with AES-256-GCM using a key derived from ENCRYPTION_KEY before it touches the database. The full secret is never returned to the browser — you only ever see a short fingerprint, and decryption happens server-side at execution time."}
        </p>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={d.credentials.add}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {d.common.cancel}
            </Button>
            <Button
              icon="Check"
              loading={busy}
              disabled={name.trim().length === 0 || secret.trim().length < 4}
              onClick={create}
            >
              {d.common.save}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={d.credentials.provider}>
            <Select value={provider} onChange={(event) => setProvider(event.target.value)}>
              {["openai", "slack", "http", "other"].map((value) => (
                <option key={value} value={value}>
                  {providerLabel(value)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={d.credentials.name}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={d.credentials.namePlaceholder}
              maxLength={80}
            />
          </Field>

          <Field
            label={d.credentials.secret}
            help={
              provider === "openai"
                ? locale === "ar"
                  ? "أي مفتاح متوافق مع OpenAI (OpenAI، Groq، Together، OpenRouter، Ollama…)."
                  : "Any OpenAI-compatible key (OpenAI, Groq, Together, OpenRouter, Ollama…)."
                : provider === "slack"
                  ? locale === "ar"
                    ? "الصق رابط الويب هوك الوارد من Slack كاملاً."
                    : "Paste the full Slack incoming-webhook URL."
                  : undefined
            }
          >
            <Input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder={d.credentials.secretPlaceholder}
              dir="ltr"
              autoComplete="off"
            />
          </Field>

          {error ? <Alert tone="danger">{error}</Alert> : null}
        </div>
      </Modal>
    </PageBody>
  );
}
