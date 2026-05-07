# Threat Model STRIDE — ADDMarket

**Audité le :** 2026-05-07  
**Scope :** Sessions 1–4 (fondations, Supabase/Drizzle, sécurité)  
**Statut :** Phase 0 — avant toute fonctionnalité utilisateur  
**Auditeur :** Claude Code (mode auditeur externe)

---

## Contexte du projet

ADDMarket est une marketplace fermée pour les Assemblées de Dieu France. Seuls les membres vérifiés par un référent paroisse peuvent accéder au marché. Les données sensibles incluent : identité des membres, données de contact, numéros de cartes de membre, transactions financières P2P.

**Stack :** Next.js 16 · Supabase Auth + PostgreSQL · Vercel · Drizzle ORM · Upstash Redis

---

## Partie 1 — Threat Model STRIDE

### Tableau des menaces

| ID  | Catégorie                  | Menace                                                                | Actifs concernés                                     | Impact business                                                               | Contre-mesures en place                                                                                                | Contre-mesures manquantes                                                                                                                | Criticité    |
| --- | -------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| S1  | **Spoofing**               | Usurpation de compte membre via credential stuffing                   | Comptes utilisateurs, données personnelles, listings | Un attaquant accède au compte d'un membre, publie ou achète au nom d'un autre | Rate limiting auth : 5 req/min/IP via Upstash                                                                          | MFA non implémenté (prévu Session 8) ; pas de détection d'anomalies de login (IP étrangère, user-agent inhabituel)                       | **CRITICAL** |
| S2  | **Spoofing**               | Usurpation du token JWT Supabase (expiration longue / vol de cookie)  | Session utilisateur                                  | Accès persistant post-logout ; actions au nom de la victime                   | Cookies gérés par `@supabase/ssr` (httpOnly par défaut) ; HTTPS enforced                                               | Vérifier que Supabase émet les cookies avec `Secure`, `HttpOnly`, `SameSite=Lax` ; rotation de session post-login non encore implémentée | **HIGH**     |
| S3  | **Spoofing**               | Fausse API Supabase (MITM en dev)                                     | Tokens d'authentification                            | Vol de credentials en transit                                                 | HTTPS enforced en prod ; HSTS avec preload                                                                             | Pas de certificate pinning (inutile pour web, acceptable)                                                                                | **LOW**      |
| T1  | **Tampering**              | Injection SQL via inputs non validés                                  | Tables utilisateurs, listings, transactions          | Corruption / exfiltration de données                                          | Drizzle ORM (requêtes paramétrées) ; TypeScript strict ; Zod (env vars)                                                | Zod non encore appliqué sur les inputs API (aucun endpoint métier implémenté) ; à enforcer dès Session 6                                 | **HIGH**     |
| T2  | **Tampering**              | XSS via contenu utilisateur (descriptions de listings, messages)      | Sessions des autres utilisateurs                     | Vol de session, actions à la place de la victime                              | CSP avec nonce par requête ; `default-src 'self'` ; `frame-ancestors 'none'`                                           | Pas encore de sanitisation HTML côté serveur (DOMPurify ou équivalent) — à prévoir quand les champs riches existent                      | **HIGH**     |
| T3  | **Tampering**              | Modification d'une transaction P2P en transit (altération du montant) | Intégrité des transactions                           | Fraude financière                                                             | HTTPS enforced ; Drizzle (type-safe updates)                                                                           | Pas de signature des transactions (hash HMAC côté serveur à envisager) ; RLS non encore définie                                          | **HIGH**     |
| T4  | **Tampering**              | Supply chain attack (dépendance compromise)                           | L'ensemble du code exécuté                           | RCE, exfiltration massive                                                     | `pnpm audit --audit-level high` en CI ; `--frozen-lockfile` en CI ; Sentry monitoring                                  | Pas de Renovate/Dependabot configuré ; pas de SBOM ; pas de vérification d'intégrité (checksum) au-delà du lockfile                      | **MEDIUM**   |
| R1  | **Repudiation**            | Un membre nie avoir vendu / acheté / supprimé un article              | Transactions, listings                               | Litiges sans preuve ; atteinte à la confiance                                 | Pino (logs structurés) ; Sentry (erreurs)                                                                              | Pas d'audit log immuable (table `audit_log` prévue Session 6 mais pas encore existante) ; logs Pino non centralisés (stockés localement) | **HIGH**     |
| R2  | **Repudiation**            | Un admin nie avoir approuvé / révoqué un membre                       | Gestion des membres                                  | Abus de pouvoir sans traçabilité                                              | Rien en place à ce stade                                                                                               | Audit log obligatoire pour toutes actions admin ; accès audit_log en INSERT-only pour le service role                                    | **HIGH**     |
| I1  | **Information Disclosure** | Fuite de `SUPABASE_SERVICE_ROLE_KEY` (bypass total de RLS)            | Toute la base de données                             | Exfiltration complète ; modifications arbitraires                             | Marqué `server-only` ; absent du bundle client ; validé par Zod au démarrage ; non loggé                               | Jamais dans les Server Actions accessibles au client ; jamais dans un composant Client ; à vérifier à chaque PR                          | **CRITICAL** |
| I2  | **Information Disclosure** | Fuite de données personnelles dans les logs                           | Email, téléphone, numéro de carte                    | Violation RGPD ; amende CNIL                                                  | Pino avec `redact` sur `email`, `phone`, `password`, `cardNumber`, `token`, `secret`, `key`, `authorization`, `cookie` | Logs non centralisés → pas d'alerting sur fuite PII ; Sentry scrub cookies + email mais pas les champs custom                            | **MEDIUM**   |
| I3  | **Information Disclosure** | Source maps accessibles en production                                 | Code source JS                                       | Facilite le reverse engineering des protections                               | Source maps non publiés par défaut (Next.js build)                                                                     | Vérifier que `sentry.disableSourceMapUpload` ou que les maps uploadées chez Sentry ne sont pas publiques                                 | **MEDIUM**   |
| I4  | **Information Disclosure** | Stack trace exposée dans les réponses d'erreur                        | Chemins de fichiers, versions                        | Aide à cibler des exploits                                                    | Health endpoint retourne seulement `{status: 'error'}` sans détails                                                    | Valider que tous les futurs endpoints respectent ce pattern ; middleware d'erreur centralisé à créer                                     | **MEDIUM**   |
| I5  | **Information Disclosure** | Numéros de carte de membre stockés en clair                           | Carte membres (PII sensible)                         | Usurpation d'identité dans l'église                                           | `lib/crypto.ts` avec Argon2id (65k mem, t=3, p=4) prévu                                                                | Non encore utilisé en base (schéma minimal) ; à enforcer dès que la table `members` existe                                               | **HIGH**     |
| D1  | **Denial of Service**      | Brute force ou flood sur `/api/auth/*`                                | Disponibilité du service d'auth                      | Blocage des membres légitimes                                                 | Rate limiting : 5 req/min/IP (auth), 3 req/h (signup) via Upstash sliding window                                       | Si Upstash non configuré en prod → rate limiting désactivé silencieusement (fallback `success: true`)                                    | **HIGH**     |
| D2  | **Denial of Service**      | Requêtes lourdes sur Drizzle (N+1, full table scan)                   | Performances DB                                      | Saturation du pool Supabase ; coûts                                           | Supabase pooler (transaction mode) avec `prepare: false`                                                               | Pas de query timeout côté Drizzle ; pas d'index définis (schéma vide) ; à surveiller dès Session 6                                       | **MEDIUM**   |
| D3  | **Denial of Service**      | Upload de fichiers volumineux (images annonces)                       | Bande passante, coûts Cloudinary                     | DoS économique (cost flooding)                                                | Images seulement depuis `res.cloudinary.com` et `*.supabase.co` (next.config.ts)                                       | Pas encore de validation de taille côté serveur ; à enforcer lors de l'implémentation des uploads                                        | **MEDIUM**   |
| E1  | **Elevation of Privilege** | Accès aux données d'un autre utilisateur faute de RLS                 | Toutes les tables métier                             | RGPD violation ; fraude                                                       | Anon key limité par RLS (en théorie)                                                                                   | **RLS non définie** — le premier utilisateur avec l'anon key aurait accès à tout si une table est créée sans RLS                         | **CRITICAL** |
| E2  | **Elevation of Privilege** | Membre non vérifié accède au marché                                   | Listings, transactions                               | Undermines the closed community model                                         | Non implémenté (prévu Phase 1)                                                                                         | À implémenter en Session 9 ; middleware de vérification du statut membre avant tout accès marché                                         | **HIGH**     |
| E3  | **Elevation of Privilege** | Escalade de rôle (membre → admin) via manipulation de JWT             | Comptes admin                                        | Contrôle total du marché                                                      | Rôles Supabase JWT (claims) côté serveur                                                                               | RBAC non encore implémenté (Session 10) ; claims JWT à valider côté serveur à chaque requête                                             | **HIGH**     |
| E4  | **Elevation of Privilege** | CSRF sur actions sensibles (suppression, achat)                       | Actions transactionnelles                            | Fraude, suppressions involontaires                                            | `form-action 'self'` dans CSP ; `SameSite` cookies via Supabase SSR                                                    | Vérifier SameSite=Lax sur tous les cookies Supabase ; CSRF token à prévoir sur les mutations critiques                                   | **MEDIUM**   |

