import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  priceCents: integer("price_cents").notNull(),
  quantity: integer("quantity").notNull().default(1),
  description: text("description").notNull(),
  fulfillment: text("fulfillment").notNull(),
  imageKey: text("image_key").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  stripeSessionId: text("stripe_session_id").unique(),
  status: text("status").notNull().default("pending"),
  itemsJson: text("items_json").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull(),
  createdAt: integer("created_at").notNull(),
  paidAt: integer("paid_at"),
});
