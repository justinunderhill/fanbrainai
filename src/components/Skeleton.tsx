/** Pulsing placeholder block for route-level loading states. Purely decorative. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} aria-hidden />;
}
