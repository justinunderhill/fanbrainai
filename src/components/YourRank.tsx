'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { getServerSnapshot, getSnapshot, persist, subscribe } from '@/lib/recap-store';

export function YourRank({
  rank,
  totalPoints,
  displayName,
}: {
  rank: number | null;
  totalPoints: number;
  displayName: string;
}) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const delta = rank != null && stored.lastRank != null ? stored.lastRank - rank : null;

  // Anchor future comparisons to this viewing; keep seenIds intact.
  useEffect(() => {
    if (rank != null && stored.lastRank !== rank) {
      persist({ ...stored, lastRank: rank });
    }
  }, [rank, stored]);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl border border-emerald-400/25 bg-emerald-400/[0.06] px-5 py-4">
      <span className="text-sm font-bold uppercase tracking-wide text-emerald-200">{displayName}</span>
      {rank != null ? (
        <span className="text-lg font-black text-white">You&apos;re #{rank}</span>
      ) : (
        <span className="text-lg font-black text-white">Not ranked yet</span>
      )}
      <span className="text-sm text-gray-300">
        <span className="font-black tabular-nums text-emerald-300">{totalPoints}</span> pts
      </span>
      {delta != null && delta !== 0 && (
        <span className={`inline-flex items-center gap-1 text-sm font-bold ${delta > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
          {delta > 0 ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
          {Math.abs(delta)} since you last checked
        </span>
      )}
      {delta === 0 && (
        <span className="inline-flex items-center gap-1 text-sm text-gray-400">
          <Minus size={15} /> holding steady
        </span>
      )}
    </div>
  );
}
