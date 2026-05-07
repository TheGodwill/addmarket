# Registre des activités de traitement — ADDMarket

> Conformément à l'art. 30 du RGPD. À compléter et signer par le DPO.
> Dernière mise à jour : mai 2026

---

## Informations sur l'organisation

| Champ                     | Valeur                             |
| ------------------------- | ---------------------------------- |
| Responsable du traitement | **[À COMPLÉTER — Raison sociale]** |
| Adresse                   | [À COMPLÉTER]                      |
| Contact DPO               | dpo@addmarket.fr                   |
| Représentant légal        | [À COMPLÉTER]                      |

---

## Traitement 1 — Gestion des comptes utilisateurs

| Champ                       | Détail                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Finalité**                | Création et gestion des comptes membres ADDMarket                                                              |
| **Base légale**             | Exécution du contrat (art. 6.1.b)                                                                              |
| **Catégories de personnes** | Membres des Assemblées de Dieu France                                                                          |
| **Données**                 | Email, nom d'affichage, ville, région, église de rattachement                                                  |
| **Données sensibles**       | Appartenance religieuse (implicite — art. 9 RGPD) — Base légale : consentement explicite lors de l'inscription |
| **Destinataires**           | Supabase Inc. (hébergement EU), Resend Inc. (emails)                                                           |
| **Durée de conservation**   | Durée d'activité du compte + 30 jours                                                                          |
| **Transferts hors UE**      | Resend (USA) — Clauses contractuelles types                                                                    |
| **Mesures de sécurité**     | Chiffrement TLS, auth MFA, RLS PostgreSQL, bcrypt hash MDP                                                     |

---

## Traitement 2 — Vérification d'identité membre

| Champ                       | Détail                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Finalité**                | Vérifier l'appartenance aux ADD via la carte de membre                                                                    |
| **Base légale**             | Exécution du contrat (art. 6.1.b)                                                                                         |
| **Catégories de personnes** | Nouveaux membres en cours de vérification                                                                                 |
| **Données**                 | Photos de la carte de membre (recto/verso), numéro de carte (hash Argon2id + 4 derniers chiffres), nom et prénom déclarés |
| **Données sensibles**       | Photo d'identité indirecte — traitement limité, suppression immédiate après décision                                      |
| **Destinataires**           | Supabase Storage (EU), référents paroissiaux (humain)                                                                     |
| **Durée de conservation**   | Photos : supprimées immédiatement après décision du référent. Métadonnées (statut, date) : durée du compte                |
| **Mesures de sécurité**     | Bucket privé Supabase (RLS), URLs signées 1h, service_role uniquement, suppression RGPD post-traitement                   |

---

## Traitement 3 — Communication par email

| Champ                     | Détail                                                                    |
| ------------------------- | ------------------------------------------------------------------------- |
| **Finalité**              | Emails transactionnels (confirmation, MFA, notifications de vérification) |
| **Base légale**           | Exécution du contrat (art. 6.1.b)                                         |
| **Données**               | Adresse email, nom d'affichage                                            |
| **Destinataires**         | Resend Inc. (prestataire d'envoi)                                         |
| **Durée de conservation** | Logs d'envoi : 30 jours chez Resend                                       |
| **Transferts hors UE**    | Resend (USA) — Clauses contractuelles types                               |

---

## Traitement 4 — Journal d'audit (sécurité)

| Champ                     | Détail                                                              |
| ------------------------- | ------------------------------------------------------------------- |
| **Finalité**              | Traçabilité des actions sensibles (promotions, rejets, connexions)  |
| **Base légale**           | Intérêt légitime (art. 6.1.f) — sécurité et prévention de la fraude |
| **Données**               | ID utilisateur (acteur), action, IP, user-agent, date               |
| **Destinataires**         | Administrateurs ADDMarket (lecture restreinte)                      |
| **Durée de conservation** | 5 ans — anonymisé à la suppression du compte (actor_id → NULL)      |
| **Mesures de sécurité**   | Table immuable (trigger anti-UPDATE/DELETE), accès restreint        |

---

## Traitement 5 — Rate limiting et sécurité

| Champ                     | Détail                                                              |
| ------------------------- | ------------------------------------------------------------------- |
| **Finalité**              | Prévention des abus, protection contre les attaques par force brute |
| **Base légale**           | Intérêt légitime (art. 6.1.f)                                       |
| **Données**               | Adresse IP ou ID utilisateur (clé de compteur Redis)                |
| **Destinataires**         | Upstash Inc. (Redis hébergé EU)                                     |
| **Durée de conservation** | Fenêtre glissante : 1 min à 1h selon le limiteur                    |

---

## Traitement 6 — Analytics (optionnel — PostHog)

| Champ                     | Détail                                                   |
| ------------------------- | -------------------------------------------------------- |
| **Finalité**              | Mesure d'audience, amélioration du service               |
| **Base légale**           | Consentement (art. 6.1.a)                                |
| **Données**               | Événements de navigation pseudonymisés                   |
| **Destinataires**         | PostHog Inc. (instance EU hébergée en Europe)            |
| **Durée de conservation** | 12 mois                                                  |
| **Activation**            | Uniquement si consentement explicite via bandeau cookies |

---

## Traitement 7 — Gestion des consentements

| Champ                     | Détail                                                        |
| ------------------------- | ------------------------------------------------------------- |
| **Finalité**              | Traçabilité du consentement RGPD                              |
| **Base légale**           | Obligation légale (art. 6.1.c)                                |
| **Données**               | Type de consentement, statut (accordé/révoqué), date, version |
| **Durée de conservation** | 5 ans après révocation                                        |

---

## Traitement 8 — Suppression de compte

| Champ                     | Détail                                                                 |
| ------------------------- | ---------------------------------------------------------------------- |
| **Finalité**              | Gestion du droit à l'effacement (RGPD art. 17)                         |
| **Base légale**           | Obligation légale (art. 6.1.c)                                         |
| **Données**               | Demande de suppression, date planifiée, token d'annulation             |
| **Durée de conservation** | Enregistrement conservé pour audit (userId anonymisé post-suppression) |

---

## Transferts hors UE

| Prestataire       | Données transférées | Garantie                                      |
| ----------------- | ------------------- | --------------------------------------------- |
| Resend Inc. (USA) | Email, nom          | Clauses Contractuelles Types (DPA disponible) |

**Pas d'autres transferts hors UE identifiés.** Supabase, PostHog et Upstash opèrent en EU.

---

## Droits des personnes concernées

Les droits peuvent être exercés à : **dpo@addmarket.fr**

| Droit                   | Délai de réponse | Mise en œuvre                         |
| ----------------------- | ---------------- | ------------------------------------- |
| Accès (art. 15)         | 30 jours         | Export JSON via /account/data-export  |
| Rectification (art. 16) | 30 jours         | Via le profil utilisateur             |
| Effacement (art. 17)    | 30 + 30 jours    | Via /account/delete + traitement cron |
| Portabilité (art. 20)   | 30 jours         | Export JSON via /account/data-export  |
| Opposition (art. 21)    | 30 jours         | Via /account/consents                 |
| Limitation (art. 18)    | 30 jours         | Sur demande au DPO                    |

_En cas de difficultés : CNIL — www.cnil.fr — 3 place de Fontenoy, 75007 Paris_
