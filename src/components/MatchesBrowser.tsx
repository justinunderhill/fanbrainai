import Link from 'next/link';
import { MatchCard } from '@/components/MatchCard';
import type { MatchWithTeams } from '@/lib/types';

type View = 'upcoming' | 'completed';

/**
 * Upcoming/Completed toggle for the match grid. The page above already fetches
 * only the matches for the active tab (server-filtered by status), so this
 * component just renders what it's given — switching tabs is a real navigation
 * (?view=), not a client-side filter over an already-downloaded full season.
 */
export function MatchesBrowser({
  matches,
  predictedMatchIds,
  view,
  upcomingCount,
  completedCount,
  competitionCode,
}: {
  matches: MatchWithTeams[];
  predictedMatchIds: string[];
  view: View;
  upcomingCount: number;
  completedCount: number;
  competitionCode: string | null;
}) {
  const predicted = new Set(predictedMatchIds);

  function href(nextView: View) {
    const params = new URLSearchParams();
    if (competitionCode) params.set('competition', competitionCode);
    if (nextView === 'completed') params.set('view', 'completed');
    const query = params.toString();
    return query ? `/matches?${query}` : '/matches';
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        <TabLink href={href('upcoming')} active={view === 'upcoming'} count={upcomingCount}>
          Upcoming
        </TabLink>
        <TabLink href={href('completed')} active={view === 'completed'} count={completedCount}>
          Completed
        </TabLink>
      </div>

      {matches.length === 0 ? (
        <p className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-gray-400">
          {view === 'upcoming'
            ? 'No upcoming matches right now — check the Completed tab to revisit results.'
            : 'No completed matches yet. Once games finish, you can review them here.'}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} predicted={predicted.has(match.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition-colors ${
        active ? 'bg-emerald-400 text-gray-950 shadow-glow' : 'text-gray-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      {children}
      <span
        className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
          active ? 'bg-gray-950/20 text-gray-950' : 'bg-white/10 text-gray-400'
        }`}
      >
        {count}
      </span>
    </Link>
  );
}
