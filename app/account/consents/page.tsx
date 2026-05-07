import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { consents, CONSENT_TYPES } from '@/db/schema'
import { ConsentsForm } from './consents-form'

export const metadata: Metadata = { title: 'Mes consentements — ADDMarket' }

const CONSENT_LABELS: Record<string, { label: string; description: string }> = {
  analytics: {
    label: 'Analytics (PostHog)',
    description: "Mesure d'audience anonymisée, hébergée dans l'UE. Aide à améliorer ADDMarket.",
  },
  marketing_emails: {
    label: 'Emails marketing',
    description: 'Newsletters et communications sur les nouveautés ADDMarket.',
  },
}

export default async function ConsentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const userConsents = await db.select().from(consents).where(eq(consents.userId, user.id))

  const consentMap = Object.fromEntries(userConsents.map((c) => [c.consentType, c.granted]))

  const consentItems = CONSENT_TYPES.map((type) => ({
    type,
    label: CONSENT_LABELS[type]?.label ?? type,
    description: CONSENT_LABELS[type]?.description ?? '',
    granted: consentMap[type] ?? false,
    updatedAt: userConsents.find((c) => c.consentType === type)?.updatedAt?.toISOString() ?? null,
  }))

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Mes consentements</h1>
      <p className="mb-8 text-sm text-gray-500">
        Gérez vos préférences de confidentialité. Vous pouvez révoquer un consentement à tout
        moment.
      </p>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Cookies essentiels</p>
            <p className="text-xs text-gray-500">
              Session d&apos;authentification, sécurité. Indispensables au service.
            </p>
          </div>
          <span className="text-xs font-medium text-green-700">Toujours actif</span>
        </div>
      </div>

      <ConsentsForm consentItems={consentItems} />
    </div>
  )
}
