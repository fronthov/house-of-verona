CREATE TABLE stock (sku TEXT PRIMARY KEY NOT NULL, available INTEGER NOT NULL DEFAULT 0 CHECK(available >= 0), revision INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE purchases (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES customers(user_id), request_key TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'creating', amount INTEGER NOT NULL CHECK(amount>0), currency TEXT NOT NULL DEFAULT 'INR', provider_order TEXT UNIQUE, payment_id TEXT UNIQUE, email TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(user_id,request_key));
--> statement-breakpoint
CREATE TABLE purchase_lines (purchase_id TEXT NOT NULL REFERENCES purchases(id), sku TEXT NOT NULL REFERENCES stock(sku), qty INTEGER NOT NULL CHECK(qty>0), unit_paise INTEGER NOT NULL, PRIMARY KEY(purchase_id,sku));
--> statement-breakpoint
CREATE TRIGGER reserve_stock BEFORE INSERT ON purchase_lines BEGIN UPDATE stock SET available=available-NEW.qty,revision=revision+1 WHERE sku=NEW.sku AND available>=NEW.qty; SELECT CASE WHEN changes()=0 THEN RAISE(ABORT,'INSUFFICIENT_STOCK') END; END;
--> statement-breakpoint
CREATE TABLE test_memberships (user_id TEXT PRIMARY KEY NOT NULL REFERENCES customers(user_id), purchase_id TEXT NOT NULL UNIQUE REFERENCES purchases(id), activated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE confirmations (purchase_id TEXT PRIMARY KEY NOT NULL REFERENCES purchases(id), status TEXT NOT NULL DEFAULT 'pending', provider_id TEXT, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX purchases_user_created ON purchases(user_id,created_at);
--> statement-breakpoint
CREATE TABLE stock_audit (id TEXT PRIMARY KEY NOT NULL, actor TEXT NOT NULL, sku TEXT NOT NULL, quantity INTEGER NOT NULL, created_at TEXT NOT NULL);
