import type { ReactNode } from 'react'
import Link from 'next/link'

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            ADDMarket
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link href="/account/security" className="text-gray-600 hover:text-gray-900">
              Sécurité
            </Link>
            <Link href="/account/consents" className="text-gray-600 hover:text-gray-900">
              Consentements
            </Link>
            <Link href="/account/data-export" className="text-gray-600 hover:text-gray-900">
              Mes données
            </Link>
            <Link href="/account/delete" className="text-red-600 hover:text-red-700">
              Supprimer le compte
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  )
}
