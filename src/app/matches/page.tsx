import { MatchesBrowser } from '@/components/MatchesBrowser';
import { NextActionCard } from '@/components/NextActionCard';
import { SetupNotice } from '@/components/SetupNotice';
import { buildNextAction } from '@/lib/next-action';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { MatchWithTeams, Prediction } from '@/lib/types';

export default async function MatchesPage() {
  const supabaseConfigured = hasSupabasePublicEnv();
  let matches: MatchWithTeams[] = [];
  let predictedMatchIds = new Set<string>();
  let signedIn = false;

  if (supabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('matches_with_teams')
      .select('*')
      .order('kickoff_time', { ascending: true });
    matches = (data ?? []) as MatchWithTeams[];

    // Mark which matches the signed-in user has already predicted so the grid
    // can flag them. RLS scopes this to the user's own rows.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      signedIn = true;
      const { data: predictions } = await supabase
        .from('predictions')
        .select('match_id')
        .eq('user_id', user.id);
      predictedMatchIds = new Set((predictions ?? []).map((p) => p.match_id as string));
    }
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
      {nextAction && <NextActionCard action={nextAction} />}
      {supabaseConfigured && (
        <MatchesBrowser matches={matches} predictedMatchIds={[...predictedMatchIds]} />
      )}
    </div>
  );
}
