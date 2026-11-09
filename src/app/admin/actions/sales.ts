"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, count, sql, and } from "drizzle-orm";
import { saleFormSchema, type SaleFormInput } from "@/lib/validations/sale";
import { getCurrentUser } from "@/lib/auth/session";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Si se ejecuta fuera de contexto Next.js (tests/scripts), no bloquea
  }
}

export type PosProductItem = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  image: string;
  status: "in_stock" | "low_stock" | "out_of_stock";
};

export type SaleTicketItem = {
  id: number;
  productId: number;
  productName: string;
  productSku: string | null;
  quantity: number;
  returnedQuantity: number;
  returnableQuantity: number;
  unitPrice: number;
  subtotal: number;
};

export type SaleHistoryItem = {
  id: number;
  saleNumber: string;
  customerName: string;
  paymentMethod: "cash" | "card" | "transfer" | "other";
  channel: "pos" | "online";
  status: "completed" | "pending" | "cancelled" | "refunded";
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  refundedAmount?: number;
  netAmount?: number;
  cashGiven: number | null;
  changeGiven: number | null;
  notes: string | null;
  cashierName: string;
  userId: number;
  userRole?: string;
  cashShiftId: number | null;
  cashRegisterName?: string | null;
  shiftNumber?: string | null;
  isAdministrativeSale: boolean;
  createdAt: string;
  rawCreatedAt: string;
  itemsCount: number;
  items: SaleTicketItem[];
};

export type SalesKpiSummary = {
  totalRevenue: number;
  todayRevenue: number;
  totalSalesCount: number;
  averageTicket: number;
  administrativeSalesCount: number;
  administrativeSalesRevenue: number;
  posShiftSalesCount: number;
  posShiftSalesRevenue: number;
};

export type PosShiftItem = {
  id: number;
  shiftNumber: string;
  cashRegisterId: number;
  cashRegisterName: string;
  cashRegisterCode: string;
  userId: number;
  cashierName: string;
  cashierRole: string;
  initialCash: number;
  openedAt: string;
};

export type PosUserItem = {
  id: number;
  name: string;
  role: string;
  email: string;
};

/**
 * 1. Obtiene el catálogo de productos activos para la terminal POS
 */
export async function getPosCatalogAction(): Promise<{
  success: boolean;
  data: PosProductItem[];
  categories: string[];
  error?: string;
}> {
  try {
    const prods = await db.query.products.findMany({
      where: eq(schema.products.isActive, true),
      with: {
        category: true,
      },
      orderBy: (p, { asc }) => [asc(p.name)],
    });

    const categorySet = new Set<string>();

    const formatted: PosProductItem[] = prods.map((p) => {
      const categoryName = p.category?.name || "General";
      categorySet.add(categoryName);

      const stock = p.stock || 0;
      const minStock = p.minStock || 5;

      const status: "in_stock" | "low_stock" | "out_of_stock" =
        stock <= 0 ? "out_of_stock" : stock <= minStock ? "low_stock" : "in_stock";

      return {
        id: p.id,
        name: p.name,
        sku: p.sku || `SKU-${p.id}`,
        barcode: p.barcode || "",
        category: categoryName,
        price: parseFloat(p.price) || 0,
        costPrice: parseFloat(p.costPrice) || 0,
        stock,
        minStock,
        image:
          p.imageUrl ||
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&auto=format&fit=crop&q=80",
        status,
      };
    });

    return {
      success: true,
      data: formatted,
      categories: ["Todas", ...Array.from(categorySet).sort()],
    };
  } catch (error: any) {
    console.error("Error al obtener catálogo POS:", error);
    return {
      success: false,
      data: [],
      categories: ["Todas"],
      error: error.message || "Error al cargar productos de la caja.",
    };
  }
}

/**
 * 2. Obtiene el contexto completo de POS:
 * - Operador seleccionado y usuarios del sistema
 * - Turnos de caja activos y terminales
 * - Turno específico asignado al operador en curso
 */
