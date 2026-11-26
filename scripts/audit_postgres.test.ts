import ExcelJS from "exceljs";
import { makeCatalogWorkbook, readCatalogWorkbook } from "@/lib/catalog-workbook";
import { extendModelOptions } from "@/lib/model-variants";
import { deleteUnusedProductQuery, createCatalogProductsQuery } from "@/db/operations/catalog";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test, type TestContext } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import { cancelPurchaseQuery, createPurchaseQuery, lockPurchaseQuery, receivePurchaseQuery, returnPurchaseQuery } from "@/db/operations/purchases";
import { cancelSaleQuery, createSaleQuery, refundSaleQuery } from "@/db/operations/sales";
import { productDbInsertSchema, productOptionConfigSchema } from "@/lib/validations/product";
import { saleFormSchema } from "@/lib/validations/sale";
import { purchaseFormSchema, purchaseReturnSchema, type PurchaseReturnInput } from "@/lib/validations/purchase";
import { inventoryAdjustmentQuery } from "@/db/operations/inventory-adjustment";
import { approveCashCountQuery, archiveCashRegisterQuery, deleteUnusedCashRegisterQuery, directCloseShiftQuery, openShiftQuery, requestCashRecountQuery, submitCashCountQuery } from "@/db/operations/cash-shifts";

