import { getOutcome } from '@/lib/utils';
import type { MatchWithTeams, Prediction } from '@/lib/types';

export type ScoreInput = {
  predictedHomeScore: number;
  predictedAwayScore: number;
  actualHomeScore: number;
  actualAwayScore: number;
  /**
   * The side that actually advanced, for knockout matches level after 90'/ET and
   * decided on penalties. When set, it overrides the scoreline-derived outcome so a
   * fan who called the advancing team banks the "right result" tier even though the
   * full-time scoreline reads as a draw. Left undefined/null for genuine draws (the
   * sync only knows a winner when football-data reports one — group draws stay draws).
   */
  actualWinnerSide?: 'HOME' | 'AWAY' | null;
};

/** Map a winning team id onto HOME/AWAY for a match, or null if it isn't either side. */
export function winnerSide(
  winnerTeamId: string | null,
  homeTeamId: string,
  awayTeamId: string,
): 'HOME' | 'AWAY' | null {
  if (winnerTeamId === homeTeamId) return 'HOME';
  if (winnerTeamId === awayTeamId) return 'AWAY';
  return null;
}

export function scorePrediction(input: ScoreInput) {
  const predictedOutcome = getOutcome(input.predictedHomeScore, input.predictedAwayScore);
  // A team that advanced on penalties (level scoreline + known winner) counts as that
  // side, not a draw; otherwise fall back to the scoreline outcome.
  const actualOutcome = input.actualWinnerSide ?? getOutcome(input.actualHomeScore, input.actualAwayScore);
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