export async function getPosContextAction(operatorUserId?: number): Promise<{
  success: boolean;
  users: PosUserItem[];
  currentOperator: PosUserItem | null;
  allOpenShifts: PosShiftItem[];
  userShift: PosShiftItem | null;
  error?: string;
}> {
  try {
    const allUsers = await db.query.users.findMany({
      orderBy: (u, { asc }) => [asc(u.id)],
    });

    const activeUsers: PosUserItem[] = allUsers.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
    }));

    const openShifts = await db.query.cashShifts.findMany({
      where: eq(schema.cashShifts.status, "open"),
      with: {
        cashRegister: true,
        user: true,
      },
      orderBy: (s, { desc }) => [desc(s.id)],
    });

    const formattedShifts: PosShiftItem[] = openShifts.map((s) => ({
      id: s.id,
      shiftNumber: s.shiftNumber,
      cashRegisterId: s.cashRegisterId,
      cashRegisterName: s.cashRegister?.name || `Caja #${s.cashRegisterId}`,
      cashRegisterCode: s.cashRegister?.code || "CAJA",
      userId: s.userId,
      cashierName: s.user?.name || "Operador",
      cashierRole: s.user?.role || "cashier",
      initialCash: parseFloat(s.initialCash) || 0,
      openedAt: s.openedAt.toISOString(),
    }));

    // Obtener el operador autenticado desde la sesión del servidor
    const sessionUser = await getCurrentUser();
    const targetUserId = sessionUser?.id || operatorUserId || activeUsers[0]?.id || 1;
    const currentOperator =
      activeUsers.find((u) => u.id === targetUserId) ||
      (sessionUser
        ? { id: sessionUser.id, name: sessionUser.name, role: sessionUser.role, email: sessionUser.email }
        : activeUsers[0]) ||
      null;

    const userShift = currentOperator
      ? formattedShifts.find((s) => s.userId === currentOperator.id) || null
      : null;

    return {
      success: true,
      users: activeUsers,
      currentOperator,
      allOpenShifts: formattedShifts,
      userShift,
    };
  } catch (error: any) {
    console.error("Error al obtener contexto POS:", error);
    return {
      success: false,
      users: [],
      currentOperator: null,
      allOpenShifts: [],
      userShift: null,
      error: error.message || "Error al cargar contexto POS.",
    };
  }
}

/**
 * 2.1 Obtiene el turno de caja abierto actual (compatible hacia atrás)
 */
