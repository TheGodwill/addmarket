# ADDMarket

Marketplace communautaire fermée pour les Assemblées de Dieu France (ADD).

## Prérequis

- Node.js 20+
- pnpm 9+

## Installation

```sh
pnpm install
cp .env.example .env.local
# Remplir les variables dans .env.local
pnpm dev
```

## Scripts

| Script               | Description                    |
| -------------------- | ------------------------------ |
| `pnpm dev`           | Serveur de développement       |
| `pnpm build`         | Build de production            |
| `pnpm typecheck`     | Vérification TypeScript        |
| `pnpm lint`          | ESLint                         |
| `pnpm format`        | Prettier                       |
| `pnpm test`          | Tests unitaires (Vitest)       |
| `pnpm test:coverage` | Couverture de tests            |
| `pnpm test:e2e`      | Tests E2E (Playwright)         |
| `pnpm db:generate`   | Générer les migrations Drizzle |
| `pnpm db:migrate`    | Appliquer les migrations       |
| `pnpm db:push`       | Push schéma (dev uniquement)   |
| `pnpm db:studio`     | Ouvrir Drizzle Studio          |

## Structure

```
app/              # Next.js App Router
  (auth)/         # Groupe de routes auth (login, register...)
  (dashboard)/    # Groupe de routes protégées
  api/            # API Routes
components/
  ui/             # Composants shadcn/ui
  forms/          # Formulaires
  layouts/        # Mises en page
db/
  schema/         # Schémas Drizzle ORM
  migrations/     # Migrations générées (versionnées Git)
lib/
  supabase/       # Clients Supabase (server + client)
  env.ts          # Variables d'env client (Zod)
  env.server.ts   # Variables d'env serveur (Zod + server-only)
  utils.ts        # Utilitaires (cn, etc.)
server/
  actions/        # Next.js Server Actions
  queries/        # Requêtes DB Drizzle
tests/
  unit/           # Tests Vitest
  e2e/            # Tests Playwright
types/            # Types TypeScript partagés
```

## Conventions

- **Commits** : Conventional Commits (`feat:`, `fix:`, `chore:`...) en anglais
- **Branches** : `feat/`, `fix/`, `chore/` depuis `develop`
- **Secrets** : jamais en dur, toujours dans `.env.local`
- **Sécurité** : voir `SECURITY.md`

## Vérification du setup

```sh
pnpm typecheck   # Doit passer sans erreur
pnpm lint        # Doit passer sans erreur
pnpm test        # Tests unitaires passants
```
