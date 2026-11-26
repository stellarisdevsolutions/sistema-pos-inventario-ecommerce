import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  timestamp,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
  check,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* =========================================================================
   1. ENUMS (ESTADOS Y MÉTODOS DEL SISTEMA POS & INVENTARIO)
   ========================================================================= */

// Roles de usuarios en el sistema
export const userRoleEnum = pgEnum("user_role", [
  "admin",       // Administrador con acceso total a reportes, usuarios y finanzas
  "manager",     // Supervisor de tienda: aprueba arqueos de caja y bajas de stock
  "cashier",     // Cajero: opera turno de caja y emite ventas POS
  "warehouse",   // Almacén / Logística: recepciona compras y gestiona inventario
]);

// Estado de la orden de compra a proveedores
export const purchaseStatusEnum = pgEnum("purchase_status", [
  "pending",     // Pendiente de entrega por el proveedor
  "received",    // Recibida e ingresada a almacén (sumó stock)
  "cancelled",   // Cancelada
]);

// Estado de pago de la compra
export const purchasePaymentStatusEnum = pgEnum("purchase_payment_status", [
  "paid",        // Factura pagada al proveedor
  "pending",     // Pendiente de pago
  "partial",     // Pago parcial
]);

// Estado de la venta en mostrador o tienda online
export const saleStatusEnum = pgEnum("sale_status", [
  "completed",   // Venta completada y cobrada
  "pending",     // Pendiente de pago / apartado
  "cancelled",   // Venta anulada (repone stock)
  "refunded",    // Devolución o reembolso
]);

// Canal de origen de la venta
export const saleChannelEnum = pgEnum("sale_channel", [
  "pos",         // Venta física en mostrador (Caja POS)
  "online",      // Pedido desde el catálogo web
]);

// Método de pago utilizado
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",        // Efectivo
  "card",        // Tarjeta de crédito o débito
  "transfer",    // Transferencia bancaria directa
  "other",       // Otro medio de pago (vales, mixto)
]);

// Tipo de movimiento en el KARDEX de inventario
export const movementTypeEnum = pgEnum("movement_type", [
  "purchase_in",     // Entrada por recepción de compra
  "sale_out",        // Salida por venta emitida
  "adjustment_in",   // Ajuste manual de entrada (conteo físico superior)
  "adjustment_out",  // Ajuste manual de salida (merma / pérdida)
  "return_in",       // Entrada por devolución de cliente
  "damaged_out",     // Salida por producto dañado, defectuoso o vencido
]);

// Causa / Motivo formal de una baja o ajuste de inventario
export const adjustmentReasonEnum = pgEnum("adjustment_reason", [
  "damaged",         // Daño físico en tienda o almacén (rotura, golpe, derrame)
  "defective",       // Defectuoso de fábrica (falla técnica para garantía)
  "expired",         // Producto caducado o vencido
  "loss_theft",      // Merma desconocida o faltante en auditoría física
  "supplier_return", // Devolución autorizada al proveedor (RMA)
  "internal_use",    // Consumo / Uso interno del local (ej. muestras, exhibición)
]);

// Estado del turno / sesión de caja
export const cashShiftStatusEnum = pgEnum("cash_shift_status", [
  "open",        // Turno abierto en atención
  "closed",      // Turno cerrado y arqueado
]);

/* =========================================================================
   2. TABLAS MAESTRAS (USUARIOS, CAJAS, CATÁLOGO, PROVEEDORES, CLIENTES)
   ========================================================================= */

export type ProductOptionValue = {
  name: string;
  hex?: string;
};

export type ProductOptionConfig = {
  id: string;
  name: string;
  type: "text" | "color";
  values: ProductOptionValue[];
};

