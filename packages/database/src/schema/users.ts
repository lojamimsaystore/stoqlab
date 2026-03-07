import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { userRoleEnum } from "./enums";
import { locations } from "./locations";
import { tenants } from "./tenants";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 150 }).notNull(),
    role: userRoleEnum("role").notNull().default("seller"),
    avatarUrl: text("avatar_url"),
    lastLocationId: uuid("last_location_id").references(() => locations.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_users_tenant").on(t.tenantId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
