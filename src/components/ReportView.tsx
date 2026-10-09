"use client";

import { useMemo, useState } from "react";
import VisualizationView, { vizTypeLabel } from "./VisualizationView";
import { money, num, pct, toFa } from "@/lib/format";
import { CONTRACTS, NEED_MATRIX, SEGMENTS } from "@/lib/contracts";
import type { DocBlock, DocSection, ProductReport, Visualization } from "@/lib/types";

type Tab = "doc" | "charts" | "json" | "quality";

const TABS: { id: Tab; label: string }[] = [
  { id: "doc", label: "مشخصات محصول (۱۴ بخش)" },
  { id: "charts", label: "گالری نمودارها" },
  { id: "json", label: "خروجی JSON نمودارها" },
  { id: "quality", label: "چک‌لیست کنترل کیفیت" },
];

function Block({ block, vizById }: { block: DocBlock; vizById: Map<string, Visualization> }) {
  switch (block.kind) {
    case "text":
      return <p className="text-[13px] leading-8 text-slate-300">{block.text}</p>;
    case "list":
      return (
        <ul className="space-y-1.5">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2 text-[12.5px] leading-7 text-slate-300">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      );
    case "kv":
      return (
        <dl className="grid gap-2 sm:grid-cols-2">
          {block.rows.map(([k, v], i) => (
            <div key={i} className="panel-soft px-3 py-2">
              <dt className="text-[11px] text-slate-400">{k}</dt>
              <dd className="mt-0.5 text-[12.5px] font-semibold text-slate-100">{v}</dd>
            </div>
          ))}
        </dl>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-white/6">
          <table className="table-fa">
            <thead>
              <tr>
                {block.columns.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "formula":
      return (
        <div className="num overflow-x-auto rounded-xl border border-amber-400/25 bg-amber-400/6 px-3 py-2.5 text-[12px] leading-7 text-amber-100/90" dir="ltr">
          <span className="me-2 text-amber-300/80" dir="rtl">فرمول:</span>
          {block.text}
        </div>
      );
    case "viz": {
      const v = vizById.get(block.ref);
      return v ? <VisualizationView v={v} /> : null;
    }
    case "flow":
      return (
        <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {block.steps.map((s, i) => (
            <li key={i} className="panel-soft relative overflow-hidden px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="num grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 text-[11px] font-black text-[#04121a]">
                  {toFa(i + 1)}
                </span>
                <span className="text-[12.5px] font-bold text-slate-100">{s.title}</span>
                {s.days > 0 ? <span className="badge badge-info ms-auto">{toFa(s.days)} روز</span> : null}
              </div>
              <p className="mt-1.5 text-[11.5px] leading-6 text-slate-400">{s.detail}</p>
            </li>
          ))}
        </ol>
      );
    default:
      return null;
  }
}

function Section({ section, vizById }: { section: DocSection; vizById: Map<string, Visualization> }) {
  return (
    <section id={`sec-${section.no}`} className="panel rise p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-3 border-b border-white/6 pb-3">
        <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/12 text-sm font-black text-cyan-300 ring-1 ring-cyan-400/25">
          {toFa(section.no)}
        </span>
        <h3 className="text-[15px] font-extrabold text-slate-100">{section.title}</h3>
      </header>
      <div className="space-y-4">
        {section.blocks.map((b, i) => (
          <Block key={i} block={b} vizById={vizById} />
        ))}
      </div>
    </section>
  );
}

export default function ReportView({
  report,
  savedId,
  onSave,
  saving,
}: {
  report: ProductReport;
  savedId?: number | null;
  onSave?: () => void;
  saving?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("doc");
  const [copied, setCopied] = useState(false);
  const vizById = useMemo(
    () => new Map(report.visualizations.map((v) => [v.id, v])),
    [report.visualizations],
  );
  const cur = report.spec.currency;

  const json = useMemo(
    () => JSON.stringify({ product: { name: report.spec.productName, code: report.spec.productCode }, visualization: report.visualizations }, null, 2),
    [report],
  );

  const download = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.spec.productCode || "product"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* سربرگ محصول */}
      <div className="panel rise relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/12 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-info">{report.contract.name}</span>
              <span className="badge badge-good">{SEGMENTS[report.spec.segment].label}</span>
              <span className="badge badge-warn">{NEED_MATRIX[report.spec.needCode].label}</span>
              {report.spec.assumedFields.length ? (
                <span className="badge badge-warn">{toFa(report.spec.assumedFields.length)} فرض هوشمند</span>
              ) : null}
            </div>
            <h2 className="mt-2 text-xl font-black text-slate-50 sm:text-2xl">{report.spec.productName}</h2>
            <p className="num mt-1 text-[12px] text-slate-400">
              کد محصول: {report.spec.productCode} — واحد پولی: {cur === "IRR" ? "ریال" : "تومان"} — {report.meta.engineVersion}
            </p>
            <p className="mt-2 text-[12px] leading-7 text-slate-400">{report.contract.structure}</p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/6 px-5 py-3">
            <div className="num text-4xl font-black text-cyan-200">{num(report.health.total, 1)}</div>
            <div className="text-[11px] text-slate-400">امتیاز سلامت از ۱۰۰</div>
            <div className={`badge ${report.health.total >= 70 ? "badge-good" : report.health.total >= 55 ? "badge-warn" : "badge-bad"}`}>
              {report.health.grade}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["مبلغ مبنا", money(report.spec.baseAmount, cur)],
            ["مدت", `${num(report.spec.tenorMonths, 0)} ماه`],
            ["قسط", money(report.financial.installmentAmount, cur)],
            ["نرخ اسمی / مؤثر", `${pct(report.financial.nominalRate, 1)} / ${pct(report.financial.effectiveAnnualRate, 1)}`],
            ["حاشیه خالص", `${money(report.profitability.netMargin, cur)} (${pct(report.profitability.netMarginPct, 1)})`],
            ["RAROC", pct(report.profitability.rorac, 1)],
          ].map(([k, v], i) => (
            <div key={i} className="panel-soft px-3 py-2">
              <div className="text-[10.5px] text-slate-400">{k}</div>
              <div className="num mt-0.5 text-[12.5px] font-bold text-slate-100">{v}</div>
            </div>
          ))}
        </div>

        {report.contract.warnings.length ? (
          <div className="mt-4 space-y-1.5 rounded-xl border border-amber-400/25 bg-amber-400/6 px-3 py-2.5">
            {report.contract.warnings.map((w, i) => (
              <p key={i} className="text-[12px] leading-7 text-amber-100/90">
                ⚠ {w}
              </p>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {onSave ? (
            <button className="btn btn-primary" onClick={onSave} disabled={saving}>
              {saving ? "در حال ذخیره…" : savedId ? `ذخیره شد (شناسه ${toFa(savedId)}) — ذخیره نسخه جدید` : "ذخیره در گنجینه طراحی‌ها"}
            </button>
          ) : null}
          <button className="btn btn-ghost" onClick={download}>
            دانلود JSON نمودارها
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            چاپ گزارش
          </button>
        </div>
      </div>

      {/* تب‌ها */}
      <div className="sticky top-[68px] z-30 flex flex-wrap gap-1.5 rounded-2xl border border-white/6 bg-[#070c16]/90 p-1.5 backdrop-blur-xl">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3.5 py-2 text-[12.5px] font-bold transition ${
              tab === t.id ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "doc" ? (
        <div className="grid gap-4 xl:grid-cols-[210px_1fr]">
          <aside className="panel hidden h-max p-3 xl:block xl:sticky xl:top-[140px]">
            <div className="mb-2 px-1 text-[11px] font-bold text-slate-400">فهرست ۱۴ بخش</div>
            <nav className="space-y-0.5">
              {report.documentation.map((s) => (
                <a
                  key={s.no}
                  href={`#sec-${s.no}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11.5px] text-slate-400 transition hover:bg-cyan-400/10 hover:text-cyan-200"
                >
                  <span className="num w-5 shrink-0 text-slate-500">{toFa(s.no)}</span>
                  <span className="leading-5">{s.title}</span>
                </a>
              ))}
            </nav>
          </aside>
          <div className="space-y-4">
            {report.documentation.map((s) => (
              <Section key={s.no} section={s} vizById={vizById} />
            ))}
          </div>
        </div>
      ) : null}

      {tab === "charts" ? (
        <div className="grid gap-4 2xl:grid-cols-2">
          {report.visualizations.map((v, i) => (
            <VisualizationView key={v.id} v={v} index={i} />
          ))}
        </div>
      ) : null}

      {tab === "json" ? (
        <div className="panel p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-extrabold text-slate-100">پروتکل JSON خروجی بصری (بخش ۸)</h3>
              <p className="mt-1 text-[11.5px] text-slate-400">
                هر نمودار با ساختار استاندارد {`{ visualization: { type, title, subtitle, data, insight } }`} خروجی داده می‌شود و
                با Recharts/D3/ECharts قابل رندر مستقیم است.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(json);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "کپی شد ✓" : "کپی کل JSON"}
              </button>
              <button className="btn btn-ghost" onClick={download}>
                دانلود
              </button>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {report.visualizations.map((v) => (
              <span key={v.id} className="badge badge-info">
                {v.id} — {vizTypeLabel(v.type)}
              </span>
            ))}
          </div>
          <pre className="num max-h-[620px] overflow-auto rounded-xl border border-white/8 bg-[#04070d] p-3 text-[11px] leading-6 text-emerald-200/85" dir="ltr">
            {json}
          </pre>
        </div>
      ) : null}

      {tab === "quality" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="panel p-5">
            <h3 className="mb-3 text-[15px] font-extrabold text-slate-100">چک‌لیست خودارزیابی پیش از ارسال خروجی</h3>
            <ul className="space-y-2">
              {report.quality.map((q, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px] font-black ${q.ok ? "bg-emerald-400/20 text-emerald-300" : "bg-rose-400/20 text-rose-300"}`}>
                    {q.ok ? "✓" : "✗"}
                  </span>
                  <span className="text-[12.5px] leading-7 text-slate-300">{q.item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="panel p-5">
              <h3 className="mb-3 text-[14px] font-extrabold text-slate-100">فرض‌های هوشمند اعلام‌شده</h3>
              {report.spec.assumedFields.length ? (
                <ul className="space-y-1.5">
                  {report.spec.assumedFields.map((f, i) => (
                    <li key={i} className="rounded-lg border border-amber-400/20 bg-amber-400/6 px-2.5 py-1.5 text-[11.5px] text-amber-100/90">
                      <span className="num">{f}</span> — فرض، قابل تغییر
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-slate-400">تمام فیلدها با ورودی کاربر پر شده است.</p>
              )}
            </div>
            <div className="panel p-5">
              <h3 className="mb-2 text-[14px] font-extrabold text-slate-100">مبنای دانش مقرراتی</h3>
              <p className="text-[12px] leading-7 text-slate-400">{report.meta.knowledgeDate}</p>
              <p className="mt-2 text-[12px] leading-7 text-slate-400">
                سقف مصوب عقد «{report.contract.name}»: {toFa(CONTRACTS[report.contract.code].ceiling)}٪ — نرخ طراحی‌شده:{" "}
                {pct(report.spec.nominalRate, 1)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