// Usuarios del sistema con control de acceso por rol
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  pin: text("pin"), // PIN numérico (4-6 dígitos) para autorizaciones rápidas de supervisores en caja
  role: userRoleEnum("role").default("cashier").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").default(true).notNull(),
  sessionVersion: integer("session_version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cajas Físicas / Terminales de Punto de Venta (POS)
// Permite escalar de 1 a N terminales concurrentes
export const cashRegisters = pgTable("cash_registers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                    // ej: "Caja Principal - Mostrador", "Caja 2"
  code: text("code").notNull().unique(),           // ej: "CAJA-01", "CAJA-02"
  location: text("location"),                      // ej: "Salón Principal", "Planta Alta"
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Categorías de productos
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Marcas comerciales
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Proveedores de mercadería
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),                    // Razón Social / Empresa
  contactName: text("contact_name"),             // Persona de contacto
  taxId: text("tax_id"),                         // RFC / CIF / RUT / DNI
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Clientes (Mostrador y Tienda Online)
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Público General"),
  taxId: text("tax_id"),                         // DNI / RFC para ticket fiscal
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Productos y Control de Stock en Mano
export const productModels = pgTable("product_models", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  variantSelector: text("variant_selector"),
  options: jsonb("options").$type<ProductOptionConfig[]>(),
  imageUrl: text("image_url"),
  images: text("images").array().default(sql`'{}'::text[]`).notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  modelCode: text("model_code").references(() => productModels.code),
  variant: text("variant"),
  variantColor: text("variant_color"),
  attributes: jsonb("attributes").$type<Record<string, string>>(),
  importKey: text("import_key").unique(),
  sku: text("sku").unique(),                                                        // Código SKU interno (opcional / nullable)
  barcode: text("barcode").unique(),                                                // Código de barras (opcional / nullable)
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),      // Precio de venta en mostrador y web
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull().default("0"), // Costo Promedio Ponderado (CPP) vigente
  stock: integer("stock").notNull().default(0),                                     // Stock físico disponible en mano
  minStock: integer("min_stock").notNull().default(5),                             // Umbral mínimo de alerta para reorden
  imageUrl: text("image_url"),                                                     // Imagen principal (POS y portada web)
  images: text("images").array().default(sql`'{}'::text[]`).notNull(),             // Galería de imágenes adicionales (tienda online)
  categoryId: integer("category_id").references(() => categories.id),              // Categoría comercial (nullable para "Sin categoría")
  brandId: integer("brand_id").references(() => brands.id),                        // Marca comercial
  supplierId: integer("supplier_id").references(() => suppliers.id),                // Proveedor habitual / por defecto
  isActive: boolean("is_active").default(true).notNull(),                          // Estado operativo maestro (Habilitado en POS)
  isArchived: boolean("is_archived").default(false).notNull(),                     // Retirado a largo plazo del catálogo operativo
  isVisibleWeb: boolean("is_visible_web").default(true).notNull(),                  // Visible en el catálogo de la tienda online
  isFeatured: boolean("is_featured").default(false).notNull(),                      // Destacado en la portada de la tienda web
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("products_model_variant_unique").on(t.modelCode, sql`lower(${t.variant})`),
  check("products_model_variant_pair", sql`(${t.modelCode} IS NULL) = (${t.variant} IS NULL)`),
  check("products_variant_color_valid", sql`${t.variantColor} IS NULL OR (${t.variant} IS NOT NULL AND ${t.variantColor} ~ '^#[0-9A-Fa-f]{6}$')`),
  check("products_archived_inactive", sql`NOT ${t.isArchived} OR (NOT ${t.isActive} AND NOT ${t.isVisibleWeb} AND NOT ${t.isFeatured})`),
  check("products_stock_non_negative", sql`${t.stock} >= 0`),
  check("products_price_non_negative", sql`${t.price} >= 0`),
  check("products_cost_non_negative", sql`${t.costPrice} >= 0`),
]);

/* =========================================================================
   3. TURNOS DE CAJA / ARQUEO POS (CASH SHIFTS)
   Soporta múltiples cajas físicas y registro individual por cajero
   ========================================================================= */

