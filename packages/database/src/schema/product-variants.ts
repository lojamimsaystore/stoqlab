import {
  char,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { products } from "./products";
import { tenants } from "./tenants";

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: varchar("size", { length: 20 }).notNull(),
    color: varchar("color", { length: 60 }).notNull(),
    colorHex: char("color_hex", { length: 7 }),
    sku: varchar("sku", { length: 80 }).notNull(),
    barcode: varchar("barcode", { length: 80 }),
    salePrice: numeric("sale_price", { precision: 10, scale: 2 }),
    minStock: integer("min_stock").notNull().default(0),
    images: text("images").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    unique("product_variants_tenant_sku_unique").on(t.tenantId, t.sku),
    unique("product_variants_tenant_barcode_unique").on(t.tenantId, t.barcode),
    index("idx_variants_product").on(t.productId),
    index("idx_variants_tenant").on(t.tenantId),
  ],
);

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
