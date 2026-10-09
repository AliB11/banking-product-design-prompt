import type { Installment, RepaymentMode } from "./types";

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export function npv(rate: number, flows: number[]): number {
  return flows.reduce((acc, f, i) => acc + f / Math.pow(1 + rate, i), 0);
}

/** نرخ بازده داخلی دوره‌ای با روش ترکیبی نیوتن–بایسکشن */
export function irr(flows: number[], guess = 0.02): number | null {
  let lo = -0.9;
  let hi = 5;
  if (npv(lo, flows) * npv(hi, flows) > 0) return null;
  let r = guess;
  for (let iter = 0; iter < 100; iter++) {
    const f = npv(r, flows);
    const df = flows.reduce((acc, cf, i) => (i === 0 ? acc : acc - (i * cf) / Math.pow(1 + r, i + 1)), 0);
    const next = Math.abs(df) > 1e-9 ? r - f / df : (lo + hi) / 2;
    if (!Number.isFinite(next)) break;
    if (npv(lo, flows) * npv(next, flows) <= 0) hi = next;
    else lo = next;
    if (Math.abs(next - r) < 1e-10) return next;
    r = next;
  }
  const mid = (lo + hi) / 2;
  return Number.isFinite(mid) ? mid : null;
}

export interface ScheduleParams {
  principal: number;
  annualRatePct: number;
  tenorMonths: number;
  mode: RepaymentMode;
  frequency: "monthly" | "quarterly";
  growthPct: number;
  graceMonths: number;
  startDate: string;
}

export function periodsPerYear(frequency: "monthly" | "quarterly"): number {
  return frequency === "monthly" ? 12 : 4;
}

/** ساخت جدول اقساط بر اساس ساختار بازپرداخت */
export function buildSchedule(p: ScheduleParams): Installment[] {
  const ppy = periodsPerYear(p.frequency);
  const n = Math.max(1, Math.round((p.tenorMonths / 12) * ppy));
  const iMonth = p.annualRatePct / 100 / 12;
  const i = ppy === 12 ? iMonth : Math.pow(1 + iMonth, 3) - 1;
  const grace = Math.max(0, Math.min(p.graceMonths, Math.floor(p.tenorMonths / 2)));
  const monthsPerPeriod = 12 / ppy;

  // سود دوران تنفس به اصل اضافه (رسوب) می‌شود
  const principal = p.principal * Math.pow(1 + iMonth, grace);

  const rows: Installment[] = [];
  const push = (period: number, dueMonth: number, payment: number, principalPart: number, profitPart: number, balance: number) => {
    rows.push({
      period,
      dueMonth,
      dateISO: addMonths(p.startDate, dueMonth),
      payment: round2(payment),
      principal: round2(principalPart),
      profit: round2(profitPart),
      balance: round2(Math.max(0, balance)),
      fee: 0,
    });
  };

  if (p.mode === "bullet") {
    const t = p.tenorMonths / 12;
    const profit = p.principal * (p.annualRatePct / 100) * t;
    push(1, p.tenorMonths, principal + profit, principal, profit, 0);
    return rows;
  }

  if (p.mode === "flat") {
    const t = p.tenorMonths / 12;
    const totalProfit = principal * (p.annualRatePct / 100) * t;
    const pr = principal / n;
    const pf = totalProfit / n;
    let bal = principal;
    for (let k = 1; k <= n; k++) {
      bal -= pr;
      push(k, grace + k * monthsPerPeriod, pr + pf, pr, pf, bal);
    }
    return rows;
  }

  if (p.mode === "interest_only") {
    let bal = principal;
    for (let k = 1; k <= n; k++) {
      const profit = bal * i;
      const last = k === n;
      const pr = last ? bal : 0;
      push(k, grace + k * monthsPerPeriod, profit + pr, pr, profit, last ? 0 : bal);
      bal -= pr;
    }
    return rows;
  }

  // annuity / stepped / declining
  let growth = 0;
  if (p.mode === "stepped") growth = Math.pow(1 + p.growthPct / 100, monthsPerPeriod / 12) - 1;
  if (p.mode === "declining") growth = -(Math.pow(1 - Math.min(p.growthPct, 20) / 100, monthsPerPeriod / 12) - 1);

  let attemptGrowth = growth;
  for (let attempt = 0; attempt < 30; attempt++) {
    const base = firstPayment(principal, i, n, attemptGrowth, p.mode);
    const out = amortize(principal, i, n, base, attemptGrowth, p.mode, grace, monthsPerPeriod);
    if (out) {
      out.forEach((r, idx) => push(idx + 1, r.dueMonth, r.payment, r.principal, r.profit, r.balance));
      return rows;
    }
    attemptGrowth = attemptGrowth / 2;
    if (Math.abs(attemptGrowth) < 1e-6) {
      const out2 = amortize(principal, i, n, firstPayment(principal, i, n, 0, "annuity"), 0, "annuity", grace, monthsPerPeriod);
      if (out2) {
        out2.forEach((r, idx) => push(idx + 1, r.dueMonth, r.payment, r.principal, r.profit, r.balance));
      }
      return rows;
    }
  }
  return rows;
}

