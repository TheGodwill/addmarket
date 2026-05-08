-- Session 23: Notification preferences

DO $$ BEGIN
  CREATE TYPE notif_type AS ENUM ('new_message', 'new_review', 'review_response', 'verification_update');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notif_channel AS ENUM ('email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notif_type NOT NULL,
  channel notif_channel NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_prefs_user_type_channel_unique UNIQUE (user_id, type, channel)
);

CREATE INDEX IF NOT EXISTS notification_prefs_user_id_idx ON notification_prefs(user_id);
