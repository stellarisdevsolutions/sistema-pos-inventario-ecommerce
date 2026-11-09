import { encodeSessionToken, type SessionUser } from "@/lib/auth/session-edge";

async function testHttpRoutes() {
  console.log("================================================================================");
  console.log("🌐 AUDITORÍA DE RUTAS HTTP Y CONTROL DE ACCESO (MIDDLEWARE)");
  console.log("================================================================================\n");

  const baseUrl = "http://localhost:3000";

  // 1. Visita sin sesión (debe redirigir a /portal)
  const unauthTestRoutes = [
    "/admin",
    "/admin/ventas",
    "/admin/cajas",
    "/admin/inventario",
    "/admin/compras",
    "/admin/proveedores",
    "/admin/reportes",
    "/admin/analitica",
    "/admin/usuarios",
  ];

  console.log("--- 1. RUTAS PROTEGIDAS SIN SESIÓN ---");
  for (const route of unauthTestRoutes) {
    const res = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    const location = res.headers.get("location");
    const isRedirectToPortal = res.status === 307 && location?.includes("/portal");
    console.log(`[${isRedirectToPortal ? "✅ PASS" : "❌ FAIL"}] ${route} -> Status: ${res.status}, Location: ${location}`);
    if (!isRedirectToPortal) throw new Error(`Fallo en protección de ruta ${route}`);
  }

  // 2. Visita con sesión de Administrador (debe tener acceso a todo)
  console.log("\n--- 2. RUTAS CON SESIÓN DE ADMINISTRADOR (admin) ---");
  const adminUser: SessionUser = { id: 1, name: "Admin General", email: "admin@aurastudio.com", role: "admin" };
  const adminToken = await encodeSessionToken(adminUser);

  for (const route of unauthTestRoutes) {
    const res = await fetch(`${baseUrl}${route}`, {
      headers: { Cookie: `aura_session=${adminToken}` },
      redirect: "manual",
    });
    const isOk = res.status === 200;
    console.log(`[${isOk ? "✅ PASS" : "❌ FAIL"}] Admin en ${route} -> Status: ${res.status}`);
    if (!isOk) throw new Error(`Fallo en acceso admin a ${route}`);
  }

  // 3. Visita con sesión de Cajera (cashier)
  console.log("\n--- 3. RUTAS CON SESIÓN DE CAJERA (cashier) ---");
  const cashierUser: SessionUser = { id: 3, name: "Sofía Cajera", email: "cajera@aurastudio.com", role: "cashier" };
  const cashierToken = await encodeSessionToken(cashierUser);

  // Cajera en POS y Cajas debe ser 200 OK
  for (const allowedRoute of ["/admin/ventas", "/admin/cajas"]) {
    const res = await fetch(`${baseUrl}${allowedRoute}`, {
      headers: { Cookie: `aura_session=${cashierToken}` },
      redirect: "manual",
    });
    const isOk = res.status === 200;
    console.log(`[${isOk ? "✅ PASS" : "❌ FAIL"}] Cajera en ${allowedRoute} (Permitido) -> Status: ${res.status}`);
    if (!isOk) throw new Error(`Fallo: Cajera bloqueada indebidamente en ${allowedRoute}`);
  }

  // Cajera en Usuarios, Reportes, Compras debe ser 307 Redirect con denied=1
  for (const forbiddenRoute of ["/admin/usuarios", "/admin/reportes", "/admin/compras", "/admin/inventario"]) {
    const res = await fetch(`${baseUrl}${forbiddenRoute}`, {
      headers: { Cookie: `aura_session=${cashierToken}` },
      redirect: "manual",
    });
    const location = res.headers.get("location");
    const isDeniedRedirect = res.status === 307 && location?.includes("denied=1");
    console.log(`[${isDeniedRedirect ? "✅ PASS" : "❌ FAIL"}] Cajera en ${forbiddenRoute} (Prohibido) -> Status: ${res.status}, Redirigido a: ${location}`);
    if (!isDeniedRedirect) throw new Error(`Fallo: Cajera accedió indebidamente a ${forbiddenRoute}`);
  }

  // 4. Visita con sesión de Almacenero (warehouse)
  console.log("\n--- 4. RUTAS CON SESIÓN DE ALMACENERO (warehouse) ---");
  const warehouseUser: SessionUser = { id: 4, name: "Lucas Almacén", email: "almacen@aurastudio.com", role: "warehouse" };
  const warehouseToken = await encodeSessionToken(warehouseUser);

  // Almacenero en Inventario, Compras y Proveedores debe ser 200 OK
  for (const allowedRoute of ["/admin/inventario", "/admin/compras", "/admin/proveedores"]) {
    const res = await fetch(`${baseUrl}${allowedRoute}`, {
      headers: { Cookie: `aura_session=${warehouseToken}` },
      redirect: "manual",
    });
    const isOk = res.status === 200;
    console.log(`[${isOk ? "✅ PASS" : "❌ FAIL"}] Almacenero en ${allowedRoute} (Permitido) -> Status: ${res.status}`);
    if (!isOk) throw new Error(`Fallo: Almacenero bloqueado indebidamente en ${allowedRoute}`);
  }

  // Almacenero en POS, Cajas, Reportes y Usuarios debe ser 307 Redirect con denied=1
  for (const forbiddenRoute of ["/admin/ventas", "/admin/cajas", "/admin/reportes", "/admin/usuarios"]) {
    const res = await fetch(`${baseUrl}${forbiddenRoute}`, {
      headers: { Cookie: `aura_session=${warehouseToken}` },
      redirect: "manual",
    });
    const location = res.headers.get("location");
    const isDeniedRedirect = res.status === 307 && location?.includes("denied=1");
    console.log(`[${isDeniedRedirect ? "✅ PASS" : "❌ FAIL"}] Almacenero en ${forbiddenRoute} (Prohibido) -> Status: ${res.status}, Redirigido a: ${location}`);
    if (!isDeniedRedirect) throw new Error(`Fallo: Almacenero accedió indebidamente a ${forbiddenRoute}`);
  }

  console.log("\n================================================================================");
  console.log("✅ TODAS LAS PRUEBAS HTTP Y BLOQUEOS RBAC EN TIEMPO REAL: PASS");
  console.log("================================================================================\n");
}

testHttpRoutes().catch((e) => {
  console.error("Error en auditoría HTTP:", e);
  process.exit(1);
});
