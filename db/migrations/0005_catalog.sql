-- Migration 0005 : Phase 2 — Catalogue (catégories, profils vendeurs, listings, avis)
-- ===================================================================================

-- PostGIS — activé par défaut sur Supabase, cette ligne est idempotente
CREATE EXTENSION IF NOT EXISTS postgis;

-- -----------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE stock_status AS ENUM ('in_stock', 'low', 'out', 'n/a');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('draft', 'active', 'paused', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('pending', 'published', 'hidden');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------
-- Table : categories (taxonomie hiérarchique)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON categories(parent_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select_authenticated"
  ON categories FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "categories_all_service_role"
  ON categories FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------
-- Table : seller_profiles
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seller_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name    TEXT NOT NULL,
  description      TEXT,
  category_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
  service_area_km  INTEGER,
  service_location geography(POINT, 4326),
  service_cities   TEXT[] NOT NULL DEFAULT '{}',
  opening_hours    JSONB,
  contact_phone    TEXT,
  contact_email    TEXT,
  contact_whatsapp TEXT,
  social_links     JSONB NOT NULL DEFAULT '{}',
  logo_url         TEXT,
  cover_url        TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index for geo queries
CREATE INDEX IF NOT EXISTS seller_profiles_location_gist_idx
  ON seller_profiles USING GIST(service_location);
CREATE INDEX IF NOT EXISTS seller_profiles_category_id_idx ON seller_profiles(category_id);
CREATE INDEX IF NOT EXISTS seller_profiles_is_active_idx   ON seller_profiles(is_active);

-- updated_at trigger
CREATE OR REPLACE FUNCTION seller_profiles_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER seller_profiles_updated_at
  BEFORE UPDATE ON seller_profiles
  FOR EACH ROW EXECUTE FUNCTION seller_profiles_set_updated_at();

ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see active seller profiles (public directory)
CREATE POLICY "seller_profiles_select_authenticated"
  ON seller_profiles FOR SELECT TO authenticated
  USING (is_active = true);

-- Only verified members can create a seller profile
CREATE POLICY "seller_profiles_insert_verified"
  ON seller_profiles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.membership_status = 'verified'
        AND (p.expires_at IS NULL OR p.expires_at > now())
    )
  );

CREATE POLICY "seller_profiles_update_owner"
  ON seller_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "seller_profiles_delete_owner"
  ON seller_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "seller_profiles_all_service_role"
  ON seller_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------
