import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Charte communautaire — ADDMarket',
  description:
    'Les règles de bonne conduite de la marketplace ADDMarket pour les membres des Assemblées de Dieu.',
}

export default function CommunityGuidelinesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Charte communautaire</h1>
      <p className="mb-8 text-sm text-gray-500">Dernière mise à jour : janvier 2025</p>

      <div className="prose prose-sm max-w-none text-gray-700">
        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-900">1. Objet</h2>
          <p>
            ADDMarket est une marketplace réservée aux membres vérifiés des Assemblées de Dieu
            France. Elle repose sur un principe de confiance mutuelle entre membres d&apos;une même
            communauté de foi. Cette charte définit les règles de bonne conduite attendues de chaque
            participant.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-900">2. Contenus autorisés</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Produits et services légaux, conformes aux valeurs chrétiennes</li>
            <li>Informations exactes et honnêtes sur les offres proposées</li>
            <li>Photos authentiques de vos produits ou de votre activité</li>
            <li>Avis sincères et constructifs basés sur une expérience réelle</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-900">3. Contenus interdits</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Tout contenu illégal, frauduleux ou trompeur</li>
            <li>Propos haineux, discriminatoires ou offensants</li>
            <li>Spam, démarchage abusif ou liens externes non autorisés</li>
            <li>Usurpation d&apos;identité ou faux profils</li>
            <li>Contenu contraire aux valeurs des Assemblées de Dieu</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-900">4. Avis et évaluations</h2>
          <p>
            Les avis doivent refléter une expérience personnelle réelle. Tout avis frauduleux,
            diffamatoire ou incitant à la haine sera supprimé. Les vendeurs ne peuvent pas
            s&apos;auto-évaluer.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-900">5. Signalements</h2>
          <p>
            Tout membre peut signaler un contenu qui lui semble inapproprié. Les signalements
            abusifs ou répétés sans fondement pourront entraîner des sanctions.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-900">6. Sanctions</h2>
          <p>
            En cas de violation de la présente charte, les actions suivantes peuvent être prises :
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Avertissement avec notification par email</li>
            <li>Suppression du contenu incriminé</li>
            <li>Suspension temporaire du compte</li>
            <li>Bannissement définitif</li>
          </ul>
          <p className="mt-2">
            Toute sanction est motivée et notifiée par email. Un recours est possible en contactant
            notre équipe.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-900">7. Contact</h2>
          <p>
            Pour toute question ou recours, contactez-nous à{' '}
            <a href="mailto:contact@addmarket.fr" className="text-blue-600 hover:underline">
              contact@addmarket.fr
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6 text-center">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  )
}
