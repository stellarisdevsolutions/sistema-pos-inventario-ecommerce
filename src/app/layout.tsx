import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { CartProvider } from "@/context/cart-context";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/store-config";
import "./globals.css";
import "./admin-theme.css";
import "./store-theme.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${STORE_NAME} | ${STORE_TAGLINE}`,
  description: "Lo último en tecnología, accesorios, audio y estilo de vida con entrega rápida",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <CartProvider>
          {children}
        </CartProvider>
        <Toaster
          position="bottom-right"
          expand={false}
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl text-slate-900 dark:text-white font-sans p-4 gap-3 select-none",
              title: "text-xs font-bold text-slate-900 dark:text-white leading-tight",
              description: "text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed",
              actionButton: "bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold px-3 py-1.5 shadow-xs",
              cancelButton: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium px-3 py-1.5",
              closeButton: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white",
              success: "!border-emerald-500/30 !bg-emerald-50/95 dark:!bg-emerald-950/70 dark:!border-emerald-800/60 !text-emerald-950 dark:!text-emerald-100 [&_[data-title]]:!text-emerald-900 dark:[&_[data-title]]:!text-emerald-200 [&_[data-description]]:!text-emerald-700 dark:[&_[data-description]]:!text-emerald-300",
              error: "!border-rose-500/30 !bg-rose-50/95 dark:!bg-rose-950/70 dark:!border-rose-800/60 !text-rose-950 dark:!text-rose-100 [&_[data-title]]:!text-rose-900 dark:[&_[data-title]]:!text-rose-200 [&_[data-description]]:!text-rose-700 dark:[&_[data-description]]:!text-rose-300",
              info: "!border-indigo-500/30 !bg-indigo-50/95 dark:!bg-indigo-950/70 dark:!border-indigo-800/60 !text-indigo-950 dark:!text-indigo-100 [&_[data-title]]:!text-indigo-900 dark:[&_[data-title]]:!text-indigo-200 [&_[data-description]]:!text-indigo-700 dark:[&_[data-description]]:!text-indigo-300",
              warning: "!border-amber-500/30 !bg-amber-50/95 dark:!bg-amber-950/70 dark:!border-amber-800/60 !text-amber-950 dark:!text-amber-100 [&_[data-title]]:!text-amber-900 dark:[&_[data-title]]:!text-amber-200 [&_[data-description]]:!text-amber-700 dark:[&_[data-description]]:!text-amber-300",
            },
          }}
        />
      </body>
    </html>
  );
}
