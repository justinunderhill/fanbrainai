'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/browser';
import type { Competition } from '@/lib/types';

/** Inline "start a league" form. Calls the create_league RPC then routes to the
 *  new league's page. The owner is enrolled as a member by the RPC itself.
 *  Only active competitions are offered for scoping — a league can't be
 *  created against an archived/finished tournament. */
export function CreateLeagueForm({ competitions = [] }: { competitions?: Competition[] }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [name, setName] = useState('');
  const [competitionId, setCompetitionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeCompetitions = competitions.filter((c) => c.is_active);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('create_league', {
      p_name: trimmed,
      p_competition_id: competitionId || null,
    });

    if (rpcError || !data) {
      setError('Could not create the league. Please try again.');
      setBusy(false);
      return;
    }

    // create_league returns the new row (object, or single-element array via PostgREST).
    const league = Array.isArray(data) ? data[0] : data;
    router.push(`/leagues/${league.id}`);
    router.refresh();
  }

  if (!loading && !user) return null;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-lg font-black">Start a private league</h2>
      <p className="mt-1 text-sm text-gray-400">Create a league and share the invite link with your group chat.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
          maxLength={60}
          aria-label="League name"
          placeholder="e.g. Office League"
          className="input-game w-full rounded-2xl border border-white/10 bg-gray-950 px-4 py-3 text-sm"
        />
        {activeCompetitions.length > 0 && (
          <select
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            aria-label="Scope to a competition (optional)"
            className="input-game rounded-2xl border border-white/10 bg-gray-950 px-4 py-3 text-sm sm:w-52"
          >
            <option value="">All competitions</option>
            {activeCompetitions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={create}
          disabled={busy || !name.trim()}
          className="btn btn-primary shrink-0 px-6 py-3"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {busy ? 'Creating...' : 'Create league'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-amber-200">{error}</p>}
    </section>
  );
}
