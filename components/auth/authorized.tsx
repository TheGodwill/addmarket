import { type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { can, resolveUserRole, type Permission } from '@/lib/auth/permissions'

interface AuthorizedProps {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}

export async function Authorized({ permission, children, fallback = null }: AuthorizedProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <>{fallback}</>
  const role = await resolveUserRole(user.id, user.app_metadata ?? {})
  if (!can(role, permission)) return <>{fallback}</>
  return <>{children}</>
}
