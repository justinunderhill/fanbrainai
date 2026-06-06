import Link from 'next/link';
import { MatchCard } from '@/components/MatchCard';
import { SetupNotice } from '@/components/SetupNotice';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { MatchWithTeams } from '@/lib/types';

async function getMatches() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('matches_with_teams')
    .select('*')
    .order('kickoff_time', { ascending: true })
    .limit(6);
  return (data ?? []) as MatchWithTeams[];
}

export default async function Home() {
  const supabaseConfigured = hasSupabasePublicEnv();
  const matches = supabaseConfigured ? await getMatches() : [];

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 shadow-glow md:p-12">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-200">AI football engagement lab</p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">Make your predictions. Let AI reveal what kind of fan you really are.</h1>
          <p className="mt-5 text-lg text-gray-300">FanBrain AI turns match predictions into AI verdicts, safe roasts, post-match debriefs, and dynamic fan personalities. No betting. Just football brains, chaos, and bragging rights.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/matches" className="btn btn-primary px-6 py-3 text-base">Start predicting</Link>
            <Link href="/leaderboard" className="btn btn-ghost px-6 py-3 text-base">View leaderboard</Link>
          </div>
        </div>
      </section>

      <section>
        {!supabaseConfigured && <div className="mb-5"><SetupNotice /></div>}
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black">Upcoming matches</h2>
            <p className="text-gray-400">Starter data is included. Replace with a full fixture API sync when ready.</p>
          </div>
          <Link href="/matches" className="text-sm font-bold text-emerald-300">See all</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
      </section>
    </div>
  );
}
