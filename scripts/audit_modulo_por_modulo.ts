import { productOptionConfigSchema, productOptionsSchema, safeImageUrlSchema } from "@/lib/validations/product";
import { importCatalogAction } from "@/app/admin/actions/catalog-import";
import { returnPurchaseAction } from "@/app/admin/actions/purchases";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { db } from "@/db";
import { getDemoLoginOptions, isDemoLoginEnabled, verifyDemoLogin } from "@/lib/auth/demo-login";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/auth/rate-limit";
import { decodeSessionToken, encodeSessionToken, type SessionUser } from "@/lib/auth/session-edge";
import { encodeSupervisorPin } from "@/lib/auth/supervisor-pin";
import { businessDate, businessDayStart } from "@/lib/business-date";
import { refundUnitAmounts } from "@/lib/refund-amount";
import { csvCell, escapeHtml } from "@/lib/sanitize";
import { refundSaleSchema, saleFormSchema } from "@/lib/validations/sale";
import { userUpdateSchema } from "@/lib/validations/user";
import { closeShiftAction, openShiftAction, submitCashCountAction } from "@/app/admin/actions/cash-shifts";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "@/app/admin/actions/products";
import { createSaleAction, getPosCatalogAction, getPosContextAction, getSalesHistoryAction } from "@/app/admin/actions/sales";
import { uploadCategoryPhotoAction, uploadProductImageAction } from "@/app/admin/actions/upload";

const user: SessionUser = { id: 10, role: "cashier", name: "Persona de prueba", email: "test@example.invalid" };