---

## Partie 2 — Audit du setup actuel (Sessions 1–4)

### Vulnérabilités classées par sévérité

#### 🔴 CRITICAL

**C1 — RLS non définie**  
Aucune Row Level Security configurée en base. Si une table métier est créée sans RLS, n'importe quel utilisateur authentifié avec l'anon key peut lire et écrire toutes les lignes.  
→ **Action avant Phase 1 :** Template de migration RLS obligatoire ; politique `ENABLE ROW LEVEL SECURITY` + `USING (auth.uid() = user_id)` sur chaque table dès la Session 6.

**C2 — Rate limiting silencieusement désactivé si Upstash absent**  
`lib/rate-limit.ts` retourne `{success: true, remaining: 999}` si `UPSTASH_REDIS_REST_URL` n'est pas défini. Si l'env de prod est mal configuré, le rate limiting ne s'active pas et aucune erreur n'est levée.  
→ **Action :** Ajouter une assertion au démarrage en production : si `NODE_ENV === 'production'` et que Upstash est absent → throw (ou au moins log.error et alerter).

#### 🟠 HIGH

**H1 — Zod non appliqué sur les inputs API**  
`lib/env.server.ts` valide les variables d'environnement. Mais aucun middleware/validator n'existe encore pour les inputs des futures routes API. Sans validation, le premier endpoint expose une surface d'injection.  
→ **Action :** Créer un helper `parseBody<T>(schema: ZodSchema<T>, request: Request)` avant d'implémenter le premier endpoint.

