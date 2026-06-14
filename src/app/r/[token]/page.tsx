import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sparkles, Trophy } from 'lucide-react';
import { TeamFlag } from '@/components/TeamFlag';
import { createAdminClient } from '@/lib/supabase/admin';
import { pointsBadge } from '@/lib/scoring';
import type { MatchWithTeams, Prediction } from '@/lib/types';

type SharedPrediction = {
  prediction: Pick<
    Prediction,
    'predicted_home_score' | 'predicted_away_score' | 'prediction_style' | 'points_awarded' | 'ai_debrief'
  >;
  match: MatchWithTeams;
  displayName: string;
};

// Public, unlisted page. The token is an unguessable UUID read via the service-role
// admin client, so owner-only RLS is untouched. Only a single settled pick is ever
// exposed — never the user's other predictions, email, or user_id (beyond the
// internal display-name lookup). Mirrors the fan-profile share loop at /p/[token].
async function getSharedPrediction(token: string): Promise<SharedPrediction | null> {
  const supabase = createAdminClient();
  const { data: prediction } = await supabase
    .from('predictions')
    .select('user_id, match_id, predicted_home_score, predicted_away_score, prediction_style, points_awarded, ai_debrief')
    .eq('share_token', token)
    .maybeSingle();

  if (!prediction) return null;

  const { data: match } = await supabase
    .from('matches_with_teams')
    .select('*')
    .eq('id', prediction.match_id)
    .maybeSingle();

  // Only settled picks are shareable — there's nothing to brag about until the
  // final whistle, and the card depends on the actual scoreline.
  if (!match || (match as MatchWithTeams).status !== 'final') return null;

  const { data: userRow } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', prediction.user_id)
    .maybeSingle();

  return {
    prediction,
    match: match as MatchWithTeams,
    displayName: userRow?.display_name?.trim() || 'A FanBrain fan',
  };
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const result = await getSharedPrediction(token);

  if (!result) {
    return { title: 'Prediction not found · FanBrain AI' };
  }

  const { prediction, match, displayName } = result;
  const title = `${displayName} called ${match.home_team.name} ${prediction.predicted_home_score}–${prediction.predicted_away_score} ${match.away_team.name} · FanBrain`;
  const description =
    prediction.ai_debrief ??
    `${match.home_team.name} ${match.home_score}–${match.away_score} ${match.away_team.name}. See how the call held up on FanBrain.`;
  const image = { url: `/r/${token}/og`, width: 1200, height: 630, alt: 'FanBrain prediction result' };
  // Relative URLs resolve against metadataBase (NEXT_PUBLIC_SITE_URL) into absolute links.
  const path = `/r/${token}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, type: 'article', url: path, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function SharedPredictionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getSharedPrediction(token);

  if (!result) notFound();

  const { prediction, match, displayName } = result;
  const badge = pointsBadge(prediction.points_awarded);

  return (
    <div className="space-y-6">
      <section className="stadium-hero relative overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-glow sm:p-8">
        <div className="pitch-lines pointer-events-none absolute inset-0 opacity-45" />
        <div className="relative max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-300/12 px-4 py-2 text-sm font-bold text-emerald-100">
            <Trophy size={16} /> Prediction result
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{displayName}&rsquo;s call</h1>
          <p className="mt-3 text-gray-200">How this World Cup prediction held up once the final whistle blew.</p>
        </div>
      </section>

      <section className="card-gradient relative overflow-hidden rounded-3xl border border-white/10 p-6 shadow-glow sm:p-8">
        <span className="field-arc pointer-events-none absolute inset-x-5 top-0 h-20 opacity-60" />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-wide text-amber-200">{match.stage}</p>

          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="min-w-0">
              <TeamFlag team={match.home_team} size="sm" />
              <h2 className="truncate text-lg font-black sm:text-xl">{match.home_team.name}</h2>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-3 text-2xl font-black tabular-nums sm:text-3xl">
              {match.home_score ?? 0} – {match.away_score ?? 0}
            </div>
            <div className="min-w-0 text-right">
              <div className="ml-auto w-fit">
                <TeamFlag team={match.away_team} size="sm" />
              </div>
              <h2 className="truncate text-lg font-black sm:text-xl">{match.away_team.name}</h2>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">{displayName} called</p>
              <p className="text-3xl font-black tabular-nums text-emerald-300">
                {prediction.predicted_home_score} – {prediction.predicted_away_score}
              </p>
            </div>
            <span className={`ml-auto rounded-full border px-4 py-2 text-sm font-bold ${badge.cls}`}>{badge.label}</span>
          </div>

          {prediction.ai_debrief && (
            <div className="mt-5 rounded-3xl border border-sky-400/30 bg-sky-400/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-200">AI Debrief</p>
              <p className="mt-2 leading-7 text-gray-100">{prediction.ai_debrief}</p>
            </div>
          )}
        </div>
      </section>

      <section className="card-gradient relative overflow-hidden rounded-3xl border border-white/10 p-6 text-center shadow-glow sm:p-8">
        <span className="field-arc pointer-events-none absolute inset-x-5 top-0 h-20 opacity-60" />
        <div className="relative mx-auto max-w-xl">
          <Sparkles className="mx-auto text-amber-200" size={26} />
          <h2 className="mt-3 text-2xl font-black sm:text-3xl">Think you can call it better?</h2>
          <p className="mt-3 text-gray-300">FanBrain rates every World Cup pick, hands down an AI debrief, and turns your calls into a fan personality.</p>
          <Link href="/" className="btn btn-primary mt-6 px-6 py-3">Try FanBrain</Link>
        </div>
      </section>
    </div>
  );
}
