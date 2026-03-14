import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { paymentMethodEnum, purchaseStatusEnum } from "./enums";
import { locations } from "./locations";
import { productVariants } from "./product-variants";
import { suppliers } from "./suppliers";
import { tenants } from "./tenants";
import { users } from "./users";

export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    status: purchaseStatusEnum("status").notNull().default("draft"),
    invoiceNumber: varchar("invoice_number", { length: 60 }),
    invoiceUrl: text("invoice_url"),
    productsCost: numeric("products_cost", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    freightCost: numeric("freight_cost", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    otherCosts: numeric("other_costs", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    totalCost: numeric("total_cost", { precision: 12, scale: 2 }).generatedAlwaysAs(
      sql`products_cost + freight_cost + other_costs`,
    ),
    totalItems: integer("total_items").notNull().default(0),
    avgUnitCost: numeric("avg_unit_cost", {
      precision: 12,
      scale: 4,
    }).generatedAlwaysAs(
      sql`CASE WHEN total_items > 0 THEN (products_cost + freight_cost + other_costs) / total_items ELSE 0 END`,
    ),
    paymentMethod: paymentMethodEnum("payment_method"),
    notes: text("notes"),
    purchasedAt: timestamp("purchased_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_purchases_tenant").on(t.tenantId),
    index("idx_purchases_supplier").on(t.supplierId),
    index("idx_purchases_status").on(t.tenantId, t.status),
    check("purchases_products_cost_check", sql`${t.productsCost} >= 0`),
    check("purchases_freight_cost_check", sql`${t.freightCost} >= 0`),
    check("purchases_other_costs_check", sql`${t.otherCosts} >= 0`),
    check("purchases_total_items_check", sql`${t.totalItems} >= 0`),
  ],
);

export const purchaseItems = pgTable(
  "purchase_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    unitCost: numeric("unit_cost", { precision: 10, scale: 4 }).notNull(),
    realUnitCost: numeric("real_unit_cost", { precision: 10, scale: 4 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_purchase_items_purchase").on(t.purchaseId),
    index("idx_purchase_items_variant").on(t.variantId),
    check("purchase_items_quantity_check", sql`${t.quantity} > 0`),
    check("purchase_items_unit_cost_check", sql`${t.unitCost} >= 0`),
  ],
);

export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type NewPurchaseItem = typeof purchaseItems.$inferInsert;
