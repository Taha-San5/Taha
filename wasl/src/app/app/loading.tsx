/**
 * Skeleton shown while an app route's data resolves. Mirrors the real layout
 * (header, then a card grid) so the page does not visibly jump when it swaps in.
 */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-end justify-between gap-4 border-b border-ink-800 pb-5">
        <div className="space-y-2.5">
          <div className="skeleton h-6 w-40 rounded-md" />
          <div className="skeleton h-3.5 w-64 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-9 w-32 rounded-lg" />
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>
      </div>

      <div className="skeleton h-9.5 w-full max-w-sm rounded-lg" />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="panel space-y-3.5 p-4">
            <div className="flex items-start gap-3">
              <div className="skeleton size-9 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-3/4 rounded" />
                <div className="skeleton h-3 w-full rounded" />
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
            <div className="skeleton h-3 w-1/2 rounded border-t border-ink-800 pt-3" />
          </div>
        ))}
      </div>

      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
