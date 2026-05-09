import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Shield,
  Bell,
  FileText,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/db/client'
import { profiles, sellerProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const metadata: Metadata = { title: 'Mon compte — ADDMarket' }

const STATUS_CONFIG = {
  verified: {
    label: 'Membre vérifié',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
  },
  pending: {
    label: 'Vérification en cours',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
  expired: {
    label: 'Adhésion expirée',
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
  },
  rejected: {
    label: 'Vérification refusée',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
  },
  suspended: {
    label: 'Compte suspendu',
    icon: XCircle,
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
  },
} as const

const ACCOUNT_LINKS = [
  {
    href: '/account/verification',
    icon: CheckCircle,
    label: 'Vérification membre',
    desc: 'Statut et demande de vérification',
  },
  {
    href: '/account/security',
    icon: Shield,
    label: 'Sécurité',
    desc: 'Mot de passe et double authentification',
  },
  {
    href: '/account/notifications',
    icon: Bell,
    label: 'Notifications',
    desc: 'Préférences de notifications email',
  },
  {
    href: '/account/consents',
    icon: FileText,
    label: 'Consentements',
    desc: 'Gestion de vos consentements RGPD',
  },
  {
    href: '/account/data-export',
    icon: Download,
    label: 'Mes données',
    desc: 'Télécharger une copie de vos données',
  },
]

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const [profile, seller] = await Promise.all([
    db
      .select({
        displayName: profiles.displayName,
        membershipStatus: profiles.membershipStatus,
        expiresAt: profiles.expiresAt,
        city: profiles.city,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1)
      .then((r) => r.at(0)),
    db
      .select({ slug: sellerProfiles.slug })
      .from(sellerProfiles)
      .where(eq(sellerProfiles.userId, user.id))
      .limit(1)
      .then((r) => r.at(0)),
  ])

  if (!profile) redirect('/auth/login')

  const statusKey = (profile.membershipStatus ?? 'pending') as keyof typeof STATUS_CONFIG
  const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending
  const StatusIcon = status.icon

  const expiryStr = profile.expiresAt
    ? profile.expiresAt.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profile.displayName}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{user.email}</p>
            {profile.city && <p className="mt-0.5 text-sm text-gray-400">{profile.city}</p>}
          </div>

          {/* Membership badge */}
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${status.bg}`}>
            <StatusIcon className={`h-4 w-4 ${status.color}`} aria-hidden />
            <div>
              <p className={`text-sm font-semibold ${status.color}`}>{status.label}</p>
              {expiryStr && statusKey === 'verified' && (
                <p className="text-xs text-gray-500">jusqu&apos;au {expiryStr}</p>
              )}
            </div>
          </div>
        </div>

        {/* Seller shortcut */}
        {seller && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <Link
              href="/sell/dashboard"
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden />
              Accéder à mon espace vendeur
              <ChevronRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        )}
      </div>

      {/* Account sections */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <ul className="divide-y divide-gray-100">
          {ACCOUNT_LINKS.map(({ href, icon: Icon, label, desc }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Icon className="h-4 w-4 text-gray-600" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-100 bg-white shadow-sm">
        <Link href="/account/delete" className="flex items-center gap-4 px-6 py-4 hover:bg-red-50">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100">
            <Trash2 className="h-4 w-4 text-red-600" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-red-700">Supprimer mon compte</p>
            <p className="text-xs text-gray-500">Suppression définitive de toutes vos données</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