export const cashShifts = pgTable("cash_shifts", {
  id: serial("id").primaryKey(),
  shiftNumber: text("shift_number").notNull().unique(), // ej: "TURNO-2026-001"
  cashRegisterId: integer("cash_register_id").references(() => cashRegisters.id).notNull(), // Caja física utilizada
  userId: integer("user_id").references(() => users.id).notNull(),                           // Cajero que opera el turno
  closedByUserId: integer("closed_by_user_id").references(() => users.id),                   // Supervisor que autoriza cierre
  initialCash: numeric("initial_cash", { precision: 12, scale: 2 }).notNull().default("0"), // Fondo de caja
  cashSales: numeric("cash_sales", { precision: 12, scale: 2 }).notNull().default("0"),     // Ventas en efectivo
  cardSales: numeric("card_sales", { precision: 12, scale: 2 }).notNull().default("0"),     // Ventas con tarjeta
  transferSales: numeric("transfer_sales", { precision: 12, scale: 2 }).notNull().default("0"), // Transferencias
  otherSales: numeric("other_sales", { precision: 12, scale: 2 }).notNull().default("0"),   // Otros medios
  expectedCash: numeric("expected_cash", { precision: 12, scale: 2 }).notNull().default("0"), // Fondo + Efectivo
  actualCash: numeric("actual_cash", { precision: 12, scale: 2 }),                             // Conteo físico final
  difference: numeric("difference", { precision: 12, scale: 2 }),                             // Sobrante (+) o Faltante (-)
  actualTransfer: numeric("actual_transfer", { precision: 12, scale: 2 }),                     // QR verificado en extracto
  transferDifference: numeric("transfer_difference", { precision: 12, scale: 2 }),             // Sobrante (+) o Faltante (-) QR
  actualCard: numeric("actual_card", { precision: 12, scale: 2 }),                             // Tarjeta verificada (oculta mientras SHOW_CARD_PAYMENT = false)
  cardDifference: numeric("card_difference", { precision: 12, scale: 2 }),                     // Sobrante (+) o Faltante (-) tarjeta
  recountRequestedAt: timestamp("recount_requested_at"),                                       // Marca de reconteo ciego solicitado
  recountReason: text("recount_reason"),                                                       // Motivo indicado por el supervisor
  status: cashShiftStatusEnum("status").default("open").notNull(),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  notes: text("notes"),
}, (t) => [
  uniqueIndex("cash_shifts_open_register_unique").on(t.cashRegisterId).where(sql`${t.status} = 'open'`),
  uniqueIndex("cash_shifts_open_operator_unique").on(t.userId).where(sql`${t.status} = 'open'`),
  check("cash_shifts_expected_cash_non_negative", sql`${t.expectedCash} >= 0`),
]);

/* =========================================================================
   4. COMPRAS Y ENTRADAS DE MERCANCÍA (PURCHASES)
   ========================================================================= */

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  requestId: uuid("request_id").unique(),
  purchaseNumber: text("purchase_number").notNull().unique(), // ej: "COM-2026-081"
  invoiceNumber: text("invoice_number"),                      // Factura / Guía del proveedor
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(), // Usuario (almacenero/comprador) que registró la compra
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: purchaseStatusEnum("status").default("received").notNull(),
  paymentStatus: purchasePaymentStatusEnum("payment_status").default("paid").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").default("transfer"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Detalle de productos recibidos en la compra
export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").references(() => purchases.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
}, (t) => [
  check("purchase_items_qty_positive", sql`${t.quantity} > 0`),
]);

export const purchaseReturns = pgTable("purchase_returns", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").references(() => purchases.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  requestId: uuid("request_id").notNull().unique(),
  reason: text("reason").notNull(),
  creditNoteReference: text("credit_note_reference"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("purchase_returns_purchase_idx").on(t.purchaseId),
]);

export const purchaseReturnItems = pgTable("purchase_return_items", {
  id: serial("id").primaryKey(),
  returnId: integer("return_id").references(() => purchaseReturns.id).notNull(),
  purchaseItemId: integer("purchase_item_id").references(() => purchaseItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  originalUnitCost: numeric("original_unit_cost", { precision: 12, scale: 2 }).notNull(),
  inventoryUnitCost: numeric("inventory_unit_cost", { precision: 12, scale: 2 }).notNull(),
}, (t) => [
  uniqueIndex("purchase_return_items_line_unique").on(t.returnId, t.purchaseItemId),
  index("purchase_return_items_purchase_item_idx").on(t.purchaseItemId),
  check("purchase_return_items_positive_quantity", sql`${t.quantity} > 0`),
]);

/* =========================================================================
   5. VENTAS Y FACTURACIÓN POS & WEB (SALES)
   ========================================================================= */

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  checkoutRequestId: uuid("checkout_request_id"),
  checkoutFingerprint: text("checkout_fingerprint"),
  saleNumber: text("sale_number").notNull().unique(), // ej: "VTA-1049"
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull().default("Público General"),
  cashShiftId: integer("cash_shift_id").references(() => cashShifts.id), // Turno de caja en que se cobró
  userId: integer("user_id").references(() => users.id).notNull(),       // Cajero/vendedor que emitió la venta
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  refundedAmount: numeric("refunded_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 12, scale: 2 }),
  cashGiven: numeric("cash_given", { precision: 12, scale: 2 }),     // Monto entregado en efectivo
  changeGiven: numeric("change_given", { precision: 12, scale: 2 }), // Cambio / Vuelto
  paymentMethod: paymentMethodEnum("payment_method").default("cash").notNull(),
  status: saleStatusEnum("status").default("completed").notNull(),
  channel: saleChannelEnum("channel").default("pos").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("sales_operator_checkout_unique").on(t.userId, t.checkoutRequestId),
  check("sales_refunded_bounds", sql`${t.refundedAmount} >= 0 AND ${t.refundedAmount} <= ${t.totalAmount}`),
]);

