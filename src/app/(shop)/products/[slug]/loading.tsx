/**
 * Product page skeleton — matches the final layout (image + info, then the
 * pharma panel) so there's no layout shift. A skeleton, not a spinner (CLS).
 */
export default function ProductLoading() {
  return (
    <div className="container mx-auto animate-pulse px-4 py-8" aria-hidden="true">
      <div className="h-4 w-64 rounded bg-[var(--foil-soft)]" />

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="aspect-square rounded-[var(--radius-md)] bg-[var(--foil-soft)]" />
        <div className="space-y-4">
          <div className="h-8 w-3/4 rounded bg-[var(--foil-soft)]" />
          <div className="h-4 w-1/3 rounded bg-[var(--foil-soft)]" />
          <div className="h-10 w-1/2 rounded bg-[var(--foil-soft)]" />
          <div className="h-24 w-full rounded bg-[var(--foil-soft)]" />
          <div className="h-11 w-full rounded bg-[var(--foil-soft)]" />
        </div>
      </div>

      <div className="mt-10 grid gap-8 rounded-[var(--radius-md)] bg-[var(--paper-card)] p-5 lg:grid-cols-3">
        <div className="space-y-3">
          <div className="h-6 w-28 rounded bg-[var(--foil-soft)]" />
          <div className="h-4 w-40 rounded bg-[var(--foil-soft)]" />
          <div className="h-10 w-32 rounded bg-[var(--foil-soft)]" />
        </div>
        <div className="lg:col-span-2">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 w-32 shrink-0 rounded-[var(--radius-sm)] bg-[var(--foil-soft)]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
