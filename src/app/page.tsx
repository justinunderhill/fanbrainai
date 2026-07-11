import Link from 'next/link';
import { BrainCircuit, Flame, Globe2, Trophy } from 'lucide-react';
import { MatchCard } from '@/components/MatchCard';
import { NextActionCard } from '@/components/NextActionCard';
import { ResultsRecap, type RecapItem } from '@/components/ResultsRecap';
import { SetupNotice } from '@/components/SetupNotice';
import { ShareButtons } from '@/components/ShareButtons';
import { TeamFlag } from '@/components/TeamFlag';
import { buildNextAction } from '@/lib/next-action';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { MatchWithTeams, Prediction } from '@/lib/types';

type HomeData = {
  matches: MatchWithTeams[];
  liveMatches: MatchWithTeams[];
  fanPredictions: { signedIn: boolean; predictions: Pick<Prediction, 'match_id'>[] };
  recap: { settled: RecapItem[]; rank: number | null } | null;
};

async function getHomeData(): Promise<HomeData> {
  const supabase = await createClient();

  // Scheduled matches drive "Next up" and the upcoming grid. Live games stay in
  // their own strip so they don't get mixed into "what to predict next".
  const [scheduledResult, liveResult, authResult] = await Promise.all([
    supabase
      .from('matches_with_teams')
      .select('*')
      .eq('status', 'scheduled')
      .order('kickoff_time', { ascending: true }),
    supabase
      .from('matches_with_teams')
      .select('*')
      .eq('status', 'live')
      .order('kickoff_time', { ascending: true }),
    supabase.auth.getUser(),
  ]);

  const matches = (scheduledResult.data ?? []) as MatchWithTeams[];
  const liveMatches = (liveResult.data ?? []) as MatchWithTeams[];
  const user = authResult.data.user;

  if (!user) {
    return {
      matches,
      liveMatches,
      fanPredictions: { signedIn: false, predictions: [] },
      recap: null,
    };
  }

  const { data: predictionData } = await supabase.from('predictions').select('*').eq('user_id', user.id);
  const predictions = (predictionData ?? []) as Prediction[];
  if (predictions.length === 0) {
    return {
      matches,
      liveMatches,
      fanPredictions: { signedIn: true, predictions: [] },
      recap: { settled: [], rank: null },
    };
  }

  const [matchResult, standingsResult] = await Promise.all([
    supabase
      .from('matches_with_teams')
      .select('*')
      .in('id', predictions.map((p) => p.match_id)),
    supabase
      .from('leaderboard')
      .select('user_id, total_points')
      .order('total_points', { ascending: false }),
  ]);

  const matchData = matchResult.data;
  const matchesById = new Map(((matchData ?? []) as MatchWithTeams[]).map((m) => [m.id, m]));

  const settled = predictions
    .map((prediction) => ({ prediction, match: matchesById.get(prediction.match_id) }))
    .filter((r): r is RecapItem => Boolean(r.match) && r.match!.status === 'final')
    .sort((a, b) => new Date(b.match.kickoff_time).getTime() - new Date(a.match.kickoff_time).getTime());

  const index = (standingsResult.data ?? []).findIndex((row) => row.user_id === user.id);

  return {
    matches,
    liveMatches,
    fanPredictions: {
      signedIn: true,
      predictions: predictions.map(({ match_id }) => ({ match_id })),
    },
    recap: { settled, rank: index >= 0 ? index + 1 : null },
  };
}

export default async function Home() {
  const supabaseConfigured = hasSupabasePublicEnv();
  const homeData = supabaseConfigured ? await getHomeData() : null;
  const matches = homeData?.matches ?? [];
  const liveMatches = homeData?.liveMatches ?? [];
  const displayedMatches = matches.slice(0, 6);
  const featuredMatch = displayedMatches[0];
  const recap = homeData?.recap ?? null;
  const fanPredictions = homeData?.fanPredictions ?? null;
  const nextAction = fanPredictions
    ? buildNextAction({ signedIn: fanPredictions.signedIn, matches, predictions: fanPredictions.predictions })
    : null;

  return (
    <div className="space-y-10">
      {recap && recap.settled.length > 0 && <ResultsRecap settled={recap.settled} rank={recap.rank} />}
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

      {nextAction && <NextActionCard action={nextAction} />}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-black">Spread the word</h2>
          <p className="text-gray-400">Pull your friends into the World Cup chaos — more rivals, more bragging rights.</p>
        </div>
        <ShareButtons
          path="/"
          showImage={false}
          tone="amber"
          title="FanBrain AI"
          heading="Invite friends to FanBrain"
          blurb="Share the app so your group can predict, get AI verdicts, and battle for the leaderboard together."
          shareText="Predicting the 2026 World Cup with FanBrain AI — make your calls and find out what kind of fan you really are ⚽"
        />
      </section>

      {liveMatches.length > 0 && (
        <section>
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-300/40 bg-red-400/15 px-3 py-1 text-sm font-black text-red-100">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
              Live now
            </span>
            <p className="text-gray-400">Matches in progress right now.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {liveMatches.map((match) => <MatchCard key={match.id} match={match} />)}
          </div>
        </section>
      )}

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
          {displayedMatches.map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
      </section>
    </div>
  );
}
