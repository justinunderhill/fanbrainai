import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';

// Dynamic OG image as a Route Handler (see /p/[token]/og for why the file convention
// is avoided in this Next version). Renders the public leaderboard podium so a shared
// /leaderboard link unfurls with the current top fans. No token — the board is public.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIZE = { width: 1200, height: 630 };

type Row = {
  user_id: string;
  display_name: string | null;
  total_points: number;
  exact_scores: number;
  total_predictions: number;
};

const MEDALS = ['#fbbf24', '#cbd5e1', '#f59e0b'];

export async function GET() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('leaderboard')
    .select('user_id, display_name, total_points, exact_scores, total_predictions')
    .order('total_points', { ascending: false })
    .limit(3);
  const podium = (data ?? []) as Row[];

  // Aggregate footer stats across the whole board (not just the podium).
  const { data: allRows } = await supabase.from('leaderboard').select('total_predictions, exact_scores');
  const fans = allRows?.length ?? 0;
  const picks = (allRows ?? []).reduce((sum, r) => sum + (r.total_predictions ?? 0), 0);
  const exact = (allRows ?? []).reduce((sum, r) => sum + (r.exact_scores ?? 0), 0);

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
          <div style={{ display: 'flex', fontSize: '30px', fontWeight: 800, letterSpacing: '-0.02em', color: '#6ee7b7' }}>FanBrain AI</div>
          <div style={{ display: 'flex', fontSize: '26px', color: '#94a3b8' }}>· World Cup leaderboard</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {podium.length > 0 ? (
            podium.map((row, i) => (
              <div key={row.user_id} style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    width: '64px',
                    height: '64px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '999px',
                    border: `4px solid ${MEDALS[i]}`,
                    fontSize: '34px',
                    fontWeight: 800,
                    color: MEDALS[i],
                  }}
                >
                  {String(i + 1)}
                </div>
                <div style={{ display: 'flex', fontSize: '46px', fontWeight: 800, color: '#ffffff' }}>
                  {row.display_name ?? 'Anonymous fan'}
                </div>
                <div style={{ display: 'flex', marginLeft: 'auto', fontSize: '46px', fontWeight: 800, color: '#6ee7b7' }}>
                  {`${row.total_points} pts`}
                </div>
              </div>
            ))
          ) : (
            <div style={{ display: 'flex', fontSize: '56px', fontWeight: 800, color: '#ffffff' }}>The board is wide open</div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '40px' }}>
            <Stat label="Fans" value={fans} />
            <Stat label="Picks" value={picks} />
            <Stat label="Exact" value={exact} />
          </div>
          <div style={{ display: 'flex', fontSize: '28px', color: '#94a3b8' }}>Can you beat them? · fanbrainai.com</div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontSize: '44px', fontWeight: 800, color: '#ffffff' }}>{String(value)}</div>
      <div style={{ display: 'flex', fontSize: '24px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}
