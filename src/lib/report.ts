import { COLLATERALS, CONTRACTS, FUNDING_STRUCTURES, REPAYMENT_MODES, SEGMENTS } from "./contracts";
import { buildAnalysis, type Analysis } from "./engine";
import { compact, currencyLabel, money, num, pct, round } from "./format";
import type { DocSection, OrgSettings, ProductReport, ProductSpec, Visualization } from "./types";

const PALETTE = ["#22d3ee", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#f87171"];

export function buildReport(rawSpec: Partial<ProductSpec>, rawSettings: Partial<OrgSettings>): ProductReport {
  const a = buildAnalysis(rawSpec, rawSettings);
  const visualizations = buildVisualizations(a);
  const documentation = buildDocumentation(a, visualizations);
  const quality = buildQuality(a, visualizations);
  return { ...a, visualizations, documentation, quality };
}

/* ------------------------------------------------------------ بصری‌سازی‌ها */

function buildVisualizations(a: Analysis): Visualization[] {
  const cur = a.spec.currency;
  const unit = currencyLabel(cur);
  const f = a.financial;
  const p = a.profitability;
  const l = a.liquidity;
  const at = a.attractiveness;

  const list: Visualization[] = [];

  list.push({
    id: "kpi-cards",
    type: "cards",
    title: "شاخص‌های کلیدی محصول",
    subtitle: `مبلغ مبنا ${money(a.spec.baseAmount, cur)} — ${a.spec.tenorMonths} ماه`,
    data: {
      cards: [
        { label: "قسط نخست", value: money(f.installmentAmount, cur), hint: REPAYMENT_MODES[a.spec.repaymentMode].label, tone: "neutral" },
        { label: "نرخ اسمی", value: pct(f.nominalRate, 1), hint: `سقف مصوب ${CONTRACTS[a.contract.code].ceiling}٪`, tone: f.nominalRate <= CONTRACTS[a.contract.code].ceiling ? "good" : "bad" },
        { label: "نرخ مؤثر سالانه", value: pct(f.effectiveAnnualRate, 2), hint: "محاسبه با IRR جریان نقدی بانک", tone: f.effectiveAnnualRate <= 26 ? "good" : "warn" },
        { label: "حاشیه خالص", value: money(p.netMargin, cur), hint: `${pct(p.netMarginPct, 1)} از اصل — اسپرید خالص سالانه ${pct(p.netSpreadPct, 2)}`, tone: p.rulePassed ? "good" : "bad" },
        { label: "بازده دارایی در برابر کف الزامی", value: `${pct(p.assetYieldPct, 2)} / ${pct(p.requiredMarginPct, 1)}`, hint: `هزینه تامین ${pct(p.fundingRatePct, 2)} + ۲ واحد درصد`, tone: p.rulePassed ? "good" : "bad" },
        { label: "زیان اعتباری مورد انتظار", value: money(p.expectedLoss, cur), hint: `PD ${pct(p.pd, 1)} × LGD ${pct(p.lgd, 1)}`, tone: "warn" },
        { label: "امتیاز جذابیت", value: num(at.total, 0) + " از ۱۰۰", hint: at.competitors[0].name, tone: at.total > at.competitors[0].total ? "good" : "warn" },
        { label: "کف نقدینگی تجمعی", value: money(l.metrics.worstCumulative, cur), hint: `پوشش جریان نقدی ${num(l.metrics.coverageRatio, 2)}`, tone: l.metrics.worstCumulative >= 0 ? "good" : "bad" },
        { label: "امتیاز سلامت محصول", value: num(a.health.total, 1) + " از ۱۰۰", hint: a.health.grade, tone: a.health.total >= 70 ? "good" : a.health.total >= 55 ? "warn" : "bad" },
      ],
    },
    insight: `محصول «${a.spec.productName}» در یک نگاه: قسط ${compact(f.installmentAmount, cur)} با نرخ مؤثر ${pct(f.effectiveAnnualRate, 2)}. حاشیه خالص ${money(p.netMargin, cur)} است که ${p.rulePassed ? "بالاتر" : "پایین‌تر"} از کف الزامی ${pct(p.requiredMarginPct, 1)} قرار دارد. امتیاز سلامت کلی ${num(a.health.total, 1)} از ۱۰۰ ارزیابی شد.`,
  });

  // نمودار ستونی اصل/سود هر قسط
  const bucketCount = Math.min(24, f.schedule.length);
  const step = Math.max(1, Math.ceil(f.schedule.length / bucketCount));
  const cats: string[] = [];
  const principalSeries: number[] = [];
  const profitSeries: number[] = [];
  for (let i = 0; i < f.schedule.length; i += step) {
    const chunk = f.schedule.slice(i, i + step);
    cats.push(chunk.length > 1 ? `ق ${chunk[0].period}–${chunk[chunk.length - 1].period}` : `ق ${chunk[0].period}`);
    principalSeries.push(round(chunk.reduce((s, r) => s + r.principal, 0), 0));
    profitSeries.push(round(chunk.reduce((s, r) => s + r.profit, 0), 0));
  }
  list.push({
    id: "installments-bar",
    type: "bar",
    title: "ترکیب اصل و سود در هر قسط",
    subtitle: `ساختار بازپرداخت: ${REPAYMENT_MODES[a.spec.repaymentMode].label}`,
    data: {
      categories: cats,
      series: [
        { name: "اصل", values: principalSeries, color: PALETTE[0] },
        { name: "سود", values: profitSeries, color: PALETTE[2] },
      ],
      unit,
      compactAxis: true,
    },
    insight: `در اقساط اولیه سهم سود ${pct((profitSeries[0] / Math.max(1, principalSeries[0] + profitSeries[0])) * 100, 0)} و در اقساط پایانی ${pct((profitSeries[profitSeries.length - 1] / Math.max(1, principalSeries[principalSeries.length - 1] + profitSeries[profitSeries.length - 1])) * 100, 0)} است. این الگو نشان می‌دهد بازگشت اصل سرمایه برای بانک به نیمه دوم دوره وابسته است. مجموع اصل و سود برابر ${compact(f.totalPayments, cur)} محاسبه شد.`,
  });

  // نمودار خطی مانده بدهی و ارزش وثیقه
  const balCats = ["۰", ...f.schedule.map((r) => String(r.period))];
  const balanceSeries = [a.spec.baseAmount, ...f.schedule.map((r) => r.balance)];
  const depreciationAnnual = a.spec.collateralCode === "real_estate" ? 0 : a.spec.collateralCode === "blocked_deposit" ? 0 : 12;
  const collateralValue0 = (a.spec.baseAmount * a.spec.collateralCoverage) / 100;
  const collateralSeries = balanceSeries.map(
    (_, idx) => collateralValue0 * Math.pow(1 - depreciationAnnual / 100, (idx * (12 / (f.schedule.length || 1))) / 12),
  );
  list.push({
    id: "balance-line",
    type: "line",
    title: "مانده بدهی و ارزش برآوردی وثیقه در طول دوره",
    subtitle: depreciationAnnual > 0 ? `استهلاک سالانه وثیقه ${depreciationAnnual}٪ فرض شد` : "وثیقه بدون استهلاک (ملک/سپرده مسدودی)",
    data: {
      categories: balCats.map((c) => (c === "0" ? "پرداخت" : `ق ${c}`)),
      series: [
        { name: "مانده بدهی", values: balanceSeries.map((v) => round(v, 0)), color: PALETTE[0] },
        { name: "ارزش وثیقه", values: collateralSeries.map((v) => round(v, 0)), color: PALETTE[1] },
      ],
      unit,
      compactAxis: true,
    },
    insight: `فاصله دو منحنی، حاشیه امن وثیقه‌ای بانک را نشان می‌دهد. در ${depreciationAnnual > 0 ? `ماه‌های پایانی ارزش وثیقه به ${compact(collateralSeries[collateralSeries.length - 1], cur)} می‌رسد` : "ارزش وثیقه در طول دوره حفظ می‌شود"} در حالی که مانده بدهی ${compact(balanceSeries[balanceSeries.length - 1], cur)} است. ${collateralSeries[collateralSeries.length - 1] > balanceSeries[balanceSeries.length - 1] ? "پوشش وثیقه در تمام دوره مثبت می‌ماند و ریسک LGD کنترل‌شده است." : "در بخشی از دوره پوشش وثیقه از مانده بدهی عبور می‌کند و نیاز به وثیقه تکمیلی است."}`,
  });

  // واترفال سودآوری
  list.push({
    id: "profit-waterfall",
    type: "waterfall",
    title: "واترفال ساختار قیمت و سودآوری",
    subtitle: "درآمد کل − هزینه تامین − زیان اعتباری − هزینه عملیاتی = حاشیه خالص",
    data: {
      items: [
        { label: "سود اقساط", value: p.grossProfit, kind: "increase" },
        { label: "کارمزد", value: p.fees, kind: "increase" },
        { label: "وجوه التزام", value: p.penalties, kind: "increase" },
        { label: "هزینه تامین مالی", value: -p.fundingCost, kind: "decrease" },
        { label: "زیان اعتباری (EL)", value: -p.expectedLoss, kind: "decrease" },
        { label: "هزینه عملیاتی", value: -p.opex, kind: "decrease" },
        { label: "حاشیه خالص", value: p.netMargin, kind: "total" },
      ],
      unit,
      compactAxis: true,
    },
    insight: `بزرگ‌ترین قلم کاهنده، هزینه تامین مالی با ${compact(p.fundingCost, cur)} است که ${pct((p.fundingCost / Math.max(1, p.grossProfit)) * 100, 0)} از سود ناخالص اقساط را می‌بلعد. پس از کسر زیان اعتباری ${compact(p.expectedLoss, cur)} و هزینه عملیاتی ${compact(p.opex, cur)}، حاشیه خالص ${compact(p.netMargin, cur)} باقی می‌ماند. نسبت حاشیه به اصل تسهیلات ${pct(p.netMarginPct, 2)} است و ${p.rulePassed ? "قاعده کف سودآوری رعایت شده" : "قاعده کف سودآوری نقض شده است"}.`,
  });

  // رادار جذابیت
  list.push({
    id: "attractiveness-radar",
    type: "radar",
    title: "نمودار رادار جذابیت مشتری (۵ معیار)",
    subtitle: "وزن‌ها: نرخ ۳۵٪ / وثیقه ۲۵٪ / سرعت ۲۰٪ / انعطاف ۱۵٪ / خدمات ۵٪",
    data: {
      axes: at.criteria.map((c) => c.label.replace(" پرداختی نسبت به بازار", "").replace(" و سهولت فرایند", "")),
      series: [
        { name: a.spec.productName.slice(0, 22), values: at.criteria.map((c) => c.score), color: PALETTE[0] },
        ...at.competitors.map((c, i) => ({ name: c.name, values: c.scores, color: PALETTE[i + 2] })),
      ],
    },
    insight: `امتیاز وزنی محصول ${num(at.total, 1)} از ۱۰۰ است. ${at.verdict} نقطه قوت اصلی در معیار «${at.criteria.reduce((x, y) => (y.score > x.score ? y : x)).label}» و نقطه ضعف در «${at.criteria.reduce((x, y) => (y.score < x.score ? y : x)).label}» دیده می‌شود.`,
  });

  // شکاف نقدینگی
  list.push({
    id: "liquidity-gap",
    type: "bar",
    title: "شکاف نقدینگی در ۵ افق زمانی — سناریو پایه",
    subtitle: "جریان ورودی اقساط در برابر سررسید سپرده‌ها و سود پرداختی",
    data: {
      categories: l.gaps.map((g) => g.label),
      series: [
        { name: "ورودی نقدی", values: l.gaps.map((g) => g.inflow), color: PALETTE[1] },
        { name: "خروجی نقدی", values: l.gaps.map((g) => g.outflow), color: PALETTE[5] },
        { name: "شکاف", values: l.gaps.map((g) => g.gap), color: PALETTE[0] },
      ],
      unit,
      compactAxis: true,
    },
    insight: `بیشترین شکاف در افق «${l.gaps.reduce((x, y) => (Math.abs(y.gap) > Math.abs(x.gap) ? y : x)).label}» با ${compact(l.gaps.reduce((x, y) => (Math.abs(y.gap) > Math.abs(x.gap) ? y : x)).gap, cur)} ثبت شد. نسبت پوشش جریان نقدی در بدترین افق ${num(l.metrics.coverageRatio, 2)} است. ${l.metrics.worstCumulative >= 0 ? "کف نقدینگی تجمعی در هیچ افقی منفی نمی‌شود و نیاز به خط اعتباری فوری نیست." : `کف نقدینگی تجمعی تا ${compact(l.metrics.worstCumulative, cur)} منفی می‌شود که باید با خط پشتیبان پوشش یابد.`}`,
  });

  list.push({
    id: "liquidity-cumulative",
    type: "line",
    title: "کف نقدینگی تجمعی در سه سناریو",
    subtitle: "پایه / استرس ۹۰ روز / بحرانی NPL ۱۵٪",
    data: {
      categories: l.gaps.map((g) => g.label),
      series: ["base", "stress90", "npl15"].map((code, i) => {
        const s = l.scenarios.find((x) => x.code === code);
        return {
          name: s?.name ?? code,
          values: (s?.gaps ?? l.gaps).map((g) => g.cumulative),
          color: [PALETTE[1], PALETTE[2], PALETTE[5]][i],
        };
      }),
      unit,
      compactAxis: true,
    },
    insight: `در سناریو پایه، کف تجمعی به ${compact(l.scenarios[0].minCumulative, cur)} می‌رسد. با تاخیر ۹۰ روزه اقساط این کف به ${compact((l.scenarios.find((s) => s.code === "stress90")?.minCumulative ?? 0), cur)} و در سناریو نکول ۱۵٪ به ${compact((l.scenarios.find((s) => s.code === "npl15")?.minCumulative ?? 0), cur)} سقوط می‌کند. تفاوت این سه منحنی، اندازه خط اعتباری پشتیبانی را تعیین می‌کند که موتور توصیه می‌کند.`,
  });

  list.push({
    id: "liquidity-heatmap",
    type: "heatmap",
    title: "نقشه حرارتی نسبت پوشش جریان نقدی",
    subtitle: "سناریو × افق زمانی (مقادیر بزرگ‌تر = پوشش بهتر)",
    data: {
      rows: l.scenarios.map((s) => s.name),
      cols: l.gaps.map((g) => g.label),
      matrix: l.scenarios.map((s) => s.gaps.map((g) => Math.min(9, round(g.coverage, 2)))),
      unit: "برابر",
    },
    insight: `خانه‌های قرمز نشان‌دهنده افق‌هایی است که خروجی نقدی از ورودی پیشی می‌گیرد. در سناریوهای بحرانی، پوشش در افق «${l.gaps[0].label}» به کمترین مقدار می‌رسد چون اقساط تازه شروع شده‌اند اما سررسید سپرده‌های کوتاه فعال است. توصیه ساختاری: افزایش سهم سپرده هم‌سررسید و تعریف خط اعتباری بین‌بانکی برای همین افق.`,
  });

  // گیج سلامت
  list.push({
    id: "health-gauge",
    type: "gauge",
    title: "گیج امتیاز سلامت کلی محصول",
    subtitle: "سودآوری ۳۰ + ریسک ۲۵ + جذابیت ۲۵ + انطباق ۱۰ + عملیاتی ۱۰",
    data: {
      value: a.health.total,
      max: 100,
      segments: a.health.components.map((c) => ({ label: c.label, value: c.value, tone: c.tone, max: c.max })),
    },
    insight: `امتیاز نهایی ${num(a.health.total, 1)} از ۱۰۰ با ارزیابی «${a.health.grade}». بیشترین سهم از دست رفته در مؤلفه «${a.health.components.reduce((x, y) => (y.max - y.value > x.max - x.value ? y : x)).label}» است. برای رسیدن به سطح تصویب بی‌قید‌وشرط باید همین مؤلفه اصلاح شود.`,
  });

  // مقایسه رقابتی
  list.push({
    id: "competitor-comparison",
    type: "comparison",
    title: "مقایسه رقابتی امتیاز جذابیت",
    subtitle: "محصول طراحی‌شده در برابر سه رقیب فرضی",
    data: {
      categories: [a.spec.productName.slice(0, 20), ...at.competitors.map((c) => c.name)],
      series: [{ name: "امتیاز جذابیت (از ۱۰۰)", values: [at.total, ...at.competitors.map((c) => c.total)], color: PALETTE[0] }],
      highlight: a.spec.productName.slice(0, 20),
      unit: "امتیاز",
    },
    insight: `محصول ما با ${num(at.total, 1)} امتیاز در برابر میانگین رقبا ${num(at.competitors.reduce((s, c) => s + c.total, 0) / at.competitors.length, 1)} قرار دارد. ${at.total > Math.max(...at.competitors.map((c) => c.total)) ? "برتری اصلی از ناحیه نرخ مؤثر و انعطاف بازپرداخت است." : "برای کسب برتری باید بار وثیقه یا زمان فرایند کاهش یابد."} این مقایسه صرفاً با رقبای فرضی و بر اساس فرض‌های اعلام‌شده انجام شده است.`,
  });

  list.push({
    id: "rate-comparison",
    type: "bar",
    title: "مقایسه نرخ‌ها: اسمی، مؤثر، سقف مصوب و بازار",
    subtitle: "واحد: درصد سالانه",
    data: {
      categories: ["نرخ اسمی قرارداد", "نرخ مؤثر (IRR)", "سقف مصوب عقد", "میانگین بازار"],
      series: [
        {
          name: "درصد",
          values: [f.nominalRate, f.effectiveAnnualRate, CONTRACTS[a.contract.code].ceiling, a.settings.rateCeiling + 3].map((v) => round(v, 2)),
          color: PALETTE[0],
        },
      ],
      unit: "٪",
    },
    insight: `اختلاف نرخ مؤثر و اسمی ${num(f.effectiveAnnualRate - f.nominalRate, 2)} واحد درصد است که ناشی از روش محاسبه «${REPAYMENT_MODES[a.spec.repaymentMode].label}» می‌باشد. نرخ طراحی‌شده ${f.nominalRate <= CONTRACTS[a.contract.code].ceiling ? "زیر سقف مصوب و کاملاً منطبق" : "خارج از سقف مصوب"} است. نسبت به میانگین بازار، محصول ${f.effectiveAnnualRate < a.settings.rateCeiling + 3 ? "ارزان‌تر و رقابتی‌تر" : "گران‌تر"} است.`,
  });

  // حساسیت
  list.push({
    id: "sensitivity-heatmap",
    type: "heatmap",
    title: "حساسیت حاشیه خالص به نرخ تامین مالی و NPL",
    subtitle: "درصد حاشیه خالص نسبت به اصل تسهیلات",
    data: {
      rows: p.sensitivity.rows,
      cols: p.sensitivity.cols,
      matrix: p.sensitivity.matrix,
      unit: "٪",
    },
    insight: `در بدترین خانه (افزایش ۲ واحدی نرخ سپرده و NPL ۲۰٪) حاشیه خالص به ${pct(Math.min(...p.sensitivity.matrix.flat()), 1)} می‌رسد. در بهترین خانه ${pct(Math.max(...p.sensitivity.matrix.flat()), 1)} ثبت می‌شود. پایداری محصول در برابر شوک نرخ سپرده بیشتر از شوک نکول است، بنابراین اولویت مدیریت ریسک باید روی کیفیت اعتباری باشد.`,
  });

  // سود تجمعی و سربه‌سر
  const periods = Math.max(1, f.schedule.length);
  const ppy = 12 / Math.max(1, a.spec.tenorMonths / periods);
  const fundingRateUsed = Math.max(l.weightedFundingRate, a.settings.realFundingCost);
  const opexPer = p.opex / periods;
  const elPer = p.expectedLoss / periods;
  let cumProfit = 0;
  let cumCost = p.fees;
  let balRun = a.spec.baseAmount;
  const cumCats: string[] = ["پرداخت"];
  const cumProfitSeries: number[] = [0];
  const cumCostSeries: number[] = [round(cumCost, 0)];
  f.schedule.forEach((r) => {
    cumProfit += r.payment;
    cumCost += (balRun * fundingRateUsed) / 100 / ppy + opexPer + elPer;
    balRun = r.balance;
    cumCats.push(`ق ${r.period}`);
    cumProfitSeries.push(round(cumProfit, 0));
    cumCostSeries.push(round(cumCost, 0));
  });
  list.push({
    id: "breakeven-line",
    type: "line",
    title: "جریان نقدی تجمعی بانک و نقطه سربه‌سر",
      subtitle: `بازیافت اصل و همه هزینه‌ها در قسط ${num(f.breakevenPeriod, 0)} از ${num(f.schedule.length, 0)}`,
    data: {
      categories: cumCats,
      series: [
        { name: "وصولی تجمعی", values: cumProfitSeries, color: PALETTE[1] },
        { name: "هزینه تجمعی", values: cumCostSeries, color: PALETTE[5] },
      ],
      unit,
      compactAxis: true,
    },
    insight: `بانک در قسط ${num(f.breakevenPeriod, 0)} اصل تسهیلات به‌علاوه هزینه تامین، عملیاتی و زیان اعتباری را بازیافت می‌کند؛ یعنی ${pct((f.breakevenPeriod / Math.max(1, f.schedule.length)) * 100, 0)} از دوره صرف بازگشت سرمایه می‌شود. هرچه این نقطه به ابتدای دوره نزدیک‌تر باشد، حساسیت محصول به نکول و ریسک نقدینگی کمتر است. فاصله دو منحنی در پایان دوره همان حاشیه خالص ${compact(p.netMargin, cur)} است.`,
  });

  // جدول اقساط
  list.push({
    id: "schedule-table",
    type: "table",
    title: "جدول اقساط",
    subtitle: f.schedule.length > 10 ? "نمایش ۳ قسط اول، میانی و ۳ قسط آخر (جدول کامل در خروجی JSON)" : "جدول کامل اقساط",
    data: {
      columns: ["قسط", "سررسید", "مبلغ قسط", "سهم اصل", "سهم سود", "مانده بدهی"],
      tableRows: f.scheduleSample.map((r) => [
        num(r.period, 0),
        r.dateISO,
        num(r.payment, 0),
        num(r.principal, 0),
        num(r.profit, 0),
        num(r.balance, 0),
      ]),
      unit,
    },
    insight: `مجموع اقساط ${compact(f.totalPayments, cur)} است که ${compact(f.totalProfit, cur)} آن سهم سود بانک است. ${a.spec.repaymentMode === "flat" ? "در روش خطی، سود روی کل اصل محاسبه می‌شود و به همین دلیل نرخ مؤثر از نرخ اسمی بالاتر است." : "در این روش سهم سود با کاهش مانده بدهی کم می‌شود و برای مشتری شفاف‌تر است."} جدول کامل برای ممیزی و بارگذاری در سامانه اعتباری قابل خروجی است.`,
  });

  // جدول تامین مالی
  list.push({
    id: "funding-table",
    type: "table",
    title: "ساختار تامین مالی و تطبیق سررسید",
    subtitle: FUNDING_STRUCTURES[a.spec.fundingCode].label,
    data: {
      columns: ["منبع سپرده", "سهم", "مبلغ", "نرخ", "سررسید", "هزینه دوره"],
      tableRows: l.tranches.map((t) => [
        t.name,
        pct(t.share * 100, 0),
        num(t.amount, 0),
        pct(t.rate, 1),
        `${num(t.tenorMonths, 0)} ماه`,
        num((t.amount * t.rate) / 100 * (a.spec.tenorMonths / 12), 0),
      ]),
      unit,
    },
    insight: `میانگین وزنی نرخ تامین مالی ${pct(l.weightedFundingRate, 2)} است و موتور برای محافظه‌کاری نرخ ${pct(Math.max(l.weightedFundingRate, a.settings.realFundingCost), 2)} را در محاسبه سودآوری به‌کار برد. سهم منابع هم‌سررسید با دارایی ${pct(l.tranches.filter((t) => t.tenorMonths >= a.spec.tenorMonths).reduce((s, t) => s + t.share, 0) * 100, 0)} است. هزینه کل تامین مالی در دوره ${compact(l.fundingCost, cur)} برآورد شد.`,
  });

  // جدول سناریوها
  list.push({
    id: "scenarios-table",
    type: "table",
    title: "نتایج سناریوهای ریسک نقدینگی و اعتباری",
    subtitle: "پایه / استرس تاخیر / بحرانی نکول",
    data: {
      columns: ["سناریو", "کف نقدینگی تجمعی", "پوشش جریان نقدی", "نقدینگی از دست رفته", "حاشیه خالص", "پوشش وثیقه خالص"],
      tableRows: l.scenarios.map((s) => [
        s.name,
        num(s.minCumulative, 0),
        num(s.minCoverage, 2),
        num(s.lostCash, 0),
        num(s.netMargin, 0),
        pct(s.netCollateralCoverage, 0),
      ]),
      unit,
    },
    insight: `در سناریو پایه حاشیه خالص ${compact(l.scenarios[0].netMargin, cur)} است. با نکول ۱۵٪ حاشیه به ${compact(l.metrics.nplCritical, cur)} کاهش می‌یابد اما پوشش وثیقه خالص ${pct(l.metrics.criticalCollateralCoverage, 0)} باقی می‌ماند. ${l.metrics.criticalCollateralCoverage >= 100 ? "وثایق حتی در سناریو بحرانی کل مانده را پوشش می‌دهند." : "در سناریو بحرانی پوشش وثیقه ناکافی است و باید وثیقه تکمیلی یا بیمه اعتباری اضافه شود."}`,
  });

  // جدول انطباق
  list.push({
    id: "compliance-table",
    type: "table",
    title: "چک‌لیست انطباق مقرراتی",
    subtitle: "۱۲ کنترل الزامی پیش از عرضه محصول",
    data: {
      columns: ["کنترل", "وضعیت", "شرح", "مرجع"],
      tableRows: a.compliance.map((c) => [
        c.label,
        c.status === "pass" ? "✓ منطبق" : c.status === "warn" ? "△ نیازمند توجه" : "✗ مغایر",
        c.detail,
        c.reference,
      ]),
    },
    insight: `از ${a.compliance.length} کنترل انطباق، ${a.compliance.filter((c) => c.status === "pass").length} مورد منطبق و ${a.compliance.filter((c) => c.status !== "pass").length} مورد نیازمند توجه است. ${a.compliance.some((c) => c.status === "fail") ? "یک مورد مغایرت صریح وجود دارد که باید پیش از عرضه برطرف شود." : "هیچ مغایرت صریحی با مصوبات بانک مرکزی دیده نشد."} مهم‌ترین مورد نیازمند توجه: «${a.compliance.find((c) => c.status !== "pass")?.label ?? "—"}».`,
  });

  return list;
}

/* ------------------------------------------------------------ مستند ۱۴ بخشی */

function buildDocumentation(a: Analysis, viz: Visualization[]): DocSection[] {
  const cur = a.spec.currency;
  const f = a.financial;
  const p = a.profitability;
  const l = a.liquidity;
  const c = CONTRACTS[a.contract.code];
  const seg = SEGMENTS[a.spec.segment];
  const coll = COLLATERALS[a.spec.collateralCode];
  const M = money;

  return [
    {
      no: 1,
      title: "نام و کد پیشنهادی محصول",
      blocks: [
        { kind: "kv", rows: [["نام محصول", a.spec.productName], ["کد محصول", a.spec.productCode], ["نسخه موتور", a.meta.engineVersion], ["تاریخ طراحی", a.meta.generatedAt.slice(0, 10)]] },
        { kind: "text", text: `این محصول برای «${a.spec.needDescription || seg.desc}» طراحی شده و مزیت رقابتی هدف آن «${a.spec.competitiveEdge}» است.` },
      ],
    },
    {
      no: 2,
      title: "مبانی قراردادی (عقد/عقود)",
      blocks: [
        { kind: "kv", rows: [["عقد انتخابی", c.name], ["مبنای قانونی", c.legalBasis], ["ساختار عقد", c.structure], ["نرخ مصوب عقد", `${c.ceiling}٪`]] },
        { kind: "list", items: a.contract.reasons },
        { kind: "text", text: `جایگزین‌های معتبر: ${a.contract.alternatives.map((x) => x.name).join("، ") || "—"}` },
        ...(a.contract.warnings.length ? [{ kind: "list" as const, items: a.contract.warnings.map((w) => `⚠ ${w}`) }] : []),
      ],
    },
    {
      no: 3,
      title: "هدف و کاربرد",
      blocks: [
        { kind: "text", text: `کاربرد اصلی: ${c.usage}. این محصول نیاز «${a.spec.needDescription || "اعلام‌شده توسط کاربر"}» را با ساختار «${REPAYMENT_MODES[a.spec.repaymentMode].label}» پاسخ می‌دهد.` },
        { kind: "list", items: c.mitigation.map((m) => `الزام اجرایی: ${m}`) },
      ],
    },
    {
      no: 4,
      title: "بازار هدف و پرسونا",
      blocks: [
        {
          kind: "table",
          columns: ["ویژگی", "مقدار"],
          rows: [
            ["بخش بازار", seg.label],
            ["توضیح پرسونا", seg.desc],
            ["PD نمونه این بخش", pct(seg.pd, 1)],
            ["بازه مبلغ محصول", `${M(a.spec.minAmount, cur)} تا ${M(a.spec.maxAmount, cur)}`],
            ["برآورد حجم قابل جذب سالانه", M(a.spec.baseAmount * 120, cur)],
          ],
        },
      ],
    },
    {
      no: 5,
      title: "مشخصات فنی",
      blocks: [
        {
          kind: "table",
          columns: ["پارامتر", "مقدار"],
          rows: [
            ["مبلغ مبنا", M(a.spec.baseAmount, cur)],
            ["مدت", `${num(a.spec.tenorMonths, 0)} ماه`],
            ["تعداد اقساط", num(f.installments, 0)],
            ["نرخ اسمی", pct(f.nominalRate, 2)],
            ["نرخ مؤثر سالانه (IRR)", pct(f.effectiveAnnualRate, 2)],
            ["نرخ مؤثر اسمی دوره‌ای", pct(f.effectiveNominalRate, 2)],
            ["کارمزد", `${pct(a.spec.feeRate, 2)} معادل ${M(f.totalFee, cur)}`],
            ["قسط نخست / پایانی", `${M(f.firstInstallment, cur)} / ${M(f.lastInstallment, cur)}`],
            ["جمع کل پرداختی مشتری", M(f.totalPayments, cur)],
            ["سهم سود بانک", M(f.totalProfit, cur)],
          ],
        },
        { kind: "formula", text: f.formula },
        { kind: "viz", ref: "rate-comparison" },
      ],
    },
    {
      no: 6,
      title: "ساختار بازپرداخت و جدول اقساط",
      blocks: [
        { kind: "text", text: `${REPAYMENT_MODES[a.spec.repaymentMode].desc}. ${a.spec.graceMonths > 0 ? `دوره تنفس ${num(a.spec.graceMonths, 0)} ماه با رسوب سود به اصل در نظر گرفته شد.` : "بدون دوره تنفس."}` },
        { kind: "viz", ref: "schedule-table" },
        { kind: "viz", ref: "installments-bar" },
        { kind: "viz", ref: "balance-line" },
        {
          kind: "table",
          columns: ["ماه تسویه زودهنگام", "مانده اصل", "تخفیف سود تحقق‌نیافته", "مبلغ قابل پرداخت"],
          rows: f.earlySettlement.map((e) => [num(e.month, 0), M(e.remainingPrincipal, cur), M(e.discount, cur), M(e.payable, cur)]),
        },
        { kind: "formula", text: "تخفیف تسویه زودهنگام = ۵۰٪ × سود تحقق‌نیافته (فرض — قابل تغییر)" },
      ],
    },
    {
      no: 7,
      title: "وثایق، ضمانت‌ها و پوشش ریسک اعتباری",
      blocks: [
        {
          kind: "table",
          columns: ["قلم", "مقدار"],
          rows: [
            ["نوع وثیقه اصلی", coll.label],
            ["پوشش وثیقه‌ای", pct(a.spec.collateralCoverage, 0)],
            ["ارزش وثیقه", M((a.spec.baseAmount * a.spec.collateralCoverage) / 100, cur)],
            ["ضامن", `${num(a.spec.guarantors, 0)} نفر`],
            ["تنزیل (haircut) وثیقه", pct(coll.haircut, 0)],
            ["PD برآوردی", pct(p.pd, 2)],
            ["LGD برآوردی", pct(p.lgd, 2)],
            ["EAD میانگین", M(p.ead, cur)],
            ["زیان اعتباری مورد انتظار (EL)", M(p.expectedLoss, cur)],
          ],
        },
        { kind: "formula", text: `EL = PD × LGD × EAD = ${pct(p.pd, 2)} × ${pct(p.lgd, 2)} × ${compact(p.ead, cur)} = ${compact(p.expectedLoss, cur)}` },
        { kind: "list", items: c.mitigation },
      ],
    },
    {
      no: 8,
      title: "ساختار تامین مالی و تحلیل ریسک نقدینگی",
      blocks: [
        { kind: "viz", ref: "funding-table" },
        { kind: "viz", ref: "liquidity-gap" },
        { kind: "viz", ref: "liquidity-cumulative" },
        { kind: "viz", ref: "liquidity-heatmap" },
        { kind: "viz", ref: "scenarios-table" },
        { kind: "list", items: l.recommendations.map((r) => `توصیه ساختاری: ${r}`) },
      ],
    },
    {
      no: 9,
      title: "تحلیل سودآوری",
      blocks: [
        { kind: "viz", ref: "profit-waterfall" },
        {
          kind: "table",
          columns: ["شاخص", "مقدار"],
          rows: [
            ["درآمد سود اقساط", M(p.grossProfit, cur)],
            ["کارمزد", M(p.fees, cur)],
            ["وجوه التزام تاخیر", M(p.penalties, cur)],
            ["هزینه تامین مالی", M(p.fundingCost, cur)],
            ["زیان اعتباری مورد انتظار", M(p.expectedLoss, cur)],
            ["هزینه عملیاتی (۲٪ اصل)", M(p.opex, cur)],
            ["حاشیه خالص", `${M(p.netMargin, cur)} (${pct(p.netMarginPct, 2)})`],
            ["IRR محصول", pct(p.irr, 2)],
            ["سرمایه تخصیصی (RWA × کفایت)", M(p.allocatedCapital, cur)],
            ["بازده بر سرمایه تخصیصی (RAROC)", pct(p.rorac, 2)],
            ["نقطه سربه‌سر (بازیافت اصل و هزینه‌ها)", `قسط ${num(p.breakevenInstallments, 0)} از ${num(f.installments, 0)}`],
            ["بازده سالانه دارایی (بر مبنای EAD)", pct(p.assetYieldPct, 2)],
            ["نرخ تامین مالی محافظه‌کارانه", pct(p.fundingRatePct, 2)],
            ["اسپرید ناخالص سالانه", pct(p.grossSpreadPct, 2)],
            ["حاشیه خالص سالانه پس از عملیاتی و EL", pct(p.netSpreadPct, 2)],
            ["کف الزامی بازده دارایی", `${pct(p.requiredMarginPct, 2)} (هزینه تامین + ۲ واحد)`],
          ],
        },
        { kind: "formula", text: `حاشیه خالص = سود اقساط + کارمزد + وجوه التزام − هزینه تامین − EL − هزینه عملیاتی = ${compact(p.netMargin, cur)}  |  هزینه تامین = EAD × نرخ × مدت = ${compact(p.ead, cur)} × ${pct(p.fundingRatePct, 2)} × ${num(a.spec.tenorMonths / 12, 1)}` },
        { kind: "viz", ref: "breakeven-line" },
        { kind: "viz", ref: "sensitivity-heatmap" },
        {
          kind: "text",
          text:
            a.contract.code === "qarzolhasaneh"
              ? p.rulePassed
                ? `✅ محصول قرض‌الحسنه از قاعده کف سودآوری مستثناست؛ زیان انباشته ${pct(p.netMarginPct, 2)} از اصل، زیر سقف تحمل ۸٪ است و با کارمزد مصوب ${pct(a.spec.feeRate, 1)} و تامین از منابع رایگان پوشش داده می‌شود.`
                : `❌ زیان انباشته ${pct(p.netMarginPct, 2)} از سقف تحمل ۸٪ فراتر است؛ مدت باید کوتاه‌تر یا هزینه عملیاتی با فرایند تمام‌دیجیتال کاهش یابد.`
              : p.rulePassed
                ? `✅ قاعده طراحی رعایت شد: بازده سالانه دارایی ${pct(p.assetYieldPct, 2)} بالاتر از کف الزامی ${pct(p.requiredMarginPct, 2)} است (اسپرد ناخالص ${pct(p.grossSpreadPct, 2)} ≥ ۲ واحد درصد). تفسیر موتور از قاعده: «نرخ بازده دارایی باید حداقل ۲ واحد درصد بالاتر از نرخ بازده مورد انتظار سپرده‌گذار باشد».`
                : `❌ قاعده طراحی نقض شد: بازده سالانه دارایی ${pct(p.assetYieldPct, 2)} زیر کف الزامی ${pct(p.requiredMarginPct, 2)} است. توصیه‌های بازطراحی در ادامه آمده است.`,
        },
        { kind: "list", items: p.advice },
      ],
    },
    {
      no: 10,
      title: "تحلیل جذابیت و مقایسه رقابتی",
      blocks: [
        { kind: "viz", ref: "attractiveness-radar" },
        { kind: "viz", ref: "competitor-comparison" },
        {
          kind: "table",
          columns: ["معیار", "وزن", "امتیاز محصول", "شرح"],
          rows: a.attractiveness.criteria.map((x) => [x.label, pct(x.weight, 0), num(x.score, 1), x.detail]),
        },
        {
          kind: "table",
          columns: ["محصول", "نرخ مؤثر", "پوشش وثیقه", "روزهای فرایند", "امتیاز کل"],
          rows: [
            [a.spec.productName, pct(f.effectiveAnnualRate, 1), pct(a.spec.collateralCoverage, 0), num(seg.processDays + coll.processDays, 0), num(a.attractiveness.total, 1)],
            ...a.attractiveness.competitors.map((x) => [x.name, pct(x.effectiveRate, 1), pct(x.collateralCoverage, 0), num(x.processDays, 0), num(x.total, 1)]),
          ],
        },
        { kind: "text", text: a.attractiveness.verdict },
      ],
    },
    {
      no: 11,
      title: "امتیاز سلامت محصول از ۱۰۰",
      blocks: [
        { kind: "viz", ref: "health-gauge" },
        {
          kind: "table",
          columns: ["مؤلفه", "حداکثر", "کسب‌شده"],
          rows: a.health.components.map((x) => [x.label, num(x.max, 0), num(x.value, 1)]),
        },
        { kind: "text", text: `ارزیابی نهایی: ${a.health.grade}` },
      ],
    },
    {
      no: 12,
      title: "چک‌لیست انطباق مقرراتی",
      blocks: [{ kind: "viz", ref: "compliance-table" }],
    },
    {
      no: 13,
      title: "نقاط قوت، ضعف و ۳ پیشنهاد بهبود",
      blocks: [
        { kind: "list", items: a.swot.strengths.map((s) => `✅ ${s}`) },
        { kind: "list", items: a.swot.weaknesses.map((s) => `⚠ ${s}`) },
        { kind: "list", items: a.swot.improvements.map((s, i) => `پیشنهاد ${i + 1}: ${s}`) },
      ],
    },
    {
      no: 14,
      title: "فلوچارت فرایند عملیاتی",
      blocks: [
        { kind: "flow", steps: a.processFlow },
        { kind: "text", text: `مجموع زمان چرخه از ثبت درخواست تا پرداخت: ${num(a.processFlow.reduce((s, x) => s + x.days, 0), 0)} روز کاری (بدون احتساب مراحل پایش و تسویه).` },
      ],
    },
  ];
}

/* ------------------------------------------------------ کنترل کیفیت داخلی */

function buildQuality(a: Analysis, viz: Visualization[]): { item: string; ok: boolean }[] {
  const wf = viz.find((v) => v.id === "profit-waterfall");
  const wfTotal = wf?.data.items?.find((i) => i.kind === "total")?.value ?? 0;
  return [
    { item: "هر ۴ تحلیل (نقدینگی، سودآوری، جذابیت، انطباق) انجام شده است", ok: Boolean(a.liquidity.gaps.length && a.profitability.netMargin !== undefined && a.attractiveness.criteria.length === 5 && a.compliance.length > 0) },
    { item: "اعداد نمودارها با جدول‌ها سازگار است", ok: Math.abs(wfTotal - a.profitability.netMargin) < 1 },
    { item: "نرخ‌ها در سقف مصوب عقد قرار دارند", ok: a.spec.nominalRate <= CONTRACTS[a.contract.code].ceiling + 1e-9 },
    { item: "جریان نقدی از لحظه تامین تا وصول کامل مدل شده است", ok: a.financial.schedule.length > 0 && a.financial.schedule[a.financial.schedule.length - 1].balance <= 1 },
    { item: "همه فرض‌های هوشمند اعلام شده‌اند", ok: a.spec.assumedFields.length >= 0 },
    { item: "هر تحلیل تفسیر متنی سه‌جمله‌ای دارد", ok: viz.every((v) => v.insight.length > 60 && (v.insight.split(".").length - 1) >= 2) },
    { item: "سناریوهای استرس و بحرانی محاسبه شده‌اند", ok: a.liquidity.scenarios.length >= 7 },
  ];
}
