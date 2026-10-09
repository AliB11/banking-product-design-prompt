import Link from "next/link";
import { listDesigns } from "@/lib/designRepo";
import { CONTRACTS, NEED_MATRIX, SEGMENTS } from "@/lib/contracts";
import { compact, faDateTime, num, pct, toFa } from "@/lib/format";
import type { ContractCode, NeedCode, Segment } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس",
  review: "در حال بررسی",
  approved: "تصویب‌شده",
  archived: "بایگانی",
};

const STATUS_TONE: Record<string, string> = {
  draft: "badge-warn",
  review: "badge-info",
  approved: "badge-good",
  archived: "badge-bad",
};

export default async function DesignsPage() {
  const items = await listDesigns();

  return (
    <div className="space-y-5">
      <div className="panel rise flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h1 className="text-xl font-black text-slate-50">گنجینه طراحی‌ها</h1>
          <p className="mt-1 text-[12.5px] text-slate-400">
            {items.length
              ? `${toFa(items.length)} محصول طراحی‌شده ذخیره شده است. هر رکورد شامل مشخصات کامل، گزارش ۱۴ بخشی و تمام نمودارهاست.`
              : "هنوز طراحی‌ای ذخیره نشده است. از میز طراحی یک محصول بسازید و آن را ذخیره کنید."}
          </p>
        </div>
        <Link href="/" className="btn btn-primary">
          طراحی محصول جدید
        </Link>
      </div>

      {items.length ? (
        <>
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {items.map((d, i) => {
              const contract = CONTRACTS[d.contractCode as ContractCode];
              const seg = SEGMENTS[d.segment as Segment];
              const need = NEED_MATRIX[d.needCode as NeedCode];
              const healthTone = d.healthScore >= 70 ? "text-emerald-300" : d.healthScore >= 55 ? "text-amber-300" : "text-rose-300";
              return (
                <Link
                  key={d.id}
                  href={`/designs/${d.id}`}
                  className="panel rise group p-4 transition hover:border-cyan-400/35"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-[14px] font-extrabold text-slate-100 group-hover:text-cyan-200">{d.name}</h2>
                      <p className="num mt-0.5 text-[11px] text-slate-500">{d.code}</p>
                    </div>
                    <span className={`badge ${STATUS_TONE[d.status] ?? "badge-info"} shrink-0`}>
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="badge badge-info">{contract?.name ?? d.contractCode}</span>
                    <span className="badge badge-good">{seg?.label ?? d.segment}</span>
                    <span className="badge badge-warn">{need?.label ?? d.needCode}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      ["مبلغ مبنا", compact(d.baseAmount, d.currency)],
                      ["مدت", `${num(d.tenorMonths, 0)} ماه`],
                      ["قسط", compact(d.installment, d.currency)],
                      ["نرخ مؤثر", pct(d.effectiveRate, 1)],
                      ["حاشیه خالص", pct(d.netMarginPct, 1)],
                      ["جذابیت", `${num(d.attractivenessScore, 0)} از ۱۰۰`],
                    ].map(([k, v]) => (
                      <div key={k} className="panel-soft px-2.5 py-1.5">
                        <div className="text-[10px] text-slate-500">{k}</div>
                        <div className="num text-[11.5px] font-bold text-slate-200">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-white/6 pt-2.5">
                    <span className="text-[10.5px] text-slate-500">{faDateTime(d.createdAt)}</span>
                    <span className={`num text-lg font-black ${healthTone}`}>{num(d.healthScore, 1)}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="panel p-5">
            <h2 className="mb-3 text-[15px] font-extrabold text-slate-100">مقایسه سریع سبد محصولات طراحی‌شده</h2>
            <div className="overflow-x-auto">
              <table className="table-fa">
                <thead>
                  <tr>
                    <th>محصول</th>
                    <th>عقد</th>
                    <th>مبلغ مبنا</th>
                    <th>مدت</th>
                    <th>نرخ مؤثر</th>
                    <th>حاشیه خالص</th>
                    <th>کف نقدینگی</th>
                    <th>جذابیت</th>
                    <th>سلامت</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => (
                    <tr key={d.id}>
                      <td className="font-semibold text-slate-200">
                        <Link href={`/designs/${d.id}`} className="hover:text-cyan-200">{d.name}</Link>
                      </td>
                      <td>{CONTRACTS[d.contractCode as ContractCode]?.name ?? d.contractCode}</td>
                      <td className="num">{compact(d.baseAmount, d.currency)}</td>
                      <td className="num">{num(d.tenorMonths, 0)} ماه</td>
                      <td className="num">{pct(d.effectiveRate, 1)}</td>
                      <td className="num">{pct(d.netMarginPct, 1)}</td>
                      <td className="num">{compact(d.liquidityFloor, d.currency)}</td>
                      <td className="num">{num(d.attractivenessScore, 0)}</td>
                      <td className="num font-bold text-cyan-200">{num(d.healthScore, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="panel grid place-items-center p-12 text-center">
          <div>
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-2xl font-black text-[#04121a]">
              ❖
            </div>
            <h2 className="text-lg font-black text-slate-100">گنجینه خالی است</h2>
            <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-8 text-slate-400">
              در میز طراحی، پس از تکمیل گفتگو یا فرم مشخصات، دکمه «ذخیره در گنجینه طراحی‌ها» را بزنید تا گزارش کامل به همراه
              تمام نمودارها و خروجی JSON در پایگاه‌داده ثبت شود.
            </p>
            <Link href="/" className="btn btn-primary mt-4">
              شروع طراحی
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