**H2 — Audit log absent**  
Pino logge les événements mais sur le système de fichiers local (ou stdout). Il n'y a pas de table `audit_log` immuable. Les actions sensibles (login, vente, vérification membre, promotion admin) n'ont aucune trace durable et non-répudiable.  
→ **Action :** Créer `audit_log` en Session 6 avec politique INSERT-only (service role) et lecture admin uniquement.

**H3 — Numéros de carte non encore hashés en base**  
`lib/crypto.ts` est implémenté (Argon2id) mais le schéma ne contient que `_health`. Dès que `members` sera créé, le champ `card_number_hash` doit utiliser cette fonction — sans quoi les numéros seront stockés en clair.  
→ **Action :** Checklist de review PR : `cardNumber` en clair interdit dans toute migration.

**H4 — Pas de CORS explicite**  
Next.js App Router ne bloque pas les requêtes cross-origin par défaut sur les Route Handlers. Un site tiers peut émettre des requêtes fetch authentifiées si les cookies sont `SameSite=None`.  
→ **Action :** Vérifier que Supabase SSR émet `SameSite=Lax` (bloque les requêtes cross-origin non-navigateur). Ajouter un header `Vary: Origin` ou refuser les origines non reconnues sur les routes API sensibles.

**H5 — Service role key : absence de guardrails de review**  
La clé service role n'est utilisée nulle part dans le code actuel, ce qui est bien. Mais aucun mécanisme n'empêche un développeur futur d'importer `serverEnv.SUPABASE_SERVICE_ROLE_KEY` dans un composant partagé.  
→ **Action :** Ajouter une règle ESLint custom (ou grep en CI) qui interdit `SUPABASE_SERVICE_ROLE_KEY` en dehors de `lib/supabase/admin.ts` (fichier à créer avec `server-only`).

#### 🟡 MEDIUM