test("la sesión exige una clave, expira y conserva solo identificador y rol", async (t) => {
  t.mock.method(Date, "now", () => 1_800_000_000_000);
  const oldSecret = process.env.SESSION_SECRET;
  t.after(() => {
    if (oldSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = oldSecret;
  });

  delete process.env.SESSION_SECRET;
  await assert.rejects(encodeSessionToken(user), /SESSION_SECRET/);
  process.env.SESSION_SECRET = randomBytes(32).toString("hex");
  const token = await encodeSessionToken(user);
  assert.deepEqual(await decodeSessionToken(token), { id: 10, role: "cashier" });
  assert.equal(await decodeSessionToken("invalid-token"), null);
  t.mock.restoreAll();
  t.mock.method(Date, "now", () => 1_800_000_000_000 + 7 * 86_400_000);
  assert.equal(await decodeSessionToken(token), null);
});

test("la matriz de rutas concede a cada rol su módulo y restringe usuarios", async (t) => {
  const oldSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = randomBytes(32).toString("hex");
  t.after(() => {
    if (oldSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = oldSecret;
  });

  const routes = [
    { role: "admin", path: "/admin/usuarios" },
    { role: "manager", path: "/admin/reportes" },
    { role: "cashier", path: "/admin/ventas" },
    { role: "warehouse", path: "/admin/inventario" },
  ] as const;
  for (const { role, path } of routes) {
    const token = await encodeSessionToken({ ...user, role });
    const headers = { cookie: `aura_session=${token}` };
    assert.equal((await proxy(new NextRequest(`http://localhost${path}`, { headers }))).status, 200);
    if (role !== "admin") {
      const denied = await proxy(new NextRequest("http://localhost/admin/usuarios", { headers }));
      assert.equal(denied.status, 307);
      assert.equal(new URL(denied.headers.get("location")!).searchParams.get("denied"), "1");
    }
  }

  const cashierToken = await encodeSessionToken({ ...user, role: "cashier" });
  const deniedUnknown = await proxy(
    new NextRequest("http://localhost/admin/ruta-inexistente", {
      headers: { cookie: `aura_session=${cashierToken}` },
    })
  );
  assert.equal(deniedUnknown.status, 307);
  const deniedLocation = new URL(deniedUnknown.headers.get("location")!);
  assert.equal(deniedLocation.pathname, "/admin/ventas");
  assert.equal(deniedLocation.searchParams.get("denied"), "1");
});

test("PBKDF2 verifica contraseñas válidas y rechaza registros sin hash", () => {
  const password = "Una clave de prueba";
  const first = hashPassword(password);
  assert.notEqual(first, hashPassword(password));
  assert.equal(verifyPassword(password, first), true);
  assert.equal(verifyPassword("otra clave", first), false);
  assert.equal(verifyPassword(password, password), false);
});

test("las cuentas de prueba están desactivadas por defecto y requieren ENABLE_DEMO_LOGIN=1", (t) => {
  const keys = ["NODE_ENV", "ENABLE_DEMO_LOGIN", "VERCEL_ENV", "VERCEL_GIT_COMMIT_REF"] as const;
  const previous = keys.map((name) => [name, process.env[name]] as const);
  t.after(() => {
    for (const [name, value] of previous) {
      if (value === undefined) Reflect.deleteProperty(process.env, name);
      else Reflect.set(process.env, name, value);
    }
  });

  const demo = ["cajera@aurastudio.com", "password123", "$2b$10$hashedpasswordforcashier"] as const;
  delete process.env.ENABLE_DEMO_LOGIN;
  Reflect.set(process.env, "NODE_ENV", "production");
  assert.equal(isDemoLoginEnabled(), false);
  assert.equal(verifyDemoLogin(...demo), false);
  assert.equal(getDemoLoginOptions(), null);

  Reflect.set(process.env, "NODE_ENV", "development");
  assert.equal(isDemoLoginEnabled(), false);
  assert.equal(verifyDemoLogin(...demo), false);
  assert.equal(getDemoLoginOptions(), null);

  process.env.ENABLE_DEMO_LOGIN = "0";
  assert.equal(isDemoLoginEnabled(), false);
  assert.equal(verifyDemoLogin(...demo), false);
  assert.equal(getDemoLoginOptions(), null);

  process.env.ENABLE_DEMO_LOGIN = "1";
  assert.equal(isDemoLoginEnabled(), true);
  const options = getDemoLoginOptions();
  assert.equal(options?.password, demo[1]);
  assert.equal(options?.accounts.length, 4);
  assert.deepEqual(options?.accounts.find(({ email }) => email === demo[0]), { label: "Cajera", email: demo[0] });
  assert.equal(verifyDemoLogin(...demo), true);
  assert.equal(verifyDemoLogin(demo[0], demo[1], "different-hash"), false);
});

test("el PIN se almacena como HMAC y la edición parcial conserva rol y estado", (t) => {
  const oldSecret = process.env.SUPERVISOR_PIN_SECRET;
  process.env.SUPERVISOR_PIN_SECRET = randomBytes(32).toString("hex");
  t.after(() => {
    if (oldSecret === undefined) delete process.env.SUPERVISOR_PIN_SECRET;
    else process.env.SUPERVISOR_PIN_SECRET = oldSecret;
  });
  assert.match(encodeSupervisorPin("1234"), /^hmac:[0-9a-f]{64}$/);
  assert.notEqual(encodeSupervisorPin("1234"), encodeSupervisorPin("1235"));
  assert.deepEqual(userUpdateSchema.parse({ name: "  Nuevo nombre  " }), { name: "Nuevo nombre" });
});

test("venta y devolución rechazan renglones duplicados", () => {
  const item = { productId: 1, quantity: 1, unitPrice: 12.5 };
  assert.equal(saleFormSchema.safeParse({ items: [item] }).success, true);
  assert.equal(saleFormSchema.safeParse({ items: [item, item] }).success, false);

  const line = { saleItemId: 1, quantityToRefund: 1 };
  const refund = { saleId: 1, items: [line], reason: "Cambio", supervisorPin: "1234", refundMethod: "card" };
  assert.equal(refundSaleSchema.safeParse(refund).success, true);
  assert.equal(refundSaleSchema.safeParse({ ...refund, items: [line, line] }).success, false);
  assert.equal(refundSaleSchema.safeParse({ ...refund, items: [{ ...line, quantityToRefund: 0.5 }] }).success, false);
});

test("el prorrateo devuelve exactamente el importe cobrado tras descuento", () => {
  const amounts = refundUnitAmounts([
    { id: 1, unitPrice: 1, quantity: 2 },
    { id: 2, unitPrice: 1, quantity: 1 },
  ], 2);
  const first = amounts.get(1)!;
  const second = amounts.get(2)!;
  assert.equal(first(0, 1) + first(1, 1), first(0, 2));
  assert.equal(first(0, 2) + second(0, 1), 200);
});

test("reporte local incluye ventas de la noche boliviana y rechaza fechas inválidas", () => {
  assert.equal(businessDate(new Date("2026-11-20T02:59:00Z")), "2026-11-19");
  assert.equal(businessDayStart("2026-11-20").toISOString(), "2026-11-20T04:00:00.000Z");
  assert.throws(() => businessDayStart("2026-02-30"), /Fecha inválida/);
});

test("las Server Actions rechazan la llamada sin sesión antes de leer o escribir", async (t) => {
  t.mock.method(console, "error", () => {});
  const guarded = () => { throw new Error("Acceso a base de datos sin sesión"); };
  const operations = [
    t.mock.method(db, "insert", guarded), t.mock.method(db, "update", guarded),
    t.mock.method(db, "delete", guarded), t.mock.method(db, "batch", guarded),
    t.mock.method(db.query.products, "findMany", guarded),
    t.mock.method(db.query.users, "findMany", guarded), t.mock.method(db.query.sales, "findMany", guarded),
  ];
  const sale = saleFormSchema.parse({ items: [{ productId: 1, quantity: 1, unitPrice: 20 }] });
  const actions = [
    getPosCatalogAction(), getPosContextAction(), getSalesHistoryAction(), createSaleAction(sale),
    createCategoryAction("Categoría"), updateCategoryAction(1, "Categoría"), deleteCategoryAction(1),
    openShiftAction({ cashRegisterId: 1, userId: 1, initialCash: 0 }),
    closeShiftAction({ shiftId: 1 }), submitCashCountAction({ shiftId: 1, actualCash: 0 }),
    returnPurchaseAction({ purchaseId: 1, requestId: "ad877895-785d-43b8-aab1-85ed429c414c", reason: "Prueba", items: [{ purchaseItemId: 1, quantity: 1 }] }),
    importCatalogAction(new FormData()), importCatalogAction(new FormData(), true),
    uploadCategoryPhotoAction(new FormData()), uploadProductImageAction(new FormData()),
  ];
  const results = await Promise.all(actions);
  for (const result of results) assert.equal(result.success, false);
  for (const operation of operations) assert.equal(operation.mock.callCount(), 0);
});

test("una variante admite solo una talla o un color y detecta opciones repetidas", () => {
  const options = [{
    variant: "41", price: "180", costPrice: "", initialStock: "3",
  }, {
    variant: "Verde", price: "200", costPrice: "80", initialStock: "5", variantColor: "#2e7d32",
  }];
  const parsed = productOptionsSchema.parse(options);
  assert.equal(parsed[0].variant, "41");
  assert.equal(parsed[0].variantColor, undefined);
  assert.equal(parsed[0].costPrice, 0);
  assert.equal(parsed[1].variant, "Verde");
  assert.equal(parsed[1].price, 200);
  assert.equal(productOptionsSchema.safeParse([options[1], { ...options[1], variant: " verde " }]).success, false);
});

test("safeImageUrlSchema y productOptionConfigSchema validan entradas seguras y rechazan XSS", () => {
  assert.equal(safeImageUrlSchema.safeParse("https://cdn.example.com/foto.jpg").success, true);
  assert.equal(safeImageUrlSchema.safeParse("/uploads/products/prod_1.webp").success, true);
  assert.equal(safeImageUrlSchema.safeParse("/uploads/categories/cat_1.webp").success, true);
  assert.equal(safeImageUrlSchema.safeParse("").success, true);
  assert.equal(safeImageUrlSchema.safeParse("javascript:alert(1)").success, false);
  assert.equal(safeImageUrlSchema.safeParse("data:text/html,<script>alert(1)</script>").success, false);
  assert.equal(safeImageUrlSchema.safeParse("http://inseguro.example.com/foto.png").success, false);

  assert.equal(
    productOptionConfigSchema.safeParse({
      id: "color",
      name: "Color",
      type: "color",
      values: [{ name: "Negro", hex: "#111111" }],
    }).success,
    true
  );
  assert.equal(
    productOptionConfigSchema.safeParse({
      id: "color",
      name: "Color",
      type: "color",
      values: [{ name: "Negro", hex: "no-hex" }],
    }).success,
    false
  );
});

test("escapeHtml y csvCell neutralizan HTML peligroso e inyección de fórmulas CSV", () => {
  assert.equal(
    escapeHtml(`<script>"alert('x')" &</script>`),
    "&lt;script&gt;&quot;alert(&#39;x&#39;)&quot; &amp;&lt;/script&gt;"
  );
  assert.equal(csvCell("=1+1"), `"'=1+1"`);
  assert.equal(csvCell("+SUM(A1:A2)"), `"'+SUM(A1:A2)"`);
  assert.equal(csvCell("-2+3"), `"'-2+3"`);
  assert.equal(csvCell("@cmd"), `"'@cmd"`);
  assert.equal(csvCell("\t=cmd"), `"'\t=cmd"`);
  assert.equal(csvCell(`Producto "Pro"\nLínea 2`), `"Producto ""Pro"" Línea 2"`);
});

test("rate limiter bloquea al alcanzar el límite y se reinicia tras resetRateLimit", () => {
  const key = `test:rate-limit:${randomBytes(6).toString("hex")}`;
  const windowMs = 60_000;
  assert.equal(checkRateLimit(key, 3, windowMs).allowed, true);
  recordFailedAttempt(key, windowMs);
  recordFailedAttempt(key, windowMs);
  assert.equal(checkRateLimit(key, 3, windowMs).allowed, true);
  recordFailedAttempt(key, windowMs);
  const blocked = checkRateLimit(key, 3, windowMs);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec >= 1);
  resetRateLimit(key);
  assert.equal(checkRateLimit(key, 3, windowMs).allowed, true);
});