// Detalle de ítems cobrados en el ticket de venta
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  returnedQuantity: integer("returned_quantity").default(0).notNull(), // Unidades devueltas/reembolsadas
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(), // Precio cobrado
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),   // Costo unitario histórico (para calcular utilidad)
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
}, (t) => [
  check("sale_items_qty_positive", sql`${t.quantity} > 0`),
  check("sale_items_returned_bounds", sql`${t.returnedQuantity} >= 0 AND ${t.returnedQuantity} <= ${t.quantity}`),
]);

// Libro diario de devoluciones de ventas (permite conciliar caja, método y fecha real de devolución)
export const saleRefunds = pgTable("sale_refunds", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  cashShiftId: integer("cash_shift_id").references(() => cashShifts.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  authorizedByUserId: integer("authorized_by_user_id").references(() => users.id).notNull(),
  requestId: uuid("request_id").unique(),
  refundMethod: paymentMethodEnum("refund_method").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("sale_refunds_sale_idx").on(t.saleId),
  index("sale_refunds_created_at_idx").on(t.createdAt),
  index("sale_refunds_cash_shift_idx").on(t.cashShiftId),
  check("sale_refunds_amount_positive", sql`${t.amount} > 0`),
]);

/* =========================================================================
   6. BAJAS Y AJUSTES DE INVENTARIO (DAÑADOS, DEFECTUOSOS, MERMAS)
   Actas formales que justifican y autorizan el descuento de stock
   ========================================================================= */

export const inventoryAdjustments = pgTable("inventory_adjustments", {
  id: serial("id").primaryKey(),
  requestId: uuid("request_id").unique(),
  adjustmentNumber: text("adjustment_number").notNull().unique(), // ej: "BAJA-2026-001"
  reason: adjustmentReasonEnum("reason").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(), // Usuario que reporta la baja/daño
  authorizedByUserId: integer("authorized_by_user_id").references(() => users.id), // Supervisor que autoriza
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull().default("0"), // Valor monetario total de la pérdida
  notes: text("notes"),                                          // Detalle: "Pantalla rota en transporte", "No enciende"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Detalle de ítems dados de baja en el acta
export const inventoryAdjustmentItems = pgTable("inventory_adjustment_items", {
  id: serial("id").primaryKey(),
  adjustmentId: integer("adjustment_id").references(() => inventoryAdjustments.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),                       // Cantidad de unidades dadas de baja
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(), // Costo unitario al momento de la baja
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(), // Pérdida monetaria (quantity * unitCost)
}, (t) => [
  check("inventory_adjustment_items_qty_positive", sql`${t.quantity} > 0`),
]);

/* =========================================================================
   7. KARDEX / AUDITORÍA DE MOVIMIENTOS DE INVENTARIO (INVENTORY MOVEMENTS)
   Libro mayor inmutable: Cada entrada o salida registra una fila aquí
   ========================================================================= */

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  movementType: movementTypeEnum("movement_type").notNull(),
  quantity: integer("quantity").notNull(),                         // Unidades (+ o -)
  previousStock: integer("previous_stock").notNull(),              // Stock antes del movimiento
  newStock: integer("new_stock").notNull(),                        // Stock después del movimiento
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }),    // Costo unitario al momento del movimiento
  referenceType: text("reference_type"),                           // "sale", "purchase", "adjustment"
  referenceId: integer("reference_id"),                            // ID de la venta, compra o baja
  reason: text("reason"),                                          // Motivo u observaciones
  userId: integer("user_id").references(() => users.id),           // Usuario responsable del movimiento
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* =========================================================================
   8. RELACIONES ENTRE TABLAS (DRIZZLE ORM RELATIONS)
   ========================================================================= */

