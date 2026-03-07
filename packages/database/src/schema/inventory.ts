import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { locations } from "./locations";
import { productVariants } from "./product-variants";
import { tenants } from "./tenants";

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    reservedQty: integer("reserved_qty").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("inventory_tenant_variant_location_unique").on(
      t.tenantId,
      t.variantId,
      t.locationId,
    ),
    index("idx_inventory_tenant").on(t.tenantId),
    index("idx_inventory_variant").on(t.variantId),
    index("idx_inventory_location").on(t.locationId),
    check("inventory_quantity_check", sql`${t.quantity} >= 0`),
    check("inventory_reserved_qty_check", sql`${t.reservedQty} >= 0`),
  ],
);

export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
