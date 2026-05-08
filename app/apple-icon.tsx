import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
        borderRadius: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          color: '#ffffff',
          fontSize: 76,
          fontWeight: 900,
          fontFamily: 'sans-serif',
          letterSpacing: -4,
          lineHeight: 1,
        }}
      >
        A
      </div>
      <div
        style={{
          color: '#93c5fd',
          fontSize: 20,
          fontWeight: 700,
          fontFamily: 'sans-serif',
          letterSpacing: 4,
          marginTop: 4,
        }}
      >
        ADD
      </div>
    </div>,
    { ...size },
  )
}
