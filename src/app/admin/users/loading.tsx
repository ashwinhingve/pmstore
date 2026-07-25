import { Skeleton } from '@/components/ui/skeleton';

export default function UsersLoading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-14 rounded-[var(--radius-md)]" />
      <div className="space-y-px overflow-hidden rounded-[var(--radius-md)] border border-[var(--foil-soft)]">
        <Skeleton className="h-12 rounded-none" />
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-none opacity-70" />
        ))}
      </div>
    </div>
  );
}
