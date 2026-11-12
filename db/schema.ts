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
