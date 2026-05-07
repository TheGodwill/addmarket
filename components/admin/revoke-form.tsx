'use client'
import { useActionState } from 'react'
import { revokeRole } from '@/app/admin/users/actions'

interface RevokeFormProps {
  targetId: string
}

export function RevokeForm({ targetId }: RevokeFormProps) {
  const [state, action, pending] = useActionState(revokeRole, null)
  return (
    <form action={action}>
      <input type="hidden" name="target_id" value={targetId} />
      {state && 'error' in state && <p className="mb-1 text-xs text-red-600">{state.error}</p>}
      {state && 'success' in state && <p className="mb-1 text-xs text-green-600">Rôle révoqué.</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {pending ? 'En cours...' : 'Révoquer'}
      </button>
    </form>
  )
}
