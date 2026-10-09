import Link from "next/link";
import { notFound } from "next/navigation";
import DesignActions from "@/components/DesignActions";
import ReportView from "@/components/ReportView";
import { getDesign } from "@/lib/designRepo";
import { faDateTime, toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getDesign(Number(id));
  if (!row) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/designs" className="btn btn-ghost">
          ← گنجینه طراحی‌ها
        </Link>
        <span className="num text-[12px] text-slate-500">
          شناسه {toFa(row.id)} — آخرین به‌روزرسانی {faDateTime(new Date(row.updatedAt).toISOString())}
        </span>
        <div className="ms-auto w-full max-w-xl">
          <DesignActions id={row.id} status={row.status} />
        </div>
      </div>

      <ReportView report={row.report} savedId={row.id} />

      {row.conversation?.length ? (
        <div className="panel p-5">
          <h2 className="mb-3 text-[15px] font-extrabold text-slate-100">
            صورت‌جلسه گفتگوی طراحی ({toFa(row.conversation.length)} پیام)
          </h2>
          <div className="space-y-2">
            {row.conversation.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-start" : "flex justify-end"}>
                <div
                  className={`max-w-[92%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[12px] leading-7 ${
                    m.role === "user"
                      ? "bg-slate-700/40 text-slate-100 ring-1 ring-white/8"
                      : "bg-cyan-500/8 text-slate-200 ring-1 ring-cyan-400/18"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
