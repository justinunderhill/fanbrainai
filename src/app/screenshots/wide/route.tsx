import { ImageResponse } from 'next/og';
import { connection } from 'next/server';

// PWA install screenshot (wide / desktop form factor). Referenced from the web
// manifest's `screenshots` so Chrome/Android shows the richer, app-store-style
// install dialog instead of the minimal prompt. A branded promo card rendered
// with the same Node-runtime ImageResponse pattern as the OG routes — no binary
// asset to maintain, regenerates with the brand automatically.
// Matches the OG routes' proven setup: a Node-runtime, on-demand ImageResponse
// with cache headers. (force-static route handlers returning ImageResponse aren't
// reliably served by `next start`.) Fetched only at install time, so cheap.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIZE = { width: 1280, height: 720 };

const CACHE_HEADERS = { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' };

const FEATURES = [
  'Predict every World Cup match',
  'AI rates and debriefs your calls',
  'Climb the leaderboard & build streaks',
];

export async function GET() {
  // Opt out of build-time prerendering — a prerendered ImageResponse route handler
  // isn't reliably served by `next start`. Render on demand (cache headers below).
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
          padding: '80px',
          background: 'linear-gradient(135deg, #04130f 0%, #030712 55%, #0b1220 100%)',
          color: '#f9fafb',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: '38px', fontWeight: 800, letterSpacing: '-0.02em', color: '#6ee7b7' }}>
          FanBrain AI
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div style={{ display: 'flex', fontSize: '76px', fontWeight: 800, lineHeight: 1.05, color: '#ffffff' }}>
            Your World Cup, scored.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '34px', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', width: '14px', height: '14px', borderRadius: '999px', background: '#34d399' }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: '26px', color: '#94a3b8' }}>fanbrainai.com</div>
      </div>
    ),
    { ...SIZE, headers: CACHE_HEADERS },
  );
}
