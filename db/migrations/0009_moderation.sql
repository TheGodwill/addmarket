-- Session 18: Moderation system

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE report_target_type AS ENUM ('listing', 'seller', 'review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('new', 'in_review', 'resolved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_reason_type AS ENUM ('spam', 'fake', 'inappropriate', 'illegal', 'scam', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sanction_type AS ENUM ('warning', 'suspension', 'ban', 'unsuspension', 'unban');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. moderation_reports table
CREATE TABLE IF NOT EXISTS moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_type report_target_type NOT NULL,
  target_id UUID NOT NULL,
  reason report_reason_type NOT NULL,
  details TEXT,
  status report_status NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'normal',
  moderator_note TEXT,
  resolved_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS moderation_reports_target_idx
  ON moderation_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS moderation_reports_reporter_idx
  ON moderation_reports(reporter_id);
CREATE INDEX IF NOT EXISTS moderation_reports_status_idx
  ON moderation_reports(status);
CREATE INDEX IF NOT EXISTS moderation_reports_created_idx
  ON moderation_reports(created_at);

-- 3. account_sanctions table
CREATE TABLE IF NOT EXISTS account_sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sanctioned_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type sanction_type NOT NULL,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_sanctions_user_id_idx ON account_sanctions(user_id);
CREATE INDEX IF NOT EXISTS account_sanctions_created_idx ON account_sanctions(created_at);

-- 4. Add moderation columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warning_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS false_report_count INTEGER NOT NULL DEFAULT 0;

-- 5. Auto-elevate priority when 3+ reports on same target (trigger)
CREATE OR REPLACE FUNCTION check_report_priority()
RETURNS TRIGGER AS $$
DECLARE
  report_count INT;
BEGIN
  SELECT COUNT(DISTINCT reporter_id) INTO report_count
  FROM moderation_reports
  WHERE target_type = NEW.target_type
    AND target_id = NEW.target_id
    AND status NOT IN ('resolved', 'rejected');

  IF report_count >= 3 THEN
    UPDATE moderation_reports
      SET priority = 'high'
      WHERE target_type = NEW.target_type
        AND target_id = NEW.target_id
        AND status NOT IN ('resolved', 'rejected');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_report_priority ON moderation_reports;
CREATE TRIGGER trg_check_report_priority
  AFTER INSERT ON moderation_reports
  FOR EACH ROW EXECUTE FUNCTION check_report_priority();
