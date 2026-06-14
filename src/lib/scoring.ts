import { getOutcome } from '@/lib/utils';
import type { MatchWithTeams, Prediction } from '@/lib/types';

export type ScoreInput = {
  predictedHomeScore: number;
  predictedAwayScore: number;
  actualHomeScore: number;
  actualAwayScore: number;
};

export function scorePrediction(input: ScoreInput) {
  const predictedOutcome = getOutcome(input.predictedHomeScore, input.predictedAwayScore);
  const actualOutcome = getOutcome(input.actualHomeScore, input.actualAwayScore);
  const exactScore =
    input.predictedHomeScore === input.actualHomeScore &&
    input.predictedAwayScore === input.actualAwayScore;

  if (exactScore) return 5;
  if (predictedOutcome === actualOutcome) return 3;
  return 0;
}

/** Visual treatment for a settled prediction's points. Shared by My Picks + the results recap. */
export function pointsBadge(points: number) {
  if (points >= 5) return { label: '+5 · Exact score', cls: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200' };
  if (points >= 3) return { label: '+3 · Right result', cls: 'border-amber-400/40 bg-amber-400/15 text-amber-200' };
  return { label: '0 pts', cls: 'border-white/15 bg-white/5 text-gray-400' };
}

/**
 * Prediction streak: a 🔥 "correct calls in a row" stat (the #1 retention mechanic
 * in comparable apps). A pick counts as correct when it banked points (right outcome
 * or exact score). `current` is the trailing run on the most-recently-settled picks;
 * `best` is the longest run anywhere in the settled history.
 *
 * Pure + chronological: settled picks are ordered by kickoff so a later wrong pick
 * resets the current streak. Reused by the results recap and the profile chip.
 */
export function currentStreak(
  settled: { prediction: Pick<Prediction, 'points_awarded'>; match: Pick<MatchWithTeams, 'kickoff_time'> }[],
): { current: number; best: number } {
  const ordered = [...settled].sort(
    (a, b) => new Date(a.match.kickoff_time).getTime() - new Date(b.match.kickoff_time).getTime(),
  );

  let current = 0;
  let best = 0;
  let run = 0;
  for (const { prediction } of ordered) {
    if (prediction.points_awarded > 0) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    current = run;
  }

  return { current, best };
}
