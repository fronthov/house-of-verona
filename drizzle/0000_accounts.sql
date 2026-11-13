CREATE TABLE customers (user_id TEXT PRIMARY KEY NOT NULL, display_name TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE memberships (user_id TEXT PRIMARY KEY NOT NULL REFERENCES customers(user_id), status TEXT NOT NULL DEFAULT 'inactive', activated_at TEXT);
--> statement-breakpoint
CREATE TABLE orders (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES customers(user_id), status TEXT NOT NULL DEFAULT 'pending', total_paise INTEGER NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX orders_user_created ON orders(user_id, created_at);
