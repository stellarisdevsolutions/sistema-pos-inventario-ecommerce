# Operación Diaria: POS, Compras, Cajas, Inventario y Producción

Guía operativa rápida de cada módulo administrativo, las reglas de negocio que aplica el servidor y los requisitos de despliegue en producción.

---

## 1. Punto de Venta (`/admin/ventas`)

El módulo POS opera sobre productos con `isActive = true` y stock disponible (`stock >= cantidad`).

### Búsqueda y selección de variantes
1. **Escaneo con pistola lectora o búsqueda exacta por SKU:**
   - Al escribir o escanear un **código de barras** o **SKU** exacto y presionar `Enter`, el sistema agrega directamente al carrito la variante exacta en 1 paso.
2. **Cuadrícula visual agrupada por modelo:**
   - Cuando un modelo tiene más de 1 variante activa, la cuadrícula muestra **una sola tarjeta agrupada** con el rango de precios, el stock total sumado del modelo y el badge `{N} variantes`.
   - Al pulsar la tarjeta se abre el **modal selector de variante**, mostrando miniatura (`ProductThumbnail`), cuadro de color redondeado, nombre de la variante, SKU, stock disponible y cuántas unidades ya están en el carrito.
   - Si el producto es único (o solo tiene 1 variante activa), se agrega directamente con 1 clic.

### Turno de caja vs. Venta administrativa, cobro y devoluciones
- **Modalidad de venta:** Un cajero opera sobre su turno de caja abierto (`cashShiftId`). Administradores y gerentes también pueden emitir una venta administrativa directa sin turno de caja cuando corresponda (`isAdministrativeSale`).
- **Idempotencia en cobro:** Cada cobro envía un `checkoutRequestId` único y se protege en BD (`ON CONFLICT (user_id, checkout_request_id)`), evitando cobros duplicados ante microcortes de red o doble clic.
- **Impresión de ticket:** Usa el texto autoderivado `variant` junto al nombre del producto e imprime montos en `Bs`.
- **Anulaciones y devoluciones:**
  - **Anulación total:** Solo disponible si la venta está `completed`, sin devoluciones parciales previas y (si fue en efectivo sobre un turno abierto) mientras el turno no haya cerrado y tenga efectivo esperado suficiente. Repone stock en Kárdex (`return_in`).
  - **Devolución parcial o total (`sale_refunds`):** Requiere autorización mediante **PIN de supervisor** (con límite de 5 intentos fallidos cada 15 minutos por seguridad), prorratea descuentos de forma exacta, registra el reintegro de stock (`return_in`) y descuenta del turno correspondiente.

---

## 2. Compras, CPP, Anulaciones y Devoluciones (`/admin/compras`)

Al registrar una compra en `/admin/compras/nueva` (roles `admin`, `manager`, `warehouse`):
- Solo puedes seleccionar **productos activos (`isActive = true`)** y **proveedores activos**.
- Si el estado es **`received`** (recibida), [`createPurchaseQuery`](../src/db/operations/purchases.ts) bloquea las filas de producto con `FOR UPDATE`, suma el stock ingresado, registra el movimiento `purchase_in` en el Kárdex y recalcula automáticamente el **Costo Promedio Ponderado (CPP)**:
  $$\text{Nuevo CPP} = \frac{(\text{stock actual} \times \text{CPP actual}) + (\text{cantidad} \times \text{costo unitario})}{\text{stock actual} + \text{cantidad}}$$
- **Anulación de compra (`cancelPurchaseQuery`):** Solo se permite si no existen devoluciones previas sobre esa compra y si el stock actual de cada ítem sigue siendo mayor o igual a la cantidad comprada (es decir, no se ha vendido todavía). Recalcula el CPP inverso y asienta `adjustment_out` en el Kárdex.
- **Devolución a proveedor (`returnPurchaseQuery`):** Permite devolver unidades específicas de una compra recibida con referencia de nota de crédito, descontando stock disponible e insertando la salida correspondiente (`purchase_return`).

