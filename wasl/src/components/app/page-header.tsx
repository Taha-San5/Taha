export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-800 pb-5">
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-ink-100">{title}</h1>
        {subtitle ? <p className="text-[13px] leading-relaxed text-ink-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function PageBody({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">{children}</div>;
}
