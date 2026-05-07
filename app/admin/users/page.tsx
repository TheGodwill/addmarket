import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { desc, like } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/db/client'
import { auditLog, churches } from '@/db/schema'
import { can, resolveUserRole, type AppRole } from '@/lib/auth/permissions'
import { PromoteForm } from '@/components/admin/promote-form'
import { RevokeForm } from '@/components/admin/revoke-form'

export const metadata: Metadata = { title: 'Admin — Utilisateurs' }

const ROLE_LABELS: Record<string, string> = {
  member: 'Membre',
  referent: 'Référent',
  admin_local: 'Admin local',
  admin_national: 'Admin national',
  support: 'Support',
}

const ROLE_COLORS: Record<string, string> = {
  member: 'bg-gray-100 text-gray-700',
  referent: 'bg-blue-100 text-blue-700',
  admin_local: 'bg-purple-100 text-purple-700',
  admin_national: 'bg-red-100 text-red-700',
  support: 'bg-yellow-100 text-yellow-700',
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const actorRole = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(actorRole, 'admin.users.read')) redirect('/')

  const sp = await searchParams
  const query = (sp.q ?? '').toLowerCase()
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))

  const admin = createAdminClient()
  const { data: usersData } = await admin.auth.admin.listUsers({ page, perPage: 50 })
  const allUsers = usersData?.users ?? []

  const displayedUsers = query
    ? allUsers.filter(
        (u) =>
          u.email?.toLowerCase().includes(query) ||
          ((u.user_metadata?.display_name as string) ?? '').toLowerCase().includes(query),
      )
    : allUsers

  const churchList = await db
    .select({ id: churches.id, name: churches.name, city: churches.city })
    .from(churches)
    .orderBy(churches.name)

  const recentChanges = await db
    .select()
    .from(auditLog)
    .where(like(auditLog.action, 'role.%'))
    .orderBy(desc(auditLog.createdAt))
    .limit(10)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <a href="/admin/verifications" className="text-sm text-blue-600 hover:underline">
            ← Vérifications
          </a>
        </div>

        {/* Search */}
        <form method="GET" className="mb-6">
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="Rechercher par email ou nom..."
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:max-w-sm"
          />
        </form>

        {/* Users table */}
        <section className="mb-10">
          <h2 className="mb-3 text-base font-semibold text-gray-700">
            Utilisateurs ({displayedUsers.length})
          </h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Utilisateur</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Rôle actuel</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Attribuer un rôle
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Révoquer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedUsers.map((u) => {
                  const role = ((u.app_metadata?.role as string) ?? 'member') as AppRole
                  const isSelf = u.id === user.id
                  const canRevoke = !isSelf && role !== 'member'
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{u.email ?? '—'}</p>
                        <p className="text-xs text-gray-500">
                          {(u.user_metadata?.display_name as string) ?? ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-700'}`}
                        >
                          {ROLE_LABELS[role] ?? role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {isSelf ? (
                          <span className="text-xs text-gray-400">Vous-même</span>
                        ) : (
                          <PromoteForm
                            targetId={u.id}
                            churches={churchList}
                            actorRole={actorRole}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">{canRevoke && <RevokeForm targetId={u.id} />}</td>
                    </tr>
                  )
                })}
                {displayedUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex items-center gap-3 text-sm">
            {page > 1 && (
              <a
                href={`?${query ? `q=${encodeURIComponent(sp.q ?? '')}&` : ''}page=${page - 1}`}
                className="text-blue-600 hover:underline"
              >
                ← Page précédente
              </a>
            )}
            {allUsers.length === 50 && (
              <a
                href={`?${query ? `q=${encodeURIComponent(sp.q ?? '')}&` : ''}page=${page + 1}`}
                className="text-blue-600 hover:underline"
              >
                Page suivante →
              </a>
            )}
          </div>
        </section>

        {/* Role change history */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-gray-700">
            Historique des changements de rôle (10 derniers)
          </h2>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Avant</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Après</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentChanges.map((entry) => {
                  const meta = entry.metadata as { before?: string; after?: string } | null
                  return (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{entry.action}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{meta?.before ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{meta?.after ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(entry.createdAt).toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  )
                })}
                {recentChanges.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">
                      Aucun changement de rôle enregistré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
