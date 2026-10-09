import { NextResponse } from "next/server";
import { readSettings, saveSettings } from "@/lib/settingsRepo";
import type { OrgSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await readSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<OrgSettings>;
  const settings = await saveSettings(body);
  return NextResponse.json({ settings });
}
