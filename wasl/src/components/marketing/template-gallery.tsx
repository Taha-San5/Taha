"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { Alert, Badge, Button, EmptyState, Input } from "@/components/ui/kit";
import { CATEGORY_META, nodeDef } from "@/lib/nodes/registry";
import { cn, formatNumber } from "@/lib/utils";

export interface GalleryTemplate {
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: string;
  emoji: string;
  featured: boolean;
  installs: number;
  nodeCount: number;
  nodeTypes: string[];
}

export function TemplateGallery({
  templates,
  signedIn,
}: {
  templates: GalleryTemplate[];
  signedIn: boolean;
}) {
  const { d, pick, locale } = useI18n();
  const router = useRouter();

  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const present = [...new Set(templates.map((template) => template.category))];
    return ["all", ...present];
  }, [templates]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return templates.filter((template) => {
      if (category !== "all" && template.category !== category) return false;
      if (!needle) return true;
      return [template.name, template.nameAr, template.description, template.descriptionAr]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [templates, category, query]);

  const categoryLabel = (value: string) => {
    const map = d.templates.categories as Record<string, string>;
    return map[value] ?? value;
  };

  async function install(slug: string) {
    if (!signedIn) {
      router.push(`/signup?template=${slug}`);
      return;
    }
    setInstalling(slug);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${slug}/install`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Install failed");
      router.push(`/app/flows/${payload.flow.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Install failed");
      setInstalling(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-100 sm:text-4xl">{d.templates.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-300">{d.templates.subtitle}</p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Icon
            name="Search"
            size={14}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={d.common.search}
            className="ps-9"
            aria-label={d.common.search}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((value) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              aria-pressed={category === value}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                category === value
                  ? "border-brand-500/40 bg-brand-500/12 text-brand-200"
                  : "border-ink-700 text-ink-400 hover:border-ink-600 hover:text-ink-200",
              )}
            >
              {categoryLabel(value)}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <Alert tone="danger" className="mt-5">
          {error}
        </Alert>
      ) : null}

      {visible.length === 0 ? (
        <div className="mt-10">
          <EmptyState icon="Search" title={d.common.empty} />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((template) => (
            <article
              key={template.slug}
              id={template.slug}
              className="panel flex scroll-mt-24 flex-col gap-3.5 p-5 transition-colors hover:border-ink-600"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-xl border border-ink-700 bg-ink-850 text-brand-300">
                  <Icon name={template.emoji} size={18} />
                </span>
                <div className="flex items-center gap-1.5">
                  {template.featured ? <Badge tone="brand">★</Badge> : null}
                  <Badge tone="neutral">{categoryLabel(template.category)}</Badge>
                </div>
              </div>

              <div>
                <h2 className="text-[15px] font-semibold text-ink-100">{pick(template.name, template.nameAr)}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">
                  {pick(template.description, template.descriptionAr)}
                </p>
              </div>

              <div className="flex flex-wrap gap-1">
                {template.nodeTypes.slice(0, 5).map((type) => {
                  const definition = nodeDef(type);
                  if (!definition) return null;
                  const meta = CATEGORY_META[definition.category];
                  return (
                    <span
                      key={type}
                      title={pick(definition.label, definition.labelAr)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border border-ink-700 bg-ink-900/60 px-1.5 py-0.5 text-[10.5px]",
                        meta.text,
                      )}
                    >
                      <Icon name={definition.icon} size={10} />
                      {pick(definition.label, definition.labelAr)}
                    </span>
                  );
                })}
                {template.nodeTypes.length > 5 ? (
                  <span className="inline-flex items-center rounded-md border border-ink-700 px-1.5 py-0.5 text-[10.5px] text-ink-400">
                    +{template.nodeTypes.length - 5}
                  </span>
                ) : null}
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink-800 pt-3.5">
                <span className="text-[11.5px] text-ink-500 tabular">
                  {template.nodeCount} {locale === "ar" ? "عقدة" : "nodes"} ·{" "}
                  {formatNumber(template.installs, locale)} {d.templates.installs}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  icon="Plus"
                  loading={installing === template.slug}
                  onClick={() => install(template.slug)}
                >
                  {d.templates.use}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
