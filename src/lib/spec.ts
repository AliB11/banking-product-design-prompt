import { COLLATERALS, FUNDING_STRUCTURES, NEED_MATRIX, SEGMENTS } from "./contracts";
import type { OrgSettings, ProductSpec } from "./types";

export const DEFAULT_SETTINGS: OrgSettings = {
  bankName: "بانک نمونه (قابل تنظیم)",
  realFundingCost: 18.5,
  historicalNpl: 4.5,
  opexRate: 2,
  capitalAdequacy: 10.5,
  riskWeight: 100,
  rateCeiling: 23,
  latePenaltyRate: 6,
  interbankRate: 23,
  knowledgeDate: "مصوبات شورای پول و اعتبار — مبنای دانش موتور: ۱۴۰۴/۰۱",
  currency: "IRT",
  depositRates: {
    current: 0,
    qarz: 0,
    shortTerm: 12.5,
    oneYear: 17.5,
    twoYear: 18,
    threeYear: 20,
  },
};

/** فرم مشخصات ۱۰ فیلدی — بخش ۳ مرحله ۲ */
export const SPEC_FIELDS: {
  no: number;
  key: keyof ProductSpec | string;
  label: string;
  defaultValue: string;
  hint: string;
}[] = [
  { no: 1, key: "needCode", label: "نوع نیاز مشتری", defaultValue: "بر اساس توصیف کاربر", hint: "خودرو، مسکن، سرمایه در گردش، مواد اولیه، پروژه خدماتی، نیاز ضروری…" },
  { no: 2, key: "segment", label: "بازار هدف", defaultValue: "حقیقی خرد", hint: "خرد، کسب‌وکار کوچک، بنگاه متوسط، شرکتی، مشاغل حرفه‌ای" },
  { no: 3, key: "amount", label: "حداقل / حداکثر مبلغ", defaultValue: "عرف بازار هر بخش", hint: "بازه مبلغ محصول به تومان یا ریال" },
  { no: 4, key: "tenorMonths", label: "مدت", defaultValue: "۱۲ تا ۳۶ ماه", hint: "مدت بازپرداخت بر حسب ماه" },
  { no: 5, key: "repaymentMode", label: "ساختار بازپرداخت", defaultValue: "اقساط ماهانه متساوی", hint: "مساوی، خطی (سرد)، یکجا، صعودی، نزولی، سود و اصل در انتها" },
  { no: 6, key: "collateralCode", label: "نوع و سطح وثیقه", defaultValue: "متناسب با ریسک", hint: "ملک، سپرده مسدودی، ضامن، سفته، چک، ضمانت‌نامه، بیمه اعتباری" },
  { no: 7, key: "nominalRate", label: "سقف نرخ قابل طراحی", defaultValue: "نرخ مصوب عقد", hint: "هرگز بالاتر از سقف مصوب شورای پول و اعتبار طراحی نمی‌شود" },
  { no: 8, key: "competitiveEdge", label: "مزیت رقابتی مورد نظر", defaultValue: "نرخ مؤثر پایین‌تر", hint: "نرخ مؤثر پایین‌تر، وثیقه سبک‌تر، پرداخت سریع‌تر، انعطاف بازپرداخت" },
  { no: 9, key: "bankConstraints", label: "محدودیت‌های خاص بانک", defaultValue: "بدون محدودیت", hint: "محدودیت نقدینگی، سقف تمرکز، الزام وثیقه ملکی، بودجه اعتباری" },
  { no: 10, key: "fundingCode", label: "ساختار تامین مالی", defaultValue: "سپرده بلندمدت منطبق", hint: "منبع سپرده‌ای و تطبیق سررسید دارایی–بدهی (ALM)" },
];

export const FIELD_KEYS = SPEC_FIELDS.map((f) => f.key);

