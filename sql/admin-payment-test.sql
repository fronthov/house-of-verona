-- Admin-only one-rupee real capture test. Independent from customer memberships.
-- A ₹1 verification card NEVER grants paid Veronates member discounts.
CREATE TABLE IF NOT EXISTS hov_admin_payment_tests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES hov_users(id),
  member_name TEXT NOT NULL,
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  amount_paise INTEGER NOT NULL CHECK(amount_paise=100),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
  status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created','paid','refunded')),
  created_at_unix INTEGER NOT NULL,
  card_id TEXT UNIQUE,
  purchased_at INTEGER,
  expires_at INTEGER,
  email_sent_at INTEGER,
  revoked_at INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS hov_admin_test_user ON hov_admin_payment_tests(user_id,created_at_unix DESC);
