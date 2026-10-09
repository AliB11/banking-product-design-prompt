import { COLLATERALS, CONTRACTS, FUNDING_STRUCTURES, NEED_MATRIX, REPAYMENT_MODES, SEGMENTS } from "./contracts";
import { money, num, pct, toEn } from "./format";
import { createSpec } from "./spec";
import type { ContractCode, NeedCode, OrgSettings, ProductSpec } from "./types";

export interface Chip {
  label: string;
  patch?: Partial<ProductSpec>;
  answers?: string[];
  action?: "design" | "reset" | "summary";
}

export interface ChatTable {
  title?: string;
  columns: string[];
  rows: string[][];
}

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  chips?: Chip[];
  table?: ChatTable;
  createdAt: string;
}

let seq = 0;
export function msg(role: ChatMessage["role"], text: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  seq += 1;
  return { id: `m${Date.now()}-${seq}`, role, text, createdAt: new Date().toISOString(), ...extra };
}

/* ------------------------------------------------------- گروه‌های پرسش */

type GroupKey = "need" | "scope" | "structure" | "pricing";

const GROUPS: Record<GroupKey, { keys: string[]; intro: string; questions: { key: string; text: string; chips: Chip[] }[] }> = {
  need: {
    keys: ["needCode", "segment", "competitiveEdge"],
    intro: "عالی. برای شروع سه چیز را با هم روشن کنیم — اگر جواب هرکدام را نمی‌دانید، بگذارید من فرض بگذارم و بعداً اصلاحش کنیم:",
    questions: [
      {
        key: "needCode",
        text: "۱) چه نوع تسهیلاتی مد نظرتان است؟ (مثلاً خرید خودرو، سرمایه در گردش، مسکن، مواد اولیه…)",
        chips: [
          { label: "خرید خودرو", patch: { needCode: "vehicle", needDescription: "خرید خودروی سواری" }, answers: ["needCode"] },
          { label: "مسکن", patch: { needCode: "housing", needDescription: "خرید/ساخت مسکن" }, answers: ["needCode"] },
          { label: "سرمایه در گردش", patch: { needCode: "working_capital", needDescription: "تامین سرمایه در گردش کسب‌وکار" }, answers: ["needCode"] },
          { label: "مواد اولیه تولید", patch: { needCode: "raw_material", needDescription: "تامین مواد اولیه خط تولید" }, answers: ["needCode"] },
          { label: "پروژه خدماتی/ساختمانی", patch: { needCode: "services_project", needDescription: "تامین مالی پروژه خدماتی یا پیمانکاری" }, answers: ["needCode"] },
          { label: "کشاورزی", patch: { needCode: "agriculture", needDescription: "تامین مالی زراعت و باغداری" }, answers: ["needCode"] },
          { label: "نیاز ضروری کم‌درآمد", patch: { needCode: "essential_need", needDescription: "نیاز ضروری خانوار کم‌درآمد" }, answers: ["needCode"] },
          { label: "وام ازدواج", patch: { needCode: "marriage", needDescription: "تسهیلات قرض‌الحسنه ازدواج" }, answers: ["needCode"] },
          { label: "تجهیزات پزشکی", patch: { needCode: "medical", needDescription: "تجهیز مطب و کلینیک دندان‌پزشکی" }, answers: ["needCode"] },
          { label: "طرح سرمایه‌گذاری بزرگ", patch: { needCode: "large_investment", needDescription: "طرح سرمایه‌گذاری کلان/سندیکایی" }, answers: ["needCode"] },
        ],
      },
      {
        key: "segment",
        text: "۲) مشتری هدف چه کسانی هستند؟",
        chips: (Object.keys(SEGMENTS) as (keyof typeof SEGMENTS)[]).map((k) => ({
          label: SEGMENTS[k].label,
          patch: { segment: k },
          answers: ["segment"],
        })),
      },
      {
        key: "competitiveEdge",
        text: "۳) چه مزیت خاصی می‌خواهید این محصول نسبت به رقبا داشته باشد؟",
        chips: [
          { label: "نرخ مؤثر پایین‌تر", patch: { competitiveEdge: "نرخ مؤثر پایین‌تر از بازار" }, answers: ["competitiveEdge"] },
          { label: "وثیقه سبک‌تر", patch: { competitiveEdge: "وثیقه سبک و بدون ملک" }, answers: ["competitiveEdge"] },
          { label: "پرداخت سریع (زیر ۴۸ ساعت)", patch: { competitiveEdge: "پرداخت سریع و تمام‌دیجیتال" }, answers: ["competitiveEdge"] },
          { label: "انعطاف بازپرداخت", patch: { competitiveEdge: "انعطاف بازپرداخت: تنفس، تعویق قسط و اقساط صعودی" }, answers: ["competitiveEdge"] },
        ],
      },
    ],
  },
  scope: {
    keys: ["amount", "tenorMonths"],
    intro: "حالا اندازه و زمان محصول را مشخص کنیم:",
    questions: [
      {
        key: "amount",
        text: "۱) بازه مبلغ تسهیلات چقدر باشد؟ (واحد را هم بگویید: تومان یا ریال)",
        chips: [
          { label: "۵۰ تا ۳۰۰ میلیون تومان", patch: { minAmount: 50_000_000, maxAmount: 300_000_000, baseAmount: 200_000_000 }, answers: ["amount"] },
          { label: "۳۰۰ میلیون تا ۱ میلیارد تومان", patch: { minAmount: 300_000_000, maxAmount: 1_000_000_000, baseAmount: 700_000_000 }, answers: ["amount"] },
          { label: "۱ تا ۵ میلیارد تومان", patch: { minAmount: 1_000_000_000, maxAmount: 5_000_000_000, baseAmount: 3_000_000_000 }, answers: ["amount"] },
          { label: "۵ تا ۵۰ میلیارد تومان", patch: { minAmount: 5_000_000_000, maxAmount: 50_000_000_000, baseAmount: 20_000_000_000 }, answers: ["amount"] },
        ],
      },
      {
        key: "tenorMonths",
        text: "۲) مدت بازپرداخت چند ماه باشد؟",
        chips: [6, 12, 18, 24, 36, 48, 60, 84, 120].map((m) => ({
          label: `${num(m, 0)} ماه`,
          patch: { tenorMonths: m },
          answers: ["tenorMonths"],
        })),
      },
    ],
  },
  structure: {
    keys: ["repaymentMode", "collateralCode", "requestedContract"],
    intro: "ساختار عقد، بازپرداخت و وثیقه را تعیین کنیم:",
    questions: [
      {
        key: "requestedContract",
        text: "۱) عقد خاصی مد نظرتان است یا انتخاب را به موتور بسپارم؟",
        chips: [
          { label: "انتخاب خودکار موتور", patch: { requestedContract: "auto" }, answers: ["requestedContract"] },
          ...(["mosharekat_madani", "forush_aghsati", "ejareh_tamlik", "salaf", "joaleh", "qarzolhasaneh", "kharid_din", "mozareeh", "mozarabeh"] as ContractCode[]).map(
            (c) => ({ label: CONTRACTS[c].name, patch: { requestedContract: c }, answers: ["requestedContract"] as string[] }),
          ),
        ],
      },
      {
        key: "repaymentMode",
        text: "۲) ساختار بازپرداخت چگونه باشد؟",
        chips: (Object.keys(REPAYMENT_MODES) as (keyof typeof REPAYMENT_MODES)[]).map((k) => ({
          label: REPAYMENT_MODES[k].label,
          patch: { repaymentMode: k },
          answers: ["repaymentMode"],
        })),
      },
      {
        key: "collateralCode",
        text: "۳) وثیقه اصلی چه باشد؟",
        chips: (Object.keys(COLLATERALS) as (keyof typeof COLLATERALS)[]).map((k) => ({
          label: COLLATERALS[k].label,
          patch: { collateralCode: k },
          answers: ["collateralCode"],
        })),
      },
    ],
  },
  pricing: {
    keys: ["nominalRate", "fundingCode", "bankConstraints"],
    intro: "آخرین لایه: نرخ، منبع تامین مالی و محدودیت‌های بانک.",
    questions: [
      {
        key: "nominalRate",
        text: "۱) نرخ اسمی را چقدر در نظر بگیریم؟ (هرگز بالاتر از سقف مصوب طراحی نمی‌کنم)",
        chips: [
          { label: "نرخ مصوب (سقف)", patch: { nominalRate: 23 }, answers: ["nominalRate"] },
          { label: "۲۰٪", patch: { nominalRate: 20 }, answers: ["nominalRate"] },
          { label: "۱۸٪", patch: { nominalRate: 18 }, answers: ["nominalRate"] },
          { label: "قرض‌الحسنه (۰٪ + کارمزد)", patch: { nominalRate: 0, feeRate: 1, requestedContract: "qarzolhasaneh" }, answers: ["nominalRate", "requestedContract"] },
        ],
      },
      {
        key: "fundingCode",
        text: "۲) ساختار تامین مالی از کدام منابع باشد؟",
        chips: (Object.keys(FUNDING_STRUCTURES) as (keyof typeof FUNDING_STRUCTURES)[]).map((k) => ({
          label: FUNDING_STRUCTURES[k].label,
          patch: { fundingCode: k },
          answers: ["fundingCode"],
        })),
      },
      {
        key: "bankConstraints",
        text: "۳) محدودیت خاصی در بانک هست که باید رعایت کنم؟",
        chips: [
          { label: "بدون محدودیت", patch: { bankConstraints: "بدون محدودیت خاص" }, answers: ["bankConstraints"] },
          { label: "محدودیت نقدینگی", patch: { bankConstraints: "محدودیت نقدینگی: اولویت با منابع هم‌سررسید و کاهش شکاف کوتاه‌مدت" }, answers: ["bankConstraints"] },
          { label: "الزام وثیقه ملکی", patch: { bankConstraints: "سیاست بانک: الزام وثیقه ملکی برای مبالغ بالای ۱ میلیارد تومان" }, answers: ["bankConstraints"] },
          { label: "سقف تمرکز اعتباری", patch: { bankConstraints: "رعایت سقف تمرکز اعتباری و محدودیت سهم هر مشتری" }, answers: ["bankConstraints"] },
        ],
      },
    ],
  },
};

