# 👥 Matriz Oficial de Roles, Permisos y Política de Devoluciones

Este documento define la estructura de permisos por rol para el ERP y las normas estándar de la industria para el tratamiento de **Devoluciones** (tanto de clientes como a proveedores).

---

## 📌 1. Matriz de Roles y Accesos

| Módulo / Capacidad Operativa | 👑 Administrador (`admin`) | 👔 Supervisor (`manager`) | 🏷️ Cajero (`cashier`) | 📦 Almacenero (`warehouse`) |
| :--- | :---: | :---: | :---: | :---: |
| **Terminal de Venta POS** | ✅ Sí (caja propia o venta adm.) | ✅ Sí (caja propia o venta adm.) | ✅ **Exclusivo en su caja asignada** | 👁️ Solo consulta de productos |
| **Venta Administrativa Directa** | ✅ Sí (facturación fuera de caja) | ✅ Sí | 🚫 **Bloqueado por sistema** | 🚫 **Bloqueado por sistema** |
| **Apertura de Turno de Caja** | ✅ En cualquier terminal libre | ✅ En cualquier terminal libre | ✅ En su terminal con fondo inicial | 🚫 Bloqueado |
| **Cierre y Arqueo Ciego** | ✅ Valida conteo y concilia | ✅ Valida conteo y concilia | 🔒 **Declara conteo ciego** | 🚫 Bloqueado |
| **Anulaciones y Devoluciones** | ✅ Autorización directa | ✅ Autorización directa | 🚫 **Requiere clave superior** | 🚫 Bloqueado |
| **Inventario & Kardex** | ✅ Control total, márgenes y costos | ✅ Control total y ajustes | 👁️ Consulta existencias en mostrador | ✅ Ajustes por merma, conteo físico |
| **Compras & Entradas de Stock** | ✅ Registro de facturas y costos | ✅ Supervisión y recepción | 🚫 Sin acceso | ✅ Recepción física de mercancía |
| **Directorio de Proveedores** | ✅ Alta, edición y acuerdos | ✅ Consulta y contacto | 🚫 Sin acceso | 👁️ Consulta de contacto |

---

## 🔄 2. ¿Cómo se Gestionan las Devoluciones en la Industria?

En el comercio y los sistemas ERP modernos existen dos tipos de devoluciones claramente diferenciadas:

### A. Devolución de Cliente (Devolución sobre Venta)
Ocurre cuando un cliente compró un producto en mostrador y regresa a la tienda a solicitar cambio o reembolso (por falla de fábrica, talla incorrecta, insatisfacción, etc.).

#### 1. Regla Antifraude (Custodia Dual)
* **Principio:** Un cajero **nunca** debe poder procesar una devolución o anulación por su cuenta. 
* **Razón:** En el retail tradicional, si un cajero tiene permiso libre de devolución, puede generar "devoluciones fantasma" (anular un ticket cobrado en efectivo cuando el cliente ya se fue y guardarse el dinero en el bolsillo).
* **Solución en el sistema:** Toda devolución o anulación exige la intervención o clave del **Administrador o Supervisor**.

#### 2. Impacto Contable y en Inventario
* **En el Inventario (Kardex):**
  * El producto devuelto se reintegra al inventario disponible.
  * Se genera automáticamente un movimiento inmutable de Kardex con tipo `return_in` vinculado al ticket original.
* **En la Caja Física:**
  * Si se hace un **reembolso en efectivo**: el dinero sale de la gaveta de la caja activa. El sistema resta el monto devuelto del balance del turno (`cashSales` y `expectedCash`). Al hacer el arqueo final, el sistema sabe exactamente que ese dinero fue devuelto al cliente y el cuadre es perfecto.
  * Si se hace un **cambio de producto** (mismo valor o abonando diferencia): se emite el ticket con la permuta correspondiente.
  * Si se anula la venta completa: la venta cambia a estado `cancelled` con nota del motivo de anulación.

---

### B. Devolución a Proveedor (Devolución sobre Compra)
Ocurre cuando la empresa compró mercadería a un proveedor y detecta productos vencidos, dañados en el flete o mercadería que no coincide con la orden de compra.

#### Impacto en el Sistema:
1. **En el Inventario (Kardex):**
   * Se genera un asiento de salida de mercancía por devolución (`purchase_return_out` o `damage_out`).
   * Se descuenta el stock de las existencias físicas.
2. **En la Cuenta del Proveedor:**
   * Si la compra estaba a crédito: se reduce la cuenta por pagar al proveedor mediante una **Nota de Crédito**.
   * Si la compra ya estaba pagada: el proveedor repone producto en la siguiente entrega o transfiere el reembolso a la cuenta bancaria de la empresa.

---

## 📊 3. Resumen de Estados de una Venta

* `completed`: Venta cobrada y mercadería entregada al cliente.
* `cancelled`: Venta anulada en su totalidad con restitución automática de existencias al Kardex (`return_in`) y compensación del turno de caja.
* `refunded`: Devolución parcial o total con reembolso financiero formal.
