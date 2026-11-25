# Documentación del Sistema (POS, Inventario, Compras y Tienda Online)

Guía práctica y técnica de operación del sistema web desarrollado con **Next.js App Router**, **PostgreSQL** y **Drizzle ORM**, con moneda configurada por defecto en **Bolivianos (`Bs`)** para el Panel Administrativo (`/admin/*`) y la Tienda Online (`/`, `/catalogo`, `/producto/[slug]`).

---

## 1. Índice de Guías

| Documento | Qué resuelve | Audiencia |
| :--- | :--- | :--- |
| [01-productos-eliminar-vs-archivar.md](./01-productos-eliminar-vs-archivar.md) | Alta de productos, **Stock Inicial vs. Compras**, Costo Promedio (CPP), Kárdex, **cuándo se puede eliminar físicamente y cuándo archivar**, impacto en caja/reportes y qué hacer si `stock > 0`. | Administradores, Gerencia y Almacén |
| [02-variantes-y-migracion.md](./02-variantes-y-migracion.md) | Modos de variante (`Color`, `Texto`, `Combinado`), regla estricta de integridad del modelo, cómo agregar variantes hermanas y **cómo migrar paso a paso de un tipo de variante a otro** (ej. de solo `Color` a `Combinado`) con o sin stock restante. | Administradores, Gerencia y Almacén |
| [03-operacion-diaria-pos-compras-cajas.md](./03-operacion-diaria-pos-compras-cajas.md) | Operación diaria del **POS** (pistola lectora vs. tarjetas agrupadas por modelo), **Turnos de Caja y Arqueo**, **Compras y Devoluciones**, **Bajas/Mermas**, Excel, Reportes y **Checklist de Producción**. | Cajeros, Almacén, Supervisores y Soporte |
| [ARQUITECTURA_VARIANTES.md](./ARQUITECTURA_VARIANTES.md) | Arquitectura interna de `product_models` + `products` (`jsonb`), constructor de variantes, lifecycle y agrupación en POS. | Desarrollo / Mantenimiento Técnico |

---

## 2. Módulos y Permisos por Rol

El acceso a cada ruta del panel administrativo está validado tanto en el proxy de bordes ([`src/proxy.ts`](../src/proxy.ts)) como en cada Server Action del servidor:

| Ruta | Descripción | `admin` | `manager` | `cashier` | `warehouse` |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `/admin` | Resumen general (KPIs) | ✅ | ✅ | ❌ | ❌ |
| `/admin/ventas` | Punto de Venta (POS), historial, anulaciones y devoluciones | ✅ | ✅ | ✅ *(Inicio)* | ❌ |
| `/admin/cajas` | Apertura de turnos, envío de conteo y arqueos | ✅ | ✅ | ✅ | ❌ |
| `/admin/inventario` | Catálogo SKU, altas, edición, archivo/borrado, Kárdex, bajas y Excel | ✅ | ✅ | ❌ | ✅ *(Inicio)* |
| `/admin/compras` | Recepción de compras, anulación y devoluciones a proveedor | ✅ | ✅ | ❌ | ✅ |
| `/admin/proveedores` | Directorio y gestión de proveedores | ✅ | ✅ | ❌ | ✅ |
| `/admin/reportes` | Reporte Z / Cierre diario consolidado | ✅ | ✅ | ❌ | ❌ |
| `/admin/analitica` | Analítica por rango de fechas, márgenes y rendimiento | ✅ | ✅ | ❌ | ❌ |
| `/admin/usuarios` | Gestión de operadores, roles y PIN de supervisor | ✅ | ❌ | ❌ | ❌ |

> **Nota para tienda pública:** Las rutas `/`, `/catalogo` y `/producto/[slug]` son públicas y muestran únicamente productos con `isActive = true` y `isVisibleWeb = true`.

---

## 3. Las 5 Reglas de Oro Operativas

1. **Stock Inicial solo para inventario preexistente:** Usa **Stock Inicial** únicamente al cargar mercadería que ya tenías antes de usar el sistema. Toda mercadería comprada después debe crearse con `Stock = 0` y entrar por **Compras** ([`/admin/compras/nueva`](./03-operacion-diaria-pos-compras-cajas.md#2-compras-cpp-anulaciones-y-devoluciones)).
2. **Nunca se borran productos con historia comercial:** Si una variante tiene ventas, compras, bajas o movimientos de Kárdex posteriores a su apertura, el sistema bloquea su eliminación física. En su lugar debes **Archivar**.
3. **Vaciar stock antes de archivar:** Antes de archivar una variante con `stock > 0`, agótala vendiéndola (si está apta) o registra una **Baja / Merma** formal (si está dañada, vencida o perdida) para no dejar valor fantasma en almacén.
4. **Un modelo = una misma estructura de atributos:** Todas las variantes bajo un mismo `product_models` comparten exactamente los mismos atributos (ej. todas `Color`, o todas `Color + Talla`). No se pueden mezclar tipos dentro del mismo modelo.
5. **Para cambiar de tipo de variante, se migra creando un modelo nuevo:** Si un producto antes era solo `Color` y ahora llega con `Color + Talla`, nunca fuerces la estructura del viejo; archiva el modelo viejo cuando su stock llegue a `0` y crea el lote nuevo con el tipo `Combinado`.