**M1 — Logs non centralisés**  
Pino écrit sur stdout. En production Vercel, ces logs sont disponibles dans le dashboard Vercel mais sans alerting automatique sur les patterns suspects (ex. 100 échecs d'auth en 1 minute).  
→ **Action :** Connecter Pino à un transport externe (Axiom, Logtail, Datadog) avec alerting sur `logger.error`.

**M2 — `unsafe-inline` dans style-src**  
La CSP autorise `style-src 'unsafe-inline'`. Nécessaire pour Tailwind/shadcn, mais affaiblit la protection contre l'injection de styles (CSS data exfiltration).  
→ **Action :** Acceptable pour l'instant. Revoir si un jour les styles sont générés dynamiquement depuis des inputs utilisateur.

**M3 — Source maps Sentry**  
Les source maps uploadées chez Sentry permettent de lire le code source côté Sentry. Si le projet Sentry est compromis, le code source est exposé.  
→ **Action :** Vérifier que le projet Sentry est privé et que `SENTRY_AUTH_TOKEN` a des permissions minimales (release:write uniquement).

**M4 — CI utilise des placeholders hardcodés**  
`ci.yml` passe `SUPABASE_SERVICE_ROLE_KEY=placeholder_service_role_key_for_ci_only` directement dans le YAML. Ces valeurs sont visibles dans les logs GitHub.  
→ **Action :** Migrer vers GitHub Secrets pour toutes les valeurs, même les placeholders, pour établir une bonne hygiène.

**M5 — `pnpm audit` bloque seulement `--audit-level high`**  
Les vulnérabilités `moderate` sont ignorées. Dans certains contextes, une vuln modérée dans une dépendance auth peut être critique.  
→ **Action :** Acceptable pour l'instant. Surveiller Renovate/Dependabot dès la mise en place.

**M6 — Renovate/Dependabot absent**  
Aucun outil de mise à jour automatique des dépendances. Le drizzle-orm CVE (GHSA-gpj5-g38j-94v9) a été découvert manuellement.  
→ **Action :** Activer Dependabot GitHub ou Renovate avant Phase 1.

#### 🔵 LOW

**L1 — Pre-commit contournable avec `--no-verify`**  
Husky peut être bypassé. Mitigé par le CI qui impose les mêmes checks.  
→ Acceptable.

**L2 — `robots: noindex` non enforced côté serveur**  
Le meta `robots: {index: false}` dans `layout.tsx` est une suggestion aux crawlers. Un crawler malveillant l'ignorera.  
→ Acceptable en phase de développement.

**L3 — Endpoint `/api/health` sans auth**  
Accessible publiquement. Expose l'existence de la base de données et son statut.  
→ Acceptable pour un endpoint de monitoring. Ne retourne aucune donnée sensible.

---

## Actions correctives priorisées

| Priorité | Action                                                   | Quand                               | Effort            |
| -------- | -------------------------------------------------------- | ----------------------------------- | ----------------- |
| 🔴 P0    | RLS sur chaque table dès la création (Session 6)         | Avant tout schema métier            | Faible (template) |
| 🔴 P0    | Assertion prod : Upstash requis si `NODE_ENV=production` | Avant déploiement                   | 15 min            |
| 🟠 P1    | Helper `parseBody` avec Zod pour tous les Route Handlers | Avant Session 7 (1er endpoint auth) | 1h                |
| 🟠 P1    | Table `audit_log` INSERT-only (Session 6)                | Session 6                           | Moyen             |
| 🟠 P1    | Activer Dependabot (GitHub settings)                     | Immédiatement                       | 5 min             |
| 🟡 P2    | Centraliser logs Pino (Axiom ou Logtail)                 | Avant beta                          | Moyen             |
| 🟡 P2    | Migrer CI placeholders vers GitHub Secrets               | Avant merge en main                 | 30 min            |
| 🟡 P2    | Règle ESLint pour isoler `SUPABASE_SERVICE_ROLE_KEY`     | Session 6                           | 30 min            |
| 🟡 P2    | Vérifier `SameSite=Lax` sur cookies Supabase             | Session 7 (auth)                    | Vérification      |
| 🔵 P3    | SBOM génération en CI                                    | Phase 2                             | Faible            |
| 🔵 P3    | Vérifier permissions SENTRY_AUTH_TOKEN                   | Après config Sentry                 | 10 min            |

---

## Bonnes pratiques manquées

1. **Pas de politique de secret rotation** : aucun process documenté pour faire tourner les clés Supabase, Upstash, Sentry si compromises.
2. **Pas de threat model mis à jour dans le CI** : ce document n'est pas automatiquement invalidé si l'architecture change.
3. **`NEXT_PUBLIC_SENTRY_DSN` non encore renseigné** (optionnel mais monitoring en aveugle en prod si oublié).
4. **Aucun test de sécurité automatisé** (DAST, fuzzing, ZAP) — prévu Session 27 mais jamais trop tôt pour un smoke test.

---

## Décision GO/NO-GO — Phase 1

### Verdict : ✅ GO conditionnel

La Phase 1 peut démarrer **à condition que les actions P0 soient traitées dans la Session 6 avant d'écrire du code métier**.

**Ce qui rend le GO possible :**

- Fondations cryptographiques solides (Argon2id, paramètres OWASP)
- CSP avec nonce par requête (protection XSS proactive)
- Rate limiting implémenté (désactivation en dev documentée)
- Secrets serveur isolés (`server-only`, Zod validation au démarrage)
- HTTPS enforced (HSTS 2 ans + preload)
- Pipeline CI complet (lint, typecheck, tests, audit, build)
- Logging structuré avec redaction PII

**Blockers à lever en Session 6 (avant tout code métier) :**

1. **RLS activée + politique par défaut** sur chaque table créée
2. **Assertion Upstash en production** (`if (NODE_ENV === 'production' && !upstashUrl) throw`)
3. **Dependabot activé** sur le repo GitHub

**À suivre de près en Phase 1 :**

- `parseBody` Zod sur chaque endpoint avant d'accepier des inputs
- `audit_log` en place avant Session 7
- Numéros de carte jamais stockés en clair

> ⚠️ Le risque principal n'est pas dans ce qui existe, mais dans ce qui sera créé en Phase 1 sans guardrails. Les P0 ci-dessus sont les guardrails.
