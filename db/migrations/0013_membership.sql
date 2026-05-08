-- Session 26: Renouvellement d'adhésion vendeur

DO $$ BEGIN
  CREATE TYPE membership_order_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS membership_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  duration_days INTEGER NOT NULL DEFAULT 365,
  status membership_order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS membership_orders_user_id_idx ON membership_orders(user_id);
CREATE INDEX IF NOT EXISTS membership_orders_status_idx ON membership_orders(status);

ALTER TABLE membership_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_membership_orders" ON membership_orders
  FOR ALL USING (user_id = auth.uid());
