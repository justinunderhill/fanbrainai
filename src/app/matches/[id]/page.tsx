import { notFound } from 'next/navigation';
import { PredictionAuthGate } from '@/components/PredictionAuthGate';
import { SetupNotice } from '@/components/SetupNotice';
import { TeamFlag } from '@/components/TeamFlag';
import { TeamFormPanel } from '@/components/TeamForm';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getTeamForm } from '@/lib/team-form';
import { nextPredictableMatch } from '@/lib/next-action';
import { formatKickoff } from '@/lib/utils';
import type { MatchWithTeams, Prediction } from '@/lib/types';

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabasePublicEnv()) {
    return <SetupNotice />;
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('matches_with_teams')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) notFound();
  const match = data as MatchWithTeams;

  // Recent form for both sides, drawn from completed matches already in our DB
  // (no extra API call). Shown above the prediction form so picks can be backed
  // by how each team has actually been playing.
  const [homeForm, awayForm] = await Promise.all([
    getTeamForm(supabase, match.home_team.id),
    getTeamForm(supabase, match.away_team.id),
  ]);

  // Load the signed-in user's existing pick (if any) so the form can pre-fill
  // for editing rather than starting from defaults. RLS restricts this to the
  // user's own row.
  const { data: { user } } = await supabase.auth.getUser();
  let initialPrediction: Prediction | null = null;
  let nextMatch: MatchWithTeams | null = null;
  if (user) {
    const { data: existing } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    initialPrediction = (existing as Prediction | null) ?? null;

    const { data: predictions } = await supabase
      .from('predictions')
      .select('match_id')
      .eq('user_id', user.id);
    const predictedIds = new Set((predictions ?? []).map((prediction) => prediction.match_id as string));
    predictedIds.add(id);

    const { data: upcomingMatches } = await supabase
      .from('matches_with_teams')
      .select('*')
      .eq('status', 'scheduled')
      .order('kickoff_time', { ascending: true });
    nextMatch = nextPredictableMatch((upcomingMatches ?? []) as MatchWithTeams[], predictedIds);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="stadium-hero relative overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-glow">
        <div className="pitch-lines pointer-events-none absolute inset-0 opacity-45" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-emerald-400/16 to-transparent" />
        <div className="relative mb-5 flex items-center justify-between text-sm text-gray-300">
          <span className="font-bold">{match.stage}</span>
          <span className="rounded-full border border-amber-300/35 bg-amber-300/12 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-100">{match.status}</span>
        </div>
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="min-w-0">
            <TeamFlag team={match.home_team} size="lg" />
            <h1 className="mt-3 truncate text-2xl font-black">{match.home_team.name}</h1>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gray-950/60 px-5 py-3 text-2xl font-black shadow-[0_0_30px_rgba(16,185,129,0.18)] backdrop-blur">vs</div>
          <div className="min-w-0 text-right">
            <div className="ml-auto w-fit">
              <TeamFlag team={match.away_team} size="lg" />
            </div>
            <h1 className="mt-3 truncate text-2xl font-black">{match.away_team.name}</h1>
          </div>
        </div>
        <p className="relative mt-6 text-gray-200">{formatKickoff(match.kickoff_time)}{match.venue ? ` · ${match.venue}` : ''}</p>
      </section>

      <TeamFormPanel
        homeTeam={match.home_team}
        awayTeam={match.away_team}
        homeForm={homeForm}
        awayForm={awayForm}
      />

      <PredictionAuthGate match={match} initialPrediction={initialPrediction} nextMatch={nextMatch} />
    </div>
  );
}
