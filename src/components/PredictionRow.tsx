import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { TeamFlag } from '@/components/TeamFlag';
import type { MatchWithTeams, Prediction, PredictionStyle } from '@/lib/types';
import { formatKickoff } from '@/lib/utils';

const STYLE_LABELS: Record<PredictionStyle, string> = {
  head: 'Head says',
  heart: 'Heart says',
  chaos: 'Chaos pick',
  underdog: 'Underdog pick',
  tactical: 'Tactical pick',
  vibes: 'Vibes only',
};

function pointsBadge(points: number) {
  if (points >= 5) return { label: '+5 · Exact score', cls: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200' };
  if (points >= 3) return { label: '+3 · Right result', cls: 'border-amber-400/40 bg-amber-400/15 text-amber-200' };
  return { label: '0 pts', cls: 'border-white/15 bg-white/5 text-gray-400' };
}

export function PredictionRow({
  prediction,
  match,
  editable,
}: {
  prediction: Prediction;
  match: MatchWithTeams;
  editable: boolean;
}) {
  const isFinal = match.status === 'final';
  const badge = isFinal ? pointsBadge(prediction.points_awarded) : null;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
        <span>{match.stage}</span>
        <span className="rounded-full border border-white/10 px-3 py-1">{match.status}</span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0">
          <TeamFlag team={match.home_team} size="sm" />
          <h3 className="truncate font-bold">{match.home_team.name}</h3>
        </div>
        <div className="text-center">
          {isFinal ? (
            <div className="rounded-2xl bg-white/10 px-4 py-2 text-lg font-black tabular-nums">
              {match.home_score ?? 0} – {match.away_score ?? 0}
            </div>
          ) : (
            <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-gray-300">vs</div>
          )}
        </div>
        <div className="min-w-0 text-right">
          <div className="ml-auto w-fit">
            <TeamFlag team={match.away_team} size="sm" />
          </div>
          <h3 className="truncate font-bold">{match.away_team.name}</h3>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">{formatKickoff(match.kickoff_time)}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Your pick</p>
          <p className="text-2xl font-black tabular-nums text-emerald-300">
            {prediction.predicted_home_score} – {prediction.predicted_away_score}
          </p>
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-bold text-gray-200">
          {STYLE_LABELS[prediction.prediction_style]}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {badge && (
            <span className={`rounded-full border px-3 py-1 text-sm font-bold ${badge.cls}`}>{badge.label}</span>
          )}
          {editable ? (
            <Link href={`/matches/${match.id}`} className="btn btn-ghost px-4 py-2 text-sm">
              <Pencil size={15} /> Edit
            </Link>
          ) : (
            <Link href={`/matches/${match.id}`} className="nav-link text-sm text-gray-400">
              View
            </Link>
          )}
        </div>
      </div>

      {prediction.user_reason && (
        <p className="mt-3 text-sm text-gray-400">&ldquo;{prediction.user_reason}&rdquo;</p>
      )}
    </div>
  );
}
