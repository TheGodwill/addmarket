# Security Policy

## Versions supportées

Seule la dernière version déployée reçoit des correctifs de sécurité.

## Signaler une vulnérabilité

**Ne pas ouvrir une issue publique GitHub pour une vulnérabilité de sécurité.**

Envoyer un email à : **sielle.sorho@gmail.com**

Inclure dans le rapport :

- Description de la vulnérabilité
- Étapes pour reproduire
- Impact potentiel (données exposées, contournement d'auth, etc.)
- Optionnel : suggestion de correctif

## Délais de réponse

- Accusé de réception : sous 48h
- Évaluation du rapport : sous 7 jours
- Correctif (si confirmé) : sous 30 jours

## Périmètre

Les éléments suivants sont dans le périmètre :

- Contournement d'authentification ou d'autorisation
- Injection SQL / XSS / CSRF
- Exposition de données personnelles (RGPD)
- Bypass des règles RLS Supabase
- Exposition du `service_role_key`

Les éléments suivants sont hors périmètre :

- Attaques nécessitant un accès physique au serveur
- Attaques par force brute sur des comptes individuels (le rate limiting est en place)
- Bugs sans impact sécurité

## Merci

Nous remercions les chercheurs en sécurité qui nous aident à protéger nos membres.
