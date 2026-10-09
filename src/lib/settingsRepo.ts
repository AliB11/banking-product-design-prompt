import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orgSettings } from "@/db/schema";
import { DEFAULT_SETTINGS } from "@/lib/spec";
import type { OrgSettings } from "@/lib/types";

export async function readSettings(): Promise<OrgSettings> {
  try {
    const rows = await db.select().from(orgSettings).where(eq(orgSettings.id, 1)).limit(1);
    if (rows.length) {
      const data = rows[0].data as Partial<OrgSettings>;
      return { ...DEFAULT_SETTINGS, ...data, depositRates: { ...DEFAULT_SETTINGS.depositRates, ...(data.depositRates ?? {}) } };
    }
  } catch {
    return DEFAULT_SETTINGS;
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<OrgSettings>): Promise<OrgSettings> {
  const current = await readSettings();
  const next: OrgSettings = {
    ...current,
    ...patch,
    depositRates: { ...current.depositRates, ...(patch.depositRates ?? {}) },
  };
  try {
    await db
      .insert(orgSettings)
      .values({ id: 1, data: next, updatedAt: new Date() })
      .onConflictDoUpdate({ target: orgSettings.id, set: { data: next, updatedAt: new Date() } });
  } catch {
    /* جدول هنوز ساخته نشده — از پیش‌فرض استفاده می‌شود */
  }
  return next;
}
