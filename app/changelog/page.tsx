import type { Metadata } from 'next'
import { Tag } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Historique des mises à jour et nouvelles fonctionnalités ADDMarket.',
}

type BadgeVariant = 'new' | 'improved' | 'fix' | 'security'

interface Release {
  version: string
  date: string
  title: string
  items: { label: string; variant: BadgeVariant }[]
}

const RELEASES: Release[] = [
  {
    version: 'v0.9.0 bêta',
    date: 'Mai 2026',
    title: 'Application installable (PWA) et localisation CI',
    items: [
      { label: 'ADDMarket installable sur mobile et bureau', variant: 'new' },
      { label: 'Icônes générées, splash screen, mode hors-ligne partiel', variant: 'new' },
      { label: "Localisation Côte d'Ivoire (415 assemblées EEADCI importées)", variant: 'new' },
      { label: 'Métadonnées Open Graph et carte Twitter', variant: 'improved' },
    ],
  },
  {
    version: 'v0.8.0 bêta',
    date: 'Mai 2026',
    title: 'Tableau de bord administrateur',
    items: [
      { label: 'Dashboard admin avec 10 métriques en temps réel', variant: 'new' },
      { label: "Navigation admin unifiée avec badges de file d'attente", variant: 'new' },
      { label: "Journal d'audit consultable par les admins", variant: 'new' },
    ],
  },
  {
    version: 'v0.7.0 bêta',
    date: 'Mai 2026',
    title: 'Vérification membre',
    items: [
      { label: 'Soumission de demande de vérification avec photo de carte', variant: 'new' },
      { label: "Recherche d'église intégrée au formulaire", variant: 'new' },
      { label: 'Page de suivi du statut de vérification', variant: 'new' },
      { label: "Import des données d'assemblées Côte d'Ivoire", variant: 'new' },
    ],
  },
  {
    version: 'v0.6.0 bêta',
    date: 'Mai 2026',
    title: "Renouvellement d'adhésion",
    items: [
      { label: 'Paiement du renouvellement annuel via Stripe', variant: 'new' },
      { label: 'Email de rappel 30 jours avant expiration', variant: 'new' },
      { label: "Gestion de l'abonnement vendeur", variant: 'improved' },
    ],
  },
  {
    version: 'v0.5.0 bêta',
    date: 'Mai 2026',
    title: 'Paiements et devis',
    items: [
      { label: 'Demandes de devis entre acheteurs et vendeurs', variant: 'new' },
      { label: 'Intégration Stripe (paiements, webhooks)', variant: 'new' },
      { label: 'Tableau de bord analytique vendeur', variant: 'new' },
    ],
  },
  {
    version: 'v0.4.0 bêta',
    date: 'Mai 2026',
    title: 'Messagerie et notifications',
    items: [
      { label: 'Messagerie en temps réel entre membres', variant: 'new' },
      { label: 'Notifications email pour nouveaux messages', variant: 'new' },
      { label: 'Badge de messages non lus dans le header', variant: 'new' },
    ],
  },
  {
    version: 'v0.3.0 bêta',
    date: 'Mai 2026',
    title: 'Recherche et géolocalisation',
    items: [
      { label: 'Recherche plein texte via Meilisearch', variant: 'new' },
      { label: 'Carte interactive des vendeurs avec Mapbox', variant: 'new' },
      { label: "Autocomplétion des villes de Côte d'Ivoire", variant: 'new' },
      { label: "Refonte de la page d'accueil", variant: 'improved' },
    ],
  },
  {
    version: 'v0.2.0 bêta',
    date: 'Mai 2026',
    title: 'Marketplace vendeurs',
    items: [
      { label: "Wizard d'inscription vendeur en 7 étapes", variant: 'new' },
      { label: 'Gestion des annonces avec upload photos (Cloudinary)', variant: 'new' },
      { label: 'Pages publiques vendeur et annonce avec SEO', variant: 'new' },
      { label: "Système d'avis avec modération", variant: 'new' },
      { label: 'Panel de modération communautaire', variant: 'new' },
    ],
  },
  {
    version: 'v0.1.0 bêta',
    date: 'Mai 2026',
    title: 'Lancement bêta fermée',
    items: [
      { label: 'Authentification (email, MFA, récupération)', variant: 'new' },
      { label: 'Système de rôles (membre, référent, admin)', variant: 'new' },
      { label: 'Parcours de vérification membre via référent paroisse', variant: 'new' },
      { label: 'Pages légales et gestion RGPD', variant: 'new' },
      { label: 'Audit sécurité interne (OWASP Top 10)', variant: 'security' },
    ],
  },
]

const BADGE_STYLES: Record<BadgeVariant, string> = {
  new: 'bg-blue-100 text-blue-700',
  improved: 'bg-violet-100 text-violet-700',
  fix: 'bg-amber-100 text-amber-700',
  security: 'bg-red-100 text-red-700',
}

const BADGE_LABELS: Record<BadgeVariant, string> = {
  new: 'Nouveau',
  improved: 'Amélioré',
  fix: 'Correction',
  security: 'Sécurité',
}

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <Tag className="h-7 w-7 text-blue-600" aria-hidden />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Changelog</h1>
          <p className="mt-2 text-gray-600">Historique des mises à jour d&apos;ADDMarket.</p>
        </div>

        <div className="space-y-8">
          {RELEASES.map((release) => (
            <article
              key={release.version}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <header className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded-full bg-gray-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                      {release.version}
                    </span>
                    <span className="text-xs text-gray-400">{release.date}</span>
                  </div>
                  <h2 className="mt-1.5 text-base font-semibold text-gray-900">{release.title}</h2>
                </div>
              </header>

              <ul className="space-y-2">
                {release.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span
                      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${BADGE_STYLES[item.variant]}`}
                    >
                      {BADGE_LABELS[item.variant]}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
