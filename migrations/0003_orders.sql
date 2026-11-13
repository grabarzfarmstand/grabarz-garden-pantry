CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address_json TEXT,
  items_json TEXT NOT NULL,
  total_paid_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  paid_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_paid_at_idx ON orders(paid_at DESC);