const GROUP_ORDER: GroupKey[] = ["need", "scope", "structure", "pricing"];

export function nextGroup(answered: string[]): GroupKey | null {
  for (const g of GROUP_ORDER) {
    if (GROUPS[g].keys.some((k) => !answered.includes(k))) return g;
  }
  return null;
}

export function greeting(settings: OrgSettings): ChatMessage[] {
  return [
    msg(
      "bot",
      `سلام، من «طراح هوشمند محصولات بانکی» هستم؛ هم‌زمان مهندس محصول بانکی، مدیر ریسک و ALM، تحلیلگر مالی و کارشناس بازار.\n\nمبنای دانش من: ${settings.knowledgeDate}. نرخ‌های پیش‌فرض از مصوبات شورای پول و اعتبار گرفته شده (مشارکت مدنی ۲۳٪، سلف ۲۰٪، قرض‌الحسنه ۰٪ + کارمزد مصوب، سپرده سه‌ساله ۲۰٪). اگر مصوبه جدیدی دارید، همان ابتدا بگویید تا جایگزین کنم.\n\nواحد پولی پیش‌فرض: تومان.\n\nبیایید از نیاز شروع کنیم — چه محصول تسهیلاتی می‌خواهید بسازیم؟`,
      {
        chips: [
          { label: "تسهیلات خودروی خرد", patch: { needCode: "vehicle", needDescription: "خرید خودروی سواری برای مشتریان خرد", segment: "retail" }, answers: ["needCode", "segment"] },
          { label: "سرمایه در گردش اصناف", patch: { needCode: "working_capital", needDescription: "سرمایه در گردش کسب‌وکارهای کوچک", segment: "micro_business" }, answers: ["needCode", "segment"] },
          { label: "وام ازدواج قرض‌الحسنه", patch: { needCode: "marriage", needDescription: "تسهیلات قرض‌الحسنه ازدواج", segment: "retail", requestedContract: "qarzolhasaneh" }, answers: ["needCode", "segment"] },
          { label: "تجهیز مطب پزشکان", patch: { needCode: "medical", needDescription: "تجهیز مطب و کلینیک", segment: "professional" }, answers: ["needCode", "segment"] },
        ],
      },
    ),
  ];
}

