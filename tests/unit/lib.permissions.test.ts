// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/db/client', () => ({ db: {} }))
vi.mock('@/db/schema', () => ({ churchReferents: {} }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

const { can, ROLE_PERMISSIONS, APP_ROLES } = await import('@/lib/auth/permissions')

describe('can() — member permissions', () => {
  it('can read own profile', () => {
    expect(can('member', 'profile.read.own')).toBe(true)
  })

  it('cannot read any profile', () => {
    expect(can('member', 'profile.read.any')).toBe(false)
  })

  it('cannot approve verifications', () => {
    expect(can('member', 'verification.approve.own_church')).toBe(false)
    expect(can('member', 'verification.approve.any')).toBe(false)
  })

  it('cannot access admin features', () => {
    expect(can('member', 'admin.users.read')).toBe(false)
    expect(can('member', 'admin.users.promote')).toBe(false)
    expect(can('member', 'admin.users.revoke')).toBe(false)
  })

  it('cannot delete any listing', () => {
    expect(can('member', 'listing.delete.any')).toBe(false)
  })

  it('cannot read all audit logs', () => {
    expect(can('member', 'audit.read.all')).toBe(false)
  })
})

describe('can() — referent permissions', () => {
  it('can approve verifications for own church', () => {
    expect(can('referent', 'verification.approve.own_church')).toBe(true)
  })

  it('cannot approve verifications for any church', () => {
    expect(can('referent', 'verification.approve.any')).toBe(false)
  })

  it('cannot access admin features', () => {
    expect(can('referent', 'admin.users.read')).toBe(false)
    expect(can('referent', 'admin.users.promote')).toBe(false)
  })
})

describe('can() — admin_local permissions', () => {
  it('can approve verifications for own church', () => {
    expect(can('admin_local', 'verification.approve.own_church')).toBe(true)
  })

  it('cannot approve verifications for any church', () => {
    expect(can('admin_local', 'verification.approve.any')).toBe(false)
  })

  it('can manage users', () => {
    expect(can('admin_local', 'admin.users.read')).toBe(true)
    expect(can('admin_local', 'admin.users.promote')).toBe(true)
    expect(can('admin_local', 'admin.users.revoke')).toBe(true)
  })

  it('can delete any listing', () => {
    expect(can('admin_local', 'listing.delete.any')).toBe(true)
  })

  it('cannot read any profile', () => {
    expect(can('admin_local', 'profile.read.any')).toBe(false)
  })
})

describe('can() — admin_national permissions', () => {
  it('has all defined permissions', () => {
    const allPerms = [
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
    ] as const
    for (const perm of allPerms) {
      expect(can('admin_national', perm)).toBe(true)
    }
  })
})

describe('can() — support permissions', () => {
  it('can read any profile', () => {
    expect(can('support', 'profile.read.any')).toBe(true)
  })

  it('can read admin users', () => {
    expect(can('support', 'admin.users.read')).toBe(true)
  })

  it('cannot promote or revoke users', () => {
    expect(can('support', 'admin.users.promote')).toBe(false)
    expect(can('support', 'admin.users.revoke')).toBe(false)
  })

  it('cannot update profiles', () => {
    expect(can('support', 'profile.update.own')).toBe(false)
    expect(can('support', 'profile.update.any')).toBe(false)
  })
})

describe('privilege escalation prevention', () => {
  it('member cannot escalate to admin_national permissions', () => {
    expect(can('member', 'admin.users.promote')).toBe(false)
    expect(can('member', 'profile.update.any')).toBe(false)
  })

  it('referent cannot escalate to admin permissions', () => {
    expect(can('referent', 'admin.users.promote')).toBe(false)
    expect(can('referent', 'verification.approve.any')).toBe(false)
    expect(can('referent', 'audit.read.all')).toBe(false)
  })
})

describe('APP_ROLES and ROLE_PERMISSIONS coverage', () => {
  it('every APP_ROLE has a permissions entry', () => {
    for (const role of APP_ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined()
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true)
    }
  })

  it('all roles have profile.read.public and profile.read.own', () => {
    for (const role of APP_ROLES) {
      expect(can(role, 'profile.read.public')).toBe(true)
      expect(can(role, 'profile.read.own')).toBe(true)
    }
  })

  it('has 5 roles defined', () => {
    expect(APP_ROLES).toHaveLength(5)
  })
})
