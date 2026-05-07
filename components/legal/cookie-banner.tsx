'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const COOKIE_NAME = 'cookie_consent'
const MAX_AGE = 13 * 30 * 24 * 3600 // 13 months in seconds

function getConsentCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split(';').find((c) => c.trim().startsWith(`${COOKIE_NAME}=`))
  return match ? (match.split('=')[1]?.trim() ?? null) : null
}

function setConsentCookie(value: 'all' | 'essential') {
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax`
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [analyticsConsent, setAnalyticsConsent] = useState(false)
  const hasPostHog = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY)

  useEffect(() => {
    const show = () => setVisible(true)
    if (!getConsentCookie()) show()
  }, [])

  function acceptAll() {
    setConsentCookie('all')
    setVisible(false)
  }

  function rejectAll() {
    setConsentCookie('essential')
    setVisible(false)
  }

  function saveChoice() {
    setConsentCookie(analyticsConsent ? 'all' : 'essential')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      aria-modal="true"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-lg"
    >
      <div className="mx-auto max-w-4xl px-4 py-4">
        {!showDetails ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-700">
              ADDMarket utilise des cookies essentiels pour le fonctionnement du service.
              {hasPostHog && " Des cookies d'analyse sont disponibles avec votre accord."}{' '}
              <Link href="/legal/privacy" className="text-blue-600 underline">
                En savoir plus
              </Link>
            </p>
            <div className="flex shrink-0 gap-2">
              {hasPostHog && (
                <button
                  type="button"
                  onClick={() => setShowDetails(true)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Personnaliser
                </button>
              )}
              <button
                type="button"
                onClick={rejectAll}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Refuser tout
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Accepter tout
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Personnaliser mes préférences</h2>

            <div className="space-y-3">
              {/* Essential — always on */}
              <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Cookies essentiels</p>
                  <p className="text-xs text-gray-500">
                    Session, sécurité, onboarding. Indispensables au fonctionnement.
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-green-700">Toujours actif</span>
              </div>

              {/* Analytics — opt-in */}
              {hasPostHog && (
                <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Analytics (PostHog)</p>
                    <p className="text-xs text-gray-500">
                      Mesure d&apos;audience anonymisée, hébergée en EU. Aide à améliorer le
                      service.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={analyticsConsent}
                    onClick={() => setAnalyticsConsent(!analyticsConsent)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${analyticsConsent ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${analyticsConsent ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={rejectAll}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Refuser tout
              </button>
              <button
                type="button"
                onClick={saveChoice}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Enregistrer mes choix
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
