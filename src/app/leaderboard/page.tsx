import { SetupNotice } from '@/components/SetupNotice';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

type Row = {
  user_id: string;
  display_name: string | null;
  total_points: number;
  correct_outcomes: number;
  exact_scores: number;
  total_predictions: number;
};

export default async function LeaderboardPage() {
  const supabaseConfigured = hasSupabasePublicEnv();
  let rows: Row[] = [];

  if (supabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.from('leaderboard').select('*').order('total_points', { ascending: false }).limit(50);
    rows = (data ?? []) as Row[];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Leaderboard</h1>
        <p className="mt-2 text-gray-400">Points are deterministic. AI gets to talk. It does not get to score.</p>
      </div>
      {!supabaseConfigured && <SetupNotice />}
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-400">
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
              <tr key={row.user_id} className="border-t border-white/10">
                <td className="px-4 py-4 font-black">{index + 1}</td>
                <td className="px-4 py-4">{row.display_name ?? 'Anonymous fan'}</td>
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
  );
}
