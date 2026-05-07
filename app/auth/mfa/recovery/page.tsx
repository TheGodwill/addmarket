import type { Metadata } from 'next'
import { MfaRecoveryForm } from '@/components/auth/mfa-recovery-form'

export const metadata: Metadata = {
  title: 'Code de récupération — ADDMarket',
}

export default function MfaRecoveryPage() {
  return <MfaRecoveryForm />
}
