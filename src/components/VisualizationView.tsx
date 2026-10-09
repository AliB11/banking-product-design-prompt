"use client";

import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compact, num, pct, toFa } from "@/lib/format";
import type { Visualization } from "@/lib/types";

const FALLBACK = ["#22d3ee", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#f87171"];

interface TipItem {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
  money,
}: {
  active?: boolean;
  payload?: TipItem[];
  label?: string;
  unit?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const fmt = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return String(v ?? "");
    return money ? compact(n, unit === "ریال" ? "IRR" : "IRT") : num(n, Math.abs(n) < 10 ? 2 : 0) + (unit ? ` ${unit}` : "");
  };
  return (
    <div className="rounded-xl border border-cyan-400/25 bg-[#070d18]/95 px-3 py-2 text-[11px] shadow-2xl backdrop-blur">
      {label ? <div className="mb-1 font-bold text-cyan-200">{label}</div> : null}
      {payload
        .filter((p) => p.name !== "base" && p.value !== undefined && p.value !== null)
        .map((p, i) => (
          <div key={i} className="flex items-center gap-2 whitespace-nowrap text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? FALLBACK[i % 6] }} />
            <span>{p.name === "value" ? "مقدار" : p.name}</span>
            <span className="num ms-auto font-bold text-slate-100">{fmt(p.value)}</span>
          </div>
        ))}
    </div>
  );
}

function axisProps(unit?: string, moneyAxis?: boolean) {
  return {
    stroke: "rgba(148,163,184,0.35)",
    tick: { fill: "#94a3b8", fontSize: 10 },
    tickFormatter: (v: number) => (moneyAxis ? compact(v, unit === "ریال" ? "IRR" : "IRT") : unit === "٪" ? `${toFa(v)}٪` : num(v, 0)),
  };
}

/* ------------------------------------------------------------- واترفال */

