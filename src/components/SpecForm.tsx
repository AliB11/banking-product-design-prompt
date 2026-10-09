"use client";

import { COLLATERALS, CONTRACTS, FUNDING_STRUCTURES, NEED_MATRIX, REPAYMENT_MODES, SEGMENTS } from "@/lib/contracts";
import { num, toFa } from "@/lib/format";
import type { CollateralCode, ContractCode, FundingCode, NeedCode, ProductSpec, RepaymentMode, Segment } from "@/lib/types";

function Field({ label, hint, children, assumed }: { label: string; hint?: string; children: React.ReactNode; assumed?: boolean }) {
  return (
    <label className="block">
      <span className="label flex items-center gap-1.5">
        {label}
        {assumed ? <span className="badge badge-warn !px-1.5 !py-0 text-[9.5px]">فرض</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[10.5px] leading-5 text-slate-500">{hint}</span> : null}
    </label>
  );
}

export default function SpecForm({
  spec,
  answered,
  onChange,
}: {
  spec: ProductSpec;
  answered: string[];
  onChange: (patch: Partial<ProductSpec>) => void;
}) {
  const contract = spec.requestedContract === "auto" ? null : CONTRACTS[spec.requestedContract];
  const ceiling = contract ? contract.ceiling : 23;
  const seg = SEGMENTS[spec.segment];
  const coll = COLLATERALS[spec.collateralCode];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="۱. نوع نیاز مشتری" assumed={!answered.includes("needCode")}>
          <select className="field" value={spec.needCode} onChange={(e) => onChange({ needCode: e.target.value as NeedCode, needDescription: NEED_MATRIX[e.target.value as NeedCode].label })}>
            {(Object.keys(NEED_MATRIX) as NeedCode[]).map((k) => (
              <option key={k} value={k}>{NEED_MATRIX[k].label}</option>
            ))}
          </select>
        </Field>
        <Field label="۲. بازار هدف" assumed={!answered.includes("segment")}>
          <select className="field" value={spec.segment} onChange={(e) => onChange({ segment: e.target.value as Segment })}>
            {(Object.keys(SEGMENTS) as Segment[]).map((k) => (
              <option key={k} value={k}>{SEGMENTS[k].label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="حداقل مبلغ">
          <input type="number" className="field num" value={spec.minAmount} step={10_000_000} onChange={(e) => onChange({ minAmount: Number(e.target.value) })} />
        </Field>
        <Field label="حداکثر مبلغ">
          <input type="number" className="field num" value={spec.maxAmount} step={10_000_000} onChange={(e) => onChange({ maxAmount: Number(e.target.value), baseAmount: Number(e.target.value) })} />
        </Field>
        <Field label="مبلغ مبنا برای محاسبات">
          <input type="number" className="field num" value={spec.baseAmount} step={10_000_000} onChange={(e) => onChange({ baseAmount: Number(e.target.value) })} />
        </Field>
      </div>
      <p className="num text-[10.5px] text-slate-500">
        بازه عرف بازار برای «{seg.label}»: {num(seg.amountRange[0], 0)} تا {num(seg.amountRange[1], 0)} {spec.currency === "IRR" ? "ریال" : "تومان"}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="واحد پولی">
          <div className="flex gap-1.5">
            {(["IRT", "IRR"] as const).map((c) => (
              <button key={c} type="button" onClick={() => onChange({ currency: c })} className={`btn flex-1 ${spec.currency === c ? "btn-primary" : "btn-ghost"}`}>
                {c === "IRT" ? "تومان" : "ریال"}
              </button>
            ))}
          </div>
        </Field>
        <Field label={`۴. مدت — ${toFa(spec.tenorMonths)} ماه`}>
          <input type="range" min={3} max={144} step={1} value={spec.tenorMonths} onChange={(e) => onChange({ tenorMonths: Number(e.target.value) })} className="w-full accent-cyan-400" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="عقد (انتخاب موتور یا دستی)" assumed={spec.requestedContract === "auto"}>
          <select className="field" value={spec.requestedContract} onChange={(e) => onChange({ requestedContract: e.target.value as ContractCode | "auto" })}>
            <option value="auto">انتخاب خودکار بر اساس ماتریس انطباق</option>
            {(Object.keys(CONTRACTS) as ContractCode[]).map((k) => (
              <option key={k} value={k}>{CONTRACTS[k].name} — سقف {toFa(CONTRACTS[k].ceiling)}٪</option>
            ))}
          </select>
        </Field>
        <Field label={`۷. نرخ اسمی — ${num(spec.nominalRate, 1)}٪`} hint={`سقف مصوب عقد: ${toFa(ceiling)}٪ — بالاتر از آن طراحی نمی‌شود`}>
          <input type="range" min={0} max={ceiling} step={0.5} value={Math.min(spec.nominalRate, ceiling)} onChange={(e) => onChange({ nominalRate: Number(e.target.value) })} className="w-full accent-emerald-400" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="۵. ساختار بازپرداخت" assumed={!answered.includes("repaymentMode")}>
          <select className="field" value={spec.repaymentMode} onChange={(e) => onChange({ repaymentMode: e.target.value as RepaymentMode })}>
            {(Object.keys(REPAYMENT_MODES) as RepaymentMode[]).map((k) => (
              <option key={k} value={k}>{REPAYMENT_MODES[k].label}</option>
            ))}
          </select>
        </Field>
        <Field label="ریتم اقساط">
          <select className="field" value={spec.frequency} onChange={(e) => onChange({ frequency: e.target.value as "monthly" | "quarterly" })}>
            <option value="monthly">ماهانه</option>
            <option value="quarterly">فصلی (سه‌ماهه)</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="دوره تنفس (ماه)">
          <input type="number" min={0} max={24} className="field num" value={spec.graceMonths} onChange={(e) => onChange({ graceMonths: Number(e.target.value) })} />
        </Field>
        <Field label="رشد اقساط صعودی (٪ سالانه)">
          <input type="number" min={0} max={15} step={0.5} className="field num" value={spec.steppedGrowth} onChange={(e) => onChange({ steppedGrowth: Number(e.target.value) })} />
        </Field>
        <Field label="کارمزد (٪ اصل)">
          <input type="number" min={0} max={3} step={0.1} className="field num" value={spec.feeRate} onChange={(e) => onChange({ feeRate: Number(e.target.value) })} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="۶. نوع وثیقه" assumed={!answered.includes("collateralCode")}>
          <select className="field" value={spec.collateralCode} onChange={(e) => onChange({ collateralCode: e.target.value as CollateralCode })}>
            {(Object.keys(COLLATERALS) as CollateralCode[]).map((k) => (
              <option key={k} value={k}>{COLLATERALS[k].label}</option>
            ))}
          </select>
        </Field>
        <Field label={`پوشش وثیقه — ${toFa(spec.collateralCoverage)}٪`} hint={coll.note}>
          <input type="range" min={80} max={250} step={5} value={spec.collateralCoverage} onChange={(e) => onChange({ collateralCoverage: Number(e.target.value) })} className="w-full accent-amber-400" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="۱۰. ساختار تامین مالی" assumed={!answered.includes("fundingCode")}>
          <select className="field" value={spec.fundingCode} onChange={(e) => onChange({ fundingCode: e.target.value as FundingCode })}>
            {(Object.keys(FUNDING_STRUCTURES) as FundingCode[]).map((k) => (
              <option key={k} value={k}>{FUNDING_STRUCTURES[k].label}</option>
            ))}
          </select>
        </Field>
        <Field label="تعداد ضامن">
          <input type="number" min={0} max={5} className="field num" value={spec.guarantors} onChange={(e) => onChange({ guarantors: Number(e.target.value) })} />
        </Field>
      </div>

      <Field label="۸. مزیت رقابتی مورد نظر">
        <input className="field" value={spec.competitiveEdge} onChange={(e) => onChange({ competitiveEdge: e.target.value })} />
      </Field>
      <Field label="۹. محدودیت‌های خاص بانک">
        <textarea className="field min-h-[64px] leading-7" value={spec.bankConstraints} onChange={(e) => onChange({ bankConstraints: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام محصول (اختیاری)">
          <input className="field" value={spec.productName} placeholder="توسط موتور پیشنهاد می‌شود" onChange={(e) => onChange({ productName: e.target.value })} />
        </Field>
        <Field label="کد محصول (اختیاری)">
          <input className="field num" value={spec.productCode} placeholder="PRD-36M-0200" onChange={(e) => onChange({ productCode: e.target.value })} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[12px] text-slate-300">
        <input type="checkbox" checked={spec.earlySettlementDiscount} onChange={(e) => onChange({ earlySettlementDiscount: e.target.checked })} className="h-4 w-4 accent-cyan-400" />
        تخفیف ۵۰٪ سود تحقق‌نیافته در تسویه زودهنگام
      </label>
    </div>
  );
}
