-- Add category_id to listings (optional per-listing category override)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS listings_category_id_idx ON listings(category_id);
