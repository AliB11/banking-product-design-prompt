import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { OrgSettings, ProductReport, ProductSpec } from "@/lib/types";

export interface DesignChatRow {
  id: string;
  role: "user" | "bot";
  text: string;
  createdAt: string;
}

export const designs = pgTable("designs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  contractCode: text("contract_code").notNull(),
  segment: text("segment").notNull(),
  needCode: text("need_code").notNull(),
  currency: text("currency").notNull().default("IRT"),
  baseAmount: doublePrecision("base_amount").notNull().default(0),
  tenorMonths: integer("tenor_months").notNull().default(12),
  nominalRate: doublePrecision("nominal_rate").notNull().default(0),
  effectiveRate: doublePrecision("effective_rate").notNull().default(0),
  installment: doublePrecision("installment").notNull().default(0),
  netMargin: doublePrecision("net_margin").notNull().default(0),
  netMarginPct: doublePrecision("net_margin_pct").notNull().default(0),
  healthScore: doublePrecision("health_score").notNull().default(0),
  attractivenessScore: doublePrecision("attractiveness_score").notNull().default(0),
  liquidityFloor: doublePrecision("liquidity_floor").notNull().default(0),
  status: text("status").notNull().default("draft"),
  spec: jsonb("spec").$type<ProductSpec>().notNull(),
  report: jsonb("report").$type<ProductReport>().notNull(),
  conversation: jsonb("conversation").$type<DesignChatRow[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orgSettings = pgTable("org_settings", {
  id: serial("id").primaryKey(),
  data: jsonb("data").$type<OrgSettings>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DesignRow = typeof designs.$inferSelect;
export type DesignInsert = typeof designs.$inferInsert;
