# RBAC — Matrice des permissions ADDMarket

## Rôles

| Rôle             | Description                                                              | Stockage                                 |
| ---------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| `member`         | Membre vérifié standard (vendeur + acheteur)                             | `app_metadata.role`                      |
| `referent`       | Référent paroisse — valide les inscriptions de son église                | `app_metadata.role` + `church_referents` |
| `admin_local`    | Admin d'une église — référent + modération locale + gestion utilisateurs | `app_metadata.role` + `church_referents` |
| `admin_national` | Super-administrateur — tous droits                                       | `app_metadata.role`                      |
| `support`        | Équipe support — lecture seule + approbation                             | `app_metadata.role`                      |

## Matrice des permissions

| Permission                        | member | referent | admin_local | admin_national | support |
| --------------------------------- | :----: | :------: | :---------: | :------------: | :-----: |
| `profile.read.public`             |   ✓    |    ✓     |      ✓      |       ✓        |    ✓    |
| `profile.read.own`                |   ✓    |    ✓     |      ✓      |       ✓        |    ✓    |
| `profile.read.any`                |        |          |             |       ✓        |    ✓    |
| `profile.update.own`              |   ✓    |    ✓     |      ✓      |       ✓        |         |
| `profile.update.any`              |        |          |             |       ✓        |         |
| `verification.create`             |   ✓    |    ✓     |      ✓      |       ✓        |         |
| `verification.approve.own_church` |        |    ✓     |      ✓      |       ✓        |         |
| `verification.approve.any`        |        |          |             |       ✓        |    ✓    |
| `listing.create`                  |   ✓    |    ✓     |      ✓      |       ✓        |         |
| `listing.update.own`              |   ✓    |    ✓     |      ✓      |       ✓        |         |
| `listing.delete.any`              |        |          |      ✓      |       ✓        |         |
| `audit.read.own_actions`          |   ✓    |    ✓     |      ✓      |       ✓        |    ✓    |
| `audit.read.all`                  |        |          |      ✓      |       ✓        |    ✓    |
| `admin.users.read`                |        |          |      ✓      |       ✓        |    ✓    |
| `admin.users.promote`             |        |          |    ✓ \*     |       ✓        |         |
| `admin.users.revoke`              |        |          |    ✓ \*     |       ✓        |         |

\*`admin_local` ne peut promouvoir/révoquer que les rôles `referent` et `admin_local`.

## Routes protégées

| Route                   | Authentification | Rôle minimum  |
| ----------------------- | :--------------: | :-----------: |
| `/*` (sauf /auth, /api) |     Requise      |       —       |
| `/onboarding`           |     Requise      |       —       |
| `/referent/*`           |     Requise      |  `referent`   |
| `/admin/*`              |     Requise      | `admin_local` |

La protection est en double : middleware proxy (JWT claim) + vérification en server component (DB).

## Règles de promotion

1. **Ré-authentification par mot de passe** obligatoire pour toute promotion.
2. **Vérification MFA** : si le compte admin a MFA activée, la session doit être AAL2.
3. **Auto-promotion interdite** : nul ne peut se promouvoir lui-même.
4. **Plafond hiérarchique** : `admin_local` ne peut pas promouvoir au-dessus de `admin_local`.
5. **Champ d'application** : `admin_local` ne peut agir que sur les rôles `referent`/`admin_local`.

## Implémentation

### `can(role, permission)`

Fonction pure synchrone. Utilisée pour :

- Conditionner l'affichage (`<Authorized permission="...">` server component)
- Valider les droits dans les Server Actions avant toute opération

### `resolveUserRole(userId, appMetadata)`

Lit `app_metadata.role` en priorité (frais via `getUser()`), sinon requête `church_referents`.

### Stockage double pour les rôles church-scoped

Lors d'une promotion vers `referent` ou `admin_local` :

- Écriture dans `church_referents` (traçabilité, relation église)
- Écriture dans `app_metadata.role` (check JWT dans le proxy sans requête DB)

### Audit log

Chaque promotion/révocation génère une entrée dans `audit_log` :

```json
{
  "actor_id": "<uuid>",
  "action": "role.promote" | "role.revoke",
  "target_type": "user",
  "target_id": "<uuid>",
  "metadata": { "before": "member", "after": "referent", "church_id": "<uuid>" }
}
```

## Tests de sécurité

| Scénario                                    | Test                                                           |
| ------------------------------------------- | -------------------------------------------------------------- |
| Membre → `/admin/*`                         | Redirigé vers `/` par proxy                                    |
| Membre → `/referent/*`                      | Redirigé vers `/` par proxy                                    |
| Non-authentifié → toute route               | Redirigé vers `/auth/login`                                    |
| Référent → `admin.users.promote`            | `can('referent', 'admin.users.promote') === false`             |
| `admin_local` → promouvoir `admin_national` | Action retourne "Permission refusée"                           |
| Auto-promotion                              | Action retourne "Vous ne pouvez pas vous promouvoir vous-même" |
