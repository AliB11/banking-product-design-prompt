"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "میز طراحی", icon: "◈" },
  { href: "/designs", label: "گنجینه طراحی‌ها", icon: "❖" },
  { href: "/knowledge", label: "دانشنامه عقود", icon: "✦" },
  { href: "/settings", label: "تنظیمات سازمانی", icon: "⚙" },
];

export default function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#05080f]/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-lg font-black text-[#04121a] shadow-[0_10px_30px_-10px_rgba(34,211,238,0.8)]">
            ﷼
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-extrabold text-slate-100 sm:text-base">
              طراح هوشمند محصولات بانکی ایران
            </span>
            <span className="block text-[11px] text-cyan-300/70">
              طراحی عقد، قیمت‌گذاری، ALM، سودآوری و انطباق مقرراتی
            </span>
          </span>
        </Link>
        <nav className="ms-auto flex flex-wrap items-center gap-1.5">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-[13px] ${
                  active
                    ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <span className="me-1 opacity-70">{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
