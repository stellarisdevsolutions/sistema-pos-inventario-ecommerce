"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { isModuleActive, navigationItems } from "./nav-items";

const sections = [
  { id: "general", label: "Operación diaria" },
  { id: "operaciones", label: "Abastecimiento" },
  { id: "seguimiento", label: "Control y análisis" },
] as const;

export function Sidebar({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const allowed = user ? navigationItems.filter((item) => item.allowedRoles.includes(user.role)) : [];
  const store = allowed.find((item) => item.section === "canales");
  const home = allowed[0]?.href ?? "/admin";

  return (
    <aside className="admin-rail" data-collapsed={collapsed}>
      <Link className="admin-rail-brand" href={home} onClick={onNavigate} aria-label="Inicio de Aura Commerce">
        <span className="admin-rail-mark"><Activity size={19} aria-hidden /></span>
        {!collapsed && <span className="truncate text-[15px] font-semibold tracking-tight">Aura Commerce</span>}
      </Link>
      <nav aria-label="Módulos del panel">
        {sections.map(({ id, label }) => {
          const items = allowed.filter((item) => item.section === id);
          if (!items.length) return null;
          return (
            <div key={id} className="admin-rail-group">
              {!collapsed && <p className="admin-rail-label">{label}</p>}
              {items.map(({ href, title, icon: Icon }) => (
                <Link key={href} href={href} aria-current={isModuleActive(pathname, href) ? "page" : undefined}
                  aria-label={title} title={collapsed ? title : undefined} onClick={onNavigate} className="admin-rail-link">
                  <Icon size={16} className="shrink-0" aria-hidden />
                  {!collapsed && <span className="truncate">{title}</span>}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>
      {store && (
        <div className="admin-rail-store">
          <Link href={store.href} target="_blank" rel="noopener noreferrer" className="admin-rail-link" aria-label="Ver tienda en otra pestaña">
            <store.icon size={16} className="shrink-0" aria-hidden />
            {!collapsed && <><span>Ver tienda</span><ArrowUpRight size={14} className="ml-auto" aria-hidden /></>}
          </Link>
        </div>
      )}
    </aside>
  );
}
