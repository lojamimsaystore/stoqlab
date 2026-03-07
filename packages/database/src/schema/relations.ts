import { relations } from "drizzle-orm";
import { auditLog } from "./audit-log";
import { categories } from "./categories";
import { customers } from "./customers";
import { inventory } from "./inventory";
import { inventoryMovements } from "./inventory-movements";
import { locations } from "./locations";
import { notifications } from "./notifications";
import { priceHistory } from "./price-history";
import { productVariants } from "./product-variants";
import { products } from "./products";
import { purchaseItems, purchases } from "./purchases";
import { saleItems, sales } from "./sales";
import { stockTransfers, transferItems } from "./transfers";
import { suppliers } from "./suppliers";
import { tenants } from "./tenants";
import { users } from "./users";

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  locations: many(locations),
  categories: many(categories),
  suppliers: many(suppliers),
  products: many(products),
  customers: many(customers),
  purchases: many(purchases),
  sales: many(sales),
  stockTransfers: many(stockTransfers),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  lastLocation: one(locations, {
    fields: [users.lastLocationId],
    references: [locations.id],
  }),
  notifications: many(notifications),
  auditLogs: many(auditLog),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [locations.tenantId],
    references: [tenants.id],
  }),
  inventory: many(inventory),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [categories.tenantId],
    references: [tenants.id],
  }),
  products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [suppliers.tenantId],
    references: [tenants.id],
  }),
  purchases: many(purchases),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    inventory: many(inventory),
    priceHistory: many(priceHistory),
  }),
);

export const inventoryRelations = relations(inventory, ({ one }) => ({
  variant: one(productVariants, {
    fields: [inventory.variantId],
    references: [productVariants.id],
  }),
  location: one(locations, {
    fields: [inventory.locationId],
    references: [locations.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
  sales: many(sales),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [purchases.tenantId],
    references: [tenants.id],
  }),
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
  location: one(locations, {
    fields: [purchases.locationId],
    references: [locations.id],
  }),
  createdByUser: one(users, {
    fields: [purchases.createdBy],
    references: [users.id],
  }),
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [sales.tenantId],
    references: [tenants.id],
  }),
  location: one(locations, {
    fields: [sales.locationId],
    references: [locations.id],
  }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  soldByUser: one(users, { fields: [sales.soldBy], references: [users.id] }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
}));

export const stockTransfersRelations = relations(
  stockTransfers,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [stockTransfers.tenantId],
      references: [tenants.id],
    }),
    fromLocation: one(locations, {
      fields: [stockTransfers.fromLocationId],
      references: [locations.id],
    }),
    toLocation: one(locations, {
      fields: [stockTransfers.toLocationId],
      references: [locations.id],
    }),
    requestedByUser: one(users, {
      fields: [stockTransfers.requestedBy],
      references: [users.id],
    }),
    confirmedByUser: one(users, {
      fields: [stockTransfers.confirmedBy],
      references: [users.id],
    }),
    items: many(transferItems),
  }),
);

export const transferItemsRelations = relations(transferItems, ({ one }) => ({
  transfer: one(stockTransfers, {
    fields: [transferItems.transferId],
    references: [stockTransfers.id],
  }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  variant: one(productVariants, {
    fields: [priceHistory.variantId],
    references: [productVariants.id],
  }),
  changedByUser: one(users, {
    fields: [priceHistory.changedBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notifications.tenantId],
    references: [tenants.id],
  }),
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLog.tenantId],
    references: [tenants.id],
  }),
  user: one(users, { fields: [auditLog.userId], references: [users.id] }),
}));
