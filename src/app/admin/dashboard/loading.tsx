import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[var(--radius-md)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-[var(--radius-md)]" />
        <Skeleton className="h-96 rounded-[var(--radius-md)]" />
      </div>
      <Skeleton className="h-72 rounded-[var(--radius-md)]" />
    </div>
  );
}