export async function getActiveCashShiftAction(operatorUserId?: number) {
  try {
    const shifts = await db.query.cashShifts.findMany({
      where: eq(schema.cashShifts.status, "open"),
      with: {
        cashRegister: true,
        user: true,
      },
      orderBy: (s, { desc }) => [desc(s.id)],
    });

    if (shifts.length === 0) return { success: true, data: null };

    // Si se pasa usuario, buscar su turno; sino, el primero abierto
    const shift = operatorUserId
      ? shifts.find((s) => s.userId === operatorUserId) || null
      : shifts[0];

    if (!shift) return { success: true, data: null };

    return {
      success: true,
      data: {
        id: shift.id,
        shiftNumber: shift.shiftNumber,
        cashRegisterId: shift.cashRegisterId,
        cashRegisterName: shift.cashRegister?.name || "Caja Principal",
        cashierName: shift.user?.name || "Cajero en turno",
        userId: shift.userId,
        initialCash: parseFloat(shift.initialCash) || 0,
        openedAt: shift.openedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("Error al obtener turno activo:", error);
    return { success: false, data: null, error: error.message };
  }
}

/**
 * 3. Procesar y registrar una venta de mostrador (POS) o Venta Administrativa
 * Aplica reglas estrictas de control de caja y retail:
 * - Regla 1: Todo cobro de mostrador exige turno de caja abierto
 * - Regla 2: Exclusividad de caja (ningún usuario puede vender en la caja de otro operador)
 * - Regla 3: El Admin debe abrir su propia caja o emitir "Venta Administrativa Directa"
 * - Valida existencias físicas en tiempo real
 * - Descuenta stock y asienta Kardex
 */
export async function createSaleAction(input: SaleFormInput): Promise<{
  success: boolean;
  data?: {
    saleId: number;
    saleNumber: string;
    customerName: string;
    totalAmount: number;
    paymentMethod: string;
    cashGiven: number | null;
    changeGiven: number | null;
    createdAt: string;
    items: SaleTicketItem[];
  };
  error?: string;
}> {
  try {
    const parsed = saleFormSchema.parse(input);

    if (!parsed.items || parsed.items.length === 0) {
      return { success: false, error: "El carrito de venta no contiene productos." };
    }

    // 0. Obtener y validar el usuario operador que ejecuta la venta (prioriza sesión real del servidor)
    const sessionUser = await getCurrentUser();
    const effectiveUserId = sessionUser ? sessionUser.id : parsed.userId;

    const operatingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, effectiveUserId),
    });

    if (!operatingUser) {
      return {
        success: false,
        error: `El usuario operador ID #${effectiveUserId} no existe en el sistema.`,
      };
    }

    let finalShiftId: number | null = null;
    let saleNotes = parsed.notes ? parsed.notes.trim() : null;

    // APLICACIÓN DE REGLAS DE NEGOCIO DE CAJA
    if (parsed.isAdministrativeSale) {
      // Regla 3b: Venta Administrativa Directa (fuera de caja)
      // Solo permitida para perfiles de Admin o Supervisor
      if (operatingUser.role !== "admin" && operatingUser.role !== "manager") {
        return {
          success: false,
          error:
            "Acceso Denegado: Solo administradores y supervisores de tienda están facultados para emitir ventas administrativas directas fuera de caja.",
        };
      }

      finalShiftId = null;
      const adminTag = "[Venta Administrativa Directa]";
      saleNotes = saleNotes ? `${adminTag} ${saleNotes}` : adminTag;
    } else {
      // Regla 1: Venta POS de mostrador exige turno de caja abierto asignado
      if (!parsed.cashShiftId) {
        return {
          success: false,
          error:
            "Control de Caja: No cuentas con un turno de caja abierto. Debes aperturar una caja con tu fondo inicial antes de cobrar en mostrador.",
        };
      }

      const shift = await db.query.cashShifts.findFirst({
        where: eq(schema.cashShifts.id, parsed.cashShiftId),
        with: {
          user: true,
          cashRegister: true,
        },
      });

      if (!shift || shift.status !== "open") {
        return {
          success: false,
          error:
            "El turno de caja seleccionado no existe o ya ha sido cerrado mediante arqueo.",
        };
      }

      // Regla 2: Exclusividad de caja (Anti Cross-Cashier Selling)
      if (shift.userId !== operatingUser.id) {
        const assignedName = shift.user?.name || "otro operador";
        const registerTitle = shift.cashRegister?.name || `Caja #${shift.cashRegisterId}`;
        return {
          success: false,
          error: `Acceso Denegado: La terminal "${registerTitle}" está asignada exclusivamente a "${assignedName}". Por control de arqueo y responsabilidad de fondos, no puedes emitir ventas en la gaveta de otro operador.`,
        };
      }

      finalShiftId = shift.id;
    }

    // 1. Validar existencias físicas en tiempo real para todos los ítems
    const productIds = parsed.items.map((i) => i.productId);
    const dbProducts = await db.query.products.findMany({
      where: (p, { inArray }) => inArray(p.id, productIds),
    });

    const productsMap = new Map(dbProducts.map((p) => [p.id, p]));

    for (const item of parsed.items) {
      const prod = productsMap.get(item.productId);
      if (!prod) {
        return {
          success: false,
          error: `El producto ID #${item.productId} no fue encontrado en la base de datos.`,
        };
      }
      if (prod.stock < item.quantity) {
        return {
          success: false,
          error: `Stock insuficiente para "${prod.name}". Solicitado: ${item.quantity}, Disponible: ${prod.stock}`,
        };
      }
    }

    // 2. Generar número correlativo de venta VTA-YYYY-XXXX
    const countResult = await db.select({ total: count() }).from(schema.sales);
    const nextNumber = (countResult[0]?.total || 0) + 1;
    const year = new Date().getFullYear();
    const saleNumber = `VTA-${year}-${String(nextNumber).padStart(4, "0")}`;

    // 3. Calcular importes totales
    const subtotal = parsed.items.reduce(
      (acc, it) => acc + it.quantity * it.unitPrice,
      0
    );
    const discountAmount = parsed.discountAmount || 0;
    const taxAmount = 0;
    const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);

    let cashGiven = parsed.cashGiven ?? null;
    let changeGiven = parsed.changeGiven ?? null;

    if (parsed.paymentMethod === "cash") {
      const given = cashGiven ?? totalAmount;
      cashGiven = given;
      changeGiven = Math.max(0, given - totalAmount);
    }

    // 4. Insertar cabecera de la venta con el usuario real y shift validado
    const [newSale] = await db
      .insert(schema.sales)
      .values({
        saleNumber,
        customerId: parsed.customerId || null,
        customerName: parsed.customerName || "Público General",
        cashShiftId: finalShiftId,
        userId: operatingUser.id,
        subtotal: subtotal.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        cashGiven: cashGiven !== null ? cashGiven.toFixed(2) : null,
        changeGiven: changeGiven !== null ? changeGiven.toFixed(2) : null,
        paymentMethod: parsed.paymentMethod,
        status: "completed",
        channel: parsed.channel || "pos",
        notes: saleNotes,
      })
      .returning();

    // 5. Insertar ítems, descontar stock físico y asentar en Kardex
    const ticketItems: SaleTicketItem[] = [];

    for (const item of parsed.items) {
      const prod = productsMap.get(item.productId)!;
      const itemSubtotal = item.quantity * item.unitPrice;
      const unitCost = parseFloat(prod.costPrice) || 0;

      const [savedItem] = await db
        .insert(schema.saleItems)
        .values({
          saleId: newSale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          unitCost: unitCost.toFixed(2),
          subtotal: itemSubtotal.toFixed(2),
        })
        .returning();

      ticketItems.push({
        id: savedItem.id,
        productId: item.productId,
        productName: prod.name,
        productSku: prod.sku,
        quantity: item.quantity,
        returnedQuantity: 0,
        returnableQuantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: itemSubtotal,
      });

      // Descuento físico de inventario
      const prevStock = prod.stock;
      const newStock = prevStock - item.quantity;

      await db
        .update(schema.products)
        .set({
          stock: newStock,
          updatedAt: new Date(),
        })
        .where(eq(schema.products.id, item.productId));

      // Asiento oficial inmutable en Kardex
      const movementReason = parsed.isAdministrativeSale
        ? `Venta Administrativa Directa #${saleNumber}`
        : `Venta POS en mostrador #${saleNumber}`;

      await db.insert(schema.inventoryMovements).values({
        productId: item.productId,
        movementType: "sale_out",
        quantity: item.quantity,
        previousStock: prevStock,
        newStock: newStock,
        unitCost: unitCost.toFixed(2),
        referenceType: "sale",
        referenceId: newSale.id,
        reason: movementReason,
        userId: operatingUser.id,
      });
    }

    // 6. Si es una venta vinculada a un turno de caja, sumar al arqueo
    if (finalShiftId) {
      const shift = await db.query.cashShifts.findFirst({
        where: eq(schema.cashShifts.id, finalShiftId),
      });

      if (shift) {
        if (parsed.paymentMethod === "cash") {
          const current = parseFloat(shift.cashSales) || 0;
          await db
            .update(schema.cashShifts)
            .set({
              cashSales: (current + totalAmount).toFixed(2),
              expectedCash: (parseFloat(shift.initialCash) + current + totalAmount).toFixed(2),
            })
            .where(eq(schema.cashShifts.id, finalShiftId));
        } else if (parsed.paymentMethod === "card") {
          const current = parseFloat(shift.cardSales) || 0;
          await db
            .update(schema.cashShifts)
            .set({
              cardSales: (current + totalAmount).toFixed(2),
            })
            .where(eq(schema.cashShifts.id, finalShiftId));
        } else if (parsed.paymentMethod === "transfer") {
          const current = parseFloat(shift.transferSales) || 0;
          await db
            .update(schema.cashShifts)
            .set({
              transferSales: (current + totalAmount).toFixed(2),
            })
            .where(eq(schema.cashShifts.id, finalShiftId));
        }
      }
    }

    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/cajas");

    return {
      success: true,
      data: {
        saleId: newSale.id,
        saleNumber,
        customerName: newSale.customerName,
        totalAmount,
        paymentMethod: parsed.paymentMethod,
        cashGiven,
        changeGiven,
        createdAt: new Date().toLocaleTimeString("es-BO", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        items: ticketItems,
      },
    };
  } catch (error: any) {
    console.error("Error al procesar venta POS:", error);
    return {
      success: false,
      error: error.message || "Error al procesar el cobro de la venta.",
    };
  }
}

