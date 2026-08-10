"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------- button

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-500 shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset,0_8px_24px_-12px_rgba(79,70,229,0.9)]",
  secondary: "bg-ink-800 text-ink-100 hover:bg-ink-700 border border-ink-700",
  outline: "border border-ink-600 text-ink-100 hover:bg-ink-800 hover:border-ink-500",
  ghost: "text-ink-200 hover:bg-ink-800 hover:text-ink-100",
  danger: "bg-rose-600/90 text-white hover:bg-rose-600 border border-rose-500/40",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-9.5 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-[15px] gap-2.5 rounded-xl",
  icon: "size-9 rounded-lg justify-center",
};

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: string;
  iconEnd?: string;
  className?: string;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon,
  iconEnd,
  className,
  children,
  disabled,
  ...props
}: ButtonBaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center font-medium transition-all duration-150 select-none",
        "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.985]",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
    >
      {loading ? (
        <Icon name="Loader2" className="animate-spin" size={size === "lg" ? 18 : 15} />
      ) : icon ? (
        <Icon name={icon} size={size === "lg" ? 18 : 15} />
      ) : null}
      {children}
      {iconEnd && !loading ? <Icon name={iconEnd} size={size === "lg" ? 18 : 15} /> : null}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  className,
  children,
  href,
  ...props
}: ButtonBaseProps & { href: string } & Omit<React.ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      href={href}
      {...props}
      className={cn(
        "inline-flex items-center font-medium transition-all duration-150 select-none active:scale-[0.985]",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
    >
      {icon ? <Icon name={icon} size={size === "lg" ? 18 : 15} /> : null}
      {children}
      {iconEnd ? <Icon name={iconEnd} size={size === "lg" ? 18 : 15} /> : null}
    </Link>
  );
}

// ----------------------------------------------------------------- form fields

export function Label({ children, hint, htmlFor }: { children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink-200">
      <span>{children}</span>
      {hint ? <span className="text-[11px] font-normal text-ink-400">{hint}</span> : null}
    </label>
  );
}

const FIELD_BASE =
  "w-full rounded-lg border border-ink-700 bg-ink-900/70 px-3 text-sm text-ink-100 placeholder:text-ink-400 " +
  "transition-colors focus:border-brand-500 focus:bg-ink-900 focus:outline-none disabled:opacity-60";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(FIELD_BASE, "h-9.5", className)} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(FIELD_BASE, "py-2 leading-relaxed resize-y", className)} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          FIELD_BASE,
          "h-9.5 appearance-none pe-9 cursor-pointer [&>option]:bg-ink-900 [&>option]:text-ink-100",
          className,
        )}
      >
        {children}
      </select>
      <Icon
        name="ChevronDown"
        size={15}
        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-400"
      />
    </div>
  );
}

export function Field({
  label,
  hint,
  help,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label ? <Label hint={hint}>{label}</Label> : null}
      {children}
      {help && !error ? <p className="text-[11.5px] leading-relaxed text-ink-400">{help}</p> : null}
      {error ? <p className="text-[11.5px] text-rose-400">{error}</p> : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full border transition-colors",
        checked ? "border-brand-500 bg-brand-600" : "border-ink-600 bg-ink-800",
      )}
    >
      <span
        className={cn(
          "absolute size-4 rounded-full bg-white transition-all duration-200",
          checked ? "start-[22px]" : "start-[3px]",
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------- badges

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-ink-800 text-ink-200 border-ink-600",
  brand: "bg-brand-500/12 text-brand-300 border-brand-500/30",
  success: "bg-emerald-500/12 text-emerald-300 border-emerald-500/30",
  warning: "bg-amber-500/12 text-amber-300 border-amber-500/30",
  danger: "bg-rose-500/12 text-rose-300 border-rose-500/30",
  info: "bg-sky-500/12 text-sky-300 border-sky-500/30",
};

export function Badge({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        BADGE_TONES[tone],
        className,
      )}
    >
      {icon ? <Icon name={icon} size={11} /> : null}
      {children}
    </span>
  );
}

