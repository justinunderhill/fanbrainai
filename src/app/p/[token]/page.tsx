import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrainCircuit, ShieldCheck } from 'lucide-react';
import { FanProfileTraits } from '@/components/FanProfileTraits';
import { createAdminClient } from '@/lib/supabase/admin';

type SharedProfile = {
  user_id: string;
  personality_type: string;
  logic_score: number;
  chaos_score: number;
  loyalty_score: number;
  risk_score: number;
  summary: string;
};

// Public, unlisted page. The token is an unguessable UUID read via the service-role
// admin client, so owner-only RLS is untouched. Only the fields below are ever exposed —
// never predictions, email, or user_id (beyond the internal display-name lookup).
async function getSharedProfile(token: string): Promise<{ profile: SharedProfile; displayName: string } | null> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('fan_profiles')
    .select('user_id, personality_type, logic_score, chaos_score, loyalty_score, risk_score, summary')
    .eq('share_token', token)
    .maybeSingle();

  if (!profile) return null;

  const { data: userRow } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', profile.user_id)
    .maybeSingle();

  return { profile, displayName: userRow?.display_name?.trim() || 'A FanBrain fan' };
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const result = await getSharedProfile(token);

  if (!result) {
    return { title: 'Profile not found · FanBrain AI' };
  }

  const title = `${result.displayName} is a ${result.profile.personality_type} · FanBrain`;
  const description = result.profile.summary;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: [`/p/${token}/opengraph-image`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/p/${token}/opengraph-image`],
    },
  };
}

export default async function SharedProfilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getSharedProfile(token);

  if (!result) notFound();

  const { profile, displayName } = result;

  return (
    <div className="space-y-6">
      <section className="stadium-hero relative overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-glow sm:p-8">
        <div className="pitch-lines pointer-events-none absolute inset-0 opacity-45" />
        <div className="relative max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-300/12 px-4 py-2 text-sm font-bold text-emerald-100">
            <BrainCircuit size={16} /> Fan personality
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{displayName}&rsquo;s FanBrain profile</h1>
          <p className="mt-3 text-gray-200">An AI personality read built from World Cup prediction behaviour.</p>
        </div>
      </section>

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
          </div>
        </div>

        <FanProfileTraits scores={profile} />
      </section>

      <section className="card-gradient relative overflow-hidden rounded-3xl border border-white/10 p-6 text-center shadow-glow sm:p-8">
        <span className="field-arc pointer-events-none absolute inset-x-5 top-0 h-20 opacity-60" />
        <div className="relative mx-auto max-w-xl">
          <h2 className="text-2xl font-black sm:text-3xl">Find your World Cup fan personality</h2>
          <p className="mt-3 text-gray-300">FanBrain turns your match predictions into an AI fan profile and rates every pick.</p>
          <Link href="/" className="btn btn-primary mt-6 px-6 py-3">Try FanBrain</Link>
        </div>
      </section>
    </div>
  );
}
