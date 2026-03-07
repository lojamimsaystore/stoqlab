import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { transferStatusEnum } from "./enums";
import { locations } from "./locations";
import { tenants } from "./tenants";
import { users } from "./users";

export const stockTransfers = pgTable(
  "stock_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    fromLocationId: uuid("from_location_id")
      .notNull()
      .references(() => locations.id),
    toLocationId: uuid("to_location_id")
      .notNull()
      .references(() => locations.id),
    status: transferStatusEnum("status").notNull().default("pending"),
    requestedBy: uuid("requested_by").references(() => users.id, {
      onDelete: "set null",
    }),
    confirmedBy: uuid("confirmed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_transfers_tenant").on(t.tenantId),
    check(
      "different_locations",
      sql`${t.fromLocationId} <> ${t.toLocationId}`,
    ),
  ],
);

export const transferItems = pgTable(
  "transfer_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transferId: uuid("transfer_id")
      .notNull()
      .references(() => stockTransfers.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull(),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_transfer_items_transfer").on(t.transferId),
    check("transfer_items_quantity_check", sql`${t.quantity} > 0`),
  ],
);

export type StockTransfer = typeof stockTransfers.$inferSelect;
export type NewStockTransfer = typeof stockTransfers.$inferInsert;
export type TransferItem = typeof transferItems.$inferSelect;
export type NewTransferItem = typeof transferItems.$inferInsert;
