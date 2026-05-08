import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { CookieBanner } from '@/components/legal/cookie-banner'
import { BetaBanner } from '@/components/beta/beta-banner'
import { FeedbackWidget } from '@/components/beta/feedback-widget'
import { SiteHeader } from '@/components/nav/site-header'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://addmarket.ci'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'ADDMarket',
    template: '%s | ADDMarket',
  },
  description:
    "Marketplace communautaire des membres vérifiés des Assemblées de Dieu de Côte d'Ivoire. Achetez, vendez et échangez en toute confiance.",
  keywords: ['assemblées de dieu', "côte d'ivoire", 'marketplace', 'ADD', 'EEADCI'],
  authors: [{ name: 'ADDMarket' }],
  creator: 'ADDMarket',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    locale: 'fr_CI',
    url: APP_URL,
    siteName: 'ADDMarket',
    title: 'ADDMarket — Marketplace Assemblées de Dieu CI',
    description:
      "Achetez, vendez et échangez entre membres vérifiés des Assemblées de Dieu de Côte d'Ivoire.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ADDMarket',
    description: 'Marketplace communautaire des Assemblées de Dieu CI',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ADDMarket',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <BetaBanner />
        <SiteHeader />
        {children}
        <CookieBanner />
        <FeedbackWidget />
      </body>
    </html>
  )
}
