const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** تبدیل ارقام لاتین/عربی به ارقام فارسی */
export function toFa(input: string | number): string {
  return String(input)
    .replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)])
    .replace(/[٠-٩]/g, (d) => FA_DIGITS["٠١٢٣٤٥٦٧٨٩".indexOf(d)]);
}

/** تبدیل ارقام فارسی/عربی به لاتین (برای پارس ورودی کاربر) */
export function toEn(input: string): string {
  return String(input)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function group(n: number, digits: number): string {
  const fixed = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${n < 0 ? "−" : ""}${fixed}`;
}

/** عدد با جداکننده سه‌رقمی و ارقام فارسی */
export function num(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return toFa(group(Math.round(n * 10 ** digits) / 10 ** digits, digits));
}

/** درصد */
export function pct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return `${toFa(group(n, digits))}٪`;
}

/** واحد پولی */
export function currencyLabel(code: string): string {
  return code === "IRR" ? "ریال" : "تومان";
}

/** مبلغ کامل با واحد */
export function money(n: number, code = "IRT", digits = 0): string {
  return `${num(n, digits)} ${currencyLabel(code)}`;
}

/** مبلغ فشرده برای محور نمودارها */
export function compact(n: number, code = "IRT"): string {
  const abs = Math.abs(n);
  const unit = code === "IRR" ? "ریال" : "تومان";
  if (abs >= 1e9) return `${toFa((n / 1e9).toFixed(abs >= 1e10 ? 0 : 1))} میلیارد ${unit}`;
  if (abs >= 1e6) return `${toFa((n / 1e6).toFixed(abs >= 1e7 ? 0 : 1))} میلیون ${unit}`;
  if (abs >= 1e3) return `${toFa((n / 1e3).toFixed(0))} هزار ${unit}`;
  return `${num(n)} ${unit}`;
}

/** تبدیل ریال به تومان و برعکس */
export function convert(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  return from === "IRR" ? amount / 10 : amount * 10;
}

export function faDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function faDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function round(v: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
