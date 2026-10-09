import { NextResponse } from "next/server";
import { buildReport } from "@/lib/report";
import { readSettings } from "@/lib/settingsRepo";
import type { OrgSettings, ProductSpec } from "@/lib/types";

export const dynamic = "force-dynamic";

/** محاسبه کامل محصول بدون ذخیره در پایگاه‌داده — برای پیش‌نمایش زنده */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    spec?: Partial<ProductSpec>;
    settings?: Partial<OrgSettings>;
  };
  const stored = await readSettings();
  const settings: OrgSettings = {
    ...stored,
    ...(body.settings ?? {}),
    depositRates: { ...stored.depositRates, ...(body.settings?.depositRates ?? {}) },
  };
  const report = buildReport(body.spec ?? {}, settings);
  return NextResponse.json({ report });
}