function Waterfall({ v }: { v: Visualization }) {
  const items = v.data.items ?? [];
  const rows: { label: string; base: number; value: number; kind: string; color: string }[] = [];
  let running = 0;
  items.forEach((it, idx) => {
    const kind = it.kind ?? (it.value >= 0 ? "increase" : "decrease");
    if (kind === "total" || idx === items.length - 1) {
      rows.push({ label: it.label, base: 0, value: it.value, kind: "total", color: it.value >= 0 ? "#22d3ee" : "#fb7185" });
      running = it.value;
    } else if (kind === "increase") {
      rows.push({ label: it.label, base: running, value: it.value, kind, color: "#34d399" });
      running += it.value;
    } else {
      const magnitude = Math.abs(it.value);
      running += it.value;
      rows.push({ label: it.label, base: running, value: magnitude, kind, color: "#fb7185" });
    }
  });
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={rows} margin={{ top: 18, right: 8, bottom: 42, left: 8 }} barCategoryGap={10}>
        <CartesianGrid stroke="rgba(148,163,184,0.09)" vertical={false} />
        <XAxis dataKey="label" reversed interval={0} angle={-18} textAnchor="end" height={62} {...axisProps(v.data.unit, v.data.compactAxis)} tick={{ fill: "#94a3b8", fontSize: 10 }} />
        <YAxis orientation="right" width={86} {...axisProps(v.data.unit, v.data.compactAxis)} />
        <Tooltip
          cursor={{ fill: "rgba(34,211,238,0.06)" }}
          content={<ChartTooltip unit={v.data.unit} money={v.data.compactAxis} />}
        />
        <Bar dataKey="base" name="base" stackId="w" fill="transparent" isAnimationActive={false} legendType="none" />
        <Bar dataKey="value" name="value" stackId="w" radius={[6, 6, 0, 0]}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------------------------------------------------------------- گیج */

function Gauge({ v }: { v: Visualization }) {
  const max = v.data.max ?? 100;
  const value = v.data.value ?? 0;
  const segments = v.data.segments ?? [];
  const R = 96;
  const CX = 120;
  const CY = 118;
  const polar = (angleDeg: number, r = R) => {
    const a = (Math.PI * (180 - angleDeg)) / 180;
    return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) };
  };
  const arc = (from: number, to: number, r: number) => {
    const s = polar(from, r);
    const e = polar(to, r);
    const large = to - from > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };
  const toneColor = (t?: string) => (t === "good" ? "#34d399" : t === "warn" ? "#fbbf24" : t === "bad" ? "#fb7185" : "#22d3ee");
  const total = segments.reduce((a, s) => a + s.value, 0) || max;
  const arcs = segments.reduce<{ from: number; to: number }[]>((acc, s) => {
    const from = acc.length ? acc[acc.length - 1].to : 0;
    const sweep = (s.value / total) * 180;
    acc.push({ from, to: Math.min(180, from + sweep) });
    return acc;
  }, []);
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: 240, height: 150 }}>
        <svg width="240" height="150" viewBox="0 0 240 150">
          <path d={arc(0, 180, R)} stroke="rgba(148,163,184,0.14)" strokeWidth="16" fill="none" strokeLinecap="round" />
          {segments.map((s, i) => {
            const { from, to } = arcs[i];
            return (
              <path
                key={i}
                d={arc(from, to, R)}
                stroke={toneColor(s.tone)}
                strokeWidth="16"
                fill="none"
                strokeLinecap="butt"
                opacity={0.92}
                className="draw-line"
                style={{ animationDelay: `${i * 90}ms` }}
              />
            );
          })}
          <path
            d={arc(0, Math.max(0.5, (value / max) * 180), R - 22)}
            stroke="rgba(34,211,238,0.55)"
            strokeWidth="3"
            fill="none"
          />
          {(() => {
            const p = polar(Math.max(0.5, (value / max) * 180), R - 22);
            return <circle cx={p.x} cy={p.y} r="5" fill="#22d3ee" className="pulse-ring" />;
          })()}
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <div className="num text-4xl font-black text-slate-50">{num(value, 1)}</div>
          <div className="text-[11px] text-slate-400">از {toFa(max)}</div>
        </div>
      </div>
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {segments.map((s, i) => {
          const segMax = s.max ?? max;
          return (
            <div key={i} className="panel-soft px-3 py-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{s.label}</span>
                <span className="num font-bold text-slate-200">
                  {num(s.value, 1)} <span className="text-slate-500">/ {toFa(segMax)}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (s.value / Math.max(1, segMax)) * 100)}%`, background: toneColor(s.tone) }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- نقشه حرارتی */

function Heatmap({ v }: { v: Visualization }) {
  const rows = v.data.rows ?? [];
  const cols = v.data.cols ?? [];
  const matrix = v.data.matrix ?? [];
  const flat = matrix.flat().filter((x) => Number.isFinite(x));
  const min = Math.min(...flat, 0);
  const max = Math.max(...flat, 1);
  const color = (x: number) => {
    const t = max === min ? 0.5 : (x - min) / (max - min);
    if (t < 0.5) {
      const k = t / 0.5;
      return `rgba(${Math.round(251 - (251 - 251) * k)}, ${Math.round(113 + (191 - 113) * k)}, ${Math.round(133 + (36 - 133) * k)}, ${0.18 + k * 0.3})`;
    }
    const k = (t - 0.5) / 0.5;
    return `rgba(${Math.round(251 - (251 - 52) * k)}, ${Math.round(191 + (211 - 191) * k)}, ${Math.round(36 + (153 - 36) * k)}, ${0.3 + k * 0.4})`;
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-[11px]">
        <thead>
          <tr>
            <th className="min-w-[130px] text-right font-semibold text-slate-400">سناریو / متغیر</th>
            {cols.map((c, i) => (
              <th key={i} className="min-w-[74px] text-center font-semibold text-slate-400">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              <td className="whitespace-nowrap pe-2 font-semibold text-slate-300">{r}</td>
              {(matrix[ri] ?? []).map((val, ci) => (
                <td key={ci} className="text-center">
                  <div
                    className="num rounded-lg py-2 font-bold text-slate-50"
                    style={{ background: color(val) }}
                    title={`${r} — ${cols[ci]}: ${val}`}
                  >
                    {v.data.unit === "٪" ? pct(val, 1) : num(val, 2)}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------------------------------------- کارت‌ها */

function Cards({ v }: { v: Visualization }) {
  const tone = (t?: string) =>
    t === "good"
      ? "border-emerald-400/25 bg-emerald-400/8"
      : t === "warn"
        ? "border-amber-400/25 bg-amber-400/8"
        : t === "bad"
          ? "border-rose-400/30 bg-rose-400/8"
          : "border-cyan-400/20 bg-cyan-400/6";
  const text = (t?: string) =>
    t === "good" ? "text-emerald-300" : t === "warn" ? "text-amber-300" : t === "bad" ? "text-rose-300" : "text-cyan-200";
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {(v.data.cards ?? []).map((c, i) => (
        <div key={i} className={`rounded-2xl border px-3 py-2.5 ${tone(c.tone)}`}>
          <div className="text-[11px] text-slate-400">{c.label}</div>
          <div className={`num mt-1 text-[15px] font-extrabold leading-tight ${text(c.tone)}`}>{c.value}</div>
          {c.hint ? <div className="mt-1 text-[10.5px] leading-relaxed text-slate-500">{c.hint}</div> : null}
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- جدول */

function TableViz({ v }: { v: Visualization }) {
  const cols = v.data.columns ?? [];
  const rows = v.data.tableRows ?? [];
  return (
    <div className="overflow-x-auto rounded-xl border border-white/6">
      <table className="table-fa">
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => (
                <td key={ci} className={typeof cell === "number" ? "num" : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {v.data.unit ? (
        <div className="border-t border-white/6 px-3 py-1.5 text-[10.5px] text-slate-500">
          واحد: {v.data.unit}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ رندر اصلی */

export function ChartBody({ v }: { v: Visualization }) {
  const unit = v.data.unit;
  const moneyAxis = Boolean(v.data.compactAxis);
  const ax = axisProps(unit, moneyAxis);
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  if (v.type === "cards") return <Cards v={v} />;
  if (v.type === "table" || v.type === "schedule") return <TableViz v={v} />;
  if (v.type === "gauge") return <Gauge v={v} />;
  if (v.type === "heatmap") return <Heatmap v={v} />;

  if (!mounted) {
    return (
      <div className="grid h-[300px] place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-[11.5px] text-slate-500">
          <span className="h-2 w-2 animate-ping rounded-full bg-cyan-400" />
          در حال بارگذاری «{v.title}»…
        </div>
      </div>
    );
  }

  if (v.type === "waterfall") return <Waterfall v={v} />;

  if (v.type === "comparison") {
    const data = (v.data.categories ?? []).map((c, i) => ({
      name: c,
      ...(v.data.series ?? []).reduce((acc, s) => ({ ...acc, [s.name]: s.values[i] }), {}),
    }));
    return (
      <ResponsiveContainer width="100%" height={Math.max(220, (v.data.categories?.length ?? 4) * 62)}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.09)" horizontal={false} />
          <XAxis type="number" {...ax} orientation="top" />
          <YAxis type="category" dataKey="name" orientation="right" width={150} tick={{ fill: "#cbd5e1", fontSize: 11 }} stroke="rgba(148,163,184,0.3)" />
          <Tooltip cursor={{ fill: "rgba(34,211,238,0.06)" }} content={<ChartTooltip unit={unit} money={moneyAxis} />} />
          {(v.data.series ?? []).map((s, si) => (
            <Bar key={si} dataKey={s.name} radius={[0, 8, 8, 0]} barSize={26}>
              {data.map((d, di) => (
                <Cell key={di} fill={d.name === v.data.highlight ? "#22d3ee" : (s.color ?? FALLBACK[si % 6])} opacity={d.name === v.data.highlight ? 1 : 0.55} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (v.type === "radar") {
    const data = (v.data.axes ?? []).map((axis, i) => {
      const row: Record<string, string | number> = { axis };
      (v.data.series ?? []).forEach((s) => (row[s.name] = s.values[i]));
      return row;
    });
    return (
      <ResponsiveContainer width="100%" height={360}>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgba(148,163,184,0.2)" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "#94a3b8", fontSize: 10 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} />
          {(v.data.series ?? []).map((s, i) => (
            <Radar
              key={i}
              name={s.name}
              dataKey={s.name}
              stroke={s.color ?? FALLBACK[i % 6]}
              fill={s.color ?? FALLBACK[i % 6]}
              fillOpacity={i === 0 ? 0.28 : 0.08}
              strokeWidth={i === 0 ? 2.4 : 1.4}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
          <Tooltip content={<ChartTooltip unit="امتیاز" />} />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (v.type === "line") {
    const data = (v.data.categories ?? []).map((c, i) => {
      const row: Record<string, string | number> = { name: c };
      (v.data.series ?? []).forEach((s) => (row[s.name] = s.values[i]));
      return row;
    });
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 28, left: 8 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.09)" vertical={false} />
          <XAxis dataKey="name" reversed minTickGap={14} {...ax} tick={{ fill: "#94a3b8", fontSize: 10 }} angle={data.length > 14 ? -20 : 0} textAnchor={data.length > 14 ? "end" : "middle"} height={data.length > 14 ? 52 : 30} />
          <YAxis orientation="right" width={92} {...ax} />
          <Tooltip content={<ChartTooltip unit={unit} money={moneyAxis} />} cursor={{ stroke: "rgba(34,211,238,0.4)" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {(v.data.series ?? []).map((s, i) => (
            <Line
              key={i}
              type="monotone"
              dataKey={s.name}
              stroke={s.color ?? FALLBACK[i % 6]}
              strokeWidth={2.4}
              dot={data.length <= 14}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // bar (پیش‌فرض)
  const data = (v.data.categories ?? []).map((c, i) => {
    const row: Record<string, string | number> = { name: c };
    (v.data.series ?? []).forEach((s) => (row[s.name] = s.values[i]));
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 12, right: 12, bottom: 34, left: 8 }} barGap={2}>
        <CartesianGrid stroke="rgba(148,163,184,0.09)" vertical={false} />
        <XAxis dataKey="name" reversed minTickGap={8} {...ax} tick={{ fill: "#94a3b8", fontSize: 10 }} angle={data.length > 10 ? -22 : 0} textAnchor={data.length > 10 ? "end" : "middle"} height={data.length > 10 ? 56 : 30} />
        <YAxis orientation="right" width={92} {...ax} />
        <Tooltip cursor={{ fill: "rgba(34,211,238,0.06)" }} content={<ChartTooltip unit={unit} money={moneyAxis} />} />
        {(v.data.series ?? []).length > 1 ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
        {(v.data.series ?? []).map((s, i) => (
          <Bar key={i} dataKey={s.name} fill={s.color ?? FALLBACK[i % 6]} radius={[6, 6, 0, 0]} maxBarSize={30} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function VisualizationView({ v, index }: { v: Visualization; index?: number }) {
  return (
    <section className="panel rise p-4 sm:p-5" style={{ animationDelay: `${(index ?? 0) * 40}ms` }}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-[15px] font-extrabold text-slate-100">{v.title}</h4>
          {v.subtitle ? <p className="mt-0.5 text-[11.5px] text-slate-400">{v.subtitle}</p> : null}
        </div>
        <span className="badge badge-info shrink-0">{vizTypeLabel(v.type)}</span>
      </header>
      <ChartBody v={v} />
      <div className="mt-3 rounded-xl border-r-2 border-cyan-400/60 bg-cyan-400/5 px-3 py-2.5">
        <div className="mb-1 text-[10.5px] font-bold tracking-wide text-cyan-300/90">تفسیر سه‌جمله‌ای</div>
        <p className="text-[12.5px] leading-7 text-slate-300">{v.insight}</p>
      </div>
    </section>
  );
}

export function vizTypeLabel(t: string): string {
  const map: Record<string, string> = {
    bar: "نمودار ستونی",
    line: "نمودار خطی",
    waterfall: "واترفال",
    radar: "رادار",
    heatmap: "نقشه حرارتی",
    gauge: "گیج",
    table: "جدول",
    comparison: "مقایسه",
    cards: "شاخص‌ها",
    schedule: "جدول اقساط",
  };
  return map[t] ?? t;
}
