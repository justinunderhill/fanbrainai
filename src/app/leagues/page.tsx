import type { Metadata } from 'next';
import Link from 'next/link';
import { Trophy, Users } from 'lucide-react';
import { CreateLeagueForm } from '@/components/CreateLeagueForm';
import { SetupNotice } from '@/components/SetupNotice';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

const title = 'Private leagues · FanBrain AI';
const description = 'Create a private World Cup prediction league and compete with your friends.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/leagues' },
};

type LeagueRow = { id: string; name: string; owner_id: string; invite_code: string; created_at: string };

export default async function LeaguesPage() {
  if (!hasSupabasePublicEnv()) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-3xl font-black">Private leagues</h1>
        <p className="mt-3 text-gray-300">Sign in to create a league and compete with your friends.</p>
        <Link href="/auth?next=/leagues" className="btn btn-primary mt-5 px-6 py-3">Sign in</Link>
      </div>
    );
  }

  // RLS scopes this to leagues the user is a member of.
  const { data: leagueData } = await supabase
    .from('leagues')
    .select('id, name, owner_id, invite_code, created_at')
    .order('created_at', { ascending: false });
  const leagues = (leagueData ?? []) as LeagueRow[];
  const currentUserId = auth.user.id;

  // Member counts for the leagues we can see (RLS lets members read co-members).
  const counts = new Map<string, number>();
  if (leagues.length) {
    const { data: members } = await supabase
      .from('league_members')
      .select('league_id')
      .in('league_id', leagues.map((l) => l.id));
    for (const row of members ?? []) {
      counts.set(row.league_id, (counts.get(row.league_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <section className="stadium-hero relative overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-glow sm:p-8">
        <div className="pitch-lines pointer-events-none absolute inset-0 opacity-45" />
        <div className="relative max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-300/12 px-4 py-2 text-sm font-bold text-emerald-100">
            <Users size={16} /> Private leagues
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Your leagues</h1>
          <p className="mt-3 text-gray-200">Go head-to-head with your friends on a board that&apos;s just your crew.</p>
        </div>
      </section>

      <CreateLeagueForm />

      {leagues.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-gray-950/45 p-10 text-center shadow-glow">
          <Trophy className="mx-auto text-emerald-200" size={28} />
          <p className="mt-3 font-bold text-white">You&apos;re not in any leagues yet.</p>
          <p className="mt-1 text-sm text-gray-400">Create one above, or open an invite link from a friend to join theirs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/leagues/${league.id}`}
              className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-gray-950/45 p-5 transition-colors hover:bg-white/[0.05]"
            >
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black text-white">{league.name}</h2>
                <p className="mt-1 text-sm text-gray-400">
                  {(counts.get(league.id) ?? 0)} {(counts.get(league.id) ?? 0) === 1 ? 'member' : 'members'}
                  {league.owner_id === currentUserId ? ' · you own this' : ''}
                </p>
              </div>
              <span className="rounded-2xl border border-white/10 bg-gray-950/60 p-3 text-emerald-200">
                <Trophy size={20} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
