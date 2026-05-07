import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Exporter mes données — ADDMarket' }

export default async function DataExportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Exporter mes données</h1>
      <p className="mb-8 text-sm text-gray-500">
        Conformément au RGPD (art. 15 et 20), vous pouvez obtenir une copie de toutes vos données
        personnelles stockées sur ADDMarket.
      </p>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Contenu de l&apos;export</h2>
        <ul className="mb-6 space-y-1.5 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-600">✓</span>
            Informations de compte (email, date de création)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-600">✓</span>
            Profil (nom, ville, région, église)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-600">✓</span>
            Historique des demandes de vérification
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-600">✓</span>
            Consentements et préférences
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-green-600">✓</span>
            Demandes de suppression de compte
          </li>
        </ul>

        <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Note :</strong> Le numéro de téléphone est chiffré et le numéro de carte est haché
          — ces données ne peuvent pas être exportées en clair. Contactez{' '}
          <a href="mailto:dpo@addmarket.fr" className="underline">
            dpo@addmarket.fr
          </a>{' '}
          pour y accéder.
        </div>

        <a
          href="/api/account/export"
          download
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Télécharger mon export JSON
        </a>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Pour toute question :{' '}
        <a href="mailto:dpo@addmarket.fr" className="underline">
          dpo@addmarket.fr
        </a>{' '}
        ·{' '}
        <Link href="/legal/privacy" className="underline">
          Politique de confidentialité
        </Link>
      </p>
    </div>
  )
}
