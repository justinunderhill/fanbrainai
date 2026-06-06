import { MatchCard } from '@/components/MatchCard';
import { SetupNotice } from '@/components/SetupNotice';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { MatchWithTeams } from '@/lib/types';

export default async function MatchesPage() {
  const supabaseConfigured = hasSupabasePublicEnv();
  let matches: MatchWithTeams[] = [];

  if (supabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('matches_with_teams')
      .select('*')
      .order('kickoff_time', { ascending: true });
    matches = (data ?? []) as MatchWithTeams[];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Matches</h1>
        <p className="mt-2 text-gray-400">Open a match, predict the score, then let FanBrain AI judge the pick.</p>
      </div>
      {!supabaseConfigured && <SetupNotice />}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((match) => <MatchCard key={match.id} match={match} />)}
      </div>
    </div>
  );
}
