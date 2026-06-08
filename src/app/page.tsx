import Link from 'next/link';
import { BrainCircuit, Flame, Globe2, Trophy } from 'lucide-react';
import { MatchCard } from '@/components/MatchCard';
import { SetupNotice } from '@/components/SetupNotice';
import { TeamFlag } from '@/components/TeamFlag';
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
  const featuredMatch = matches[0];

  return (
    <div className="space-y-10">
      <section className="stadium-hero relative overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-glow sm:p-8 md:p-12">
        <div className="pitch-lines pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-emerald-400/18 to-transparent" />
        <div className="relative max-w-3xl">
          <p className="mb-4 inline-flex rounded-full border border-amber-300/35 bg-amber-300/12 px-4 py-2 text-sm font-bold text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.16)]">
            AI football engagement lab
          </p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">Make your predictions. Let AI reveal what kind of fan you really are.</h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-200">
            FanBrain AI turns match predictions into AI verdicts, safe roasts, post-match debriefs, and dynamic fan personalities. No betting. Just football brains, chaos, and bragging rights.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/matches" className="btn btn-primary px-6 py-3 text-base">Start predicting</Link>
            <Link href="/leaderboard" className="btn btn-ghost px-6 py-3 text-base">View leaderboard</Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-gray-950/55 p-4 backdrop-blur">
              <BrainCircuit className="mb-3 text-emerald-300" size={22} />
              <p className="text-sm font-black">AI verdicts</p>
              <p className="mt-1 text-xs text-gray-300">Sharp takes after every pick.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-gray-950/55 p-4 backdrop-blur">
              <Flame className="mb-3 text-orange-300" size={22} />
              <p className="text-sm font-black">Safe roasts</p>
              <p className="mt-1 text-xs text-gray-300">Playful heat, no abuse.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-gray-950/55 p-4 backdrop-blur">
              <Globe2 className="mb-3 text-sky-300" size={22} />
              <p className="text-sm font-black">Global fever</p>
              <p className="mt-1 text-xs text-gray-300">Built for the 2026 World Cup buzz.</p>
            </div>
          </div>
          {featuredMatch && (
            <div className="mt-8 inline-flex max-w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-gray-200 backdrop-blur">
              <Trophy size={17} className="shrink-0 text-amber-200" />
              <span className="inline-flex min-w-0 items-center gap-2 font-bold">
                <span className="shrink-0">Next up:</span>
                <TeamFlag team={featuredMatch.home_team} size="sm" />
                <span className="truncate">{featuredMatch.home_team.name}</span>
                <span className="shrink-0 text-gray-400">vs</span>
                <TeamFlag team={featuredMatch.away_team} size="sm" />
                <span className="truncate">{featuredMatch.away_team.name}</span>
              </span>
            </div>
          )}
        </div>
      </section>

      <section>
        {!supabaseConfigured && <div className="mb-5"><SetupNotice /></div>}
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black">Upcoming matches</h2>
            <p className="text-gray-400">Make your picks before kickoff and climb the leaderboard.</p>
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
