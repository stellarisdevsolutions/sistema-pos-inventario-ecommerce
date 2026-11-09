"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/sidebar-context";
import { useAuth } from "@/context/auth-context";
import {
  Activity,
  ExternalLink,
  LogOut,
  Store,
} from "lucide-react";

function getRoleLabel(role?: string) {
  switch (role) {
    case "admin":
      return "Administrador";
    case "manager":
      return "Supervisor";
    case "cashier":
      return "Cajero(a)";
    case "warehouse":
      return "Almacenero";
    default:
      return "Operador";
  }
}

function getInitials(name?: string) {
  if (!name) return "US";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();
  const { user, logout } = useAuth();

  // Filtrar módulos estrictamente según el rol del usuario autenticado
  const allowedItems = navigationItems.filter(
    (item) => !user || item.allowedRoles.includes(user.role)
  );

  const gestionItems = allowedItems.filter((i) => i.section === "general");
  const inventarioItems = allowedItems.filter((i) => i.section === "operaciones");

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
                <span className="font-extrabold text-sm tracking-tight text-white leading-tight">
                  Aura <span className="text-indigo-400">Commerce</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">ERP & POS Bolivia</span>
              </div>
            )}
          </Link>
        </div>

        {/* 2. Menú de Navegación con Secciones */}
        <nav className="space-y-6 overflow-y-auto max-h-[calc(100vh-210px)] pr-1 custom-scrollbar">
          {/* SECCIÓN 1: GESTIÓN COMERCIAL Y CAJA */}
          {gestionItems.length > 0 && (
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Gestión Comercial</span>
                  <span className="h-1 w-1 rounded-full bg-[var(--admin-accent)]" />
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
                      "group relative flex items-center gap-3 rounded-xl transition-all duration-150 ease-in-out cursor-pointer",
                      isCollapsed
                        ? "justify-center h-10 w-10 mx-auto"
                        : "px-3.5 py-2.5 text-xs font-semibold",
                      isActive
                        ? "bg-[var(--admin-accent)] text-white shadow-md shadow-[var(--admin-accent)]/20"
                        : "text-slate-300 hover:bg-[var(--admin-sidebar-hover)] hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110",
                        isActive ? "text-white stroke-[2.5]" : "text-slate-400 group-hover:text-white"
                      )}
                    />

                    {!isCollapsed && (
                      <span className="flex-1 truncate tracking-tight">{item.title}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span
                        className={cn(
                          "px-1.5 py-0.5 text-[9px] font-bold rounded-md shrink-0 uppercase tracking-wider",
                          item.badgeVariant === "success"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : item.badgeVariant === "warning"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : item.badgeVariant === "outline"
                            ? "bg-slate-700/50 text-slate-300 border border-slate-600"
                            : "bg-indigo-500/30 text-indigo-200 border border-indigo-400/30"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Tooltip flotante en modo colapsado */}
                    {isCollapsed && (
                      <div className="absolute left-16 px-3 py-1.5 rounded-xl bg-[var(--admin-sidebar-bg)] text-white text-[11px] font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all shadow-xl z-50 border border-[var(--admin-sidebar-border)] flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* SECCIÓN 2: LOGÍSTICA & ALMACÉN */}
          {inventarioItems.length > 0 && (
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Operaciones & Stock</span>
                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
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
                      "group relative flex items-center gap-3 rounded-xl transition-all duration-150 ease-in-out cursor-pointer",
                      isCollapsed
                        ? "justify-center h-10 w-10 mx-auto"
                        : "px-3.5 py-2.5 text-xs font-semibold",
                      isActive
                        ? "bg-[var(--admin-accent)] text-white shadow-md shadow-[var(--admin-accent)]/20"
                        : "text-slate-300 hover:bg-[var(--admin-sidebar-hover)] hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110",
                        isActive ? "text-white stroke-[2.5]" : "text-slate-400 group-hover:text-white"
                      )}
                    />

                    {!isCollapsed && (
                      <span className="flex-1 truncate tracking-tight">{item.title}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md shrink-0 bg-slate-700/50 text-slate-300 border border-slate-600">
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
          )}

          {/* SECCIÓN 3: ACCESO DIRECTO A LA TIENDA PÚBLICA */}
          <div className="pt-2 border-t border-[var(--admin-sidebar-border)]/50">
            <Link
              href="/"
              target="_blank"
              className={cn(
                "group relative flex items-center rounded-xl bg-slate-800/40 border border-slate-700/40 hover:bg-[var(--admin-sidebar-hover)] transition-all",
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

      {/* 3. Footer del Sidebar: Perfil del Usuario dinámico real */}
      <div className="pt-3 border-t border-[var(--admin-sidebar-border)]">
        <div
          className={cn(
            "flex items-center rounded-xl bg-[var(--admin-sidebar-hover)] border border-[var(--admin-sidebar-border)]",
            isCollapsed ? "justify-center h-10 w-10 mx-auto" : "justify-between px-3 py-2"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-[var(--admin-accent)] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              {getInitials(user?.name)}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">
                  {user?.name || "Sesión Activa"}
                </span>
                <span className="text-[10px] text-indigo-300 font-bold">
                  {getRoleLabel(user?.role)}
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
