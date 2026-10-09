import { NextResponse } from "next/server";
import { createDesign, listDesigns } from "@/lib/designRepo";
import { readSettings } from "@/lib/settingsRepo";
import type { DesignChatRow } from "@/db/schema";
import type { ProductSpec } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listDesigns();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    spec?: Partial<ProductSpec>;
    conversation?: DesignChatRow[];
  };
  const settings = await readSettings();
  try {
    const row = await createDesign({
      spec: body.spec ?? {},
      settings,
      conversation: body.conversation ?? [],
    });
    return NextResponse.json({ id: row.id, report: row.report });
  } catch (error) {
    return NextResponse.json(
      { error: "ذخیره طراحی ناموفق بود", detail: String(error) },
      { status: 500 },
    );
  }
}
