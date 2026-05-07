# DPIA — Analyse d'Impact relative à la Protection des Données

> Conformément à l'art. 35 du RGPD.
> **Statut : BROUILLON — À valider et signer par le DPO avant mise en production.**
> Date : mai 2026

---

## 1. Description du traitement

**Nom du traitement** : ADDMarket — Plateforme communautaire des Assemblées de Dieu

**Description** : Marketplace fermée permettant aux membres vérifiés des Assemblées de Dieu France d'échanger biens et services. L'accès est conditionné à une vérification d'identité impliquant la présentation de la carte de membre ADD et sa validation par un référent paroissial humain.

**Responsable du traitement** : [À COMPLÉTER]

**DPO** : [À COMPLÉTER]

**Sous-traitants** : Supabase (BDD/Auth/Storage, EU), Vercel (hébergement, EU), Resend (emails, USA/CCT), PostHog (analytics opt-in, EU), Upstash (Redis, EU)

---

## 2. Pourquoi une DPIA est-elle nécessaire ?

Deux critères de l'article 35 RGPD sont réunis :

1. **Traitement à grande échelle de données sensibles** : la plateforme traite l'appartenance religieuse des membres (donnée sensible art. 9 RGPD), à l'échelle nationale.
2. **Évaluation systématique d'aspects personnels** : la vérification d'identité constitue une évaluation systématique des personnes (vérification de leur qualité de membre).

---

## 3. Nécessité et proportionnalité

| Question                                       | Réponse                                                                                                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| La finalité est-elle déterminée et légitime ?  | Oui — créer un espace de confiance réservé aux membres ADD. La restriction d'accès est proportionnée à cet objectif communautaire.                                                                           |
| Les données collectées sont-elles minimisées ? | Oui — seuls le nom d'affichage, l'email, la ville et l'église sont obligatoires. Le téléphone est optionnel. La carte de membre est collectée uniquement pour vérification et supprimée immédiatement après. |
| La durée de conservation est-elle limitée ?    | Oui — photos supprimées après traitement, données de compte supprimées 30j après la demande de clôture.                                                                                                      |
| Les droits sont-ils facilement exerçables ?    | Oui — export JSON, suppression compte, gestion consentements accessibles directement depuis le compte.                                                                                                       |

---

## 4. Identification et évaluation des risques

### Risque 1 — Accès non autorisé aux données de membres (confidentialité)

|                               |                                                                            |
| ----------------------------- | -------------------------------------------------------------------------- |
| **Description**               | Un attaquant accède à la liste des membres et à leurs données personnelles |
| **Vraisemblance**             | Faible — RLS PostgreSQL, MFA obligatoire, accès service_role restreint     |
| **Gravité**                   | Élevée — données sensibles (appartenance religieuse, identité)             |
| **Niveau de risque résiduel** | Modéré                                                                     |
| **Mesures**                   | RLS systématique, MFA, audit log, rate limiting, CSP nonce, HTTPS only     |

### Risque 2 — Usurpation d'identité lors de la vérification (intégrité)

|                               |                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| **Description**               | Un non-membre soumet une fausse carte ou usurpe l'identité d'un membre               |
| **Vraisemblance**             | Moyenne — vérification humaine par référent comme garde-fou                          |
| **Gravité**                   | Élevée — accès indu à la communauté                                                  |
| **Niveau de risque résiduel** | Faible (vérification humaine + hash Argon2id)                                        |
| **Mesures**                   | Validation humaine obligatoire, hash du numéro de carte, délai 24h entre soumissions |

### Risque 3 — Fuite de données lors de la transmission des photos (confidentialité)

|                               |                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| **Description**               | Les photos de carte de membre (données biométriques potentielles) sont interceptées |
| **Vraisemblance**             | Très faible — HTTPS, stockage privé Supabase, URLs signées 1h                       |
| **Gravité**                   | Élevée                                                                              |
| **Niveau de risque résiduel** | Très faible                                                                         |
| **Mesures**                   | Bucket privé (service_role uniquement), URLs signées, suppression post-décision     |

### Risque 4 — Suppression accidentelle de compte (disponibilité)

|                               |                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------- |
| **Description**               | Un utilisateur supprime son compte par erreur                                |
| **Vraisemblance**             | Faible                                                                       |
| **Gravité**                   | Modérée                                                                      |
| **Niveau de risque résiduel** | Très faible                                                                  |
| **Mesures**                   | Délai de rétractation 30 jours, email de confirmation avec lien d'annulation |

### Risque 5 — Profilage ou discrimination par les référents (équité)

|                               |                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| **Description**               | Un référent rejette systématiquement des membres sur des critères discriminatoires          |
| **Vraisemblance**             | Faible — référents nommés par les structures ecclésiales                                    |
| **Gravité**                   | Élevée                                                                                      |
| **Niveau de risque résiduel** | Modéré                                                                                      |
| **Mesures**                   | Audit log des décisions, escalade possible vers admin_national, codes de rejet standardisés |

---

## 5. Mesures techniques et organisationnelles

| Catégorie            | Mesure                                                                       |
| -------------------- | ---------------------------------------------------------------------------- |
| **Pseudonymisation** | IDs UUID aléatoires, no PII dans les URLs                                    |
| **Chiffrement**      | TLS 1.2+ en transit, AES-256-GCM pour le téléphone, Argon2id pour les hashes |
| **Confidentialité**  | RLS PostgreSQL, accès service_role limité aux Server Actions/API Routes      |
| **Intégrité**        | Audit log immuable (trigger anti-modification), hash Argon2id                |
| **Disponibilité**    | Supabase SLA 99.9%, sauvegardes automatiques                                 |
| **Minimisation**     | Photos supprimées post-décision, télégestion des sessions MFA                |
| **Droits**           | Export JSON, suppression self-service, gestion consentements                 |
| **Gouvernance**      | DPO désigné, registre des traitements, formation référents                   |

---

## 6. Consultation

- [ ] **DPO consulté** — Date : ****\_\_\_****
- [ ] **Référents paroissiaux informés** — Date : ****\_\_\_****
- [ ] **Avis CNIL** (si risque résiduel élevé non mitigé) — Non requis à ce stade

---

## 7. Validation et signatures

| Rôle                      | Nom           | Date | Signature |
| ------------------------- | ------------- | ---- | --------- |
| Responsable du traitement | [À COMPLÉTER] |      |           |
| DPO                       | [À COMPLÉTER] |      |           |

**Prochaine revue DPIA** : [Date + 1 an, ou lors d'un changement majeur de traitement]
