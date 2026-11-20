"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Moon, PanelLeft, Search, Sun } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isModuleActive, navigationItems } from "./nav-items";
import { MobileNav } from "./mobile-nav";

const roles = { admin: "Administrador", manager: "Supervisor", cashier: "Cajero", warehouse: "Almacén" };

export function Header({ collapsed, onToggleSidebar }: { collapsed: boolean; onToggleSidebar: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const title = navigationItems.find((item) => isModuleActive(pathname, item.href))?.title ?? "Panel";
  const initials = user?.name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
  const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const matches = user ? navigationItems.filter((item) =>
    item.allowedRoles.includes(user.role) && normalize(item.title).includes(normalize(query.trim()))
  ) : [];

  useEffect(() => {
    const previous = document.documentElement.classList.contains("dark");
    try {
      const theme = localStorage.getItem("admin_theme");
      document.documentElement.classList.toggle("dark", theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
    } catch {}
    return () => { document.documentElement.classList.toggle("dark", previous); };
  }, []);

  useEffect(() => {
    function openSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    try { localStorage.setItem("admin_theme", isDark ? "dark" : "light"); } catch {}
  }

  return (
    <header className="admin-header">
      <div className="flex min-w-0 items-center gap-2.5">
        <MobileNav />
        <button type="button" onClick={onToggleSidebar} aria-label={collapsed ? "Expandir navegación" : "Contraer navegación"}
          aria-expanded={!collapsed} className="admin-header-button hidden lg:inline-flex">
          <PanelLeft size={16} aria-hidden />
        </button>
        <span className="truncate text-sm font-semibold">{title}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Dialog open={searchOpen} onOpenChange={(open) => { setSearchOpen(open); if (!open) setQuery(""); }}>
          <DialogTrigger className="admin-header-button text-admin-muted lg:min-w-48 lg:justify-start" aria-label="Buscar módulos">
            <Search size={16} aria-hidden />
            <span className="hidden text-xs lg:inline">Buscar módulos</span>
            <kbd className="ml-auto hidden text-[10px] lg:inline">Ctrl K</kbd>
          </DialogTrigger>
          <DialogContent className="bg-admin-card-bg text-admin-text sm:max-w-md">
            <DialogTitle>Buscar módulos</DialogTitle>
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre del módulo"
              aria-label="Nombre del módulo" className="h-10 rounded-lg border border-admin-card-border bg-admin-raised px-3 focus:outline-admin-brand-text" />
            <nav aria-label="Resultados de búsqueda" className="grid max-h-72 gap-1 overflow-y-auto">
              {matches.map(({ href, title, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => { setSearchOpen(false); setQuery(""); }}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-admin-brand-subtle focus-visible:outline-admin-brand-text">
                  <Icon size={16} aria-hidden />{title}
                </Link>
              ))}
              {!matches.length && <p className="px-2 py-2 text-admin-muted">Sin resultados</p>}
            </nav>
          </DialogContent>
        </Dialog>
        <button type="button" className="admin-header-button" onClick={toggleTheme} aria-label="Cambiar tema">
          <Moon size={16} className="dark:hidden" aria-hidden />
          <Sun size={16} className="hidden dark:block" aria-hidden />
        </button>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="admin-header-button" aria-label="Menú de cuenta">
              <span className="grid size-6 place-items-center rounded-md bg-admin-brand-light text-[10px] font-semibold text-admin-brand-text">{initials}</span>
              <span className="hidden max-w-32 truncate text-xs font-medium md:inline">{user.name}</span>
              <ChevronDown size={13} className="hidden md:block" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-44 bg-admin-card-bg text-admin-text" align="end">
              <DropdownMenuLabel>{roles[user.role]}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => void logout()}><LogOut size={15} aria-hidden /> Cerrar sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
