import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { DebriefButton } from '@/components/DebriefButton';
import { SharePredictionButton } from '@/components/SharePredictionButton';
import { TeamFlag } from '@/components/TeamFlag';
import { pointsBadge } from '@/lib/scoring';
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

      {isFinal && (
        <div className="mt-4 border-t border-white/10 pt-4">
          {prediction.ai_debrief && (
            <div className="mb-3 rounded-3xl border border-sky-400/30 bg-sky-400/10 p-4">
              <p className="text-sm font-bold text-sky-200">AI Debrief</p>
              <p className="mt-2 text-gray-100">{prediction.ai_debrief}</p>
            </div>
          )}
          <DebriefButton predictionId={prediction.id} hasDebrief={Boolean(prediction.ai_debrief)} />
          <SharePredictionButton
            token={prediction.share_token}
            homeTeam={match.home_team.name}
            awayTeam={match.away_team.name}
            homeScore={match.home_score ?? 0}
            awayScore={match.away_score ?? 0}
            predictedHome={prediction.predicted_home_score}
            predictedAway={prediction.predicted_away_score}
            points={prediction.points_awarded}
          />
        </div>
      )}
    </div>
  );
}
