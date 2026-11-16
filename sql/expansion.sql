-- Apply separately to Cloudflare D1 hov-store BEFORE deploying src/commerce-expansion.js.
-- Additive only; preserves all existing users, orders and memberships.
CREATE TABLE IF NOT EXISTS hov_franchise_enquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  area_sqft INTEGER NOT NULL CHECK(area_sqft>=800),
  location_type TEXT NOT NULL,
  experience TEXT NOT NULL,
  investment TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  consent INTEGER NOT NULL CHECK(consent=1),
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','qualified','declined')),
  emailed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS hov_franchise_created ON hov_franchise_enquiries(created_at DESC);
CREATE TABLE IF NOT EXISTS hov_membership_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES hov_users(id),
  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  amount_paise INTEGER NOT NULL CHECK(amount_paise IN (99900,999900)),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
  status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created','paid','failed','refunded')),
  created_at_unix INTEGER NOT NULL,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS hov_member_pay_user ON hov_membership_payments(user_id,created_at_unix DESC);
CREATE TABLE IF NOT EXISTS hov_payment_events (
  event_id TEXT PRIMARY KEY,
  razorpay_order_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
