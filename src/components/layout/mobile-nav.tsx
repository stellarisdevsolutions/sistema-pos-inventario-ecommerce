"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  Store,
  ChevronRight,
  CircleDot,
  LogOut,
} from "lucide-react";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const activeItem =
    navigationItems.find((item) =>
      item.href === "/admin"
        ? pathname === "/admin"
        : item.href !== "/" && pathname.startsWith(item.href)
    ) || navigationItems[0];

  return (
    <header className="lg:hidden sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md shadow-2xs">
      <div className="flex items-center gap-2.5">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200"
              />
            }
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú de navegación</span>
          </SheetTrigger>

          <SheetContent side="left" className="w-80 p-0 flex flex-col bg-[#0b1329] text-[#94a3b8] border-r border-[#162244]">
            {/* Header del Menú Móvil */}
            <SheetHeader className="h-16 flex flex-row items-center gap-3 border-b border-[#162244] px-6 space-y-0 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0284c7] text-white shadow-md shadow-[#0284c7]/20">
                <Activity className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <SheetTitle className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  Aura <span className="text-[#38bdf8]">Studio</span>
                </SheetTitle>
                <p className="text-[11px] text-slate-400">Comercio & Gestión</p>
              </div>
            </SheetHeader>

            {/* Lista de Navegación */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2">
              <div className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-[#64748b]">
                Módulos de Gestión
              </div>
              {navigationItems.map((item) => {
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
                        ? "bg-[#0284c7] text-white shadow-md shadow-[#0284c7]/25"
                        : "text-slate-300 hover:bg-[#132247] hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-white stroke-[2.5]" : "text-slate-400"
                        )}
                      />
                      <span>{item.title}</span>
                    </div>

                    {isStore ? (
                      <ExternalLink className="h-3.5 w-3.5 text-[#38bdf8]" />
                    ) : (
                      item.badge && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#132247] text-sky-300 border border-[#1e3264]">
                          {item.badge}
                        </span>
                      )
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Footer de Drawer */}
            <div className="p-4 border-t border-[#162244] space-y-3">
              <div className="rounded-xl bg-[#132247]/60 p-3 border border-[#1e3264]/60 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Neon DB</span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                    <CircleDot className="h-2 w-2 fill-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#0284c7] text-white font-bold text-xs flex items-center justify-center">
                    AC
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs leading-none">Admin Studio</p>
                    <p className="text-[10px] text-[#38bdf8]">Administrador</p>
                  </div>
                </div>
                <Link href="/admin/login" className="text-slate-400 hover:text-rose-400">
                  <LogOut className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Título de Página Actual */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <span className="font-extrabold text-slate-900 text-sm tracking-tight">
            {activeItem.title}
          </span>
        </div>
      </div>

      {/* Acciones Rápidas Móvil */}
      <div className="flex items-center gap-2">
        <Link href="/admin/ventas">
          <Button
            size="sm"
            className="h-9 px-3 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold gap-1 shadow-md shadow-[#0284c7]/20"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Venta</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
