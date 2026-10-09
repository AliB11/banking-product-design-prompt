"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import SpecForm from "./SpecForm";
import ReportView from "./ReportView";
import {
  assumptionMessage,
  confirmMessage,
  designStartMessage,
  greeting,
  msg,
  nextGroup,
  askGroup,
  parseText,
  type ChatMessage,
  type Chip,
} from "@/lib/chat";
import { COLLATERALS, CONTRACTS, FUNDING_STRUCTURES, NEED_MATRIX, REPAYMENT_MODES, SEGMENTS } from "@/lib/contracts";
import { compact, money, num, pct, toFa } from "@/lib/format";
import { createSpec } from "@/lib/spec";
import type { OrgSettings, ProductReport, ProductSpec } from "@/lib/types";

const REVISION_CHIPS: Chip[] = [
  { label: "مدت را کوتاه‌تر کن", patch: { tenorMonths: 24 }, answers: ["tenorMonths"] },
  { label: "نرخ را ۲ واحد کاهش بده", patch: { nominalRate: -1 }, answers: ["nominalRate"] },
  { label: "وثیقه را سبک‌تر کن (چک صیادی)", patch: { collateralCode: "check", collateralCoverage: 130 }, answers: ["collateralCode"] },
  { label: "تامین مالی را ترکیبی کن", patch: { fundingCode: "mixed" }, answers: ["fundingCode"] },
  { label: "۳ ماه تنفس اضافه کن", patch: { graceMonths: 3 }, answers: ["graceMonths"] },
  { label: "اقساط صعودی کن", patch: { repaymentMode: "stepped", steppedGrowth: 3 }, answers: ["repaymentMode"] },
  { label: "تسویه یکجا (مشارکت مدنی)", patch: { repaymentMode: "bullet", requestedContract: "mosharekat_madani" }, answers: ["repaymentMode", "requestedContract"] },
];

function ackText(patch: Partial<ProductSpec>, notes: string[], prev: ProductSpec): string {
  const parts: string[] = [];
  const cur = patch.currency ?? prev.currency;
  if (patch.needCode) parts.push(`نیاز «${NEED_MATRIX[patch.needCode].label}»`);
  if (patch.segment) parts.push(`بازار هدف «${SEGMENTS[patch.segment].label}»`);
  if (patch.requestedContract && patch.requestedContract !== "auto") parts.push(`عقد «${CONTRACTS[patch.requestedContract].name}»`);
  if (patch.maxAmount) parts.push(`سقف مبلغ ${money(patch.maxAmount, cur)}`);
  if (patch.tenorMonths) parts.push(`مدت ${num(patch.tenorMonths, 0)} ماه`);
  if (patch.nominalRate !== undefined) parts.push(`نرخ اسمی ${pct(patch.nominalRate, 1)}`);
  if (patch.repaymentMode) parts.push(`بازپرداخت «${REPAYMENT_MODES[patch.repaymentMode].label}»`);
  if (patch.collateralCode) parts.push(`وثیقه «${COLLATERALS[patch.collateralCode].label}»`);
  if (patch.fundingCode) parts.push(`تامین مالی «${FUNDING_STRUCTURES[patch.fundingCode].label}»`);
  if (patch.currency) parts.push(`واحد پولی ${cur === "IRR" ? "ریال" : "تومان"}`);
  const head = parts.length ? `ثبت شد: ${parts.join("، ")}.` : "پیام‌تان را خواندم اما مقدار عددی یا کلیدواژهٔ مشخصی از آن استخراج نکردم.";
  return [head, ...notes].filter(Boolean).join("\n");
}

