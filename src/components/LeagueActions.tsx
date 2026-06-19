'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/browser';

/**
 * Destructive league actions. The owner sees "Delete league" (cascades to all
 * memberships); every other member sees "Leave league" (removes only their own
 * membership). Both rely on the RLS delete policies in supabase/schema.sql, so a
 * member can never delete the league and a non-owner only ever removes themselves.
 */
export function LeagueActions({ leagueId, isOwner }: { leagueId: string; isOwner: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    if (busy || !user) return;
    if (!window.confirm('Leave this league? Your picks stay, but you drop off this board.')) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: delError } = await supabase
      .from('league_members')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', user.id);

    if (delError) {
      setError('Could not leave the league. Please try again.');
      setBusy(false);
      return;
    }
    router.push('/leagues');
    router.refresh();
  }

  async function remove() {
    if (busy) return;
    if (!window.confirm('Delete this league for everyone? This cannot be undone.')) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: delError } = await supabase.from('leagues').delete().eq('id', leagueId);

    if (delError) {
      setError('Could not delete the league. Please try again.');
      setBusy(false);
      return;
    }
    router.push('/leagues');
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={isOwner ? remove : leave}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-60"
      >
        {isOwner ? <Trash2 size={16} /> : <LogOut size={16} />}
        {busy ? 'Working...' : isOwner ? 'Delete league' : 'Leave league'}
      </button>
      {error && <p className="text-sm text-amber-200">{error}</p>}
    </div>
  );
}
