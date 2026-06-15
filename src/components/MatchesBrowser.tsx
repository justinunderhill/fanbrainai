'use client';

import { useMemo, useState } from 'react';
import { MatchCard } from '@/components/MatchCard';
import type { MatchWithTeams } from '@/lib/types';

type View = 'upcoming' | 'completed';

// Live games rank above not-yet-played ones; final matches are "completed".
function isCompleted(match: MatchWithTeams) {
  return match.status === 'final';
}

/**
 * Client-side match browser with an Upcoming/Completed toggle. As the tournament
 * progresses the finished games pile up, so we default to Upcoming (soonest first,
 * live pinned to the top) and tuck completed matches behind a tab — newest first —
 * so users never have to scroll past results to reach the next fixtures. Falls
 * back to the Completed view automatically once nothing is upcoming.
 */
export function MatchesBrowser({
  matches,
  predictedMatchIds,
}: {
  matches: MatchWithTeams[];
  predictedMatchIds: string[];
}) {
  const predicted = useMemo(() => new Set(predictedMatchIds), [predictedMatchIds]);

  const { upcoming, completed } = useMemo(() => {
    const up: MatchWithTeams[] = [];
    const done: MatchWithTeams[] = [];
    for (const match of matches) (isCompleted(match) ? done : up).push(match);

    up.sort((a, b) => {
      // Live first, then by soonest kickoff.
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;
      return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime();
    });
    // Most-recently-played first.
    done.sort((a, b) => new Date(b.kickoff_time).getTime() - new Date(a.kickoff_time).getTime());

    return { upcoming: up, completed: done };
  }, [matches]);

  const [view, setView] = useState<View>(upcoming.length > 0 ? 'upcoming' : 'completed');

  const shown = view === 'upcoming' ? upcoming : completed;

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        <TabButton active={view === 'upcoming'} count={upcoming.length} onClick={() => setView('upcoming')}>
          Upcoming
        </TabButton>
        <TabButton active={view === 'completed'} count={completed.length} onClick={() => setView('completed')}>
          Completed
        </TabButton>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-gray-400">
          {view === 'upcoming'
            ? 'No upcoming matches right now — check the Completed tab to revisit results.'
            : 'No completed matches yet. Once games finish, you can review them here.'}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((match) => (
            <MatchCard key={match.id} match={match} predicted={predicted.has(match.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
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
    </button>
  );
}
