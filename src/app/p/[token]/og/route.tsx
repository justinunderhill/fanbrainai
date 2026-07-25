import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import { fanTypePhrase } from '@/lib/utils';

// Dynamic OG image as a Route Handler rather than the `opengraph-image` file convention:
// in this Next version the convention fails on dynamic routes ("failed to pipe response"
// on Node, empty body on edge). A route handler returns the ImageResponse as a normal
// Response on the Node runtime, where the admin client already works.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIZE = { width: 1200, height: 630 };

const TRAITS = [
  { label: 'Logic', key: 'logic_score', color: '#34d399' },
  { label: 'Chaos', key: 'chaos_score', color: '#fb923c' },
  { label: 'Loyalty', key: 'loyalty_score', color: '#38bdf8' },
  { label: 'Risk', key: 'risk_score', color: '#fbbf24' },
] as const;

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('fan_profiles')
    .select('user_id, personality_type, logic_score, chaos_score, loyalty_score, risk_score')
    .eq('share_token', token)
    .maybeSingle();

  // Branded fallback when the token doesn't resolve, so the link still unfurls cleanly.
  const personalityType = profile?.personality_type ?? 'football fan';
  let displayName = 'A FanBrain fan';
  if (profile) {
    const { data: userRow } = await supabase.from('users').select('display_name').eq('id', profile.user_id).maybeSingle();
    displayName = userRow?.display_name?.trim() || displayName;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(135deg, #04130f 0%, #030712 55%, #0b1220 100%)',
          color: '#f9fafb',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              fontSize: '30px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#6ee7b7',
            }}
          >
            FanBrain AI
          </div>
          <div style={{ fontSize: '26px', color: '#94a3b8' }}>· Football fan personality</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '30px', color: '#cbd5e1' }}>{`${displayName} is`}</div>
          <div style={{ fontSize: '88px', fontWeight: 800, lineHeight: 1.05, marginTop: '8px', color: '#ffffff' }}>
            {fanTypePhrase(personalityType)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '28px' }}>
          {TRAITS.map((trait) => {
            const value = (profile?.[trait.key] as number | undefined) ?? 0;
            return (
              <div key={trait.label} style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '24px', color: '#e2e8f0' }}>
                  <span>{trait.label}</span>
                  <span style={{ fontWeight: 800, color: trait.color }}>{value}</span>
                </div>
                <div style={{ display: 'flex', width: '100%', height: '14px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px' }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', background: trait.color, borderRadius: '999px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        // Cacheable so social scrapers (WhatsApp/X/Facebook) fetch reliably; short enough
        // that a regenerated profile refreshes within the hour. Users can force-bust with
        // a ?v= query param on the share URL.
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
