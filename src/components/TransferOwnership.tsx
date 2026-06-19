'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Crown } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

type Member = { user_id: string; display_name: string | null };

/**
 * Owner-only control to hand the league to another member. Calls the
 * transfer_league_ownership RPC (which enforces caller-is-owner and
 * target-is-member), then refreshes — after which the page re-renders with the
 * caller as a regular member.
 */
export function TransferOwnership({ leagueId, members }: { leagueId: string; members: Member[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (members.length === 0) return null;

  async function transfer() {
    if (busy || !selected) return;
    const name = members.find((m) => m.user_id === selected)?.display_name ?? 'this member';
    if (!window.confirm(`Make ${name} the owner? You'll become a regular member and can then leave.`)) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('transfer_league_ownership', {
      p_league: leagueId,
      p_new_owner: selected,
    });

    if (rpcError) {
      setError('Could not transfer ownership. Please try again.');
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <p className="flex items-center gap-2 text-sm font-black text-amber-100">
        <Crown size={16} /> Transfer ownership
      </p>
      <p className="mt-1 text-sm text-gray-400">Hand the league to another member. You&apos;ll stay in as a regular member.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          aria-label="New owner"
          className="input-game w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3 text-sm"
        >
          <option value="">Choose a member...</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.display_name ?? 'Anonymous fan'}</option>
          ))}
        </select>
        <button onClick={transfer} disabled={busy || !selected} className="btn btn-ghost shrink-0 px-6 py-3">
          {busy ? 'Transferring...' : 'Transfer'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
    </div>
  );
}
