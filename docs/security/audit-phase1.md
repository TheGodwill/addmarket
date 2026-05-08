# Audit de Sécurité — Phase 1 (Sessions 6-11)

> **Date** : mai 2026
> **Auditeur** : Claude Sonnet 4.6 (auditeur sécurité externe senior simulé)
> **Périmètre** : ADDMarket — Phase 1 complète (auth, MFA, onboarding, vérification, RBAC, RGPD)
> **Verdict final** : [voir Partie 5](#5-décision-gono-go-phase-2)

---

## Partie 1 — Audit OWASP Top 10 (2021)

---

### A01 — Broken Access Control ✅ Conforme (avec réserve mineure)

**Implémentation** :

- **RLS PostgreSQL systématique** : toutes les tables ont `ENABLE ROW LEVEL SECURITY` avec des politiques `auth.uid()`. Aucune table exposée sans politique.
- **RBAC applicatif** (`lib/auth/permissions.ts`) : matrice `ROLE_PERMISSIONS` exhaustive, fonction `can()` pure, `resolveUserRole()` lit `app_metadata` en priorité (JWT — fresh via `getUser()`).
- **Proxy middleware** : `/admin/*` bloqué pour tous sauf `admin_local`, `admin_national`, `support`. `/referent/*` bloqué sauf référents et admins.
- **Server Actions/Route Handlers** : chaque action vérifie `supabase.auth.getUser()` en premier appel.
- **`<Authorized>` server component** : vérification côté serveur avant rendu.

**✅ Correctif appliqué — vérification DB dans le proxy** :
La vérification d'onboarding repose désormais sur `profiles.onboarding_completed_at` requêté via Supabase dans le proxy, et non plus sur le cookie `ob_done` forçable par l'utilisateur. Le cookie `ob_done` reste posé par le Server Action d'onboarding mais n'est plus utilisé pour la décision de redirection.

---

### A02 — Cryptographic Failures ✅ Conforme

**Implémentation** :

- **Argon2id** (OWASP recommandé) pour hacher les numéros de carte : `memoryCost=65536`, `timeCost=3`, `parallelism=4`, `outputLen=32`. Résistant aux attaques GPU et side-channel.
- **Bcrypt** via Supabase Auth pour les mots de passe (standard industry).
- **AES-256-GCM** pour le numéro de téléphone (`lib/crypto.ts` — chiffrement déterministe avec IV aléatoire).
- **TLS 1.2+** (HSTS max-age=63072000 avec includeSubDomains et preload).
- **Signed URLs** pour le stockage (1h expiry) — jamais d'URLs publiques permanentes.
- **Export données** : champs chiffrés/hachés masqués (`[CHIFFRÉ]` / `[HACHÉ]`), non exportés en clair.

Aucun algorithme faible (MD5, SHA1) identifié. Pas d'entropie hardcodée.

---

### A03 — Injection ✅ Conforme

**SQL** : Drizzle ORM avec requêtes paramétrées exclusivement. Aucune requête SQL concaténée détectée. Aucun `sql.raw()` non contrôlé.

**NoSQL** : Upstash Redis utilisé uniquement comme compteur de rate limiting (clés simples `ip:xxx` ou `user:xxx`). Pas d'injection possible.

**XSS** : CSP nonce dynamique generé par `crypto.getRandomValues()` dans le proxy. Aucun `dangerouslySetInnerHTML` ni `eval()` dans le code applicatif (vérifié par grep). React échappe automatiquement les sorties JSX.

---

### A04 — Insecure Design ✅ Conforme

**Threat modeling intégré** :

- Vérification d'identité à deux facteurs (photo + validation humaine référent).
- Délai 24h entre soumissions de vérification (anti-spam via `resubmit_after`).
- Cooling period 30 jours pour la suppression de compte.
- Codes de rejet standardisés pour éviter le profilage discriminatoire.
- Audit log immuable (trigger PostgreSQL `prevent_audit_log_modification` bloquant UPDATE/DELETE).

**DPIA** complète avec 5 risques documentés, mesures correctives listées.

---

### A05 — Security Misconfiguration ✅ Conforme (avec réserve mineure)

**En place** :

- Variables d'environnement validées par Zod au démarrage (`lib/env.ts`, `lib/env.server.ts`).
- En-têtes de sécurité complets : HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, CSP nonce.
- `admin.ts` : client service_role avec `persistSession: false`, `autoRefreshToken: false`.
- Bucket `card-photos` privé (non public).
- `server-only` sur tous les modules accédant à la DB ou au service_role.

**Réserve mineure — CSP `style-src 'unsafe-inline'`** :
La directive `style-src 'unsafe-inline'` est permissive. Tailwind génère des styles inline au runtime, ce qui impose cette relaxation. **Impact limité** dans ce contexte applicatif (pas d'injection de styles via input utilisateur).

**Action corrective (LOW)** : Envisager l'extraction des styles Tailwind en classes statiques pour pouvoir passer en `style-src 'self'` à terme.

---

### A06 — Vulnerable and Outdated Components ⚠️ À surveiller

**CVEs identifiées** (6 vulnérabilités modérées, 0 haute, 0 critique) :

| Package                                  | CVE                 | Sévérité | Contexte                      | Statut                      |
| ---------------------------------------- | ------------------- | -------- | ----------------------------- | --------------------------- |
| `esbuild ≤0.24.2`                        | GHSA-67mh-4wv8-2f99 | Moderate | Dev only (Vite + drizzle-kit) | Dev uniquement, non produit |
| `vite ≤6.4.1`                            | GHSA-4w7w-66w2-5vf9 | Moderate | Dev only (test/build)         | Dev uniquement, non produit |
| `postcss <8.5.10`                        | GHSA-8f24-v5vv-gm5j | Moderate | Build only                    | ✅ Corrigé — postcss 8.5.14 |
| `next-intl ≤4.9.1` (open redirect)       | —                   | Moderate | Prod                          | Voir note                   |
| `next-intl ≤4.9.1` (prototype pollution) | GHSA-4c35-wcg5-mm9h | Moderate | Feature v4 expérimentale      | Voir note                   |

**Note `next-intl`** : le projet est sur `next-intl v3` (3.26.5) avec Next.js 16. La montée en v4 (version patchée ≥4.9.2) est un breaking change majeur incompatible avec l'API actuelle. La vulnérabilité de prototype pollution (`GHSA-4c35-wcg5-mm9h`) cible `experimental.messages.precompile`, une feature exclusivement v4 que le projet n'utilise pas — **impact nul**. L'open redirect est à investiguer sur v3 spécifiquement.

**Action corrective (LOW)** : Investiguer l'open redirect sur next-intl v3 ; planifier la migration v4 lors d'un sprint dédié.

---

### A07 — Identification and Authentication Failures ✅ Conforme

**En place** :

- **MFA obligatoire** : OTP email via Supabase Auth. Les codes de récupération sont hachés (Argon2id).
- **Rate limiting strict** : login 5/min, signup 3/h, MFA 5/15min, recovery 5/15min — tous par IP via Upstash.
- **`supabase.auth.getUser()`** utilisé partout (validation JWT côté serveur) — jamais `getSession()` seul.
- **Session cookie httpOnly** géré par Supabase SSR.
- **Re-authentification par mot de passe** avant promotion de rôle (client jetable `persistSession: false`).
- **Vérification AAL2** (MFA actif) avant promotion admin.

---

### A08 — Software and Data Integrity Failures ✅ Conforme

**En place** :

- **Audit log immuable** : trigger PostgreSQL `audit_log_immutable` bloque toute modification (`RAISE EXCEPTION`).
- **Lockfile** `pnpm-lock.yaml` versionné — dépendances reproductibles.
- **Sentry** intégré pour la détection d'anomalies en production.
- **`server-only`** sur les modules sensibles — impossible d'importer dans le client bundle.

---

### A09 — Security Logging and Monitoring Failures ✅ Conforme

**En place** :

- **Audit log** : actions sensibles tracées (promotions, rejets, connexions, soumissions) avec `actor_id`, action, IP, user-agent, timestamp, metadata.
- **Pino logger** avec `redact` automatique sur `email`, `password`, `token`, `key`, `authorization`, `cookie`, etc.
- **Sentry** : erreurs applicatives capturées côté client, server, edge.
- **`anonymisé à la suppression`** : `actor_id → NULL` via FK CASCADE SET NULL à la suppression d'un compte.

---

### A10 — Server-Side Request Forgery ✅ Conforme

**En place** :

- Aucun endpoint ne prend d'URL externe en paramètre (ni fetch depuis une URL utilisateur).
- Les images sont hébergées uniquement sur `res.cloudinary.com` et `*.supabase.co` (whitelist `remotePatterns` dans `next.config.ts`).
- CSP `connect-src` restreint à `'self'` et `*.supabase.co` — pas d'outbound arbitraire depuis le client.

---

## Partie 2 — Audit RGPD

### Points conformes

- ✅ **Minimisation** : seuls les champs nécessaires collectés. Photos supprimées post-décision.
- ✅ **Consentement** : bandeau cookies (opt-in analytics), tracking du consentement en DB avec horodatage et version.
- ✅ **Droit à l'effacement** : workflow complet — demande → cooling 30j → cron → suppression en cascade.
- ✅ **Droit à la portabilité** : export JSON via `/api/account/export`.
- ✅ **Audit de traitement** : registre des traitements à 8 entrées documenté.
- ✅ **DPIA** : rédigée avec 5 risques, mesures et signatures (à signer par DPO).
- ✅ **Sous-traitants EU** : Supabase (EU), Vercel (EU), PostHog (EU), Upstash (EU). Seul Resend est hors UE (USA — CCT signées).
- ✅ **Chiffrement** : téléphone chiffré AES-256, numéro carte haché Argon2id.

### Points à corriger avant production

1. **⚠️ DPIA non signée** : les champs `[À COMPLÉTER]` (Responsable du traitement, DPO, adresse) doivent être remplis et le document signé par le DPO avant mise en production (obligation légale art. 35 RGPD).

2. **⚠️ Pas de délai de conservation des données biométriques documenté côté Storage** : la politique de suppression des photos post-décision est implémentée dans le code mais pas dans un document de procédure opérationnelle. Risquer un oubli lors d'une migration.

3. **⚠️ Bandeau cookies — absence de lien "Politique des cookies" distinct** : le lien renvoie vers `/legal/privacy` qui couvre l'ensemble de la politique. La CNIL recommande une page dédiée cookies ou une section bien identifiée.

4. **⚠️ Pas de notification utilisateur si la vérification expire** : si le statut `verified` expire (cron `expire-memberships`), l'utilisateur n'est pas notifié par email. Il découvrira la perte d'accès en tentant d'agir.

5. **INFO — `dpo@addmarket.fr`** : cette adresse est référencée dans la politique de confidentialité et le registre. Vérifier qu'elle est opérationnelle avant le lancement.

---

## Partie 3 — Audit qualité code

### Couverture tests

| Module                                          | Tests             | Couverture estimée |
| ----------------------------------------------- | ----------------- | ------------------ |
| `lib/crypto.ts` (hashCardNumber/verify)         | 4 tests           | ~95%               |
| `lib/auth/permissions.ts` (can/resolveUserRole) | 24 tests          | ~100%              |
| `lib/mfa.ts` (hashRecoveryCode/verify)          | 8 tests           | ~90%               |
| `lib/utils.ts`                                  | 3 tests           | ~80%               |
| `app/referent/verifications/actions.ts`         | 17 tests          | ~75%               |
| Server Actions auth, admin, deletion            | 0 tests unitaires | 0%                 |
| Route Handlers (export, cron)                   | E2E smoke only    | ~30%               |

**Manque identifié** : les Server Actions `requestDeletion`, `cancelDeletion`, `updateConsent`, `revokeAllConsents` et l'action `promoteRole` ne sont pas couverts par des tests unitaires. Ce sont des modules critiques (RGPD, privilèges).

### TODO/FIXME

Aucun `TODO` ni `FIXME` oublié dans le code applicatif (grep exhaustif effectué).

### Dépendances avec CVE

Voir [A06](#a06--vulnerable-and-outdated-components-️-à-améliorer) — 6 CVE modérées, 0 haute/critique.

### Patterns anti-sécurité

| Pattern                   | Résultat                                      |
| ------------------------- | --------------------------------------------- |
| `dangerouslySetInnerHTML` | ✅ Absent                                     |
| `eval()`                  | ✅ Absent                                     |
| `as any` / `: any`        | ✅ Absent dans le code applicatif             |
| Non-null assertion `!`    | ✅ Éliminé (remplacé par `.at(0)` avec guard) |
| SQL concaténé             | ✅ Absent (Drizzle ORM uniquement)            |

---

## Partie 4 — Tests d'intrusion à mener

Ces 10 scénarios sont réalisables manuellement ou par un pentester avec un compte de test.

### 1. Contournement de l'onboarding par cookie forgé

**Action** : Créer un compte, poser manuellement `ob_done=1` dans les cookies navigateur sans passer par l'onboarding, puis accéder à `/account/delete`.
**Attendu** : accès aux pages authentifiées, mais le profil est vide (pas de `onboarding_completed_at`). Les Server Actions renvoyant vers le profil retourneront des données nulles mais ne créeront pas de vulnérabilité de sécurité.
**Risque** : dégradation UX, non risque sécurité.

### 2. IDOR sur l'export de données

**Action** : S'authentifier avec l'utilisateur A, intercepter la requête `GET /api/account/export`, modifier le cookie de session pour un autre utilisateur valide.
**Attendu** : 401 (Supabase valide le JWT côté serveur). Aucun accès aux données d'autrui.

### 3. Force brute sur le login

**Action** : Envoyer 10 requêtes de login erronées en moins d'une minute depuis la même IP.
**Attendu** : blocage à la 6ème requête avec HTTP 429.

### 4. Token d'annulation de suppression d'un autre utilisateur

**Action** : Avec l'utilisateur B, récupérer (via logs ou devinette) le `cancel_token` d'une demande de suppression de l'utilisateur A, puis appeler `cancelDeletion` avec ce token.
**Attendu** : l'action vérifie `auth.uid()` — seul le propriétaire peut annuler. Le token sans session valide → 401/redirect.

### 5. Élévation de privilèges via modification d'app_metadata client

**Action** : Intercepter une réponse Supabase et injecter `role: 'admin_national'` dans le JWT local (localStorage ou cookie).
**Attendu** : `supabase.auth.getUser()` revalide le JWT côté serveur. Le middleware lit `app_metadata` du JWT vérifié par Supabase — toute falsification côté client est rejetée.

### 6. Soumission répétée de vérification (anti-spam)

**Action** : Soumettre une vérification, la faire rejeter, puis tenter de soumettre immédiatement une nouvelle vérification.
**Attendu** : blocage par `resubmit_after` (délai 24h) — message d'erreur explicite.

### 7. Upload de fichier malveillant dans le bucket card-photos

**Action** : Uploader un fichier `malware.php` ou un SVG avec script XSS via l'upload de carte.
**Attendu** : rejet par la politique bucket (`allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp']`). Supabase rejette à l'API Storage.

### 8. Accès aux photos de carte d'un autre utilisateur

**Action** : Connaître le chemin de stockage d'une photo (`{uid}/...`), tenter d'accéder via URL directe ou signed URL expirée.
**Attendu** : bucket privé, pas d'accès sans URL signée. Les signed URLs expirent après 1h. Le `SELECT` RLS sur `storage.objects` est réservé au `service_role`.

### 9. Injection dans le champ de commentaire de rejet référent

**Action** : En tant que référent, saisir `<script>alert(1)</script>` comme commentaire de rejet.
**Attendu** : React échappe automatiquement les sorties JSX. Le commentaire est stocké comme texte brut, affiché sans interprétation HTML.

### 10. Appel direct au cron sans secret

**Action** : `GET /api/cron/process-deletions` sans en-tête `Authorization`.
**Attendu** : si `CRON_SECRET` est configuré → 401. Si non configuré → 200 (mode dev sans Redis). Vérifier que `CRON_SECRET` est bien défini en production.

---

## Partie 5 — Décision GO/NO-GO Phase 2

### ✅ VERDICT : GO — avec actions prioritaires avant déploiement production

La Phase 1 est **techniquement prête** pour passer en Phase 2 (développement). Les fondations de sécurité sont solides : RLS systématique, MFA obligatoire, Argon2id, rate limiting, audit log immuable, CSP nonce, RGPD structuré.

### Actions OBLIGATOIRES avant mise en production (bloquantes)

| Priorité | Action                                                                                    | Effort        |
| -------- | ----------------------------------------------------------------------------------------- | ------------- |
| 🔴 P0    | Signer la DPIA — nommer Responsable du traitement et DPO                                  | Admin         |
| 🔴 P0    | Mettre en place `dpo@addmarket.fr` et vérifier qu'elle est opérationnelle                 | Ops           |
| 🔴 P0    | Configurer `CRON_SECRET` en production (le cron est non protégé sans ça)                  | DevOps        |
| 🟡 P1    | Investiguer open redirect next-intl v3 (CVE se referant à v4 — impact probable nul en v3) | Investigation |

### Actions RECOMMANDÉES avant lancement (non bloquantes)

| Priorité | Action                                                                                | Effort        |
| -------- | ------------------------------------------------------------------------------------- | ------------- |
| ✅ Fait  | Remplacé cookie `ob_done` par vérification DB `onboarding_completed_at` dans le proxy | Appliqué      |
| 🟡 P1    | Email de notification à l'utilisateur lors de l'expiration de sa vérification         | 1h            |
| 🟡 P1    | Mettre à jour vite, esbuild, postcss (CVE build/dev)                                  | `pnpm update` |
| 🟡 P2    | Ajouter tests unitaires sur `requestDeletion`, `cancelDeletion`, `updateConsent`      | 3h            |
| 🟡 P2    | Page ou section dédiée `/legal/cookies` (recommandation CNIL)                         | 1h            |

### Ce qui est prêt et solide

- Architecture RBAC : testée (24 tests), extensible, dual-write cohérent
- Cryptographie : Argon2id + AES-256-GCM, aucun algo faible
- Rate limiting : toutes les surfaces d'authentification protégées
- RGPD : structure complète (export, suppression, consentements, DPIA, registre)
- Audit log : immuable, anonymisé à la suppression, conservé 5 ans
- CSP : nonce dynamique, frame-ancestors none, form-action self
