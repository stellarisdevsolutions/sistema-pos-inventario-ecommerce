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
  Settings,
  PackageSearch,
} from "lucide-react";
import type { UserRole } from "@/lib/auth/session-edge";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  section: "reportes" | "general" | "seguimiento" | "operaciones" | "canales";
  allowedRoles: UserRole[];
}

export const navigationItems: NavItem[] = [
  {
    title: "Resumen",
    href: "/admin",
    icon: LayoutDashboard,
    section: "general",
    allowedRoles: ["admin", "manager"],
  },
  {
    title: "Punto de venta",
    href: "/admin/ventas",
    icon: ShoppingCart,
    section: "general",
    allowedRoles: ["admin", "manager", "cashier"],
  },
  {
    title: "Cajas",
    href: "/admin/cajas",
    icon: Banknote,
    section: "general",
    allowedRoles: ["admin", "manager", "cashier"],
  },
  {
    title: "Ventas del día",
    href: "/admin/reportes",
    icon: BarChart3,
    section: "reportes",
    allowedRoles: ["admin", "manager"],
  },
  {
    title: "Ventas y ganancias",
    href: "/admin/analitica",
    icon: TrendingUp,
    section: "reportes",
    allowedRoles: ["admin", "manager"],
  },
  {
    title: "Compras y devoluciones",
    href: "/admin/informe-compras",
    icon: PackageSearch,
    section: "reportes",
    allowedRoles: ["admin", "manager"],
  },
  {
    title: "Usuarios",
    href: "/admin/usuarios",
    icon: ShieldCheck,
    section: "seguimiento",
    allowedRoles: ["admin"],
  },
  {
    title: "Ajustes",
    href: "/admin/ajustes",
    icon: Settings,
    section: "seguimiento",
    allowedRoles: ["admin", "manager"],
  },
  {
    title: "Inventario",
    href: "/admin/inventario",
    icon: Package,
    section: "operaciones",
    allowedRoles: ["admin", "manager", "warehouse"],
  },
  {
    title: "Compras",
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
    title: "Tienda online",
    href: "/",
    icon: Store,
    section: "canales",
    allowedRoles: ["admin", "manager", "cashier", "warehouse"],
  },
];

export function isModuleActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && href !== "/" && pathname.startsWith(href + "/"));
}
