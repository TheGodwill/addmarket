-- Migration 0004 : RGPD — suppression de compte et consentements

-- -----------------------------------------------------------------------
-- Table : account_deletion_requests
-- Pas de FK vers auth.users — le record survit à la suppression pour audit
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  cancel_token TEXT NOT NULL,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CONSTRAINT account_deletion_requests_cancel_token_unique UNIQUE (cancel_token)
);

CREATE INDEX IF NOT EXISTS account_deletion_requests_user_id_idx
  ON account_deletion_requests (user_id);
CREATE INDEX IF NOT EXISTS account_deletion_requests_scheduled_for_idx
  ON account_deletion_requests (scheduled_for)
  WHERE cancelled_at IS NULL AND completed_at IS NULL;

ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion requests"
  ON account_deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- Table : consents
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  version TEXT NOT NULL DEFAULT '1',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT consents_user_consent_unique UNIQUE (user_id, consent_type)
);

ALTER TABLE consents
  ADD CONSTRAINT consents_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

CREATE INDEX IF NOT EXISTS consents_user_id_idx ON consents (user_id);

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own consents"
  ON consents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
