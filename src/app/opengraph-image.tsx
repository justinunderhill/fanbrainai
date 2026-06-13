import { ImageResponse } from 'next/og';

export const alt = 'FanBrain AI — find your World Cup fan personality';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #04130f 0%, #030712 55%, #0b1220 100%)',
          color: '#f9fafb',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: '34px', fontWeight: 800, color: '#6ee7b7', letterSpacing: '-0.02em' }}>FanBrain AI</div>
        <div style={{ fontSize: '76px', fontWeight: 800, lineHeight: 1.08, marginTop: '20px', maxWidth: '900px' }}>
          Find your World Cup fan personality
        </div>
        <div style={{ fontSize: '32px', color: '#cbd5e1', marginTop: '24px', maxWidth: '880px' }}>
          AI rates every prediction and turns your picks into a fan profile.
        </div>
      </div>
    ),
    size,
  );
}
