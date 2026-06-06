import Link from 'next/link';
import type { MatchWithTeams } from '@/lib/types';
import { formatKickoff } from '@/lib/utils';

export function MatchCard({ match }: { match: MatchWithTeams }) {
  const score = match.status === 'final' || match.status === 'live'
    ? `${match.home_score ?? 0} - ${match.away_score ?? 0}`
    : 'vs';

  return (
    <Link href={`/matches/${match.id}`} className="card-gradient block rounded-3xl border border-white/10 p-5 shadow-glow transition hover:-translate-y-0.5 hover:border-emerald-400/50">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
        <span>{match.stage}</span>
        <span className="rounded-full border border-white/10 px-3 py-1">{match.status}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <div className="text-2xl">{match.home_team.emoji_flag}</div>
          <h3 className="font-bold">{match.home_team.name}</h3>
        </div>
        <div className="rounded-2xl bg-white/10 px-4 py-2 text-lg font-black">{score}</div>
        <div className="text-right">
          <div className="text-2xl">{match.away_team.emoji_flag}</div>
          <h3 className="font-bold">{match.away_team.name}</h3>
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-400">{formatKickoff(match.kickoff_time)} · {match.venue ?? 'Venue TBC'}</p>
    </Link>
  );
}
