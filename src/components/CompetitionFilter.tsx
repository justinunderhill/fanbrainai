import Link from 'next/link';
import type { Competition } from '@/lib/types';

/**
 * Tabs to scope /matches to one competition. Defaults to "All active" (every
 * current competition, no query param) so a finished tournament doesn't clutter
 * the main view — archived competitions (is_active = false) are reachable only
 * via the "Past tournaments" row, never mixed into the default tab.
 */
export function CompetitionFilter({
  competitions,
  selectedCode,
  basePath = '/matches',
  allLabel = 'All active',
}: {
  competitions: Competition[];
  selectedCode: string | null;
  basePath?: string;
  allLabel?: string;
}) {
  const active = competitions.filter((c) => c.is_active);
  const archived = competitions.filter((c) => !c.is_active);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <FilterTab href={basePath} active={selectedCode === null}>
          {allLabel}
        </FilterTab>
        {active.map((c) => (
          <FilterTab key={c.id} href={`${basePath}?competition=${c.code}`} active={selectedCode === c.code}>
            {c.name}
          </FilterTab>
        ))}
      </div>
      {archived.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
          <span>Past tournaments:</span>
          {archived.map((c) => (
            <Link
              key={c.id}
              href={`${basePath}?competition=${c.code}`}
              aria-current={selectedCode === c.code ? 'page' : undefined}
              className={`rounded-full border px-3 py-1 transition-colors ${
                selectedCode === c.code
                  ? 'border-emerald-300/60 text-emerald-200'
                  : 'border-white/10 hover:text-white'
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded-xl px-4 py-2 text-sm font-black transition-colors ${
        active
          ? 'bg-emerald-400 text-gray-950 shadow-glow'
          : 'border border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
}