/**
 * 4. Obtiene el historial de ventas con filtros y desglose de Cajas vs Ventas Administrativas
 */
export async function getSalesHistoryAction(): Promise<{
  success: boolean;
  data: SaleHistoryItem[];
  kpis: SalesKpiSummary;
  error?: string;
}> {
  try {
    const list = await db.query.sales.findMany({
      with: {
        user: true,
        customer: true,
        cashShift: {
          with: {
            cashRegister: true,
          },
        },
        items: {
          with: {
            product: true,
          },
        },
      },
      orderBy: (s, { desc }) => [desc(s.id)],
    });

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    let totalRevenue = 0;
    let todayRevenue = 0;
    let completedCount = 0;
    let administrativeSalesCount = 0;
    let administrativeSalesRevenue = 0;
    let posShiftSalesCount = 0;
    let posShiftSalesRevenue = 0;

    const formatted: SaleHistoryItem[] = list.map((s) => {
      const totalNum = parseFloat(s.totalAmount) || 0;
      const sDate = new Date(s.createdAt);
      const isToday = sDate.toISOString().split("T")[0] === todayStr;
      const isAdministrative =
        !s.cashShiftId || (s.notes?.includes("[Venta Administrativa Directa]") ?? false);

      const formattedDate = sDate.toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const formattedItems: SaleTicketItem[] = (s.items || []).map((it) => {
        const returnedQty = (it as any).returnedQuantity || 0;
        return {
          id: it.id,
          productId: it.productId,
          productName: it.product?.name || "Producto",
          productSku: it.product?.sku || null,
          quantity: it.quantity,
          returnedQuantity: returnedQty,
          returnableQuantity: Math.max(0, it.quantity - returnedQty),
          unitPrice: parseFloat(it.unitPrice) || 0,
          subtotal: parseFloat(it.subtotal) || 0,
        };
      });

      const totalItemsCount = formattedItems.reduce((acc, i) => acc + i.quantity, 0);
      const totalReturnedAmount = formattedItems.reduce(
        (acc, i) => acc + (i.returnedQuantity * i.unitPrice),
        0
      );
      const netAmount = Math.max(0, totalNum - totalReturnedAmount);

      if (s.status === "completed" || s.status === "refunded") {
        totalRevenue += netAmount;
        completedCount += 1;
        if (isToday) {
          todayRevenue += netAmount;
        }

        if (isAdministrative) {
          administrativeSalesCount += 1;
          administrativeSalesRevenue += netAmount;
        } else {
          posShiftSalesCount += 1;
          posShiftSalesRevenue += netAmount;
        }
      }

      return {
        id: s.id,
        saleNumber: s.saleNumber,
        customerName: s.customerName || "Público General",
        paymentMethod: s.paymentMethod as "cash" | "card" | "transfer" | "other",
        channel: s.channel as "pos" | "online",
        status: s.status as "completed" | "pending" | "cancelled" | "refunded",
        subtotal: parseFloat(s.subtotal) || 0,
        discountAmount: parseFloat(s.discountAmount) || 0,
        taxAmount: parseFloat(s.taxAmount) || 0,
        totalAmount: totalNum,
        refundedAmount: totalReturnedAmount,
        netAmount,
        cashGiven: s.cashGiven ? parseFloat(s.cashGiven) : null,
        changeGiven: s.changeGiven ? parseFloat(s.changeGiven) : null,
        notes: s.notes,
        cashierName: s.user?.name || "Cajero",
        userId: s.userId,
        userRole: s.user?.role,
        cashShiftId: s.cashShiftId,
        cashRegisterName: s.cashShift?.cashRegister?.name || null,
        shiftNumber: s.cashShift?.shiftNumber || null,
        isAdministrativeSale: isAdministrative,
        createdAt: formattedDate,
        rawCreatedAt: s.createdAt.toISOString(),
        itemsCount: totalItemsCount,
        items: formattedItems,
      };
    });

    const averageTicket = completedCount > 0 ? totalRevenue / completedCount : 0;

    return {
      success: true,
      data: formatted,
      kpis: {
        totalRevenue,
        todayRevenue,
        totalSalesCount: completedCount,
        averageTicket,
        administrativeSalesCount,
        administrativeSalesRevenue,
        posShiftSalesCount,
        posShiftSalesRevenue,
      },
    };
  } catch (error: any) {
    console.error("Error al obtener historial de ventas:", error);
    return {
      success: false,
      data: [],
      kpis: {
        totalRevenue: 0,
        todayRevenue: 0,
        totalSalesCount: 0,
        averageTicket: 0,
        administrativeSalesCount: 0,
        administrativeSalesRevenue: 0,
        posShiftSalesCount: 0,
        posShiftSalesRevenue: 0,
      },
      error: error.message || "Error al leer historial de ventas.",
    };
  }
}

