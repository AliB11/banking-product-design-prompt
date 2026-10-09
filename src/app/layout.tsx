import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import TopNav from "@/components/TopNav";

export const metadata: Metadata = {
  title: "طراح هوشمند محصولات بانکی ایران",
  description:
    "سامانه طراحی محصولات تسهیلاتی منطبق بر عقود بانکداری بدون ربا، با تحلیل ریسک نقدینگی، سودآوری، جذابیت مشتری و انطباق مقرراتی بانک مرکزی.",
};

export const viewport: Viewport = {
  themeColor: "#05080f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
        />
      </head>
      <body className="min-h-screen antialiased">
        <TopNav />
        <main className="mx-auto w-full max-w-[1500px] px-4 pb-24 pt-6 sm:px-6">{children}</main>
        <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
          موتور طراحی محصولات تسهیلاتی — تمام محاسبات بر پایه عقود بانکداری بدون ربا و مصوبات شورای پول و اعتبار
          انجام می‌شود. خروجی این سامانه پیشنهاد کارشناسی است و جایگزین تصویب کمیته اعتباری نیست.
        </footer>
      </body>
    </html>
  );
}
