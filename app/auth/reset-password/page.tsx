import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata: Metadata = {
  title: 'Réinitialisation du mot de passe — ADDMarket',
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
