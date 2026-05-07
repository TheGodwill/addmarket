import type { Metadata } from 'next'

export const metadata: Metadata = { title: "Conditions Générales d'Utilisation — ADDMarket" }

export default function TermsPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1>Conditions Générales d&apos;Utilisation</h1>
      <p className="text-sm text-gray-500">Dernière mise à jour : mai 2026 — Version 1.0</p>

      <h2>1. Objet</h2>
      <p>
        ADDMarket est une marketplace communautaire réservée aux membres vérifiés des Assemblées de
        Dieu France. Les présentes CGU définissent les conditions d&apos;accès et d&apos;utilisation
        du service. En créant un compte, l&apos;utilisateur accepte sans réserve les présentes CGU.
      </p>

      <h2>2. Accès au service</h2>
      <p>
        L&apos;accès à ADDMarket est réservé aux membres des Assemblées de Dieu France ayant
        complété la procédure de vérification d&apos;identité (présentation de la carte de membre,
        validation par un référent paroisse). La plateforme est gratuite durant la phase de
        lancement.
      </p>
      <p>
        L&apos;utilisateur doit avoir au minimum 18 ans et posséder la capacité juridique pour
        s&apos;inscrire.
      </p>

      <h2>3. Statut d&apos;hébergeur — LCEN</h2>
      <p>
        Conformément à la loi n° 2004-575 du 21 juin 2004 pour la Confiance dans l&apos;Économie
        Numérique (LCEN), ADDMarket agit en qualité d&apos;hébergeur pour les contenus publiés par
        les membres (annonces, descriptions, photos). ADDMarket ne peut pas être tenu responsable
        des contenus publiés par les membres, sous réserve d&apos;agir promptement pour retirer tout
        contenu illicite signalé.
      </p>
      <p>
        ADDMarket n&apos;intervient pas dans les transactions entre membres et ne peut être tenu
        responsable des différends commerciaux, des livraisons, des paiements ou de la qualité des
        biens et services échangés.
      </p>

      <h2>4. Charte de conduite</h2>
      <p>Sont strictement interdits sur ADDMarket :</p>
      <ul>
        <li>Le prosélytisme agressif ou la pression religieuse sur d&apos;autres membres</li>
        <li>
          La vente de produits illégaux, contrefaits, dangereux ou contraires à la réglementation
          française
        </li>
        <li>
          Le harcèlement, la discrimination, les propos haineux ou diffamatoires envers tout membre
          ou groupe
        </li>
        <li>La publication de contenus trompeurs, frauduleux ou usurpant une identité</li>
        <li>
          Toute activité commerciale contraire aux valeurs des Assemblées de Dieu (jeux
          d&apos;argent, alcool, tabac, contenu pour adultes, etc.)
        </li>
        <li>L&apos;utilisation de la plateforme à des fins de démarchage non sollicité (spam)</li>
        <li>La création de comptes multiples ou le partage de compte</li>
      </ul>

      <h2>5. Suspension et exclusion</h2>
      <p>
        ADDMarket se réserve le droit de suspendre ou supprimer tout compte en cas de violation des
        présentes CGU, sans préavis en cas d&apos;infraction grave. Un avertissement peut être
        envoyé pour les infractions mineures. La décision est notifiée par email.
      </p>
      <p>
        En cas de révocation de la qualité de membre des Assemblées de Dieu, l&apos;accès à
        ADDMarket peut être suspendu à la demande du référent de l&apos;église concernée.
      </p>

      <h2>6. Responsabilité</h2>
      <p>
        ADDMarket met tout en œuvre pour assurer la disponibilité du service mais ne garantit pas un
        accès ininterrompu. La plateforme ne peut être tenue responsable de dommages directs ou
        indirects résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser le
        service.
      </p>

      <h2>7. Modification des CGU</h2>
      <p>
        ADDMarket peut modifier les présentes CGU à tout moment. Les utilisateurs sont informés par
        email au moins 30 jours avant l&apos;entrée en vigueur des nouvelles CGU. La poursuite de
        l&apos;utilisation du service après cette date vaut acceptation.
      </p>

      <h2>8. Droit applicable et juridiction</h2>
      <p>
        Les présentes CGU sont régies par le droit français. En cas de litige, et après tentative de
        résolution amiable, les tribunaux français sont seuls compétents.
      </p>
    </article>
  )
}
