-- Session 22: Real-time messaging

-- 1. conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_profile_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_buyer_seller_unique UNIQUE (buyer_id, seller_profile_id)
);

CREATE INDEX IF NOT EXISTS conversations_buyer_id_idx ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS conversations_seller_profile_id_idx ON conversations(seller_profile_id);
CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx ON conversations(last_message_at);

-- 2. messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);

-- 3. Trigger: keep conversations.last_message_at in sync
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_conversation_last_message ON messages;
CREATE TRIGGER trg_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- 4. RLS policies (Supabase Realtime uses anon key → must respect RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Buyers and sellers can read their own conversations
CREATE POLICY conversations_select ON conversations
  FOR SELECT USING (
    auth.uid() = buyer_id
    OR auth.uid() = (SELECT user_id FROM seller_profiles WHERE id = seller_profile_id LIMIT 1)
  );

-- Only participants can insert messages into their conversation
CREATE POLICY messages_select ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (
          auth.uid() = c.buyer_id
          OR auth.uid() = (SELECT user_id FROM seller_profiles WHERE id = c.seller_profile_id LIMIT 1)
        )
    )
  );

-- 5. Enable Supabase Realtime on messages (run in Supabase dashboard if not already)
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
