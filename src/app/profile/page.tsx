import Link from 'next/link';
import { BrainCircuit, Gauge, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { GenerateProfileButton } from '@/components/GenerateProfileButton';
import { SetupNotice } from '@/components/SetupNotice';
import { hasSupabasePublicEnv } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

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
              <div className="mt-6 rounded-3xl border border-white/10 bg-gray-950/50 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-gray-300">
                  <RefreshCw size={15} className="text-amber-200" />
                  Made more picks since this was generated?
                </p>
                <GenerateProfileButton userId={auth.user.id} displayName={userRow?.display_name} hasProfile />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gray-950/55 p-5 shadow-glow">
            <div className="mb-4 flex items-center gap-2">
              <Gauge size={18} className="text-emerald-300" />
              <h3 className="font-black">Prediction traits</h3>
            </div>
            <div className="space-y-3">
              <Metric label="Logic" value={profile.logic_score} tone="emerald" />
              <Metric label="Chaos" value={profile.chaos_score} tone="orange" />
              <Metric label="Loyalty" value={profile.loyalty_score} tone="sky" />
              <Metric label="Risk" value={profile.risk_score} tone="amber" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'orange' | 'sky' | 'amber' }) {
  const clamped = Math.max(0, Math.min(100, value));
  const toneClass = {
    emerald: 'from-emerald-300 to-teal-400',
    orange: 'from-orange-300 to-rose-400',
    sky: 'from-sky-300 to-cyan-400',
    amber: 'from-amber-200 to-yellow-400',
  }[tone];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-bold text-gray-200">{label}</p>
        <p className="text-2xl font-black tabular-nums text-white">{value}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${toneClass}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
