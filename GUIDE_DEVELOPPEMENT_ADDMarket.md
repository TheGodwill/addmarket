# 🏛️ GUIDE DE DÉVELOPPEMENT — PROJET ADDMarket

> **Marketplace communautaire pour les Assemblées de Dieu (ADD)**
> Guide complet de prompts séquentiels pour développer le projet de bout en bout avec Claude.

---

## 📖 Comment utiliser ce guide

### Avant de commencer

1. **Crée un Projet Claude** sur claude.ai (feature "Projects")
2. **Copie le PROMPT-SYSTÈME** (Section 0) dans les "Project instructions"
3. **Suis les sessions dans l'ordre** — chaque session prépare la suivante
4. **Une session = une tâche atomique** — n'enchaîne pas 3 prompts dans le même message
5. **Garde un dépôt Git ouvert en parallèle** — tu copies le code livré dans ton IDE, tu testes, tu commits

### Règles d'or

- ✅ **Lis chaque réponse de Claude AVANT de copier le code** — les LLMs hallucinent
- ✅ **Teste localement chaque livrable** avant de passer à la session suivante
- ✅ **Commit après chaque session validée** — tu peux toujours revenir en arrière
- ✅ **Pose des questions** si quelque chose te semble flou — n'enchaîne pas dans le doute
- ❌ **Ne déploie pas en production sans relecture humaine senior**
- ❌ **Ne saute pas les sessions de tests et de sécurité** — elles paraissent ennuyeuses, elles te sauvent

### Légende des sessions

- 🟢 **FACILE** : tu peux suivre sans bagage technique fort
- 🟡 **MOYEN** : compréhension de base du dev nécessaire
- 🔴 **CRITIQUE** : ne saute jamais, ne bâcle jamais, fais relire par un humain senior

### Durée estimée

- **Setup complet (Sessions 0-3)** : 1-2 semaines
- **MVP fonctionnel (Sessions 0-25)** : 3-4 mois
- **Beta + lancement national (Sessions 0-40)** : 6-7 mois
- **App mobile + monétisation (toutes sessions)** : 9-12 mois

---

## 🗺️ Table des matières

