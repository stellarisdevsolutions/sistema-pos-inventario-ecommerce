import {
  pgTable,
  serial,
  text,
  numeric,
  integer,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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

// Usuarios del sistema con control de acceso por rol
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").default("cashier").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").default(true).notNull(),
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
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sku: text("sku").notNull().unique(),           // Código SKU interno
  barcode: text("barcode").unique(),             // Código de barras para lector POS
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),      // Precio de venta
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull().default("0"), // Costo unitario promedio
  stock: integer("stock").notNull().default(0),                                     // Stock disponible en mano
  minStock: integer("min_stock").notNull().default(5),                             // Umbral mínimo de alerta
  imageUrl: text("image_url"),
  categoryId: integer("category_id").references(() => categories.id),
  brandId: integer("brand_id").references(() => brands.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  expectedCash: numeric("expected_cash", { precision: 12, scale: 2 }).notNull().default("0"), // Fondo + Efectivo
  actualCash: numeric("actual_cash", { precision: 12, scale: 2 }),                             // Conteo físico final
  difference: numeric("difference", { precision: 12, scale: 2 }),                             // Sobrante (+) o Faltante (-)
  status: cashShiftStatusEnum("status").default("open").notNull(),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  notes: text("notes"),
});

/* =========================================================================
   4. COMPRAS Y ENTRADAS DE MERCANCÍA (PURCHASES)
   ========================================================================= */

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
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
});

/* =========================================================================
   5. VENTAS Y FACTURACIÓN POS & WEB (SALES)
   ========================================================================= */

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  saleNumber: text("sale_number").notNull().unique(), // ej: "VTA-1049"
  customerId: integer("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull().default("Público General"),
  cashShiftId: integer("cash_shift_id").references(() => cashShifts.id), // Turno de caja en que se cobró
  userId: integer("user_id").references(() => users.id).notNull(),       // Cajero/vendedor que emitió la venta
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  cashGiven: numeric("cash_given", { precision: 12, scale: 2 }),     // Monto entregado en efectivo
  changeGiven: numeric("change_given", { precision: 12, scale: 2 }), // Cambio / Vuelto
  paymentMethod: paymentMethodEnum("payment_method").default("cash").notNull(),
  status: saleStatusEnum("status").default("completed").notNull(),
  channel: saleChannelEnum("channel").default("pos").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Detalle de ítems cobrados en el ticket de venta
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(), // Precio cobrado
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),   // Costo unitario histórico (para calcular utilidad)
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
});

/* =========================================================================
   6. BAJAS Y AJUSTES DE INVENTARIO (DAÑADOS, DEFECTUOSOS, MERMAS)
   Actas formales que justifican y autorizan el descuento de stock
   ========================================================================= */

export const inventoryAdjustments = pgTable("inventory_adjustments", {
  id: serial("id").primaryKey(),
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
});

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
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
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
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
  product: one(products, {
    fields: [purchaseItems.productId],
    references: [products.id],
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
