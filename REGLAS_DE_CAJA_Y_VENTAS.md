# 🛡️ Reglas de Negocio: Control de Cajas, Turnos y Ventas

Este documento define la normativa operativa y técnica implementada en el sistema para la emisión de ventas, asignación de cajas físicas, control de turnos y segregación de fondos financieros.

---

## 📌 1. Principio Fundamental: Responsabilidad Individual del Dinero

> **Regla de Oro:** Cada centavo en efectivo que ingresa a una gaveta física tiene **un único responsable civil y contable**. No se permite la mezcla de fondos ni el cobro cruzado entre distintos operadores.

---

## 📜 2. Matriz de Reglas Oficiales

### Regla 1: Apertura de Caja Obligatoria para Ventas en Mostrador
* **Norma:** Ningún operador (cajero o administrador) puede emitir ventas en mostrador (*POS físico*) sin haber iniciado formalmente un turno con su **Fondo Inicial de Gaveta**.
* **Propósito:** Sin fondo inicial declarado, es matemáticamente imposible auditar un arqueo de cierre o detectar faltantes/sobrantes de efectivo.
* **Comportamiento del Sistema:** Si un cajero ingresa a la terminal y no tiene un turno abierto asignado a su nombre, la terminal bloquea la posibilidad de cobrar y despliega el diálogo de apertura: *"Ingresa el fondo inicial en gaveta para comenzar a atender"*.

---

### Regla 2: Exclusividad Absoluta de Caja por Cajero
* **Norma:** **El Administrador (ni ningún otro empleado) NO puede cobrar en una caja abierta que pertenezca a otro cajero.**
* **Propósito:** Si el Administrador o un tercero cobra en la caja de *Sofía Cajera*, al final de la jornada el arqueo de Sofía tendrá un descuadre (sobrante o faltante ajeno) del cual Sofía no puede ni debe responsabilizarse.
* **Comportamiento del Sistema:**
  * Cada turno (`cash_shifts`) vincula de forma estricta un `cash_register_id` con un `user_id`.
  * Si el Administrador intenta cobrar en el turno de Sofía, el sistema rechaza la transacción con la advertencia:
    > *"Acceso Denegado: Esta caja física está asignada exclusivamente al turno de Sofía Cajera. Por control de arqueo, no puedes emitir ventas en la gaveta de otro operador."*

---

### Regla 3: Régimen de Ventas del Administrador
Si el Administrador desea emitir una venta, el sistema le habilita **dos caminos formales**:

#### Opción A: Abrir su propia Caja Registradora Física
* Si el Administrador va a estar físicamente en el mostrador cobrando dinero en efectivo en una gaveta:
  * Debe abrir un turno propio en una terminal disponible (ej: *Caja 2 - Rápida*, `POS-02`, o *Caja 3 - Administración*).
  * Ingresa su fondo inicial y responde por su propia gaveta al hacer el arqueo de cierre.

#### Opción B: Venta Administrativa Directa (Sin Gaveta de Mostrador)
* Si el Administrador realiza una venta corporativa, mayorista, por teléfono/WhatsApp, o cuando las cajas físicas están cerradas:
  * El sistema le permite marcar la operación como **`Venta Administrativa Directa`**.
  * **Tratamiento Contable:**
    * `cash_shift_id = NULL` (no contamina el arqueo de ninguna cajera).
    * `user_id = ID_ADMIN` (queda auditado con su nombre y rol).
    * **Descuento de Stock & Kardex:** Se descuenta el inventario y se genera el movimiento `sale_out` exactamente igual que en cualquier venta.
    * **Alerta de Efectivo:** Si la venta administrativa fue cobrada en efectivo físico en mano del Administrador, el reporte del día alerta que ese efectivo está en posesión del Administrador y debe ser ingresado a la caja fuerte central o depositado al banco.
* **Restricción:** Esta modalidad es **exclusiva de roles `admin` y `manager`**. Un rol `cashier` tiene prohibido emitir ventas administrativas directas.

---

## 🗄️ 3. Estructura de Datos y Trazabilidad

| Campo en `sales` | Venta en Caja de Cajero | Venta en Caja de Admin | Venta Administrativa Directa |
| :--- | :--- | :--- | :--- |
| **`channel`** | `pos` | `pos` | `pos` |
| **`cash_shift_id`** | `ID_TURNO_CAJERO` | `ID_TURNO_ADMIN` | `NULL` |
| **`user_id`** | ID del Cajero | ID del Administrador | ID del Administrador |
| **Afecta Arqueo Físico** | Sí (Gaveta del Cajero) | Sí (Gaveta del Admin) | **No** (Va a Cuenta de Administración) |
| **Afecta Inventario/Kardex** | Sí (Resta existencias) | Sí (Resta existencias) | Sí (Resta existencias) |

---

## 📊 4. Consolidación al Cierre de Jornada (Reporte Z)

Al cierre del día, el balance total del negocio se audita en bloques independientes:
1. **Total Cajas Físicas:**
   $$\sum (\text{Efectivo Contado en Arqueos}) + \sum (\text{Tarjetas en Datáfonos de Cajas})$$
2. **Total Ventas Administrativas Directas:**
   $$\sum (\text{Transferencias/QR Bancarios}) + \sum (\text{Efectivo en Mano de Administración})$$
3. **Ingreso Total del Negocio:**
   $$\text{Total Cajas Físicas} + \text{Total Ventas Administrativas}$$
