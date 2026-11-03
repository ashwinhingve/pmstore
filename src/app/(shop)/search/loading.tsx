import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for the search results route while the Server Component runs the
 * query. Matches the final layout (header line + card grid) so there's no
 * layout shift when results arrive — spinners hurt CLS (components/CLAUDE.md).
 */
export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-[1600px] xl:w-4/5 px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="mb-2 h-7 w-56" />
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-sm)]"
          >
            <Skeleton className="aspect-square rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
