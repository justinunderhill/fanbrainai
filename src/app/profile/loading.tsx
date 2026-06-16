import { Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <span className="sr-only">Loading your profile…</span>
      <Skeleton className="h-44 rounded-[2rem]" />
      <Skeleton className="h-20" />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </div>
  );
}
