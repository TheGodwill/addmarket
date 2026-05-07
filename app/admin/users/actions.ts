'use server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { and, eq } from 'drizzle-orm'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/db/client'
import { auditLog, churchReferents } from '@/db/schema'
import { checkRateLimit } from '@/lib/rate-limit'
import { can, resolveUserRole, APP_ROLES, type AppRole } from '@/lib/auth/permissions'
import { sendRoleChangeEmail } from '@/lib/email'
import { clientEnv } from '@/lib/env'

type ActionResult = { error: string } | { success: true }

// Roles assignable by each actor role
const ADMIN_LOCAL_ASSIGNABLE: ReadonlyArray<AppRole> = ['referent', 'admin_local']
const ADMIN_NATIONAL_ASSIGNABLE: ReadonlyArray<AppRole> = [
  'referent',
  'admin_local',
  'admin_national',
  'support',
]

// Verifies the actor's password via a throw-away Supabase client (no session persisted)
async function verifyPassword(email: string, password: string): Promise<boolean> {
  const client = createSupabaseClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { error } = await client.auth.signInWithPassword({ email, password })
  return !error
}

export async function promoteUser(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const rl = await checkRateLimit('adminAction', user.id)
  if (!rl.success) return { error: "Trop d'actions. Réessayez dans une heure." }

  const actorRole = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(actorRole, 'admin.users.promote')) return { error: 'Permission refusée.' }

  const targetId = formData.get('target_id') as string
  const newRole = formData.get('role') as AppRole
  const churchId = (formData.get('church_id') as string) || null
  const password = formData.get('password') as string

  if (!targetId || !newRole || !password) return { error: 'Données manquantes.' }
  if (!APP_ROLES.includes(newRole)) return { error: 'Rôle invalide.' }
  if (targetId === user.id) return { error: 'Vous ne pouvez pas vous promouvoir vous-même.' }

  const assignable =
    actorRole === 'admin_national' ? ADMIN_NATIONAL_ASSIGNABLE : ADMIN_LOCAL_ASSIGNABLE
  if (!assignable.includes(newRole)) {
    return { error: 'Vous ne pouvez pas attribuer ce rôle.' }
  }

  const needsChurch = ADMIN_LOCAL_ASSIGNABLE.includes(newRole)
  if (needsChurch && !churchId) return { error: 'Église requise pour ce rôle.' }

  // MFA check: if actor has MFA configured, their session must be aal2
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
    return { error: 'Vérification MFA requise. Reconnectez-vous avec votre code MFA.' }
  }

  // Password re-authentication
  if (!user.email) return { error: 'Session invalide.' }
  const passwordOk = await verifyPassword(user.email, password)
  if (!passwordOk) return { error: 'Mot de passe incorrect.' }

  const admin = createAdminClient()
  const { data: targetData, error: targetErr } = await admin.auth.admin.getUserById(targetId)
  if (targetErr || !targetData?.user) return { error: 'Utilisateur introuvable.' }
  const targetUser = targetData.user

  const currentRole = await resolveUserRole(targetId, targetUser.app_metadata ?? {})

  // Apply role change
  if (needsChurch && churchId) {
    await db
      .delete(churchReferents)
      .where(and(eq(churchReferents.userId, targetId), eq(churchReferents.churchId, churchId)))
    await db.insert(churchReferents).values({
      userId: targetId,
      churchId,
      role: newRole as 'referent' | 'admin_local',
      grantedBy: user.id,
    })
  }

  // Always sync app_metadata.role so the proxy JWT check stays current
  await admin.auth.admin.updateUserById(targetId, {
    app_metadata: { ...targetUser.app_metadata, role: newRole },
  })

  // Remove church_referents if promoting to a non-church role
  if (!needsChurch) {
    await db.delete(churchReferents).where(eq(churchReferents.userId, targetId))
  }

  // Audit log
  const hdrs = await headers()
  const forwarded = hdrs.get('x-forwarded-for')
  const ip = (forwarded ? forwarded.split(',')[0]?.trim() : hdrs.get('x-real-ip')) ?? undefined
  await db.insert(auditLog).values({
    actorId: user.id,
    action: 'role.promote',
    targetType: 'user',
    targetId,
    metadata: { before: currentRole, after: newRole, church_id: churchId },
    ipAddress: ip,
    userAgent: hdrs.get('user-agent') ?? undefined,
  })

  if (targetUser.email) {
    await sendRoleChangeEmail(
      targetUser.email,
      (targetUser.user_metadata?.display_name as string) ?? targetUser.email,
      newRole,
      'promoted',
    )
  }

  return { success: true }
}

export async function revokeRole(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const rl = await checkRateLimit('adminAction', user.id)
  if (!rl.success) return { error: "Trop d'actions. Réessayez dans une heure." }

  const actorRole = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(actorRole, 'admin.users.revoke')) return { error: 'Permission refusée.' }

  const targetId = formData.get('target_id') as string
  if (!targetId) return { error: 'Données manquantes.' }
  if (targetId === user.id) return { error: 'Vous ne pouvez pas révoquer votre propre rôle.' }

  const admin = createAdminClient()
  const { data: targetData, error: targetErr } = await admin.auth.admin.getUserById(targetId)
  if (targetErr || !targetData?.user) return { error: 'Utilisateur introuvable.' }
  const targetUser = targetData.user

  const currentRole = await resolveUserRole(targetId, targetUser.app_metadata ?? {})

  // admin_local can only revoke referent or admin_local
  if (actorRole === 'admin_local' && !ADMIN_LOCAL_ASSIGNABLE.includes(currentRole)) {
    return { error: 'Permission refusée pour ce rôle.' }
  }

  // Remove all church_referents entries
  await db.delete(churchReferents).where(eq(churchReferents.userId, targetId))

  // Clear app_metadata role by setting it to 'member'
  await admin.auth.admin.updateUserById(targetId, {
    app_metadata: { ...targetUser.app_metadata, role: 'member' },
  })

  // Audit log
  const hdrs = await headers()
  const forwarded = hdrs.get('x-forwarded-for')
  const ip = (forwarded ? forwarded.split(',')[0]?.trim() : hdrs.get('x-real-ip')) ?? undefined
  await db.insert(auditLog).values({
    actorId: user.id,
    action: 'role.revoke',
    targetType: 'user',
    targetId,
    metadata: { before: currentRole, after: 'member' },
    ipAddress: ip,
    userAgent: hdrs.get('user-agent') ?? undefined,
  })

  if (targetUser.email) {
    await sendRoleChangeEmail(
      targetUser.email,
      (targetUser.user_metadata?.display_name as string) ?? targetUser.email,
      'member',
      'revoked',
    )
  }

  return { success: true }
}
