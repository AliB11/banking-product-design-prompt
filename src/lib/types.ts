export type Currency = "IRT" | "IRR";

export type ContractCode =
  | "mosharekat_madani"
  | "mosharekat_hoghoghi"
  | "forush_aghsati"
  | "ejareh_tamlik"
  | "salaf"
  | "joaleh"
  | "estena"
  | "qarzolhasaneh"
  | "kharid_din"
  | "mozareeh"
  | "mozarabeh";

export type NeedCode =
  | "working_capital"
  | "goods_purchase"
  | "vehicle"
  | "housing"
  | "equipment"
  | "raw_material"
  | "agriculture"
  | "construction_project"
  | "services_project"
  | "essential_need"
  | "marriage"
  | "large_investment"
  | "receivables"
  | "medical";

export type Segment =
  | "retail"
  | "micro_business"
  | "sme"
  | "corporate"
  | "professional";

export type RepaymentMode =
  | "annuity"
  | "flat"
  | "bullet"
  | "stepped"
  | "declining"
  | "interest_only";

export type CollateralCode =
  | "real_estate"
  | "blocked_deposit"
  | "guarantor"
  | "promissory_note"
  | "check"
  | "bank_guarantee"
  | "credit_insurance"
  | "movable_pledge"
  | "salary_deduction";

export type FundingCode =
  | "matched_long"
  | "short_term"
  | "mixed"
  | "qarz_deposit"
  | "interbank_backstop";

export type Frequency = "monthly" | "quarterly";

/** فرم مشخصات ۱۰ فیلدی محصول */
export interface ProductSpec {
  productName: string;
  productCode: string;
  /** ۱. نوع نیاز مشتری */
  needCode: NeedCode;
  needDescription: string;
  /** ۲. بازار هدف */
  segment: Segment;
  /** ۳. مبلغ */
  minAmount: number;
  maxAmount: number;
  baseAmount: number;
  /** ۴. مدت */
  tenorMonths: number;
  /** ۵. ساختار بازپرداخت */
  repaymentMode: RepaymentMode;
  frequency: Frequency;
  graceMonths: number;
  steppedGrowth: number;
  earlySettlementDiscount: boolean;
  /** ۶. وثیقه */
  collateralCode: CollateralCode;
  collateralCoverage: number;
  guarantors: number;
  /** ۷. نرخ */
  requestedContract: ContractCode | "auto";
  nominalRate: number;
  feeRate: number;
  spread: number;
  /** ۸. مزیت رقابتی */
  competitiveEdge: string;
  /** ۹. محدودیت‌های بانک */
  bankConstraints: string;
  /** ۱۰. ساختار تامین مالی */
  fundingCode: FundingCode;
  currency: Currency;
  /** ریسک اعتباری */
  pdOverride: number | null;
  /** فیلدهایی که با «فرض هوشمند» پر شده‌اند */
  assumedFields: string[];
  startDate: string;
}

export interface Installment {
  period: number;
  dueMonth: number;
  dateISO: string;
  payment: number;
  principal: number;
  profit: number;
  balance: number;
  fee: number;
}

export interface FundingTranche {
  code: string;
  name: string;
  amount: number;
  share: number;
  rate: number;
  tenorMonths: number;
  rollover: number;
  stableCore: number;
  cost: number;
}

export type HorizonCode = "h0_1" | "h1_3" | "h3_6" | "h6_12" | "h12p";

export interface GapRow {
  horizon: HorizonCode;
  label: string;
  inflow: number;
  outflow: number;
  interestPaid: number;
  gap: number;
  cumulative: number;
  coverage: number;
}

export interface ScenarioResult {
  code: string;
  name: string;
  description: string;
  gaps: GapRow[];
  minCumulative: number;
  minCoverage: number;
  lostCash: number;
  netMargin: number;
  netCollateralCoverage: number;
}

export interface ComplianceItem {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  reference: string;
}

export type VizType =
  | "bar"
  | "line"
  | "waterfall"
  | "radar"
  | "heatmap"
  | "gauge"
  | "table"
  | "comparison"
  | "cards"
  | "schedule";

export interface VizSeries {
  name: string;
  values: number[];
  color?: string;
}

export interface Visualization {
  id: string;
  type: VizType;
  title: string;
  subtitle?: string;
  data: {
    categories?: string[];
    series?: VizSeries[];
    items?: {
      label: string;
      value: number;
      kind?: "increase" | "decrease" | "total" | "subtotal";
    }[];
    axes?: string[];
    rows?: string[];
    cols?: string[];
    matrix?: number[][];
    value?: number;
    max?: number;
    segments?: { label: string; value: number; tone?: "good" | "warn" | "bad"; max?: number }[];
    columns?: string[];
    tableRows?: (string | number)[][];
    cards?: {
      label: string;
      value: string;
      hint?: string;
      tone?: "good" | "warn" | "bad" | "neutral";
    }[];
    unit?: string;
    compactAxis?: boolean;
    highlight?: string;
  };
  insight: string;
}

