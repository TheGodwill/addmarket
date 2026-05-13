import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, Clock, AlertCircle, MessageSquare, Bug, Lightbulb, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Version bêta — ADDMarket',
  description:
    'ADDMarket est actuellement en phase bêta. Découvrez ce qui est disponible et comment contribuer.',
}

const FEATURES_DONE = [
  { label: 'Inscription et connexion sécurisée (email + MFA)' },
  { label: 'Vérification membre par référent paroisse' },
  { label: 'Création de profil vendeur avec catalogue de listings' },
  { label: 'Recherche plein texte avec filtres par catégorie' },
  { label: 'Messagerie interne entre membres' },
  { label: "Système d'avis sur les vendeurs" },
  { label: 'Tableau de bord vendeur avec statistiques de vues' },
  { label: 'Panneau de modération (signalements)' },
  { label: 'Pages légales conformes RGPD (mentions, CGU, confidentialité)' },
  { label: 'Export des données personnelles et suppression de compte' },
  { label: 'Application installable sur mobile (PWA)' },
]

const FEATURES_COMING = [
  { label: 'Carte interactive des vendeurs (géolocalisation)', when: 'Bientôt' },
  { label: 'Notifications push sur mobile', when: 'Bientôt' },
  { label: 'Application mobile native (iOS / Android)', when: 'Phase 6' },
  { label: 'Paiements en ligne entre membres', when: 'Phase 5' },
  { label: 'Commandes et gestion des devis avancée', when: 'Phase 5' },
]

const KNOWN_ISSUES = [
  "La carte interactive `/explorer` peut être lente si Meilisearch n'est pas configuré.",
  "Les uploads d'images vendeur nécessitent Cloudinary (non disponible en dev local).",
  "Les paiements sont en mode test Stripe — aucune transaction réelle n'est effectuée.",
]

export default function BetaPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Version bêta fermée
          </span>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">ADDMarket est en bêta</h1>
          <p className="mt-3 text-gray-500">
            Nous testons la plateforme avec les premières églises partenaires avant le lancement
            national. Votre retour est précieux — merci de participer !
          </p>
        </div>

        {/* What beta means */}
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Qu&apos;est-ce que la bêta ?</p>
              <p className="mt-1">
                La bêta est une version de test. Les fonctionnalités principales fonctionnent, mais
                vous pouvez rencontrer des anomalies. Aucune donnée ne sera perdue lors du passage
                en production — votre compte et vos listings seront conservés.
              </p>
            </div>
          </div>
        </div>

        {/* Features available */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
            <CheckCircle className="h-5 w-5 text-green-600" aria-hidden />
            Ce qui est disponible maintenant
          </h2>
          <ul className="space-y-2">
            {FEATURES_DONE.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 text-green-500">✓</span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Coming soon */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
            <Clock className="h-5 w-5 text-blue-500" aria-hidden />
            Ce qui arrive prochainement
          </h2>
          <ul className="space-y-3">
            {FEATURES_COMING.map((f) => (
              <li key={f.label} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-gray-600">{f.label}</span>
                <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-500">
                  {f.when}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Known issues */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
            <Bug className="h-5 w-5 text-orange-500" aria-hidden />
            Problèmes connus
          </h2>
          <ul className="space-y-2">
            {KNOWN_ISSUES.map((issue) => (
              <li key={issue} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-0.5 text-orange-400">⚠</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>

        {/* How to give feedback */}
        <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
            <Lightbulb className="h-5 w-5 text-blue-600" aria-hidden />
            Comment contribuer ?
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            Votre retour nous aide à améliorer la plateforme avant le lancement national.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-blue-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-900">
                <Bug className="h-4 w-4 text-red-500" aria-hidden />
                Signaler un bug
              </div>
              <p className="mb-3 text-xs text-gray-500">
                Quelque chose ne fonctionne pas comme prévu ? Décrivez le problème.
              </p>
              <Link
                href="/contact?cat=support"
                className="block rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-blue-700"
              >
                Signaler →
              </Link>
            </div>
            <div className="rounded-lg border border-blue-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-900">
                <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden />
                Suggérer une amélioration
              </div>
              <p className="mb-3 text-xs text-gray-500">
                Une idée pour rendre la plateforme meilleure ? Partagez-la !
              </p>
              <Link
                href="/contact?cat=support"
                className="block rounded-lg border border-blue-200 bg-white px-3 py-2 text-center text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                Suggérer →
              </Link>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Vous pouvez aussi utiliser le bouton flottant &quot;Feedback&quot; en bas de chaque
            page.
          </p>
        </div>

        {/* Community */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
            <Users className="h-5 w-5 text-purple-500" aria-hidden />
            Communauté bêta
          </h2>
          <p className="text-sm text-gray-600">
            Vous faites partie des premiers testeurs d&apos;ADDMarket. En cas de question ou pour
            échanger avec l&apos;équipe, contactez-nous directement via le formulaire de contact.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
            Contacter l&apos;équipe
          </Link>
        </div>

        {/* Changelog link */}
        <div className="text-center text-sm text-gray-500">
          Consultez le{' '}
          <Link href="/changelog" className="font-medium text-blue-600 hover:underline">
            journal des modifications
          </Link>{' '}
          pour suivre l&apos;évolution de la plateforme.
        </div>
      </div>
    </main>
  )
}
