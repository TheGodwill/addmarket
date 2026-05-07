# Entity Relationship Diagram — ADDMarket

**Schéma :** `public`  
**Généré le :** 2026-05-07 (Session 6)

---

## Diagramme ASCII

```
┌─────────────────────────┐
│       auth.users        │  (géré par Supabase Auth)
│─────────────────────────│
│ id            UUID  PK  │
│ email         TEXT      │
│ ...                     │
└─────────────────────────┘
         │  1
         │  │ CASCADE DELETE
         │  ├──────────────────────────────────────────────┐
         │  │                                              │
         ▼  ▼                                              ▼
┌──────────────────────────────────┐    ┌──────────────────────────────┐
│            profiles              │    │        church_referents       │
│──────────────────────────────────│    │──────────────────────────────│
│ id            UUID  PK  FK↑      │    │ id            UUID  PK       │
│ display_name  TEXT  NOT NULL     │    │ church_id     UUID  FK→      │◄─┐
│ phone_encrypted TEXT             │    │ user_id       UUID  FK↑      │  │
│ city          TEXT               │    │ role          ENUM            │  │
│ region        TEXT               │    │   (referent|admin_local)     │  │
│ church_id     UUID  FK→          │◄───│ granted_at    TIMESTAMPTZ    │  │
│ membership_status ENUM           │    │ granted_by    UUID  FK↑      │  │
│  (pending|verified|expired       │    │                              │  │
│   |rejected|suspended)           │    │ UNIQUE(church_id, user_id)   │  │
│ membership_card_hash TEXT        │    └──────────────────────────────┘  │
│  (argon2id — jamais en clair)    │                                       │
│ verified_at   TIMESTAMPTZ        │                                       │
│ verified_by   UUID  FK↑          │                                       │
│ expires_at    TIMESTAMPTZ        │                                       │
│ created_at    TIMESTAMPTZ        │                                       │
│ updated_at    TIMESTAMPTZ ←trig  │                                       │
│                                  │                                       │
│ RLS: read=authenticated          │                                       │
│      write_own=owner             │                                       │
│      write_status=service_role   │                                       │
└──────────────────────────────────┘                                       │
                                                                           │
┌──────────────────────────────────┐                                       │
│            churches              │◄──────────────────────────────────────┘
│──────────────────────────────────│
│ id            UUID  PK           │◄────────────────────────┐
│ name          TEXT  NOT NULL     │                          │
│ city          TEXT  NOT NULL     │                          │
│ region        TEXT  NOT NULL     │                          │
│ address       TEXT               │                          │
│ pastor        TEXT               │                          │
│ is_active     BOOL  DEFAULT true │                          │
│ created_at    TIMESTAMPTZ        │                          │
│                                  │                          │
│ RLS: read=authenticated          │                          │
│      write=service_role only     │                          │
└──────────────────────────────────┘                          │
         │  1                        1                        │
         │  └──────────── M ─────────┘                        │
         │                                                     │
         ▼  M                                                  │
┌──────────────────────────────────┐                          │
│       verification_requests      │                          │
│──────────────────────────────────│                          │
│ id              UUID  PK         │                          │
│ user_id         UUID  FK↑        │                          │
│ church_id       UUID  FK→        │──────────────────────────┘
│ card_photo_storage_path TEXT     │  (Supabase Storage — privé)
│ status          ENUM             │
│  (pending|approved|rejected      │
│   |cancelled)                    │
│ submitted_at    TIMESTAMPTZ      │
│ processed_at    TIMESTAMPTZ      │
│ processed_by    UUID  FK↑        │
│ rejection_reason TEXT            │
│                                  │
│ UNIQUE(user_id) WHERE pending    │  ← un seul pending par user
│                                  │
│ RLS: read=owner|referent|admin   │
│      insert=owner                │
│      update=referent|admin       │
└──────────────────────────────────┘

┌──────────────────────────────────────────┐
│               audit_log                  │
│──────────────────────────────────────────│
│ id          UUID  PK                     │
│ actor_id    UUID  FK↑  NULLABLE          │  (NULL = action système)
│ action      TEXT  NOT NULL               │  ex: 'user.login', 'member.verified'
│ target_type TEXT                         │  ex: 'profile', 'verification_request'
│ target_id   UUID                         │
│ metadata    JSONB                         │  ip, user_agent, diff, etc.
│ ip_address  INET                         │
│ user_agent  TEXT                         │
│ created_at  TIMESTAMPTZ  NOT NULL        │  ← IMMUTABLE (trigger bloque UPDATE/DELETE)
│                                          │
│ RLS: read=admin_national only            │
│      insert=service_role only            │
│      update=INTERDIT (trigger)           │
│      delete=INTERDIT (trigger)           │
└──────────────────────────────────────────┘
```

