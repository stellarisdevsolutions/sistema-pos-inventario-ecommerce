import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Store,
  LucideIcon,
  BarChart3,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Banknote,
  TrendingUp,
} from "lucide-react";
import type { UserRole } from "@/lib/auth/session-edge";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "warning" | "success" | "outline";
  description?: string;
  section: "general" | "operaciones" | "canales";
  allowedRoles: UserRole[];
}

export const navigationItems: NavItem[] = [
  {
    title: "Panel General",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Métricas y resumen de operaciones",
    section: "general",
    allowedRoles: ["admin", "manager"],
  },
  {
    title: "Punto de Venta (POS)",
    href: "/admin/ventas",
    icon: ShoppingCart,
    badge: "Caja",
    badgeVariant: "success",
    description: "Caja registradora y emisión de tickets",
    section: "general",
    allowedRoles: ["admin", "manager", "cashier"],
  },
  {
    title: "Control de Cajas",
    href: "/admin/cajas",
    icon: Banknote,
    badge: "Arqueo",
    badgeVariant: "outline",
    description: "Turnos, terminales y arqueo de dinero",
    section: "general",
    allowedRoles: ["admin", "manager", "cashier"],
  },
  {
    title: "Reporte Z & Cierre",
    href: "/admin/reportes",
    icon: BarChart3,
    badge: "Z",
    badgeVariant: "default",
    description: "Cierre diario oficial y arqueo",
    section: "general",
    allowedRoles: ["admin", "manager"],
  },
  {
    title: "Reportes por Periodo",
    href: "/admin/analitica",
    icon: TrendingUp,
    badge: "Rango",
    badgeVariant: "outline",
    description: "Semana, mes, año o fechas libres",
    section: "general",
    allowedRoles: ["admin", "manager"],
  },
  {
    title: "Usuarios & Roles",
    href: "/admin/usuarios",
    icon: ShieldCheck,
    badge: "PIN",
    badgeVariant: "outline",
    description: "Cajeros, supervisores y permisos",
    section: "general",
    allowedRoles: ["admin"],
  },
  {
    title: "Inventario & Kardex",
    href: "/admin/inventario",
    icon: Package,
    badge: "Stock",
    badgeVariant: "outline",
    description: "Control de stock, Kardex y mermas",
    section: "operaciones",
    allowedRoles: ["admin", "manager", "warehouse"],
  },
  {
    title: "Compras & Entradas",
    href: "/admin/compras",
    icon: Truck,
    description: "Ingreso de mercancía y facturas",
    section: "operaciones",
    allowedRoles: ["admin", "manager", "warehouse"],
  },
  {
    title: "Proveedores",
    href: "/admin/proveedores",
    icon: Users,
    description: "Directorio comercial y contactos",
    section: "operaciones",
    allowedRoles: ["admin", "manager", "warehouse"],
  },
  {
    title: "Ver Tienda Online",
    href: "/",
    icon: Store,
    badge: "Web",
    badgeVariant: "outline",
    description: "Catálogo público para clientes",
    section: "canales",
    allowedRoles: ["admin", "manager", "cashier", "warehouse"],
  },
];
