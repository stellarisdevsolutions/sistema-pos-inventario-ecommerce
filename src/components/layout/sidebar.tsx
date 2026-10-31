"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/sidebar-context";
import {
  Activity,
  ExternalLink,
  LogOut,
  Store,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();

  const gestionItems = navigationItems.filter(
    (i) => i.href === "/admin" || i.href === "/admin/ventas" || i.href === "/admin/cajas"
  );

  const inventarioItems = navigationItems.filter(
    (i) =>
      i.href === "/admin/inventario" ||
      i.href === "/admin/compras" ||
      i.href === "/admin/proveedores"
  );

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col justify-between h-screen sticky top-0 left-0 bg-[var(--admin-sidebar-bg)] border-r border-[var(--admin-sidebar-border)] transition-all duration-300 ease-in-out select-none shrink-0 z-40 text-slate-200",
        isCollapsed ? "w-20 px-3 py-5" : "w-64 px-4 py-5"
      )}
    >
      {/* 1. Header del Sidebar: Logo Limpio */}
      <div className="space-y-4">
        <div
          className={cn(
            "flex items-center pb-4 border-b border-[var(--admin-sidebar-border)]",
            isCollapsed ? "justify-center" : "justify-start"
          )}
        >
          <Link
            href="/admin"
            className="flex items-center gap-3 overflow-hidden min-w-0 group"
            title="Panel de Control"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-accent)] text-white shadow-md shadow-[var(--admin-accent)]/20 group-hover:scale-105 transition-transform shrink-0">
              <Activity className="h-5 w-5 stroke-[2.5]" />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-base text-white tracking-tight leading-tight flex items-center gap-1.5">
                  Finnova <span className="text-[var(--admin-accent)] font-bold">Studio</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Comercio & Gestión
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* 2. Categorías y Módulos */}
        <nav className="space-y-4 pt-1">
          {/* SECCIÓN 1: GESTIÓN COMERCIAL */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-slate-300 uppercase">
                Gestión Comercial
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
                  className={cn(
                    "group relative flex items-center rounded-xl transition-all duration-150",
                    isCollapsed
                      ? "justify-center h-10 w-10 mx-auto my-1"
                      : "justify-between px-3.5 py-2.5 text-xs font-semibold",
                    isActive
                      ? "bg-[var(--admin-sidebar-active-bg)] text-white font-bold shadow-md shadow-[var(--admin-sidebar-active-bg)]/25"
                      : "text-slate-200 hover:text-white hover:bg-[var(--admin-sidebar-hover)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-transform group-hover:scale-110 shrink-0",
                        isActive
                          ? "text-white stroke-[2.5]"
                          : "text-slate-300 group-hover:text-white"
                      )}
                    />
                    {!isCollapsed && (
                      <span className={isActive ? "text-white font-bold" : "text-slate-200 group-hover:text-white"}>
                        {item.title}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && item.badge && !isActive && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--admin-sidebar-hover)] text-indigo-200 border border-[var(--admin-sidebar-border)]">
                      {item.badge}
                    </span>
                  )}

                  {isCollapsed && (
                    <div className="absolute left-16 px-3 py-1.5 rounded-xl bg-[var(--admin-sidebar-bg)] text-white text-[11px] font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all shadow-xl z-50 border border-[var(--admin-sidebar-border)]">
                      {item.title}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* SECCIÓN 2: INVENTARIO Y STOCK */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-slate-300 uppercase">
                Inventario y Stock
              </div>
            )}
            {inventarioItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center rounded-xl transition-all duration-150",
                    isCollapsed
                      ? "justify-center h-10 w-10 mx-auto my-1"
                      : "justify-between px-3.5 py-2.5 text-xs font-semibold",
                    isActive
                      ? "bg-[var(--admin-sidebar-active-bg)] text-white font-bold shadow-md shadow-[var(--admin-sidebar-active-bg)]/25"
                      : "text-slate-200 hover:text-white hover:bg-[var(--admin-sidebar-hover)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-transform group-hover:scale-110 shrink-0",
                        isActive
                          ? "text-white stroke-[2.5]"
                          : "text-slate-300 group-hover:text-white"
                      )}
                    />
                    {!isCollapsed && (
                      <span className={isActive ? "text-white font-bold" : "text-slate-200 group-hover:text-white"}>
                        {item.title}
                      </span>
                    )}
                  </div>

                  {isCollapsed && (
                    <div className="absolute left-16 px-3 py-1.5 rounded-xl bg-[var(--admin-sidebar-bg)] text-white text-[11px] font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all shadow-xl z-50 border border-[var(--admin-sidebar-border)]">
                      {item.title}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* SECCIÓN 3: CANALES WEB */}
          <div className="space-y-1 pt-1">
            {!isCollapsed && (
              <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-slate-300 uppercase">
                Canales Web
              </div>
            )}
            <Link
              href="/"
              target="_blank"
              className={cn(
                "group relative flex items-center rounded-xl transition-all duration-150 text-slate-200 hover:text-white hover:bg-[var(--admin-sidebar-hover)]",
                isCollapsed
                  ? "justify-center h-10 w-10 mx-auto"
                  : "justify-between px-3.5 py-2.5 text-xs font-semibold"
              )}
            >
              <div className="flex items-center gap-3">
                <Store className="h-4 w-4 text-[var(--admin-accent)] group-hover:scale-110 transition-transform shrink-0" />
                {!isCollapsed && <span className="text-slate-200 group-hover:text-white">Ver Tienda Online</span>}
              </div>

              {!isCollapsed && (
                <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100 text-[var(--admin-accent)]" />
              )}

              {isCollapsed && (
                <div className="absolute left-16 px-3 py-1.5 rounded-xl bg-[var(--admin-sidebar-bg)] text-white text-[11px] font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all shadow-xl z-50 border border-[var(--admin-sidebar-border)] flex items-center gap-1.5">
                  <span>Ver Tienda Online</span>
                  <ExternalLink className="h-3 w-3 text-[var(--admin-accent)]" />
                </div>
              )}
            </Link>
          </div>
        </nav>
      </div>

      {/* 3. Footer del Sidebar: Perfil del Usuario dinámico */}
      <div className="pt-3 border-t border-[var(--admin-sidebar-border)]">
        <div
          className={cn(
            "flex items-center rounded-xl bg-[var(--admin-sidebar-hover)] border border-[var(--admin-sidebar-border)]",
            isCollapsed ? "justify-center h-10 w-10 mx-auto" : "justify-between px-3 py-2"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-[var(--admin-accent)] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              AC
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">Admin Studio</span>
                <span className="text-[10px] text-indigo-300 font-bold">Administrador</span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <Link
              href="/admin/login"
              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-400 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
