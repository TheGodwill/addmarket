import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Politique de confidentialité — ADDMarket' }

export default function PrivacyPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1>Politique de confidentialité</h1>
      <p className="text-sm text-gray-500">Dernière mise à jour : mai 2026 — Version 1.0</p>

      <h2>1. Qui sommes-nous ?</h2>
      <p>
        ADDMarket est une marketplace communautaire réservée aux membres vérifiés des Assemblées de
        Dieu France. Le responsable du traitement est{' '}
        <strong>[À COMPLÉTER — Raison sociale]</strong>, joignable à{' '}
        <a href="mailto:dpo@addmarket.fr">dpo@addmarket.fr</a>.
      </p>

      <h2>2. Données collectées</h2>
      <table>
        <thead>
          <tr>
            <th>Catégorie</th>
            <th>Données</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Identité</td>
            <td>Nom d&apos;affichage, email, ville, région</td>
          </tr>
          <tr>
            <td>Contact</td>
            <td>Numéro de téléphone (chiffré AES-256-GCM)</td>
          </tr>
          <tr>
            <td>Appartenance</td>
            <td>Église de rattachement</td>
          </tr>
          <tr>
            <td>Vérification</td>
            <td>
              Photos de la carte de membre (temporaires — supprimées après traitement), derniers 4
              chiffres du numéro de carte (hash Argon2id)
            </td>
          </tr>
          <tr>
            <td>Authentification</td>
            <td>Email, hash du mot de passe (géré par Supabase Auth), facteur MFA</td>
          </tr>
          <tr>
            <td>Technique</td>
            <td>Adresse IP (journaux de sécurité), user-agent (journaux d&apos;audit)</td>
          </tr>
          <tr>
            <td>Consentements</td>
            <td>Choix analytics, emails marketing, date et version du consentement</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Finalités et bases légales</h2>
      <table>
        <thead>
          <tr>
            <th>Finalité</th>
            <th>Base légale (RGPD art. 6)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gestion du compte et authentification</td>
            <td>Exécution du contrat (6.1.b)</td>
          </tr>
          <tr>
            <td>Vérification de l&apos;appartenance aux ADD</td>
            <td>Exécution du contrat (6.1.b)</td>
          </tr>
          <tr>
            <td>Communication sur la demande de vérification</td>
            <td>Exécution du contrat (6.1.b)</td>
          </tr>
          <tr>
            <td>Sécurité et prévention de la fraude</td>
            <td>Intérêt légitime (6.1.f)</td>
          </tr>
          <tr>
            <td>Journal d&apos;audit des actions administratives</td>
            <td>Intérêt légitime (6.1.f)</td>
          </tr>
          <tr>
            <td>Analytics (PostHog)</td>
            <td>Consentement (6.1.a)</td>
          </tr>
          <tr>
            <td>Emails marketing / newsletter</td>
            <td>Consentement (6.1.a)</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Durées de conservation</h2>
      <table>
        <thead>
          <tr>
            <th>Donnée</th>
            <th>Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Données de compte (profil, email)</td>
            <td>Durée d&apos;activité du compte + 30 jours (délai de rétractation)</td>
          </tr>
          <tr>
            <td>Photos de carte de membre</td>
            <td>Supprimées immédiatement après décision du référent</td>
          </tr>
          <tr>
            <td>Journal d&apos;audit (audit_log)</td>
            <td>
              5 ans (obligation légale) — anonymisé à la suppression du compte (actor_id → NULL)
            </td>
          </tr>
          <tr>
            <td>Journaux de sécurité (IP, user-agent)</td>
            <td>12 mois</td>
          </tr>
          <tr>
            <td>Consentements</td>
            <td>5 ans après révocation</td>
          </tr>
        </tbody>
      </table>

      <h2>5. Destinataires des données</h2>
      <table>
        <thead>
          <tr>
            <th>Sous-traitant</th>
            <th>Rôle</th>
            <th>Localisation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase Inc.</td>
            <td>Base de données, authentification, stockage</td>
            <td>EU (Frankfurt, Allemagne)</td>
          </tr>
          <tr>
            <td>Vercel Inc.</td>
            <td>Hébergement de l&apos;application</td>
            <td>EU (serveurs edge Europe)</td>
          </tr>
          <tr>
            <td>Resend Inc.</td>
            <td>Envoi d&apos;emails transactionnels</td>
            <td>États-Unis (DPA disponible)</td>
          </tr>
          <tr>
            <td>PostHog Inc.</td>
            <td>Analytics (uniquement avec consentement)</td>
            <td>EU (instance EU)</td>
          </tr>
          <tr>
            <td>Upstash Inc.</td>
            <td>Rate limiting (Redis)</td>
            <td>EU</td>
          </tr>
        </tbody>
      </table>

      <h2>6. Transferts hors Union européenne</h2>
      <p>
        Les données sont hébergées au sein de l&apos;Union européenne (Supabase région eu-central-1,
        PostHog EU). Resend traite les emails depuis les États-Unis sous garanties contractuelles
        (Clauses Contractuelles Types de la Commission européenne). Aucun transfert non encadré
        n&apos;est réalisé.
      </p>

      <h2>7. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li>
          <strong>Accès</strong> (art. 15) — Obtenir une copie de vos données :{' '}
          <a href="/account/data-export">Exporter mes données</a>
        </li>
        <li>
          <strong>Rectification</strong> (art. 16) — Corriger des données inexactes via votre profil
        </li>
        <li>
          <strong>Effacement</strong> (art. 17) — Supprimer votre compte :{' '}
          <a href="/account/delete">Supprimer mon compte</a>
        </li>
        <li>
          <strong>Portabilité</strong> (art. 20) — Télécharger vos données en JSON :{' '}
          <a href="/account/data-export">Exporter mes données</a>
        </li>
        <li>
          <strong>Opposition / Retrait du consentement</strong> — Gérer vos préférences :{' '}
          <a href="/account/consents">Mes consentements</a>
        </li>
        <li>
          <strong>Limitation du traitement</strong> (art. 18) — Contacter le DPO
        </li>
      </ul>
      <p>
        Pour exercer vos droits : <a href="mailto:dpo@addmarket.fr">dpo@addmarket.fr</a>. Réponse
        sous 30 jours. En cas de difficulté : <a href="https://www.cnil.fr">CNIL</a>.
      </p>

      <h2>8. Cookies</h2>
      <p>
        ADDMarket utilise uniquement des cookies techniques strictement nécessaires (session
        d&apos;authentification, préférences). Les cookies d&apos;analyse (PostHog) ne sont activés
        qu&apos;avec votre consentement explicite. Voir{' '}
        <a href="/account/consents">Gérer mes consentements</a>.
      </p>
    </article>
  )
}
