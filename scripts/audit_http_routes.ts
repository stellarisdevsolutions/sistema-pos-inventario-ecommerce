import assert from "node:assert/strict";
import { test } from "node:test";

const baseUrl = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000";
const adminPaths = [
  "/admin", "/admin/ventas", "/admin/cajas", "/admin/inventario", "/admin/inventario/nuevo",
  "/admin/inventario/1/editar", "/admin/compras", "/admin/compras/nueva", "/admin/proveedores",
  "/admin/reportes", "/admin/analitica", "/admin/usuarios",
];

test("el portal presenta el formulario de acceso", async () => {
  const response = await fetch(new URL("/portal", baseUrl), { signal: AbortSignal.timeout(15_000) });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /type="password"/);
});

for (const path of adminPaths) {
  test(`${path} requiere iniciar sesión`, async () => {
    const response = await fetch(new URL(path, baseUrl), {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get("location")!, baseUrl);
    assert.equal(location.pathname, "/portal");
    assert.equal(location.searchParams.get("returnTo"), path);
  });
}
