import type { Metadata } from 'next';
import Link from 'next/link';
import { Medal, Sparkles, Trophy } from 'lucide-react';
import { CollapsibleShare } from '@/components/CollapsibleShare';
import { CompetitionFilter } from '@/components/CompetitionFilter';
import { SetupNotice } from '@/components/SetupNotice';
import { YourRank } from '@/components/YourRank';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { Competition } from '@/lib/types';

const title = 'Leaderboard · FanBrain AI';
const description = 'These are the sharpest football fan brains. Can you out-predict them?';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/leaderboard' },
  openGraph: { title, description, url: '/leaderboard', images: [{ url: '/leaderboard/og', width: 1200, height: 630, alt: 'FanBrain leaderboard' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/leaderboard/og'] },
};

type Row = {
  user_id: string;
  display_name: string | null;
  total_points: number;
  correct_outcomes: number;
  exact_scores: number;
  total_predictions: number;
};

function rankTone(index: number) {
  if (index === 0) return 'border-amber-300/45 bg-amber-300/12 text-amber-100 shadow-[0_0_34px_rgba(251,191,36,0.18)]';
  if (index === 1) return 'border-sky-200/35 bg-sky-300/10 text-sky-100';
  if (index === 2) return 'border-orange-300/35 bg-orange-300/10 text-orange-100';
  return 'border-white/10 bg-white/[0.03] text-gray-200';
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string }>;
}) {
  const { competition: selectedCode } = await searchParams;
  const supabaseConfigured = hasSupabasePublicEnv();
  let rows: Row[] = [];
  let me: { rank: number | null; row: Row } | null = null;
  let competitions: Competition[] = [];

  if (supabaseConfigured) {
    const supabase = await createClient();
    const [competitionsResult, authResult] = await Promise.all([
      supabase.from('competitions').select('id, code, name, season, is_active').order('name'),
      supabase.auth.getUser(),
    ]);
    competitions = (competitionsResult.data ?? []) as Competition[];

    // Default (no selection) scopes to active competitions only, so a retired
    // tournament's points don't linger on "the" leaderboard forever — an
    // explicit ?competition= code (including an archived one) always wins.
    const selected = selectedCode ? competitions.find((c) => c.code === selectedCode) : undefined;
    const competitionId = selected?.id ?? null;

    // One full-ordering fetch covers the top-50 display, "my" row, and "my" rank —
    // rank can sit outside the top 50, but it's still just an index into this same
    // list, so there's no need for separate top-50/mine/rank RPC calls.
    const { data } = await supabase
      .rpc('leaderboard', { p_competition_id: competitionId })
      .select('*')
      .order('total_points', { ascending: false });
    const standings = (data ?? []) as Row[];
    rows = standings.slice(0, 50);

    const { data: auth } = authResult;
    if (auth.user) {
      const index = standings.findIndex((r) => r.user_id === auth.user!.id);
      if (index >= 0) me = { rank: index + 1, row: standings[index] };
    }
  }
  const podium = rows.slice(0, 3);

  return (
    <div className="space-y-6">
      <section className="stadium-hero relative overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-glow sm:p-8">
        <div className="pitch-lines pointer-events-none absolute inset-0 opacity-45" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-300/12 px-4 py-2 text-sm font-bold text-amber-100">
              <Trophy size={16} /> Fan standings
            </p>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Leaderboard</h1>
            <p className="mt-3 text-gray-200">Points are deterministic. AI gets to talk. It does not get to score.</p>
            <CollapsibleShare
              className="mt-4"
              buttonLabel="Share the leaderboard"
              path="/leaderboard"
              title="FanBrain leaderboard"
              heading="Share the leaderboard"
              blurb="Challenge your group chat to climb the board."
              shareText="These are the sharpest football fan brains on FanBrain — think you can beat them?"
              tone="amber"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-gray-950/60 p-3 backdrop-blur">
            <Stat label="Fans" value={rows.length} />
            <Stat label="Picks" value={rows.reduce((sum, row) => sum + row.total_predictions, 0)} />
            <Stat label="Exact" value={rows.reduce((sum, row) => sum + row.exact_scores, 0)} />
          </div>
        </div>
      </section>

      {!supabaseConfigured && <SetupNotice />}

      {competitions.length > 0 && (
        <CompetitionFilter
          competitions={competitions}
          selectedCode={selectedCode ?? null}
          basePath="/leaderboard"
          allLabel="All active"
        />
      )}

      {me && (
        <YourRank
          rank={me.rank}
          totalPoints={me.row.total_points}
          displayName={me.row.display_name ?? 'You'}
        />
      )}

      {podium.length > 0 && (
        <section className="grid gap-3 md:grid-cols-3">
          {podium.map((row, index) => (
            <div key={row.user_id} className={`relative overflow-hidden rounded-3xl border p-5 ${rankTone(index)}`}>
              <span className="field-arc pointer-events-none absolute inset-x-4 top-0 h-16 opacity-60" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide opacity-75">Rank {index + 1}</p>
                  <h2 className="mt-2 truncate text-xl font-black text-white">{row.display_name ?? 'Anonymous fan'}</h2>
                </div>
                <div className="rounded-2xl border border-white/10 bg-gray-950/45 p-3">
                  {index === 0 ? <Trophy size={22} /> : <Medal size={22} />}
                </div>
              </div>
              <div className="relative mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-4xl font-black tabular-nums text-white">{row.total_points}</p>
                  <p className="text-sm opacity-75">points</p>
                </div>
                <div className="text-right text-sm opacity-80">
                  <p>{row.exact_scores} exact</p>
                  <p>{row.correct_outcomes} outcomes</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-gray-950/45 p-10 text-center shadow-glow">
          <Sparkles className="mx-auto text-amber-200" size={28} />
          <p className="mt-3 font-bold text-white">No points on the board yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            The table lights up once the first predictions are scored. Be the first to get on it.
          </p>
          <Link href="/matches" className="btn btn-primary mt-5 px-6 py-3">Predict a match</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gray-950/45 shadow-glow">
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-left text-sm">
              <thead className="bg-white/5 text-gray-300">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Fan</th>
                  <th className="px-4 py-3">Points</th>
                  <th className="px-4 py-3">Exact</th>
                  <th className="px-4 py-3">Outcomes</th>
                  <th className="px-4 py-3">Picks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.user_id} className="border-t border-white/10 transition-colors hover:bg-white/[0.04]">
                    <td className="px-4 py-4">
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border font-black ${rankTone(index)}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-white">{row.display_name ?? 'Anonymous fan'}</td>
                    <td className="px-4 py-4 font-black text-emerald-300">{row.total_points}</td>
                    <td className="px-4 py-4">{row.exact_scores}</td>
                    <td className="px-4 py-4">{row.correct_outcomes}</td>
                    <td className="px-4 py-4">{row.total_predictions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 text-center">
      <p className="text-2xl font-black tabular-nums text-white">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
    </div>
  );
}
