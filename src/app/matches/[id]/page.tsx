import { notFound } from 'next/navigation';
import { PredictionForm } from '@/components/PredictionForm';
import { SetupNotice } from '@/components/SetupNotice';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { formatKickoff } from '@/lib/utils';
import type { MatchWithTeams } from '@/lib/types';

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabasePublicEnv()) {
    return <SetupNotice />;
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('matches_with_teams')
    .select('*')
    .eq('id', id)
    .single();

  if (!data) notFound();
  const match = data as MatchWithTeams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="card-gradient rounded-[2rem] border border-white/10 p-6 shadow-glow">
        <div className="mb-5 flex items-center justify-between text-sm text-gray-400">
          <span>{match.stage}</span>
          <span className="rounded-full border border-white/10 px-3 py-1 uppercase">{match.status}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div>
            <div className="text-5xl">{match.home_team.emoji_flag}</div>
            <h1 className="mt-2 text-2xl font-black">{match.home_team.name}</h1>
          </div>
          <div className="rounded-3xl bg-white/10 px-5 py-3 text-2xl font-black">vs</div>
          <div className="text-right">
            <div className="text-5xl">{match.away_team.emoji_flag}</div>
            <h1 className="mt-2 text-2xl font-black">{match.away_team.name}</h1>
          </div>
        </div>
        <p className="mt-6 text-gray-300">{formatKickoff(match.kickoff_time)} · {match.venue ?? 'Venue TBC'}</p>
      </section>

      <PredictionForm match={match} />
    </div>
  );
}
