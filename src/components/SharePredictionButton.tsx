'use client';

import { CollapsibleShare } from '@/components/CollapsibleShare';
import { pointsBadge } from '@/lib/scoring';

/**
 * Compact share affordance for a single settled prediction. Links to the public
 * /r/[token] card. Used in My Picks rows and the results recap.
 */
export function SharePredictionButton({
  token,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  predictedHome,
  predictedAway,
  points,
}: {
  token: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  predictedHome: number;
  predictedAway: number;
  points: number;
}) {
  const result = `${homeTeam} ${homeScore}–${awayScore} ${awayTeam}`;
  const verb = points >= 5 ? 'nailed' : points >= 3 ? 'called' : 'predicted';
  const brag =
    points >= 5
      ? `I nailed the exact score: ${result} (${predictedHome}–${predictedAway}) on FanBrain ⚽`
      : points >= 3
        ? `Called it right — ${result} on FanBrain ⚽`
        : `My take on ${result} — rated by FanBrain ⚽`;

  return (
    <CollapsibleShare
      className="mt-3"
      buttonLabel="Share this result"
      path={`/r/${token}`}
      title={`I ${verb} it on FanBrain`}
      heading="Share this result"
      blurb={`${pointsBadge(points).label} · an unlisted card of your call.`}
      shareText={brag}
    />
  );
}
