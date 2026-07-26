import type { Metadata } from 'next';
import { Crown, Table2 } from 'lucide-react';
import { SetupNotice } from '@/components/SetupNotice';
import { StandingsTabs } from '@/components/StandingsTabs';
import { TeamBadge } from '@/components/TeamBadge';
import { getStandings } from '@/lib/standings';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { Competition } from '@/lib/types';

const title = 'League table · FanBrain AI';
const description = 'See who tops the log for every competition FanBrain covers.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/table' },
};

export default async function TablePage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string }>;
}) {
  const { competition: selectedCode } = await searchParams;
  const supabaseConfigured = hasSupabasePublicEnv();

  if (!supabaseConfigured) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const { data: competitionsData } = await supabase
    .from('competitions')
    .select('id, code, name, season, is_active')
    .eq('is_active', true)
    .order('name');
  const competitions = (competitionsData ?? []) as Competition[];

  const selected = (selectedCode ? competitions.find((c) => c.code === selectedCode) : undefined) ?? competitions[0];
  const rows = selected ? await getStandings(supabase, selected.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black">
          <Table2 className="text-emerald-300" size={28} /> FanBrain table
        </h1>
        <p className="mt-2 text-gray-400">The current log for each competition — who&apos;s top right now.</p>
        <p className="mt-1 text-xs text-gray-500">
          Unofficial — built from results we&apos;ve synced, not the competition&apos;s own records (no point deductions or postponement rules applied).
        </p>
      </div>

      {competitions.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-gray-950/45 p-10 text-center shadow-glow">
          <p className="font-bold text-white">No active competitions yet.</p>
        </div>
      ) : (
        <>
          <StandingsTabs competitions={competitions} selectedId={selected?.id ?? ''} />

          {rows.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-gray-950/45 p-10 text-center shadow-glow">
              <p className="font-bold text-white">No fixtures synced for {selected?.name} yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-gray-950/45 shadow-glow">
              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-left text-sm">
                  <thead className="bg-white/5 text-gray-300">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Team</th>
                      <th className="px-4 py-3 text-right">P</th>
                      <th className="px-4 py-3 text-right">W</th>
                      <th className="px-4 py-3 text-right">D</th>
                      <th className="px-4 py-3 text-right">L</th>
                      <th className="px-4 py-3 text-right">GF</th>
                      <th className="px-4 py-3 text-right">GA</th>
                      <th className="px-4 py-3 text-right">GD</th>
                      <th className="px-4 py-3 text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr
                        key={row.team.id}
                        className={`border-t border-white/10 transition-colors hover:bg-white/[0.04] ${
                          index === 0 ? 'bg-amber-300/[0.06]' : ''
                        }`}
                      >
                        <td className="px-4 py-4 font-black tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            {index === 0 && <Crown size={14} className="text-amber-300" />}
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-2 font-bold text-white">
                            <TeamBadge team={row.team} size="sm" />
                            <span className="truncate">{row.team.name}</span>
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums">{row.played}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{row.won}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{row.drawn}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{row.lost}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{row.goals_for}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{row.goals_against}</td>
                        <td className="px-4 py-4 text-right tabular-nums">
                          {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                        </td>
                        <td className="px-4 py-4 text-right font-black tabular-nums text-emerald-300">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
