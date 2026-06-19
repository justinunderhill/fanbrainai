import type { Metadata } from 'next';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { JoinLeagueButton } from '@/components/JoinLeagueButton';
import { SetupNotice } from '@/components/SetupNotice';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Join a league · FanBrain AI',
  robots: { index: false },
};

type Preview = { id: string; name: string; member_count: number };

export default async function JoinLeaguePage({ params }: { params: Promise<{ code: string }> }) {
  if (!hasSupabasePublicEnv()) {
    return <SetupNotice />;
  }

  const { code } = await params;
  const supabase = await createClient();

  // Public-by-code preview so we can show the league name before the user joins.
  const { data } = await supabase.rpc('league_by_invite', { p_invite_code: code });
  const preview = (Array.isArray(data) ? data[0] : data) as Preview | undefined;

  if (!preview) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <h1 className="text-2xl font-black">Invite not found</h1>
        <p className="mt-3 text-gray-300">This invite link is invalid or the league no longer exists.</p>
        <Link href="/leagues" className="btn btn-primary mt-5 px-6 py-3">Go to leagues</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <section className="stadium-hero relative overflow-hidden rounded-[2rem] border border-white/10 p-6 text-center shadow-glow sm:p-8">
        <div className="pitch-lines pointer-events-none absolute inset-0 opacity-45" />
        <div className="relative">
          <p className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-300/12 px-4 py-2 text-sm font-bold text-emerald-100">
            <Users size={16} /> League invite
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{preview.name}</h1>
          <p className="mt-3 text-gray-200">
            {preview.member_count} {preview.member_count === 1 ? 'member' : 'members'} already in. Join to compete with them all tournament.
          </p>
          <div className="mt-6 flex justify-center">
            <JoinLeagueButton inviteCode={code} />
          </div>
        </div>
      </section>
    </div>
  );
}
