import type { Metadata } from 'next'
import { MfaChallengeForm } from '@/components/auth/mfa-challenge-form'

export const metadata: Metadata = {
  title: 'Vérification MFA — ADDMarket',
}

export default function MfaPage() {
  return <MfaChallengeForm />
}
