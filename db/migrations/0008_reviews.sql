-- Session 17: Reviews system schema update

-- 1. Add new columns to seller_reviews
ALTER TABLE seller_reviews
  ADD COLUMN IF NOT EXISTS response_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS report_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Drop old unique constraint (reviewer_id, seller_id, listing_id) and replace with (reviewer_id, seller_id)
ALTER TABLE seller_reviews DROP CONSTRAINT IF EXISTS reviews_unique_reviewer_seller_listing;
ALTER TABLE seller_reviews ADD CONSTRAINT reviews_unique_reviewer_seller
  UNIQUE (reviewer_id, seller_id);

-- 3. Change reviewer_id FK: drop old CASCADE, add SET NULL for RGPD anonymisation
-- (Drizzle FK constraints use generated names — drop by finding the FK)
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'seller_reviews'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'reviewer_id'
  LIMIT 1;
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE seller_reviews DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE seller_reviews
  ADD CONSTRAINT seller_reviews_reviewer_id_fk
  FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 4. Ensure rating is between 1 and 5 (idempotent)
ALTER TABLE seller_reviews DROP CONSTRAINT IF EXISTS seller_reviews_rating_check;
ALTER TABLE seller_reviews ADD CONSTRAINT seller_reviews_rating_check CHECK (rating BETWEEN 1 AND 5);