/**
 * 5. Anular una venta emitida
 * - Reintegra el stock al inventario
 * - Asienta Kardex (movementType: "return_in")
 * - Cambia estado a "cancelled"
 */
export async function cancelSaleAction(
  saleId: number,
  reason?: string,
  operatorUserId?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionUser = await getCurrentUser();
    const effectiveOperatorId = sessionUser?.id || operatorUserId;

    const sale = await db.query.sales.findFirst({
      where: eq(schema.sales.id, saleId),
      with: {
        items: true,
      },
    });

    if (!sale) {
      return { success: false, error: "La venta no fue encontrada." };
    }

    if (sale.status === "cancelled") {
      return { success: false, error: "Esta venta ya se encuentra anulada." };
    }

    // Validación de Aislamiento de Caja: Un cajero no puede anular ventas de otro cajero / caja
    if (effectiveOperatorId) {
      const operator = await db.query.users.findFirst({
        where: eq(schema.users.id, effectiveOperatorId),
      });

      if (operator && operator.role === "cashier") {
        if (sale.userId !== operator.id) {
          return {
            success: false,
            error: "Acceso Denegado: Como cajero solo puedes anular tickets emitidos en tu propia caja y turno. Esta venta pertenece a otro operador.",
          };
        }
      }
    }

    // 1. Revertir stock de cada producto y registrar en Kardex
    for (const item of sale.items) {
      const prod = await db.query.products.findFirst({
        where: eq(schema.products.id, item.productId),
      });

      if (prod) {
        const prevStock = prod.stock;
        const newStock = prevStock + item.quantity;

        // Sumar stock
        await db
          .update(schema.products)
          .set({
            stock: newStock,
            updatedAt: new Date(),
          })
          .where(eq(schema.products.id, item.productId));

        // Asiento de devolución en Kardex
        const reasonText = reason ? ` - Motivo: ${reason}` : "";
        await db.insert(schema.inventoryMovements).values({
          productId: item.productId,
          movementType: "return_in",
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          unitCost: item.unitCost,
          referenceType: "sale",
          referenceId: sale.id,
          reason: `Anulación de venta #${sale.saleNumber}${reasonText}`,
          userId: effectiveOperatorId || 1,
        });
      }
    }

    // 2. Marcar la venta como anulada
    await db
      .update(schema.sales)
      .set({
        status: "cancelled",
        notes: reason ? `Anulada: ${reason}` : "Venta anulada por el administrador",
      })
      .where(eq(schema.sales.id, saleId));

    // 3. Si estaba asociada a un turno de caja, descontar del balance del turno
    if (sale.cashShiftId) {
      const shift = await db.query.cashShifts.findFirst({
        where: eq(schema.cashShifts.id, sale.cashShiftId),
      });

      if (shift) {
        const saleAmount = parseFloat(sale.totalAmount) || 0;
        if (sale.paymentMethod === "cash") {
          const current = Math.max(0, (parseFloat(shift.cashSales) || 0) - saleAmount);
          await db
            .update(schema.cashShifts)
            .set({
              cashSales: current.toFixed(2),
              expectedCash: (parseFloat(shift.initialCash) + current).toFixed(2),
            })
            .where(eq(schema.cashShifts.id, sale.cashShiftId));
        } else if (sale.paymentMethod === "card") {
          const current = Math.max(0, (parseFloat(shift.cardSales) || 0) - saleAmount);
          await db
            .update(schema.cashShifts)
            .set({ cardSales: current.toFixed(2) })
            .where(eq(schema.cashShifts.id, sale.cashShiftId));
        } else if (sale.paymentMethod === "transfer") {
          const current = Math.max(0, (parseFloat(shift.transferSales) || 0) - saleAmount);
          await db
            .update(schema.cashShifts)
            .set({ transferSales: current.toFixed(2) })
            .where(eq(schema.cashShifts.id, sale.cashShiftId));
        }
      }
    }

    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/cajas");

    return { success: true };
  } catch (error: any) {
    console.error("Error al anular venta:", error);
    return {
      success: false,
      error: error.message || "Error al anular la venta y reponer inventario.",
    };
  }
}

