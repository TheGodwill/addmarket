import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Mot de passe oublié — ADDMarket',
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
