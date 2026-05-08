import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = "ADDMarket — Marketplace Assemblées de Dieu de Côte d'Ivoire"

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 60%, #172554 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 24,
        padding: 80,
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: 120,
          height: 120,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            color: '#fff',
            fontSize: 52,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            lineHeight: 1,
          }}
        >
          A
        </div>
        <div
          style={{
            color: '#93c5fd',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            letterSpacing: 4,
          }}
        >
          ADD
        </div>
      </div>

      <div
        style={{
          color: '#ffffff',
          fontSize: 64,
          fontWeight: 800,
          fontFamily: 'sans-serif',
          textAlign: 'center',
          lineHeight: 1.1,
        }}
      >
        ADDMarket
      </div>
      <div
        style={{
          color: '#93c5fd',
          fontSize: 28,
          fontFamily: 'sans-serif',
          textAlign: 'center',
          maxWidth: 800,
        }}
      >
        Marketplace des membres Assemblées de Dieu — Côte d&apos;Ivoire
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        {['Achetez', 'Vendez', 'Échangez'].map((label) => (
          <div
            key={label}
            style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 100,
              padding: '8px 24px',
              color: '#e0f2fe',
              fontSize: 18,
              fontFamily: 'sans-serif',
              fontWeight: 600,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  )
}
