import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { notificationPrefs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { NotifToggle } from './notif-toggle'

export const metadata: Metadata = { title: 'Notifications' }

const PREF_LABELS: Record<string, { label: string; description: string }> = {
  new_message: {
    label: 'Nouveau message',
    description: "Recevoir un email quand quelqu'un vous envoie un message.",
  },
  new_review: {
    label: 'Nouvel avis',
    description: 'Recevoir un email quand un acheteur laisse un avis sur votre profil vendeur.',
  },
  review_response: {
    label: 'Réponse à un avis',
    description: 'Recevoir un email quand un vendeur répond à votre avis.',
  },
  verification_update: {
    label: 'Vérification de compte',
    description: 'Recevoir un email lors des mises à jour de votre statut de vérification.',
  },
}

const ALL_TYPES = ['new_message', 'new_review', 'review_response', 'verification_update'] as const

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const rows = await db
    .select({ type: notificationPrefs.type, enabled: notificationPrefs.enabled })
    .from(notificationPrefs)
    .where(eq(notificationPrefs.userId, user.id))

  // Build map of current prefs; default to true if no row
  const prefMap = new Map(rows.map((r) => [r.type, r.enabled]))

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-xl font-bold text-gray-900">Préférences de notification</h1>
      <p className="mb-8 text-sm text-gray-500">
        Choisissez les emails que vous souhaitez recevoir d&apos;ADDMarket.
      </p>

      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {ALL_TYPES.map((type) => {
          const { label, description } = PREF_LABELS[type] ?? { label: type, description: '' }
          const enabled = prefMap.get(type) ?? true
          return (
            <div key={type} className="flex items-start justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{description}</p>
              </div>
              <NotifToggle type={type} channel="email" initialEnabled={enabled} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
