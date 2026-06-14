import Link from 'next/link';
import { BrainCircuit, Flame, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { GenerateProfileButton } from '@/components/GenerateProfileButton';
import { ShareProfileButton } from '@/components/ShareProfileButton';
import { FanProfileTraits } from '@/components/FanProfileTraits';
import { SetupNotice } from '@/components/SetupNotice';
import { currentStreak } from '@/lib/scoring';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import type { MatchWithTeams, Prediction } from '@/lib/types';

export default async function ProfilePage() {
  if (!hasSupabasePublicEnv()) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return (
      <section className="stadium-hero relative overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-glow sm:p-8">
        <div className="pitch-lines pointer-events-none absolute inset-0 opacity-45" />
        <div className="relative max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-300/12 px-4 py-2 text-sm font-bold text-emerald-100">
            <BrainCircuit size={16} /> Fan identity
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Your FanBrain profile</h1>
          <p className="mt-3 text-gray-200">Sign in and make at least five predictions to unlock your AI fan personality.</p>
          <Link href="/auth?next=/profile" className="btn btn-primary mt-6 px-6 py-3">Sign in</Link>
        </div>
      </section>
    );
  }

  const { data: profile } = await supabase.from('fan_profiles').select('*').eq('user_id', auth.user.id).maybeSingle();
  const { data: userRow } = await supabase.from('users').select('display_name').eq('id', auth.user.id).maybeSingle();

  // Prediction streak: 🔥 correct calls in a row across settled picks (see currentStreak).
  const { data: predictionData } = await supabase
    .from('predictions')
    .select('match_id, points_awarded')
    .eq('user_id', auth.user.id);
  const predictions = (predictionData ?? []) as Pick<Prediction, 'match_id' | 'points_awarded'>[];
  let streak = { current: 0, best: 0 };
  if (predictions.length > 0) {
    const { data: matchData } = await supabase
      .from('matches_with_teams')
      .select('id, status, kickoff_time')
      .in('id', predictions.map((p) => p.match_id))
      .eq('status', 'final');
    const matchesById = new Map(
      ((matchData ?? []) as Pick<MatchWithTeams, 'id' | 'status' | 'kickoff_time'>[]).map((m) => [m.id, m]),
    );
    const settled = predictions
      .map((prediction) => ({ prediction, match: matchesById.get(prediction.match_id) }))
      .filter((row): row is { prediction: typeof row.prediction; match: NonNullable<typeof row.match> } => Boolean(row.match));
    streak = currentStreak(settled);
  }

  return (
    <div className="space-y-6">
      <section className="stadium-hero relative overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-glow sm:p-8">
        <div className="pitch-lines pointer-events-none absolute inset-0 opacity-45" />
        <div className="relative max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-300/12 px-4 py-2 text-sm font-bold text-emerald-100">
            <BrainCircuit size={16} /> Fan identity
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Your FanBrain profile</h1>
          <p className="mt-3 text-gray-200">A personality read built from your prediction behaviour, not personal attributes.</p>
          {streak.current >= 2 && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-orange-400/40 bg-orange-400/12 px-4 py-2 text-sm font-bold text-orange-200">
              <Flame size={16} /> {streak.current} correct calls in a row
              {streak.best > streak.current && <span className="text-orange-100/70">· best {streak.best}</span>}
            </p>
          )}
        </div>
      </section>

      {!profile ? (
        <section className="card-gradient relative overflow-hidden rounded-3xl border border-white/10 p-6 shadow-glow">
          <span className="field-arc pointer-events-none absolute inset-x-5 top-0 h-20 opacity-60" />
          <div className="relative max-w-xl">
            <Sparkles className="mb-4 text-amber-200" size={28} />
            <h2 className="text-2xl font-black">Personality pending</h2>
            <p className="mt-3 text-gray-300">No AI profile yet. Make at least five predictions, then generate your profile.</p>
          </div>
          <GenerateProfileButton userId={auth.user.id} displayName={userRow?.display_name} />
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card-gradient relative overflow-hidden rounded-3xl border border-white/10 p-6 shadow-glow">
            <span className="field-arc pointer-events-none absolute inset-x-5 top-0 h-20 opacity-60" />
            <div className="relative">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-amber-200">AI fan type</p>
                  <h2 className="mt-2 text-3xl font-black text-white">{profile.personality_type}</h2>
                </div>
                <div className="rounded-3xl border border-emerald-300/30 bg-emerald-300/12 p-4 text-emerald-100">
                  <ShieldCheck size={28} />
                </div>
              </div>
              <p className="text-lg leading-8 text-gray-200">{profile.summary}</p>
              <ShareProfileButton token={profile.share_token} personalityType={profile.personality_type} />
              <div className="mt-6 rounded-3xl border border-white/10 bg-gray-950/50 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-gray-300">
                  <RefreshCw size={15} className="text-amber-200" />
                  Made more picks since this was generated?
                </p>
                <GenerateProfileButton userId={auth.user.id} displayName={userRow?.display_name} hasProfile />
              </div>
            </div>
          </div>

          <FanProfileTraits scores={profile} />
        </section>
      )}
    </div>
  );
}