export type DocBlock =
  | { kind: "text"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "kv"; rows: [string, string][] }
  | { kind: "table"; columns: string[]; rows: string[][]; compact?: boolean }
  | { kind: "formula"; text: string }
  | { kind: "viz"; ref: string }
  | { kind: "flow"; steps: { title: string; detail: string; days: number }[] };

export interface DocSection {
  no: number;
  title: string;
  blocks: DocBlock[];
}

export interface OrgSettings {
  bankName: string;
  realFundingCost: number;
  historicalNpl: number;
  opexRate: number;
  capitalAdequacy: number;
  riskWeight: number;
  rateCeiling: number;
  latePenaltyRate: number;
  interbankRate: number;
  knowledgeDate: string;
  currency: Currency;
  depositRates: {
    current: number;
    qarz: number;
    shortTerm: number;
    oneYear: number;
    twoYear: number;
    threeYear: number;
  };
}

export interface CompetitorScore {
  name: string;
  effectiveRate: number;
  collateralCoverage: number;
  processDays: number;
  flexibility: number;
  extras: number;
  total: number;
  scores: number[];
}

export interface ProductReport {
  spec: ProductSpec;
  settings: OrgSettings;
  meta: {
    generatedAt: string;
    engineVersion: string;
    currency: string;
    knowledgeDate: string;
  };
  contract: {
    code: ContractCode;
    name: string;
    legalBasis: string;
    structure: string;
    reasons: string[];
    alternatives: { code: ContractCode; name: string; why: string }[];
    warnings: string[];
    inherentRisks: string[];
    mitigation: string[];
  };
  financial: {
    principal: number;
    nominalRate: number;
    effectiveNominalRate: number;
    effectiveAnnualRate: number;
    monthlyRate: number;
    installments: number;
    installmentAmount: number;
    firstInstallment: number;
    lastInstallment: number;
    totalPayments: number;
    totalProfit: number;
    totalFee: number;
    formula: string;
    schedule: Installment[];
    scheduleSample: Installment[];
    earlySettlement: { month: number; remainingPrincipal: number; discount: number; payable: number }[];
    breakevenPeriod: number;
  };
  liquidity: {
    tranches: FundingTranche[];
    weightedFundingRate: number;
    fundingCost: number;
    gaps: GapRow[];
    scenarios: ScenarioResult[];
    metrics: {
      coverageRatio: number;
      worstCumulative: number;
      criticalCollateralCoverage: number;
      nplCritical: number;
    };
    recommendations: string[];
  };
  profitability: {
    grossProfit: number;
    fees: number;
    penalties: number;
    fundingCost: number;
    expectedLoss: number;
    opex: number;
    netMargin: number;
    netMarginPct: number;
    irr: number;
    effectiveAnnual: number;
    allocatedCapital: number;
    rorac: number;
    breakevenInstallments: number;
    pd: number;
    lgd: number;
    ead: number;
    /** بازده سالانه دارایی بر مبنای میانگین مانده (EAD) */
    assetYieldPct: number;
    /** نرخ تامین مالی محافظه‌کارانه به‌کاررفته */
    fundingRatePct: number;
    /** اسپرید ناخالص سالانه = بازده دارایی − هزینه تامین */
    grossSpreadPct: number;
    /** حاشیه خالص سالانه پس از هزینه عملیاتی و زیان اعتباری */
    netSpreadPct: number;
    /** کف الزامی بازده دارایی = هزینه تامین + ۲ واحد درصد */
    requiredMarginPct: number;
    rulePassed: boolean;
    sensitivity: { rows: string[]; cols: string[]; matrix: number[][] };
    advice: string[];
  };
  attractiveness: {
    criteria: { label: string; weight: number; score: number; detail: string }[];
    total: number;
    competitors: CompetitorScore[];
    verdict: string;
  };
  health: {
    total: number;
    components: { label: string; max: number; value: number; tone: "good" | "warn" | "bad" }[];
    grade: string;
  };
  compliance: ComplianceItem[];
  swot: { strengths: string[]; weaknesses: string[]; improvements: string[] };
  processFlow: { title: string; detail: string; days: number }[];
  documentation: DocSection[];
  visualizations: Visualization[];
  quality: { item: string; ok: boolean }[];
}
