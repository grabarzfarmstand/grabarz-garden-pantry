DROP INDEX IF EXISTS orders_paid_at_idx;

ALTER TABLE orders RENAME TO orders_legacy;

CREATE TABLE orders (
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

INSERT INTO orders (
  id, stripe_session_id, customer_name, customer_email, customer_phone,
  shipping_address_json, items_json, total_paid_cents, currency, created_at, paid_at
)
SELECT
  id, stripe_session_id, NULL, NULL, NULL, NULL, items_json, 0, 'usd', created_at, paid_at
FROM orders_legacy
WHERE stripe_session_id IS NOT NULL AND paid_at IS NOT NULL;

CREATE INDEX orders_paid_at_idx ON orders(paid_at DESC);
