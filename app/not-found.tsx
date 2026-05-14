import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Page introuvable — ADDMarket' }

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-extrabold text-blue-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Page introuvable</h1>
      <p className="mt-2 text-sm text-gray-500">Cette page n&apos;existe pas ou a été déplacée.</p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/search"
          className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Rechercher
        </Link>
      </div>
    </main>
  )
}
