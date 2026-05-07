import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Vérifiez votre email — ADDMarket',
}

export default function VerifyEmailPage() {
  return (
    <div className="space-y-5 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <svg
            className="h-6 w-6 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Vérifiez votre email</h2>
        <p className="mt-2 text-sm text-gray-500">
          Un lien de confirmation vous a été envoyé. Cliquez sur ce lien pour activer votre compte.
        </p>
      </div>

      <p className="text-xs text-gray-400">Vous ne voyez pas l&apos;email ? Vérifiez vos spams.</p>

      <p className="text-sm text-gray-500">
        <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
          Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
