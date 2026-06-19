'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Users } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/browser';

/** Confirms joining a league by invite code, then routes into the league. If the
 *  visitor isn't signed in, sends them through auth and back to this join page. */
export function JoinLeagueButton({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnTo = `/leagues/join/${inviteCode}`;

  async function join() {
    if (busy) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('join_league', { p_invite_code: inviteCode });

    if (rpcError || !data) {
      setError('Could not join this league. The invite may be invalid.');
      setBusy(false);
      return;
    }

    router.push(`/leagues/${data}`);
    router.refresh();
  }

  if (loading) {
    return <span className="btn btn-ghost px-6 py-3 text-gray-400">Checking sign-in...</span>;
  }

  if (!user) {
    return (
      <Link href={`/auth?next=${encodeURIComponent(returnTo)}`} className="btn btn-primary px-6 py-3">
        Sign in to join
      </Link>
    );
  }

  return (
    <div className="space-y-3">
      <button onClick={join} disabled={busy} className="btn btn-primary px-6 py-3">
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
        {busy ? 'Joining...' : 'Join this league'}
      </button>
      {error && <p className="text-sm text-amber-200">{error}</p>}
    </div>
  );
}
