import Link from 'next/link';
import type { MatchWithTeams } from '@/lib/types';
import { formatKickoff } from '@/lib/utils';

export function MatchCard({ match }: { match: MatchWithTeams }) {
  const score = match.status === 'final' || match.status === 'live'
    ? `${match.home_score ?? 0} - ${match.away_score ?? 0}`
    : 'vs';

  return (
    <Link href={`/matches/${match.id}`} className="card-gradient card-interactive group relative block overflow-hidden rounded-3xl border border-white/10 p-5 shadow-glow">
      {/* Shine sweep on hover */}
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:animate-[shine_0.9s_ease-out] group-hover:opacity-100" />
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
        <span>{match.stage}</span>
        <span className="rounded-full border border-white/10 px-3 py-1">{match.status}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <div className="text-2xl transition-transform duration-200 group-hover:scale-110">{match.home_team.emoji_flag}</div>
          <h3 className="font-bold">{match.home_team.name}</h3>
        </div>
        <div className="rounded-2xl bg-white/10 px-4 py-2 text-lg font-black transition-colors duration-200 group-hover:bg-emerald-400/20 group-hover:text-emerald-200">{score}</div>
        <div className="text-right">
          <div className="text-2xl transition-transform duration-200 group-hover:scale-110">{match.away_team.emoji_flag}</div>
          <h3 className="font-bold">{match.away_team.name}</h3>
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-400">{formatKickoff(match.kickoff_time)} · {match.venue ?? 'Venue TBC'}</p>
    </Link>
  );
}
