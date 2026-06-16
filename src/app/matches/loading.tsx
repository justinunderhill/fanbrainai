import { Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <span className="sr-only">Loading matches…</span>
      <div>
        <Skeleton className="h-9 w-44" />
        <Skeleton className="mt-3 h-5 w-80 max-w-full" />
      </div>
      <Skeleton className="h-20" />
      <Skeleton className="h-11 w-60" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