async function createDatabase(context: TestContext) {
  const db = new PGlite();
  context.after(() => db.close());

  for (const migration of ["0000_new_meggan.sql", "0001_unique_open_cash_shifts.sql", "0002_purchase_returns.sql", "0003_checkout_requests.sql", "0004_product_variants.sql", "0005_product_attributes_jsonb.sql", "0006_hardening_refunds_sessions.sql", "0007_product_model_images.sql", "0008_product_archived.sql", "0009_cash_shift_recount_and_reconciliation.sql", "0010_add_qr_payment_method.sql", "0011_purchase_return_credited_amount.sql"]) {
    await db.exec(await readFile(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
  }
  await db.exec(`
    INSERT INTO users (name, email, password_hash)
    VALUES ('Fixture 1', 'one@example.invalid', 'fixture'), ('Fixture 2', 'two@example.invalid', 'fixture');
  `);
  return db;
}

test("PostgreSQL impide dos turnos abiertos por caja o por operador", async (t) => {
  const db = await createDatabase(t);
  await db.exec(`
    INSERT INTO cash_registers (name, code) VALUES ('Terminal 1', 'FIX-1'), ('Terminal 2', 'FIX-2');
    INSERT INTO cash_shifts (shift_number, cash_register_id, user_id) VALUES ('A', 1, 1);
  `);

  await assert.rejects(
    db.exec("INSERT INTO cash_shifts (shift_number, cash_register_id, user_id) VALUES ('B', 1, 2)"),
    /cash_shifts_open_register_unique/
  );
  await assert.rejects(
    db.exec("INSERT INTO cash_shifts (shift_number, cash_register_id, user_id) VALUES ('C', 2, 1)"),
    /cash_shifts_open_operator_unique/
  );
  await db.exec("UPDATE cash_shifts SET status = 'closed' WHERE shift_number = 'A'");
  await db.exec("INSERT INTO cash_shifts (shift_number, cash_register_id, user_id) VALUES ('D', 1, 1)");
});

test("la baja aplica acta, detalle, stock y Kardex juntos o revierte todos", async (t) => {
  const db = await createDatabase(t);
  await db.exec("INSERT INTO products (name, slug, stock, cost_price, price) VALUES ('Fixture', 'fixture', 3, 10, 20)");

  const dialect = new PgDialect();
  function executeAdjustment(userId: number) {
    const query = dialect.sqlToQuery(inventoryAdjustmentQuery({
      productId: 1,
      quantity: 2,
      userId,
      authorizedByUserId: null,
      reason: "damaged",
      notes: "Fixture",
      prefix: "BAJA-2026-",
    }));
    return db.query<{ newStock: number }>(query.sql, query.params);
  }

  await assert.rejects(executeAdjustment(9999), /foreign key/);
  assert.deepEqual((await db.query("SELECT stock FROM products WHERE id = 1")).rows, [{ stock: 3 }]);
  const result = await executeAdjustment(1);
  assert.equal(result.rows[0]?.newStock, 1);
  assert.equal((await executeAdjustment(1)).rows.length, 0);
  assert.deepEqual((await db.query("SELECT quantity, previous_stock, new_stock FROM inventory_movements")).rows, [
    { quantity: -2, previous_stock: 3, new_stock: 1 },
  ]);
  assert.deepEqual((await db.query("SELECT quantity FROM inventory_adjustment_items")).rows, [{ quantity: 2 }]);
  assert.equal((await db.query("SELECT id FROM inventory_adjustments")).rows.length, 1);
});

test("recibir y anular compras mantiene stock y Kardex consistentes", async (t) => {
  const db = await createDatabase(t);
  await db.exec(`
    INSERT INTO suppliers (name) VALUES ('Proveedor fixture');
    INSERT INTO products (name, slug, stock, cost_price, price) VALUES ('Fixture', 'fixture', 3, 10, 20);
  `);

  const dialect = new PgDialect();
  for (const method of ["transfer", "qr", "cash"] as const) {
    assert.equal(
      purchaseFormSchema.safeParse({
        supplierId: 1,
        paymentMethod: method,
        items: [{ productId: 1, quantity: 1, unitCost: 10 }],
      }).success,
      true
    );
  }
  for (const rejectedMethod of ["card", "other"]) {
    assert.equal(
      purchaseFormSchema.safeParse({
        supplierId: 1,
        paymentMethod: rejectedMethod,
        items: [{ productId: 1, quantity: 1, unitCost: 10 }],
      }).success,
      false
    );
  }

  const create = (userId: number, paymentMethod: "transfer" | "qr" | "cash" = "transfer") => {
    const query = dialect.sqlToQuery(createPurchaseQuery(purchaseFormSchema.parse({
      supplierId: 1,
      paymentMethod,
      items: [{ productId: 1, quantity: 2, unitCost: 20 }],
    }), userId, "COM-2026-"));
    return db.query<{ id: number }>(query.sql, query.params);
  };
  await assert.rejects(create(9999), /foreign key/);
  assert.deepEqual((await db.query("SELECT stock FROM products")).rows, [{ stock: 3 }]);

  const created = await create(1, "qr");
  const { id } = created.rows[0];
  assert.deepEqual((await db.query("SELECT payment_method FROM purchases WHERE id = $1", [id])).rows, [{ payment_method: "qr" }]);
  assert.deepEqual((await db.query("SELECT stock, cost_price FROM products")).rows, [{ stock: 5, cost_price: "14.00" }]);

  const query = dialect.sqlToQuery(cancelPurchaseQuery(id, 1, "Fixture cancelado"));
  await db.exec("UPDATE products SET stock = 1");
  assert.equal((await db.query(query.sql, query.params)).rows.length, 0);
  assert.deepEqual((await db.query("SELECT status FROM purchases")).rows, [{ status: "received" }]);

  await db.exec("UPDATE products SET stock = 5");
  assert.equal((await db.query(query.sql, query.params)).rows.length, 1);
  assert.equal((await db.query(query.sql, query.params)).rows.length, 0);
  assert.deepEqual((await db.query("SELECT stock FROM products")).rows, [{ stock: 3 }]);
  assert.deepEqual((await db.query("SELECT quantity FROM inventory_movements ORDER BY id")).rows, [
    { quantity: 2 }, { quantity: -2 },
  ]);
});

test("cobrar una venta aplica ticket, stock, Kardex y caja en la misma operación", async (t) => {
  const db = await createDatabase(t);
  await db.exec(`
    INSERT INTO cash_registers (name, code) VALUES ('Terminal fixture', 'FIX');
    INSERT INTO cash_shifts (shift_number, cash_register_id, user_id, initial_cash, expected_cash)
      VALUES ('A', 1, 1, 50, 50);
    INSERT INTO products (name, slug, stock, cost_price, price) VALUES ('Fixture', 'fixture', 3, 10, 20);
  `);
  const dialect = new PgDialect();
  const execute = (operatorId: number, customerId: number | null = null) => {
    const query = dialect.sqlToQuery(createSaleQuery({
      sale: saleFormSchema.parse({ customerId, items: [{ productId: 1, quantity: 2, unitPrice: 20 }] }),
      operatorId, shiftId: 1, prefix: "VTA-2026-", subtotal: 40, discount: 0, total: 40,
      cashGiven: 50, changeGiven: 10, notes: null,
    }));
    return db.query<{ quantity: number; saleId: number }>(query.sql, query.params);
  };
  assert.equal((await execute(2)).rows.length, 0);
  await assert.rejects(execute(1, 9999), /foreign key/);
  assert.deepEqual((await db.query("SELECT stock FROM products")).rows, [{ stock: 3 }]);
  assert.deepEqual((await db.query("SELECT expected_cash FROM cash_shifts")).rows, [{ expected_cash: "50.00" }]);

  assert.equal((await execute(1)).rows[0]?.quantity, 2);
  assert.equal((await execute(1)).rows.length, 0);
  assert.deepEqual((await db.query("SELECT stock FROM products")).rows, [{ stock: 1 }]);
  assert.deepEqual((await db.query("SELECT expected_cash FROM cash_shifts")).rows, [{ expected_cash: "90.00" }]);
  assert.deepEqual((await db.query("SELECT quantity FROM inventory_movements")).rows, [{ quantity: 2 }]);
  const [sale] = (await db.query<{ id: number }>("SELECT id FROM sales")).rows;
  const [item] = (await db.query<{ id: number }>("SELECT id FROM sale_items")).rows;
  const refund = dialect.sqlToQuery(refundSaleQuery({
    saleId: sale.id, operatorId: 1, supervisorId: 2, cashShiftId: 1,
    amount: 20, note: "Fixture devolución", items: [{ id: item.id, returnedQuantity: 0, quantity: 1 }],
  }));
  assert.equal((await db.query(refund.sql, refund.params)).rows.length, 1);
  assert.equal((await db.query(refund.sql, refund.params)).rows.length, 0);
  assert.deepEqual((await db.query("SELECT stock FROM products")).rows, [{ stock: 2 }]);
  assert.deepEqual((await db.query("SELECT expected_cash FROM cash_shifts")).rows, [{ expected_cash: "70.00" }]);

  const cancelRefunded = dialect.sqlToQuery(cancelSaleQuery(sale.id, 2, "Fixture anulación"));
  assert.equal((await db.query(cancelRefunded.sql, cancelRefunded.params)).rows.length, 0);

  const another = await execute(1);
  const cancel = dialect.sqlToQuery(cancelSaleQuery(another.rows[0].saleId, 2, "Fixture anulación"));
  assert.equal((await db.query(cancel.sql, cancel.params)).rows.length, 1);
  assert.equal((await db.query(cancel.sql, cancel.params)).rows.length, 0);
  assert.deepEqual((await db.query("SELECT stock FROM products")).rows, [{ stock: 2 }]);
  assert.deepEqual((await db.query("SELECT expected_cash FROM cash_shifts")).rows, [{ expected_cash: "70.00" }]);
  const runShiftUpdate = (statement: ReturnType<typeof submitCashCountQuery>) => {
    const query = dialect.sqlToQuery(statement);
    return db.query(query.sql, query.params);
  };
  assert.equal((await runShiftUpdate(approveCashCountQuery(1, 2, null))).rows.length, 0);
  assert.equal((await runShiftUpdate(submitCashCountQuery(1, 2, "65.00"))).rows.length, 0);
  assert.equal((await runShiftUpdate(submitCashCountQuery(1, 1, "65.00"))).rows.length, 1);
  assert.equal((await runShiftUpdate(submitCashCountQuery(1, 1, "70.00"))).rows.length, 0);

  assert.equal((await execute(1)).rows.length, 0);
  await assert.rejects(
    db.exec("INSERT INTO cash_shifts (shift_number, cash_register_id, user_id) VALUES ('B', 1, 2)"),
    /cash_shifts_open_register_unique/
  );
  const secondRefund = dialect.sqlToQuery(refundSaleQuery({
    saleId: sale.id, operatorId: 1, supervisorId: 2, cashShiftId: 1,
    amount: 20, note: "Fixture devolución", items: [{ id: item.id, returnedQuantity: 1, quantity: 1 }],
  }));
  assert.equal((await db.query(secondRefund.sql, secondRefund.params)).rows.length, 0);

  assert.equal((await runShiftUpdate(approveCashCountQuery(1, 2, null))).rows.length, 0);
  assert.equal((await runShiftUpdate(approveCashCountQuery(1, 2, "Faltante registrado"))).rows.length, 1);
  assert.equal((await runShiftUpdate(approveCashCountQuery(1, 2, "Otro motivo"))).rows.length, 0);
  assert.deepEqual((await db.query(`
    SELECT status, expected_cash, actual_cash, difference, closed_by_user_id, notes
    FROM cash_shifts
  `)).rows, [{
    status: "closed", expected_cash: "70.00", actual_cash: "65.00", difference: "-5.00",
    closed_by_user_id: 2, notes: "Faltante registrado",
  }]);

});

test("devuelve al proveedor al costo vigente sin duplicar salidas ni superar la compra o el stock", async (t) => {
  const db = await createDatabase(t);
  const dialect = new PgDialect();
  const query = (statement: ReturnType<typeof returnPurchaseQuery>) => dialect.sqlToQuery(statement);
  const execute = (statement: ReturnType<typeof returnPurchaseQuery>) => {
    const { sql, params } = query(statement);
    return db.query<{ id: number }>(sql, params);
  };

  await db.exec(`
    INSERT INTO suppliers (name) VALUES ('Proveedor fixture');
    INSERT INTO products (name, slug, stock, cost_price, price)
    VALUES ('Producto', 'producto', 0, 0, 50), ('Otro', 'otro', 0, 0, 50);
  `);
  const receive = (items: { productId: number; quantity: number; unitCost: number }[]) =>
    execute(createPurchaseQuery(purchaseFormSchema.parse({ supplierId: 1, items }), 1, "COM-"));
  const original = (await receive([
    { productId: 1, quantity: 10, unitCost: 20 },
    { productId: 2, quantity: 1, unitCost: 6 },
  ])).rows[0];
  const other = (await receive([{ productId: 1, quantity: 5, unitCost: 26 }])).rows[0];
  const input = (items: PurchaseReturnInput["items"]) => purchaseReturnSchema.parse({
    purchaseId: original.id,
    requestId: randomUUID(),
    reason: "Mercancía dañada",
    creditNoteReference: "NC-20",
    items,
  });
  const submit = (data: PurchaseReturnInput, userId = 1) => db.transaction(async tx => {
    const lock = query(lockPurchaseQuery(data.purchaseId));
    await tx.query(lock.sql, lock.params);
    const mutation = query(returnPurchaseQuery(data, userId));
    return tx.query<{ id: number }>(mutation.sql, mutation.params);
  });

  assert.equal((await submit(input([{ purchaseItemId: 3, quantity: 1 }]))).rows.length, 0);
  assert.equal((await submit(input([{ purchaseItemId: 1, quantity: 1 }, { purchaseItemId: 2, quantity: 2 }]))).rows.length, 0);
  const firstReturn = input([{ purchaseItemId: 1, quantity: 3 }]);
  await assert.rejects(submit(firstReturn, 9999), /foreign key/);
  assert.deepEqual((await db.query("SELECT stock FROM products WHERE id = 1")).rows, [{ stock: 15 }]);
  const { rows: [receipt] } = await submit(firstReturn);
  assert.deepEqual((await submit(firstReturn)).rows, [receipt]);
  assert.equal((await submit(input([{ purchaseItemId: 1, quantity: 8 }]))).rows.length, 0);
  assert.equal((await execute(cancelPurchaseQuery(original.id, 1, "Prueba"))).rows.length, 0);
  await assert.rejects(
    db.query("UPDATE purchases SET status = 'cancelled' WHERE id = $1", [original.id]),
    /Una compra con devoluciones no se puede anular/
  );
  assert.deepEqual((await db.query("SELECT status FROM purchases WHERE id = $1", [original.id])).rows, [{ status: "received" }]);
  assert.deepEqual((await db.query("SELECT quantity, original_unit_cost, inventory_unit_cost FROM purchase_return_items WHERE return_id = $1", [receipt.id])).rows, [
    { quantity: 3, original_unit_cost: "20.00", inventory_unit_cost: "22.00" },
  ]);
  assert.deepEqual((await db.query(`
    SELECT quantity, previous_stock, new_stock, unit_cost, reference_id
    FROM inventory_movements WHERE reference_type = 'purchase_return'
  `)).rows, [{ quantity: -3, previous_stock: 15, new_stock: 12, unit_cost: "22.00", reference_id: receipt.id }]);

  assert.equal((await execute(cancelPurchaseQuery(other.id, 1, "Prueba"))).rows.length, 1);
  assert.deepEqual(
    (await db.query("SELECT status, notes FROM purchases WHERE id = $1", [other.id])).rows,
    [{ status: "cancelled", notes: "Anulada: Prueba" }]
  );
  assert.equal((await submit({ ...input([{ purchaseItemId: 3, quantity: 1 }]), purchaseId: other.id })).rows.length, 0);
  await db.exec("UPDATE products SET stock = 4 WHERE id = 1");
  assert.equal((await submit(input([{ purchaseItemId: 1, quantity: 5 }]))).rows.length, 0);
  assert.equal((await submit(input([{ purchaseItemId: 1, quantity: 4 }]))).rows.length, 1);
  assert.deepEqual((await db.query("SELECT stock, cost_price FROM products WHERE id = 1")).rows, [{ stock: 0, cost_price: "19.14" }]);
});

test("bloquea la anulación total si falta stock en un producto de una compra múltiple y permite devolver el resto disponible", async (t) => {
  const db = await createDatabase(t);
  const dialect = new PgDialect();
  const toQuery = (statement: Parameters<PgDialect["sqlToQuery"]>[0]) => dialect.sqlToQuery(statement);
  const execSql = <Row = { id: number }>(statement: Parameters<PgDialect["sqlToQuery"]>[0]) => {
    const { sql, params } = toQuery(statement);
    return db.query<Row>(sql, params);
  };

  await db.exec(`
    INSERT INTO suppliers (name) VALUES ('Proveedor múltiple');
    INSERT INTO products (name, slug, stock, cost_price, price)
    VALUES ('Prod A', 'prod-a', 0, 0, 50), ('Prod B', 'prod-b', 0, 0, 50), ('Prod C', 'prod-c', 0, 0, 50);
  `);

  const { rows: [purchase] } = await execSql(
    createPurchaseQuery(
      purchaseFormSchema.parse({
        supplierId: 1,
        items: [
          { productId: 1, quantity: 10, unitCost: 20 },
          { productId: 2, quantity: 10, unitCost: 20 },
          { productId: 3, quantity: 10, unitCost: 20 },
        ],
      }),
      1,
      "COM-"
    )
  );
  const itemRows = (
    await db.query<{ id: number; product_id: number }>(
      "SELECT id, product_id FROM purchase_items WHERE purchase_id = $1 ORDER BY product_id",
      [purchase.id]
    )
  ).rows;
  assert.equal(itemRows.length, 3);
  const [itemA, itemB, itemC] = itemRows;

  // Simula ventas: Prod A se agotó (0 restantes), Prod B vendió 2 (8 restantes), Prod C intacto (10 restantes)
  await db.exec("UPDATE products SET stock = 0 WHERE id = 1; UPDATE products SET stock = 8 WHERE id = 2;");

  assert.equal((await execSql(cancelPurchaseQuery(purchase.id, 1, "Intento anular"))).rows.length, 0);
  assert.deepEqual(
    (await db.query("SELECT status FROM purchases WHERE id = $1", [purchase.id])).rows,
    [{ status: "received" }]
  );
  assert.deepEqual(
    (await db.query("SELECT id, stock FROM products ORDER BY id")).rows,
    [{ id: 1, stock: 0 }, { id: 2, stock: 8 }, { id: 3, stock: 10 }]
  );

  const runReturn = (items: PurchaseReturnInput["items"]) =>
    db.transaction(async (tx) => {
      const lock = toQuery(lockPurchaseQuery(purchase.id));
      await tx.query(lock.sql, lock.params);
      const mutation = toQuery(
        returnPurchaseQuery(
          purchaseReturnSchema.parse({
            purchaseId: purchase.id,
            requestId: randomUUID(),
            reason: "Devolución parcial",
            items,
          }),
          1
        )
      );
      return tx.query<{ id: number }>(mutation.sql, mutation.params);
    });

  // No permite devolver un producto agotado ni más del stock actual
  assert.equal((await runReturn([{ purchaseItemId: itemA.id, quantity: 1 }])).rows.length, 0);
  assert.equal((await runReturn([{ purchaseItemId: itemB.id, quantity: 9 }])).rows.length, 0);

  // Sí permite devolver todo el saldo disponible restante (8 de Prod B y 10 de Prod C)
  assert.equal(
    (await runReturn([
      { purchaseItemId: itemB.id, quantity: 8 },
      { purchaseItemId: itemC.id, quantity: 10 },
    ])).rows.length,
    1
  );
  assert.deepEqual(
    (await db.query("SELECT id, stock FROM products ORDER BY id")).rows,
    [{ id: 1, stock: 0 }, { id: 2, stock: 0 }, { id: 3, stock: 0 }]
  );
  assert.deepEqual(
    (await db.query("SELECT status FROM purchases WHERE id = $1", [purchase.id])).rows,
    [{ status: "received" }]
  );
  assert.equal((await execSql(cancelPurchaseQuery(purchase.id, 1, "Tras devolver"))).rows.length, 0);
});

test("registra el monto reconocido por el proveedor en devoluciones sin alterar el costo de salida en Kárdex", async (t) => {
  const db = await createDatabase(t);
  const dialect = new PgDialect();
  const toQuery = (statement: Parameters<PgDialect["sqlToQuery"]>[0]) => dialect.sqlToQuery(statement);
  const execSql = <Row = { id: number }>(statement: Parameters<PgDialect["sqlToQuery"]>[0]) => {
    const { sql, params } = toQuery(statement);
    return db.query<Row>(sql, params);
  };

  await db.exec(`
    INSERT INTO suppliers (name) VALUES ('Proveedor Nota Crédito');
    INSERT INTO products (name, slug, stock, cost_price, price) VALUES ('Monitor 27', 'monitor-27', 0, 0, 150);
  `);

  const { rows: [purchase] } = await execSql(
    createPurchaseQuery(
      purchaseFormSchema.parse({
        supplierId: 1,
        items: [{ productId: 1, quantity: 5, unitCost: 100 }],
      }),
      1,
      "COM-"
    )
  );
  const { rows: [line] } = await db.query<{ id: number }>(
    "SELECT id FROM purchase_items WHERE purchase_id = $1",
    [purchase.id]
  );

  const runReturn = (input: PurchaseReturnInput) =>
    db.transaction(async (tx) => {
      const lock = toQuery(lockPurchaseQuery(input.purchaseId));
      await tx.query(lock.sql, lock.params);
      const mutation = toQuery(returnPurchaseQuery(input, 1));
      return tx.query<{ id: number }>(mutation.sql, mutation.params);
    });

  // 1. Rechaza si el esquema recibe monto reconocido negativo
  assert.equal(
    purchaseReturnSchema.safeParse({
      purchaseId: purchase.id,
      requestId: randomUUID(),
      reason: "Prueba negativa",
      creditedAmount: -1,
      items: [{ purchaseItemId: line.id, quantity: 1 }],
    }).success,
    false
  );

  // 2. Rechaza en PostgreSQL si el monto reconocido supera el valor de compra (100 * 1 = 100)
  const overCredit = await runReturn(
    purchaseReturnSchema.parse({
      purchaseId: purchase.id,
      requestId: randomUUID(),
      reason: "Excede costo",
      creditedAmount: 120,
      items: [{ purchaseItemId: line.id, quantity: 1 }],
    })
  );
  assert.equal(overCredit.rows.length, 0);
  assert.deepEqual((await db.query("SELECT stock FROM products WHERE id = 1")).rows, [{ stock: 5 }]);

  // 3. Sin monto manual, guarda automáticamente el total a costo de compra (100.00)
  const { rows: [defaultReturn] } = await runReturn(
    purchaseReturnSchema.parse({
      purchaseId: purchase.id,
      requestId: randomUUID(),
      reason: "Sin penalidad",
      items: [{ purchaseItemId: line.id, quantity: 1 }],
    })
  );
  assert.deepEqual(
    (await db.query("SELECT credited_amount FROM purchase_returns WHERE id = $1", [defaultReturn.id])).rows,
    [{ credited_amount: "100.00" }]
  );

  // 4. Con penalidad del proveedor (Bs 85 reconocidos sobre 100 de mercadería), guarda 85.00 y el Kárdex sale a 100.00
  const { rows: [adjustedReturn] } = await runReturn(
    purchaseReturnSchema.parse({
      purchaseId: purchase.id,
      requestId: randomUUID(),
      reason: "Restocking fee",
      creditNoteReference: "NC-85",
      creditedAmount: 85,
      items: [{ purchaseItemId: line.id, quantity: 1 }],
    })
  );
  assert.deepEqual(
    (await db.query("SELECT credited_amount, credit_note_reference FROM purchase_returns WHERE id = $1", [adjustedReturn.id])).rows,
    [{ credited_amount: "85.00", credit_note_reference: "NC-85" }]
  );
  assert.deepEqual(
    (await db.query(
      "SELECT quantity, unit_cost FROM inventory_movements WHERE reference_type = 'purchase_return' AND reference_id = $1",
      [adjustedReturn.id]
    )).rows,
    [{ quantity: -1, unit_cost: "100.00" }]
  );

  // 5. Acepta 0.00 explícito cuando el proveedor no reconoce crédito monetario (solo reposición/garantía)
  const { rows: [zeroReturn] } = await runReturn(
    purchaseReturnSchema.parse({
      purchaseId: purchase.id,
      requestId: randomUUID(),
      reason: "Sin nota de crédito monetaria",
      creditedAmount: 0,
      items: [{ purchaseItemId: line.id, quantity: 1 }],
    })
  );
  assert.deepEqual(
    (await db.query("SELECT credited_amount FROM purchase_returns WHERE id = $1", [zeroReturn.id])).rows,
    [{ credited_amount: "0.00" }]
  );
  assert.deepEqual((await db.query("SELECT stock FROM products WHERE id = 1")).rows, [{ stock: 2 }]);
});

test("una compra pendiente no suma stock hasta confirmarse su recepción y puede anularse sin afectar Kárdex", async (t) => {
  const db = await createDatabase(t);
  const dialect = new PgDialect();
  await db.exec(`
    INSERT INTO suppliers (name) VALUES ('Proveedor Pendiente');
    INSERT INTO products (name, slug, stock, cost_price, price) VALUES ('Monitor', 'monitor', 3, 10, 25);
  `);

  const runCreatePending = () => {
    const stmt = dialect.sqlToQuery(
      createPurchaseQuery(
        purchaseFormSchema.parse({
          supplierId: 1,
          status: "pending",
          paymentMethod: "transfer",
          items: [{ productId: 1, quantity: 2, unitCost: 20 }],
        }),
        1,
        "COM-2026-"
      )
    );
    return db.query<{ id: number }>(stmt.sql, stmt.params);
  };

  const pendingPurchase = (await runCreatePending()).rows[0];
  assert.deepEqual(
    (await db.query("SELECT status FROM purchases WHERE id = $1", [pendingPurchase.id])).rows,
    [{ status: "pending" }]
  );
  assert.deepEqual(
    (await db.query("SELECT stock, cost_price FROM products WHERE id = 1")).rows,
    [{ stock: 3, cost_price: "10.00" }]
  );
  assert.equal((await db.query("SELECT id FROM inventory_movements")).rows.length, 0);

  const receiveStmt = dialect.sqlToQuery(receivePurchaseQuery(pendingPurchase.id, 1));
  assert.equal((await db.query(receiveStmt.sql, receiveStmt.params)).rows.length, 1);
  // Segunda recepción idempotente no vuelve a acreditar stock
  assert.equal((await db.query(receiveStmt.sql, receiveStmt.params)).rows.length, 0);
  assert.deepEqual(
    (await db.query("SELECT status FROM purchases WHERE id = $1", [pendingPurchase.id])).rows,
    [{ status: "received" }]
  );
  assert.deepEqual(
    (await db.query("SELECT stock, cost_price FROM products WHERE id = 1")).rows,
    [{ stock: 5, cost_price: "14.00" }]
  );
  assert.deepEqual(
    (await db.query("SELECT movement_type, quantity, previous_stock, new_stock FROM inventory_movements")).rows,
    [{ movement_type: "purchase_in", quantity: 2, previous_stock: 3, new_stock: 5 }]
  );

  // Compra pendiente con producto inactivo no puede recibirse, pero sí anularse sin afectar Kárdex
  const secondPending = (await runCreatePending()).rows[0];
  await db.exec("UPDATE products SET is_active = false WHERE id = 1");
  const blockedReceive = dialect.sqlToQuery(receivePurchaseQuery(secondPending.id, 1));
  assert.equal((await db.query(blockedReceive.sql, blockedReceive.params)).rows.length, 0);
  assert.deepEqual(
    (await db.query("SELECT status FROM purchases WHERE id = $1", [secondPending.id])).rows,
    [{ status: "pending" }]
  );

  const cancelPending = dialect.sqlToQuery(cancelPurchaseQuery(secondPending.id, 1, "Orden cancelada"));
  assert.equal((await db.query(cancelPending.sql, cancelPending.params)).rows.length, 1);
  assert.deepEqual(
    (await db.query("SELECT status FROM purchases WHERE id = $1", [secondPending.id])).rows,
    [{ status: "cancelled" }]
  );
  assert.equal((await db.query("SELECT id FROM inventory_movements")).rows.length, 1);
});

test("el mismo intento de cobro guarda una sola venta, una salida y un abono de caja", async (t) => {
  const db = await createDatabase(t);
  await db.exec(`
    INSERT INTO cash_registers (name, code) VALUES ('Caja', 'C01');
    INSERT INTO cash_shifts (shift_number, cash_register_id, user_id) VALUES ('TURNO', 1, 1);
    INSERT INTO products (name, slug, price, stock) VALUES ('Remera', 'remera', 30, 2);
  `);
  const sale = saleFormSchema.parse({
    checkoutRequestId: randomUUID(), items: [{ productId: 1, quantity: 1, unitPrice: 30 }],
  });
  const query = new PgDialect().sqlToQuery(createSaleQuery({
    sale, operatorId: 1, shiftId: 1, prefix: "VTA-", subtotal: 30, total: 30,
    discount: 0, cashGiven: 30, changeGiven: 0, notes: null, checkoutFingerprint: "fixture",
  }));
  assert.equal((await db.query(query.sql, query.params)).rows.length, 1);
  assert.equal((await db.query(query.sql, query.params)).rows.length, 0);
  assert.deepEqual((await db.query("SELECT checkout_request_id, checkout_fingerprint FROM sales")).rows,
    [{ checkout_request_id: sale.checkoutRequestId, checkout_fingerprint: "fixture" }]);
  assert.deepEqual((await db.query("SELECT stock FROM products")).rows, [{ stock: 1 }]);
  assert.deepEqual((await db.query("SELECT quantity FROM inventory_movements")).rows, [{ quantity: 1 }]);
  assert.deepEqual((await db.query("SELECT expected_cash FROM cash_shifts")).rows, [{ expected_cash: "30.00" }]);
});

test("la plantilla Excel crea SKU, variantes y aperturas con un solo alta por fila", async (t) => {
  const db = await createDatabase(t);
  const file = await makeCatalogWorkbook();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(file).buffer);
  const sheet = workbook.getWorksheet("Carga")!;
  const ex = workbook.getWorksheet("Ejemplos")!;
  for (let row = 2; row <= 4; row++) sheet.addRow(ex.getRow(row).values);
  const input = await readCatalogWorkbook(await workbook.xlsx.writeBuffer() as ArrayBuffer);
  assert.deepEqual(input.errors, []);
  assert.equal(input.entries.length, 3);
  const query = new PgDialect().sqlToQuery(createCatalogProductsQuery(input.entries.map(row => row.entry), 1));
  await db.query(query.sql, query.params);
  await assert.rejects(db.query(query.sql, query.params), /duplicate key/);
  assert.deepEqual((await db.query("SELECT code, variant_selector FROM product_models")).rows,
    [{ code: "REM-BASICA", variant_selector: "Talla y color" }]);
  const { rows } = await db.query<{ sku: string; stock: number; variant: string | null }>("SELECT sku, stock, variant FROM products ORDER BY id");
  assert.equal(rows.length, 3);
  assert.match(rows[0].sku, /^PROD-/);
  assert.deepEqual(rows.map(row => [row.variant, row.stock]), [[null, 8], ["S / Verde", 4], ["M / Negro", 2]]);
  assert.equal(rows[2].sku, "REM-M-NEG");
  assert.equal((await db.query("SELECT * FROM inventory_movements WHERE reference_type = 'product_creation'")).rows.length, 3);
});

test("refundSaleQuery registra sale_refunds, es idempotente por requestId y ajusta ventas no-efectivo en turno", async (t) => {
  const db = await createDatabase(t);
  const dialect = new PgDialect();
  await db.exec(`
    INSERT INTO cash_registers (name, code) VALUES ('Caja', 'C01');
    INSERT INTO cash_shifts (shift_number, cash_register_id, user_id) VALUES ('TURNO', 1, 1);
    INSERT INTO products (name, slug, price, cost_price, stock) VALUES ('Teclado', 'teclado', 50, 20, 5);
  `);

  const sale = saleFormSchema.parse({
    checkoutRequestId: randomUUID(),
    paymentMethod: "card",
    items: [{ productId: 1, quantity: 2, unitPrice: 50 }],
  });
  const saleStmt = dialect.sqlToQuery(createSaleQuery({
    sale,
    operatorId: 1,
    shiftId: 1,
    prefix: "VTA-",
    subtotal: 100,
    total: 100,
    discount: 0,
    cashGiven: 100,
    changeGiven: 0,
    notes: null,
    checkoutFingerprint: "fixture-card",
  }));
  const createdSale = await db.query<{ saleId: number; itemId: number }>(saleStmt.sql, saleStmt.params);
  const { saleId, itemId: saleItemId } = createdSale.rows[0];

  const refundReqId = randomUUID();
  const refundStmt = dialect.sqlToQuery(refundSaleQuery({
    saleId,
    operatorId: 1,
    supervisorId: 2,
    cashShiftId: 1,
    amount: 50,
    note: "Cambio de modelo",
    refundMethod: "card",
    requestId: refundReqId,
    reason: "Cambio de modelo",
    items: [{ id: saleItemId, returnedQuantity: 0, quantity: 1 }],
  }));

  assert.equal((await db.query(refundStmt.sql, refundStmt.params)).rows.length, 1);
  // Segundo intento con el mismo requestId no debe duplicar devolución ni stock
  assert.equal((await db.query(refundStmt.sql, refundStmt.params)).rows.length, 0);

  assert.deepEqual(
    (await db.query("SELECT sale_id, request_id, refund_method, amount FROM sale_refunds")).rows,
    [{ sale_id: saleId, request_id: refundReqId, refund_method: "card", amount: "50.00" }]
  );
  assert.deepEqual((await db.query("SELECT stock FROM products WHERE id = 1")).rows, [{ stock: 4 }]);
  assert.deepEqual((await db.query("SELECT card_sales, expected_cash FROM cash_shifts WHERE id = 1")).rows, [
    { card_sales: "50.00", expected_cash: "0.00" },
  ]);
});

test("product_models.options y products.attributes persisten en JSONB sin pérdida de estructura", async (t) => {
  const db = await createDatabase(t);
  const dialect = new PgDialect();
  const options = [
    productOptionConfigSchema.parse({
      id: "talla",
      name: "Talla",
      type: "text",
      values: [{ name: "M" }, { name: "L" }],
    }),
    productOptionConfigSchema.parse({
      id: "color",
      name: "Color",
      type: "color",
      values: [{ name: "Azul", hex: "#1d4ed8" }],
    }),
  ];
  const attributes = { Talla: "M", Color: "Azul" };
  const base = productDbInsertSchema.parse({
    name: "Chaqueta Técnica",
    price: 350,
    costPrice: 180,
    initialStock: 6,
    modelCode: "CHAQ-TECH",
    variant: "M / Azul",
    variantSelector: "Talla y color",
    variantColor: "#1d4ed8",
    attributes,
  });

  const stmt = dialect.sqlToQuery(
    createCatalogProductsQuery(
      [{ ...base, variantSelector: "Talla y color", options, attributes }],
      1
    )
  );
  await db.query(stmt.sql, stmt.params);

  const modelRows = await db.query<{ code: string; options: typeof options }>(
    "SELECT code, options FROM product_models WHERE code = 'CHAQ-TECH'"
  );
  assert.deepEqual(modelRows.rows, [{ code: "CHAQ-TECH", options }]);

  const prodRows = await db.query<{ attributes: typeof attributes }>(
    "SELECT attributes FROM products WHERE model_code = 'CHAQ-TECH'"
  );
  assert.deepEqual(prodRows.rows, [{ attributes }]);
});

test("las variantes conservan opciones y apertura y solo se eliminan sin historial", async t => {
  const db = await createDatabase(t);
  const dialect = new PgDialect();
  async function run(statement: ReturnType<typeof createCatalogProductsQuery>) {
    const query = dialect.sqlToQuery(statement);
    return (await db.query(query.sql, query.params)).rows;
  }
  const base = productDbInsertSchema.parse({ name: "Polera", modelCode: "POL", variant: "S", price: 80, initialStock: 5 });
  const model = { code: "POL", options: [productOptionConfigSchema.parse({ id: "talla", name: "Talla", type: "text", values: [{ name: "S" }] })], variantSelector: "Talla" };
  await run(createCatalogProductsQuery([{ ...base, options: model.options, variantSelector: "Talla", attributes: { Talla: "S" } }], 1));
  const option = { variant: "M", attributes: { Talla: "M" }, price: 80 };
  assert.throws(() => extendModelOptions(model, [{ ...option, attributes: { Color: "Verde" } }]), /atributos/);
  const options = extendModelOptions(model, [option]);
  const entry = { ...base, variant: "M", attributes: option.attributes, options, sku: "CAM-M", barcode: "200" };
  assert.equal((await run(createCatalogProductsQuery([entry], 1, model))).length, 1);
  const updated = { ...model, options };
  assert.deepEqual((await db.query("SELECT options FROM product_models")).rows, [{ options }]);
  const nextSize = { ...entry, variant: "L", attributes: { Talla: "L" } };
  for (const duplicate of [
    { ...entry, sku: null, barcode: null },
    { ...nextSize, barcode: null, sku: "cam-m" },
    { ...nextSize, sku: null },
  ]) {
    assert.equal((await run(createCatalogProductsQuery([duplicate], 1, updated))).length, 0);
  }
  assert.equal((await db.query("SELECT id FROM inventory_movements")).rows.length, 2);
  await run(deleteUnusedProductQuery(1));
  assert.equal((await db.query("SELECT code FROM product_models")).rows.length, 1);
  await run(deleteUnusedProductQuery(2));
  for (const table of ["products", "inventory_movements", "product_models"]) {
    assert.equal((await db.query(`SELECT * FROM ${table}`)).rows.length, 0);
  }
});

test("una venta, compra, baja u otro movimiento impide borrar y conserva la apertura", async t => {
  const db = await createDatabase(t);
  await db.exec(`
    INSERT INTO products (name, slug, price) SELECT 'Item', 'p' || i, 10 FROM generate_series(1,4) i;
    INSERT INTO inventory_movements (product_id, movement_type, quantity, previous_stock, new_stock, unit_cost, reference_type, user_id)
      SELECT id, 'adjustment_in', 1, 0, 1, 10, 'product_creation', 1 FROM products;
    INSERT INTO sales (sale_number, user_id) VALUES ('V1', 1);
    INSERT INTO sale_items (sale_id,product_id,quantity,unit_price,unit_cost,subtotal) VALUES (1,1,1,10,10,10);
    INSERT INTO suppliers (name) VALUES ('Proveedor');
    INSERT INTO purchases (purchase_number,supplier_id,user_id) VALUES ('C1',1,1);
    INSERT INTO purchase_items (purchase_id,product_id,quantity,unit_cost,subtotal) VALUES (1,2,1,10,10);
    INSERT INTO inventory_adjustments (adjustment_number,reason,user_id) VALUES ('B1','damaged',1);
    INSERT INTO inventory_adjustment_items (adjustment_id,product_id,quantity,unit_cost,subtotal) VALUES (1,3,1,10,10);
    INSERT INTO inventory_movements (product_id,movement_type,quantity,previous_stock,new_stock,unit_cost,reference_type,user_id)
      VALUES (4,'adjustment_in',1,1,2,10,'return',1);
  `);
  for (const id of [1,2,3,4]) {
    const query = new PgDialect().sqlToQuery(deleteUnusedProductQuery(id));
    assert.deepEqual((await db.query(query.sql, query.params)).rows, []);
  }
  assert.equal((await db.query("SELECT id FROM products")).rows.length, 4);
  assert.equal((await db.query("SELECT id FROM inventory_movements")).rows.length, 5);
});

test("modelo base conserva portada y galería separadas de la foto por variante", async (t) => {
  const db = await createDatabase(t);
  const dialect = new PgDialect();
  const baseCover = "/uploads/products/base-cover.webp";
  const baseGallery = ["/uploads/products/gal-1.webp", "/uploads/products/gal-2.webp"];
  const redVariantPhoto = "/uploads/products/variant-rojo.webp";

  const options = [
    productOptionConfigSchema.parse({
      id: "color",
      name: "Color",
      type: "color",
      values: [
        { name: "Rojo", hex: "#EF4444" },
        { name: "Azul", hex: "#3B82F6" },
      ],
    }),
  ];

  const redEntry = {
    ...productDbInsertSchema.parse({
      name: "Gorra Deportiva",
      price: 90,
      costPrice: 45,
      initialStock: 4,
      modelCode: "GORRA-01",
      variant: "Rojo",
      variantSelector: "Color",
      variantColor: "#EF4444",
      mainImage: redVariantPhoto,
      additionalImages: baseGallery,
      attributes: { Color: "Rojo" },
    }),
    variantSelector: "Color",
    options,
    attributes: { Color: "Rojo" },
    modelImageUrl: baseCover,
    modelImages: baseGallery,
  };

  const blueEntry = {
    ...productDbInsertSchema.parse({
      name: "Gorra Deportiva",
      price: 90,
      costPrice: 45,
      initialStock: 6,
      modelCode: "GORRA-01",
      variant: "Azul",
      variantSelector: "Color",
      variantColor: "#3B82F6",
      mainImage: null,
      additionalImages: baseGallery,
      attributes: { Color: "Azul" },
    }),
    variantSelector: "Color",
    options,
    attributes: { Color: "Azul" },
    modelImageUrl: baseCover,
    modelImages: baseGallery,
  };

  const insertStmt = dialect.sqlToQuery(createCatalogProductsQuery([redEntry, blueEntry], 1));
  await db.query(insertStmt.sql, insertStmt.params);

  const modelRows = await db.query<{ image_url: string | null; images: string[] }>(
    "SELECT image_url, images FROM product_models WHERE code = 'GORRA-01'"
  );
  assert.deepEqual(modelRows.rows, [{ image_url: baseCover, images: baseGallery }]);

  const variantRows = await db.query<{ variant: string; image_url: string | null }>(
    "SELECT variant, image_url FROM products WHERE model_code = 'GORRA-01' ORDER BY id"
  );
  assert.deepEqual(variantRows.rows, [
    { variant: "Rojo", image_url: redVariantPhoto },
    { variant: "Azul", image_url: null },
  ]);

  const extendedOptions = extendModelOptions({ options, variantSelector: "Color" }, [
    { variant: "Verde", attributes: { Color: "Verde" }, price: 90, variantColor: "#10B981" },
  ]);
  const greenEntry = {
    ...productDbInsertSchema.parse({
      name: "Gorra Deportiva",
      price: 90,
      costPrice: 45,
      initialStock: 2,
      modelCode: "GORRA-01",
      variant: "Verde",
      variantSelector: "Color",
      variantColor: "#10B981",
      mainImage: null,
      additionalImages: baseGallery,
      attributes: { Color: "Verde" },
    }),
    variantSelector: "Color",
    options: extendedOptions,
    attributes: { Color: "Verde" },
    modelImageUrl: baseCover,
    modelImages: baseGallery,
  };
  const appendStmt = dialect.sqlToQuery(
    createCatalogProductsQuery([greenEntry], 1, { code: "GORRA-01", options })
  );
  await db.query(appendStmt.sql, appendStmt.params);

  const afterModelRows = await db.query<{ image_url: string | null; images: string[] }>(
    "SELECT image_url, images FROM product_models WHERE code = 'GORRA-01'"
  );
  assert.deepEqual(afterModelRows.rows, [{ image_url: baseCover, images: baseGallery }]);
});

test("archivar exige desactivar canales pero conserva historial y permite registrar baja de saldo", async (t) => {
  const db = await createDatabase(t);
  const dialect = new PgDialect();
  await db.exec(
    "INSERT INTO products (name, slug, stock, cost_price, price, is_active, is_visible_web, is_featured, is_archived) VALUES ('Temporada', 'temporada', 4, 25, 50, true, true, false, false)"
  );

  await assert.rejects(
    db.exec("UPDATE products SET is_archived = true WHERE id = 1"),
    /products_archived_inactive/
  );

  await db.exec(
    "UPDATE products SET is_archived = true, is_active = false, is_visible_web = false, is_featured = false WHERE id = 1"
  );
  assert.deepEqual(
    (await db.query("SELECT is_archived, is_active, stock FROM products WHERE id = 1")).rows,
    [{ is_archived: true, is_active: false, stock: 4 }]
  );

  const archivedSaleStmt = dialect.sqlToQuery(
    createSaleQuery({
      sale: saleFormSchema.parse({ items: [{ productId: 1, quantity: 1, unitPrice: 50 }] }),
      operatorId: 1,
      shiftId: null,
      prefix: "VTA-2026-",
      subtotal: 50,
      discount: 0,
      total: 50,
      cashGiven: 50,
      changeGiven: 0,
      notes: null,
    })
  );
  assert.equal((await db.query(archivedSaleStmt.sql, archivedSaleStmt.params)).rows.length, 0);

  const adjStmt = dialect.sqlToQuery(
    inventoryAdjustmentQuery({
      productId: 1,
      quantity: 4,
      reason: "damaged",
      notes: "Cierre de saldo tras archivo",
      userId: 1,
      authorizedByUserId: 1,
      prefix: "BAJA-2026-",
    })
  );
  const adjRes = await db.query<{ newStock: number }>(adjStmt.sql, adjStmt.params);
  assert.equal(adjRes.rows[0]?.newStock, 0);
});

test("cajas físicas: archivar bloquea turnos abiertos y solo se elimina sin historial", async (t) => {
  const db = await createDatabase(t);
  const dialect = new PgDialect();
  await db.exec(`
    INSERT INTO cash_registers (name, code)
    VALUES ('Caja Principal', 'CAJA-A'), ('Caja Errónea', 'CAJA-B');
  `);

  const delUnusedStmt = dialect.sqlToQuery(deleteUnusedCashRegisterQuery(2));
  assert.equal((await db.query(delUnusedStmt.sql, delUnusedStmt.params)).rows.length, 1);

  const openAStmt = dialect.sqlToQuery(
    openShiftQuery({
      cashRegisterId: 1,
      userId: 1,
      initialCash: 100,
      notes: null,
      prefix: "TURNO-2026-",
    })
  );
  assert.equal((await db.query(openAStmt.sql, openAStmt.params)).rows.length, 1);

  const archiveOpenStmt = dialect.sqlToQuery(archiveCashRegisterQuery(1, true));
  assert.equal((await db.query(archiveOpenStmt.sql, archiveOpenStmt.params)).rows.length, 0);

  const delOpenStmt = dialect.sqlToQuery(deleteUnusedCashRegisterQuery(1));
  assert.equal((await db.query(delOpenStmt.sql, delOpenStmt.params)).rows.length, 0);

  await db.exec("UPDATE cash_shifts SET status = 'closed', closed_at = now() WHERE cash_register_id = 1");

  const delUsedStmt = dialect.sqlToQuery(deleteUnusedCashRegisterQuery(1));
  assert.equal((await db.query(delUsedStmt.sql, delUsedStmt.params)).rows.length, 0);

  const archiveClosedStmt = dialect.sqlToQuery(archiveCashRegisterQuery(1, true));
  const archivedRows = (await db.query<{ isActive: boolean }>(archiveClosedStmt.sql, archiveClosedStmt.params)).rows;
  assert.deepEqual(archivedRows.map((r) => r.isActive), [false]);

  assert.equal((await db.query(openAStmt.sql, openAStmt.params)).rows.length, 0);

  const restoreStmt = dialect.sqlToQuery(archiveCashRegisterQuery(1, false));
  const restoredRows = (await db.query<{ isActive: boolean }>(restoreStmt.sql, restoreStmt.params)).rows;
  assert.deepEqual(restoredRows.map((r) => r.isActive), [true]);

  assert.equal((await db.query(openAStmt.sql, openAStmt.params)).rows.length, 1);
});

test("POS multi-caja, devolución cruzada de turno y persistencia de NIT/CI", async (t) => {
  const db = await createDatabase(t);
  const dialect = new PgDialect();
  await db.exec(`
    INSERT INTO cash_registers (name, code) VALUES ('Caja 1', 'CAJA-1'), ('Caja 2', 'CAJA-2');
    INSERT INTO products (name, slug, stock, cost_price, price) VALUES ('Producto Concurrencia', 'producto-concurrencia', 10, 20, 40);
  `);

  for (const [cashRegisterId, userId, initialCash] of [[1, 1, 100], [2, 2, 200]] as const) {
    const openStmt = dialect.sqlToQuery(
      openShiftQuery({ cashRegisterId, userId, initialCash, notes: null, prefix: "TURNO-2026-" })
    );
    assert.equal((await db.query(openStmt.sql, openStmt.params)).rows.length, 1);
  }

  const runSale = async (params: {
    operatorId: number;
    shiftId: number;
    quantity: number;
    customerName: string;
    customerTaxId: string | null;
  }) => {
    const total = params.quantity * 40;
    const stmt = dialect.sqlToQuery(
      createSaleQuery({
        sale: saleFormSchema.parse({
          checkoutRequestId: randomUUID(),
          customerName: params.customerName,
          customerTaxId: params.customerTaxId,
          paymentMethod: "cash",
          cashGiven: total,
          items: [{ productId: 1, quantity: params.quantity, unitPrice: 40 }],
        }),
        operatorId: params.operatorId,
        shiftId: params.shiftId,
        prefix: "VTA-2026-",
        subtotal: total,
        discount: 0,
        total,
        cashGiven: total,
        changeGiven: 0,
        notes: null,
      })
    );
    return (await db.query<{ saleId: number }>(stmt.sql, stmt.params)).rows;
  };

  // Stock insuficiente con NIT no crea cliente huérfano ni descuenta stock
  const rejectedInitial = await runSale({
    operatorId: 2,
    shiftId: 2,
    quantity: 11,
    customerName: "Cliente Rechazado",
    customerTaxId: "NIT-ORPHAN",
  });
  assert.equal(rejectedInitial.length, 0);
  assert.deepEqual((await db.query("SELECT stock FROM products WHERE id = 1")).rows, [{ stock: 10 }]);
  assert.deepEqual((await db.query("SELECT count(*)::integer AS count FROM customers")).rows, [{ count: 0 }]);

  // Caja 1 vende 2 unidades y persiste el NIT/CI en customers
  const sale1Rows = await runSale({
    operatorId: 1,
    shiftId: 1,
    quantity: 2,
    customerName: "Ana Perez",
    customerTaxId: " 99887766 ",
  });
  assert.equal(sale1Rows.length, 1);
  assert.deepEqual((await db.query("SELECT stock FROM products WHERE id = 1")).rows, [{ stock: 8 }]);

  // Caja 2 intenta vender 10 (stock obsoleto) -> rechazado
  const staleSale = await runSale({
    operatorId: 2,
    shiftId: 2,
    quantity: 10,
    customerName: "Otro",
    customerTaxId: null,
  });
  assert.equal(staleSale.length, 0);
  assert.deepEqual((await db.query("SELECT stock FROM products WHERE id = 1")).rows, [{ stock: 8 }]);

  // Caja 2 vende las 8 restantes reutilizando el mismo NIT/CI sin duplicar cliente
  const sale2Rows = await runSale({
    operatorId: 2,
    shiftId: 2,
    quantity: 8,
    customerName: "Ana Perez",
    customerTaxId: "99887766",
  });
  assert.equal(sale2Rows.length, 1);
  assert.deepEqual((await db.query("SELECT stock FROM products WHERE id = 1")).rows, [{ stock: 0 }]);
  assert.deepEqual(
    (await db.query("SELECT name, tax_id FROM customers")).rows,
    [{ name: "Ana Perez", tax_id: "99887766" }]
  );
  assert.deepEqual(
    (await db.query("SELECT customer_id FROM sales ORDER BY id")).rows,
    [{ customer_id: 1 }, { customer_id: 1 }]
  );

  // Cerrar Turno 1 y abrir Turno 3 para probar devolución cruzada de turno sin clamp GREATEST(0, ...)
  await db.exec("UPDATE cash_shifts SET status = 'closed', actual_cash = expected_cash, closed_at = now() WHERE id = 1");
  const openShift3Stmt = dialect.sqlToQuery(
    openShiftQuery({ cashRegisterId: 1, userId: 1, initialCash: 200, notes: null, prefix: "TURNO-2026-" })
  );
  assert.equal((await db.query(openShift3Stmt.sql, openShift3Stmt.params)).rows.length, 1);
  const [shift3] = (await db.query<{ id: number }>("SELECT id FROM cash_shifts WHERE status = 'open' AND user_id = 1")).rows;

  const [sale1Item] = (await db.query<{ id: number }>("SELECT id FROM sale_items WHERE sale_id = $1", [sale1Rows[0].saleId])).rows;
  const cashRefundStmt = dialect.sqlToQuery(
    refundSaleQuery({
      saleId: sale1Rows[0].saleId,
      operatorId: 1,
      supervisorId: 2,
      cashShiftId: shift3.id,
      amount: 40,
      note: "Devolución cruzada en efectivo",
      refundMethod: "cash",
      requestId: randomUUID(),
      items: [{ id: sale1Item.id, returnedQuantity: 0, quantity: 1 }],
    })
  );
  assert.equal((await db.query(cashRefundStmt.sql, cashRefundStmt.params)).rows.length, 1);
  assert.deepEqual((await db.query("SELECT stock FROM products WHERE id = 1")).rows, [{ stock: 1 }]);
  assert.deepEqual(
    (await db.query("SELECT cash_sales, expected_cash FROM cash_shifts WHERE id = $1", [shift3.id])).rows,
    [{ cash_sales: "-40.00", expected_cash: "160.00" }]
  );

  const [sale2Item] = (await db.query<{ id: number }>("SELECT id FROM sale_items WHERE sale_id = $1", [sale2Rows[0].saleId])).rows;
  const qrRefundStmt = dialect.sqlToQuery(
    refundSaleQuery({
      saleId: sale2Rows[0].saleId,
      operatorId: 1,
      supervisorId: 2,
      cashShiftId: shift3.id,
      amount: 40,
      note: "Devolución cruzada por QR",
      refundMethod: "transfer",
      requestId: randomUUID(),
      items: [{ id: sale2Item.id, returnedQuantity: 0, quantity: 1 }],
    })
  );
  assert.equal((await db.query(qrRefundStmt.sql, qrRefundStmt.params)).rows.length, 1);
  assert.deepEqual(
    (await db.query("SELECT cash_sales, transfer_sales, expected_cash FROM cash_shifts WHERE id = $1", [shift3.id])).rows,
    [{ cash_sales: "-40.00", transfer_sales: "-40.00", expected_cash: "160.00" }]
  );
});

test("arqueo directo de supervisor cierra en un paso, exige motivo ante diferencias y no pisa conteos ciegos", async (t) => {
  const db = await createDatabase(t);
  const dialect = new PgDialect();
  await db.exec(`
    INSERT INTO cash_registers (name, code) VALUES ('Caja 1', 'CAJA-1'), ('Caja 2', 'CAJA-2');
  `);

  const runSql = (statement: ReturnType<typeof directCloseShiftQuery>) => {
    const q = dialect.sqlToQuery(statement);
    return db.query<{ id: number }>(q.sql, q.params);
  };

  // Turno 1: abierto por admin/supervisor (userId 1) con fondo 150.00
  assert.equal(
    (await runSql(openShiftQuery({ cashRegisterId: 1, userId: 1, initialCash: 150, notes: null, prefix: "TURNO-2026-" }))).rows.length,
    1
  );

  // Rechaza cierre directo si expectedCash esperado está desactualizado
  assert.equal((await runSql(directCloseShiftQuery(1, 1, "150.00", null, "140.00"))).rows.length, 0);
  // Rechaza diferencia sin motivo
  assert.equal((await runSql(directCloseShiftQuery(1, 1, "145.00", null, "150.00"))).rows.length, 0);
  // Cierra en 1 paso cuando hay diferencia con motivo explicado
  assert.equal((await runSql(directCloseShiftQuery(1, 1, "145.00", "Faltante por sencillo", "150.00"))).rows.length, 1);
  // No permite cerrar dos veces
  assert.equal((await runSql(directCloseShiftQuery(1, 1, "145.00", "Repetido", "150.00"))).rows.length, 0);

  assert.deepEqual(
    (await db.query("SELECT status, expected_cash, actual_cash, difference, closed_by_user_id, notes FROM cash_shifts WHERE id = 1")).rows,
    [{
      status: "closed",
      expected_cash: "150.00",
      actual_cash: "145.00",
      difference: "-5.00",
      closed_by_user_id: 1,
      notes: "Faltante por sencillo",
    }]
  );

  // Turno 2: cajero (userId 2) envía conteo ciego -> cierre directo no debe sobrescribirlo
  assert.equal(
    (await runSql(openShiftQuery({ cashRegisterId: 2, userId: 2, initialCash: 100, notes: null, prefix: "TURNO-2026-" }))).rows.length,
    1
  );
  assert.equal((await runSql(submitCashCountQuery(2, 2, "98.00"))).rows.length, 1);
  assert.equal((await runSql(directCloseShiftQuery(2, 1, "100.00", "Intento directo", "100.00"))).rows.length, 0);

  // Supervisor sí puede aprobar el conteo ciego preservando actual_cash del cajero
  assert.equal((await runSql(approveCashCountQuery(2, 1, "Aprobado con diferencia"))).rows.length, 1);
  assert.deepEqual(
    (await db.query("SELECT status, expected_cash, actual_cash, difference, closed_by_user_id FROM cash_shifts WHERE id = 2")).rows,
    [{ status: "closed", expected_cash: "100.00", actual_cash: "98.00", difference: "-2.00", closed_by_user_id: 1 }]
  );

  // Turno 3: cierre directo exacto sin nota (cuadrado)
  assert.equal(
    (await runSql(openShiftQuery({ cashRegisterId: 1, userId: 1, initialCash: 200, notes: null, prefix: "TURNO-2026-" }))).rows.length,
    1
  );
  assert.equal((await runSql(directCloseShiftQuery(3, 1, "200.00", null, "200.00"))).rows.length, 1);
  assert.deepEqual(
    (await db.query("SELECT status, expected_cash, actual_cash, difference, notes FROM cash_shifts WHERE id = 3")).rows,
    [{ status: "closed", expected_cash: "200.00", actual_cash: "200.00", difference: "0.00", notes: null }]
  );
});

test("reconteo ciego mantiene POS bloqueado, permite edición auditada y concilia QR", async (t) => {
  const db = await createDatabase(t);
  const dialect = new PgDialect();
  await db.exec(`
    INSERT INTO cash_registers (name, code) VALUES ('Caja Principal', 'CAJA-1'), ('Caja Secundaria', 'CAJA-2');
    INSERT INTO products (name, slug, stock, cost_price, price) VALUES ('Producto Test', 'producto-test', 10, 30, 50);
  `);

  const runQ = <T = { id: number }>(stmt: ReturnType<typeof directCloseShiftQuery>) => {
    const q = dialect.sqlToQuery(stmt);
    return db.query<T>(q.sql, q.params);
  };

  // Turno 1: cajero (userId 2) abre con 100, vende 1 unidad en efectivo (50 -> expected 150) y 1 en QR (50)
  assert.equal((await runQ(openShiftQuery({ cashRegisterId: 1, userId: 2, initialCash: 100, notes: null, prefix: "TURNO-2026-" }))).rows.length, 1);
  assert.equal((await runQ(createSaleQuery({
    sale: saleFormSchema.parse({ checkoutRequestId: randomUUID(), paymentMethod: "cash", cashGiven: 50, items: [{ productId: 1, quantity: 1, unitPrice: 50 }] }),
    operatorId: 2, shiftId: 1, prefix: "VTA-2026-", subtotal: 50, discount: 0, total: 50, cashGiven: 50, changeGiven: 0, notes: null,
  }))).rows.length, 1);
  assert.equal((await runQ(createSaleQuery({
    sale: saleFormSchema.parse({ checkoutRequestId: randomUUID(), paymentMethod: "transfer", items: [{ productId: 1, quantity: 1, unitPrice: 50 }] }),
    operatorId: 2, shiftId: 1, prefix: "VTA-2026-", subtotal: 50, discount: 0, total: 50, cashGiven: null, changeGiven: null, notes: null,
  }))).rows.length, 1);

  // Cajero envía conteo ciego erróneo (140)
  assert.equal((await runQ(submitCashCountQuery(1, 2, "140.00"))).rows.length, 1);

  // Supervisor (userId 1) solicita reconteo -> resetea actual_cash, guarda motivo y mantiene POS bloqueado
  assert.equal((await runQ(requestCashRecountQuery(1, 1, "Diferencia de Bs 10 en caja", "Admin"))).rows.length, 1);
  assert.equal((await runQ(createSaleQuery({
    sale: saleFormSchema.parse({ checkoutRequestId: randomUUID(), paymentMethod: "cash", cashGiven: 50, items: [{ productId: 1, quantity: 1, unitPrice: 50 }] }),
    operatorId: 2, shiftId: 1, prefix: "VTA-2026-", subtotal: 50, discount: 0, total: 50, cashGiven: 50, changeGiven: 0, notes: null,
  }))).rows.length, 0);

  // Cajero vuelve a contar a ciegas (145) -> limpia marca de reconteo
  assert.equal((await runQ(submitCashCountQuery(1, 2, "145.00"))).rows.length, 1);

  // Supervisor edita conteo final (145 -> 150) y registra QR verificado con faltante (30 vs 50)
  // Sin observación obligatoria debe fallar aunque efectivo cuadre en 150
  assert.equal(
    (await runQ(approveCashCountQuery(1, 1, null, {
      adjustedActualCash: "150.00",
      actualTransfer: "30.00",
      supervisorName: "Admin",
    }))).rows.length,
    0
  );

  // Con observación obligatoria cierra y guarda trazabilidad completa
  assert.equal(
    (await runQ(approveCashCountQuery(1, 1, "Faltante QR pendiente de abono", {
      adjustedActualCash: "150.00",
      actualTransfer: "30.00",
      supervisorName: "Admin",
    }))).rows.length,
    1
  );

  const [shift1] = (await db.query<{
    status: string;
    actual_cash: string;
    difference: string;
    actual_transfer: string;
    transfer_difference: string;
    recount_reason: string | null;
    notes: string;
  }>("SELECT status, actual_cash, difference, actual_transfer, transfer_difference, recount_reason, notes FROM cash_shifts WHERE id = 1")).rows;
  assert.equal(shift1.status, "closed");
  assert.equal(shift1.actual_cash, "150.00");
  assert.equal(shift1.difference, "0.00");
  assert.equal(shift1.actual_transfer, "30.00");
  assert.equal(shift1.transfer_difference, "-20.00");
  assert.equal(shift1.recount_reason, null);
  assert.match(shift1.notes, /\[Reconteo solicitado por Admin \(conteo previo 140\.00\): Diferencia de Bs 10 en caja\]/);
  assert.match(shift1.notes, /\[Conteo editado por Admin: cajero 145\.00 -> final 150\.00\]/);

  // Turno 2: cierre directo con venta QR y faltante en extracto
  assert.equal((await runQ(openShiftQuery({ cashRegisterId: 2, userId: 1, initialCash: 200, notes: null, prefix: "TURNO-2026-" }))).rows.length, 1);
  assert.equal((await runQ(createSaleQuery({
    sale: saleFormSchema.parse({ checkoutRequestId: randomUUID(), paymentMethod: "transfer", items: [{ productId: 1, quantity: 1, unitPrice: 50 }] }),
    operatorId: 1, shiftId: 2, prefix: "VTA-2026-", subtotal: 50, discount: 0, total: 50, cashGiven: null, changeGiven: null, notes: null,
  }))).rows.length, 1);

  assert.equal((await runQ(directCloseShiftQuery(2, 1, "200.00", null, "200.00", {
    actualTransfer: "40.00", expectedTransfer: "50.00",
  }))).rows.length, 0);
  assert.equal((await runQ(directCloseShiftQuery(2, 1, "200.00", "Transferencia observada", "200.00", {
    actualTransfer: "40.00", expectedTransfer: "50.00",
  }))).rows.length, 1);

  assert.deepEqual(
    (await db.query("SELECT actual_transfer, transfer_difference FROM cash_shifts WHERE id = 2")).rows,
    [{ actual_transfer: "40.00", transfer_difference: "-10.00" }]
  );
});
