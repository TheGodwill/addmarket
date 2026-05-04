## Description

<!-- Décris les changements apportés et pourquoi -->

Closes #<!-- numéro issue -->

## Type de changement

- [ ] Bug fix
- [ ] Nouvelle fonctionnalité
- [ ] Refactoring
- [ ] Documentation
- [ ] CI/CD
- [ ] Dépendances

## Checklist sécurité

- [ ] Tous les inputs serveur sont validés avec Zod
- [ ] RLS activé sur toutes les nouvelles tables (si DB)
- [ ] Aucun secret hardcodé dans le code
- [ ] Aucune PII dans les logs
- [ ] Rate limiting en place sur les nouveaux endpoints sensibles
- [ ] Erreurs gérées sans stack trace exposée au client
- [ ] Migration réversible (si changement DB)
- [ ] Audit trail pour les actions sensibles (si applicable)

## Checklist qualité

- [ ] `pnpm typecheck` passe
- [ ] `pnpm lint` passe
- [ ] `pnpm test` passe
- [ ] Tests de sécurité ajoutés (auth, RLS, validation)
- [ ] Accessibilité vérifiée (si UI)

## Notes pour le reviewer

<!-- Mentionne les choix discutables, dette introduite, risques résiduels -->
