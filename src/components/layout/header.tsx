"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSidebar } from "@/context/sidebar-context";
import { useAuth } from "@/context/auth-context";
import {
  Menu,
  Search,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Calendar,
  Store,
  ShoppingCart,
  ExternalLink,
  Sparkles,
} from "lucide-react";

function getRoleInfo(role?: string) {
  switch (role) {
    case "admin":
      return { label: "Administrador General", dot: "bg-sky-500" };
    case "manager":
      return { label: "Supervisor de Tienda", dot: "bg-purple-500" };
    case "cashier":
      return { label: "Cajero(a) de Mostrador", dot: "bg-emerald-500" };
    case "warehouse":
      return { label: "Encargado de Almacén", dot: "bg-amber-500" };
    default:
      return { label: "Operador de Sistema", dot: "bg-slate-400" };
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

export function Header() {
  const { toggleSidebar, isCollapsed } = useSidebar();
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [currentDateStr, setCurrentDateStr] = useState("");

  useEffect(() => {
    try {
      const now = new Date();
      const formatted = now.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      setCurrentDateStr(formatted.charAt(0).toUpperCase() + formatted.slice(1));
    } catch {
      setCurrentDateStr("Hoy");
    }
  }, []);

  // Cierre accesible al hacer click fuera o presionar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  // Leer estado de tema
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
    } catch (e) {}
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

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
  };

  const roleInfo = getRoleInfo(user?.role);
  const firstName = getFirstName(user?.name);

  return (
    <header
      suppressHydrationWarning
      className="hidden lg:flex items-center justify-between gap-5 mx-4 lg:mx-6 mt-4 h-16 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] px-5 sticky top-4 z-30 select-none transition-all"
    >
      {/* 1. LADO IZQUIERDO: Toggle de Sidebar + Fecha */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="h-10 w-10 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-[var(--admin-brand)] hover:border-[var(--admin-brand)]/40 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
          title={isCollapsed ? "Expandir menú" : "Replegar menú"}
          aria-label="Alternar menú lateral"
        >
          <Menu className="h-4.5 w-4.5 stroke-[2.2]" />
        </button>

        {currentDateStr && (
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-[var(--admin-brand)]" />
            <span>{currentDateStr}</span>
          </div>
        )}
      </div>

      {/* 2. CENTRO: Buscador Global Bento */}
      <div className="flex-1 max-w-lg">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[var(--admin-brand)] transition-colors" />
          <input
            type="text"
            placeholder="Buscar por ticket, SKU o cliente..."
            className="w-full bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl pl-10 pr-16 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[var(--admin-brand)]/20 focus:border-[var(--admin-brand)] focus:bg-white dark:focus:bg-slate-800 transition-all shadow-2xs"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* 3. LADO DERECHO: Tema + Tarjeta de Usuario con Popover */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Alternador de Tema */}
        <button
          type="button"
          onClick={toggleTheme}
          className="h-10 w-10 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
          title={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
          aria-label="Alternar tema"
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600 transition-transform hover:-rotate-12" />
          )}
        </button>

        <div className="h-6 w-px bg-slate-200/80 dark:bg-slate-800" />

        {/* ACTIVADOR DEL PERFIL DE USUARIO */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer select-none group focus:outline-hidden focus:ring-2 focus:ring-[var(--admin-brand)]/20"
          >
            {/* Avatar Squircle */}
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[var(--admin-brand)] to-sky-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs ring-2 ring-sky-100 dark:ring-sky-950 group-hover:scale-105 transition-transform">
              {getInitials(user?.name)}
            </div>

            {/* Nombre y Rol */}
            <div className="flex flex-col text-left leading-tight hidden xl:flex">
              <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[130px]">
                {user?.name || "Sesión Activa"}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${roleInfo.dot}`} />
                {roleInfo.label.split(" ")[0]}
              </span>
            </div>

            {/* Chevron animado */}
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${
                isUserMenuOpen ? "rotate-180 text-[var(--admin-brand)]" : ""
              }`}
            />
          </button>

          {/* MENÚ FLOTANTE POPOVER */}
          {isUserMenuOpen && (
            <div
              role="menu"
              aria-label="Opciones de usuario"
              className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/10 p-2 z-50 animate-in fade-in-0 zoom-in-95 duration-100"
            >
              {/* Tarjeta de Saludo Cálido */}
              <div className="bg-gradient-to-br from-sky-50 to-slate-50 dark:from-slate-800/80 dark:to-slate-800/40 p-3.5 rounded-xl border border-sky-100/70 dark:border-slate-700/60 mb-1.5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[var(--admin-brand)] to-sky-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {getInitials(user?.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-1">
                      <span>¡Hola, {firstName}!</span>
                      <span className="text-sm">👋</span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user?.email || "usuario@auracommerce.bo"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${roleInfo.dot}`} />
                    {roleInfo.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID #{user?.id || 1}
                  </span>
                </div>
              </div>

              {/* Accesos Rápidos del Menú */}
              <div className="space-y-0.5 py-1">
                <Link
                  href="/admin/ventas"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 rounded-xl transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingCart className="h-4 w-4 text-[var(--admin-brand)] group-hover:scale-110 transition-transform" />
                    <span>Punto de Venta (POS)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">F1</span>
                </Link>

                <Link
                  href="/"
                  target="_blank"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 rounded-xl transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>Ver Tienda Online</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                </Link>
              </div>

              <hr className="my-1 border-slate-100 dark:border-slate-800" />

              {/* Botón de Cerrar Sesión */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer group"
              >
                <LogOut className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
