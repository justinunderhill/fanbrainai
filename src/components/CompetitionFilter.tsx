import Link from 'next/link';
import type { Competition } from '@/lib/types';

/**
 * Tabs to scope /matches (and similar pages) to one competition. Only ever
 * shows in-season (is_active) competitions — a finished tournament (e.g. a
 * past World Cup) never appears here once archived, not even in a secondary
 * row, so every tab a fan sees is genuinely running right now. `liveCompetitionIds`
 * adds a pulsing dot to any tab with a match in progress this instant, so
 * "in season" and "live right now" read as two distinct, visible states.
 */
export function CompetitionFilter({
  competitions,
  selectedCode,
  basePath = '/matches',
  allLabel = 'All active',
  liveCompetitionIds,
}: {
  competitions: Competition[];
  selectedCode: string | null;
  basePath?: string;
  allLabel?: string;
  liveCompetitionIds?: Set<string>;
}) {
  const active = competitions.filter((c) => c.is_active);

  return (
    <div className="flex flex-wrap gap-2">
      <FilterTab href={basePath} active={selectedCode === null}>
        {allLabel}
      </FilterTab>
      {active.map((c) => (
        <FilterTab
          key={c.id}
          href={`${basePath}?competition=${c.code}`}
          active={selectedCode === c.code}
          live={liveCompetitionIds?.has(c.id) ?? false}
        >
          {c.name}
        </FilterTab>
      ))}
    </div>
  );
}

function FilterTab({
  href,
  active,
  live = false,
  children,
}: {
  href: string;
  active: boolean;
  live?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition-colors ${
        active
          ? 'bg-emerald-400 text-gray-950 shadow-glow'
          : 'border border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      {children}
      {live && (
        <span
          aria-label="Live now"
          className={`h-2 w-2 shrink-0 animate-pulse rounded-full ${active ? 'bg-gray-950' : 'bg-red-400'}`}
        />
      )}
    </Link>
  );
}
