import { ImageResponse } from 'next/og'

export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 192,
        height: 192,
        background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
        borderRadius: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          color: '#ffffff',
          fontSize: 80,
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
          fontSize: 22,
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
