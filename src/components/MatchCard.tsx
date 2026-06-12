import Link from 'next/link';
import { Check, MapPin } from 'lucide-react';
import { TeamFlag } from '@/components/TeamFlag';
import type { MatchWithTeams } from '@/lib/types';
import { formatKickoff } from '@/lib/utils';

export function MatchCard({ match, predicted = false }: { match: MatchWithTeams; predicted?: boolean }) {
  const score = match.status === 'final' || match.status === 'live'
    ? `${match.home_score ?? 0} - ${match.away_score ?? 0}`
    : 'vs';
  const statusClass = match.status === 'live'
    ? 'border-red-300/40 bg-red-400/15 text-red-100'
    : match.status === 'final'
      ? 'border-sky-300/35 bg-sky-400/12 text-sky-100'
      : 'border-amber-300/35 bg-amber-300/12 text-amber-100';

  return (
    <Link href={`/matches/${match.id}`} className="card-gradient card-interactive group relative block overflow-hidden rounded-3xl border border-white/10 p-5 shadow-glow">
      <span className="field-arc pointer-events-none absolute inset-x-5 top-0 h-20 opacity-70" />
      <span className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full border border-white/10 opacity-40" />
      {/* Shine sweep on hover */}
      <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:animate-[shine_0.9s_ease-out] group-hover:opacity-100" />
      <div className="relative mb-4 flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-gray-400">
        <span className="font-bold text-gray-300">{match.stage}</span>
        <span className="flex items-center gap-2">
          {predicted && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2.5 py-1 font-black text-emerald-100">
              <Check size={12} strokeWidth={3} />
              Predicted
            </span>
          )}
          <span className={`rounded-full border px-3 py-1 font-black ${statusClass}`}>{match.status}</span>
        </span>
      </div>
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0">
          <div className="mb-2 transition-transform duration-200 group-hover:scale-110">
            <TeamFlag team={match.home_team} size="md" />
          </div>
          <h3 className="truncate font-black">{match.home_team.name}</h3>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gray-950/60 px-4 py-2 text-lg font-black tabular-nums transition-colors duration-200 group-hover:border-emerald-300/40 group-hover:bg-emerald-400/20 group-hover:text-emerald-100">
          {score}
        </div>
        <div className="min-w-0 text-right">
          <div className="mb-2 ml-auto w-fit transition-transform duration-200 group-hover:scale-110">
            <TeamFlag team={match.away_team} size="md" />
          </div>
          <h3 className="truncate font-black">{match.away_team.name}</h3>
        </div>
      </div>
      <div className="relative mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 pt-4 text-sm text-gray-400">
        <span>{formatKickoff(match.kickoff_time)}</span>
        {match.venue && (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin size={14} className="shrink-0 text-amber-200/80" />
            <span className="truncate">{match.venue}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
