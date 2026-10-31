import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

async function runSeed() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString || connectionString.includes("dummy")) {
    console.warn(
      "\n⚠️ [AVISO]: No se ha configurado una conexión real en DATABASE_URL (.env o .env.local)."
    );
    console.warn(
      "Por seguridad y según lo solicitado, no se ejecutará la inserción hasta que vincules tu base de datos Neon DB.\n"
    );
    return;
  }

  console.log("🌱 Conectando a Neon DB para sembrar datos iniciales...");
  const sql = neon(connectionString);
  const db = drizzle(sql, { schema });

  try {
    // 1. Sembrar Usuarios con Roles
    console.log("👤 Insertando usuarios y roles del sistema...");
    const [adminUser, supervisorUser, cashierUser, warehouseUser] = await db
      .insert(schema.users)
      .values([
        {
          name: "Administrador General",
          email: "admin@aurastudio.com",
          passwordHash: "$2b$10$hashedpasswordforadminaurastudio",
          role: "admin",
          phone: "+54 11 9999-0001",
        },
        {
          name: "Martín Supervisor",
          email: "supervisor@aurastudio.com",
          passwordHash: "$2b$10$hashedpasswordforsupervisor",
          role: "manager",
          phone: "+54 11 9999-0002",
        },
        {
          name: "Sofía Cajera",
          email: "cajera@aurastudio.com",
          passwordHash: "$2b$10$hashedpasswordforcashier",
          role: "cashier",
          phone: "+54 11 9999-0003",
        },
        {
          name: "Lucas Almacenero",
          email: "almacen@aurastudio.com",
          passwordHash: "$2b$10$hashedpasswordforwarehouse",
          role: "warehouse",
          phone: "+54 11 9999-0004",
        },
      ])
      .returning();

    // 2. Sembrar Cajas Físicas / Terminales POS (Multi-caja)
    console.log("🖥️ Insertando terminales físicas POS...");
    const [register1] = await db
      .insert(schema.cashRegisters)
      .values([
        {
          name: "Caja Principal 1 - Mostrador",
          code: "POS-01",
          location: "Planta Baja - Salón Principal",
        },
        {
          name: "Caja Secundaria 2 - Rápida",
          code: "POS-02",
          location: "Sector Accesorios",
        },
      ])
      .returning();

    // 3. Sembrar Categorías
    console.log("📂 Insertando categorías...");
    const insertedCategories = await db
      .insert(schema.categories)
      .values([
        {
          name: "Smartphones & Gadgets",
          slug: "smartphones-gadgets",
          description: "Teléfonos inteligentes, tabletas y accesorios móviles",
        },
        {
          name: "Audio & Sonido Pro",
          slug: "audio-sonido-pro",
          description: "Auriculares inalámbricos, altavoces y micrófonos de estudio",
        },
        {
          name: "Gaming & Periféricos",
          slug: "gaming-perifericos",
          description: "Teclados mecánicos, ratones gamer y monitores de alta tasa",
        },
        {
          name: "Accesorios & Wearables",
          slug: "accesorios-wearables",
          description: "Smartwatches, cargadores GaN y cables de alta fidelidad",
        },
      ])
      .returning();

    // 4. Sembrar Marcas
    console.log("🏷️ Insertando marcas...");
    const insertedBrands = await db
      .insert(schema.brands)
      .values([
        { name: "NovaTech Labs", slug: "novatech-labs" },
        { name: "SoundCore Pro", slug: "soundcore-pro" },
        { name: "HyperGear Gaming", slug: "hypergear-gaming" },
        { name: "Apex Devices", slug: "apex-devices" },
      ])
      .returning();

    // 5. Sembrar Proveedores
    console.log("🏭 Insertando proveedores...");
    const insertedSuppliers = await db
      .insert(schema.suppliers)
      .values([
        {
          name: "Distribuidora Tech Global S.A.",
          contactName: "Roberto Gómez",
          taxId: "20485912341",
          email: "pedidos@techglobal.com",
          phone: "+54 11 4455-8899",
          address: "Parque Industrial Norte, Galpón 4",
        },
        {
          name: "Audio & Componentes de Precisión",
          contactName: "Mariana Silva",
          taxId: "20984712093",
          email: "ventas@audioprecision.com",
          phone: "+54 11 5566-2233",
          address: "Av. Corrientes 2450, Piso 3",
        },
        {
          name: "Importadora Gaming Gear",
          contactName: "Alejandro Chen",
          taxId: "20112233445",
          email: "contacto@gaminggear.com",
          phone: "+54 11 7788-9900",
          address: "Zona Franca Almacén B-12",
        },
      ])
      .returning();

    // 6. Sembrar Clientes
    console.log("👥 Insertando clientes...");
    const insertedCustomers = await db
      .insert(schema.customers)
      .values([
        {
          name: "Público General",
          taxId: "00000000",
          email: "mostrador@aura.local",
          phone: "000-000-0000",
          address: "Venta en Mostrador",
        },
        {
          name: "Carlos Mendoza",
          taxId: "45892014",
          email: "carlos.mendoza@email.com",
          phone: "+54 9 11 6543-2198",
          address: "Calle Belgrano 1420",
        },
        {
          name: "Dra. Laura Gómez",
          taxId: "39821094",
          email: "laura.gomez@clinica.org",
          phone: "+54 9 11 9876-5432",
          address: "Av. Santa Fe 3200",
        },
      ])
      .returning();

    // 7. Sembrar Productos
    console.log("📦 Insertando productos...");
    const insertedProducts = await db
      .insert(schema.products)
      .values([
        {
          name: "Auriculares Inalámbricos Pro ANC",
          slug: "auriculares-inalambricos-pro-anc",
          sku: "AUD-PRO-01",
          barcode: "7790012345671",
          description: "Cancelación de ruido activa híbrida con 36 horas de autonomía",
          price: "129.90",
          costPrice: "75.00",
          stock: 42,
          minStock: 10,
          categoryId: insertedCategories[1].id,
          brandId: insertedBrands[1].id,
        },
        {
          name: "Teclado Mecánico RGB Switch Red",
          slug: "teclado-mecanico-rgb-switch-red",
          sku: "GAM-KB-02",
          barcode: "7790012345672",
          description: "Switches lineales silenciosos con retroiluminación per-key",
          price: "89.00",
          costPrice: "48.00",
          stock: 28,
          minStock: 8,
          categoryId: insertedCategories[2].id,
          brandId: insertedBrands[2].id,
        },
        {
          name: "Smartwatch Vitalis Health Band",
          slug: "smartwatch-vitalis-health-band",
          sku: "WRB-SW-03",
          barcode: "7790012345673",
          description: "Sensor cardíaco, oxímetro SpO2 y GPS incorporado",
          price: "149.00",
          costPrice: "82.50",
          stock: 19,
          minStock: 5,
          categoryId: insertedCategories[3].id,
          brandId: insertedBrands[3].id,
        },
        {
          name: "Parlante Bluetooth Resistente IPX7",
          slug: "parlante-bluetooth-resistente-ipx7",
          sku: "AUD-SPK-04",
          barcode: "7790012345674",
          description: "Potencia 25W con refuerzo de bajos y resistencia total al agua",
          price: "59.90",
          costPrice: "32.00",
          stock: 35,
          minStock: 8,
          categoryId: insertedCategories[1].id,
          brandId: insertedBrands[1].id,
        },
        {
          name: "Ratón Ergonómico Inalámbrico Silent",
          slug: "raton-ergonomico-inalambrico-silent",
          sku: "ACC-MOU-05",
          barcode: "7790012345675",
          description: "Conexión Dual 2.4GHz + BT 5.2 con clicks ultra silenciosos",
          price: "34.50",
          costPrice: "18.00",
          stock: 64,
          minStock: 15,
          categoryId: insertedCategories[2].id,
          brandId: insertedBrands[0].id,
        },
        {
          name: "Soporte Articulado de Aluminio para Laptop",
          slug: "soporte-articulado-aluminio-laptop",
          sku: "ACC-STD-06",
          barcode: "7790012345676",
          description: "Estructura plegable reforzada para portátiles de hasta 17 pulgadas",
          price: "45.00",
          costPrice: "22.00",
          stock: 14,
          minStock: 5,
          categoryId: insertedCategories[3].id,
          brandId: insertedBrands[0].id,
        },
      ])
      .returning();

    // 8. Turno de Caja Inicial (Arqueo POS en Terminal 1 con Cajera Sofía)
    console.log("💵 Creando turno de caja inicial...");
    const [shift] = await db
      .insert(schema.cashShifts)
      .values({
        shiftNumber: "TURNO-2026-001",
        cashRegisterId: register1.id,
        userId: cashierUser.id,
        initialCash: "150.00",
        cashSales: "164.40",
        cardSales: "149.00",
        transferSales: "0.00",
        expectedCash: "314.40",
        status: "open",
        notes: "Apertura de turno en Caja 1 asignado a Sofía Cajera",
      })
      .returning();

    // 9. Compra de Mercadería Inicial (Registrada por Lucas Almacenero)
    console.log("📥 Registrando orden de compra con responsable...");
    const [purchase] = await db
      .insert(schema.purchases)
      .values({
        purchaseNumber: "COM-2026-001",
        invoiceNumber: "FAC-88912",
        supplierId: insertedSuppliers[0].id,
        userId: warehouseUser.id,
        subtotal: "1500.00",
        taxAmount: "315.00",
        totalAmount: "1815.00",
        status: "received",
        paymentStatus: "paid",
        paymentMethod: "transfer",
        notes: "Recepción de lote inicial verificado por almacén",
      })
      .returning();

    await db.insert(schema.purchaseItems).values([
      {
        purchaseId: purchase.id,
        productId: insertedProducts[0].id,
        quantity: 20,
        unitCost: "75.00",
        subtotal: "1500.00",
      },
    ]);

    // 10. Venta POS en Mostrador (Atendida por Sofía Cajera en Turno 1)
    console.log("🛒 Registrando venta con cajero asociado...");
    const [sale1] = await db
      .insert(schema.sales)
      .values({
        saleNumber: "VTA-2026-1001",
        customerId: insertedCustomers[0].id,
        customerName: "Público General",
        cashShiftId: shift.id,
        userId: cashierUser.id,
        subtotal: "129.90",
        discountAmount: "0.00",
        taxAmount: "27.28",
        totalAmount: "129.90",
        cashGiven: "150.00",
        changeGiven: "20.10",
        paymentMethod: "cash",
        status: "completed",
        channel: "pos",
        notes: "Venta en mostrador en efectivo cobrada por Sofía",
      })
      .returning();

    await db.insert(schema.saleItems).values({
      saleId: sale1.id,
      productId: insertedProducts[0].id,
      quantity: 1,
      unitPrice: "129.90",
      unitCost: "75.00",
      subtotal: "129.90",
    });

    // 11. Acta Formal de Baja por Producto Dañado (Reporta Lucas, Autoriza Martín Supervisor)
    console.log("⚠️ Registrando acta de baja con usuario y supervisor...");
    const [adjustment] = await db
      .insert(schema.inventoryAdjustments)
      .values({
        adjustmentNumber: "BAJA-2026-001",
        reason: "damaged",
        userId: warehouseUser.id,
        authorizedByUserId: supervisorUser.id,
        totalCost: "75.00",
        notes: "Unidad con altavoz interno roto reportada en control de calidad",
      })
      .returning();

    await db.insert(schema.inventoryAdjustmentItems).values([
      {
        adjustmentId: adjustment.id,
        productId: insertedProducts[0].id,
        quantity: 1,
        unitCost: "75.00",
        subtotal: "75.00",
      },
    ]);

    // 12. Movimientos en Kardex (Auditoría inmutable con Usuario Responsable)
    console.log("📊 Registrando movimientos en Kardex con trazabilidad...");
    await db.insert(schema.inventoryMovements).values([
      {
        productId: insertedProducts[0].id,
        movementType: "purchase_in",
        quantity: 20,
        previousStock: 24,
        newStock: 44,
        unitCost: "75.00",
        referenceType: "purchase",
        referenceId: purchase.id,
        reason: "Ingreso por compra inicial COM-2026-001",
        userId: warehouseUser.id,
      },
      {
        productId: insertedProducts[0].id,
        movementType: "sale_out",
        quantity: -1,
        previousStock: 44,
        newStock: 43,
        unitCost: "75.00",
        referenceType: "sale",
        referenceId: sale1.id,
        reason: "Salida por ticket VTA-2026-1001 cobrado en Caja 1",
        userId: cashierUser.id,
      },
      {
        productId: insertedProducts[0].id,
        movementType: "damaged_out",
        quantity: -1,
        previousStock: 43,
        newStock: 42,
        unitCost: "75.00",
        referenceType: "adjustment",
        referenceId: adjustment.id,
        reason: "Baja por daño autorizada por Martín Supervisor",
        userId: warehouseUser.id,
      },
    ]);

    console.log("\n✅ ¡Seeding completado exitosamente con 15 tablas pobladas y trazabilidad total!\n");
  } catch (error) {
    console.error("❌ Error al sembrar datos:", error);
  }
}

runSeed();
