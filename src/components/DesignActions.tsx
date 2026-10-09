"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = [
  { value: "draft", label: "پیش‌نویس" },
  { value: "review", label: "در حال بررسی" },
  { value: "approved", label: "تصویب‌شده" },
  { value: "archived", label: "بایگانی" },
];

export default function DesignActions({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const setStatus = async (value: string) => {
    setBusy(true);
    await fetch(`/api/designs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    setBusy(false);
    router.refresh();
  };

  const remove = async () => {
    if (!confirm("این طراحی برای همیشه حذف شود؟")) return;
    setBusy(true);
    await fetch(`/api/designs/${id}`, { method: "DELETE" });
    router.push("/designs");
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            disabled={busy}
            onClick={() => void setStatus(s.value)}
            className={`rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold transition ${
              status === s.value
                ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <button className="btn btn-danger ms-auto" disabled={busy} onClick={() => void remove()}>
        حذف طراحی
      </button>
    </div>
  );
}
