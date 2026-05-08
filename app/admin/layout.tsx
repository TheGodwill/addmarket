import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { resolveUserRole, can } from '@/lib/auth/permissions'
import { db } from '@/db/client'
import { verificationRequests, moderationReports } from '@/db/schema'
import { count, eq, or } from 'drizzle-orm'

async function getAdminBadges(_userId: string) {
  try {
    const [verif, reports] = await Promise.all([
      db
        .select({ n: count(verificationRequests.id) })
        .from(verificationRequests)
        .where(eq(verificationRequests.status, 'pending'))
        .then((r) => Number(r.at(0)?.n ?? 0)),
      db
        .select({ n: count(moderationReports.id) })
        .from(moderationReports)
        .where(or(eq(moderationReports.status, 'new'), eq(moderationReports.status, 'in_review')))
        .then((r) => Number(r.at(0)?.n ?? 0)),
    ])
    return { verif, reports }
  } catch {
    return { verif: 0, reports: 0 }
  }
}

function Badge({ n }: { n: number }) {
  if (n === 0) return null
  return (
    <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
      {n > 99 ? '99+' : n}
    </span>
  )
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const role = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(role, 'audit.read.all')) redirect('/')

  const badges = await getAdminBadges(user.id)

  const navItems = [
    { href: '/admin', label: 'Tableau de bord' },
    { href: '/admin/verifications', label: 'Vérifications', badge: badges.verif },
    { href: '/admin/users', label: 'Utilisateurs' },
    { href: '/admin/reviews', label: 'Avis' },
    { href: '/moderation/reports', label: 'Signalements', badge: badges.reports },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-semibold text-blue-700">
              ADDMarket
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-700">Administration</span>
          </div>
          <Link href="/account" className="text-xs text-gray-500 hover:text-gray-700">
            Mon compte
          </Link>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center whitespace-nowrap rounded-t px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              {item.label}
              {'badge' in item && <Badge n={item.badge ?? 0} />}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  )
}
