"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Activity,
  Menu,
  ExternalLink,
  Plus,
  CircleDot,
  LogOut,
  ShoppingCart,
} from "lucide-react";

function getRoleLabel(role?: string) {
  switch (role) {
    case "admin":
      return "Administrador General";
    case "manager":
      return "Supervisor de Tienda";
    case "cashier":
      return "Cajero(a) de Mostrador";
    case "warehouse":
      return "Encargado de Almacén";
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

function getFirstName(name?: string) {
  if (!name) return "Usuario";
  return name.trim().split(/\s+/)[0];
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Filtrar módulos estrictamente según el rol del usuario autenticado (excluyendo la tienda pública)
  const allowedItems = navigationItems.filter(
    (item) => item.href !== "/" && (!user || item.allowedRoles.includes(user.role))
  );

  const activeItem =
    allowedItems.find((item) =>
      item.href === "/admin"
        ? pathname === "/admin"
        : item.href !== "/" && pathname.startsWith(item.href)
    ) || allowedItems[0] || navigationItems[0];

  const firstName = getFirstName(user?.name);
  const roleLabel = getRoleLabel(user?.role);

  return (
    <header className="lg:hidden sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 backdrop-blur-md shadow-2xs">
      <div className="flex items-center gap-2.5">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
              />
            }
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú de navegación</span>
          </SheetTrigger>

          <SheetContent side="left" className="w-80 p-0 flex flex-col bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
            {/* Header del Menú Móvil */}
            <SheetHeader className="h-16 flex flex-row items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-6 space-y-0 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--admin-brand)] to-sky-500 text-white shadow-md shadow-[var(--admin-brand)]/20">
                <Activity className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <SheetTitle className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  Aura <span className="text-[var(--admin-brand)]">Commerce</span>
                </SheetTitle>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  ERP & POS
                </p>
              </div>
            </SheetHeader>

            {/* Lista de Navegación */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2 no-scrollbar">
              <div className="px-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Módulos de Gestión
              </div>
              {allowedItems.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : item.href !== "/" && pathname.startsWith(item.href);
                const Icon = item.icon;
                const isStore = item.href === "/";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={isStore ? "_blank" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-4 py-3 text-xs font-bold transition-all",
                      isActive
                        ? "bg-sky-50 dark:bg-sky-950/40 text-[var(--admin-brand)] border-l-2 border-[var(--admin-brand)] shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-[var(--admin-brand)] stroke-[2.5]" : "text-slate-400"
                        )}
                      />
                      <span>{item.title}</span>
                    </div>

                    {isStore && (
                      <ExternalLink className="h-3.5 w-3.5 text-[var(--admin-brand)]" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Footer de Drawer: Saludo + Perfil + Cerrar Sesión */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/60 dark:bg-slate-900/40">
              {/* Saludo al Usuario */}
              <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[var(--admin-brand)] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {getInitials(user?.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 dark:text-white text-xs truncate">
                      ¡Hola, {firstName}!
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {roleLabel}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 py-1 cursor-pointer transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Título de Página Actual */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <span className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight">
            {activeItem.title}
          </span>
        </div>
      </div>

      {/* Acciones Rápidas Móvil */}
      <div className="flex items-center gap-2">
        <Link href="/admin/ventas">
          <Button
            size="sm"
            className="h-9 px-3 rounded-xl bg-[var(--admin-brand)] hover:bg-[var(--admin-brand-hover)] text-white text-xs font-bold gap-1.5 shadow-sm shadow-[var(--admin-brand)]/20 cursor-pointer"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>POS</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
