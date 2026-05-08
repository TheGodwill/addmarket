import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ADDMarket — Assemblées de Dieu CI',
    short_name: 'ADDMarket',
    description: "Marketplace communautaire des membres Assemblées de Dieu de Côte d'Ivoire",
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    orientation: 'portrait-primary',
    lang: 'fr',
    categories: ['shopping', 'social'],
    icons: [
      { src: '/icon.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: 'Rechercher',
        url: '/search',
        icons: [{ src: '/icon.png', sizes: '96x96' }],
      },
      {
        name: 'Vendre',
        url: '/sell/dashboard',
        icons: [{ src: '/icon.png', sizes: '96x96' }],
      },
    ],
  }
}