export type RefundItemDetail = {
  saleItemId: number;
  productId: number;
  quantityToRefund: number;
  unitPrice: number;
};

export type RefundSaleItemsInput = {
  saleId: number;
  items: RefundItemDetail[];
  reason: string;
  supervisorPin: string;
  refundMethod: "cash" | "card" | "transfer";
  cashShiftId?: number | null;
  processedByUserId?: number;
};

export type RefundReceiptData = {
  refundNumber: string;
  saleNumber: string;
  customerName: string;
  refundAmount: number;
  refundMethod: string;
  supervisorName: string;
  processedByName: string;
  reason: string;
  createdAt: string;
  returnedItems: {
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
};

/**
 * 6. Procesar Devolución Parcial o Total de Productos sobre una Venta
 * - Valida PIN de autorización de Administrador o Supervisor
 * - Reintegra solo los ítems seleccionados al inventario físico
 * - Asienta en Kardex el movimiento inmutable tipo "return_in"
 * - Actualiza returnedQuantity en saleItems y estado de venta ("refunded")
 * - Si es reembolso en efectivo, descuenta de la gaveta activa (expectedCash)
 * - Emite comprobante / vale de devolución
 */
export async function refundSaleItemsAction(
  input: RefundSaleItemsInput
): Promise<{
  success: boolean;
  data?: RefundReceiptData;
  error?: string;
}> {
  try {
    const cleanPin = input.supervisorPin?.trim();
    if (!cleanPin || cleanPin.length < 4) {
      return { success: false, error: "Debes ingresar un PIN de supervisor de al menos 4 dígitos." };
    }

    // 1. Validar PIN de Administrador o Supervisor activo
    const supervisor = await db.query.users.findFirst({
      where: and(
        eq(schema.users.pin, cleanPin),
        eq(schema.users.isActive, true)
      ),
    });

    if (!supervisor || (supervisor.role !== "admin" && supervisor.role !== "manager")) {
      return {
        success: false,
        error: "Acceso Denegado: PIN de autorización inválido o el usuario no posee rol de Administrador/Supervisor.",
      };
    }

    // 2. Obtener la venta original y sus productos
    const sale = await db.query.sales.findFirst({
      where: eq(schema.sales.id, input.saleId),
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      return { success: false, error: "La venta especificada no existe en la base de datos." };
    }

    if (sale.status === "cancelled") {
      return { success: false, error: "Esta venta ya fue anulada previamente al 100%." };
    }

    // Validación de Aislamiento de Caja: Un cajero no puede procesar devoluciones sobre ventas de otro cajero / caja
    if (input.processedByUserId) {
      const operator = await db.query.users.findFirst({
        where: eq(schema.users.id, input.processedByUserId),
      });

      if (operator && operator.role === "cashier") {
        const isOperatorSale =
          sale.userId === operator.id ||
          (input.cashShiftId && sale.cashShiftId === input.cashShiftId);
        if (!isOperatorSale) {
          return {
            success: false,
            error:
              "Acceso Denegado: Como cajero solo puedes procesar devoluciones de tickets emitidos en tu propia caja y turno activo. Esta venta pertenece a otra caja.",
          };
        }
      }
    }

    // 3. Validar y procesar ítems a devolver
    const validItemsToRefund = input.items.filter((it) => it.quantityToRefund > 0);
    if (validItemsToRefund.length === 0) {
      return {
        success: false,
        error: "Debes seleccionar al menos un producto y una cantidad mayor a cero para devolver.",
      };
    }

    let totalRefundAmount = 0;
    const returnedItemsList: {
      name: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    for (const refundItem of validItemsToRefund) {
      const originalItem = sale.items.find((it) => it.id === refundItem.saleItemId);
      if (!originalItem) {
        return {
          success: false,
          error: `El producto ID #${refundItem.productId} no corresponde a este ticket.`,
        };
      }

      const alreadyReturned = (originalItem as any).returnedQuantity || 0;
      const availableToReturn = originalItem.quantity - alreadyReturned;

      if (refundItem.quantityToRefund > availableToReturn) {
        return {
          success: false,
          error: `No puedes devolver ${refundItem.quantityToRefund} unidades de "${originalItem.product?.name}". Solo quedan ${availableToReturn} disponibles para devolución.`,
        };
      }

      const itemRefundSubtotal = refundItem.quantityToRefund * refundItem.unitPrice;
      totalRefundAmount += itemRefundSubtotal;

      // a. Reintegrar stock al producto en inventario
      const prevStock = originalItem.product?.stock || 0;
      const newStock = prevStock + refundItem.quantityToRefund;

      await db
        .update(schema.products)
        .set({
          stock: newStock,
          updatedAt: new Date(),
        })
        .where(eq(schema.products.id, originalItem.productId));

      // b. Asiento inmutable en Kardex
      await db.insert(schema.inventoryMovements).values({
        productId: originalItem.productId,
        movementType: "return_in",
        quantity: refundItem.quantityToRefund,
        previousStock: prevStock,
        newStock: newStock,
        unitCost: originalItem.unitCost,
        referenceType: "sale",
        referenceId: sale.id,
        reason: `Devolución de cliente ticket #${sale.saleNumber} (${refundItem.quantityToRefund}x ${originalItem.product?.name}) - Motivo: ${input.reason}`,
        userId: supervisor.id,
      });

      // c. Actualizar returnedQuantity en el registro de saleItems
      await db
        .update(schema.saleItems)
        .set({
          returnedQuantity: alreadyReturned + refundItem.quantityToRefund,
        })
        .where(eq(schema.saleItems.id, originalItem.id));

      returnedItemsList.push({
        name: originalItem.product?.name || "Producto",
        quantity: refundItem.quantityToRefund,
        unitPrice: refundItem.unitPrice,
        subtotal: itemRefundSubtotal,
      });
    }

    // 4. Actualizar estado, notas y montos acumulados de la venta
    const cleanReason = input.reason?.trim() || "Devolución de mercancía en mostrador";
    const noteText = `[Devolución Bs ${totalRefundAmount.toFixed(2)} autorizada por ${supervisor.name}: ${cleanReason}]`;
    const updatedNotes = sale.notes ? `${sale.notes} | ${noteText}` : noteText;

    const previousRefunded = parseFloat((sale as any).refundedAmount) || 0;
    const newRefunded = previousRefunded + totalRefundAmount;
    const originalTotal = parseFloat(sale.totalAmount) || 0;
    const newNet = Math.max(0, originalTotal - newRefunded);

    await db
      .update(schema.sales)
      .set({
        status: "refunded",
        refundedAmount: newRefunded.toFixed(2),
        netAmount: newNet.toFixed(2),
        notes: updatedNotes,
      })
      .where(eq(schema.sales.id, sale.id));

    // 5. Si el reembolso es en efectivo, descontar del turno de caja activo correspondiente
    const targetShiftId = input.cashShiftId || sale.cashShiftId;
    if (targetShiftId && input.refundMethod === "cash") {
      const shift = await db.query.cashShifts.findFirst({
        where: eq(schema.cashShifts.id, targetShiftId),
      });

      if (shift && shift.status === "open") {
        const curCash = Math.max(0, (parseFloat(shift.cashSales) || 0) - totalRefundAmount);
        const curExpected = Math.max(0, (parseFloat(shift.expectedCash) || 0) - totalRefundAmount);

        await db
          .update(schema.cashShifts)
          .set({
            cashSales: curCash.toFixed(2),
            expectedCash: curExpected.toFixed(2),
          })
          .where(eq(schema.cashShifts.id, targetShiftId));
      }
    }

    const refundNumber = `DEV-${new Date().getFullYear()}-${String(sale.id).padStart(4, "0")}`;

    safeRevalidatePath("/admin/ventas");
    safeRevalidatePath("/admin/inventario");
    safeRevalidatePath("/admin");
    safeRevalidatePath("/admin/cajas");

    return {
      success: true,
      data: {
        refundNumber,
        saleNumber: sale.saleNumber,
        customerName: sale.customerName || "Público General",
        refundAmount: totalRefundAmount,
        refundMethod: input.refundMethod,
        supervisorName: supervisor.name,
        processedByName: supervisor.name,
        reason: cleanReason,
        createdAt: new Date().toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }),
        returnedItems: returnedItemsList,
      },
    };
  } catch (error: any) {
    console.error("Error al procesar devolución:", error);
    return {
      success: false,
      error: error.message || "Error al procesar la devolución de productos.",
    };
  }
}