-- Table : listings
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id     UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL,
  description   TEXT NOT NULL,
  price_cents   INTEGER,
  currency      TEXT NOT NULL DEFAULT 'EUR',
  is_quote_only BOOLEAN NOT NULL DEFAULT false,
  stock_status  stock_status NOT NULL DEFAULT 'in_stock',
  images        TEXT[] NOT NULL DEFAULT '{}',
  tags          TEXT[] NOT NULL DEFAULT '{}',
  status        listing_status NOT NULL DEFAULT 'draft',
  search_vector tsvector,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at  TIMESTAMPTZ,
  CONSTRAINT listings_seller_slug_unique UNIQUE (seller_id, slug),
  CONSTRAINT price_or_quote CHECK (
    (is_quote_only = true AND price_cents IS NULL)
    OR (is_quote_only = false AND price_cents IS NOT NULL AND price_cents >= 0)
    OR (is_quote_only = false AND price_cents IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS listings_status_idx       ON listings(status);
CREATE INDEX IF NOT EXISTS listings_seller_id_idx    ON listings(seller_id);
CREATE INDEX IF NOT EXISTS listings_published_at_idx ON listings(published_at DESC);
-- Full-text search index
CREATE INDEX IF NOT EXISTS listings_search_vector_gin_idx
  ON listings USING GIN(search_vector);

-- updated_at trigger
CREATE OR REPLACE FUNCTION listings_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION listings_set_updated_at();

-- Full-text search vector trigger
-- Weight: title=A, tags=B, description=C, business_name=D
CREATE OR REPLACE FUNCTION update_listing_search_vector()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_business_name TEXT;
BEGIN
  SELECT sp.business_name INTO v_business_name
  FROM seller_profiles sp WHERE sp.id = NEW.seller_id;

  NEW.search_vector :=
    setweight(to_tsvector('french', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('french', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('french', coalesce(v_business_name, '')), 'D');

  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_search_vector_update
  BEFORE INSERT OR UPDATE OF title, description, tags, seller_id ON listings
  FOR EACH ROW EXECUTE FUNCTION update_listing_search_vector();

-- Auto-set published_at when status changes to 'active'
CREATE OR REPLACE FUNCTION listings_set_published_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status <> 'active' THEN
    NEW.published_at = coalesce(NEW.published_at, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_published_at_trigger
  BEFORE UPDATE OF status ON listings
  FOR EACH ROW EXECUTE FUNCTION listings_set_published_at();

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Public visibility: active listing, active seller, seller's membership valid
CREATE POLICY "listings_select_active"
  ON listings FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM seller_profiles sp
      JOIN public.profiles p ON p.id = sp.user_id
      WHERE sp.id = listings.seller_id
        AND sp.is_active = true
        AND p.membership_status = 'verified'
        AND (p.expires_at IS NULL OR p.expires_at > now())
    )
  );

-- Sellers can always see their own listings (all statuses)
CREATE POLICY "listings_select_own"
  ON listings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_profiles sp
      WHERE sp.id = listings.seller_id AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "listings_insert_seller"
  ON listings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seller_profiles sp
      WHERE sp.id = listings.seller_id AND sp.user_id = auth.uid() AND sp.is_active = true
    )
  );

CREATE POLICY "listings_update_seller"
  ON listings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_profiles sp
      WHERE sp.id = listings.seller_id AND sp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seller_profiles sp
      WHERE sp.id = listings.seller_id AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "listings_delete_seller"
  ON listings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_profiles sp
      WHERE sp.id = listings.seller_id AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "listings_all_service_role"
  ON listings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------
-- Table : listing_images (max 8 per listing — enforced in application)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt_text   TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS listing_images_listing_id_idx     ON listing_images(listing_id);
CREATE INDEX IF NOT EXISTS listing_images_sort_order_idx     ON listing_images(listing_id, sort_order);

ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_images_select_authenticated"
  ON listing_images FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings l WHERE l.id = listing_images.listing_id
    )
  );

CREATE POLICY "listing_images_all_service_role"
  ON listing_images FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------
-- Table : seller_reviews
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seller_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id  UUID REFERENCES listings(id) ON DELETE SET NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  response    TEXT,
  status      review_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reviews_unique_reviewer_seller_listing
    UNIQUE (reviewer_id, seller_id, listing_id)
);

CREATE INDEX IF NOT EXISTS seller_reviews_seller_id_idx   ON seller_reviews(seller_id);
CREATE INDEX IF NOT EXISTS seller_reviews_reviewer_id_idx ON seller_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS seller_reviews_status_idx      ON seller_reviews(seller_id, status);

ALTER TABLE seller_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seller_reviews_select_published"
  ON seller_reviews FOR SELECT TO authenticated
  USING (status = 'published');

-- Own reviews visible regardless of status
CREATE POLICY "seller_reviews_select_own"
  ON seller_reviews FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid());

-- Sellers can see reviews on their profile
CREATE POLICY "seller_reviews_select_seller"
  ON seller_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_profiles sp
      WHERE sp.id = seller_reviews.seller_id AND sp.user_id = auth.uid()
    )
  );

-- Verified members can leave a review (but not on their own seller profile)
CREATE POLICY "seller_reviews_insert_verified"
  ON seller_reviews FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.membership_status = 'verified'
    )
    AND NOT EXISTS (
      SELECT 1 FROM seller_profiles sp
      WHERE sp.id = seller_reviews.seller_id AND sp.user_id = auth.uid()
    )
  );

-- Sellers can update only their response field
CREATE POLICY "seller_reviews_update_response"
  ON seller_reviews FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seller_profiles sp
      WHERE sp.id = seller_reviews.seller_id AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "seller_reviews_all_service_role"
  ON seller_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------
-- PostgreSQL functions
-- -----------------------------------------------------------------------

