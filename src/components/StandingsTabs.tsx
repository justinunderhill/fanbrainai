import Link from 'next/link';
import type { Competition } from '@/lib/types';

/**
 * Competition switcher for the league table. Unlike CompetitionFilter
 * (/matches, which can show several competitions' fixtures at once), a table
 * only makes sense for exactly one competition at a time — so this is a plain
 * single-select tab row, active competitions only.
 */
export function StandingsTabs({ competitions, selectedId }: { competitions: Competition[]; selectedId: string }) {
  if (competitions.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {competitions.map((c) => (
        <Link
          key={c.id}
          href={`/table?competition=${c.code}`}
          aria-current={c.id === selectedId ? 'page' : undefined}
          className={`rounded-xl px-4 py-2 text-sm font-black transition-colors ${
            c.id === selectedId
              ? 'bg-emerald-400 text-gray-950 shadow-glow'
              : 'border border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
