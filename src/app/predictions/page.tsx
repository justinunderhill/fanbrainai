import Link from 'next/link';
import { PredictionRow } from '@/components/PredictionRow';
import { SetupNotice } from '@/components/SetupNotice';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { MatchWithTeams, Prediction } from '@/lib/types';

export default async function PredictionsPage() {
  if (!hasSupabasePublicEnv()) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-3xl font-black">Your picks</h1>
        <p className="mt-3 text-gray-300">Sign in to see and edit the predictions you&apos;ve made.</p>
        <Link href="/auth?next=/predictions" className="btn btn-primary mt-5 px-6 py-3">Sign in</Link>
      </div>
    );
  }

  const { data: predictionData } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', auth.user.id);
  const predictions = (predictionData ?? []) as Prediction[];

  const matchIds = predictions.map((p) => p.match_id);
  let matchesById = new Map<string, MatchWithTeams>();
  if (matchIds.length > 0) {
    const { data: matchData } = await supabase
      .from('matches_with_teams')
      .select('*')
      .in('id', matchIds);
    matchesById = new Map(((matchData ?? []) as MatchWithTeams[]).map((m) => [m.id, m]));
  }

  // Pair each prediction with its match, then order: upcoming (still editable)
  // first by soonest kickoff, then everything else by most recent kickoff.
  // Server component: renders once per request, so reading the clock here is safe.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const rows = predictions
    .map((prediction) => ({ prediction, match: matchesById.get(prediction.match_id) }))
    .filter((row): row is { prediction: Prediction; match: MatchWithTeams } => Boolean(row.match));

  const upcoming = rows
    .filter((r) => r.match.status === 'scheduled' && new Date(r.match.kickoff_time).getTime() > now)
    .sort((a, b) => new Date(a.match.kickoff_time).getTime() - new Date(b.match.kickoff_time).getTime());
  const past = rows
    .filter((r) => !(r.match.status === 'scheduled' && new Date(r.match.kickoff_time).getTime() > now))
    .sort((a, b) => new Date(b.match.kickoff_time).getTime() - new Date(a.match.kickoff_time).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Your picks</h1>
        <p className="mt-2 text-gray-400">Everything you&apos;ve called. Edit anything that hasn&apos;t kicked off yet.</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-gray-300">You haven&apos;t made any predictions yet.</p>
          <Link href="/matches" className="btn btn-primary mt-5 px-6 py-3">Browse matches</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Upcoming · editable</h2>
              {upcoming.map(({ prediction, match }) => (
                <PredictionRow key={prediction.id} prediction={prediction} match={match} editable />
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">Locked &amp; settled</h2>
              {past.map(({ prediction, match }) => (
                <PredictionRow key={prediction.id} prediction={prediction} match={match} editable={false} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
