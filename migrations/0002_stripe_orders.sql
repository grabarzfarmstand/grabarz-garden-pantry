CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY NOT NULL,
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  items_json TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);

-- The webhook can mark an order paid only once. The trigger checks every line
-- before decrementing stock, and the status change plus stock updates are atomic.
CREATE TRIGGER IF NOT EXISTS orders_decrement_stock_after_payment
BEFORE UPDATE OF status ON orders
WHEN OLD.status = 'pending' AND NEW.status = 'paid'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM json_each(NEW.items_json) AS item
    LEFT JOIN products ON products.id = json_extract(item.value, '$.id')
    WHERE products.id IS NULL
       OR products.quantity < CAST(json_extract(item.value, '$.quantity') AS INTEGER)
  ) THEN RAISE(ABORT, 'insufficient stock') END;

  UPDATE products
  SET quantity = quantity - (
    SELECT CAST(json_extract(item.value, '$.quantity') AS INTEGER)
    FROM json_each(NEW.items_json) AS item
    WHERE json_extract(item.value, '$.id') = products.id
  ),
  updated_at = NEW.paid_at
  WHERE id IN (
    SELECT json_extract(item.value, '$.id')
    FROM json_each(NEW.items_json) AS item
  );
END;