---

## 3. Cajas y Arqueo (`/admin/cajas`)

- **Un turno abierto por caja:** La base de datos garantiza mediante índice único que una caja física no puede tener más de un turno abierto al mismo tiempo.
- **Flujo de turno:**
  1. **Apertura:** Se registra el fondo inicial en efectivo (`initialCash`).
  2. **Operación:** Cada venta y devolución del turno actualiza automáticamente `cash_sales`, `card_sales`, `transfer_sales`, `other_sales` y `expected_cash`.
  3. **Envío de conteo / Cierre:** El cajero ingresa el efectivo contado (`actualCash`); la diferencia se clasifica en `balanced` (cuadrado), `surplus` (sobrante) o `shortage` (faltante).
  4. **Aprobación:** Un supervisor (`admin` o `manager`) revisa y aprueba el cierre definitivo del turno.

---

## 4. Inventario, Kárdex, Bajas y Excel (`/admin/inventario`)

- **Vista plana por SKU:** La tabla de inventario lista cada variante física de forma individual para auditar exactamente su SKU, código de barras, precio, CPP, stock y estado (`Activo` / `Archivado`).
- **Inspector lateral (`ProductDetailSheet`):** Muestra resumen de precios, margen, stock actual vs. mínimo, historial rápido de Kárdex del SKU, y los botones de **Editar**, **Archivar / Reactivar** y **Eliminar producto** (este último solo cuando no existe historial comercial).
- **Importación y exportación Excel:** Permite exportar el catálogo y realizar cargas masivas estructuradas desde `/admin/inventario`.
- **Movimientos de Kárdex visibles (`getProductKardexAction`):**
  - `Apertura Inicial` (`ALTA-#ID` al crear con stock inicial)
  - `Recepción de Compra` (`purchase_in`)
  - `Salida por Venta` (`sale_out`)
  - `Devolución Cliente` (`return_in`)
  - `Devolución a proveedor` (`purchase_return`)
  - `Anulación de Compra` (`adjustment_out`)
  - `Baja por Merma` (`damaged_out` desde acta `BAJA-YYYY-XXXX`)
  - `Ajuste de Entrada (+)` / `Ajuste de Salida (-)`

---

## 5. Checklist de Puesta en Producción

Antes de desplegar el sistema para operación real, verifica estos puntos basados en [`src/proxy.ts`](../src/proxy.ts), [`.env.example`](../.env.example) y [`src/app/admin/actions/upload.ts`](../src/app/admin/actions/upload.ts):

1. **Variables de entorno obligatorias:**
   - `DATABASE_URL`: cadena de conexión PostgreSQL con SSL (`?sslmode=require`).
   - `SESSION_SECRET`: clave HMAC-SHA256 aleatoria de al menos 32 bytes / 64 caracteres hex (`openssl rand -hex 32`).
   - `ENABLE_DEMO_LOGIN=0`: **obligatorio en `0`** en producción para desactivar botones y credenciales de demostración en `/portal`.
   - `SUPERVISOR_PIN_SECRET` *(opcional)*: secreto dedicado para firmas/verificación de PIN de supervisor.
2. **Usuarios y PINs reales:** Crea los operadores reales desde `/admin/usuarios`, cambia contraseñas por defecto y asigna PINs de supervisor únicamente a quienes autorizan devoluciones.
3. **Almacenamiento de imágenes subidas (`/uploads/`):**
   - Actualmente las imágenes optimizadas a `.webp` se guardan localmente en `public/uploads/products/` y `public/uploads/categories/`.
   - En un **VPS o servidor con disco persistente**, asegúrate de conservar/respaldar la carpeta `public/uploads`.
   - En **hosting serverless efímero** (como Vercel sin volumen persistente), las imágenes subidas localmente se pierden al redesplegar; en ese escenario se recomienda conectar un almacenamiento de objetos persistente (por ejemplo Vercel Blob o S3) o usar URLs `https://` externas mientras tanto.
