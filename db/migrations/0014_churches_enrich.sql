-- Add district and country columns to churches for multi-country support
ALTER TABLE churches ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'CI';

CREATE INDEX IF NOT EXISTS churches_country_idx ON churches(country);
