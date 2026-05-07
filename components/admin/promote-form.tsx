'use client'
import { useActionState, useState } from 'react'
import { promoteUser } from '@/app/admin/users/actions'
import type { AppRole } from '@/lib/auth/permissions'

const ROLE_LABELS: Record<string, string> = {
  referent: 'Référent',
  admin_local: 'Admin local',
  admin_national: 'Admin national',
  support: 'Support',
}

interface Church {
  id: string
  name: string
  city: string
}

interface PromoteFormProps {
  targetId: string
  churches: Church[]
  actorRole: AppRole
}

export function PromoteForm({ targetId, churches, actorRole }: PromoteFormProps) {
  const [state, action, pending] = useActionState(promoteUser, null)
  const [selectedRole, setSelectedRole] = useState('')

  const assignableRoles =
    actorRole === 'admin_national'
      ? ['referent', 'admin_local', 'admin_national', 'support']
      : ['referent', 'admin_local']

  const needsChurch = ['referent', 'admin_local'].includes(selectedRole)

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="target_id" value={targetId} />

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Rôle</label>
        <select
          name="role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Choisir...</option>
          {assignableRoles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r] ?? r}
            </option>
          ))}
        </select>
      </div>

      {needsChurch && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Église</label>
          <select
            name="church_id"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Choisir...</option>
            {churches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.city})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Votre mot de passe</label>
        <input
          type="password"
          name="password"
          placeholder="Re-authentification"
          className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <button
        type="submit"
        disabled={pending || !selectedRole}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? 'En cours...' : 'Attribuer'}
      </button>

      {state && 'error' in state && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {state && 'success' in state && (
        <p className="w-full text-xs text-green-600">Rôle mis à jour avec succès.</p>
      )}
    </form>
  )
}
