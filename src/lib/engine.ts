import {
  COLLATERALS,
  CONTRACTS,
  DEPOSIT_TYPES,
  FUNDING_STRUCTURES,
  HORIZONS,
  NEED_MATRIX,
  REPAYMENT_MODES,
  SEGMENTS,
} from "./contracts";
import {
  buildSchedule,
  cashFlows,
  irr,
  periodsPerYear,
  scheduleSample,
  scheduleTotals,
} from "./math";
import { clamp, round } from "./format";
import { createSpec, fundingMix, suggestNaming } from "./spec";
import type {
  ComplianceItem,
  ContractCode,
  FundingTranche,
  GapRow,
  HorizonCode,
  Installment,
  OrgSettings,
  ProductReport,
  ProductSpec,
  ScenarioResult,
} from "./types";

export type Analysis = Omit<ProductReport, "visualizations" | "documentation" | "quality">;

interface Shock {
  delayMonths?: number;
  delayedShare?: number;
  npl?: number;
}

const DEFAULTS: OrgSettings = {
  bankName: "بانک نمونه",
  realFundingCost: 18.5,
  historicalNpl: 4.5,
  opexRate: 2,
  capitalAdequacy: 10.5,
  riskWeight: 100,
  rateCeiling: 23,
  latePenaltyRate: 6,
  interbankRate: 23,
  knowledgeDate: "مصوبات شورای پول و اعتبار — مبنای دانش موتور: ۱۴۰۴",
  currency: "IRT",
  depositRates: { current: 0, qarz: 0, shortTerm: 12.5, oneYear: 17.5, twoYear: 18, threeYear: 20 },
};

/* ------------------------------------------------------------------ عقد */

function resolveContract(spec: ProductSpec) {
  const need = NEED_MATRIX[spec.needCode];
  const warnings: string[] = [];
  let code: ContractCode = need.primary;
  let reasons = need.reasons;

  if (spec.requestedContract !== "auto") {
    code = spec.requestedContract;
    if (code !== need.primary && !need.alternatives.includes(code)) {
      warnings.push(
        `عقد انتخابی «${CONTRACTS[code].name}» با نیاز «${need.label}» در ماتریس انطباق سازگار نیست؛ عقد اولویت‌دار «${CONTRACTS[need.primary].name}» است. انتخاب شما محترم است اما ریسک انطباق و عملیاتی افزایش می‌یابد.`,
      );
      reasons = [
        `انتخاب کاربر (خارج از ماتریس انطباق) — عقد پیشنهادی موتور: ${CONTRACTS[need.primary].name}`,
        ...CONTRACTS[code].mitigation.slice(0, 2),
      ];
    } else {
      reasons = [
        `عقد «${CONTRACTS[code].name}» در ماتریس انطباق به‌عنوان ${code === need.primary ? "گزینه اولویت‌دار" : "جایگزین معتبر"} برای نیاز «${need.label}» ثبت شده است.`,
        ...need.reasons.slice(0, 2),
      ];
    }
  }

  return { def: CONTRACTS[code], code, reasons, warnings, need };
}

/* --------------------------------------------------------- مانده ماهانه */

function balanceByMonth(schedule: Installment[], principal: number, tenorMonths: number): number[] {
  const arr: number[] = new Array(tenorMonths + 1).fill(0);
  arr[0] = principal;
  const byMonth = new Map<number, number>();
  schedule.forEach((r) => byMonth.set(r.dueMonth, r.balance));
  for (let m = 1; m <= tenorMonths; m++) arr[m] = byMonth.has(m) ? (byMonth.get(m) as number) : arr[m - 1];
  return arr;
}

/* --------------------------------------------------------------- تامین مالی */

function buildTranches(spec: ProductSpec, settings: OrgSettings): FundingTranche[] {
  return fundingMix(spec, settings).map((m) => {
    const dt = DEPOSIT_TYPES[m.code as keyof typeof DEPOSIT_TYPES];
    return {
      code: m.code,
      name: dt.name,
      amount: spec.baseAmount * m.share,
      share: m.share,
      rate: m.rate,
      tenorMonths: dt.tenorMonths,
      rollover: dt.rollover,
      stableCore: dt.stableCore,
      cost: 0,
    };
  });
}

function horizonEnd(h: (typeof HORIZONS)[number], tenorMonths: number): number {
  return h.to >= 10_000 ? tenorMonths : Math.min(h.to, tenorMonths);
}

function computeGaps(
  schedule: Installment[],
  tranches: FundingTranche[],
  tenorMonths: number,
  balances: number[],
  fundingRate: number,
  shock: Shock = {},
): { rows: GapRow[]; lostCash: number; delayedCash: number } {
  const delay = shock.delayMonths ?? 0;
  const share = shock.delayedShare ?? 0;
  const npl = shock.npl ?? 0;
  let cumulative = 0;
  let lostCash = 0;
  let delayedCash = 0;

  const rows = HORIZONS.map((h) => {
    const from = h.from;
    const to = horizonEnd(h, tenorMonths);
    const L = Math.max(0, to - from);

    let inflow = 0;
    for (const r of schedule) {
      const hit = r.dueMonth > from && r.dueMonth <= to;
      const lateHit = delay > 0 && r.dueMonth + delay > from && r.dueMonth + delay <= to;
      const nplHit = npl > 0 && r.dueMonth > 2;
      const amount = r.payment * (nplHit ? 1 - npl : 1);
      if (hit) inflow += amount * (delay > 0 ? 1 - share : 1);
      if (delay > 0 && lateHit) {
        inflow += amount * share;
        delayedCash += amount * share;
      }
      if (nplHit && hit) lostCash += r.payment * npl;
    }

    // سود پرداختی به سپرده‌گذاران روی مانده کاهنده دارایی (کتاب منطبق)
    let interestPaid = 0;
    for (let m = Math.max(1, Math.round(from) + 1); m <= Math.round(to); m++) {
      interestPaid += (balances[Math.min(m - 1, tenorMonths)] * fundingRate) / 100 / 12;
    }

    // خروجی اصل سپرده‌ها در سررسید/تمدید
    let withdrawals = 0;
    for (const t of tranches) {
      const term = t.tenorMonths > 0 ? t.tenorMonths : 0.5;
      const events = Math.max(0, Math.floor(to / term) - Math.floor(from / term));
      if (!events) continue;
      const raw = t.amount * (1 - t.rollover) * events;
      withdrawals += Math.min(raw, t.amount * (1 - t.stableCore));
    }

    const outflow = interestPaid + withdrawals;
    const gap = inflow - outflow;
    cumulative += gap;
    return {
      horizon: h.code as HorizonCode,
      label: h.label,
      inflow: round(inflow, 0),
      outflow: round(outflow, 0),
      interestPaid: round(interestPaid, 0),
      gap: round(gap, 0),
      cumulative: round(cumulative, 0),
      coverage: outflow > 1 ? round(inflow / outflow, 2) : 99,
    };
  });

  return { rows, lostCash: round(lostCash, 0), delayedCash: round(delayedCash, 0) };
}

