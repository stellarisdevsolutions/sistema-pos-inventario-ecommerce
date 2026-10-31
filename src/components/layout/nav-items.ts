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
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "warning" | "success" | "outline";
  description?: string;
  section: "general" | "operaciones" | "canales";
}

export const navigationItems: NavItem[] = [
  {
    title: "Panel General",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Métricas y resumen de operaciones",
    section: "general",
  },
  {
    title: "Punto de Venta (POS)",
    href: "/admin/ventas",
    icon: ShoppingCart,
    badge: "Caja",
    badgeVariant: "success",
    description: "Caja registradora y emisión de tickets",
    section: "general",
  },
  {
    title: "Control de Cajas",
    href: "/admin/cajas",
    icon: Banknote,
    badge: "Arqueo",
    badgeVariant: "outline",
    description: "Turnos, terminales y arqueo de dinero",
    section: "general",
  },
  {
    title: "Inventario & Kardex",
    href: "/admin/inventario",
    icon: Package,
    badge: "Stock",
    badgeVariant: "outline",
    description: "Control de stock, Kardex y mermas",
    section: "operaciones",
  },
  {
    title: "Compras & Entradas",
    href: "/admin/compras",
    icon: Truck,
    description: "Ingreso de mercancía y facturas",
    section: "operaciones",
  },
  {
    title: "Proveedores",
    href: "/admin/proveedores",
    icon: Users,
    description: "Directorio comercial y contactos",
    section: "operaciones",
  },
  {
    title: "Ver Tienda Online",
    href: "/",
    icon: Store,
    badge: "Web",
    badgeVariant: "outline",
    description: "Catálogo público para clientes",
    section: "canales",
  },
];
