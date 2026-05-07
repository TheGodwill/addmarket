import type { ReactNode } from 'react'
import Link from 'next/link'

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            ADDMarket
          </Link>
          <nav className="flex gap-4 text-sm text-gray-600">
            <Link href="/legal/mentions" className="hover:text-gray-900">
              Mentions légales
            </Link>
            <Link href="/legal/privacy" className="hover:text-gray-900">
              Confidentialité
            </Link>
            <Link href="/legal/terms" className="hover:text-gray-900">
              CGU
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        ADDMarket — Marketplace des Assemblées de Dieu France
      </footer>
    </div>
  )
}
