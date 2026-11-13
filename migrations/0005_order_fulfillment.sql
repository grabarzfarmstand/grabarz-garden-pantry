ALTER TABLE orders
  ADD COLUMN fulfillment_option TEXT NOT NULL DEFAULT 'Legacy fulfillment';

ALTER TABLE orders
  ADD COLUMN shipping_cents INTEGER NOT NULL DEFAULT 0;
