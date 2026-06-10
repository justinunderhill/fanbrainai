import { getOutcome } from '@/lib/utils';

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
