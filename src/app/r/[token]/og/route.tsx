import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import { pointsBadge } from '@/lib/scoring';
import type { MatchWithTeams } from '@/lib/types';

// Dynamic OG image as a Route Handler rather than the `opengraph-image` file convention:
// in this Next version the convention fails on dynamic routes ("failed to pipe response"
// on Node, empty body on edge). A route handler returns the ImageResponse as a normal
// Response on the Node runtime, where the admin client already works. Mirrors /p/[token]/og.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIZE = { width: 1200, height: 630 };

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();
  const { data: prediction } = await supabase
    .from('predictions')
    .select('user_id, match_id, predicted_home_score, predicted_away_score, points_awarded')
    .eq('share_token', token)
    .maybeSingle();

  let match: MatchWithTeams | null = null;
  let displayName = 'A FanBrain fan';
  if (prediction) {
    const { data: matchRow } = await supabase
      .from('matches_with_teams')
      .select('*')
      .eq('id', prediction.match_id)
      .maybeSingle();
    match = (matchRow as MatchWithTeams | null) ?? null;

    const { data: userRow } = await supabase.from('users').select('display_name').eq('id', prediction.user_id).maybeSingle();
    displayName = userRow?.display_name?.trim() || displayName;
  }

  // Branded fallback when the token doesn't resolve (or the match isn't final yet),
  // so the link still unfurls cleanly.
  const settled = Boolean(prediction && match && match.status === 'final');
  const homeName = match?.home_team.name ?? 'World Cup';
  const awayName = match?.away_team.name ?? 'predictions';
  const finalScore = settled ? `${match!.home_score ?? 0} – ${match!.away_score ?? 0}` : '';
  const called = settled ? `${prediction!.predicted_home_score} – ${prediction!.predicted_away_score}` : '';
  const badge = settled ? pointsBadge(prediction!.points_awarded) : null;
  const badgeColor = badge?.label.startsWith('+5')
    ? '#34d399'
    : badge?.label.startsWith('+3')
      ? '#fbbf24'
      : '#94a3b8';

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
          <div style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.02em', color: '#6ee7b7' }}>FanBrain AI</div>
          <div style={{ fontSize: '26px', color: '#94a3b8' }}>· Prediction result</div>
        </div>

        {settled ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '30px', color: '#cbd5e1' }}>{`${homeName} vs ${awayName}`}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
              <div style={{ fontSize: '92px', fontWeight: 800, lineHeight: 1, color: '#ffffff' }}>{finalScore}</div>
              <div style={{ fontSize: '30px', color: '#94a3b8' }}>full time</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', fontSize: '34px', color: '#cbd5e1' }}>
              <span>{`${displayName} called`}</span>
              <span style={{ fontWeight: 800, color: '#6ee7b7' }}>{called}</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '64px', fontWeight: 800, lineHeight: 1.1, color: '#ffffff' }}>
              Rate every World Cup call
            </div>
            <div style={{ fontSize: '30px', marginTop: '12px', color: '#cbd5e1' }}>
              AI debriefs, points, and your fan personality.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {badge ? (
            <div
              style={{
                display: 'flex',
                fontSize: '36px',
                fontWeight: 800,
                color: badgeColor,
                border: `3px solid ${badgeColor}`,
                borderRadius: '999px',
                padding: '14px 36px',
              }}
            >
              {badge.label}
            </div>
          ) : (
            <div style={{ fontSize: '28px', color: '#94a3b8' }}>fanbrainai.com</div>
          )}
          {badge && <div style={{ fontSize: '28px', color: '#94a3b8' }}>fanbrainai.com</div>}
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        // Cacheable so social scrapers (WhatsApp/X/Facebook) fetch reliably; short enough
        // that a regenerated debrief refreshes within the hour.
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
