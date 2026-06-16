import { Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <span className="sr-only">Loading leaderboard…</span>
      <Skeleton className="h-44 rounded-[2rem]" />
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-3xl" />
    </div>
  );
}