---

## Enums PostgreSQL

| Enum                  | Valeurs                                                   |
| --------------------- | --------------------------------------------------------- |
| `membership_status`   | `pending`, `verified`, `expired`, `rejected`, `suspended` |
| `referent_role`       | `referent`, `admin_local`                                 |
| `verification_status` | `pending`, `approved`, `rejected`, `cancelled`            |

---

## Indexes

| Table                 | Index                                        | Type                                    | Raison                         |
| --------------------- | -------------------------------------------- | --------------------------------------- | ------------------------------ |
| churches              | `churches_region_idx`                        | btree                                   | Filtrer par région             |
| profiles              | `profiles_church_id_idx`                     | btree                                   | Jointure fréquente             |
| profiles              | `profiles_membership_status_idx`             | btree                                   | Filtrer par statut             |
| church_referents      | `church_referents_user_id_idx`               | btree                                   | Lookup référent par user       |
| verification_requests | `verification_requests_user_id_idx`          | btree                                   | Requêtes par owner             |
| verification_requests | `verification_requests_church_id_idx`        | btree                                   | Requêtes par église            |
| verification_requests | `verification_requests_status_idx`           | btree                                   | Filtrer pending/approved       |
| verification_requests | `verification_requests_one_pending_per_user` | UNIQUE PARTIAL `WHERE status='pending'` | Max 1 demande pending par user |
| audit_log             | `audit_log_actor_id_idx`                     | btree                                   | Filtrer par acteur             |
| audit_log             | `audit_log_created_at_idx`                   | btree                                   | Tri chronologique              |
| audit_log             | `audit_log_action_idx`                       | btree                                   | Filtrer par type d'action      |
| audit_log             | `audit_log_target_idx`                       | btree composite                         | Lookup par cible               |

---

## Triggers

| Trigger                | Table        | Événement            | Fonction                                                |
| ---------------------- | ------------ | -------------------- | ------------------------------------------------------- |
| `on_auth_user_created` | `auth.users` | AFTER INSERT         | `handle_new_user()` — crée une ligne profiles           |
| `profiles_updated_at`  | `profiles`   | BEFORE UPDATE        | `handle_updated_at()` — met à jour updated_at           |
| `audit_log_immutable`  | `audit_log`  | BEFORE UPDATE/DELETE | `prevent_audit_log_modification()` — lève une exception |

---

## Fonctions RLS

| Fonction                                 | Rôle                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `public.is_admin_national()`             | Vérifie le claim JWT `app_metadata.role = 'admin_national'`                     |
| `public.is_church_referent(church_uuid)` | Vérifie que l'utilisateur courant est dans `church_referents` pour cette église |

---

## Sécurité des champs sensibles

| Champ                     | Table                   | Protection                                          |
| ------------------------- | ----------------------- | --------------------------------------------------- |
| `phone_encrypted`         | `profiles`              | AES-256-GCM — clé `PHONE_ENCRYPTION_KEY` dans l'app |
| `membership_card_hash`    | `profiles`              | Argon2id (mem=64MiB, t=3, p=4) — jamais en clair    |
| `card_photo_storage_path` | `verification_requests` | Bucket Supabase Storage privé, RLS, TTL 7j          |

---

## Storage Supabase (configuration manuelle)

```sql
-- Bucket privé pour les photos de cartes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'card-photos',
  'card-photos',
  false,
  5242880,  -- 5 MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- RLS Storage : owner peut uploader, service_role peut lire
CREATE POLICY "card_photos_upload_owner" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'card-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "card_photos_read_service_role" ON storage.objects
  FOR SELECT TO service_role USING (bucket_id = 'card-photos');

-- Suppression auto après 7 jours (nécessite pg_cron — plan Supabase Pro)
-- SELECT cron.schedule('delete-old-card-photos', '0 2 * * *',
--   $$DELETE FROM storage.objects WHERE bucket_id = 'card-photos'
--     AND created_at < now() - interval '7 days'$$);
```