/* ---------------------------------------------------------------- تحلیل */

export function buildAnalysis(rawSpec: Partial<ProductSpec>, rawSettings: Partial<OrgSettings>): Analysis {
  const settings: OrgSettings = {
    ...DEFAULTS,
    ...rawSettings,
    depositRates: { ...DEFAULTS.depositRates, ...(rawSettings.depositRates ?? {}) },
  };
  const spec = createSpec(rawSpec);
  const provided = new Set(Object.keys(rawSpec));
  const assumed = new Set(rawSpec.assumedFields ?? []);
  const naming = suggestNaming(spec, "");
  if (!spec.productName) spec.productName = naming.name;
  if (!spec.productCode) spec.productCode = naming.code;

  const { def, code, reasons, warnings, need } = resolveContract(spec);
  const isQarz = def.code === "qarzolhasaneh";
  const ceiling = def.ceiling;

  /* --- انطباق نرخ، مدت و ساختار بازپرداخت --- */
  let nominalRate = spec.nominalRate;
  if (isQarz) nominalRate = 0;
  if (nominalRate > ceiling) {
    warnings.push(
      `نرخ درخواستی ${nominalRate}٪ از سقف مصوب عقد «${def.name}» (${ceiling}٪) بالاتر بود؛ موتور به‌صورت خودکار روی سقف مصوب ${ceiling}٪ بازطراحی کرد. طراحی نرخ غیرمجاز مجاز نیست.`,
    );
    nominalRate = ceiling;
  }
  if (nominalRate <= 0 && !isQarz) {
    nominalRate = ceiling;
    assumed.add("nominalRate");
  }
  spec.nominalRate = nominalRate;

  const tenorMonths = clamp(spec.tenorMonths, def.tenorRange[0], def.tenorRange[1]);
  if (tenorMonths !== spec.tenorMonths) {
    warnings.push(
      `مدت درخواستی ${spec.tenorMonths} ماه خارج از بازه متعارف عقد «${def.name}» (${def.tenorRange[0]} تا ${def.tenorRange[1]} ماه) بود و به ${tenorMonths} ماه تعدیل شد.`,
    );
    spec.tenorMonths = tenorMonths;
  }

  if (!def.repaymentModes.includes(spec.repaymentMode)) {
    warnings.push(
      `ساختار بازپرداخت «${REPAYMENT_MODES[spec.repaymentMode].label}» با عقد «${def.name}» سازگار نیست؛ به «${REPAYMENT_MODES[def.repaymentModes[0]].label}» تغییر یافت.`,
    );
    spec.repaymentMode = def.repaymentModes[0];
  }

  const feeRate = spec.feeRate > 0 ? spec.feeRate : isQarz ? 1 : 0.5;
  spec.feeRate = isQarz ? Math.min(feeRate, 2) : feeRate;
  if (isQarz && feeRate > 2) warnings.push("کارمزد قرض‌الحسنه به سقف مصوب ۲٪ محدود شد (دستورالعمل کارمزد خدمات بانکی).");

  const collateral = COLLATERALS[spec.collateralCode];
  const segment = SEGMENTS[spec.segment];
  const ppy = periodsPerYear(spec.frequency);
  const monthsPerPeriod = 12 / ppy;

  /* --- جدول اقساط و نرخ مؤثر --- */
  const schedule = buildSchedule({
    principal: spec.baseAmount,
    annualRatePct: spec.nominalRate,
    tenorMonths: spec.tenorMonths,
    mode: spec.repaymentMode,
    frequency: spec.frequency,
    growthPct: spec.steppedGrowth,
    graceMonths: spec.graceMonths,
    startDate: spec.startDate,
  });
  const totals = scheduleTotals(schedule);
  // افق واقعی نقدینگی: با احتساب دوره تنفس، آخرین سررسید ممکن است از مدت قرارداد فراتر رود
  const horizonMonths = Math.max(
    spec.tenorMonths,
    schedule.length ? schedule[schedule.length - 1].dueMonth : spec.tenorMonths,
  );
  const years = horizonMonths / 12;
  const feeAmount = (spec.baseAmount * spec.feeRate) / 100;
  const flows = cashFlows(spec.baseAmount, feeAmount, schedule, monthsPerPeriod);
  const irrPeriodic = irr(flows, 0.02);
  const effectiveNominalRate = irrPeriodic !== null ? irrPeriodic * ppy * 100 : spec.nominalRate;
  const effectiveAnnualRate = irrPeriodic !== null ? (Math.pow(1 + irrPeriodic, ppy) - 1) * 100 : spec.nominalRate;

  const earlySettlement = [0.25, 0.5, 0.75].map((f) => {
    const target = Math.round(horizonMonths * f);
    const upto = schedule.filter((r) => r.dueMonth <= target);
    const remainingPrincipal = upto.length ? upto[upto.length - 1].balance : spec.baseAmount;
    const accruedProfit = upto.reduce((a, r) => a + r.profit, 0);
    const unearned = Math.max(0, totals.profit - accruedProfit);
    const discount = spec.earlySettlementDiscount ? unearned * 0.5 : 0;
    return {
      month: target,
      remainingPrincipal: round(remainingPrincipal, 0),
      discount: round(discount, 0),
      payable: round(remainingPrincipal + unearned - discount, 0),
    };
  });

  /* --- تامین مالی، هزینه تامین و شکاف نقدینگی --- */
  const balances = balanceByMonth(schedule, spec.baseAmount, horizonMonths);
  const ead = balances.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(1, balances.length - 1);
  const tranches = buildTranches(spec, settings);
  const weightedFundingRate = tranches.reduce((a, t) => a + t.rate * t.share, 0);
  // منابع کاملاً رایگان (جاری/قرض‌الحسنه) نرخ سود ندارند؛ هزینه تجهیز و نگهداری ۲٪ فرض می‌شود
  const freeFunding = weightedFundingRate <= 0.01;
  const fundingRateUsed = freeFunding ? 2 : Math.max(weightedFundingRate, settings.realFundingCost);
  if (freeFunding && !isQarz) {
    warnings.push(
      "ساختار تامین مالی کاملاً از منابع رایگان (جاری/قرض‌الحسنه) است؛ هزینه تجهیز و نگهداری ۲٪ فرض شد (فرض — قابل تغییر).",
    );
  }
  // هزینه تامین مالی روی مانده کاهنده دارایی: EAD × نرخ × مدت
  const fundingCost = (ead * fundingRateUsed) / 100 * years;
  tranches.forEach((t) => (t.cost = round((t.share * fundingCost), 0)));

  /* --- ریسک اعتباری --- */
  const pd = clamp(Math.max(segment.pd * (1 + spec.tenorMonths / 120), settings.historicalNpl * 0.8), 0.5, 18);
  const lgd = clamp(1 - (spec.collateralCoverage / 100) * (1 - collateral.haircut / 100), 5, 95);
  const expectedLoss = (pd / 100) * (lgd / 100) * ead;
  const collateralValue = (spec.baseAmount * spec.collateralCoverage) / 100;

  const opex = (spec.baseAmount * settings.opexRate) / 100;
  const delayedShareAssumed = clamp(settings.historicalNpl * 2.5, 5, 30) / 100;
  const penalties = ((totals.payment * delayedShareAssumed * settings.latePenaltyRate) / 100) * (45 / 365);

  /* --- سودآوری --- */
  const netMargin = totals.profit + feeAmount + penalties - fundingCost - expectedLoss - opex;
  const netMarginPct = (netMargin / spec.baseAmount) * 100;
  const assetYieldPct = ((totals.profit + feeAmount + penalties) / Math.max(1, ead)) * 100 / years;
  const opexAnnualPct = (opex / Math.max(1, ead)) * 100 / years;
  const elAnnualPct = (expectedLoss / Math.max(1, ead)) * 100 / years;
  const grossSpreadPct = assetYieldPct - fundingRateUsed;
  const netSpreadPct = grossSpreadPct - opexAnnualPct - elAnnualPct;
  const requiredMarginPct = fundingRateUsed + 2;
  // قرض‌الحسنه از قاعده کف سودآوری مستثناست؛ معیار انطباق آن کنترل زیان انباشته است
  const rulePassed = isQarz ? netMarginPct >= -8 : assetYieldPct >= requiredMarginPct;

  const allocatedCapital = ead * (settings.riskWeight / 100) * (settings.capitalAdequacy / 100);
  const rorac = allocatedCapital > 0 ? (netMargin / years / allocatedCapital) * 100 : 0;

  // نقطه سربه‌سر: قسطی که بانک اصل و همه هزینه‌ها را بازیافت می‌کند
  let cum = feeAmount - spec.baseAmount;
  let breakevenInstallments = schedule.length;
  const opexPer = opex / Math.max(1, schedule.length);
  const elPer = expectedLoss / Math.max(1, schedule.length);
  for (let k = 0; k < schedule.length; k++) {
    const prevBalance = balances[Math.min(schedule[k].dueMonth - 1, balances.length - 1)];
    cum += schedule[k].payment - (prevBalance * fundingRateUsed) / 100 / ppy - opexPer - elPer;
    if (cum > 0) {
      breakevenInstallments = k + 1;
      break;
    }
  }

  /* --- سناریوها --- */
  const scenarioDefs: { code: string; name: string; description: string; shock: Shock }[] = [
    { code: "base", name: "سناریو پایه", description: "وصول اقساط دقیقاً طبق جدول زمان‌بندی", shock: {} },
    { code: "stress30", name: "استرس — تاخیر ۳۰ روز", description: "۳۰٪ اقساط با ۳۰ روز تاخیر وصول می‌شود", shock: { delayMonths: 1, delayedShare: 0.3 } },
    { code: "stress60", name: "استرس — تاخیر ۶۰ روز", description: "۴۰٪ اقساط با ۶۰ روز تاخیر وصول می‌شود", shock: { delayMonths: 2, delayedShare: 0.4 } },
    { code: "stress90", name: "استرس — تاخیر ۹۰ روز", description: "۵۰٪ اقساط با ۹۰ روز تاخیر وصول می‌شود", shock: { delayMonths: 3, delayedShare: 0.5 } },
    { code: "npl5", name: "بحرانی — NPL ۵٪", description: "۵٪ از جریان نقدی از ماه سوم نکول می‌شود", shock: { npl: 0.05 } },
    { code: "npl10", name: "بحرانی — NPL ۱۰٪", description: "۱۰٪ نکول؛ نیاز به خط اعتباری پشتیبان", shock: { npl: 0.1 } },
    { code: "npl15", name: "بحرانی — NPL ۱۵٪", description: "۱۵٪ نکول؛ سناریو بحرانی کامل با اجرای وثایق", shock: { npl: 0.15 } },
  ];

  const scenarios: ScenarioResult[] = scenarioDefs.map((s) => {
    const g = computeGaps(schedule, tranches, horizonMonths, balances, fundingRateUsed, s.shock);
    const lostPrincipal = g.lostCash * (ead / Math.max(1, totals.payment));
    const recovery = lostPrincipal * (1 - lgd / 100);
    const bridgingCost = ((g.delayedCash * fundingRateUsed) / 100 / 12) * (s.shock.delayMonths ?? 1);
    const penaltyGain = g.delayedCash * (settings.latePenaltyRate / 100) * ((s.shock.delayMonths ?? 0) / 12) * 0.5;
    const criticalEad = ead * (1 + (s.shock.npl ?? 0));
    const coverages = g.rows.filter((r) => r.outflow > 1).map((r) => r.coverage);
    return {
      code: s.code,
      name: s.name,
      description: s.description,
      gaps: g.rows,
      minCumulative: Math.min(...g.rows.map((r) => r.cumulative)),
      minCoverage: coverages.length ? Math.min(...coverages) : 0,
      lostCash: g.lostCash,
      netMargin: round(netMargin - g.lostCash + recovery - bridgingCost + penaltyGain, 0),
      netCollateralCoverage: criticalEad > 0 ? ((collateralValue * (1 - collateral.haircut / 100)) / criticalEad) * 100 : 0,
    };
  });

  const baseScenario = scenarios[0];
  const critical = scenarios.find((s) => s.code === "npl15") ?? scenarios[scenarios.length - 1];
  const worstStress = scenarios.find((s) => s.code === "stress90") ?? baseScenario;

  /* --- حساسیت --- */
  const rateOffsets = [-2, -1, 0, 1, 2];
  const nplLevels = [0, 5, 10, 15, 20];
  const sensitivityMatrix = rateOffsets.map((off) =>
    nplLevels.map((lvl) => {
      const fc = (ead * Math.max(0, fundingRateUsed + off)) / 100 * years;
      const el = (clamp(pd + lvl, 0.5, 40) / 100) * (lgd / 100) * ead;
      return round(((totals.profit + feeAmount + penalties - fc - el - opex) / spec.baseAmount) * 100, 1);
    }),
  );

  /* --- توصیه بازطراحی --- */
  const advice: string[] = [];
  if (isQarz) {
    advice.push(
      `قرض‌الحسنه از قاعده کف سودآوری مستثناست؛ معیار سنجش، کنترل زیان انباشته است. زیان فعلی ${round(netMarginPct, 2)}٪ از اصل است که ${rulePassed ? "زیر سقف تحمل ۸٪ قرار دارد" : "از سقف تحمل ۸٪ فراتر رفته؛ باید مدت کوتاه‌تر یا هزینه عملیاتی کمتر شود"}.`,
    );
    advice.push(
      "تامین مالی باید ۱۰۰٪ از محل سپرده قرض‌الحسنه و جاری باشد (الزام دستورالعمل تسهیلات قرض‌الحسنه)؛ هر منبع سوددار زیان محصول را تشدید می‌کند.",
    );
    advice.push(
      `فرایند تمام‌دیجیتال و حذف ارزیابی حضوری، هزینه عملیاتی را از ${round(settings.opexRate, 1)}٪ به حدود ${round(Math.max(0.6, settings.opexRate * 0.5), 1)}٪ می‌رساند و ${round(opex * 0.5, 0)} ${spec.currency === "IRR" ? "ریال" : "تومان"} از زیان می‌کاهد.`,
    );
  } else if (!rulePassed) {
    // نرخ حداقلی برای عبور از کف سودآوری (بازده دارایی ≥ هزینه تامین + ۲)
    const targetGross = totals.profit + feeAmount + penalties;
    const neededGross = (requiredMarginPct / 100) * ead * years;
    const extraNeeded = neededGross - targetGross;
    const rateUplift = (extraNeeded / Math.max(1, ead) / Math.max(0.5, years)) * 100;
    const minRate = round(spec.nominalRate + rateUplift, 1);
    if (minRate <= ceiling) {
      advice.push(
        `بازطراحی نرخ: برای رسیدن به کف سودآوری (بازده دارایی ${round(requiredMarginPct, 1)}٪) نرخ اسمی باید به حدود ${minRate}٪ برسد — همچنان داخل سقف مصوب ${ceiling}٪.`,
      );
    } else {
      advice.push(
        `با سقف مصوب ${ceiling}٪ و هزینه تامین ${round(fundingRateUsed, 1)}٪، کف سودآوری قابل دستیابی نیست؛ ترکیب سپرده را به منابع ارزان‌تر (جاری/قرض‌الحسنه) تغییر دهید تا هزینه تامین پایین بیاید.`,
      );
      const shorter = Math.max(def.tenorRange[0], Math.round(spec.tenorMonths * 0.6));
      advice.push(
        `کوتاه‌کردن مدت به ${shorter} ماه، هزینه عملیاتی و ریسک نکول دوره را کاهش می‌دهد و بازده دارایی را حدود ${round(rateUplift * 0.3, 1)} واحد درصد بهبود می‌بخشد.`,
      );
      advice.push(
        `افزودن درآمد کارمزدی مجاز (بیمه اعتباری، خدمات سپرده‌ای) به اندازه ${round(Math.max(0.3, extraNeeded / Math.max(1, spec.baseAmount) * 100), 1)}٪ اصل، شکاف کف سودآوری را می‌بندد.`,
      );
    }
  } else {
    advice.push(
      `اسپرد ناخالص ${round(grossSpreadPct, 2)} واحد درصد بالاتر از هزینه تامین است (کف الزامی ۲ واحد)؛ ${round(grossSpreadPct - 2, 2)} واحد درصد فضا برای تخفیف رقابتی یا کاهش نرخ مؤثر وجود دارد.`,
    );
  }
  if (baseScenario.minCumulative < 0) {
    advice.push(
      `کف نقدینگی تجمعی در افق‌های کوتاه منفی است (${round(baseScenario.minCumulative, 0)} ${spec.currency === "IRR" ? "ریال" : "تومان"})؛ خط اعتباری پشتیبان به اندازه ${round(Math.abs(baseScenario.minCumulative) * 1.2, 0)} تعریف کنید.`,
    );
  }
  if (worstStress.minCumulative < baseScenario.minCumulative * 1.05 && spec.tenorMonths > 12) {
    advice.push(
      `در سناریو تاخیر ۹۰ روزه، کف نقدینگی به ${round(worstStress.minCumulative, 0)} می‌رسد؛ برای پوشش آن ${round(Math.max(5, Math.abs(worstStress.minCumulative - baseScenario.minCumulative) / Math.max(1, spec.baseAmount) * 100), 0)}٪ از منابع را به سپرده هم‌سررسید منتقل کنید.`,
    );
  }
  if (tranches.some((t) => t.tenorMonths > 0 && t.tenorMonths < spec.tenorMonths / 2)) {
    advice.push(
      "بخشی از منابع با سررسید کوتاه‌تر از نیمی از مدت دارایی تامین شده؛ سهم سپرده بلندمدت هم‌سررسید را حداقل ۱۰ واحد درصد افزایش دهید.",
    );
  }
  if (!advice.length) {
    advice.push("ساختار فعلی هم از منظر سودآوری و هم نقدینگی پایدار است؛ پایش ماهانه انحراف وصول از جدول اقساط کافی است.");
  }

  const matchedShare = tranches.filter((t) => t.tenorMonths >= spec.tenorMonths).reduce((a, t) => a + t.share, 0) * 100;
  const liquidityRecommendations = [
    `${FUNDING_STRUCTURES[spec.fundingCode].almFit} — سهم منابع هم‌سررسید یا بلندتر از دارایی: ${round(matchedShare, 0)}٪`,
    baseScenario.minCumulative >= 0
      ? `کف نقدینگی تجمعی در تمام افق‌ها مثبت است (حداقل ${round(baseScenario.minCumulative, 0)}) و نسبت پوشش جریان نقدی در بدترین افق ${round(baseScenario.minCoverage, 2)} است.`
      : `کف نقدینگی تجمعی تا ${round(baseScenario.minCumulative, 0)} منفی می‌شود؛ ترکیب سپرده را به سمت منابع پایدارتر ببرید یا خط اعتباری بین‌بانکی به اندازه ${round(Math.abs(baseScenario.minCumulative) * 1.2, 0)} پیش‌بینی کنید.`,
    advice.find((x) => /نقدینگی|سررسید|سپرده/.test(x)) ?? advice[0],
  ];

  /* --- جذابیت مشتری --- */
  const marketBenchmarkEff = settings.rateCeiling + 3;
  const processDays = segment.processDays + collateral.processDays + (spec.segment === "corporate" ? 12 : 0);

  const scoreRate = (eff: number) => clamp(((34 - eff) / 22) * 100, 0, 100);
  const scoreCollateral = (coverage: number, heaviness: number) =>
    clamp(0.6 * ((200 - coverage) / 100) * 100 + 0.4 * (100 - heaviness), 0, 100);
  const scoreSpeed = (days: number) => clamp(((45 - days) / 40) * 100, 0, 100);
  const scoreFlex = (grace: number, early: boolean, steppedMode: boolean, freq: string) =>
    clamp((grace > 0 ? 30 : 0) + (early ? 30 : 0) + (steppedMode ? 25 : 0) + (freq === "quarterly" ? 15 : 10), 0, 100);
  const scoreExtras = (insurance: boolean, early: boolean, grace: number, digital: boolean) =>
    clamp((insurance ? 30 : 0) + (early ? 25 : 0) + (grace > 0 ? 20 : 0) + (digital ? 25 : 0), 0, 100);

  const criteria = [
    { label: "نرخ مؤثر پرداختی نسبت به بازار", weight: 35, score: round(scoreRate(effectiveAnnualRate), 1), detail: `نرخ مؤثر ${round(effectiveAnnualRate, 1)}٪ در برابر میانگین بازار ${marketBenchmarkEff}٪` },
    { label: "سنگینی وثیقه", weight: 25, score: round(scoreCollateral(spec.collateralCoverage, collateral.heaviness), 1), detail: `${collateral.label} با پوشش ${spec.collateralCoverage}٪` },
    { label: "سرعت و سهولت فرایند", weight: 20, score: round(scoreSpeed(processDays), 1), detail: `برآورد ${processDays} روز کاری از ثبت درخواست تا پرداخت` },
    {
      label: "انعطاف بازپرداخت",
      weight: 15,
      score: round(scoreFlex(spec.graceMonths, spec.earlySettlementDiscount, ["stepped", "declining"].includes(spec.repaymentMode), spec.frequency), 1),
      detail: `تنفس ${spec.graceMonths} ماه، تخفیف تسویه زودهنگام ${spec.earlySettlementDiscount ? "دارد" : "ندارد"}`,
    },
    {
      label: "خدمات جانبی",
      weight: 5,
      score: round(scoreExtras(spec.collateralCode === "credit_insurance", spec.earlySettlementDiscount, spec.graceMonths, spec.segment !== "corporate"), 1),
      detail: "بیمه اعتباری، باشگاه مشتریان و پرداخت دیجیتال",
    },
  ];
  const attractivenessTotal = round(criteria.reduce((a, c) => a + (c.score * c.weight) / 100, 0), 1);

  const competitors = [
    { name: "رقیب الف — نرخ بالاتر", effectiveRate: effectiveAnnualRate + 2.5, collateralCoverage: spec.collateralCoverage + 20, processDays: processDays + 7, flexibility: scoreFlex(0, true, false, "monthly"), extras: scoreExtras(false, true, 0, true) },
    { name: "رقیب ب — وثیقه سنگین", effectiveRate: effectiveAnnualRate + 0.8, collateralCoverage: spec.collateralCoverage + 55, processDays: processDays + 14, flexibility: scoreFlex(spec.graceMonths, spec.earlySettlementDiscount, false, "monthly"), extras: scoreExtras(false, spec.earlySettlementDiscount, 0, false) },
    { name: "رقیب ج — فرایند سنتی", effectiveRate: effectiveAnnualRate - 0.5, collateralCoverage: spec.collateralCoverage + 10, processDays: processDays + 25, flexibility: scoreFlex(0, false, false, "monthly"), extras: scoreExtras(false, false, 0, false) },
  ].map((c) => {
    const heaviness = Math.min(100, collateral.heaviness + (c.collateralCoverage - spec.collateralCoverage) / 2);
    const scores = [round(scoreRate(c.effectiveRate), 1), round(scoreCollateral(c.collateralCoverage, heaviness), 1), round(scoreSpeed(c.processDays), 1), round(c.flexibility, 1), round(c.extras, 1)];
    const weights = [35, 25, 20, 15, 5];
    return { ...c, effectiveRate: round(c.effectiveRate, 1), processDays: Math.round(c.processDays), scores, total: round(scores.reduce((a, s, i) => a + (s * weights[i]) / 100, 0), 1) };
  });

  const bestCompetitor = competitors.reduce((a, b) => (b.total > a.total ? b : a));
  const verdict =
    attractivenessTotal > bestCompetitor.total
      ? `محصول با امتیاز ${attractivenessTotal} از بهترین رقیب فرضی (${bestCompetitor.name} با ${bestCompetitor.total}) پیش است؛ مزیت رقابتی «${spec.competitiveEdge}» در عمل محقق شده است.`
      : `محصول (${attractivenessTotal}) هنوز از «${bestCompetitor.name}» (${bestCompetitor.total}) عقب است؛ باید روی وثیقه سبک‌تر یا سرعت فرایند کار شود.`;

  /* --- انطباق مقرراتی --- */
  const compliance: ComplianceItem[] = [
    { label: "اعتبار عقد در بانکداری بدون ربا", status: "pass", detail: `عقد «${def.name}» در فهرست عقود مرسوم ماده ۴ تا ۱۵ قانون عملیات بانکی بدون ربا قرار دارد.`, reference: def.legalBasis },
    { label: "رعایت سقف نرخ مصوب", status: spec.nominalRate <= ceiling + 1e-9 ? "pass" : "fail", detail: `نرخ اسمی ${round(spec.nominalRate, 2)}٪ ≤ سقف مصوب عقد ${ceiling}٪`, reference: "مصوبات شورای پول و اعتبار" },
    { label: "شفافیت نرخ مؤثر", status: effectiveAnnualRate - spec.nominalRate > 3 ? "warn" : "pass", detail: `نرخ مؤثر سالانه ${round(effectiveAnnualRate, 2)}٪ در برابر نرخ اسمی ${round(spec.nominalRate, 2)}٪ — اختلاف ${round(effectiveAnnualRate - spec.nominalRate, 2)} واحد درصد باید در قرارداد افشا شود.`, reference: "دستورالعمل شفافیت نرخ سود تسهیلات" },
    { label: "مبنای محاسبه سود", status: "pass", detail: spec.repaymentMode === "bullet" ? "محاسبه بر مبنای مدت واقعی (روز/ماه) — مطابق روش سهم منافع" : "محاسبه بر مبنای مانده بدهی دوره‌ای (کاهش تدریجی اصل)", reference: "آیین‌نامه اجرایی قانون عملیات بانکی بدون ربا" },
    { label: "کارمزد خدمات بانکی", status: isQarz ? (spec.feeRate <= 2 ? "pass" : "fail") : spec.feeRate <= 1.5 ? "pass" : "warn", detail: isQarz ? `کارمزد قرض‌الحسنه ${spec.feeRate}٪ (سقف مصوب ۲٪)` : `کارمزد تشکیل پرونده/اعطا ${spec.feeRate}٪`, reference: "دستورالعمل کارمزد خدمات بانکی بانک مرکزی" },
    { label: "تطبیق با ماده ۱۴ (مشارکت مدنی)", status: "pass", detail: code === "mosharekat_madani" ? "سهم منافع علی‌الحساب در قرارداد قید و تسویه در سررسید انجام می‌شود." : "ماده ۱۴ صرفاً بر مشارکت مدنی ناظر است؛ این محصول مشمول آن نیست.", reference: "ماده ۱۴ قانون عملیات بانکی بدون ربا" },
    { label: "دستورالعمل اعتباری و سقف تمرکز", status: spec.segment === "corporate" && spec.baseAmount > 50_000_000_000 ? "warn" : "pass", detail: spec.segment === "corporate" ? "برای مبالغ کلان، رعایت سقف تمرکز اعتباری نسبت به سرمایه پایه و اخذ مجوز کمیته اعتباری الزامی است." : "مبلغ مبنا در محدوده خرد/متوسط است و مشمول محدودیت تمرکز نمی‌شود.", reference: "دستورالعمل نحوه اعطای تسهیلات بانکی" },
    { label: "پوشش وثیقه متناسب با ریسک", status: spec.collateralCoverage >= 100 ? "pass" : "warn", detail: `پوشش وثیقه ${spec.collateralCoverage}٪ با LGD برآوردی ${round(lgd, 1)}٪ و PD ${round(pd, 1)}٪`, reference: "آیین‌نامه وثایق و ضمانت‌نامه‌ها" },
    { label: "وجوه التزام (جریمه تاخیر)", status: settings.latePenaltyRate <= 6 ? "pass" : "warn", detail: `نرخ وجه التزام ${settings.latePenaltyRate}٪ سالانه روی مبالغ سررسیده پرداخت‌نشده`, reference: "مصوبه شورای پول و اعتبار درباره وجه التزام" },
    { label: "تطبیق سررسید دارایی–بدهی (ALM)", status: baseScenario.minCumulative >= 0 ? "pass" : "warn", detail: `حداقل کف نقدینگی تجمعی ${round(baseScenario.minCumulative, 0)} و نسبت پوشش جریان نقدی ${round(baseScenario.minCoverage, 2)}`, reference: "الزامات مدیریت ریسک نقدینگی بانک مرکزی" },
    { label: "منبع تامین مالی تسهیلات قرض‌الحسنه", status: isQarz ? (spec.fundingCode === "qarz_deposit" ? "pass" : "warn") : "pass", detail: isQarz ? (spec.fundingCode === "qarz_deposit" ? "تامین از محل سپرده قرض‌الحسنه — مطابق الزام" : "تامین از محل سپرده سوددار برای قرض‌الحسنه هزینه‌زا و از منظر انطباق توصیه‌شده نیست.") : "نامربوط (عقد غیرقرض‌الحسنه)", reference: "دستورالعمل تسهیلات قرض‌الحسنه" },
    {
      label: "کف سودآوری و صیانت از منافع سپرده‌گذار",
      status: rulePassed ? "pass" : "warn",
      detail: isQarz
        ? `قرض‌الحسنه از قاعده کف سودآوری مستثناست؛ زیان انباشته ${round(netMarginPct, 2)}٪ اصل در برابر سقف تحمل ۸٪ (کارمزد ${spec.feeRate}٪ + منابع رایگان)`
        : `بازده دارایی ${round(assetYieldPct, 2)}٪ در برابر کف الزامی ${round(requiredMarginPct, 2)}٪ (هزینه تامین ${round(fundingRateUsed, 2)}٪ + ۲ واحد درصد) — اسپرید ناخالص ${round(grossSpreadPct, 2)} واحد`,
      reference: "قاعده طراحی موتور (بخش ۶)",
    },
  ];

  /* --- سلامت محصول --- */
  const complianceScore = (compliance.reduce((a, c) => a + (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0) / compliance.length) * 10;
  const profitScore = isQarz
    ? clamp(((netMarginPct + 8) / 8) * 30, 0, 30)
    : clamp((netSpreadPct / 5) * 30, 0, 30);
  const avgCoverage =
    baseScenario.gaps.reduce((s, g) => s + Math.min(3, g.coverage), 0) / Math.max(1, baseScenario.gaps.length);
  const riskScore = clamp(
    (clamp(baseScenario.minCoverage / 1.2, 0, 1) * 0.25 +
      clamp(avgCoverage / 2, 0, 1) * 0.2 +
      (baseScenario.minCumulative >= 0
        ? 0.15
        : clamp(1 + baseScenario.minCumulative / Math.max(1, spec.baseAmount), 0, 1) * 0.15) +
      clamp(critical.netCollateralCoverage / 120, 0, 1) * 0.2 +
      clamp(netSpreadPct / 4, 0, 1) * 0.2) *
      25,
    0,
    25,
  );
  const attractiveScore = (attractivenessTotal / 100) * 25;
  const operationalScore = clamp(((40 - processDays) / 30) * 10, 1, 10);
  const healthTotal = round(profitScore + riskScore + attractiveScore + complianceScore + operationalScore, 1);
  const grade = healthTotal >= 85 ? "عالی — قابل تصویب در کمیته محصول" : healthTotal >= 70 ? "خوب — تصویب مشروط به اصلاحات پیشنهادی" : healthTotal >= 55 ? "قابل قبول — نیازمند بازطراحی بخشی از پارامترها" : "ضعیف — پیش از عرضه باید بازطراحی اساسی شود";
  const tone = (v: number, good: number, warn: number) => (v >= good ? "good" : v >= warn ? "warn" : "bad") as "good" | "warn" | "bad";

  const health = {
    total: healthTotal,
    components: [
      { label: "سودآوری", max: 30, value: round(profitScore, 1), tone: tone(profitScore, 21, 12) },
      { label: "ریسک و نقدینگی", max: 25, value: round(riskScore, 1), tone: tone(riskScore, 18, 10) },
      { label: "جذابیت مشتری", max: 25, value: round(attractiveScore, 1), tone: tone(attractiveScore, 18, 10) },
      { label: "انطباق مقرراتی", max: 10, value: round(complianceScore, 1), tone: tone(complianceScore, 8, 5) },
      { label: "عملیاتی بودن", max: 10, value: round(operationalScore, 1), tone: tone(operationalScore, 7, 4) },
    ],
    grade,
  };

  /* --- قوت/ضعف و بهبود --- */
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (effectiveAnnualRate < marketBenchmarkEff) strengths.push(`نرخ مؤثر ${round(effectiveAnnualRate, 2)}٪ پایین‌تر از میانگین بازار (${marketBenchmarkEff}٪)`);
  else weaknesses.push(`نرخ مؤثر ${round(effectiveAnnualRate, 2)}٪ هم‌سطح یا بالاتر از میانگین بازار است و مزیت قیمتی ایجاد نمی‌کند`);
  if (spec.collateralCoverage <= 120) strengths.push(`وثیقه سبک با پوشش ${spec.collateralCoverage}٪ (${collateral.label})`);
  else weaknesses.push(`پوشش وثیقه ${spec.collateralCoverage}٪ برای مشتری ${segment.label} سنگین است`);
  if (rulePassed) {
    strengths.push(
      isQarz
        ? `زیان کنترل‌شده ${round(netMarginPct, 2)}٪ در محصول مسئولیت اجتماعی با تامین از منابع رایگان`
        : `اسپرد ناخالص ${round(grossSpreadPct, 2)} واحد درصد بالاتر از هزینه تامین — سودآوری منطبق با قاعده کف`,
    );
  } else {
    weaknesses.push(
      isQarz
        ? `زیان انباشته ${round(netMarginPct, 2)}٪ از سقف تحمل ۸٪ فراتر رفته است`
        : `بازده دارایی ${round(assetYieldPct, 2)}٪ زیر کف الزامی ${round(requiredMarginPct, 2)}٪ است`,
    );
  }
  if (netSpreadPct >= 2) strengths.push(`حاشیه خالص سالانه ${round(netSpreadPct, 2)}٪ پس از کسر هزینه عملیاتی و زیان اعتباری`);
  else weaknesses.push(`حاشیه خالص سالانه ${round(netSpreadPct, 2)}٪ پس از کسر هزینه‌ها نازک است`);
  if (baseScenario.minCumulative >= 0) strengths.push("بدون شکاف نقدینگی منفی در افق‌های کوتاه");
  else weaknesses.push(`شکاف نقدینگی منفی تجمعی تا ${round(baseScenario.minCumulative, 0)} در افق‌های کوتاه`);
  if (processDays <= 14) strengths.push(`فرایند سریع (${processDays} روز کاری) مناسب عرضه تمام‌دیجیتال`);
  else weaknesses.push(`فرایند ${processDays} روزه نسبت به رقبای دیجیتال کند است`);

  const improvements = [
    advice[0],
    `افزودن اختیار «تعویق یک قسط در سال» بدون جریمه برای کاهش نکول خرد (هزینه برآوردی ${round(spec.baseAmount * 0.004, 0)} ${spec.currency === "IRR" ? "ریال" : "تومان"})`,
    spec.collateralCode === "real_estate"
      ? "جایگزینی تدریجی رهن ملک با بیمه ضمانت‌نامه اعتباری برای کاهش زمان فرایند از ۱۴ به ۴ روز"
      : `افزودن لایه بیمه اعتباری روی وثیقه فعلی برای کاهش LGD از ${round(lgd, 1)}٪ به حدود ${round(Math.max(5, lgd - 12), 1)}٪`,
  ];

  const processFlow = [
    { title: "ثبت درخواست دیجیتال", detail: "ورود مشتری از اپ بانکی، انتخاب محصول و بارگذاری مدارک هویتی", days: 1 },
    { title: "اعتبارسنجی و امتیازدهی", detail: `استعلام سامانه اعتبارسنجی، محاسبه PD مشتری و تعیین سقف مجاز (PD نمونه ${round(pd, 1)}٪)`, days: 1 },
    { title: "ارزیابی وثیقه و ضامن", detail: `${collateral.label} — ارزیابی، استعلام صیاد/ثبت اسناد و تعیین پوشش ${spec.collateralCoverage}٪`, days: collateral.processDays },
    { title: "کمیته اعتباری / اختیارات شعبه", detail: spec.segment === "corporate" ? "طرح در کمیته اعتباری ستاد و اخذ مصوبه" : "تصمیم در سطح اختیارات شعبه/مرکز اعتباری", days: spec.segment === "corporate" ? 7 : 2 },
    { title: "انعقاد عقد و تنظیم قرارداد", detail: `امضای قرارداد «${def.name}» با درج نرخ اسمی، نرخ مؤثر و جدول اقساط`, days: 2 },
    { title: "تامین مالی و پرداخت", detail: `تخصیص از محل ${FUNDING_STRUCTURES[spec.fundingCode].label} و واریز به حساب مشتری/فروشنده`, days: 1 },
    { title: "پایش، وصول و مدیریت تاخیر", detail: `یادآوری خودکار، محاسبه وجه التزام ${settings.latePenaltyRate}٪ و ارجاع به واحد وصول در صورت نکول`, days: 0 },
    { title: "تسویه یا تمدید", detail: isQarz ? "تسویه نهایی و آزادسازی وثیقه" : "تسویه نهایی، انتقال مالکیت/آزادسازی وثیقه یا تمدید با قرارداد جدید", days: 2 },
  ];

  spec.assumedFields = Array.from(new Set([...assumed, ...SPEC_DEFAULTS.filter(([k]) => !provided.has(k)).map(([k]) => k)]));

  return {
    spec,
    settings,
    meta: {
      generatedAt: new Date().toISOString(),
      engineVersion: "۲٫۰ — موتور طراحی محصولات تسهیلاتی",
      currency: spec.currency === "IRR" ? "ریال" : "تومان",
      knowledgeDate: settings.knowledgeDate,
    },
    contract: {
      code: def.code,
      name: def.name,
      legalBasis: def.legalBasis,
      structure: def.structure,
      reasons,
      alternatives: need.alternatives.filter((x) => x !== code).slice(0, 3).map((x) => ({ code: x, name: CONTRACTS[x].name, why: CONTRACTS[x].usage })),
      warnings,
      inherentRisks: def.risks,
      mitigation: def.mitigation,
    },
    financial: {
      principal: spec.baseAmount,
      nominalRate: spec.nominalRate,
      effectiveNominalRate: round(effectiveNominalRate, 2),
      effectiveAnnualRate: round(effectiveAnnualRate, 2),
      monthlyRate: round(spec.nominalRate / 12, 3),
      installments: schedule.length,
      installmentAmount: schedule.length ? round(schedule[0].payment, 0) : 0,
      firstInstallment: schedule.length ? round(schedule[0].payment, 0) : 0,
      lastInstallment: schedule.length ? round(schedule[schedule.length - 1].payment, 0) : 0,
      totalPayments: round(totals.payment, 0),
      totalProfit: round(totals.profit, 0),
      totalFee: round(feeAmount, 0),
      formula: REPAYMENT_MODES[spec.repaymentMode].formula,
      schedule,
      scheduleSample: scheduleSample(schedule),
      earlySettlement,
      breakevenPeriod: breakevenInstallments,
    },
    liquidity: {
      tranches,
      weightedFundingRate: round(weightedFundingRate, 2),
      fundingCost: round(fundingCost, 0),
      gaps: baseScenario.gaps,
      scenarios,
      metrics: {
        coverageRatio: baseScenario.minCoverage,
        worstCumulative: baseScenario.minCumulative,
        criticalCollateralCoverage: round(critical.netCollateralCoverage, 1),
        nplCritical: critical.netMargin,
      },
      recommendations: liquidityRecommendations,
    },
    profitability: {
      grossProfit: round(totals.profit, 0),
      fees: round(feeAmount, 0),
      penalties: round(penalties, 0),
      fundingCost: round(fundingCost, 0),
      expectedLoss: round(expectedLoss, 0),
      opex: round(opex, 0),
      netMargin: round(netMargin, 0),
      netMarginPct: round(netMarginPct, 2),
      irr: round(effectiveNominalRate, 2),
      effectiveAnnual: round(effectiveAnnualRate, 2),
      allocatedCapital: round(allocatedCapital, 0),
      rorac: round(rorac, 2),
      breakevenInstallments,
      pd: round(pd, 2),
      lgd: round(lgd, 2),
      ead: round(ead, 0),
      assetYieldPct: round(assetYieldPct, 2),
      fundingRatePct: round(fundingRateUsed, 2),
      grossSpreadPct: round(grossSpreadPct, 2),
      netSpreadPct: round(netSpreadPct, 2),
      requiredMarginPct: round(requiredMarginPct, 2),
      rulePassed,
      sensitivity: {
        rows: rateOffsets.map((o) => (o === 0 ? "نرخ پایه" : o > 0 ? `+${o} واحد نرخ تامین` : `${o} واحد نرخ تامین`)),
        cols: nplLevels.map((x) => `NPL ${x}٪`),
        matrix: sensitivityMatrix,
      },
      advice,
    },
    attractiveness: { criteria, total: attractivenessTotal, competitors, verdict },
    health,
    compliance,
    swot: { strengths, weaknesses, improvements },
    processFlow,
  };
}

const SPEC_DEFAULTS: [string, string][] = [
  ["segment", "حقیقی خرد"],
  ["tenorMonths", "۳۶ ماه"],
  ["repaymentMode", "اقساط ماهانه مساوی"],
  ["collateralCode", "ضامن معتبر"],
  ["collateralCoverage", "پوشش پیشنهادی نوع وثیقه"],
  ["fundingCode", "سپرده بلندمدت منطبق"],
  ["nominalRate", "نرخ مصوب عقد"],
  ["competitiveEdge", "نرخ مؤثر پایین‌تر"],
  ["bankConstraints", "بدون محدودیت"],
];
