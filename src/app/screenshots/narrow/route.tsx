import { ImageResponse } from 'next/og';
import { connection } from 'next/server';

// PWA install screenshot (narrow / mobile form factor). See ../wide/route.tsx.
// See ../wide/route.tsx — Node-runtime, on-demand ImageResponse with cache headers.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIZE = { width: 720, height: 1280 };

const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' };

const FEATURES = [
  'Predict every match',
  'AI debriefs your calls',
  'Leaderboard & streaks',
];

export async function GET() {
  // See ../wide/route.tsx — opt out of prerender so `next start` serves it.
  await connection();
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 56px',
          background: 'linear-gradient(160deg, #04130f 0%, #030712 55%, #0b1220 100%)',
          color: '#f9fafb',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em', color: '#6ee7b7' }}>
          FanBrain AI
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'flex', fontSize: '72px', fontWeight: 800, lineHeight: 1.05, color: '#ffffff' }}>
            Your World Cup, scored.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '36px', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', width: '14px', height: '14px', borderRadius: '999px', background: '#34d399' }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: '28px', color: '#94a3b8' }}>fanbrainai.com</div>
      </div>
    ),
    { ...SIZE, headers: CACHE_HEADERS },
  );
}