export function askGroup(group: GroupKey, spec: ProductSpec, answered: string[]): ChatMessage {
  const g = GROUPS[group];
  const pending = g.questions.filter((q) => !answered.includes(q.key));
  const text = `${g.intro}\n\n${pending.map((q) => q.text).join("\n")}`;
  return msg("bot", text, { chips: pending.flatMap((q) => q.chips) });
}

/* ------------------------------------------------------------- پارس فارسی */

const NEED_KEYWORDS: Record<string, NeedCode> = {
  خودرو: "vehicle", ماشین: "vehicle", اتومبیل: "vehicle",
  مسکن: "housing", خانه: "housing", خرید_خانه: "housing",
  "سرمایه در گردش": "working_capital", نقدینگی_کسب: "working_capital", گردشی: "working_capital",
  "مواد اولیه": "raw_material", مواداولیه: "raw_material",
  کشاورزی: "agriculture", زراعت: "agriculture", باغ: "agriculture",
  ساختمان: "construction_project", ساخت: "construction_project", انبوه: "construction_project",
  پیمانکار: "services_project", خدماتی: "services_project", پروژه: "services_project",
  ضروری: "essential_need", کم‌درآمد: "essential_need", نیاز_فوری: "essential_need",
  ازدواج: "marriage",
  تجهیزات: "equipment", ماشین‌آلات: "equipment", دستگاه: "equipment",
  پزشکی: "medical", دندان: "medical", مطب: "medical",
  کالا: "goods_purchase", لوازم: "goods_purchase", جهیزیه: "goods_purchase",
  سندیکا: "large_investment", سرمایه‌گذاری: "large_investment", طرح_بزرگ: "large_investment",
  چک: "receivables", برات: "receivables", اسناد: "receivables", تنزیل: "receivables",
};

