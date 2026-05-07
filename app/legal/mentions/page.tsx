import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mentions légales — ADDMarket' }

export default function MentionsLegalesPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1>Mentions légales</h1>
      <p className="text-sm text-gray-500">Dernière mise à jour : mai 2026</p>

      <h2>1. Éditeur du site</h2>
      <p>
        Le site ADDMarket est édité par :{' '}
        <strong>
          [À COMPLÉTER — Raison sociale de l&apos;association ou de la structure juridique]
        </strong>
        <br />
        Forme juridique : [À COMPLÉTER]
        <br />
        Siège social : [À COMPLÉTER]
        <br />
        SIREN / RNA : [À COMPLÉTER]
        <br />
        Directeur de la publication : [À COMPLÉTER — Nom du représentant légal]
        <br />
        Contact : <a href="mailto:contact@addmarket.fr">contact@addmarket.fr</a>
      </p>

      <h2>2. Hébergement</h2>
      <p>
        <strong>Application web</strong> — Vercel Inc., 340 Pine Street, Suite 900, San Francisco,
        CA 94104, États-Unis. Les serveurs de déploiement utilisés pour les utilisateurs européens
        sont situés dans l&apos;Union européenne (région Europe).
      </p>
      <p>
        <strong>Base de données et authentification</strong> — Supabase Inc., données hébergées dans
        la région <strong>eu-central-1 (Frankfurt, Allemagne)</strong>, conformément au RGPD.
      </p>

      <h2>3. Délégué à la Protection des Données (DPO)</h2>
      <p>
        [À COMPLÉTER — Nom du DPO ou de la personne désignée]
        <br />
        Contact : <a href="mailto:dpo@addmarket.fr">dpo@addmarket.fr</a>
      </p>
      <p>
        En cas de difficulté non résolue, vous pouvez saisir la{' '}
        <strong>Commission Nationale de l&apos;Informatique et des Libertés (CNIL)</strong> :{' '}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
          www.cnil.fr
        </a>
        , 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07.
      </p>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus présents sur ADDMarket (textes, logos, images, interface) est
        protégé par le droit d&apos;auteur. Toute reproduction, même partielle, est interdite sans
        autorisation préalable écrite de l&apos;éditeur.
      </p>
      <p>
        Les contenus publiés par les membres (annonces, photos) restent la propriété de leurs
        auteurs. En publiant sur ADDMarket, le membre accorde à la plateforme une licence non
        exclusive d&apos;affichage dans le cadre du service.
      </p>

      <h2>5. Liens hypertextes</h2>
      <p>
        ADDMarket peut contenir des liens vers des sites tiers. L&apos;éditeur n&apos;exerce aucun
        contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
      </p>

      <h2>6. Loi applicable</h2>
      <p>
        Les présentes mentions légales sont régies par le droit français. En cas de litige, les
        tribunaux français sont seuls compétents.
      </p>
    </article>
  )
}