export default function Workspace({ settings }: { settings: OrgSettings }) {
  const [spec, setSpec] = useState<ProductSpec>(() => createSpec({ currency: settings.currency }));
  const [answered, setAnswered] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => greeting(settings));
  const [input, setInput] = useState("");
  const [report, setReport] = useState<ProductReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const patchSpec = useCallback((patch: Partial<ProductSpec>) => {
    setSpec((s) => ({ ...s, ...patch }));
    setDirty(true);
  }, []);

  const nextBot = useCallback(
    (currentSpec: ProductSpec, currentAnswered: string[]): ChatMessage => {
      const g = nextGroup(currentAnswered);
      return g ? askGroup(g, currentSpec, currentAnswered) : confirmMessage(currentSpec);
    },
    [],
  );

  const compute = useCallback(
    async (next: ProductSpec, silent = false): Promise<ProductReport | null> => {
      setBusy(true);
      try {
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spec: next, settings }),
        });
        const json = (await res.json()) as { report?: ProductReport; error?: string };
        if (json.report) {
          setReport(json.report);
          setDirty(false);
          setSavedId(null);
          return json.report;
        }
        if (!silent) setMessages((m) => [...m, msg("bot", `خطا در محاسبه: ${json.error ?? "نامشخص"}`)]);
      } catch (e) {
        if (!silent) setMessages((m) => [...m, msg("bot", `ارتباط با موتور محاسبات برقرار نشد: ${String(e)}`)]);
      } finally {
        setBusy(false);
      }
      return null;
    },
    [settings],
  );

  const cascadeMessage = (before: ProductReport | null, after: ProductReport, label?: string): ChatMessage => {
    const cur = after.spec.currency;
    const lines: string[] = [];
    lines.push(label ? `تغییر «${label}» اعمال و همه تحلیل‌ها دوباره محاسبه شد.` : "طراحی بازسازی شد و اثر آبشاری تغییرات محاسبه شد:");
    if (before) {
      lines.push(
        `• قسط: ${compact(before.financial.installmentAmount, cur)} ⟵ ${compact(after.financial.installmentAmount, cur)}`,
      );
      lines.push(
        `• نرخ مؤثر: ${pct(before.financial.effectiveAnnualRate, 2)} ⟵ ${pct(after.financial.effectiveAnnualRate, 2)}`,
      );
      lines.push(
        `• حاشیه خالص: ${money(before.profitability.netMargin, cur)} ⟵ ${money(after.profitability.netMargin, cur)} | اسپرید خالص سالانه ${pct(before.profitability.netSpreadPct, 2)} ⟵ ${pct(after.profitability.netSpreadPct, 2)}`,
      );
      lines.push(
        `• کف نقدینگی تجمعی: ${compact(before.liquidity.metrics.worstCumulative, cur)} ⟵ ${compact(after.liquidity.metrics.worstCumulative, cur)}`,
      );
      lines.push(
        `• جذابیت: ${num(before.attractiveness.total, 1)} ⟵ ${num(after.attractiveness.total, 1)} | سلامت محصول: ${num(before.health.total, 1)} ⟵ ${num(after.health.total, 1)}`,
      );
    } else {
      lines.push(
        `• قسط ${compact(after.financial.installmentAmount, cur)} با نرخ مؤثر ${pct(after.financial.effectiveAnnualRate, 2)} — حاشیه خالص ${money(after.profitability.netMargin, cur)} (${pct(after.profitability.netMarginPct, 2)}).`,
      );
      lines.push(
        `• کف نقدینگی تجمعی ${compact(after.liquidity.metrics.worstCumulative, cur)} و پوشش جریان نقدی ${num(after.liquidity.metrics.coverageRatio, 2)} در بدترین افق.`,
      );
      lines.push(
        `• امتیاز جذابیت ${num(after.attractiveness.total, 1)} از ۱۰۰ و امتیاز سلامت محصول ${num(after.health.total, 1)} از ۱۰۰ (${after.health.grade}).`,
      );
    }
    return msg(
      "bot",
      `${lines.join("\n")}\n\nحالا چه بخشی را تغییر بدهیم؟ هر تغییر را فقط در بخش مرتبط به‌روز می‌کنم و اثرش را روی نرخ، نقدینگی، سود و جذابیت دوباره محاسبه می‌کنم.`,
      { chips: REVISION_CHIPS },
    );
  };

  const runDesign = useCallback(
    async (current: ProductSpec) => {
      const before = report;
      setMessages((m) => [...m, assumptionMessage(current), designStartMessage()]);
      const next = await compute(current);
      if (next) setMessages((m) => [...m, cascadeMessage(before, next)]);
    },
    [compute, report],
  );

  const onChip = useCallback(
    async (chip: Chip) => {
      if (chip.action === "design") {
        setMessages((m) => [...m, msg("user", chip.label)]);
        await runDesign(spec);
        return;
      }
      if (chip.action === "reset") {
        const fresh = createSpec({ currency: spec.currency });
        setSpec(fresh);
        setAnswered([]);
        setReport(null);
        setSavedId(null);
        setMessages(greeting(settings));
        return;
      }
      if (chip.action === "summary") {
        setMessages((m) => [...m, msg("user", chip.label), confirmMessage(spec)]);
        return;
      }
      setMessages((m) => [...m, msg("user", chip.label)]);
      let patch = chip.patch ?? {};
      // کاهش نسبی نرخ
      if (patch.nominalRate === -1) {
        patch = { ...patch, nominalRate: Math.max(0, Math.round((spec.nominalRate - 2) * 2) / 2) };
      }
      const nextSpec = { ...spec, ...patch };
      setSpec(nextSpec);
      const nextAnswered = Array.from(new Set([...answered, ...(chip.answers ?? [])]));
      setAnswered(nextAnswered);
      setDirty(true);
      setMessages((m) => [...m, msg("bot", ackText(patch, [], spec))]);
      if (report) {
        const next = await compute(nextSpec, true);
        if (next) setMessages((m) => [...m, cascadeMessage(report, next, chip.label)]);
      } else {
        setMessages((m) => [...m, nextBot(nextSpec, nextAnswered)]);
      }
    },
    [answered, compute, nextBot, report, runDesign, settings, spec],
  );

  const submit = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, msg("user", text)]);
    const res = parseText(text, spec);
    const nextSpec = { ...spec, ...res.patch };
    const nextAnswered = Array.from(new Set([...answered, ...res.answered]));
    setSpec(nextSpec);
    setAnswered(nextAnswered);
    if (Object.keys(res.patch).length) setDirty(true);
    setMessages((m) => [...m, msg("bot", ackText(res.patch, res.notes, spec))]);
    if (/طراحی کن|شروع طراحی|گزارش|بساز/.test(text) && report === null) {
      await runDesign(nextSpec);
      return;
    }
    if (report) {
      const next = await compute(nextSpec, true);
      if (next) setMessages((m) => [...m, cascadeMessage(report, next, text.slice(0, 40))]);
    } else {
      setMessages((m) => [...m, nextBot(nextSpec, nextAnswered)]);
    }
  }, [answered, compute, input, nextBot, report, runDesign, spec]);

  const save = useCallback(async () => {
    if (!report) return;
    setBusy(true);
    try {
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec: report.spec,
          conversation: messages.map((m) => ({ id: m.id, role: m.role, text: m.text, createdAt: m.createdAt })),
        }),
      });
      const json = (await res.json()) as { id?: number; error?: string };
      if (json.id) {
        setSavedId(json.id);
        setMessages((m) => [
          ...m,
          msg("bot", `طراحی با شناسه ${toFa(json.id!)} در گنجینه ذخیره شد. می‌توانید گزارش کامل ۱۴ بخشی را در صفحه اختصاصی آن ببینید.`),
        ]);
      } else {
        setMessages((m) => [...m, msg("bot", `ذخیره ناموفق: ${json.error ?? ""}`)]);
      }
    } catch (e) {
      setMessages((m) => [...m, msg("bot", `ذخیره ناموفق: ${String(e)}`)]);
    } finally {
      setBusy(false);
    }
  }, [messages, report]);

  const completion = useMemo(() => {
    const keys = ["needCode", "segment", "amount", "tenorMonths", "repaymentMode", "collateralCode", "nominalRate", "fundingCode", "requestedContract", "competitiveEdge", "bankConstraints"];
    return Math.round((keys.filter((k) => answered.includes(k)).length / keys.length) * 100);
  }, [answered]);

  return (
    <div className="space-y-4">
      <div className="panel rise flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 className="text-lg font-black text-slate-50 sm:text-xl">میز طراحی محصول تسهیلاتی</h1>
          <p className="mt-1 text-[12px] leading-6 text-slate-400">
            گفتگوی محاوره‌ای ⟵ فرم مشخصات ۱۰ فیلدی ⟵ طراحی ۶ گامی ⟵ تحلیل نقدینگی، سودآوری، جذابیت و انطباق ⟵ خروجی بصری
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-info">واحد پولی: {spec.currency === "IRR" ? "ریال" : "تومان"}</span>
          <span className="badge badge-good">پیشرفت استخراج نیاز: {toFa(completion)}٪</span>
          <button className="btn btn-ghost" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "بستن فرم مشخصات" : "نمایش فرم مشخصات"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(340px,400px)_1fr]">
        <div className="space-y-4">
          {/* گفتگو */}
          <div className="panel flex h-[620px] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
              <div>
                <div className="text-[13px] font-extrabold text-slate-100">گفتگوی طراحی</div>
                <div className="text-[10.5px] text-slate-500">حداکثر ۲–۳ پرسش در هر پیام — فرض‌ها همیشه اعلام می‌شوند</div>
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${busy ? "bg-amber-400" : "bg-emerald-400"} pulse-ring`} />
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
              {messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "flex justify-start" : "flex justify-end"}>
                  <div
                    className={`max-w-[94%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-7 ${
                      m.role === "user"
                        ? "bg-slate-700/45 text-slate-100 ring-1 ring-white/8"
                        : "bg-gradient-to-br from-cyan-500/12 to-emerald-500/8 text-slate-200 ring-1 ring-cyan-400/20"
                    }`}
                  >
                    {m.text}
                    {m.table ? (
                      <div className="mt-2 overflow-x-auto rounded-lg border border-white/8">
                        <table className="table-fa !text-[11px]">
                          <thead>
                            <tr>
                              {m.table.columns.map((c, i) => (
                                <th key={i}>{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {m.table.rows.map((r, ri) => (
                              <tr key={ri}>
                                {r.map((cell, ci) => (
                                  <td key={ci}>{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                    {m.chips?.length ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {m.chips.map((c, i) => (
                          <button
                            key={i}
                            className={`chip ${c.action === "design" ? "chip-solid" : ""}`}
                            onClick={() => onChip(c)}
                            disabled={busy}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {busy ? (
                <div className="flex justify-end">
                  <div className="rounded-2xl bg-cyan-500/10 px-3.5 py-2.5 text-[12px] text-cyan-200 ring-1 ring-cyan-400/20">
                    در حال محاسبهٔ شش گام طراحی…
                  </div>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
            <div className="border-t border-white/6 p-3">
              <div className="flex gap-2">
                <input
                  className="field flex-1"
                  placeholder="مثلاً: وام خودروی خرد تا ۵۰۰ میلیون تومان، ۳۶ ماه، با چک صیادی و نرخ ۲۳ درصد"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submit();
                  }}
                />
                <button className="btn btn-primary shrink-0" onClick={() => void submit()} disabled={busy}>
                  ارسال
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button className="chip" onClick={() => void runDesign(spec)} disabled={busy}>
                  ⚡ طراحی فوری با مشخصات فعلی
                </button>
                {dirty && report ? (
                  <button className="chip chip-solid" onClick={() => void compute(spec)} disabled={busy}>
                    محاسبه مجدد تغییرات فرم
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* فرم مشخصات */}
          {showForm ? (
            <div className="panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13.5px] font-extrabold text-slate-100">فرم مشخصات محصول (۱۰ فیلد)</h3>
                <span className="badge badge-info">برچسب «فرض» = مقدار پیش‌فرض موتور</span>
              </div>
              <SpecForm spec={spec} answered={answered} onChange={patchSpec} />
            </div>
          ) : null}
        </div>

        {/* گزارش */}
        <div className="min-w-0">
          {report ? (
            <ReportView report={report} savedId={savedId} onSave={() => void save()} saving={busy} />
          ) : (
            <div className="panel rise grid h-full place-items-center p-8 text-center">
              <div className="max-w-xl">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-2xl font-black text-[#04121a]">
                  ٪
                </div>
                <h2 className="text-lg font-black text-slate-100">هنوز طراحی انجام نشده است</h2>
                <p className="mt-2 text-[12.5px] leading-8 text-slate-400">
                  در پنل گفتگو به پرسش‌ها پاسخ دهید یا فرم مشخصات را کامل کنید و «طراحی فوری» را بزنید. موتور شش گام اجباری را
                  طی می‌کند و خروجی را با نمودار ارائه می‌دهد.
                </p>
                <ol className="mt-5 grid gap-2 text-right sm:grid-cols-2">
                  {[
                    "۱. انتخاب عقد با ماتریس انطباق + ۳ دلیل فنی",
                    "۲. ساختار مالی: نرخ اسمی، نرخ مؤثر (IRR) و فرمول",
                    "۳. مدل جریان نقدی و جدول کامل اقساط",
                    "۴. طراحی ضمانت‌ها و پوشش وثیقه‌ای",
                    "۵. چک‌لیست انطباق مقرراتی بانک مرکزی",
                    "۶. مستندسازی ۱۴ بخشی + خروجی JSON نمودارها",
                  ].map((s) => (
                    <li key={s} className="panel-soft px-3 py-2 text-[11.5px] leading-6 text-slate-300">
                      {s}
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Link href="/knowledge" className="btn btn-ghost">
                    مشاهده دانشنامه عقود و نرخ‌های مصوب
                  </Link>
                  <Link href="/settings" className="btn btn-ghost">
                    تنظیمات سازمانی بانک
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
