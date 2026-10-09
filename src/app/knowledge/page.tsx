import Link from "next/link";
import {
  COLLATERALS,
  CONTRACT_LIST,
  DEPOSIT_TYPES,
  FUNDING_STRUCTURES,
  NEED_MATRIX,
  RATE_TABLE,
  REPAYMENT_MODES,
  SEGMENTS,
} from "@/lib/contracts";
import { num, toFa } from "@/lib/format";
import { readSettings } from "@/lib/settingsRepo";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const settings = await readSettings();
  return (
    <div className="space-y-5">
      <div className="panel rise p-5">
        <h1 className="text-xl font-black text-slate-50">دانشنامه تخصصی — مخزن دانش دائمی موتور</h1>
        <p className="mt-2 text-[12.5px] leading-8 text-slate-400">
          مبنای دانش فعلی: {settings.knowledgeDate}. این مقادیر «پیش‌فرض» هستند و در صفحه تنظیمات سازمانی قابل به‌روزرسانی‌اند.
          اگر مصوبه جدید شورای پول و اعتبار را وارد کنید، موتور همان را جایگزین می‌کند و هرگز نرخ خارج از سقف مصوب طراحی
          نمی‌شود.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/" className="btn btn-primary">بازگشت به میز طراحی</Link>
          <Link href="/settings" className="btn btn-ghost">به‌روزرسانی نرخ‌ها و پارامترهای بانک</Link>
        </div>
      </div>

      <section className="panel p-5">
        <h2 className="mb-1 text-[16px] font-extrabold text-slate-100">۲.۱ عقود تسهیلاتی مرسوم ایران</h2>
        <p className="mb-4 text-[12px] text-slate-400">
          برای هر عقد: مبنای قانونی، ساختار، کاربرد، نرخ مصوب، ساختار بازپرداخت مجاز و ریسک‌های خاص به همراه راهکار پوشش.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          {CONTRACT_LIST.map((c) => (
            <article key={c.code} className="panel-soft p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[14px] font-extrabold text-cyan-200">{c.name}</h3>
                <span className="badge badge-good shrink-0">سقف {toFa(c.ceiling)}٪</span>
              </div>
              <p className="num mt-1 text-[10.5px] text-slate-500">{c.legalBasis}</p>
              <p className="mt-2 text-[12px] leading-7 text-slate-300">{c.structure}</p>
              <dl className="mt-3 grid gap-1.5 text-[11.5px]">
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">کاربرد</dt><dd className="text-slate-300">{c.usage}</dd></div>
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">نرخ پایه</dt><dd className="num text-slate-300">{toFa(c.baseRate)}٪{c.spreadMax > 0 ? ` (+ مابه‌التفاوت ${toFa(c.spreadMin)} تا ${toFa(c.spreadMax)} واحد)` : ""}</dd></div>
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">مدت متعارف</dt><dd className="num text-slate-300">{toFa(c.tenorRange[0])} تا {toFa(c.tenorRange[1])} ماه</dd></div>
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">بازپرداخت</dt><dd className="text-slate-300">{c.repaymentModes.map((m) => REPAYMENT_MODES[m].label).join("، ")}</dd></div>
                <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">فرمول سود</dt><dd className="num text-amber-200/80" dir="rtl">{c.profitFormula}</dd></div>
              </dl>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-rose-400/20 bg-rose-400/6 p-2.5">
                  <div className="mb-1 text-[10.5px] font-bold text-rose-300">ریسک‌های خاص عقد</div>
                  <ul className="space-y-1 text-[11px] leading-6 text-slate-300">
                    {c.risks.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/6 p-2.5">
                  <div className="mb-1 text-[10.5px] font-bold text-emerald-300">راهکار پوشش در طراحی</div>
                  <ul className="space-y-1 text-[11px] leading-6 text-slate-300">
                    {c.mitigation.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-3 text-[16px] font-extrabold text-slate-100">۲.۳ نرخ‌های مصوب (پیش‌فرض)</h2>
          <table className="table-fa">
            <thead>
              <tr><th>عقد / سپرده</th><th>نرخ پیش‌فرض</th><th>یادداشت</th></tr>
            </thead>
            <tbody>
              {RATE_TABLE.map((r) => (
                <tr key={r.label}>
                  <td className="font-semibold text-slate-200">{r.label}</td>
                  <td className="num text-cyan-200">{r.rate}</td>
                  <td className="text-slate-400">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11.5px] leading-7 text-amber-200/80">
            ⚠ این اعداد مبنای پیش‌فرض‌اند. در شروع هر گفتگو تاریخ اعتبار دانش ذکر می‌شود و با ارائه مصوبه جدید، جایگزین
            می‌گردد.
          </p>
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 text-[16px] font-extrabold text-slate-100">۲.۲ سپرده‌ها و مبنای ALM</h2>
          <table className="table-fa">
            <thead>
              <tr><th>منبع</th><th>نرخ</th><th>سررسید</th><th>نرخ تمدید</th><th>هسته پایدار</th></tr>
            </thead>
            <tbody>
              {Object.values(DEPOSIT_TYPES).map((d) => (
                <tr key={d.code}>
                  <td className="text-slate-200">{d.name}</td>
                  <td className="num">{toFa(d.rate)}٪</td>
                  <td className="num">{num(d.tenorMonths, 1)} ماه</td>
                  <td className="num">{toFa(Math.round(d.rollover * 100))}٪</td>
                  <td className="num">{toFa(Math.round(d.stableCore * 100))}٪</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11.5px] leading-7 text-slate-400">
            قاعده ALM موتور: هر تسهیلات باید با سپرده هم‌سررسید تامین شود و نرخ بازده مورد انتظار سپرده‌گذار، کف سودآوری
            محصول است.
          </p>
          <div className="mt-3 grid gap-2">
            {Object.entries(FUNDING_STRUCTURES).map(([k, v]) => (
              <div key={k} className="panel-soft px-3 py-2">
                <div className="text-[12px] font-bold text-slate-200">{v.label}</div>
                <div className="num mt-0.5 text-[11px] text-slate-400">
                  ترکیب: {v.mix.map(([code, share]) => `${DEPOSIT_TYPES[code].name} ${toFa(Math.round(share * 100))}٪`).join("، ")}
                </div>
                <div className="mt-0.5 text-[11px] text-cyan-200/80">{v.almFit}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel p-5">
        <h2 className="mb-3 text-[16px] font-extrabold text-slate-100">ماتریس انطباق نیاز ⟵ عقد (گام ۱ موتور طراحی)</h2>
        <table className="table-fa">
          <thead>
            <tr><th>نیاز مشتری</th><th>عقد اولویت‌دار</th><th>جایگزین‌ها</th></tr>
          </thead>
          <tbody>
            {Object.entries(NEED_MATRIX).map(([k, v]) => (
              <tr key={k}>
                <td className="font-semibold text-slate-200">{v.label}</td>
                <td className="text-cyan-200">{CONTRACT_LIST.find((c) => c.code === v.primary)?.name}</td>
                <td className="text-slate-400">{v.alternatives.map((a) => CONTRACT_LIST.find((c) => c.code === a)?.name).join("، ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-3 text-[16px] font-extrabold text-slate-100">۲.۴ وثایق و ضمانت‌ها</h2>
          <table className="table-fa">
            <thead>
              <tr><th>وثیقه</th><th>سنگینی</th><th>تنزیل</th><th>روزهای فرایند</th><th>پوشش پیشنهادی</th></tr>
            </thead>
            <tbody>
              {Object.entries(COLLATERALS).map(([k, c]) => (
                <tr key={k}>
                  <td className="font-semibold text-slate-200">{c.label}</td>
                  <td className="num">{toFa(c.heaviness)}</td>
                  <td className="num">{toFa(c.haircut)}٪</td>
                  <td className="num">{toFa(c.processDays)}</td>
                  <td className="num">{toFa(c.suggestedCoverage)}٪</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel p-5">
          <h2 className="mb-3 text-[16px] font-extrabold text-slate-100">۲.۵ ریاضیات مالی موتور</h2>
          <ul className="space-y-2 text-[12px] leading-7 text-slate-300">
            {Object.entries(REPAYMENT_MODES).map(([k, m]) => (
              <li key={k} className="panel-soft px-3 py-2">
                <div className="font-bold text-slate-100">{m.label}</div>
                <div className="text-[11.5px] text-slate-400">{m.desc}</div>
                <div className="num mt-1 text-[11.5px] text-amber-200/85" dir="ltr">{m.formula}</div>
              </li>
            ))}
            <li className="panel-soft px-3 py-2">
              <div className="font-bold text-slate-100">شاخص‌های ریسک و سودآوری</div>
              <div className="num mt-1 text-[11.5px] text-amber-200/85" dir="ltr">
                EL = PD × LGD × EAD | IRR: NPV(flows) = 0 | RAROC = Net Margin ÷ Allocated Capital
              </div>
            </li>
          </ul>
          <h3 className="mb-2 mt-4 text-[13px] font-bold text-slate-200">بخش‌های بازار هدف و PD نمونه</h3>
          <table className="table-fa">
            <thead>
              <tr><th>بخش</th><th>PD</th><th>روزهای فرایند</th><th>توضیح</th></tr>
            </thead>
            <tbody>
              {Object.entries(SEGMENTS).map(([k, s]) => (
                <tr key={k}>
                  <td className="font-semibold text-slate-200">{s.label}</td>
                  <td className="num">{toFa(s.pd)}٪</td>
                  <td className="num">{toFa(s.processDays)}</td>
                  <td className="text-slate-400">{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
