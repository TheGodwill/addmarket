import type { MetadataRoute } from 'next'
import { clientEnv } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? 'https://addmarket.fr'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/sellers/', '/listings/'],
        disallow: ['/admin/', '/sell/', '/api/', '/referent/', '/account/', '/onboarding'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
