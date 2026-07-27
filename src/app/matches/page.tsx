import { CompetitionFilter } from '@/components/CompetitionFilter';
import { MatchesBrowser } from '@/components/MatchesBrowser';
import { NextActionCard } from '@/components/NextActionCard';
import { SetupNotice } from '@/components/SetupNotice';
import { buildNextAction } from '@/lib/next-action';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { Competition, MatchWithTeams, Prediction } from '@/lib/types';

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string }>;
}) {
  const { competition: selectedCode } = await searchParams;
  const supabaseConfigured = hasSupabasePublicEnv();
  let matches: MatchWithTeams[] = [];
  let predictedMatchIds = new Set<string>();
  let signedIn = false;
  let competitions: Competition[] = [];

  if (supabaseConfigured) {
    const supabase = await createClient();
    const [competitionsResult, authResult] = await Promise.all([
      supabase.from('competitions').select('id, code, name, season, is_active').order('name'),
      supabase.auth.getUser(),
    ]);
    competitions = (competitionsResult.data ?? []) as Competition[];

    // Default to active competitions only, so a finished tournament doesn't
    // clutter the main view — an explicit ?competition= code (including an
    // archived one) always wins.
    const selected = selectedCode ? competitions.find((c) => c.code === selectedCode) : undefined;
    const competitionIds = selected
      ? [selected.id]
      : competitions.filter((c) => c.is_active).map((c) => c.id);

    // Mark which matches the signed-in user has already predicted so the grid
    // can flag them. RLS scopes this to the user's own rows. Independent of the
    // matches query below (only needs user.id, already resolved above), so run
    // both in parallel instead of one after the other.
    const { data: { user } } = authResult;
    signedIn = Boolean(user);
    const [matchesResult, predictionsResult] = await Promise.all([
      supabase
        .from('matches_with_teams')
        .select('*')
        .in('competition_id', competitionIds)
        .order('kickoff_time', { ascending: true }),
      user ? supabase.from('predictions').select('match_id').eq('user_id', user.id) : Promise.resolve({ data: null }),
    ]);
    matches = (matchesResult.data ?? []) as MatchWithTeams[];
    predictedMatchIds = new Set((predictionsResult.data ?? []).map((p) => p.match_id as string));
  }

  const nextAction = supabaseConfigured
    ? buildNextAction({
        signedIn,
        matches,
        predictions: [...predictedMatchIds].map((match_id) => ({ match_id })) as Pick<Prediction, 'match_id'>[],
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Matches</h1>
        <p className="mt-2 text-gray-400">Open a match, predict the score, then let FanBrain AI judge the pick.</p>
      </div>
      {!supabaseConfigured && <SetupNotice />}
      {competitions.length > 0 && (
        <CompetitionFilter competitions={competitions} selectedCode={selectedCode ?? null} />
      )}
      {nextAction && <NextActionCard action={nextAction} />}
      {supabaseConfigured && (
        <MatchesBrowser matches={matches} predictedMatchIds={[...predictedMatchIds]} />
      )}
    </div>
  );
}
