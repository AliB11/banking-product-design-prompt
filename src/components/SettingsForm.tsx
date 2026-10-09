"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_SETTINGS } from "@/lib/spec";
import { num, pct, toFa } from "@/lib/format";
import type { OrgSettings } from "@/lib/types";

const NUMBER_FIELDS: { key: keyof OrgSettings; label: string; hint: string; step?: number; max?: number }[] = [
  { key: "realFundingCost", label: "هزینه تامین مالی واقعی بانک (٪)", hint: "میانگین موزون نرخ منابع در ترازنامه؛ موتور عدد بزرگ‌تر میان این و مدل را انتخاب می‌کند (محافظه‌کاری)", step: 0.1, max: 40 },
  { key: "historicalNpl", label: "سابقه NPL بانک (٪)", hint: "نسبت مطالبات غیرجاری به کل تسهیلات؛ مبنای برآورد PD و سناریوهای بحرانی", step: 0.1, max: 30 },
  { key: "opexRate", label: "هزینه عملیاتی (٪ اصل تسهیلات)", hint: "پیش‌فرض ۲٪ شامل فرایند، ارزیابی، وصول و پشتیبانی", step: 0.1, max: 10 },
  { key: "capitalAdequacy", label: "نسبت کفایت سرمایه (٪)", hint: "مبنای محاسبه سرمایه تخصیصی و RAROC", step: 0.1, max: 25 },
  { key: "riskWeight", label: "وزن ریسک تسهیلات (٪)", hint: "پیش‌فرض ۱۰۰٪ برای تسهیلات بدون تضمین بانک مرکزی", step: 5, max: 150 },
  { key: "rateCeiling", label: "سقف نرخ مصوب عمومی (٪)", hint: "سقف شورای پول و اعتبار؛ موتور هرگز بالاتر از آن طراحی نمی‌کند", step: 0.5, max: 40 },
  { key: "latePenaltyRate", label: "نرخ وجه التزام تاخیر (٪ سالانه)", hint: "پیش‌فرض ۶٪ روی مبالغ سررسیده پرداخت‌نشده", step: 0.5, max: 20 },
  { key: "interbankRate", label: "نرخ بازار بین‌بانکی / خط پشتیبان (٪)", hint: "هزینه تامین مالی اضطراری در سناریوهای استرس", step: 0.5, max: 40 },
];

const DEPOSIT_FIELDS: { key: keyof OrgSettings["depositRates"]; label: string }[] = [
  { key: "current", label: "حساب جاری" },
  { key: "qarz", label: "قرض‌الحسنه" },
  { key: "shortTerm", label: "کوتاه‌مدت" },
  { key: "oneYear", label: "بلندمدت یک‌ساله" },
  { key: "twoYear", label: "بلندمدت دوساله" },
  { key: "threeYear", label: "بلندمدت سه‌ساله" },
];

export default function SettingsForm({ initial }: { initial: OrgSettings }) {
  const router = useRouter();
  const [draft, setDraft] = useState<OrgSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setBusy(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4">
      <div className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-extrabold text-slate-100">تنظیمات سازمانی بانک</h2>
            <p className="mt-1 text-[12px] leading-7 text-slate-400">
              این پارامترها مستقیماً در محاسبه هزینه تامین مالی، زیان اعتباری مورد انتظار، سرمایه تخصیصی و کف سودآوری محصول
              اثر دارند. تغییر آن‌ها همه طراحی‌های بعدی را بازکالیبره می‌کند.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => setDraft(DEFAULT_SETTINGS)}>
              بازگردانی پیش‌فرض
            </button>
            <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>
              {busy ? "در حال ذخیره…" : saved ? "ذخیره شد ✓" : "ذخیره تنظیمات"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="panel p-5">
          <h3 className="mb-3 text-[14px] font-extrabold text-slate-100">هویت و مبنای دانش</h3>
          <label className="block">
            <span className="label">نام بانک</span>
            <input className="field" value={draft.bankName} onChange={(e) => setDraft({ ...draft, bankName: e.target.value })} />
          </label>
          <label className="mt-3 block">
            <span className="label">تاریخ اعتبار دانش مقرراتی</span>
            <input
              className="field"
              value={draft.knowledgeDate}
              onChange={(e) => setDraft({ ...draft, knowledgeDate: e.target.value })}
            />
            <span className="mt-1 block text-[10.5px] leading-5 text-slate-500">
              در آغاز هر گفتگو به کاربر اعلام می‌شود. با دریافت مصوبه جدید شورای پول و اعتبار، آن را به‌روزرسانی کنید.
            </span>
          </label>
          <label className="mt-3 block">
            <span className="label">واحد پولی پیش‌فرض گفتگو</span>
            <div className="flex gap-1.5">
              {(["IRT", "IRR"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`btn flex-1 ${draft.currency === c ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setDraft({ ...draft, currency: c })}
                >
                  {c === "IRT" ? "تومان" : "ریال"}
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="panel p-5">
          <h3 className="mb-3 text-[14px] font-extrabold text-slate-100">نرخ سپرده‌ها (منابع تامین مالی)</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {DEPOSIT_FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="label">{f.label}</span>
                <input
                  type="number"
                  step={0.1}
                  className="field num"
                  value={draft.depositRates[f.key]}
                  onChange={(e) =>
                    setDraft({ ...draft, depositRates: { ...draft.depositRates, [f.key]: Number(e.target.value) } })
                  }
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] leading-7 text-slate-400">
            نرخ بازده مورد انتظار سپرده‌گذار، کف سودآوری محصول است: موتور حاشیه خالص را با «بازده سپرده × مدت + ۲ واحد درصد»
            مقایسه می‌کند و در صورت نقض، بازطراحی پیشنهاد می‌دهد.
          </p>
        </div>
      </div>

      <div className="panel p-5">
        <h3 className="mb-3 text-[14px] font-extrabold text-slate-100">پارامترهای ریسک، سرمایه و انطباق</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {NUMBER_FIELDS.map((f) => (
            <label key={f.key as string} className="block">
              <span className="label flex items-center justify-between">
                <span>{f.label}</span>
                <span className="num text-cyan-300">{pct(Number(draft[f.key]), 1)}</span>
              </span>
              <input
                type="range"
                min={0}
                max={f.max ?? 40}
                step={f.step ?? 0.5}
                value={Number(draft[f.key])}
                onChange={(e) => setDraft({ ...draft, [f.key]: Number(e.target.value) } as OrgSettings)}
                className="w-full accent-cyan-400"
              />
              <span className="mt-1 block text-[10.5px] leading-5 text-slate-500">{f.hint}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2.5 text-[11.5px] leading-7 text-cyan-100/85">
          پیش‌نمایش اثر تنظیمات: برای تسهیلات ۳۶ ماهه، کف الزامی حاشیه خالص حدود{" "}
          <span className="num font-bold">{pct((Math.max(draft.realFundingCost, 18) * 36) / 12 + 2, 1)}</span> و هزینه عملیاتی
          فرض <span className="num font-bold">{toFa(draft.opexRate)}٪</span> اصل تسهیلات خواهد بود. سرمایه تخصیصی به ازای هر{" "}
          <span className="num font-bold">{num(1_000_000_000, 0)}</span> تسهیلات حدود{" "}
          <span className="num font-bold">
            {num((1_000_000_000 * draft.riskWeight * draft.capitalAdequacy) / 10000, 0)}
          </span>{" "}
          است.
        </div>
      </div>
    </div>
  );
}