const SEGMENT_KEYWORDS: Record<string, ProductSpec["segment"]> = {
  خرد: "retail", حقوق‌بگیر: "retail", کارمند: "retail", خانوار: "retail",
  اصناف: "micro_business", کسب‌وکار: "micro_business", "کوچک": "micro_business", فروشگاه: "micro_business",
  متوسط: "sme", بنگاه: "sme", تولیدی: "sme", کارخانه: "sme",
  شرکتی: "corporate", هلدینگ: "corporate", بزرگ: "corporate",
  پزشک: "professional", دندان: "professional", وکیل: "professional", حرفه‌ای: "professional", مهندس: "professional",
};

const CONTRACT_KEYWORDS: Record<string, ContractCode> = {
  "مشارکت مدنی": "mosharekat_madani", مشارکت_مدنی: "mosharekat_madani",
  "مشارکت حقوقی": "mosharekat_hoghoghi",
  "فروش اقساطی": "forush_aghsati", اقساطی: "forush_aghsati",
  "اجاره به شرط تملیک": "ejareh_tamlik", اجاره: "ejareh_tamlik", تملیک: "ejareh_tamlik",
  سلف: "salaf", "پیش فروش": "salaf",
  جعاله: "joaleh", جعل: "joaleh",
  استصناع: "estena",
  "قرض الحسنه": "qarzolhasaneh", قرض‌الحسنه: "qarzolhasaneh", "بدون سود": "qarzolhasaneh",
  "خرید دین": "kharid_din", تنزیل: "kharid_din",
  مزارعه: "mozareeh", مساقات: "mozareeh",
  مضاربه: "mozarabeh",
};

