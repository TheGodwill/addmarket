'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelVerificationRequest } from './actions'

export function CancelButton({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleCancel() {
    startTransition(async () => {
      await cancelVerificationRequest(requestId)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleCancel}
      disabled={pending}
      className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
    >
      {pending ? 'Annulation…' : 'Annuler'}
    </button>
  )
}