export const usersRelations = relations(users, ({ many }) => ({
  sales: many(sales),
  purchases: many(purchases),
  cashShifts: many(cashShifts),
  adjustments: many(inventoryAdjustments),
  movements: many(inventoryMovements),
}));

export const cashRegistersRelations = relations(cashRegisters, ({ many }) => ({
  shifts: many(cashShifts),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchases: many(purchases),
  products: many(products),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  model: one(productModels, {
    fields: [products.modelCode],
    references: [productModels.code],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  purchaseItems: many(purchaseItems),
  saleItems: many(saleItems),
  adjustmentItems: many(inventoryAdjustmentItems),
  movements: many(inventoryMovements),
}));

export const cashShiftsRelations = relations(cashShifts, ({ one, many }) => ({
  cashRegister: one(cashRegisters, {
    fields: [cashShifts.cashRegisterId],
    references: [cashRegisters.id],
  }),
  user: one(users, {
    fields: [cashShifts.userId],
    references: [users.id],
  }),
  closedByUser: one(users, {
    fields: [cashShifts.closedByUserId],
    references: [users.id],
  }),
  sales: many(sales),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
  user: one(users, {
    fields: [purchases.userId],
    references: [users.id],
  }),
  items: many(purchaseItems),
  returns: many(purchaseReturns),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one, many }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
  product: one(products, {
    fields: [purchaseItems.productId],
    references: [products.id],
  }),
  returns: many(purchaseReturnItems),
}));

export const purchaseReturnsRelations = relations(purchaseReturns, ({ one, many }) => ({
  purchase: one(purchases, {
    fields: [purchaseReturns.purchaseId],
    references: [purchases.id],
  }),
  user: one(users, {
    fields: [purchaseReturns.userId],
    references: [users.id],
  }),
  items: many(purchaseReturnItems),
}));

export const purchaseReturnItemsRelations = relations(purchaseReturnItems, ({ one }) => ({
  purchaseReturn: one(purchaseReturns, {
    fields: [purchaseReturnItems.returnId],
    references: [purchaseReturns.id],
  }),
  purchaseItem: one(purchaseItems, {
    fields: [purchaseReturnItems.purchaseItemId],
    references: [purchaseItems.id],
  }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  cashShift: one(cashShifts, {
    fields: [sales.cashShiftId],
    references: [cashShifts.id],
  }),
  user: one(users, {
    fields: [sales.userId],
    references: [users.id],
  }),
  items: many(saleItems),
  refunds: many(saleRefunds),
}));

export const saleRefundsRelations = relations(saleRefunds, ({ one }) => ({
  sale: one(sales, {
    fields: [saleRefunds.saleId],
    references: [sales.id],
  }),
  cashShift: one(cashShifts, {
    fields: [saleRefunds.cashShiftId],
    references: [cashShifts.id],
  }),
  user: one(users, {
    fields: [saleRefunds.userId],
    references: [users.id],
  }),
  authorizedByUser: one(users, {
    fields: [saleRefunds.authorizedByUserId],
    references: [users.id],
  }),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const inventoryAdjustmentsRelations = relations(inventoryAdjustments, ({ one, many }) => ({
  user: one(users, {
    fields: [inventoryAdjustments.userId],
    references: [users.id],
  }),
  authorizedByUser: one(users, {
    fields: [inventoryAdjustments.authorizedByUserId],
    references: [users.id],
  }),
  items: many(inventoryAdjustmentItems),
}));

export const inventoryAdjustmentItemsRelations = relations(inventoryAdjustmentItems, ({ one }) => ({
  adjustment: one(inventoryAdjustments, {
    fields: [inventoryAdjustmentItems.adjustmentId],
    references: [inventoryAdjustments.id],
  }),
  product: one(products, {
    fields: [inventoryAdjustmentItems.productId],
    references: [products.id],
  }),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  product: one(products, {
    fields: [inventoryMovements.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [inventoryMovements.userId],
    references: [users.id],
  }),
}));
