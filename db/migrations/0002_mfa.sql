-- Migration 0002: MFA — Recovery Codes + Profile MFA Fields
-- ============================================================

-- 1. Add MFA columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_enabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS mfa_factor_id  text;

-- 2. Create MFA recovery codes table
CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  code_hash  text        NOT NULL,
  used_at    timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS mfa_recovery_codes_user_id_idx
  ON public.mfa_recovery_codes (user_id);

CREATE INDEX IF NOT EXISTS mfa_recovery_codes_unused_idx
  ON public.mfa_recovery_codes (user_id)
  WHERE used_at IS NULL;

-- 4. RLS — no direct user access; all writes via service role (Server Actions)
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies → deny all for anon/authenticated
-- Service role bypasses RLS by default
