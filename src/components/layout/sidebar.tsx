"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/sidebar-context";
import { useAuth } from "@/context/auth-context";
import { Activity } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, isMounted } = useSidebar();
  const { user } = useAuth();

  // Durante SSR y primera hidratación en cliente, usar siempre estado colapsado estable (true)
  const collapsed = isMounted ? isCollapsed : true;

  const allowedItems = navigationItems.filter(
    (item) => !user || item.allowedRoles.includes(user.role)
  );

  const gestionItems = allowedItems.filter((i) => i.section === "general");
  const inventarioItems = allowedItems.filter((i) => i.section === "operaciones");

  return (
    <aside
      suppressHydrationWarning
      className={cn(
        "hidden lg:flex flex-col my-4 ml-4 h-[calc(100vh-2rem)] sticky top-4 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all duration-300 ease-in-out select-none shrink-0 z-40 text-slate-700 dark:text-slate-300 overflow-x-hidden",
        collapsed ? "w-20 px-2.5 py-5" : "w-64 px-4 py-5"
      )}
    >
      {/* 1. Header del Dock: Brand Squircle Logo */}
      <div className="shrink-0 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <Link
            href="/admin"
            className="flex items-center gap-3 overflow-hidden min-w-0 group"
            title="Aura Commerce - Panel de Control"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[var(--admin-brand)] to-sky-500 text-white shadow-md shadow-[var(--admin-brand)]/25 group-hover:scale-105 transition-transform shrink-0">
              <Activity className="h-5 w-5 stroke-[2.5]" />
            </div>

            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white leading-tight">
                  Aura <span className="text-[var(--admin-brand)]">Commerce</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  ERP & POS Bolivia
                </span>
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* 2. Menú de Navegación Estilo Isla / Dock (Toma toda la altura restante de forma limpia) */}
      <nav className="space-y-4 overflow-y-auto overflow-x-hidden flex-1 sidebar-scrollbar pr-1 pt-4">
        {/* SECCIÓN GESTIÓN */}
        {gestionItems.length > 0 && (
          <div className="space-y-1.5">
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Gestión
              </div>
            )}

            {gestionItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  className={cn(
                    "flex items-center transition-all duration-150 ease-in-out cursor-pointer",
                    collapsed
                      ? "justify-center h-11 w-11 mx-auto rounded-2xl"
                      : "gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold",
                    isActive
                      ? collapsed
                        ? "bg-[var(--admin-brand)] text-white shadow-md shadow-[var(--admin-brand)]/25"
                        : "bg-sky-50 dark:bg-sky-950/40 text-[var(--admin-brand)] font-bold shadow-2xs border-l-2 border-[var(--admin-brand)]"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 shrink-0 transition-transform duration-150",
                      isActive
                        ? collapsed
                          ? "text-white stroke-[2.5]"
                          : "text-[var(--admin-brand)] stroke-[2.5]"
                        : "text-slate-400"
                    )}
                  />

                  {!collapsed && (
                    <span className="flex-1 truncate tracking-tight">{item.title}</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* SECCIÓN OPERACIONES */}
        {inventarioItems.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Operaciones
              </div>
            )}

            {inventarioItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  className={cn(
                    "flex items-center transition-all duration-150 ease-in-out cursor-pointer",
                    collapsed
                      ? "justify-center h-11 w-11 mx-auto rounded-2xl"
                      : "gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold",
                    isActive
                      ? collapsed
                        ? "bg-[var(--admin-brand)] text-white shadow-md shadow-[var(--admin-brand)]/25"
                        : "bg-sky-50 dark:bg-sky-950/40 text-[var(--admin-brand)] font-bold shadow-2xs border-l-2 border-[var(--admin-brand)]"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 shrink-0 transition-transform duration-150",
                      isActive
                        ? collapsed
                          ? "text-white stroke-[2.5]"
                          : "text-[var(--admin-brand)] stroke-[2.5]"
                        : "text-slate-400"
                    )}
                  />

                  {!collapsed && (
                    <span className="flex-1 truncate tracking-tight">{item.title}</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
