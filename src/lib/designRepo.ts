import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { designs, type DesignChatRow, type DesignRow } from "@/db/schema";
import { buildReport } from "@/lib/report";
import type { OrgSettings, ProductReport, ProductSpec } from "@/lib/types";

export interface DesignSummary {
  id: number;
  name: string;
  code: string;
  contractCode: string;
  segment: string;
  needCode: string;
  currency: string;
  baseAmount: number;
  tenorMonths: number;
  nominalRate: number;
  effectiveRate: number;
  installment: number;
  netMarginPct: number;
  healthScore: number;
  attractivenessScore: number;
  liquidityFloor: number;
  status: string;
  createdAt: string;
}

function toSummary(r: DesignRow): DesignSummary {
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    contractCode: r.contractCode,
    segment: r.segment,
    needCode: r.needCode,
    currency: r.currency,
    baseAmount: r.baseAmount,
    tenorMonths: r.tenorMonths,
    nominalRate: r.nominalRate,
    effectiveRate: r.effectiveRate,
    installment: r.installment,
    netMarginPct: r.netMarginPct,
    healthScore: r.healthScore,
    attractivenessScore: r.attractivenessScore,
    liquidityFloor: r.liquidityFloor,
    status: r.status,
    createdAt: new Date(r.createdAt).toISOString(),
  };
}

export async function listDesigns(): Promise<DesignSummary[]> {
  try {
    const rows = await db.select().from(designs).orderBy(desc(designs.id)).limit(100);
    return rows.map(toSummary);
  } catch {
    return [];
  }
}

export async function getDesign(id: number): Promise<DesignRow | null> {
  const rows = await db.select().from(designs).where(eq(designs.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createDesign(input: {
  spec: Partial<ProductSpec>;
  settings: OrgSettings;
  conversation?: DesignChatRow[];
}): Promise<DesignRow> {
  const report: ProductReport = buildReport(input.spec, input.settings);
  const s = report.spec;
  const row: DesignRow[] = await db
    .insert(designs)
    .values({
      name: s.productName,
      code: s.productCode,
      contractCode: report.contract.code,
      segment: s.segment,
      needCode: s.needCode,
      currency: s.currency,
      baseAmount: s.baseAmount,
      tenorMonths: s.tenorMonths,
      nominalRate: report.financial.nominalRate,
      effectiveRate: report.financial.effectiveAnnualRate,
      installment: report.financial.installmentAmount,
      netMargin: report.profitability.netMargin,
      netMarginPct: report.profitability.netMarginPct,
      healthScore: report.health.total,
      attractivenessScore: report.attractiveness.total,
      liquidityFloor: report.liquidity.metrics.worstCumulative,
      status: "draft",
      spec: s,
      report,
      conversation: input.conversation ?? [],
    })
    .returning();
  return row[0];
}

export async function updateDesign(
  id: number,
  patch: { status?: string; name?: string },
): Promise<DesignRow | null> {
  const rows = await db
    .update(designs)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(designs.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteDesign(id: number): Promise<boolean> {
  await db.delete(designs).where(eq(designs.id, id));
  return true;
}
