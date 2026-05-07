-- Add 'waiting' status to verification_status enum
ALTER TYPE "public"."verification_status" ADD VALUE IF NOT EXISTS 'waiting';--> statement-breakpoint

-- Add columns to verification_requests
ALTER TABLE "public"."verification_requests"
  ADD COLUMN IF NOT EXISTS "card_photo_back_storage_path" text,
  ADD COLUMN IF NOT EXISTS "card_number_hash" text,
  ADD COLUMN IF NOT EXISTS "card_number_last4" text,
  ADD COLUMN IF NOT EXISTS "rejection_reason_code" text,
  ADD COLUMN IF NOT EXISTS "resubmit_after" timestamptz,
  ADD COLUMN IF NOT EXISTS "submission_display_name" text,
  ADD COLUMN IF NOT EXISTS "submission_city" text;--> statement-breakpoint

-- Add onboarding_completed_at to profiles
ALTER TABLE "public"."profiles"
  ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamptz;--> statement-breakpoint

-- ============================================================
-- Storage bucket: card-photos (private, max 5 MB)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'card-photos',
  'card-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;--> statement-breakpoint

-- Members can upload only into their own folder (server action uses service_role in practice)
CREATE POLICY "card_photos_insert_owner" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'card-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );--> statement-breakpoint

-- Service role reads (signed URL generation, referent preview)
CREATE POLICY "card_photos_select_service_role" ON storage.objects
  FOR SELECT TO service_role
  USING (bucket_id = 'card-photos');--> statement-breakpoint

-- Service role delete (on approval or GDPR erasure)
CREATE POLICY "card_photos_delete_service_role" ON storage.objects
  FOR DELETE TO service_role
  USING (bucket_id = 'card-photos');--> statement-breakpoint

-- ============================================================
-- Rate limiting helper — referent can process max 50 req/h
-- Enforced in application layer (Upstash sliding window)
-- ============================================================

-- ============================================================
-- Partial index for submitted_at ordering (referent list)
-- ============================================================
CREATE INDEX IF NOT EXISTS "verification_requests_submitted_at_idx"
  ON "public"."verification_requests" ("submitted_at" DESC);--> statement-breakpoint

-- Alert index: requests older than 72h still pending
CREATE INDEX IF NOT EXISTS "verification_requests_pending_submitted_idx"
  ON "public"."verification_requests" ("submitted_at")
  WHERE "status" = 'pending';
