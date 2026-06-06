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