-- seller_average_rating : moyenne des avis publiés, arrondie à 1 décimale
CREATE OR REPLACE FUNCTION seller_average_rating(p_seller_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ROUND(AVG(rating)::numeric, 1)
  FROM seller_reviews
  WHERE seller_id = p_seller_id AND status = 'published'
$$;

-- listing_search : recherche full-text avec filtres catégorie et localisation
-- Inclut les sous-catégories via CTE récursif
CREATE OR REPLACE FUNCTION listing_search(
  p_query      text    DEFAULT NULL,
  p_category   uuid    DEFAULT NULL,
  p_city       text    DEFAULT NULL,
  p_limit      integer DEFAULT 20,
  p_offset     integer DEFAULT 0
)
RETURNS TABLE (
  id           uuid,
  seller_id    uuid,
  title        text,
  slug         text,
  description  text,
  price_cents  integer,
  currency     text,
  is_quote_only boolean,
  stock_status stock_status,
  images       text[],
  tags         text[],
  status       listing_status,
  published_at timestamptz,
  rank         real
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE category_tree AS (
    SELECT id FROM categories WHERE id = p_category AND is_active = true
    UNION ALL
    SELECT c.id FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.is_active = true
  )
  SELECT
    l.id, l.seller_id, l.title, l.slug, l.description,
    l.price_cents, l.currency, l.is_quote_only, l.stock_status,
    l.images, l.tags, l.status, l.published_at,
    CASE
      WHEN p_query IS NOT NULL
      THEN ts_rank(l.search_vector, websearch_to_tsquery('french', p_query))
      ELSE 0::real
    END AS rank
  FROM listings l
  JOIN seller_profiles sp ON sp.id = l.seller_id
  JOIN profiles p ON p.id = sp.user_id
  WHERE
    l.status = 'active'
    AND sp.is_active = true
    AND p.membership_status = 'verified'
    AND (p.expires_at IS NULL OR p.expires_at > now())
    AND (p_query IS NULL OR l.search_vector @@ websearch_to_tsquery('french', p_query))
    AND (p_category IS NULL OR sp.category_id IN (SELECT id FROM category_tree))
    AND (p_city IS NULL OR p_city = ANY(sp.service_cities))
  ORDER BY rank DESC, l.published_at DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset
$$;

-- -----------------------------------------------------------------------
-- Seed : taxonomie des catégories
-- -----------------------------------------------------------------------
INSERT INTO categories (id, parent_id, name, slug, icon, sort_order) VALUES
  -- Catégories racines
  ('11111111-0001-0000-0000-000000000000', NULL, 'Alimentation', 'alimentation', '🍽️', 1),
  ('11111111-0002-0000-0000-000000000000', NULL, 'Mode & Textile', 'mode-textile', '👗', 2),
  ('11111111-0003-0000-0000-000000000000', NULL, 'Services à la personne', 'services-personne', '🤝', 3),
  ('11111111-0004-0000-0000-000000000000', NULL, 'BTP & Artisanat', 'btp-artisanat', '🔨', 4),
  ('11111111-0005-0000-0000-000000000000', NULL, 'Santé & Bien-être', 'sante-bien-etre', '💚', 5),
  ('11111111-0006-0000-0000-000000000000', NULL, 'Éducation & Formation', 'education-formation', '📚', 6),
  ('11111111-0007-0000-0000-000000000000', NULL, 'Événementiel', 'evenementiel', '🎉', 7),
  ('11111111-0008-0000-0000-000000000000', NULL, 'Transport & Logistique', 'transport-logistique', '🚚', 8),
  ('11111111-0009-0000-0000-000000000000', NULL, 'Professions libérales', 'professions-liberales', '💼', 9),
  ('11111111-0010-0000-0000-000000000000', NULL, 'Immobilier', 'immobilier', '🏠', 10),
  ('11111111-0011-0000-0000-000000000000', NULL, 'Tech & Digital', 'tech-digital', '💻', 11),
  ('11111111-0012-0000-0000-000000000000', NULL, 'Agriculture', 'agriculture', '🌱', 12),
  -- Sous-catégories Alimentation
  ('22222222-0001-0001-0000-000000000000', '11111111-0001-0000-0000-000000000000', 'Restauration & Traiteur', 'restauration-traiteur', '🍲', 1),
  ('22222222-0001-0002-0000-000000000000', '11111111-0001-0000-0000-000000000000', 'Épicerie & Produits exotiques', 'epicerie-exotique', '🛒', 2),
  ('22222222-0001-0003-0000-000000000000', '11111111-0001-0000-0000-000000000000', 'Pâtisserie & Boulangerie', 'patisserie-boulangerie', '🍰', 3),
  ('22222222-0001-0004-0000-000000000000', '11111111-0001-0000-0000-000000000000', 'Boissons & Jus naturels', 'boissons-jus', '🥤', 4),
  -- Sous-catégories Mode & Textile
  ('22222222-0002-0001-0000-000000000000', '11111111-0002-0000-0000-000000000000', 'Vêtements femme', 'vetements-femme', '👘', 1),
  ('22222222-0002-0002-0000-000000000000', '11111111-0002-0000-0000-000000000000', 'Vêtements homme', 'vetements-homme', '👔', 2),
  ('22222222-0002-0003-0000-000000000000', '11111111-0002-0000-0000-000000000000', 'Enfants', 'vetements-enfants', '👶', 3),
  ('22222222-0002-0004-0000-000000000000', '11111111-0002-0000-0000-000000000000', 'Couture & Retouches', 'couture-retouches', '🧵', 4),
  -- Sous-catégories Services à la personne
  ('22222222-0003-0001-0000-000000000000', '11111111-0003-0000-0000-000000000000', 'Coiffure', 'coiffure', '✂️', 1),
  ('22222222-0003-0002-0000-000000000000', '11111111-0003-0000-0000-000000000000', 'Esthétique & Beauté', 'esthetique-beaute', '💅', 2),
  ('22222222-0003-0003-0000-000000000000', '11111111-0003-0000-0000-000000000000', 'Garde d''enfants', 'garde-enfants', '🧒', 3),
  ('22222222-0003-0004-0000-000000000000', '11111111-0003-0000-0000-000000000000', 'Aide ménagère', 'aide-menagere', '🧹', 4),
  -- Sous-catégories BTP
  ('22222222-0004-0001-0000-000000000000', '11111111-0004-0000-0000-000000000000', 'Maçonnerie & Gros œuvre', 'maconnerie', '🧱', 1),
  ('22222222-0004-0002-0000-000000000000', '11111111-0004-0000-0000-000000000000', 'Plomberie', 'plomberie', '🚿', 2),
  ('22222222-0004-0003-0000-000000000000', '11111111-0004-0000-0000-000000000000', 'Électricité', 'electricite', '⚡', 3),
  ('22222222-0004-0004-0000-000000000000', '11111111-0004-0000-0000-000000000000', 'Peinture & Décoration', 'peinture-decoration', '🎨', 4),
  -- Sous-catégories Santé
  ('22222222-0005-0001-0000-000000000000', '11111111-0005-0000-0000-000000000000', 'Naturopathie & Médecines douces', 'naturopathie', '🌿', 1),
  ('22222222-0005-0002-0000-000000000000', '11111111-0005-0000-0000-000000000000', 'Sport & Coach personnel', 'sport-coach', '💪', 2),
  ('22222222-0005-0003-0000-000000000000', '11111111-0005-0000-0000-000000000000', 'Massage & Bien-être', 'massage-bien-etre', '🧘', 3),
  -- Sous-catégories Éducation
  ('22222222-0006-0001-0000-000000000000', '11111111-0006-0000-0000-000000000000', 'Soutien scolaire', 'soutien-scolaire', '📖', 1),
  ('22222222-0006-0002-0000-000000000000', '11111111-0006-0000-0000-000000000000', 'Langues étrangères', 'langues', '🌍', 2),
  ('22222222-0006-0003-0000-000000000000', '11111111-0006-0000-0000-000000000000', 'Musique & Arts', 'musique-arts', '🎵', 3),
  ('22222222-0006-0004-0000-000000000000', '11111111-0006-0000-0000-000000000000', 'Informatique & Bureautique', 'informatique-bureautique', '🖥️', 4),
  -- Sous-catégories Tech
  ('22222222-0011-0001-0000-000000000000', '11111111-0011-0000-0000-000000000000', 'Développement web & mobile', 'dev-web-mobile', '📱', 1),
  ('22222222-0011-0002-0000-000000000000', '11111111-0011-0000-0000-000000000000', 'Design & Graphisme', 'design-graphisme', '🎨', 2),
  ('22222222-0011-0003-0000-000000000000', '11111111-0011-0000-0000-000000000000', 'Réseaux sociaux & Marketing digital', 'marketing-digital', '📣', 3),
  -- Sous-catégories Agriculture
  ('22222222-0012-0001-0000-000000000000', '11111111-0012-0000-0000-000000000000', 'Maraîchage & Légumes', 'maraichage', '🥬', 1),
  ('22222222-0012-0002-0000-000000000000', '11111111-0012-0000-0000-000000000000', 'Agriculture biologique', 'agriculture-bio', '🌾', 2)
ON CONFLICT (slug) DO NOTHING;
