# Contributing

## Branches

| Branche   | Usage                              |
| --------- | ---------------------------------- |
| `main`    | Production — push direct interdit  |
| `develop` | Intégration — push direct interdit |
| `feat/*`  | Nouvelle fonctionnalité            |
| `fix/*`   | Correction de bug                  |
| `chore/*` | Maintenance, deps, CI              |

Toujours partir de `develop` :

```sh
git checkout develop
git pull
git checkout -b feat/ma-fonctionnalite
```

## Commits

Format [Conventional Commits](https://www.conventionalcommits.org/), en anglais :

```
<type>: <description courte>

[body optionnel]
```

Types autorisés : `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `revert`

```sh
# Exemples valides
feat: add seller profile creation form
fix: correct RLS policy on listings table
chore(deps): update next to 16.3.0
test: add auth middleware unit tests
```

## Pull Requests

1. Ouvrir une PR de `feat/*` → `develop`
2. Remplir la checklist du template
3. Attendre la CI verte avant review
4. Minimum 1 reviewer

**Règle** : pas de merge sans `pnpm typecheck`, `pnpm lint` et `pnpm test` verts.

## Setup local

```sh
pnpm install
cp .env.example .env.local
# Remplir .env.local
pnpm dev
```