function firstPayment(P: number, i: number, n: number, growth: number, mode: RepaymentMode): number {
  if (mode === "annuity" || growth === 0) {
    if (i === 0) return P / n;
    return (P * i) / (1 - Math.pow(1 + i, -n));
  }
  let pv = 0;
  for (let k = 1; k <= n; k++) pv += Math.pow(1 + growth, k - 1) / Math.pow(1 + i, k);
  return pv === 0 ? P / n : P / pv;
}

function amortize(
  P: number,
  i: number,
  n: number,
  base: number,
  growth: number,
  _mode: RepaymentMode,
  grace: number,
  monthsPerPeriod: number,
): { dueMonth: number; payment: number; principal: number; profit: number; balance: number }[] | null {
  const out: { dueMonth: number; payment: number; principal: number; profit: number; balance: number }[] = [];
  let bal = P;
  for (let k = 1; k <= n; k++) {
    const payment = base * Math.pow(1 + growth, k - 1);
    const profit = bal * i;
    const principal = payment - profit;
    if (principal <= 0) return null;
    if (principal > bal + 0.01 && k < n) return null;
    bal = Math.max(0, bal - principal);
    out.push({ dueMonth: grace + k * monthsPerPeriod, payment, principal: k === n ? bal + principal : principal, profit, balance: k === n ? 0 : bal });
    if (k === n) bal = 0;
  }
  return out;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function scheduleTotals(s: Installment[]) {
  return s.reduce(
    (acc, r) => ({
      payment: acc.payment + r.payment,
      principal: acc.principal + r.principal,
      profit: acc.profit + r.profit,
    }),
    { payment: 0, principal: 0, profit: 0 },
  );
}

/** نمونه فشرده جدول برای دوره‌های طولانی: ۳ قسط اول + وسط + ۳ قسط آخر */
export function scheduleSample(s: Installment[]): Installment[] {
  if (s.length <= 10) return s;
  const mid = Math.floor(s.length / 2);
  return [s[0], s[1], s[2], s[mid - 1], s[mid], s[mid + 1], s[s.length - 3], s[s.length - 2], s[s.length - 1]];
}

/** جریان نقدی بانک از لحظه تامین تا وصول (با احتساب تنفس و کارمزد) */
export function cashFlows(
  principal: number,
  feeUpfront: number,
  s: Installment[],
  monthsPerPeriod = 1,
): number[] {
  const last = s.length ? Math.max(...s.map((r) => r.dueMonth)) : 0;
  const periods = Math.max(s.length, Math.round(last / monthsPerPeriod));
  const flows: number[] = new Array(periods + 1).fill(0);
  flows[0] = -principal + feeUpfront;
  for (const r of s) {
    const idx = Math.min(periods, Math.max(1, Math.round(r.dueMonth / monthsPerPeriod)));
    flows[idx] += r.payment;
  }
  return flows;
}