- [Section 0 — Prompt Système Maître](#section-0--prompt-système-maître)
- [Phase 0 — Fondations](#phase-0--fondations) (Sessions 1-5)
- [Phase 1 — Auth et vérification membres](#phase-1--auth-et-vérification-membres) (Sessions 6-12)
- [Phase 2 — Profils vendeurs et catalogue](#phase-2--profils-vendeurs-et-catalogue) (Sessions 13-19)
- [Phase 3 — Recherche et messagerie](#phase-3--recherche-et-messagerie) (Sessions 20-25)
- [Phase 4 — Beta et hardening](#phase-4--beta-et-hardening) (Sessions 26-30)
- [Phase 5 — Lancement national](#phase-5--lancement-national) (Sessions 31-35)
- [Phase 6 — Mobile et monétisation](#phase-6--mobile-et-monétisation) (Sessions 36-42)
- [Annexes — Prompts utilitaires](#annexes--prompts-utilitaires)

---

# Section 0 — Prompt Système Maître

> **À copier dans les "Project instructions" de ton Projet Claude. Une seule fois. Tu ne le re-colles plus jamais ensuite.**

```markdown
# RÔLE ET MISSION

Tu es Lead Architect & Senior Full-Stack Engineer pour le projet ADDMarket,
une marketplace communautaire fermée pour les Assemblées de Dieu France
(ADD), à échelle nationale. Tu opères selon les standards d'une équipe
d'ingénierie senior : sécurité par défaut, code testé, décisions justifiées,
livraisons incrémentales déployables.

# CONTEXTE PROJET

**Vision** : permettre aux membres vérifiés des ADD de découvrir et soutenir
les activités économiques (commerces, services, produits) des autres membres,
au sein d'un espace de confiance.

**Utilisateurs** :

- Membre-vendeur (catalogue + profil business)
- Membre-acheteur (recherche + contact)
- Référent paroisse (valide les inscriptions de son église)
- Admin national (supervision, modération, support)

**Vérification d'identité** : carte de membre ADD + validation humaine par un
référent paroisse local + revérification annuelle.

**Contraintes** :

- Gratuit total an 1, freemium an 2+
- Pas de paiement intégré au MVP
- Échelle nationale dès la sortie de beta
- Hébergement EU obligatoire (RGPD + souveraineté)

# STACK TECHNIQUE IMPOSÉE

- Frontend : Next.js 14+ App Router, React 18+, TypeScript strict
- Styling : Tailwind CSS + shadcn/ui
- Backend : Next.js API Routes + Server Actions
- Database : PostgreSQL via Supabase (région EU), RLS systématique
- Auth : Supabase Auth (email/password + MFA)
- Storage : Supabase Storage (privé) + Cloudinary (public)
- Search : PostgreSQL full-text → Meilisearch (Phase 3)
- Cache : Upstash Redis (rate limiting)
- Validation : Zod sur 100% des inputs serveur
- ORM : Drizzle ORM
- Tests : Vitest (unit), Playwright (E2E)
- Monitoring : Sentry + Posthog
- Email : Resend
- Mobile (Phase 6) : React Native + Expo, monorepo Turborepo
- CI/CD : GitHub Actions, Vercel
- Package manager : pnpm

Toute déviation doit être justifiée et validée explicitement.

# RÈGLES DE SÉCURITÉ NON-NÉGOCIABLES

Tu refuses de produire du code qui viole ces règles.

1. Zero-trust client : autorisations toujours côté serveur ET via RLS.
2. Validation Zod systématique sur tous les inputs serveur.
3. RLS obligatoire sur chaque nouvelle table, écrites avec la migration.
4. Secrets : jamais en dur, jamais loggés, variables env typées Zod.
5. PII : numéro carte hashé (argon2id), téléphone chiffré at-rest, photos
   carte supprimées après validation, jamais de PII dans logs.
6. Auth : password min 12 chars, vérif email obligatoire, MFA forcé pour
   référents/admins, sessions 1h avec refresh.
7. Rate limiting sur tous endpoints sensibles (middleware, non optionnel).
8. Headers sécurité (CSP stricte, HSTS, X-Frame-Options DENY) dans
   next.config.js dès le départ.
9. Audit trail : actions sensibles → audit_log (INSERT-only).
10. Dépendances : pnpm audit à chaque PR, Renovate pour patch/minor auto.
11. Uploads : validation MIME serveur, limite taille, redimensionnement,
    URLs signées à expiration courte pour fichiers privés.
12. Erreurs : pas de stack trace en prod, messages génériques côté client,
    détails dans Sentry.

# RÈGLES D'INGÉNIERIE

1. TypeScript strict, pas de `any` sans justification.
2. Tests : 70% couverture métier, 100% sécurité (auth, RLS, validation).
3. Migrations DB versionnées, réversibles, jamais éditer une migration
   appliquée en prod.
4. Conventional Commits, commits atomiques, en anglais.
5. Documentation : README court par module, ADR pour choix majeurs.
6. Performance : pagination cursor-based, pas de N+1, Lighthouse 90+ mobile.
7. Accessibilité WCAG 2.1 AA, testé avec axe-core en CI.
8. i18n : strings externalisées dès le début (next-intl).
9. Pas d'abstraction prématurée (règle de 3).

# MÉTHODOLOGIE PAR TÂCHE

Pour chaque demande :

**1. CLARIFICATION** — Si ambigu, 1-3 questions ciblées AVANT de coder.

**2. PLAN** — Objectif, sous-tâches, fichiers, tests, risques sécurité,
complexité estimée. Tu attends validation.

**3. IMPLÉMENTATION** — Code complet (pas de TODO), imports explicites,
types précis, validation Zod en API, RLS sur nouvelles tables.

**4. TESTS** — Unit + intégration selon le cas. Pas de prod sans test
sécurité.

**5. CHECKLIST FINALE** :

- [ ] Validation inputs
- [ ] RLS / autorisations
- [ ] Pas de PII en log
- [ ] Tests passants
- [ ] Pas de secret hardcodé
- [ ] Migration réversible (si DB)
- [ ] Erreurs gérées
- [ ] A11y (si UI)

**6. POINTS D'ATTENTION** — Choix discutables, dette introduite,
dépendances ajoutées, risques résiduels.

# CE QUE TU NE FAIS PAS

- Pas de code "bouchonné" sans le signaler
- Pas d'invention d'API (Supabase, Next.js) — tu indiques "à vérifier"
- Pas de saut des tests sécurité
- Pas de refacto sauvage non demandée
- Pas de réinvention crypto

# FORMAT DE RÉPONSE

Pour le code :

- Bloc par fichier avec chemin complet en commentaire
- Code complet, pas de "..."
- Ordre logique (types → DB → API → UI)
- Résumé final des changements

# ÉTAT ACTUEL

À chaque session, je précise : phase, dernière tâche, tâche du jour,
contraintes spécifiques. Si je l'oublie, tu demandes.

---

Confirme l'intégration de ce cadre. À chaque session que je t'envoie,
applique-le rigoureusement.
```

---

# Phase 0 — Fondations

> **Objectif** : avoir un projet déployable sur Vercel avec CI/CD verte, avant la moindre ligne de code métier.
> **Durée estimée** : 1-2 semaines.

---

## 🟢 Session 1 — Initialisation du projet

**Objectif** : créer le repo Next.js avec TypeScript strict et toutes les conventions.

### Prompt à copier

```
PHASE 0 — Session 1 : Initialisation du projet ADDMarket.

Génère-moi un guide pas-à-pas pour initialiser le projet sur ma machine locale :

1. Commandes shell exactes à exécuter (création projet Next.js 14 avec App
   Router, TypeScript, Tailwind, pnpm)
2. Structure de dossiers cible avec justification de chaque dossier
   (app/, components/, lib/, db/, server/, tests/, etc.)
3. Fichier `tsconfig.json` complet avec strict mode maximal
4. Fichier `package.json` avec toutes les dépendances de base (Zod, Drizzle,
   Supabase JS, shadcn/ui CLI, Vitest, Playwright, ESLint, Prettier, Husky)
5. Configuration ESLint + Prettier + Husky pre-commit (lint + typecheck +
   tests)
6. Fichier `.gitignore` complet (incluant .env*, .vercel, etc.)
7. Fichier `.env.example` avec toutes les variables d'env attendues
   (commentées, sans valeurs réelles)
8. Fichier `lib/env.ts` qui valide les variables d'env avec Zod au démarrage
9. README.md initial avec sections : description, prérequis, installation,
   scripts disponibles, structure du projet

Pour chaque fichier, donne-moi le contenu COMPLET copiable directement.

Ajoute en fin de réponse une checklist "Comment vérifier que tout fonctionne"
avec les commandes à lancer pour valider le setup.
```

### Livrables attendus

- [ ] Projet `ADDMarket/` créé localement
- [ ] `pnpm dev` démarre sans erreur
- [ ] `pnpm typecheck` passe
- [ ] `pnpm lint` passe
- [ ] Hooks Husky actifs (essaie un commit avec une erreur ESLint, doit échouer)

---

## 🟢 Session 2 — Repo Git et CI/CD

**Objectif** : avoir un repo GitHub avec branches protégées et pipeline CI vert.

### Prompt à copier

```
PHASE 0 — Session 2 : Setup Git et CI/CD.

Le projet local est créé. Maintenant guide-moi pour :

1. Initialiser le repo Git local + premier commit (Conventional Commits)
2. Créer le repo GitHub (instructions UI + commandes gh CLI alternatives)
3. Configuration des branches protégées sur `main` et `develop` :
   - Pas de push direct
   - PR review obligatoire
   - Status checks CI doivent passer
   - Commits signés (recommandé)
4. Workflow GitHub Actions complet (`.github/workflows/ci.yml`) avec :
   - Job lint (ESLint + Prettier check)
   - Job typecheck (tsc --noEmit)
   - Job test (Vitest unit tests)
   - Job audit (pnpm audit + dépendances obsolètes)
   - Job build (Next.js build)
   - Cache pnpm pour rapidité
   - Matrix Node 20 + Node 22
5. Configuration Renovate (`renovate.json`) pour auto-merge patch/minor
   sécurisés et PR pour major
6. Template de PR (`.github/pull_request_template.md`) avec checklist
   sécurité
7. Templates d'issues (bug, feature) dans `.github/ISSUE_TEMPLATE/`
8. Fichier `CONTRIBUTING.md` court (conventions commits, branches, PR)
9. Fichier `SECURITY.md` (politique de divulgation responsable, contact)

Donne-moi tout le contenu copiable, et la commande exacte pour pousser le
premier commit qui déclenchera le pipeline CI.
```

### Livrables attendus

- [ ] Repo GitHub créé, branches protégées configurées
- [ ] Pipeline CI vert sur le premier push
- [ ] PR template visible quand tu ouvres une nouvelle PR
- [ ] Renovate activé (vérifie sur https://github.com/apps/renovate)

---

## 🟡 Session 3 — Setup Supabase et Drizzle ORM

**Objectif** : connecter le projet à Supabase avec Drizzle, et créer la première migration.

### Prompt à copier

```
PHASE 0 — Session 3 : Connexion à Supabase et configuration Drizzle ORM.

Guide-moi pour :

1. Créer 3 projets Supabase (dev, staging, prod) en région EU
   - Étapes UI précises sur supabase.com
   - Variables à récupérer (URL, anon key, service role key) et où les
     stocker (.env.local, GitHub Secrets, Vercel)
   - Politique de sécurité du service_role_key (jamais côté client)

2. Setup Drizzle ORM avec Supabase :
   - Installation (`drizzle-orm`, `drizzle-kit`, `postgres`)
   - Fichier `drizzle.config.ts`
   - Fichier `db/client.ts` avec connexion typée (server-side only)
   - Fichier `db/schema/index.ts` (point d'entrée des schémas)
   - Scripts npm : `db:generate`, `db:migrate`, `db:push`, `db:studio`

3. Première migration : table `_health` ultra-simple (id uuid, created_at
   timestamptz) juste pour vérifier que la chaîne migration fonctionne
   end-to-end

4. Fichier `lib/supabase/server.ts` (client serveur avec cookies pour Auth)
   et `lib/supabase/client.ts` (client browser pour realtime)
   Selon la doc officielle @supabase/ssr la plus récente.

5. Documenter dans le README la procédure de migration locale → staging →
   prod (pas d'auto-deploy DB en prod)

6. Endpoint de healthcheck `/api/health` qui :
   - Ping la DB (SELECT 1)
   - Retourne JSON avec status, version, timestamp
   - Headers no-cache
   - Pas d'info sensible exposée

Important : à chaque fichier, applique les règles de sécurité du prompt
système (variables typées Zod, pas de secret en log, etc.).
```

### Livrables attendus

- [ ] 3 projets Supabase créés
- [ ] `pnpm db:studio` ouvre Drizzle Studio
- [ ] Migration `_health` appliquée en dev
- [ ] `curl http://localhost:3000/api/health` retourne du JSON valide
- [ ] CI verte avec ces ajouts

---

## 🟡 Session 4 — Configuration sécurité globale

**Objectif** : poser toutes les couches de sécurité avant le moindre code métier.

### Prompt à copier

```
PHASE 0 — Session 4 : Configuration sécurité globale (couches transverses).

Implémente toutes les couches de sécurité transverses du projet :

1. **Headers de sécurité** dans `next.config.js` :
   - Content-Security-Policy stricte (préparée pour Cloudinary, Supabase,
     Sentry, Posthog) avec nonce pour scripts inline
   - Strict-Transport-Security (max-age 2 ans, includeSubDomains, preload)
   - X-Frame-Options DENY
   - X-Content-Type-Options nosniff
   - Referrer-Policy strict-origin-when-cross-origin
   - Permissions-Policy minimaliste

2. **Middleware Next.js** (`middleware.ts`) qui :
   - Génère un nonce CSP par requête
   - Force HTTPS en production
   - Ajoute headers de sécurité dynamiques
   - Prépare le rate limiting (placeholder, on l'active en Session 5)

3. **Rate limiting** avec Upstash Redis :
   - Setup compte Upstash (instructions UI)
   - Fichier `lib/rate-limit.ts` avec helpers configurables
   - Limites par défaut documentées (auth: 5/min/IP, signup: 3/h/IP,
     API standard: 60/min/user)

4. **Validation env stricte** dans `lib/env.ts` (étendue de Session 1) :
   - Toutes les variables Supabase, Upstash, Sentry, Resend, etc.
   - Validation au démarrage du serveur
   - Erreur claire si manquant
   - Distinction client/serveur (NEXT_PUBLIC_ explicite)

5. **Logger structuré** (`lib/logger.ts`) avec Pino :
   - Pas de PII (email, téléphone, carte)
   - Niveaux : debug, info, warn, error, fatal
   - Format JSON en prod, pretty en dev
   - Helper `redactPII()` pour nettoyer les objets avant log

6. **Setup Sentry** :
   - Installation et configuration (`sentry.client.config.ts`,
     `sentry.server.config.ts`, `sentry.edge.config.ts`)
   - Filtre `beforeSend` qui supprime les PII
   - Sample rate adapté (10% prod, 100% dev)
   - Désactivé en environnement de test

7. **Helpers crypto** (`lib/crypto.ts`) :
   - hashCardNumber(plaintext) avec argon2id
   - verifyCardNumber(plaintext, hash)
   - Documentation : pourquoi argon2id et pas bcrypt
   - Tests unitaires de ces fonctions

Applique strictement les règles du prompt système. Termine par la checklist
sécurité complète.
```

### Livrables attendus

- [ ] Lighthouse Security headers : score A+ sur securityheaders.com
- [ ] Rate limit testé manuellement (6 requêtes en 1 min sur endpoint test → 429)
- [ ] Sentry capture une erreur de test
- [ ] Tests unitaires `lib/crypto.ts` passent

---

## 🔴 Session 5 — Threat model et audit du setup

**Objectif** : avant d'écrire la moindre fonctionnalité, valider que les fondations sont saines.

### Prompt à copier

```
PHASE 0 — Session 5 : Threat model STRIDE + audit du setup actuel.

Avant de passer en Phase 1, je veux que tu fasses deux choses critiques :

**Partie 1 — Threat Model STRIDE complet du projet ADDMarket**

Pour chacune des 6 catégories STRIDE, identifie :
- Les menaces spécifiques au projet (pas du blabla générique)
- Les actifs concernés (données, fonctionnalités, comptes)
- L'impact business si exploitée
- Les contre-mesures déjà en place ou prévues
- Les contre-mesures manquantes à ajouter

Catégories STRIDE :
- Spoofing (usurpation d'identité)
- Tampering (altération données)
- Repudiation (déni d'action)
- Information Disclosure (fuite info)
- Denial of Service
- Elevation of Privilege

Format : tableau markdown clair, classé par criticité.

**Partie 2 — Audit du setup actuel**

Mets-toi en mode auditeur sécurité externe. Examine ce qu'on a construit
en Sessions 1-4 et liste :
- Les vulnérabilités potentielles classées Critical/High/Medium/Low
- Les bonnes pratiques manquées
- Les configurations à durcir avant Phase 1
- Les actions correctives priorisées (quoi faire AVANT de continuer)

Sois direct et impitoyable. Mieux vaut découvrir les failles maintenant.

À la fin, donne-moi un GO/NO-GO pour passer en Phase 1, avec la liste
exhaustive de ce qui doit être corrigé avant.
```

### Livrables attendus

- [ ] Document threat model sauvegardé dans `docs/security/threat-model.md`
- [ ] Toutes les actions correctives "Critical" et "High" traitées
- [ ] Décision GO/NO-GO documentée

> ⚠️ **NE PASSE PAS EN PHASE 1 SI LE GO N'EST PAS CLAIR**. Cette session est ton dernier filet de sécurité avant que ça devienne coûteux à corriger.

---

# Phase 1 — Auth et vérification membres

> **Objectif** : un membre peut s'inscrire, être validé par son référent paroisse, et avoir un compte vérifié avec MFA optionnel.
> **Durée estimée** : 4 semaines.
> **🔴 Phase la plus critique** : c'est le cœur sécuritaire du système.

---

## 🔴 Session 6 — Schéma de base de données complet

### Prompt à copier

```
PHASE 1 — Session 6 : Schéma de base de données complet pour la
vérification membres.

Crée le schéma Drizzle complet pour gérer :

**Entités à modéliser** :
- `churches` : église locale ADD (id, name, city, region, address, pastor,
  is_active, created_at)
- `profiles` : profil étendu lié à auth.users de Supabase (display_name,
  phone_encrypted, city, region, church_id, membership_status enum,
  membership_card_hash, verified_at, verified_by, expires_at, created_at,
  updated_at)
- `church_referents` : table de liaison église <-> référent (church_id,
  user_id, role enum 'referent'|'admin_local', granted_at, granted_by)
- `verification_requests` : demandes de vérification en attente
  (id, user_id, church_id, card_photo_storage_path, status enum,
  submitted_at, processed_at, processed_by, rejection_reason)
- `audit_log` : journal d'audit immuable (id, actor_id, action, target_type,
  target_id, metadata jsonb, ip_address inet, user_agent, created_at)

**Pour chaque table, livre** :
1. Le schéma Drizzle dans `db/schema/[entity].ts` avec types TypeScript
   inférés exportés
2. La migration SQL générée (réversible, avec UP et DOWN documentés)
3. Les **Row Level Security policies** complètes (lecture, insertion, mise
   à jour, suppression) — le détail le plus important
4. Les index nécessaires (jamais de scan séquentiel sur ces tables)
5. Les contraintes (CHECK, UNIQUE, FK avec ON DELETE approprié)

**RLS spécifiques attendues** :
- profiles : lecture publique des champs non sensibles, modification owner
  uniquement, statut modifiable seulement par référent/admin
- verification_requests : lecture par owner + référent de l'église
  concernée + admin national
- audit_log : INSERT only pour le service role, lecture admin uniquement,
  UPDATE et DELETE révoqués au niveau Postgres
- church_referents : lecture publique (qui est référent), modification
  admin national uniquement

**Sécurité critique** :
- membership_card_hash : argon2id, jamais en clair
- phone_encrypted : pgsodium ou chiffrement applicatif (justifie ton choix)
- audit_log : ajouter un trigger qui empêche UPDATE/DELETE même pour le
  superuser
- Bucket Storage Supabase pour les photos cartes : privé, RLS, suppression
  automatique après 7 jours via cron

Termine avec :
- Diagramme ERD en ASCII
- Script de seed pour développement (3 églises fictives, 1 référent,
  1 admin, 5 membres en différents statuts)
- Tests d'intégration Vitest qui valident les RLS (un user ne peut pas
  voir les données d'un autre)
```

### Livrables attendus

- [ ] Migrations appliquées sans erreur
- [ ] Tests RLS passent
- [ ] Seed exécutable : `pnpm db:seed`
- [ ] ERD documenté dans `docs/database/erd.md`

---

## 🔴 Session 7 — Authentification de base

### Prompt à copier

```
PHASE 1 — Session 7 : Implémentation authentification de base.

Implémente l'authentification email/password avec Supabase Auth :

1. **Pages** (App Router) :
   - `/auth/signup` : formulaire inscription (email, password, confirm)
   - `/auth/login` : formulaire connexion
   - `/auth/forgot-password` : demande reset
   - `/auth/reset-password` : nouveau mot de passe avec token
   - `/auth/verify-email` : page de confirmation email
   - `/auth/callback` : route handler pour callbacks Supabase

2. **Server Actions** dans `app/auth/actions.ts` :
   - `signUp()` avec validation Zod stricte
   - `signIn()` avec rate limiting
   - `requestPasswordReset()`
   - `resetPassword()`
   - `signOut()`

3. **Politique mot de passe** :
   - Min 12 caractères
   - Au moins : 1 maj, 1 min, 1 chiffre, 1 spécial
   - Vérif contre HaveIBeenPwned API (k-anonymity, ne jamais envoyer le
     password en clair)
   - Indicateur de force visuel côté client (zxcvbn)

4. **Rate limiting strict** :
   - signup : 3/heure/IP
   - login : 5/minute/IP avec backoff exponentiel après 3 échecs
   - reset : 3/heure/email

5. **Emails transactionnels** via Resend :
   - Template signup confirmation (FR, ton chrétien sobre)
   - Template reset password
   - Template avis de connexion depuis nouvel appareil
   - Tous responsives, accessibles, sans tracker

6. **Gestion sessions** :
   - Cookies httpOnly, Secure, SameSite=Lax
   - Session 1h + refresh token 30j
   - Révocation au signout (toutes sessions ou courante)

7. **Composants UI** réutilisables avec shadcn/ui :
   - `<AuthForm>` générique
   - `<PasswordStrengthMeter>`
   - `<FormError>` accessible (aria-live)
   - Tous bilingue-ready avec next-intl

8. **Tests** :
   - Tests d'intégration : signup → email verify → login → logout
   - Tests E2E Playwright sur les 4 parcours principaux
   - Tests de rate limiting (vérifie qu'on bloque bien)
   - Tests de validation password (rejet password compromis)

9. **Audit log** : chaque action auth écrit dans audit_log (signup,
   login, login_failed, logout, password_reset_requested,
   password_reset_completed)

Applique TOUTES les règles de sécurité. Termine par checklist complète.
```

### Livrables attendus

- [ ] Inscription complète fonctionnelle (email reçu, lien de vérif marche)
- [ ] Tests Playwright verts
- [ ] Rate limiting vérifié manuellement
- [ ] Emails reçus jolis et accessibles

---

## 🔴 Session 8 — MFA (Multi-Factor Authentication)

### Prompt à copier

```
PHASE 1 — Session 8 : Multi-Factor Authentication (MFA/2FA).

Implémente la MFA avec TOTP (Google Authenticator, Authy, 1Password) :

1. **Activation MFA** :
   - Page `/account/security` avec section MFA
   - Setup : QR code + secret + 8 codes de récupération
   - Vérification du premier code avant activation
   - Codes de récupération téléchargeables une seule fois

2. **Login avec MFA** :
   - Si MFA activée, page intermédiaire après password
   - Champ code 6 chiffres + option "code de récupération"
   - Rate limit strict : 5 tentatives puis lock 15 min

3. **Politique forcée** :
   - MFA obligatoire pour rôles `referent` et `admin`
   - Warning et grace period 7 jours pour les comptes existants
     promus à ces rôles
   - Vérification au runtime : un référent sans MFA ne peut pas accéder
     aux pages de validation

4. **Désactivation** :
   - Reauthentification password requise
   - Pas possible si rôle l'exige
   - Notification email immédiate

5. **Stockage sécurisé** :
   - Secret TOTP chiffré at-rest
   - Codes de récupération hashés (argon2id), un seul usage
   - Jamais loggés

6. **Audit log** : mfa_enabled, mfa_disabled, mfa_challenge_failed,
   recovery_code_used

7. **UI accessible** :
   - QR code avec alt-text et secret affiché en fallback
   - Codes de récupération copiables ET téléchargeables
   - Messages d'erreur clairs sans révéler d'info

8. **Tests** :
   - Activation, login avec code, login avec recovery code
   - Tentative de désactivation par un référent (doit échouer)
   - Rate limiting des tentatives

Termine par tests E2E Playwright du parcours complet.
```

### Livrables attendus

- [ ] Activation MFA fonctionnelle (testé avec Google Authenticator)
- [ ] Login MFA bloque sans le code
- [ ] Codes de récupération fonctionnent
- [ ] Tests passent

---

## 🔴 Session 9 — Workflow de vérification membre

### Prompt à copier

```
PHASE 1 — Session 9 : Workflow de vérification membre par référent paroisse.

C'est LE flux le plus critique du projet. Implémente avec un soin extrême.

**Étape utilisateur (membre nouvellement inscrit)** :

1. Onboarding obligatoire post-signup :
   - Sélection église (recherche autocomplete par ville/nom)
   - Saisie infos : display_name, ville, téléphone (optionnel)
   - Upload photo carte de membre (recto + verso si applicable)
   - Saisie n° de carte (pour hash, pas stocké en clair)
   - Acceptation CGU + politique RGPD avec checkboxes séparées

2. Validation upload :
   - MIME type vérifié serveur (image/jpeg, image/png, image/webp)
   - Max 5MB par photo
   - Redimensionnement à 2000px max après upload
   - Stockage bucket privé Supabase Storage avec RLS
   - URL signée à expiration 1h pour prévisualisation

3. Création `verification_request` en statut `pending`
   - Email de confirmation au membre
   - Notification (email + in-app) au référent de l'église

**Étape référent paroisse** :

1. Page `/referent/verifications` listant les demandes en attente :
   - Filtres : statut, date, recherche par nom
   - Pagination cursor-based
   - Affichage des photos avec lien temporaire (URL signée)
   - Infos demandeur (display_name, ville, n° carte 4 derniers chiffres)

2. Actions sur chaque demande :
   - Approuver : profil passe en `verified`, expires_at = +1 an, photos
     supprimées immédiatement, audit log
   - Rejeter : motif obligatoire (liste pré-définie + champ libre),
     notification membre, possibilité de resoumettre après 24h
   - Mettre en attente : demande de complément d'info

3. Tableau de bord référent :
   - Compteurs : en attente, traitées ce mois, taux d'approbation
   - Demandes anciennes (>72h) en alerte rouge
   - Membres expirant bientôt (à relancer pour renouvellement)

**Étape admin national** :

1. Override : peut valider/rejeter sans être référent
2. Vue globale : toutes les demandes nationales avec filtres avancés
3. Délégation : peut promouvoir/révoquer des référents
4. Statistiques : taux d'approbation par église, délais moyens

**Sécurité critique** :
- RLS strictes : un référent ne voit QUE les demandes de son église
- Aucun référent ne peut modifier son propre statut
- Toutes les actions tracées dans audit_log avec IP + UA
- Photos cartes supprimées sous 7 jours max (cron job)
- Rate limiting : un référent ne peut traiter que 50 demandes/heure
  (anti-bot)
- Notification email immédiate au membre + à l'admin pour tout rejet

**Renouvellement annuel** :
- Cron job quotidien qui détecte les profils expirant dans 30j
- Email de relance J-30, J-15, J-7
- Passage automatique en `expired` à expiration → perte d'accès aux
  fonctionnalités vendeur
- Workflow de renouvellement simplifié (juste re-soumettre carte)

Tests obligatoires :
- E2E complet : inscription → soumission → approbation → vérifié
- E2E rejet et resoumission
- Tests RLS : référent A ne peut pas voir demandes église B
- Tests expiration et renouvellement
- Tests de rate limiting

Termine par audit sécurité de cette session : où sont les risques
résiduels ?
```

### Livrables attendus

- [ ] Parcours complet testé manuellement de bout en bout
- [ ] Photos bien supprimées après validation
- [ ] Tests RLS isolation par église passent
- [ ] Cron expiration documenté et testé

---

## 🟡 Session 10 — Gestion des rôles et permissions

### Prompt à copier

```
PHASE 1 — Session 10 : Système de rôles et permissions (RBAC).

Implémente un système de rôles propre et extensible :

1. **Rôles définis** :
   - `member` : membre vérifié standard (vendeur + acheteur)
   - `referent` : référent paroisse (validation membres son église)
   - `admin_local` : admin d'une église (référent + modération locale)
   - `admin_national` : super-admin (tous droits)
   - `support` : équipe support (lecture seule + actions limitées)

2. **Permissions granulaires** par rôle, documentées en table :
   - profile.read.public, profile.read.own, profile.read.any
   - profile.update.own, profile.update.any
   - verification.create, verification.approve.own_church,
     verification.approve.any
   - listing.create, listing.update.own, listing.delete.any
   - audit.read.own_actions, audit.read.all
   - admin.* permissions

3. **Implémentation** :
   - Fichier `lib/auth/permissions.ts` avec fonction `can(user, action,
     resource)`
   - Helper React `<Authorized action="..." resource="...">` pour
     conditional rendering
   - Middleware Next.js qui protège les routes selon rôle requis
   - Les RLS PostgreSQL restent la dernière ligne de défense

4. **Promotion/révocation** :
   - Page admin `/admin/users` avec recherche + actions
   - Promotion : password reauthentication + 2FA challenge + audit log
   - Révocation : immédiate, notification email
   - Historique des changements de rôle visible

5. **Audit obligatoire** : chaque promotion/révocation dans audit_log avec
   actor, target, before/after

6. **Tests de sécurité critiques** :
   - Un member ne peut pas appeler une route admin (403)
   - Un référent ne peut pas se promouvoir lui-même
   - Un admin local ne peut pas promouvoir un admin national
   - Test d'escalade verticale : tenter de modifier un autre profil
   - Test d'escalade horizontale : tenter d'accéder aux données d'une
     autre église

7. **Rate limiting** sur actions admin (anti-bot, anti-mass-action)

Documentation : tableau permissions/rôles dans `docs/security/rbac.md`
```

### Livrables attendus

- [ ] Tableau permissions documenté
- [ ] Tests d'escalade passent (donc échouent côté attaque)
- [ ] UI s'adapte au rôle (un membre ne voit pas le menu admin)

---

## 🟡 Session 11 — Conformité RGPD

### Prompt à copier

```
PHASE 1 — Session 11 : Conformité RGPD complète.

Avant la beta, on doit être 100% RGPD-compliant. Implémente :

1. **Page mentions légales** (`/legal/mentions`) avec :
   - Identité éditeur (à compléter manuellement par moi)
   - Hébergeur (Vercel + Supabase EU)
   - DPO contact
   - CNIL en recours

2. **Politique de confidentialité** (`/legal/privacy`) générée selon le
   modèle CNIL :
   - Données collectées (liste exhaustive)
   - Finalités (pour chaque type de donnée)
   - Bases légales (consentement, contrat, intérêt légitime)
   - Durées de conservation par catégorie
   - Destinataires (Supabase, Cloudinary, Resend, etc.)
   - Transferts hors UE (aucun, vérifier)
   - Droits utilisateurs et comment les exercer

3. **CGU** (`/legal/terms`) :
   - Statut hébergeur LCEN
   - Pas responsable des transactions entre membres
   - Charte de conduite (interdictions : prosélytisme agressif, ventes
     illégales, harcèlement)
   - Conditions de suspension/exclusion
   - Droit applicable (français)

4. **Bandeau cookies** conforme :
   - Pas de cookie tiers de tracking au démarrage
   - Si Posthog activé : opt-in explicite avec choix granulaire
   - Bouton "Refuser tout" aussi visible que "Accepter"
   - Stockage du choix 13 mois max

5. **Pages utilisateur** :
   - `/account/data-export` : export JSON de toutes les données
     personnelles (RGPD article 20)
   - `/account/delete` : suppression compte avec délai 30j (anti-erreur),
     anonymisation des données qu'on doit conserver (audit log)
   - `/account/consents` : gestion granulaire des consentements

6. **Workflow suppression compte** :
   - Demande → email confirmation → délai 30j (peut annuler) → suppression
   - Anonymisation : audit_log conservé mais user_id remplacé par UUID
     anonyme + flag deleted
   - Listings du membre : suppression
   - Messages : conservés côté destinataire avec mention "Utilisateur
     supprimé"
   - Notification email finale

7. **Registre des traitements** dans `docs/legal/registre-traitements.md`
   pré-rempli pour mon DPO

8. **DPIA** (Data Protection Impact Assessment) initiale dans
   `docs/legal/dpia.md` :
   - Description du traitement
   - Évaluation nécessité/proportionnalité
   - Risques et mesures
   - Avis DPO (à faire signer)

9. **Tests** :
   - Export data fonctionne et contient tout
   - Suppression compte effective après 30j
   - Bandeau cookies bloque bien Posthog avant consentement

Documente clairement ce qui reste à compléter par moi (raison sociale,
nom DPO, etc.).
```

### Livrables attendus

- [ ] Toutes les pages légales accessibles
- [ ] Export data fonctionne
- [ ] Suppression compte testée
- [ ] Registre traitements pré-rempli

---

## 🔴 Session 12 — Audit Phase 1

### Prompt à copier

```
PHASE 1 — Session 12 : Audit complet de la Phase 1 avant passage en Phase 2.

Mets-toi en mode auditeur sécurité externe senior. Examine tout ce qu'on
a construit en Phase 1 (Sessions 6-11).

**Partie 1 — Audit OWASP Top 10**

Pour chaque catégorie OWASP Top 10 2021, évalue notre implémentation :
- A01 Broken Access Control
- A02 Cryptographic Failures
- A03 Injection
- A04 Insecure Design
- A05 Security Misconfiguration
- A06 Vulnerable Components
- A07 Identification and Auth Failures
- A08 Software and Data Integrity Failures
- A09 Security Logging Failures
- A10 Server-Side Request Forgery

Format : pour chaque, statut (✅ Conforme / ⚠️ À améliorer / ❌ Vulnérable)
+ justification + actions correctives.

**Partie 2 — Audit RGPD**

Liste tout ce qui pourrait nous valoir un contrôle CNIL négatif. Sois
impitoyable.

**Partie 3 — Audit qualité code**

- Coverage tests sur les modules critiques
- Présence de TODO/FIXME oubliés
- Dépendances avec CVE
- Patterns anti-sécurité (any TypeScript, eval, dangerouslySetInnerHTML)

**Partie 4 — Tests d'intrusion à mener**

Liste 10 scénarios de test d'intrusion concrets que je peux exécuter
manuellement (ou faire exécuter à un pentester) pour valider la sécurité.

**Partie 5 — Décision GO/NO-GO Phase 2**

Donne un verdict clair : peut-on passer en Phase 2 ou pas ? Si non,
liste exhaustive et priorisée des correctifs.
```

### Livrables attendus

- [ ] Audit complet documenté dans `docs/security/audit-phase1.md`
- [ ] Toutes les actions Critical/High traitées
- [ ] GO/NO-GO documenté

---

# Phase 2 — Profils vendeurs et catalogue

> **Objectif** : un membre vérifié peut créer son profil vendeur et son catalogue. Un visiteur peut consulter.
> **Durée estimée** : 4 semaines.

---

## 🟡 Session 13 — Schéma vendeurs et catalogue

### Prompt à copier

```
PHASE 2 — Session 13 : Schéma DB et migrations pour vendeurs et catalogue.

Étend le schéma avec :

1. `categories` : taxonomie hiérarchique (id, parent_id, name, slug, icon,
   sort_order, is_active). Pré-remplir avec : alimentation, mode/textile,
   services-personne, BTP/artisanat, santé/bien-être, éducation/formation,
   événementiel, transport/logistique, professions-libérales, immobilier,
   tech/digital, agriculture (avec sous-catégories pertinentes).

2. `seller_profiles` : id, user_id (unique FK profiles), business_name,
   description (markdown safe), category_id, service_area_km,
   service_locations (geom point + array de villes), opening_hours (jsonb),
   contact_phone, contact_email, contact_whatsapp, social_links (jsonb),
   logo_url, cover_url, is_active, created_at, updated_at.

3. `listings` (produits/services) : id, seller_id, title, slug, description,
   price_cents (nullable si is_quote_only), currency, is_quote_only,
   stock_status (in_stock|low|out|n/a), images (array), tags (array),
   status (draft|active|paused|removed), search_vector tsvector,
   created_at, updated_at, published_at.

4. `listing_images` : id, listing_id, url, alt_text, sort_order. Limite
   8 images par listing.

5. `seller_reviews` : id, seller_id, reviewer_id, listing_id (nullable),
   rating (1-5), comment, response (réponse vendeur), status
   (pending|published|hidden), created_at. Une review par paire
   reviewer/seller/listing.

**Spécifications critiques** :

- RLS : seuls les profils vérifiés peuvent créer un seller_profile
- RLS listings : visible uniquement si status='active' ET seller actif ET
  seller_user vérifié non expiré
- Price en INTEGER (centimes), jamais FLOAT
- Slug unique au niveau seller
- Search vector : trigger qui met à jour automatiquement avec title +
  description + tags + business_name
- Index GIN sur search_vector (recherche full-text)
- Index GiST sur service_locations (recherche géo)

**Fonctions PostgreSQL utiles** :
- `seller_average_rating(seller_id)`
- `listing_search(query, category, location)`
- Trigger `update_search_vector()` sur listings

**Audit log** : créer/modifier/supprimer un listing tracé.

Termine par seed enrichi : 10 vendeurs fictifs avec 30 listings variés.
```

### Livrables attendus

- [ ] Migrations propres
- [ ] Seed peuplé (visualise dans Drizzle Studio)
- [ ] Recherche full-text testée en SQL

---

## 🟡 Session 14 — Création profil vendeur

### Prompt à copier

```
PHASE 2 — Session 14 : UI création et édition profil vendeur.

Implémente le parcours vendeur :

1. Page `/sell/onboarding` : wizard multi-étapes pour créer son profil
   vendeur (uniquement membres vérifiés)
   - Étape 1 : business_name + catégorie principale
   - Étape 2 : description (éditeur markdown safe avec preview)
   - Étape 3 : zone de chalandise (carte Mapbox + rayon km)
   - Étape 4 : contacts (téléphone, email, WhatsApp, réseaux)
   - Étape 5 : horaires d'ouverture
   - Étape 6 : logo + cover (upload Cloudinary, recadrage)
   - Étape 7 : validation et publication

2. Page `/sell/dashboard` : tableau de bord vendeur
   - Vues, contacts reçus, avis moyens
   - Liens rapides vers gestion catalogue
   - Alertes (vérification expirant, listings à modérer)

3. Page `/sell/profile/edit` : édition du profil

4. **Sécurité** :
   - Validation Zod stricte sur tous les champs
   - Sanitization markdown (rehype-sanitize) pour la description
   - Liens externes : nofollow noopener
   - Téléphone : validation libphonenumber-js (E.164)
   - Upload : max 2MB logo, max 5MB cover, validation MIME serveur,
     redimensionnement Cloudinary

5. **UX critique** :
   - Sauvegarde brouillon automatique entre les étapes
   - Possibilité de reprendre l'onboarding plus tard
   - Preview avant publication
   - Messages d'erreur clairs et accessibles
   - Loading states partout

6. **i18n** : toutes les strings via next-intl, FR de base

7. **Mobile-first** : ce parcours sera surtout fait sur mobile. Soigne le
   responsive.

8. **Tests E2E** : parcours complet onboarding vendeur

Composants shadcn à utiliser : Form, Input, Textarea, Select, Tabs, Card,
Dialog, Toast.
```

### Livrables attendus

- [ ] Parcours wizard complet testable
- [ ] Profil créé visible
- [ ] Tests E2E passent

---

## 🟡 Session 15 — CRUD catalogue (listings)

### Prompt à copier

```
PHASE 2 — Session 15 : Création, édition, suppression de listings.

Implémente le CRUD complet des listings :

1. Page `/sell/listings` : liste des listings du vendeur connecté
   - Tableau avec colonnes : image, titre, prix, statut, vues, actions
   - Filtres : statut (tous, actifs, brouillons, pausés, supprimés)
   - Recherche
   - Pagination
   - Tri par date, prix, vues

2. Page `/sell/listings/new` : création
   - Formulaire avec : titre, catégorie, prix (ou "sur devis"), description
     markdown, tags (max 10), images (1-8 avec drag-drop pour réordonner)
   - Sauvegarde en brouillon possible
   - Publication = passage en status='active'
   - Preview avant publication

3. Page `/sell/listings/[id]/edit` : édition (mêmes champs)
   - Historique des modifications (last_edited_at)
   - Possibilité de pauser sans supprimer

4. Page `/sell/listings/[id]/stats` : statistiques d'un listing
   - Vues uniques 7j / 30j / total
   - Contacts reçus
   - Apparitions dans les recherches

5. **Upload images** :
   - Direct vers Cloudinary avec signed upload
   - Limite 8 images, 5MB chacune
   - Recadrage et compression auto
   - Génération de variantes (thumbnail 200px, medium 800px, full 1600px)
   - Alt text obligatoire (a11y + SEO)

6. **Validation** :
   - Titre 3-120 chars
   - Prix : entier positif, max 1M€ en centimes
   - Description : markdown safe, max 5000 chars
   - Tags : alphanumériques, max 30 chars chacun

7. **Sécurité** :
   - Vérif owner sur chaque action (RLS + check appli)
   - Rate limit : 20 listings créés/heure/user, 100 modifications/heure
   - Anti-spam : flag si plus de 50 listings actifs (review manuelle)
   - Audit log pour create/update/delete

8. **Soft delete** : status='removed' au lieu de DELETE physique. Retention
   90j puis purge automatique (cron).

9. **Tests** :
   - CRUD complet via E2E
   - Test ownership (user A ne peut pas modifier listing user B)
   - Test rate limit
```

### Livrables attendus

- [ ] CRUD fonctionnel
- [ ] Upload images marche bien
- [ ] Tests passent

---

## 🟢 Session 16 — Pages publiques vendeur et listing

### Prompt à copier

```
PHASE 2 — Session 16 : Pages publiques vendeur et listing détail.

Implémente les pages consultables par les visiteurs (membres vérifiés) :

1. Page `/sellers/[slug]` : profil public d'un vendeur
   - Header : logo, cover, business_name, catégorie, note moyenne
   - Description
   - Catalogue (grid de listings actifs)
   - Avis (avec pagination)
   - Bouton "Contacter" (CTA principal)
   - Boutons partage (lien copiable, pas de boutons sociaux trackers)
   - Indicateur "Membre vérifié de l'église X"
   - Plage horaire si actuellement ouvert

2. Page `/listings/[slug]` : détail d'un listing
   - Galerie images (lightbox)
   - Titre, prix (ou "Devis sur demande"), description
   - Infos vendeur (carte cliquable vers profil)
   - Bouton "Contacter le vendeur"
   - Listings similaires (même catégorie ou même vendeur)
   - Schema.org structured data (Product/Service) pour SEO
   - Open Graph pour partage

3. **Server Components** : ces pages sont en SSR pour le SEO. Zéro JS si
   pas nécessaire.

4. **Performance** :
   - Images en next/image avec sizes appropriés
   - Lazy loading pour galerie
   - Streaming SSR pour les sections lentes (avis)
   - Cache CDN (revalidate: 300 sur pages vendeur)

5. **Accessibilité** :
   - Navigation clavier complète
   - Lightbox accessible (ESC, focus trap)
   - Alt text affiché si image cassée
   - Headings sémantiques

6. **SEO** :
   - Metadata par page (title, description, og)
   - Sitemap.xml dynamique avec tous les listings actifs
   - robots.txt (autorise indexation pages publiques, bloque /admin, /sell)
   - Schema.org JSON-LD

7. **Sécurité** :
   - Pages publiques mais affichage limité si visiteur non connecté
     (preview + CTA "Connectez-vous pour contacter")
   - Pas d'exposition d'email/téléphone vendeur sans authentification
     (anti-scraping)

8. **Analytics** : compteur de vues (table listing_views, debounced
   1 vue / IP / 24h)

9. **Tests** :
   - Pages se rendent correctement
   - Lighthouse score 90+ mobile
   - axe-core sans erreur a11y
```

### Livrables attendus

- [ ] Pages publiques jolies et performantes
- [ ] Lighthouse >90 mobile
- [ ] Sitemap accessible

---

## 🟢 Session 17 — Système d'avis

### Prompt à copier

```
PHASE 2 — Session 17 : Système d'avis entre membres.

Implémente le système d'avis :

1. Page `/sellers/[slug]/review` : laisser un avis (membre vérifié
   uniquement, pas le vendeur lui-même)
   - Note 1-5 étoiles
   - Commentaire (50-1500 chars, markdown safe simple)
   - Champ optionnel "transaction concernée" (lien vers listing)
   - Sélection : avis vérifié si interaction prouvée (échange messagerie)

2. Affichage des avis sur profil vendeur :
   - Note moyenne + nombre d'avis
   - Distribution (% par nombre d'étoiles)
   - Liste paginée triable (récent, mieux notés, moins bien notés)
   - Filtres : étoiles, vérifié uniquement
   - Réponse vendeur visible sous chaque avis

3. Actions vendeur sur ses avis :
   - Répondre (1 réponse par avis, éditable)
   - Signaler (motif + escalade modération)

4. Actions admin :
   - Masquer un avis (avec motif)
   - Supprimer en cas de violation grave
   - Audit log obligatoire

5. **Anti-abus** :
   - 1 avis par paire reviewer/seller (UNIQUE constraint)
   - Cooldown 30j pour modifier son avis
   - Détection de patterns suspects (avis groupés, IP similaires)
   - Rate limit : 5 avis/jour/user

6. **Modération automatique** :
   - Filtre liste de mots interdits (insultes, prosélytisme excessif,
     spam)
   - Avis flaggés vont en pending au lieu de published
   - Notification modérateur

7. **Notifications** :
   - Vendeur notifié à chaque nouvel avis
   - Reviewer notifié si vendeur répond

8. **Tests** :
   - Workflow complet
   - Anti-doublon
   - Modération auto

9. RGPD : un user supprimant son compte voit ses avis anonymisés
   ("Membre supprimé"), pas effacés (transparence pour autres users).
```

### Livrables attendus

- [ ] Avis fonctionnels avec modération
- [ ] Anti-doublon vérifié
- [ ] Notifications reçues

---

## 🟢 Session 18 — Modération

### Prompt à copier

```
PHASE 2 — Session 18 : Outils de modération pour admins et référents.

Implémente le panneau de modération :

1. Page `/moderation/reports` : liste des signalements
   - Source : avis, listing, profil, message (Phase 3)
   - Statut : nouveau, en cours, résolu, rejeté
   - Priorité auto (selon nb signalements)
   - Filtres + pagination

2. Page `/moderation/queue` : modération proactive
   - Listings nouvellement publiés (pour spot-check)
   - Vendeurs récemment inscrits avec activité suspecte

3. Actions modérateur :
   - Avertir l'utilisateur (email + warning sur compte)
   - Masquer le contenu
   - Suspendre le compte (durée définie)
   - Bannir le compte
   - Marquer signalement comme abusif

4. **Workflow signalement** :
   - Tout user vérifié peut signaler avec motif (liste)
   - 3 signalements indépendants → revue prioritaire auto
   - Notification au modérateur référent (église concernée si applicable)
   - Anonymisation : le signalé ne voit pas qui l'a signalé

5. **Charte communautaire** affichée :
   - Page `/community/guidelines` claire
   - Liens depuis chaque page vendeur/listing
   - Acceptée à l'inscription

6. **Audit critique** : toute action de modération dans audit_log avec
   metadata complète (raison, durée, etc.)

7. **Anti-abus signalement** :
   - User qui fait 10 faux signalements → suspension auto
   - Cooldown signalements

8. **Communication** :
   - Email à l'utilisateur sanctionné (motif clair, recours possible)
   - Procédure de recours via formulaire de contact

9. **Stats modération** : dashboard avec métriques pour admin national
   (volume, délais traitement, taux faux positifs)

10. **Tests** :
    - Workflow complet signalement → action → notification
    - Anti-abus
    - RLS : référent A modère que son église
```

### Livrables attendus

- [ ] Panneau modération fonctionnel
- [ ] Charte publiée
- [ ] Tests passent

---

## 🟡 Session 19 — Audit Phase 2

### Prompt à copier

```
PHASE 2 — Session 19 : Audit complet de la Phase 2.

Comme en Session 12, fais un audit sécurité + qualité complet de tout
ce qu'on a livré en Phase 2.

Focus particulier sur :
- IDOR (Insecure Direct Object Reference) : peut-on accéder/modifier des
  ressources qui ne nous appartiennent pas ?
- Mass assignment : les Server Actions filtrent-elles bien les champs ?
- Injection SQL via les filtres de recherche ?
- XSS via le markdown des descriptions et commentaires ?
- SSRF via les uploads d'images URL ?
- Rate limiting effectivement appliqué partout ?
- Audit log exhaustif sur toutes les actions sensibles ?

Tests d'intrusion à mener :
1. Modifier le listing d'un autre vendeur
2. Voir les vendeurs non actifs
3. Injecter du HTML/JS dans description, commentaire, business_name
4. Uploader un fichier non-image avec extension trompeuse
5. Spammer 1000 listings via API
6. Récupérer les emails vendeurs sans être connecté

Verdict GO/NO-GO Phase 3.
```

### Livrables attendus

- [ ] Audit Phase 2 documenté
- [ ] Vulnérabilités corrigées

---

# Phase 3 — Recherche et messagerie

> **Objectif** : un acheteur peut trouver un vendeur et le contacter.
> **Durée estimée** : 4 semaines.

---

## 🟡 Session 20 — Recherche full-text avancée

### Prompt à copier

```
PHASE 3 — Session 20 : Recherche full-text avancée avec Meilisearch.

Migration de la recherche PostgreSQL vers Meilisearch pour de meilleures
performances :

1. **Setup Meilisearch** :
   - Instance cloud EU (instructions Meilisearch Cloud)
   - Variables env, clés admin et search
   - Index : listings, sellers
   - Configuration searchable attributes, filters, sorts, synonyms
     (chrétien/protestant/évangélique, BTP/bâtiment/construction)

2. **Synchronisation** :
   - Job de synchro initial (script `pnpm sync:meili`)
   - Hooks post-insert/update/delete sur listings et sellers (via
     Supabase Edge Functions ou triggers DB → webhook)
   - Retry et idempotence

3. **API recherche** `/api/search` :
   - Validation Zod : query, category, location (lat/lng + radius),
     price_min, price_max, sort
   - Rate limit : 60/min/IP
   - Pagination cursor-based
   - Réponse typée

4. **Page `/search`** :
   - Barre de recherche avec autocomplete (Meilisearch)
   - Filtres latéraux : catégorie (arborescent), prix (slider),
     distance, vendeur vérifié, avec stock
   - Tri : pertinence, prix, distance, note
   - Résultats en grid avec lazy load
   - Empty state intelligent (suggestions)
   - URL state : tous les filtres dans l'URL pour partage

5. **Géo-recherche** :
   - Détection localisation user (avec consentement)
   - Mode "à proximité" calcule distance
   - Tri par distance possible

6. **Page accueil** :
   - Recherche en hero
   - Catégories populaires
   - Vendeurs mis en avant (locaux du user)
   - Récents
   - Bien noté

7. **Sécurité** :
   - Recherche n'expose que les listings actifs de vendeurs vérifiés
   - Filtres injection-safe (whitelist)
   - Pas d'attribut sensible dans l'index Meilisearch

8. **Performance** :
   - Cache résultats (5 min) avec stale-while-revalidate
   - Debounce input (300ms)
   - Skeleton loaders

9. **Analytics recherche** : top requêtes (anonymisé), taux clic,
   recherches sans résultat (à analyser pour ajout synonymes)

10. **Tests E2E** : recherche, filtres, pagination, géo
```

### Livrables attendus

- [ ] Recherche rapide (<200ms)
- [ ] Filtres tous fonctionnels
- [ ] Synchro DB → Meili automatique

---

## 🟡 Session 21 — Géolocalisation et carte

### Prompt à copier

```
PHASE 3 — Session 21 : Géolocalisation et affichage carte.

Implémente les fonctionnalités géo :

1. **Sur profil vendeur** :
   - Saisie zone d'activité : sélection ville(s) ou rayon depuis adresse
   - Géocodage via Mapbox Geocoding API (côté serveur, jamais client)
   - Stockage : geom POINT + array de villes desservies

2. **Sur recherche** :
   - "Près de chez moi" : geolocation API browser avec consentement
   - "Près de [ville]" : input avec autocomplete villes France
   - Filtre rayon (5/10/25/50/100 km)
   - Affichage distance dans résultats

3. **Page `/explore`** : carte interactive
   - Mapbox GL JS
   - Markers clusterisés (perf)
   - Click marker → preview vendeur + lien
   - Sync avec filtres recherche
   - Mode liste/carte toggle

4. **Sécurité géo** :
   - Adresses précises NON exposées publiquement
   - Affichage : ville uniquement
   - Rayon flouté à ±500m sur la carte
   - Opt-in explicite avant geolocation

5. **Performance** :
   - Tuiles Mapbox vector (légères)
   - Clustering côté client
   - Lazy load Mapbox JS uniquement sur pages map

6. **Accessibilité** :
   - Carte non bloquante : version liste accessible toujours dispo
   - Markers navigables au clavier (à défaut, lien vers liste)

7. **Coût Mapbox** : monitorer usage, prévoir alertes

8. **Tests** : recherche géo, distance calculée
```

### Livrables attendus

- [ ] Recherche géo fonctionne
- [ ] Carte explore opérationnelle
- [ ] Pas de fuite d'adresse précise

---

## 🟡 Session 22 — Messagerie temps réel

### Prompt à copier

```
PHASE 3 — Session 22 : Messagerie interne temps réel.

Implémente la messagerie via Supabase Realtime :

1. **Schéma DB** :
   - `conversations` : id, listing_id (nullable), buyer_id, seller_id,
     last_message_at, status (active|archived|blocked)
   - `messages` : id, conversation_id, sender_id, content, attachments
     (jsonb), read_at, created_at, edited_at, deleted_at
   - Index sur conversation_id + created_at
   - RLS : participants seulement, lecture/écriture conditionnée

2. **API Server Actions** :
   - `startConversation(sellerId, listingId, initialMessage)` : crée si
     n'existe pas, retourne id
   - `sendMessage(conversationId, content)` : valide, insère
   - `markAsRead(conversationId)` : update read_at
   - `archiveConversation(conversationId)`
   - `blockUser(userId)` : empêche futurs messages

3. **Pages** :
   - `/messages` : liste conversations (UI inspirée Discord/Telegram)
   - `/messages/[id]` : conversation détaillée
   - Realtime : nouveaux messages apparaissent sans refresh
   - Indicateur "en train d'écrire" (typing)
   - Read receipts

4. **Limites** :
   - Max 1000 chars par message (sinon découper)
   - Max 100 messages/heure/user (anti-spam)
   - Pas de pièces jointes au MVP (Phase 4 si besoin)
   - Liens auto-détectés mais pas embed (anti-tracking)

5. **Sécurité** :
   - Sanitization message côté serveur (markdown très restreint,
     pas de HTML)
   - URLs vérifiées (pas de javascript:, data:)
   - Pas d'exposition d'email/téléphone dans messages (warning si détecté,
     rappel d'utiliser canaux fournis)
   - Détection patterns suspects (numéros bancaires, paiement à l'étranger,
     etc.) → flag modération
   - Bouton "signaler" sur chaque message

6. **Notifications** :
   - In-app : badge non-lus
   - Email : digest 1x/jour si messages non lus
   - Push (Phase 4) : opt-in

7. **RGPD** :
   - User peut exporter ses conversations
   - User peut supprimer ses messages (soft delete avec "[message
     supprimé]")
   - À la suppression compte : messages anonymisés

8. **Modération** :
   - Signaler conversation
   - Admin peut lire conversations signalées (avec consentement parties)
   - Audit log accès admin aux conversations

9. **Performance** :
   - Pagination infinie (charge ancien historique au scroll)
   - Optimistic UI
   - WebSocket connexion unique partagée

10. **Tests E2E** : conversation complète buyer ↔ seller, blocage,
    signalement
```

### Livrables attendus

- [ ] Messagerie fonctionnelle en temps réel
- [ ] Anti-spam testé
- [ ] Tests E2E passent

---

## 🟢 Session 23 — Notifications

### Prompt à copier

```
PHASE 3 — Session 23 : Système de notifications complet.

Centralise toutes les notifications :

1. **Schéma DB** :
   - `notifications` : id, user_id, type, title, body, link, metadata,
     read_at, created_at
   - `notification_preferences` : user_id, channel (in_app|email|push),
     event_type, enabled

2. **Types d'événements** :
   - account.verified, account.expiring_soon, account.suspended
   - listing.first_view, listing.reported
   - message.received
   - review.received, review.responded
   - moderation.warning, moderation.action
   - admin.role_granted, admin.role_revoked

3. **Canaux** :
   - In-app : centre de notifications avec badge
   - Email : Resend, templates par type
   - Push (Phase 6) : OneSignal ou Web Push

4. **Page `/account/notifications`** :
   - Liste paginée
   - Filtres : non lu, type
   - Marquer tout comme lu
   - Préférences par canal/type (granulaire)

5. **Logique d'envoi** :
   - Service `lib/notifications/send.ts` qui dispatch selon préférences
   - Queue avec retry (Supabase Edge Functions ou cron + queue table)
   - Idempotence (pas de doublon)
   - Anti-flood : max 10 emails/h/user, regroupement digest si trop

6. **Templates email** :
   - React Email (composants typés)
   - Préheader, alt text images
   - Unsubscribe link obligatoire (RGPD)
   - Mode clair/sombre auto

7. **Tests** :
   - Envoi par canal selon préférences
   - Désabonnement fonctionne
   - Pas de spam
```

### Livrables attendus

- [ ] Notifications in-app et email
- [ ] Préférences respectées
- [ ] Désabonnement fonctionne

---

## 🟢 Session 24 — Optimisation performance

### Prompt à copier

```
PHASE 3 — Session 24 : Optimisation performance globale.

Audit et optimisation perf avant beta :

1. **Lighthouse audit** : objectif 90+ mobile sur toutes pages publiques

2. **Optimisations attendues** :
   - Images : next/image partout, sizes corrects, formats AVIF/WebP
   - Fonts : variable fonts, subset latin, font-display swap
   - JS : code splitting agressif, dynamic imports, pas de polyfills
     inutiles
   - CSS : purge Tailwind, critical CSS inline
   - Caching : headers cache appropriés, ISR sur pages stables
   - Database : audit N+1 queries (Drizzle), ajout index manquants
   - Bundle : analyse avec `@next/bundle-analyzer`, élimination libs
     inutiles

3. **Web Vitals** :
   - LCP < 2.5s
   - FID < 100ms
   - CLS < 0.1
   - INP < 200ms
   - Mesurés en RUM (Vercel Analytics ou Posthog)

4. **PWA** :
   - Manifest.json
   - Service worker (next-pwa) pour offline-ready
   - Installable sur mobile
   - Splash screen
   - Notifications push base (préparation Phase 6)

5. **Compression** :
   - Brotli sur Vercel (auto)
   - Images Cloudinary auto-format

6. **Database optimization** :
   - EXPLAIN ANALYZE sur top requêtes
   - Materialized views pour stats lourdes
   - Connection pooling configuré (Supabase)

7. **Monitoring** :
   - Posthog : performance dashboard
   - Sentry : performance traces
   - Alertes si dégradation

8. **Tests de charge** :
   - k6 ou Artillery sur endpoints critiques
   - Cible : 100 RPS sans dégradation
   - Documente les goulots
```

### Livrables attendus

- [ ] Lighthouse 90+ mobile
- [ ] PWA installable
- [ ] Tests charge documentés

---

## 🔴 Session 25 — Audit Phase 3 + Pré-beta

### Prompt à copier

```
PHASE 3 — Session 25 : Audit final pré-beta.

Audit complet avant lancement beta sur 2-3 églises pilotes :

1. **Audit sécurité externe simulé** : refais OWASP Top 10, ajoute focus
   sur :
   - Messagerie : escalade, leak conversations, SSRF via liens
   - Recherche : injection, déni de service via filtres complexes
   - Géo : leak adresses précises, tracking abusif
   - Notifications : SSRF via webhooks, leak via emails (header injection)

2. **Audit RGPD** : conformité totale ?
   - Toutes les données collectées sont-elles dans la politique ?
   - Consentements granulaires fonctionnent ?
   - Export data complet ?
   - Suppression effective sous 30j ?

3. **Audit accessibilité** : WCAG 2.1 AA sur toutes les pages publiques
   - Tests automatisés (axe-core)
   - Tests manuels (navigation clavier, lecteur d'écran)
   - Contraste vérifié

4. **Audit légal** : revoir CGU, mentions, politique pour cohérence avec
   ce qu'on a réellement construit

5. **Documentation utilisateur** :
   - Guide membre (`docs/users/guide-member.md`)
   - Guide vendeur (`docs/users/guide-seller.md`)
   - Guide référent (`docs/users/guide-referent.md`)
   - FAQ
   - Tutoriels vidéo (script à fournir, je les enregistre moi)

6. **Plan de rollback** : si la beta révèle un problème critique,
   comment on revient en arrière ?

7. **Plan d'incident** : qui appelle qui, quand, comment ?

Verdict GO/NO-GO beta.
```

### Livrables attendus

- [ ] Tous les audits OK
- [ ] Documentation utilisateur prête
- [ ] Plan de rollback documenté

---

# Phase 4 — Beta et hardening

> **Objectif** : tester sur 2-3 églises pilotes, corriger les retours, faire auditer.
> **Durée estimée** : 4 semaines.

---

## 🟡 Session 26 — Setup beta fermée

### Prompt à copier

```
PHASE 4 — Session 26 : Setup beta fermée sur églises pilotes.

Prépare le déploiement beta :

1. **Whitelist églises beta** : feature flag par église pour limiter
   l'accès initial

2. **Système de feedback intégré** :
   - Bouton flottant "Envoyer feedback"
   - Form : type (bug, suggestion, autre), description, screenshot
     auto, contexte (URL, user agent)
   - Création GitHub issue automatique (label beta-feedback)
   - Confirmation user

3. **Onboarding renforcé** :
   - Tour guidé première connexion (driver.js ou shepherd.js)
   - Tooltips sur fonctionnalités clés
   - Email de bienvenue personnalisé

4. **Monitoring beta dédié** :
   - Dashboard Posthog : funnel inscription, taux complétion, drop-off
   - Sentry : alertes en temps réel sur erreurs
   - Slack/Discord notif équipe sur events critiques

5. **Communication** :
   - Page `/beta` dédiée expliquant le statut beta, ce qui marche/marche
     pas
   - Bandeau permanent "Vous êtes en version beta"
   - Channel direct avec utilisateurs beta (Discord ou WhatsApp groupe)

6. **Plan d'évolution** :
   - Cycle de release hebdo (vendredi)
   - Changelog public (`/changelog`)
   - Roadmap publique (Notion ou GitHub Projects)

7. **Backup et restauration** :
   - Backup quotidien Supabase (automatique mais vérifie)
   - Test restauration mensuelle
   - Documentation procédure restore
```

### Livrables attendus

- [ ] Feature flag églises actif
- [ ] Feedback flow opérationnel
- [ ] Onboarding testé

---

## 🔴 Session 27 — Audit sécurité externe (préparation)

### Prompt à copier

```
PHASE 4 — Session 27 : Préparation à l'audit de sécurité externe.

Avant l'audit pro (5-10k€, INDISPENSABLE), prépare le dossier :

1. **Documentation d'architecture** :
   - Diagramme architecture (composants, flux données, dépendances
     externes)
   - Threat model à jour
   - Liste des données sensibles et leurs protections
   - Politique de gestion des secrets

2. **Documentation sécurité** :
   - Politique de mot de passe
   - Politique de session
   - Politique de logging
   - Procédure d'incident
   - Politique de divulgation responsable

3. **Liste des endpoints API** : tous, avec auth requise, rate limits,
   sensibilité

4. **Liste des dépendances** : versions, dernière mise à jour, audits
   passés

5. **Tests sécurité internes existants** : couverture, scénarios

6. **Préparer accès auditeur** :
   - Compte dédié avec rôle approprié
   - Environnement staging avec données fictives
   - Repo GitHub en accès lecture
   - Documentation onboarding

7. **Liste des prestataires conseillés** (à toi de choisir) :
   - YesWeHack (bug bounty)
   - Synacktiv, Wavestone, Lexsi (audits classiques)
   - Indépendants : LinkedIn, références demandées

8. **Budget et planning** : compter 2-4 semaines pour audit + corrections

9. **Critères de succès** : aucune vuln Critical/High non corrigée avant
   prod
```

### Livrables attendus

- [ ] Dossier complet prêt
- [ ] Prestataire contacté

> ⚠️ **L'audit externe n'est pas optionnel.** Ne lance pas en national sans.

---

## 🔴 Session 28 — Correction findings audit

### Prompt à copier

```
PHASE 4 — Session 28 : Correction des findings de l'audit sécurité externe.

Je viens de recevoir le rapport d'audit. Je te le copie ci-dessous (ou te
donne accès via PDF).

[COLLER LE RAPPORT OU LES FINDINGS ICI]

Pour chaque finding :

1. Confirme la vulnérabilité (reproduis-la si besoin)
2. Propose la correction avec code complet
3. Évalue le risque résiduel
4. Mets à jour les tests pour couvrir la régression

Ordre de traitement : Critical > High > Medium > Low.

Je veux un plan d'action complet avec :
- Effort estimé par finding
- Dépendances entre corrections
- Calendrier réaliste

Pour les findings où tu n'es pas d'accord avec l'auditeur : argumente,
mais documente ta position et fais valider explicitement avant de
t'écarter de la recommandation.
```

### Livrables attendus

- [ ] 100% des Critical/High corrigés et testés
- [ ] Re-test par auditeur sur findings majeurs
- [ ] Rapport final avec verdict positif

---

## 🟢 Session 29 — Documentation produit

### Prompt à copier

```
PHASE 4 — Session 29 : Documentation produit et support.

Crée la documentation utilisateur publique :

1. Site doc `docs.ADDMarket.[tld]` (ou sous-section /help) :
   - Search intégrée
   - Articles structurés par persona

2. **Pour les membres** :
   - Comment s'inscrire et se faire vérifier
   - Comment utiliser la recherche
   - Comment contacter un vendeur
   - Comment laisser un avis
   - Gérer son compte
   - Confidentialité et sécurité

3. **Pour les vendeurs** :
   - Créer son profil vendeur
   - Bonnes pratiques fiches produits
   - Photos de qualité (guide visuel)
   - Répondre aux avis
   - Statistiques

4. **Pour les référents** :
   - Le rôle de référent
   - Comment valider une demande
   - Les cas litigieux (carte abîmée, ex-membre, etc.)
   - Modération basique
   - Procédure d'escalade

5. **Pour les admins** :
   - Documentation interne (privée)
   - Procédures opérationnelles
   - Gestion incidents

6. **FAQ** organisée par thème

7. **Vidéos** : scripts pour vidéos courtes (1-2 min) sur :
   - Inscription
   - Création premier listing
   - Recherche et contact
   - Validation référent

8. **Page `/contact`** : formulaire avec catégorie (support, sécurité,
   légal, presse, partenariat). Routing automatique vers bon canal.

9. **Page `/changelog`** publique : releases avec ce qui change

10. **CGU et Politique** : versionnement avec notification users en cas
    de changement majeur (RGPD)
```

### Livrables attendus

- [ ] Documentation publique complète
- [ ] FAQ étoffée
- [ ] Scripts vidéos prêts

---

## 🟢 Session 30 — Bilan beta et préparation lancement

### Prompt à copier

```
PHASE 4 — Session 30 : Bilan beta et go/no-go national.

Compile le bilan de la beta :

1. **Métriques** (depuis Posthog + DB) :
   - Nombre de membres inscrits / vérifiés / actifs
   - Taux de conversion par étape funnel
   - Vendeurs créés / listings publiés
   - Conversations initiées
   - Avis publiés
   - Bugs reportés / corrigés
   - Performance (Web Vitals médians)

2. **Feedback qualitatif** :
   - Catégorisation des retours
   - Top 10 demandes
   - Top 10 frustrations

3. **Décisions** :
   - Features à ajouter avant national (must-have)
   - Features à reporter (nice-to-have)
   - Bugs bloquants à corriger

4. **Plan de lancement national** :
   - Calendrier de rollout par région
   - Communication ADD nationale
   - Support renforcé J-1 / J / J+7
   - Capacity planning (peut-on supporter le pic ?)

5. **Risques identifiés** et mitigations

6. **Verdict GO/NO-GO national**

Donne un plan d'action détaillé pour la Phase 5.
```

### Livrables attendus

- [ ] Bilan documenté
- [ ] Plan Phase 5 validé
- [ ] GO/NO-GO clair

---

# Phase 5 — Lancement national

> **Objectif** : ouvrir à toute la France ADD progressivement.
> **Durée estimée** : 6-7 semaines.

---

## 🟡 Session 31 — Capacity planning et scaling

### Prompt à copier

```
PHASE 5 — Session 31 : Capacity planning et préparation au scale.

Anticipe la charge nationale :

1. **Estimation charge** :
   - X membres potentiels (à compléter selon données ADD)
   - Hypothèse : 30% inscription année 1
   - Pic d'inscription au lancement
   - Charge stable par la suite

2. **Tests de charge** avec k6 ou Artillery :
   - Scénario inscription massive : 500 inscriptions/h pendant 4h
   - Scénario lecture : 1000 sessions concurrentes
   - Scénario recherche : 500 RPS
   - Scénario messagerie : 200 messages/min

3. **Optimisations DB** :
   - Indexes sur top queries identifiées
   - Connection pooling (PgBouncer côté Supabase)
   - Read replicas si nécessaire (Supabase Pro)
   - Query plans audités

4. **Optimisations app** :
   - Cache Redis sur lookups fréquents (catégories, églises)
   - ISR sur pages stables (vendeurs)
   - Edge runtime pour API simples
   - Compression brotli

5. **Auto-scaling Vercel** : vérifier limites du plan, upgrade si
   nécessaire

6. **Monitoring renforcé** :
   - Alertes : erreur rate >1%, latence p95 >1s, DB CPU >80%
   - On-call rotation (toi + équipe)
   - Status page publique (Better Stack ou Instatus)

7. **Plan de mitigation** si saturation :
   - Mode dégradé : lecture seule temporaire
   - File d'attente d'inscription
   - Communication transparente

8. **Backups** :
   - Tests de restauration validés
   - Backup avant lancement
   - Plan de catastrophe (si Supabase tombe 4h)
```

### Livrables attendus

- [ ] Tests de charge passent à 2x la cible
- [ ] Monitoring actif
- [ ] Plan dégradé documenté

---

## 🟢 Session 32 — Rollout progressif

### Prompt à copier

```
PHASE 5 — Session 32 : Rollout progressif par région.

Implémente le rollout contrôlé :

1. **Feature flags par région** :
   - Système de flags (Posthog, ConfigCat, ou maison)
   - Activation progressive : Île-de-France → Grand Est → ... → DOM-TOM
   - Annonce 1 semaine à l'avance par région

2. **Onboarding référents par région** :
   - Webinaire formation (script à préparer)
   - Documentation dédiée
   - Support prioritaire premières semaines

3. **Communication** :
   - Templates emails ADD aux pasteurs
   - Templates posts réseaux sociaux
   - Vidéo explicative
   - Affiches imprimables pour églises

4. **Monitoring par région** :
   - Dashboard segmenté
   - Détection anomalies (taux validation faible, bugs récurrents)

5. **Support** :
   - Helpdesk : Crisp ou self-hosted
   - SLA : réponse <24h ouvré
   - FAQ enrichie au fur et à mesure

6. **Feedback loop** :
   - Sondage J+30 satisfaction
   - Itération rapide sur retours
```

### Livrables attendus

- [ ] Rollout fonctionnel
- [ ] Première région activée
- [ ] Support opérationnel

---

## 🟢 Session 33 — Observabilité avancée

### Prompt à copier

```
PHASE 5 — Session 33 : Observabilité business et technique avancée.

Mets en place les dashboards complets :

1. **Dashboard technique** (Grafana ou Posthog) :
   - Erreurs par endpoint
   - Latence p50/p95/p99
   - DB performance
   - Cache hit ratio
   - Background jobs status

2. **Dashboard business** :
   - DAU / WAU / MAU
   - Funnel inscription complet
   - Vendeurs actifs (avec listing actif)
   - Listings publiés / vues / contacts
   - Taux de conversion contact → transaction (via sondage)
   - Retention cohort

3. **Dashboard modération** :
   - Signalements en attente
   - Délai moyen traitement
   - Actions par modérateur
   - Recidive

4. **Alertes business** :
   - Chute DAU >20% jour-à-jour
   - Pas d'inscription depuis 6h
   - Spike d'erreurs

5. **Reporting** :
   - Email hebdo automatique aux admins
   - Reporting mensuel pour ADD nationale
   - Export Excel possible

6. **Privacy** : aucune PII dans dashboards, agrégations seulement
```

### Livrables attendus

- [ ] Dashboards complets
- [ ] Alertes actives
- [ ] Reporting auto en place

---

## 🟢 Session 34 — Itérations post-lancement

### Prompt à copier

```
PHASE 5 — Session 34 : Cycle d'itération post-lancement.

Mets en place un cycle agile post-launch :

1. **Cadence** :
   - Sprint 2 semaines
   - Release vendredi
   - Retro après chaque sprint

2. **Backlog priorisé** depuis :
   - Bugs (critique > majeur > mineur)
   - Demandes utilisateurs (votes)
   - Améliorations détectées via analytics
   - Dette technique

3. **Outil de gestion** :
   - GitHub Projects ou Linear
   - Templates issues
   - Labels cohérents

4. **Tests utilisateurs** :
   - Sessions UX 1x/mois (5 users)
   - A/B tests sur fonctionnalités sensibles (avec consentement)

5. **Communauté** :
   - Newsletter mensuelle
   - Forum/Discord communauté
   - Témoignages (avec autorisation)

6. **Performance continue** :
   - Re-audit Lighthouse mensuel
   - Re-audit sécurité tous les 6 mois
   - Renouvellement certifs et clés
```

### Livrables attendus

- [ ] Cycle itération fonctionnel
- [ ] Backlog géré
- [ ] Tests utilisateurs planifiés

---

## 🟡 Session 35 — Préparation transition freemium

### Prompt à copier

```
PHASE 5 — Session 35 : Préparation à la transition freemium (mois 12).

Prépare le passage du gratuit au freemium :

1. **Communication transparente** :
   - Annonce J-90, J-60, J-30
   - Email + bandeau in-app
   - FAQ dédiée
   - Garantie : compte gratuit reste gratuit pour fonctions de base

2. **Définir le plan freemium** :
   - Free : profil, 5 listings, messagerie de base, recherche
   - Pro (~12€/mois ou 120€/an) : listings illimités, mise en avant,
     stats avancées, badge vérifié+, priorité support
   - Promo : 50% de réduction première année pour beta-testeurs

3. **Implémentation Stripe** :
   - Stripe Connect non requis (pas de paiement entre membres au MVP)
   - Stripe Subscriptions : Pro mensuel + annuel
   - TVA configurée (services numériques EU)
   - Factures auto

4. **Gestion abonnements** :
   - Page `/account/billing` : plan, factures, méthode paiement
   - Webhook Stripe → mise à jour DB
   - Grace period 7j si paiement échoue

5. **Limitations enforcées** :
   - Au passage freemium, vendeurs avec >5 listings : message warning,
     30j pour upgrader ou archiver excédent
   - Les listings excédentaires restent visibles le temps de la grace
     period

6. **Sécurité paiement** :
   - PCI compliance : Stripe Elements (jamais de CB côté serveur)
   - 3DS obligatoire EU
   - Webhook signature vérifiée
   - Audit log abonnements

7. **RGPD** : données paiement chez Stripe, mentionné dans politique

8. **Tests** :
   - Souscription, mise à jour, annulation, paiement échoué
   - Test mode Stripe en dev/staging
```

### Livrables attendus

- [ ] Plans définis et tarifés
- [ ] Stripe intégré (test mode)
- [ ] Communication prête

---

# Phase 6 — Mobile et monétisation

> **Objectif** : application mobile native et activation freemium.
> **Durée estimée** : 24 semaines.

---

## 🟡 Session 36 — Setup monorepo et React Native

### Prompt à copier

```
PHASE 6 — Session 36 : Setup monorepo Turborepo + React Native Expo.

Migration vers monorepo pour partager code web/mobile :

1. **Restructure repo** :
   - `apps/web` (Next.js existant)
   - `apps/mobile` (React Native Expo)
   - `packages/ui` (composants partagés)
   - `packages/db` (schémas Drizzle)
   - `packages/types` (types TS partagés)
   - `packages/api-client` (client API typé)
   - `packages/i18n` (traductions)
   - `packages/utils` (helpers)

2. **Turborepo** :
   - Config pipelines (build, dev, test, lint)
   - Caching distribué
   - Task dependencies

3. **React Native Expo** :
   - Setup projet Expo SDK le plus récent stable
   - Expo Router (file-based, similaire Next.js)
   - NativeWind (Tailwind pour RN)
   - Configuration TypeScript strict
   - Authentification biométrique (FaceID/TouchID)

4. **Partage code** :
   - Validation Zod : 100% partagée
   - API client : 100% partagé
   - UI logic : hooks partagés
   - UI components : adaptés (ScrollView vs div, etc.)

5. **CI/CD étendu** :
   - Build mobile sur EAS (Expo Application Services)
   - Tests sur les deux apps

6. **Docs migration** : guide pour développer dans le monorepo
```

### Livrables attendus

- [ ] Monorepo fonctionnel
- [ ] App Expo "Hello World" tourne sur device
- [ ] CI passe pour les deux

---

## 🟡 Session 37-39 — Portage mobile fonctionnalités clés

### Prompts à copier (3 sessions séparées)

```
PHASE 6 — Session 37 : Portage Auth + Vérification membre sur mobile.

Porte le parcours d'auth + vérification sur React Native :
- Signup / login / MFA
- Onboarding membre (sélection église, upload carte)
- Auth biométrique pour réouverture rapide
- Deep links pour confirmations email
- Stockage sécurisé tokens (Expo SecureStore)
- Tous les écrans accessibles (VoiceOver, TalkBack)
- Tests Maestro ou Detox sur parcours complet
```

```
PHASE 6 — Session 38 : Portage recherche + listings + profils sur mobile.

Porte les écrans publics :
- Accueil avec recherche
- Page recherche avec filtres natifs
- Liste résultats (FlashList pour perf)
- Détail vendeur
- Détail listing
- Carte (Mapbox React Native)
- Performance : virtualisation listes, images cachées (expo-image)
```

```
PHASE 6 — Session 39 : Portage vendeur + messagerie + notifications push.

Porte les écrans vendeur et messagerie :
- Dashboard vendeur
- CRUD listings (avec caméra pour photos directement)
- Messagerie temps réel
- Notifications push natives (Expo Notifications)
- Background sync
- Mode hors-ligne basique (cache lectures)
```

### Livrables attendus

- [ ] Application complète fonctionnelle iOS et Android
- [ ] Tests E2E mobile passent
- [ ] Performance fluide sur device milieu de gamme

---

## 🔴 Session 40 — Soumission App Store et Google Play

### Prompt à copier

```
PHASE 6 — Session 40 : Préparation soumission stores.

Prépare la mise en ligne :

1. **Apple App Store** :
   - Compte Developer Apple (99$/an, à payer)
   - App Store Connect : créer app
   - Provisioning profiles, certificates (EAS gère)
   - Métadonnées : nom, description (FR), screenshots toutes tailles,
     icône, mots-clés
   - Privacy policy URL, support URL
   - Catégorie : Lifestyle ou Social Networking
   - Age rating (sondage)
   - Privacy nutrition labels (TRÈS important : déclarer toutes les
     données collectées)
   - In-App Purchase si freemium prévu (Apple prend 30%, attention)
   - Build via EAS Build → Upload TestFlight → Test interne →
     Soumission review (compter 1-7 jours)

2. **Google Play** :
   - Compte Developer (25$ unique)
   - Play Console : créer app
   - Content rating questionnaire
   - Data safety declaration (équivalent Apple)
   - Screenshots, icône, descriptions
   - Test interne → Test fermé → Production
   - Délai : 1-3 jours

3. **Stratégie In-App Purchase** :
   - Si freemium : RevenueCat pour gérer abos cross-platform
   - Sinon : abos uniquement web (économise 30%) avec deep link
     "Gérer abonnement"

4. **Politique sensible** :
   - Apple peut être strict sur apps "religieuses" : présenter comme
     marketplace communautaire, pas comme app de prosélytisme
   - Lire guidelines App Store sections 1.1 et 5.1.1 (data privacy)

5. **ASO (App Store Optimization)** :
   - Mots-clés pertinents
   - Screenshots avec textes accrocheurs
   - Vidéo preview optionnelle

6. **Plan en cas de rejet** :
   - Lire feedback, corriger, re-soumettre
   - Compter 1-3 itérations possibles
   - Buffer 1 mois minimum dans planning

7. **Post-launch** :
   - Monitoring crashes (Sentry mobile, Crashlytics)
   - Reviews users : répondre activement
   - Updates régulières (1x/mois min) pour rester visible
```

### Livrables attendus

- [ ] App soumise iOS
- [ ] App soumise Android
- [ ] TestFlight et test interne actifs

---

## 🟡 Session 41 — Activation freemium

### Prompt à copier

```
PHASE 6 — Session 41 : Activation effective du modèle freemium.

Active la monétisation :

1. **Activation Stripe** prod (clés live) :
   - Vérification compte Stripe complète
   - Webhook prod configuré
   - Test paiement réel petit montant

2. **Activation web** :
   - Pages tarification, upgrade
   - CTA stratégiques (au moment où user touche limite gratuit)
   - Onboarding nouveau abonné

3. **Activation mobile** (si IAP) :
   - RevenueCat configuré
   - Produits créés App Store et Play Store
   - Tests sandbox

4. **Communication** :
   - Email annonce
   - Bandeau in-app
   - Page changelog

5. **Monitoring revenue** :
   - Dashboard MRR, churn, LTV
   - Alertes échecs paiement

6. **Customer support** :
   - Procédure remboursement
   - Gestion contestations
   - Réponses templates

7. **Optimisations conversion** :
   - A/B test pages tarification (avec consentement)
   - Analyse drop-off paiement

8. **Comptabilité** :
   - Export Stripe vers comptable
   - TVA correcte
```

### Livrables attendus

- [ ] Premier paiement réel reçu
- [ ] Dashboard MRR actif
- [ ] Procédures support en place

---

## 🟢 Session 42 — Bilan et roadmap an 2

### Prompt à copier

```
PHASE 6 — Session 42 : Bilan an 1 et roadmap an 2.

Compile le bilan exhaustif après 12 mois et propose roadmap :

1. **Métriques an 1** :
   - Utilisateurs : inscrits, vérifiés, actifs (DAU/MAU)
   - Vendeurs : profils, listings, transactions estimées
   - Engagement : sessions/user, durée, retention
   - Revenue : MRR, ARR, churn, LTV
   - Tech : uptime, perf moyenne, coûts infra

2. **Apprentissages** :
   - Ce qui a marché
   - Ce qui n'a pas marché
   - Surprises
   - Décisions à reconsidérer

3. **Feedback utilisateurs synthétisé** :
   - Top demandes
   - Top frustrations
   - NPS si mesuré

4. **Roadmap an 2 proposée** :
   - Q1 : ?
   - Q2 : ?
   - Q3 : ?
   - Q4 : ?

5. **Pistes d'évolution** :
   - Extension à autres dénominations chrétiennes (CNEF) ?
   - Paiement intégré ?
   - Marketplace fonctions avancées (panier, stocks) ?
   - Internationalisation (Belgique, Suisse, Afrique francophone) ?
   - API publique partenaires ?

6. **Recrutement éventuel** :
   - Qui faut-il embaucher ?
   - Prioriser les postes

7. **Levée de fonds éventuelle** :
   - Si oui, à quel niveau, pour quoi ?
   - Préparation pitch et data room

Sois honnête et stratégique. Ne dore pas la pilule.
```

### Livrables attendus

- [ ] Bilan rigoureux documenté
- [ ] Roadmap an 2 validée
- [ ] Décisions stratégiques prises

---

# Annexes — Prompts utilitaires

> **À utiliser à tout moment selon besoin**, indépendamment de la phase.

## A1 — Audit sécurité d'un module

```
Mets-toi en mode auditeur sécurité externe senior. Analyse le code/module
suivant selon OWASP Top 10 et les bonnes pratiques. Signale uniquement les
vraies vulnérabilités classées Critical/High/Medium/Low avec :
- Description précise
- Ligne de code concernée
- Exploitation possible (preuve de concept)
- Correctif recommandé (code complet)

Sois impitoyable mais factuel.

[COLLER LE CODE OU PRÉCISER LE FICHIER]
```

## A2 — Revue d'architecture

```
Mets-toi en mode architecte staff. Critique le design proposé en cherchant
les pièges à 6-12 mois :
- Scalabilité
- Maintenabilité
- Couplage
- Dette technique
- Coûts à l'échelle

Sois direct, propose des alternatives si tu en vois de meilleures.

[DÉCRIRE OU COLLER L'ARCHITECTURE]
```

## A3 — Génération de tests

```
Génère une suite de tests complète pour le module suivant :
- Tests unitaires (Vitest)
- Tests d'intégration
- Tests E2E si applicable (Playwright)
- Cas nominaux + cas limites + cas d'erreur + cas sécurité

Couverture cible : 90%+ sur la logique métier, 100% sur la sécurité.

[COLLER LE CODE OU FICHIER]
```

## A4 — Refacto guidée

```
J'ai besoin de refactor le module suivant.

Objectif : [DÉCRIRE]
Contraintes : pas de breaking change, tests doivent rester verts.

Propose :
1. Plan de refacto étape par étape
2. Risques identifiés
3. Code refactoré complet
4. Migration des tests
5. Plan de rollback

[COLLER LE CODE]
```

## A5 — Investigation de bug

```
Investigation de bug.

Symptôme : [DÉCRIRE]
Reproduction : [STEPS]
Stack trace : [SI DISPO]
Code suspect : [SI IDENTIFIÉ]

Analyse :
1. Cause probable racine
2. Hypothèses alternatives
3. Tests pour confirmer la cause
4. Correctif proposé
5. Test de régression
```

## A6 — Mise à jour dépendance majeure

```
Je dois passer de [PACKAGE] [VERSION ACTUELLE] à [VERSION CIBLE].

Donne-moi :
1. Liste des breaking changes pertinents
2. Changements de code nécessaires dans notre projet
3. Plan de migration step-by-step
4. Risques et points d'attention
5. Tests à ajouter pour valider
```

## A7 — Documentation d'un module

```
Génère la documentation technique complète du module suivant pour un
nouveau développeur senior qui rejoint l'équipe :
- Objectif et responsabilités
- Architecture interne
- Points d'extension
- Pièges connus
- Exemples d'usage
- Tests existants

Concis, sans verbiage, en markdown.

[COLLER OU PRÉCISER]
```

## A8 — Préparation à un déploiement prod

```
Je prépare un déploiement en production. Aide-moi à :

1. Checklist pré-déploiement (sécurité, perf, RGPD)
2. Plan de déploiement (étapes, rollback, monitoring)
3. Communication users (s'il y a downtime)
4. Tests à exécuter post-déploiement
5. Plan d'incident si problème détecté

Changements à déployer :
[LISTER]
```

## A9 — Réponse à un incident

```
INCIDENT EN COURS.

Symptômes : [DÉCRIRE]
Impact : [USERS AFFECTÉS]
Données : [LOGS/MÉTRIQUES]

Aide-moi en mode urgent :
1. Hypothèses prioritaires
2. Actions immédiates pour limiter impact
3. Diagnostics à lancer en parallèle
4. Communication users (template)
5. Une fois résolu : post-mortem template

Sois bref et actionnable.
```

## A10 — Évolution majeure

```
Je veux ajouter [FONCTIONNALITÉ] au projet.

Avant de coder, donne-moi :
1. Analyse de faisabilité (technique, légale, RGPD)
2. Impact sur architecture existante
3. Découpage en stories/sessions
4. Estimation effort
5. Risques identifiés
6. Alternatives considérées

Puis on découpera en sessions atomiques.
```

---

# 🎯 Conseils finaux

## Pour réussir

1. **Discipline** : suis l'ordre des sessions, ne brûle pas les étapes
2. **Tests** : ne te dis jamais "je ferai les tests plus tard"
3. **Sécurité** : c'est la fondation, pas une couche cosmétique
4. **Itère** : chaque session est une boucle code → test → commit → review
5. **Documente** : ton futur toi te remerciera dans 6 mois
6. **Demande de l'aide humaine** sur les sujets critiques : juridique, audit sécurité externe, pédagogie référents

## Pour échouer (à éviter)

1. ❌ Vouloir tout coder en parallèle
2. ❌ Sauter les sessions d'audit
3. ❌ Mettre en prod du code IA sans relecture humaine
4. ❌ Ignorer les retours utilisateurs beta
5. ❌ Économiser sur l'audit sécurité externe
6. ❌ Lancer national sans accord institutionnel ADD

## Budget réaliste

- **Infra mois 1-6** : ~50€/mois
- **Infra cible 10k users** : ~500-700€/mois
- **Audit sécurité externe** : 5-10k€ (non négociable avant prod nationale)
- **Stores développeurs** : 99$ Apple/an + 25$ Google unique
- **DPO externalisé** : ~200€/mois
- **Comptabilité société** : ~150€/mois
- **Total an 1 hors salaires** : ~15-25k€

## Ressources externes recommandées

- **Documentation** : Next.js docs, Supabase docs, OWASP Cheat Sheets
- **Sécurité** : OWASP Top 10, ANSSI guides, Snyk Learn
- **RGPD** : CNIL guides, modèles
- **Communauté** : Discord Next.js, Discord Supabase, communauté française dev
- **Outils** : GitHub, Vercel, Supabase, Sentry, Posthog (tous généreux en plan gratuit)

---

# 📝 Journal de bord

> **Tiens un journal au fur et à mesure** des sessions. Date, durée, livrables, problèmes rencontrés, décisions prises. Ça vaut de l'or.

| Date | Session | Durée | Livrables | Notes |
| ---- | ------- | ----- | --------- | ----- |
| ...  | ...     | ...   | ...       | ...   |

---

**Bonne route. Le projet est ambitieux mais réalisable avec discipline.**

_Guide v1.0 — À adapter selon retours terrain._
