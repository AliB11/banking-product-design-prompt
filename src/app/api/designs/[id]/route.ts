import { NextResponse } from "next/server";
import { deleteDesign, getDesign, updateDesign } from "@/lib/designRepo";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = await getDesign(Number(id));
  if (!row) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  return NextResponse.json({ design: row });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await request.json()) as { status?: string; name?: string };
  const row = await updateDesign(Number(id), body);
  if (!row) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  return NextResponse.json({ design: row });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  await deleteDesign(Number(id));
  return NextResponse.json({ ok: true });
}
