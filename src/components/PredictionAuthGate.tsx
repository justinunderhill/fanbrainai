'use client';

import type { MatchWithTeams, Prediction } from '@/lib/types';
import { PredictionForm } from '@/components/PredictionForm';
import { SignInToPredictPanel } from '@/components/SignInToPredictPanel';
import { useAuth } from '@/components/AuthProvider';

export function PredictionAuthGate({
  match,
  initialPrediction = null,
  nextMatch = null,
}: {
  match: MatchWithTeams;
  initialPrediction?: Prediction | null;
  nextMatch?: MatchWithTeams | null;
}) {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-gray-300">
        Checking sign-in...
      </section>
    );
  }

  if (!user) {
    return <SignInToPredictPanel returnTo={`/matches/${match.id}`} />;
  }

  return <PredictionForm match={match} initialPrediction={initialPrediction} nextMatch={nextMatch} />;
}
