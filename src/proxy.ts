import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, decodeSessionToken, type UserRole } from "@/lib/auth/session-edge";

const ROUTE_PERMISSIONS: { pattern: RegExp; allowedRoles: UserRole[] }[] = [
  { pattern: /^\/admin\/usuarios(\/.*)?$/, allowedRoles: ["admin"] },
  { pattern: /^\/admin\/ajustes(\/.*)?$/, allowedRoles: ["admin", "manager"] },
  { pattern: /^\/admin\/informe-compras(\/.*)?$/, allowedRoles: ["admin", "manager"] },
  { pattern: /^\/admin\/reportes(\/.*)?$/, allowedRoles: ["admin", "manager"] },
  { pattern: /^\/admin\/analitica(\/.*)?$/, allowedRoles: ["admin", "manager"] },
  { pattern: /^\/admin\/compras(\/.*)?$/, allowedRoles: ["admin", "manager", "warehouse"] },
  { pattern: /^\/admin\/proveedores(\/.*)?$/, allowedRoles: ["admin", "manager", "warehouse"] },
  { pattern: /^\/admin\/inventario(\/.*)?$/, allowedRoles: ["admin", "manager", "warehouse"] },
  { pattern: /^\/admin\/ventas(\/.*)?$/, allowedRoles: ["admin", "manager", "cashier"] },
  { pattern: /^\/admin\/cajas(\/.*)?$/, allowedRoles: ["admin", "manager", "cashier"] },
  { pattern: /^\/admin\/?$/, allowedRoles: ["admin", "manager"] },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = sessionCookie ? await decodeSessionToken(sessionCookie) : null;

  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = new URL("/portal", request.url);
      loginUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const matchedRule = ROUTE_PERMISSIONS.find((rule) => rule.pattern.test(pathname));
    if (!matchedRule || !matchedRule.allowedRoles.includes(user.role)) {
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
