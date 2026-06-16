import { Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <span className="sr-only">Loading your picks…</span>
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-3 h-5 w-72 max-w-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
