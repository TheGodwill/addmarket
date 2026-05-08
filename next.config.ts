import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

// Headers statiques — la CSP dynamique (avec nonce) est dans middleware.ts
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    // geolocation=() removed — needed for /explore "near me" feature
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), payment=()',
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  typedRoutes: true,
  // mapbox-gl ships as ESM — tell webpack to treat it as external on the server
  // and use the browser bundle on the client
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = [...(config.externals ?? []), 'mapbox-gl']
    }
    return config
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? '',
  project: process.env.SENTRY_PROJECT ?? '',
  // exactOptionalPropertyTypes : inclure authToken seulement si défini
  ...(process.env.SENTRY_AUTH_TOKEN ? { authToken: process.env.SENTRY_AUTH_TOKEN } : {}),
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
})