export function createSpec(partial: Partial<ProductSpec> = {}): ProductSpec {
  const segment = partial.segment ?? "retail";
  const seg = SEGMENTS[segment];
  const need = partial.needCode ?? "goods_purchase";
  const collateral = partial.collateralCode ?? "guarantor";
  const funding = partial.fundingCode ?? "matched_long";
  const mode = partial.repaymentMode ?? "annuity";
  const tenor = partial.tenorMonths ?? 36;
  const maxAmount = partial.maxAmount ?? seg.amountRange[1];
  const currency = partial.currency ?? "IRT";

  const base: ProductSpec = {
    productName: partial.productName ?? "",
    productCode: partial.productCode ?? "",
    needCode: need,
    needDescription: partial.needDescription ?? "",
    segment,
    minAmount: partial.minAmount ?? Math.round(seg.amountRange[0] / 1_000_000) * 1_000_000,
    maxAmount,
    baseAmount: partial.baseAmount ?? maxAmount,
    tenorMonths: tenor,
    repaymentMode: mode,
    frequency: partial.frequency ?? "monthly",
    graceMonths: partial.graceMonths ?? 0,
    steppedGrowth: partial.steppedGrowth ?? 3,
    earlySettlementDiscount: partial.earlySettlementDiscount ?? true,
    collateralCode: collateral,
    collateralCoverage: partial.collateralCoverage ?? COLLATERALS[collateral].suggestedCoverage,
    guarantors: partial.guarantors ?? (segment === "retail" ? 1 : segment === "corporate" ? 0 : 2),
    requestedContract: partial.requestedContract ?? "auto",
    nominalRate: partial.nominalRate ?? 23,
    feeRate: partial.feeRate ?? 0,
    spread: partial.spread ?? 0,
    competitiveEdge: partial.competitiveEdge ?? "نرخ مؤثر پایین‌تر از بازار",
    bankConstraints: partial.bankConstraints ?? "بدون محدودیت خاص",
    fundingCode: funding,
    currency,
    pdOverride: partial.pdOverride ?? null,
    assumedFields: partial.assumedFields ?? [],
    startDate: partial.startDate ?? new Date().toISOString().slice(0, 10),
  };

  if (base.needCode === "essential_need" || base.needCode === "marriage") {
    base.requestedContract = partial.requestedContract ?? "qarzolhasaneh";
    base.nominalRate = partial.nominalRate ?? 0;
    base.feeRate = partial.feeRate ?? 1;
    base.fundingCode = partial.fundingCode ?? "qarz_deposit";
    base.collateralCode = partial.collateralCode ?? "promissory_note";
    base.collateralCoverage = partial.collateralCoverage ?? 100;
    base.tenorMonths = partial.tenorMonths ?? 60;
  }

  return { ...base, ...cleanPartial(partial) };
}

function cleanPartial(partial: Partial<ProductSpec>): Partial<ProductSpec> {
  const out: Partial<ProductSpec> = {};
  for (const [k, v] of Object.entries(partial)) {
    if (v !== undefined && v !== null) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** پیشنهاد هوشمند نام و کد محصول */
export function suggestNaming(spec: ProductSpec, contractName: string): { name: string; code: string } {
  const seg = SEGMENTS[spec.segment].label.split(" ")[0];
  const need = NEED_MATRIX[spec.needCode].label;
  const name = spec.productName?.trim() || `تسهیلات ${need} ${seg} — «${contractName}»`;
  const slug = spec.requestedContract === "auto" ? "PRD" : spec.requestedContract.slice(0, 3).toUpperCase();
  const code = spec.productCode?.trim() || `${slug}-${spec.tenorMonths}M-${String(Math.round(spec.baseAmount / 1_000_000)).padStart(4, "0")}`;
  return { name, code };
}

/** ساختار تامین مالی انتخاب‌شده با نرخ‌های تنظیمات سازمانی */
export function fundingMix(spec: ProductSpec, settings: OrgSettings) {
  const structure = FUNDING_STRUCTURES[spec.fundingCode];
  const rateOf: Record<string, number> = {
    current: settings.depositRates.current,
    qarz: settings.depositRates.qarz,
    shortTerm: settings.depositRates.shortTerm,
    oneYear: settings.depositRates.oneYear,
    twoYear: settings.depositRates.twoYear,
    threeYear: settings.depositRates.threeYear,
    interbank: settings.interbankRate,
  };
  return structure.mix.map(([code, share]) => ({ code, share, rate: rateOf[code] ?? 0 }));
}