const COLLATERAL_KEYWORDS: Record<string, ProductSpec["collateralCode"]> = {
  ملک: "real_estate", خانه_وثیقه: "real_estate", سند_ملکی: "real_estate",
  "سپرده مسدودی": "blocked_deposit", مسدودی: "blocked_deposit",
  ضامن: "guarantor", ضامنان: "guarantor",
  سفته: "promissory_note",
  چک: "check", صیادی: "check",
  ضمانت‌نامه: "bank_guarantee",
  بیمه: "credit_insurance",
  "قبض رهنی": "movable_pledge", منقول: "movable_pledge",
  "کسر از حقوق": "salary_deduction", حقوق: "salary_deduction",
};

const MODE_KEYWORDS: Record<string, ProductSpec["repaymentMode"]> = {
  مساوی: "annuity", annuity: "annuity",
  خطی: "flat", سرد: "flat",
  یکجا: "bullet", تسویه_یکجا: "bullet",
  صعودی: "stepped", پلکانی: "stepped",
  نزولی: "declining",
  "فقط سود": "interest_only",
};

const FUNDING_KEYWORDS: Record<string, ProductSpec["fundingCode"]> = {
  "بلندمدت منطبق": "matched_long", "هم‌سررسید": "matched_long",
  کوتاه‌مدت: "short_term", "منابع ارزان": "short_term",
  ترکیبی: "mixed", سبد: "mixed",
  "قرض الحسنه": "qarz_deposit", "منبع رایگان": "qarz_deposit",
  "بین بانکی": "interbank_backstop", "خط اعتباری": "interbank_backstop", پشتیبان: "interbank_backstop",
};

function findKeyword<T>(text: string, dict: Record<string, T>): T | null {
  const flat = text.replace(/‌/g, " ").replace(/\u200c/g, " ");
  for (const [k, v] of Object.entries(dict)) {
    const key = k.replace(/_/g, " ").replace(/‌/g, " ");
    if (flat.includes(key)) return v;
  }
  return null;
}

export interface ParseResult {
  patch: Partial<ProductSpec>;
  answered: string[];
  notes: string[];
}

