import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Medal, Trophy } from 'lucide-react';
import { InviteLink } from '@/components/InviteLink';
import { LeagueActions } from '@/components/LeagueActions';
import { TransferOwnership } from '@/components/TransferOwnership';
import { SetupNotice } from '@/components/SetupNotice';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'League · FanBrain AI',
  robots: { index: false },
};

type LeagueRow = { id: string; name: string; owner_id: string; invite_code: string; competition_id: string | null };
type StandingRow = {
  user_id: string;
  display_name: string | null;
  total_points: number;
  exact_scores: number;
  correct_outcomes: number;
  total_predictions: number;
};

function rankTone(index: number) {
  if (index === 0) return 'border-amber-300/45 bg-amber-300/12 text-amber-100';
  if (index === 1) return 'border-sky-200/35 bg-sky-300/10 text-sky-100';
  if (index === 2) return 'border-orange-300/35 bg-orange-300/10 text-orange-100';
  return 'border-white/10 bg-white/[0.03] text-gray-200';
}

export default async function LeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabasePublicEnv()) {
    return <SetupNotice />;
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-3xl font-black">League</h1>
        <p className="mt-3 text-gray-300">Sign in to view this league.</p>
        <Link href={`/auth?next=/leagues/${id}`} className="btn btn-primary mt-5 px-6 py-3">Sign in</Link>
      </div>
    );
  }

  // RLS only returns the league row if the viewer is a member.
  const { data: leagueData } = await supabase
    .from('leagues')
    .select('id, name, owner_id, invite_code, competition_id')
    .eq('id', id)
    .maybeSingle();
  if (!leagueData) notFound();
  const league = leagueData as LeagueRow;

  let competitionName: string | null = null;
  if (league.competition_id) {
    const { data: competitionData } = await supabase
      .from('competitions')
      .select('name')
      .eq('id', league.competition_id)
      .maybeSingle();
    competitionName = competitionData?.name ?? null;
  }

  // Members-only standings via the guarded RPC.
  const { data: standingsData } = await supabase.rpc('league_leaderboard', { p_league: id });
  const rows = (standingsData ?? []) as StandingRow[];
  const podium = rows.slice(0, 3);
  const currentUserId = auth.user.id;
  const isOwner = league.owner_id === currentUserId;

  return (
    <div className="space-y-6">
      <Link href="/leagues" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white">
        <ArrowLeft size={16} /> All leagues
      </Link>

      <section className="stadium-hero relative overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-glow sm:p-8">
        <div className="pitch-lines pointer-events-none absolute inset-0 opacity-45" />
        <div className="relative">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-300/12 px-4 py-2 text-sm font-bold text-emerald-100">
            <Trophy size={16} /> Private league
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{league.name}</h1>
          <p className="mt-3 text-gray-200">
            {rows.length} {rows.length === 1 ? 'member' : 'members'} · points use the same scoring as the global board
            {competitionName ? ` · ${competitionName} only` : ''}.
          </p>
        </div>
      </section>

      <InviteLink inviteCode={league.invite_code} leagueName={league.name} />

      {podium.length > 0 && (
        <section className="grid gap-3 md:grid-cols-3">
          {podium.map((row, index) => (
            <div key={row.user_id} className={`relative overflow-hidden rounded-3xl border p-5 ${rankTone(index)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide opacity-75">Rank {index + 1}</p>
                  <h2 className="mt-2 truncate text-xl font-black text-white">{row.display_name ?? 'Anonymous fan'}</h2>
                </div>
                <div className="rounded-2xl border border-white/10 bg-gray-950/45 p-3">
                  {index === 0 ? <Trophy size={22} /> : <Medal size={22} />}
                </div>
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
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
                <tr
                  key={row.user_id}
                  className={`border-t border-white/10 transition-colors hover:bg-white/[0.04] ${row.user_id === currentUserId ? 'bg-emerald-400/[0.06]' : ''}`}
                >
                  <td className="px-4 py-4">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border font-black ${rankTone(index)}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-bold text-white">
                    {row.display_name ?? 'Anonymous fan'}
                    {row.user_id === currentUserId && <span className="ml-2 text-xs font-bold text-emerald-300">you</span>}
                  </td>
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

      {isOwner && (
        <TransferOwnership
          leagueId={league.id}
          members={rows.filter((row) => row.user_id !== currentUserId).map((row) => ({ user_id: row.user_id, display_name: row.display_name }))}
        />
      )}

      <div className="space-y-2 border-t border-white/10 pt-6">
        {isOwner && (
          <p className="text-center text-xs text-gray-500">You own this league. Deleting it removes it for everyone.</p>
        )}
        <LeagueActions leagueId={league.id} isOwner={isOwner} />
      </div>
    </div>
  );
}
