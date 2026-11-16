-- Isolated production tables. Does not alter earlier experimental tables.
CREATE TABLE IF NOT EXISTS hov_users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS hov_logins (email TEXT PRIMARY KEY,hash TEXT NOT NULL,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,requested_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS hov_sessions (hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES hov_users(id),expires_at INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS hov_sessions_user ON hov_sessions(user_id);
CREATE TABLE IF NOT EXISTS hov_memberships (user_id TEXT PRIMARY KEY REFERENCES hov_users(id),status TEXT NOT NULL CHECK(status IN ('active','inactive')),updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS hov_products (id TEXT PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL CHECK(category IN ('coffee','tea','book')),origin TEXT NOT NULL,description TEXT NOT NULL,price_json TEXT NOT NULL,image_key TEXT,enabled INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS hov_gallery (id TEXT PRIMARY KEY,image_key TEXT NOT NULL,caption TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS hov_orders (id TEXT PRIMARY KEY,user_id TEXT REFERENCES hov_users(id),email TEXT NOT NULL,customer_name TEXT NOT NULL,phone TEXT NOT NULL,address TEXT NOT NULL,pincode TEXT NOT NULL,lines_json TEXT NOT NULL,subtotal INTEGER NOT NULL,discount INTEGER NOT NULL,shipping INTEGER NOT NULL,total INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('awaiting_whatsapp','pending_review','approved','payment_pending','paid','packed','shipped','delivered','cancelled')),payment_reference TEXT,payment_link TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS hov_orders_user ON hov_orders(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS hov_orders_status ON hov_orders(status,created_at DESC);
CREATE TABLE IF NOT EXISTS hov_events (id TEXT PRIMARY KEY,order_id TEXT NOT NULL,actor TEXT NOT NULL,status TEXT NOT NULL,notes TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS hov_rate_limits (key TEXT PRIMARY KEY,n INTEGER NOT NULL,expires_at INTEGER NOT NULL);