export function parseText(input: string, spec: ProductSpec): ParseResult {
  const raw = toEn(input).replace(/,/g, "");
  const patch: Partial<ProductSpec> = {};
  const answered: string[] = [];
  const notes: string[] = [];

  const currency: ProductSpec["currency"] = /ریال/.test(raw) ? "IRR" : /تومان/.test(raw) ? "IRT" : spec.currency;
  if (currency !== spec.currency) {
    patch.currency = currency;
    notes.push(`واحد پولی گفتگو به ${currency === "IRR" ? "ریال" : "تومان"} تغییر کرد و در تمام محاسبات ثابت می‌ماند.`);
  }

  // مبلغ‌ها
  const amountMatches = [...raw.matchAll(/(\d+(?:\.\d+)?)\s*(میلیارد|میلیون|هزار)?/g)]
    .map((m) => {
      let v = parseFloat(m[1]);
      if (m[2] === "میلیارد") v *= 1e9;
      else if (m[2] === "میلیون") v *= 1e6;
      else if (m[2] === "هزار") v *= 1e3;
      return { v, hasUnit: Boolean(m[2]), idx: m.index ?? 0 };
    })
    .filter((x) => x.hasUnit || x.v >= 1_000_000);

  // درصد / مدت
  const rateMatch = [...raw.matchAll(/(\d+(?:\.\d+)?)\s*(?:درصد|٪)/g)].map((m) => parseFloat(m[1]));
  const tenorMatch = [...raw.matchAll(/(\d+)\s*(ماه|سال)/g)].map((m) => ({
    v: parseFloat(m[1]),
    unit: m[2],
  }));

  const amounts = amountMatches.filter((a) => a.v > 0).map((a) => a.v);
  if (amounts.length >= 2) {
    const [mn, mx] = [Math.min(...amounts), Math.max(...amounts)];
    patch.minAmount = mn;
    patch.maxAmount = mx;
    patch.baseAmount = mx;
    answered.push("amount");
  } else if (amounts.length === 1) {
    patch.maxAmount = amounts[0];
    patch.baseAmount = amounts[0];
    patch.minAmount = Math.max(1_000_000, Math.round((amounts[0] * 0.3) / 1_000_000) * 1_000_000);
    answered.push("amount");
  }

  for (const t of tenorMatch) {
    const months = t.unit === "سال" ? t.v * 12 : t.v;
    if (months >= 3 && months <= 240) {
      patch.tenorMonths = months;
      answered.push("tenorMonths");
      break;
    }
  }

  for (const r of rateMatch) {
    if (r > 0 && r <= 40 && !amounts.includes(r)) {
      patch.nominalRate = r;
      answered.push("nominalRate");
      break;
    }
  }

  const need = findKeyword(raw, NEED_KEYWORDS);
  if (need) {
    patch.needCode = need;
    patch.needDescription = NEED_MATRIX[need].label;
    answered.push("needCode");
  }
  const segment = findKeyword(raw, SEGMENT_KEYWORDS);
  if (segment) {
    patch.segment = segment;
    answered.push("segment");
  }
  const contract = findKeyword(raw, CONTRACT_KEYWORDS);
  if (contract) {
    patch.requestedContract = contract;
    answered.push("requestedContract");
  }
  const coll = findKeyword(raw, COLLATERAL_KEYWORDS);
  if (coll) {
    patch.collateralCode = coll;
    patch.collateralCoverage = COLLATERALS[coll].suggestedCoverage;
    answered.push("collateralCode");
  }
  const mode = findKeyword(raw, MODE_KEYWORDS);
  if (mode) {
    patch.repaymentMode = mode;
    answered.push("repaymentMode");
  }
  const funding = findKeyword(raw, FUNDING_KEYWORDS);
  if (funding) {
    patch.fundingCode = funding;
    answered.push("fundingCode");
  }

  if (/تنفس|مهلت/.test(raw)) {
    patch.graceMonths = 3;
    notes.push("دوره تنفس ۳ ماهه (فرض — قابل تغییر) اضافه شد؛ سود دوره تنفس به اصل رسوب می‌کند.");
  }
  if (/تعویق|شناور/.test(raw)) patch.earlySettlementDiscount = true;
  if (/تسویه زودهنگام|زودتر/.test(raw)) {
    patch.earlySettlementDiscount = true;
    notes.push("امکان تسویه زودهنگام با تخفیف ۵۰٪ سود تحقق‌نیافته فعال شد.");
  }
  if (/مزیت|رقابتی/.test(raw) && !answered.includes("competitiveEdge")) {
    const edge = raw.split(/\n/).find((l) => /مزیت|رقابتی/.test(l));
    if (edge && edge.length > 8) {
      patch.competitiveEdge = edge.replace(/^.*(مزیت|رقابتی)\s*[:：]?\s*/, "").trim() || spec.competitiveEdge;
      answered.push("competitiveEdge");
    }
  }
  if (/محدودیت/.test(raw)) {
    const line = raw.split(/\n/).find((l) => /محدودیت/.test(l));
    if (line) {
      patch.bankConstraints = line.trim();
      answered.push("bankConstraints");
    }
  }

  return { patch, answered, notes };
}

/* ------------------------------------------------------- جمع‌بندی و تایید */

