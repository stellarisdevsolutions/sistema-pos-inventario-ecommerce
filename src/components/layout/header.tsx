"use client";

import { useState, useEffect } from "react";
import { useSidebar } from "@/context/sidebar-context";
import {
  Menu,
  Search,
  Sun,
  Moon,
} from "lucide-react";

export function Header() {
  const { toggleSidebar, isCollapsed } = useSidebar();
  const [isDark, setIsDark] = useState(false);

  // Leer estado de tema al montar en cliente
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("admin_theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);

      setIsDark(shouldBeDark);
      if (shouldBeDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      // Ignorar en SSR
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    try {
      if (nextDark) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("admin_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("admin_theme", "light");
      }
    } catch (e) {}
  };

  return (
    <header className="hidden lg:flex items-center justify-between gap-6 w-full h-16 px-6 border-b border-[var(--admin-header-border)] bg-[var(--admin-header-bg)] sticky top-0 z-30 select-none transition-colors duration-200">
      {/* 1. PRIMER ELEMENTO: Botón de la Hamburguesa con borde definido */}
      <button
        onClick={toggleSidebar}
        className="h-10 w-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
        title={isCollapsed ? "Expandir menú lateral" : "Replegar menú lateral"}
        aria-label="Alternar menú lateral"
      >
        <Menu className="h-5 w-5 stroke-[2.2]" />
      </button>

      {/* 2. SEGUNDO ELEMENTO: Buscador con ALTO CONTRASTE y bordes nítidos */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-300" />
          <input
            type="text"
            placeholder="Buscar por producto, ticket, cliente o SKU..."
            className="w-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-600 rounded-xl pl-10 pr-16 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal focus:outline-hidden focus:ring-2 focus:ring-[#0284c7]/30 focus:border-[#0284c7] focus:bg-white dark:focus:bg-slate-800 transition-all shadow-2xs"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-600">
            Ctrl K
          </span>
        </div>
      </div>

      {/* LADO DERECHO: 3. Botón Modo Claro/Oscuro + 4. Usuario con Alto Contraste */}
      <div className="flex items-center gap-3 shrink-0">
        {/* 3. TERCER ELEMENTO: Botón para modo Claro / Oscuro */}
        <button
          onClick={toggleTheme}
          className="h-10 w-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
          title={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
          aria-label="Alternar modo claro y oscuro"
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700 transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* Separador nítido */}
        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />

        {/* 4. CUARTO ELEMENTO: Usuario (Avatar + Nombre + Rol) */}
        <div className="flex items-center gap-2.5 pl-1 cursor-pointer group">
          <div className="h-9 w-9 rounded-full bg-[#0b1329] border border-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            AC
          </div>
          <div className="flex flex-col text-left leading-tight hidden xl:flex">
            <span className="text-xs font-black text-slate-900 dark:text-white">Admin Studio</span>
            <span className="text-[10px] text-[#0284c7] dark:text-[#38bdf8] font-bold">Administrador</span>
          </div>
        </div>
      </div>
    </header>
  );
}
