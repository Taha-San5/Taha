"use client";

import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { ProviderLogo } from "@/components/provider-logos";
import { MODELS, modelSpec, PROVIDER_LABELS, type ModelSpec } from "@/lib/models";
import { cn } from "@/lib/utils";

/**
 * Model selector grouped by provider, with each provider's brand mark.
 *
 * A native <select> cannot render an icon inside an <option>, so this is a
 * listbox: a trigger button plus a popover. Keyboard and screen-reader
 * behaviour is implemented explicitly (roving focus, Enter/Space to choose,
 * Escape to dismiss, aria-activedescendant) rather than inherited.
 */
const LISTBOX_ID = "wasl-model-listbox";

export function ModelPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const { locale, d } = useI18n();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = modelSpec(value);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(Math.max(0, MODELS.findIndex((model) => model.id === selected.id)));
  }, [open, selected.id]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Keep the highlighted row in view while arrowing through the list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex, open]);

  function choose(model: ModelSpec) {
    onChange(model.id);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % MODELS.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + MODELS.length) % MODELS.length);
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(MODELS.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(MODELS[activeIndex]);
        break;
      default:
        break;
    }
  }

  // Provider order follows the catalog so the grouping stays stable.
  const providers = [...new Set(MODELS.map((model) => model.provider))];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={LISTBOX_ID}
        aria-haspopup="listbox"
        aria-label={locale === "ar" ? "اختر الموديل" : "Select model"}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onKeyDown}
        className={cn(
          "flex h-9.5 w-full items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/70 px-2.5 text-start",
          "transition-colors hover:border-ink-600 focus:border-brand-500 focus:outline-none",
          "disabled:pointer-events-none disabled:opacity-60",
          open && "border-brand-500",
        )}
      >
        <ProviderLogo
          provider={selected.provider}
          size={15}
          className={selected.provider === "google" ? undefined : "text-ink-100"}
        />
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink-100">{selected.label}</span>
        <span className="shrink-0 rounded bg-ink-800 px-1.5 py-0.5 text-[10px] tabular-nums text-ink-300">
          {selected.credits} {locale === "ar" ? "رصيد" : "cr"}
        </span>
        <Icon name="ChevronDown" size={14} className={cn("shrink-0 text-ink-400 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="panel absolute z-30 mt-1.5 max-h-[19rem] w-full overflow-y-auto bg-ink-850 p-1 shadow-2xl">
          <ul
            ref={listRef}
            id={LISTBOX_ID}
            role="listbox"
            aria-activedescendant={`model-${MODELS[activeIndex]?.id}`}
          >
            {providers.map((provider) => (
              <li key={provider} role="presentation">
                <p className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-ink-500 uppercase">
                  <ProviderLogo
                    provider={provider}
                    size={11}
                    className={provider === "google" ? undefined : "text-ink-400"}
                  />
                  {PROVIDER_LABELS[provider]}
                </p>
                <ul role="presentation">
                  {MODELS.filter((model) => model.provider === provider).map((model) => {
                    const index = MODELS.indexOf(model);
                    const isSelected = model.id === selected.id;
                    const isActive = index === activeIndex;

                    return (
                      <li key={model.id} role="presentation">
                        <button
                          type="button"
                          id={`model-${model.id}`}
                          data-index={index}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => choose(model)}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={cn(
                            "flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-start transition-colors",
                            isActive ? "bg-ink-800" : "hover:bg-ink-800/60",
                          )}
                        >
                          <ProviderLogo
                            provider={model.provider}
                            size={14}
                            className={cn("mt-0.5 shrink-0", model.provider === "google" ? undefined : "text-ink-200")}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-[12.5px] font-medium text-ink-100">{model.label}</span>
                              {isSelected ? <Icon name="Check" size={11} className="shrink-0 text-brand-400" /> : null}
                            </span>
                            <span className="mt-0.5 block text-[10.5px] leading-relaxed text-ink-500">
                              {locale === "ar" ? model.blurbAr : model.blurb}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-ink-600 tabular">
                              {(model.contextWindow / 1000).toFixed(0)}k · ${model.inputPerM}/${model.outputPerM} per 1M
                            </span>
                          </span>
                          <span className="mt-0.5 shrink-0 rounded bg-ink-900 px-1.5 py-0.5 text-[10px] tabular-nums text-ink-300">
                            {model.credits}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>

          <p className="border-t border-ink-700 px-2 py-1.5 text-[10px] leading-relaxed text-ink-500">
            {locale === "ar"
              ? `الرصيد مشتق من سعر المزوّد. بمفتاحك الخاص = صفر ${d.common.credits}.`
              : "Credits derive from provider list price. On your own key: zero."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