export function summaryTable(spec: ProductSpec): ChatTable {
  const cur = spec.currency;
  return {
    title: "جمع‌بندی مشخصات گردآوری‌شده",
    columns: ["#", "فیلد", "مقدار", "منبع"],
    rows: [
      ["۱", "نوع نیاز مشتری", spec.needDescription || NEED_MATRIX[spec.needCode].label, "کاربر"],
      ["۲", "بازار هدف", SEGMENTS[spec.segment].label, "کاربر"],
      ["۳", "حداقل/حداکثر مبلغ", `${money(spec.minAmount, cur)} تا ${money(spec.maxAmount, cur)}`, "کاربر"],
      ["۴", "مدت", `${num(spec.tenorMonths, 0)} ماه`, "کاربر"],
      ["۵", "ساختار بازپرداخت", REPAYMENT_MODES[spec.repaymentMode].label, "کاربر"],
      ["۶", "وثیقه و پوشش", `${COLLATERALS[spec.collateralCode].label} — ${num(spec.collateralCoverage, 0)}٪`, "کاربر"],
      ["۷", "نرخ اسمی", pct(spec.nominalRate, 1), "کاربر / سقف مصوب"],
      ["۸", "مزیت رقابتی", spec.competitiveEdge, "کاربر"],
      ["۹", "محدودیت‌های بانک", spec.bankConstraints, "کاربر"],
      ["۱۰", "ساختار تامین مالی", FUNDING_STRUCTURES[spec.fundingCode].label, "کاربر"],
      ["—", "عقد", spec.requestedContract === "auto" ? "انتخاب خودکار بر اساس ماتریس انطباق" : CONTRACTS[spec.requestedContract].name, "موتور"],
    ],
  };
}

export function confirmMessage(spec: ProductSpec): ChatMessage {
  const table = summaryTable(spec);
  return msg(
    "bot",
    `مشخصات را در یک نگاه جمع‌بندی کردم. مقادیری که خودتان نگفتید با «فرض هوشمند» پر شده و در جدول مشخص است — اگر جایی متفاوت است، همان‌جا اصلاحش کنید.\n\nآیا برای شروع طراحی تأیید می‌کنید؟`,
    {
      table,
      chips: [
        { label: "بله، طراحی را شروع کن", action: "design" },
        { label: "ویرایش مشخصات", action: "summary" },
        { label: "شروع دوباره", action: "reset" },
      ],
    },
  );
}

export function assumptionMessage(spec: ProductSpec): ChatMessage {
  const assumed = spec.assumedFields ?? [];
  const labels: Record<string, string> = {
    segment: "بازار هدف: حقیقی خرد",
    tenorMonths: `مدت: ${num(spec.tenorMonths, 0)} ماه`,
    repaymentMode: `بازپرداخت: ${REPAYMENT_MODES[spec.repaymentMode].label}`,
    collateralCode: `وثیقه: ${COLLATERALS[spec.collateralCode].label}`,
    collateralCoverage: `پوشش وثیقه: ${num(spec.collateralCoverage, 0)}٪`,
    fundingCode: `تامین مالی: ${FUNDING_STRUCTURES[spec.fundingCode].label}`,
    nominalRate: `نرخ اسمی: ${pct(spec.nominalRate, 1)}`,
    competitiveEdge: `مزیت رقابتی: ${spec.competitiveEdge}`,
    bankConstraints: `محدودیت‌ها: ${spec.bankConstraints}`,
    needCode: `نیاز: ${NEED_MATRIX[spec.needCode].label}`,
  };
  const items = assumed.filter((k) => labels[k]).map((k) => `• ${labels[k]} (فرض — قابل تغییر)`);
  return msg(
    "bot",
    items.length
      ? `این مقادیر را فرض کردم؛ اگر متفاوت است اصلاح کنید:\n${items.join("\n")}`
      : "همه فیلدها با ورودی خودتان پر شده و فرض هوشمندی باقی نمانده است.",
  );
}

export function designStartMessage(): ChatMessage {
  return msg(
    "bot",
    "شروع کردم. شش گام اجباری طراحی را طی می‌کنم: انتخاب عقد با ماتریس انطباق، ساختار مالی و نرخ مؤثر، مدل جریان نقدی، طراحی ضمانت‌ها، چک‌لیست انطباق و مستندسازی ۱۴ بخشی. خروجی کامل با نمودارها در پنل گزارش نمایش داده می‌شود.",
  );
}

export function initialChat(settings: OrgSettings): ChatMessage[] {
  return greeting(settings);
}

export function defaultSpecForChat(): ProductSpec {
  return createSpec({});
}
