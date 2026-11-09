import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, decodeSessionToken, type UserRole } from "@/lib/auth/session-edge";

// Definición estricta de rutas permitidas por rol
const ROUTE_PERMISSIONS: { pattern: RegExp; allowedRoles: UserRole[] }[] = [
  // 1. Usuarios y Roles: Solo Administrador
  { pattern: /^\/admin\/usuarios(\/.*)?$/, allowedRoles: ["admin"] },

  // 2. Reportes Financieros y Cierre Z: Administrador y Supervisor
  { pattern: /^\/admin\/reportes(\/.*)?$/, allowedRoles: ["admin", "manager"] },
  { pattern: /^\/admin\/analitica(\/.*)?$/, allowedRoles: ["admin", "manager"] },

  // 3. Compras y Proveedores: Administrador, Supervisor y Almacenero
  { pattern: /^\/admin\/compras(\/.*)?$/, allowedRoles: ["admin", "manager", "warehouse"] },
  { pattern: /^\/admin\/proveedores(\/.*)?$/, allowedRoles: ["admin", "manager", "warehouse"] },

  // 4. Inventario y Kardex: Administrador, Supervisor y Almacenero
  { pattern: /^\/admin\/inventario(\/.*)?$/, allowedRoles: ["admin", "manager", "warehouse"] },

  // 5. Punto de Venta (POS) y Control de Cajas: Administrador, Supervisor y Cajero
  { pattern: /^\/admin\/ventas(\/.*)?$/, allowedRoles: ["admin", "manager", "cashier"] },
  { pattern: /^\/admin\/cajas(\/.*)?$/, allowedRoles: ["admin", "manager", "cashier"] },

  // 6. Panel General con KPIs globales: Administrador y Supervisor
  { pattern: /^\/admin$/, allowedRoles: ["admin", "manager"] },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = sessionCookie ? await decodeSessionToken(sessionCookie) : null;

  // 1. Manejo de la página de Login (/portal)
  if (pathname === "/portal") {
    if (user) {
      // Si ya está autenticado, redirigir a su área de trabajo según rol
      if (user.role === "cashier") {
        return NextResponse.redirect(new URL("/admin/ventas", request.url));
      }
      if (user.role === "warehouse") {
        return NextResponse.redirect(new URL("/admin/inventario", request.url));
      }
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // 2. Protección de todas las rutas /admin
  if (pathname.startsWith("/admin")) {
    if (!user) {
      // No autenticado: Redirigir a login guardando la URL a la que quería ir
      const loginUrl = new URL("/portal", request.url);
      loginUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 3. Control de Acceso por Roles (RBAC)
    for (const rule of ROUTE_PERMISSIONS) {
      if (rule.pattern.test(pathname)) {
        if (!rule.allowedRoles.includes(user.role)) {
          // Acceso no autorizado: Redirigir al inicio del rol
          let targetHome = "/admin";
          if (user.role === "cashier") {
            targetHome = "/admin/ventas";
          } else if (user.role === "warehouse") {
            targetHome = "/admin/inventario";
          }

          const redirectUrl = new URL(targetHome, request.url);
          redirectUrl.searchParams.set("denied", "1");
          return NextResponse.redirect(redirectUrl);
        }
        break;
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/portal",
  ],
};
