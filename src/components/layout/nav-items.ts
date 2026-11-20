import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Store,
  LucideIcon,
  BarChart3,
  ShieldCheck,
  Banknote,
  TrendingUp,
} from "lucide-react";
import type { UserRole } from "@/lib/auth/session-edge";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  section: "general" | "operaciones" | "canales";
  allowedRoles: UserRole[];
}

export const navigationItems: NavItem[] = [
  {
    title: "Panel General",
    href: "/admin",
    icon: LayoutDashboard,
    section: "general",
    allowedRoles: ["admin", "manager"],
  },
  {
    title: "Punto de Venta (POS)",
    href: "/admin/ventas",
    icon: ShoppingCart,
    section: "general",
    allowedRoles: ["admin", "manager", "cashier"],
  },
  {
    title: "Control de Cajas",
    href: "/admin/cajas",
    icon: Banknote,
    section: "general",
    allowedRoles: ["admin", "manager", "cashier"],
  },
  {
    title: "Cierre & Reporte Z",
    href: "/admin/reportes",
    icon: BarChart3,
    section: "general",
    allowedRoles: ["admin", "manager"],
  },
  {
    title: "Reportes por Periodo",
    href: "/admin/analitica",
    icon: TrendingUp,
    section: "general",
    allowedRoles: ["admin", "manager"],
  },
  {
    title: "Usuarios & Permisos",
    href: "/admin/usuarios",
    icon: ShieldCheck,
    section: "general",
    allowedRoles: ["admin"],
  },
  {
    title: "Inventario & Kárdex",
    href: "/admin/inventario",
    icon: Package,
    section: "operaciones",
    allowedRoles: ["admin", "manager", "warehouse"],
  },
  {
    title: "Compras & Entradas",
    href: "/admin/compras",
    icon: Truck,
    section: "operaciones",
    allowedRoles: ["admin", "manager", "warehouse"],
  },
  {
    title: "Proveedores",
    href: "/admin/proveedores",
    icon: Users,
    section: "operaciones",
    allowedRoles: ["admin", "manager", "warehouse"],
  },
  {
    title: "Tienda Online",
    href: "/",
    icon: Store,
    section: "canales",
    allowedRoles: ["admin", "manager", "cashier", "warehouse"],
  },
];
