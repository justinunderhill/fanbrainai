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
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-3xl font-black">Your FanBrain profile</h1>
        <p className="mt-3 text-gray-300">Sign in and make at least five predictions to unlock your AI fan personality.</p>
      </div>
    );
  }

  const { data: profile } = await supabase.from('fan_profiles').select('*').eq('user_id', auth.user.id).maybeSingle();
  const { data: userRow } = await supabase.from('users').select('display_name').eq('id', auth.user.id).maybeSingle();

  return (
    <div className="max-w-2xl rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <h1 className="text-3xl font-black">Your FanBrain profile</h1>
      {!profile ? (
        <>
          <p className="mt-3 text-gray-300">No AI profile yet. Make at least five predictions, then generate your profile.</p>
          <GenerateProfileButton userId={auth.user.id} displayName={userRow?.display_name} />
        </>
      ) : (
        <div className="mt-5 space-y-4">
          <h2 className="text-2xl font-black text-emerald-300">{profile.personality_type}</h2>
          <p className="text-gray-200">{profile.summary}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Logic" value={profile.logic_score} />
            <Metric label="Chaos" value={profile.chaos_score} />
            <Metric label="Loyalty" value={profile.loyalty_score} />
            <Metric label="Risk" value={profile.risk_score} />
          </div>
          <div className="border-t border-white/10 pt-4">
            <p className="text-sm text-gray-400">Made more picks since this was generated? Refresh your read.</p>
            <GenerateProfileButton userId={auth.user.id} displayName={userRow?.display_name} hasProfile />
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-white/5 p-4"><p className="text-gray-400">{label}</p><p className="text-2xl font-black">{value}</p></div>;
}
