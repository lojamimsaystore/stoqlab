import { pgEnum } from "drizzle-orm/pg-core";

export const planTypeEnum = pgEnum("plan_type", [
  "trial",
  "starter",
  "pro",
  "enterprise",
]);

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "manager",
  "seller",
  "stock_operator",
]);

export const locationTypeEnum = pgEnum("location_type", ["store", "warehouse"]);

export const productStatusEnum = pgEnum("product_status", [
  "active",
  "archived",
  "draft",
]);

export const movementTypeEnum = pgEnum("movement_type", [
  "purchase",
  "sale",
  "transfer",
  "adjustment",
  "return",
  "loss",
]);

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "draft",
  "confirmed",
  "received",
  "cancelled",
]);

export const saleStatusEnum = pgEnum("sale_status", [
  "pending",
  "completed",
  "cancelled",
  "refunded",
]);

export const saleChannelEnum = pgEnum("sale_channel", [
  "store",
  "ecommerce",
  "marketplace",
  "whatsapp",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "credit",
  "debit",
  "pix",
  "installment",
]);

export const transferStatusEnum = pgEnum("transfer_status", [
  "pending",
  "in_transit",
  "received",
  "cancelled",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "low_stock",
  "purchase_received",
  "goal_reached",
  "transfer_arrived",
]);
