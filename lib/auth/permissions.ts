import 'server-only'
import { db } from '@/db/client'
import { churchReferents } from '@/db/schema'
import { eq } from 'drizzle-orm'

export type AppRole = 'member' | 'referent' | 'admin_local' | 'admin_national' | 'support'

export type Permission =
  | 'profile.read.public'
  | 'profile.read.own'
  | 'profile.read.any'
  | 'profile.update.own'
  | 'profile.update.any'
  | 'verification.create'
  | 'verification.approve.own_church'
  | 'verification.approve.any'
  | 'listing.create'
  | 'listing.update.own'
  | 'listing.delete.any'
  | 'audit.read.own_actions'
  | 'audit.read.all'
  | 'admin.users.read'
  | 'admin.users.promote'
  | 'admin.users.revoke'
  | 'review.create'
  | 'review.update.own'
  | 'review.respond.own_seller'
  | 'review.report'
  | 'review.moderate'
  | 'content.report'
  | 'moderation.read'
  | 'moderation.action'
  | 'moderation.action.ban'

export const ROLE_PERMISSIONS: Record<AppRole, ReadonlyArray<Permission>> = {
  member: [
    'profile.read.public',
    'profile.read.own',
    'profile.update.own',
    'verification.create',
    'listing.create',
    'listing.update.own',
    'audit.read.own_actions',
    'review.create',
    'review.update.own',
    'review.respond.own_seller',
    'review.report',
    'content.report',
  ],
  referent: [
    'profile.read.public',
    'profile.read.own',
    'profile.update.own',
    'verification.create',
    'verification.approve.own_church',
    'listing.create',
    'listing.update.own',
    'audit.read.own_actions',
    'review.create',
    'review.update.own',
    'review.respond.own_seller',
    'review.report',
    'content.report',
    'moderation.read',
    'moderation.action',
  ],
  admin_local: [
    'profile.read.public',
    'profile.read.own',
    'profile.update.own',
    'verification.create',
    'verification.approve.own_church',
    'listing.create',
    'listing.update.own',
    'listing.delete.any',
    'audit.read.own_actions',
    'audit.read.all',
    'admin.users.read',
    'admin.users.promote',
    'admin.users.revoke',
    'review.create',
    'review.update.own',
    'review.respond.own_seller',
    'review.report',
    'review.moderate',
    'content.report',
    'moderation.read',
    'moderation.action',
  ],
  admin_national: [
    'profile.read.public',
    'profile.read.own',
    'profile.read.any',
    'profile.update.own',
    'profile.update.any',
    'verification.create',
    'verification.approve.own_church',
    'verification.approve.any',
    'listing.create',
    'listing.update.own',
    'listing.delete.any',
    'audit.read.own_actions',
    'audit.read.all',
    'admin.users.read',
    'admin.users.promote',
    'admin.users.revoke',
    'review.create',
    'review.update.own',
    'review.respond.own_seller',
    'review.report',
    'review.moderate',
    'content.report',
    'moderation.read',
    'moderation.action',
    'moderation.action.ban',
  ],
  support: [
    'profile.read.public',
    'profile.read.own',
    'profile.read.any',
    'verification.approve.any',
    'audit.read.own_actions',
    'audit.read.all',
    'admin.users.read',
    'review.moderate',
    'content.report',
    'moderation.read',
    'moderation.action',
    'moderation.action.ban',
  ],
}

export const APP_ROLES: ReadonlyArray<AppRole> = [
  'member',
  'referent',
  'admin_local',
  'admin_national',
  'support',
]

export function can(role: AppRole, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] as Permission[]).includes(permission)
}

// Resolves the effective role from app_metadata (JWT claim) first,
// then falls back to church_referents for legacy/direct-DB entries.
// promote/revokeRole write to BOTH app_metadata and church_referents,
// so getUser() always returns fresh app_metadata without a page reload.
export async function resolveUserRole(
  userId: string,
  appMetadata: Record<string, unknown>,
): Promise<AppRole> {
  const metaRole = (appMetadata?.role ?? '') as string
  if (APP_ROLES.includes(metaRole as AppRole)) {
    return metaRole as AppRole
  }
  const rows = await db
    .select({ role: churchReferents.role })
    .from(churchReferents)
    .where(eq(churchReferents.userId, userId))
    .limit(1)
  const firstRow = rows.at(0)
  if (firstRow) {
    return firstRow.role as AppRole
  }
  return 'member'
}
