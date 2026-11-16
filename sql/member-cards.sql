-- House of Verona: one-year membership cards. Safe to execute repeatedly.
-- Existing orders, members and payment transactions are not removed.
CREATE TABLE IF NOT EXISTS hov_member_card_requests (
  razorpay_order_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES hov_users(id),
  member_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS hov_member_cards (
  card_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES hov_users(id),
  member_name TEXT NOT NULL,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT NOT NULL UNIQUE,
  purchased_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  email_sent_at INTEGER,
  email_claimed_at INTEGER,
  revoked_at INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(expires_at>purchased_at)
);
CREATE INDEX IF NOT EXISTS hov_card_expires_at ON hov_member_cards(expires_at);
