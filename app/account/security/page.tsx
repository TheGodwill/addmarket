import type { Metadata } from 'next'
import { getMfaStatus } from '@/app/account/actions'
import { MfaStatus } from '@/components/account/mfa-status'

export const metadata: Metadata = {
  title: 'Sécurité du compte — ADDMarket',
}

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>
}) {
  const { notice } = await searchParams
  const mfaStatus = await getMfaStatus()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sécurité du compte</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez la double authentification et les accès à votre compte.
        </p>
      </div>

      {notice === 'mfa_reset' && (
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Votre code de récupération a été utilisé et la MFA a été réinitialisée. Veuillez réactiver
          la double authentification.
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Double authentification (MFA)
        </h2>
        <MfaStatus
          enabled={mfaStatus.enabled}
          enabledAt={mfaStatus.enabledAt}
          recoveryCodesRemaining={mfaStatus.recoveryCodesRemaining}
        />
      </section>
    </div>
  )
}
