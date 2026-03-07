import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { saleChannelEnum, saleStatusEnum, paymentMethodEnum } from "./enums";
import { customers } from "./customers";
import { locations } from "./locations";
import { tenants } from "./tenants";
import { users } from "./users";

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    soldBy: uuid("sold_by").references(() => users.id, {
      onDelete: "set null",
    }),
    status: saleStatusEnum("status").notNull().default("completed"),
    channel: saleChannelEnum("channel").notNull().default("store"),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    totalValue: numeric("total_value", { precision: 12, scale: 2 }).notNull(),
    totalCost: numeric("total_cost", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    discountValue: numeric("discount_value", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    grossMargin: numeric("gross_margin", {
      precision: 5,
      scale: 2,
    }).generatedAlwaysAs(
      sql`CASE WHEN total_value > 0 THEN ROUND(((total_value - total_cost) / total_value) * 100, 2) ELSE 0 END`,
    ),
    notes: text("notes"),
    soldAt: timestamp("sold_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_sales_tenant").on(t.tenantId),
    index("idx_sales_location").on(t.locationId),
    index("idx_sales_date").on(t.tenantId, t.soldAt),
    index("idx_sales_channel").on(t.tenantId, t.channel),
    check("sales_total_value_check", sql`${t.totalValue} >= 0`),
  ],
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull(),
    quantity: integer("quantity").notNull(),
    unitCost: numeric("unit_cost", { precision: 10, scale: 4 })
      .notNull()
      .default("0"),
    salePrice: numeric("sale_price", { precision: 10, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    finalPrice: numeric("final_price", {
      precision: 10,
      scale: 2,
    }).generatedAlwaysAs(sql`sale_price - discount`),
    returnedQty: integer("returned_qty").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_sale_items_sale").on(t.saleId),
    index("idx_sale_items_variant").on(t.variantId),
    check("sale_items_quantity_check", sql`${t.quantity} > 0`),
    check("sale_items_sale_price_check", sql`${t.salePrice} >= 0`),
  ],
);

export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;
