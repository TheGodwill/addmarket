import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { CookieBanner } from '@/components/legal/cookie-banner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'ADDMarket',
    template: '%s | ADDMarket',
  },
  description: 'Marketplace communautaire des Assemblées de Dieu',
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}