export function StatusDot({ status }: { status: string }) {
  const tone =
    status === "succeeded"
      ? "bg-emerald-400"
      : status === "failed"
        ? "bg-rose-400"
        : status === "running"
          ? "bg-brand-400 animate-pulse-ring"
          : status === "skipped"
            ? "bg-ink-500"
            : "bg-amber-400";
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", tone)} />;
}

// ----------------------------------------------------------------------- cards

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return <As className={cn("panel p-5", className)}>{children}</As>;
}

export function EmptyState({
  icon = "Boxes",
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-700 px-6 py-14 text-center">
      <div className="grid size-11 place-items-center rounded-xl border border-ink-700 bg-ink-850 text-ink-300">
        <Icon name={icon} size={19} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink-100">{title}</p>
        {body ? <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-ink-400">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return <Icon name="Loader2" size={size} className={cn("animate-spin text-ink-300", className)} />;
}

// ---------------------------------------------------------------------- tabs

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string; count?: number; icon?: string }[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex items-center gap-1 border-b border-ink-700", className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative -mb-px inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "text-ink-100 after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand-400"
                : "text-ink-400 hover:text-ink-200",
            )}
          >
            {tab.icon ? <Icon name={tab.icon} size={13} /> : null}
            {tab.label}
            {tab.count != null ? (
              <span className="rounded bg-ink-800 px-1.5 text-[10px] tabular-nums text-ink-300">{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// --------------------------------------------------------------------- modal

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "panel animate-fade-up relative z-10 w-full overflow-hidden bg-ink-900 shadow-2xl",
          widths[width],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-700 px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-[15px] font-semibold text-ink-100">{title}</h2>
            {description ? <p className="text-[12.5px] leading-relaxed text-ink-400">{description}</p> : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <Icon name="X" size={16} />
          </Button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-ink-700 bg-ink-850/60 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ code / copy

export function CopyButton({
  value,
  size = "sm",
  label,
}: {
  value: string;
  size?: ButtonSize;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  return (
    <Button
      variant="ghost"
      size={size}
      icon={copied ? "Check" : "Copy"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          return;
        }
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1600);
      }}
      className={copied ? "text-emerald-300" : undefined}
    >
      {label}
    </Button>
  );
}

export function CodeBlock({
  code,
  language,
  className,
  maxHeight = 320,
}: {
  code: string;
  language?: string;
  className?: string;
  maxHeight?: number;
}) {
  return (
    <div className={cn("group relative overflow-hidden rounded-lg border border-ink-700 bg-ink-950", className)}>
      {language ? (
        <span className="absolute top-2 start-3 text-[10px] font-medium tracking-wide text-ink-500 uppercase">
          {language}
        </span>
      ) : null}
      <div className="absolute top-1.5 end-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton value={code} />
      </div>
      <pre
        className="overflow-auto px-3.5 py-3 text-[12px] leading-relaxed text-ink-200"
        style={{ maxHeight, paddingTop: language ? 22 : undefined }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** Pretty-printed JSON viewer used across the run traces. */
export function JsonView({ value, maxHeight = 280 }: { value: unknown; maxHeight?: number }) {
  const text =
    typeof value === "string"
      ? value
      : (() => {
          try {
            return JSON.stringify(value, null, 2);
          } catch {
            return String(value);
          }
        })();

  if (!text || text === "null" || text === '""') {
    return <p className="px-3 py-2 text-[12px] text-ink-500">—</p>;
  }
  return <CodeBlock code={text} maxHeight={maxHeight} />;
}

// -------------------------------------------------------------------- toasts

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-sky-500/30 bg-sky-500/8 text-sky-200",
    warning: "border-amber-500/30 bg-amber-500/8 text-amber-200",
    danger: "border-rose-500/30 bg-rose-500/8 text-rose-200",
    success: "border-emerald-500/30 bg-emerald-500/8 text-emerald-200",
  };
  const icons = { info: "Info", warning: "AlertTriangle", danger: "AlertTriangle", success: "CheckCircle2" };

  return (
    <div className={cn("flex gap-2.5 rounded-lg border px-3.5 py-2.5 text-[12.5px] leading-relaxed", tones[tone], className)}>
      <Icon name={icons[tone]} size={15} className="mt-px shrink-0" />
      <div className="space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}
