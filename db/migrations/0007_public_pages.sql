-- Add slug to seller_profiles for public URL routing
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Backfill existing rows with a slug derived from business_name
UPDATE seller_profiles
SET slug = regexp_replace(
  regexp_replace(lower(business_name), '[^a-z0-9]+', '-', 'g'),
  '^-+|-+$', '', 'g'
)
WHERE slug IS NULL;

-- listing_views: debounced view counter (1 view / hashed-IP / 24h per listing)
CREATE TABLE IF NOT EXISTS listing_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  ip_hash    TEXT NOT NULL,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listing_views_listing_id_idx ON listing_views(listing_id);
CREATE INDEX IF NOT EXISTS listing_views_ip_listing_idx  ON listing_views(listing_id, ip_hash);
CREATE INDEX IF NOT EXISTS listing_views_viewed_at_idx   ON listing_views(viewed_at);
