# 📋 Plan de Construcción del Sistema

> **Enfoque:** *Diseño primero (UI/UX en alta fidelidad)* &rarr; *Funcionalidades y lógica de negocio (Backend & Base de Datos).*

Este documento define la hoja de ruta para construir el sistema de control de inventario, compras, ventas, proveedores y posterior catálogo público tipo e-commerce.

---

## 🎨 FASE 1: Sistema de Diseño y Shell de Navegación (Mobile & Desktop)
*Objetivo: Diseñar el cascarón de la aplicación para que la navegación sea fluida, intuitiva y perfectamente adaptada a teléfonos y pantallas de escritorio.*

1. **Configuración de Identidad Visual:**
   * Paleta de colores sobria, moderna y profesional (modo claro con soporte para modo oscuro).
   * Tipografía limpia, jerarquía de tamaños legibles y espaciados armoniosos.
2. **Layout Shell Responsivo:**
   * **Desktop:** Sidebar lateral colapsable, menú ordenado por categorías, avatar de usuario, barra superior con búsqueda global y acceso rápido.
   * **Mobile:** Barra superior compacta con botón de menú hamburguesa que despliega un cajón lateral suave (`Sheet` de shadcn), con botones táctiles grandes optimizados para usar con una mano.
3. **Indicador de Estado Global:**
   * Notificaciones flotantes (`Sonner`) listas para alertar eventos del sistema.

---

## 🖼️ FASE 2: Prototipado y Diseño de Vistas (Visual First)
*Objetivo: Diseñar todas las pantallas con datos de muestra realistas para validar la experiencia de usuario antes de programar la base de datos.*

### 1. Dashboard Principal (Panel de Control)
* **Desktop:**
  * Tarjetas de métricas clave (KPIs): Total de ventas del día, productos con stock bajo, compras del mes, total de productos en catálogo.
  * Gráfico visual de tendencia de ventas (últimos 7 o 30 días).
  * Lista rápida de productos que requieren reposición urgente.
* **Mobile:**
  * Vista en cascada con métricas sintetizadas y accesos directos rápidos (*"Registrar Venta"*, *"Revisar Stock"*).

### 2. Módulo de Inventario y Catálogo de Productos
* **Desktop:**
  * Tabla de datos interactiva con buscador en vivo, filtro por categoría y filtro por nivel de stock.
  * Badges de estado con colorimetría inteligente: 
    * 🟢 *En Stock* (verde sutil)
    * 🟡 *Bajo Stock* (amarillo/naranja de advertencia)
    * 🔴 *Agotado* (rojo)
* **Mobile:**
  * Transformación automática de tabla a **tarjetas compactas tipo lista** para evitar barras de desplazamiento horizontales incómodas.
* **Componentes de Acción:**
  * Modal/Sheet responsivo para *Nuevo Producto* / *Editar Producto* con vista previa de imagen, SKU, código de barras, precios y niveles de stock.

### 3. Módulo de Ventas y Punto de Venta (POS)
* **Diseño de Caja / POS:**
  * Selector rápido de productos con buscador por nombre o código de barras.
  * Carrito de venta lateral visible con cálculo automático de subtotal, impuestos (opcional) y total.
  * Selector de método de pago (Efectivo, Tarjeta, Transferencia).
* **Comprobante / Ticket:**
  * Modal con el diseño del ticket de venta listo con estilo limpio, preparado para impresión térmica o descarga.

### 4. Módulo de Compras y Proveedores
* **Directorio de Proveedores:**
  * Fichas de proveedores con teléfono, correo y empresa.
* **Registro de Nueva Compra:**
  * Pantalla para ingresar facturas de proveedores: selección de proveedor, fecha, agregador de productos con costo unitario y cantidad adquirida.

### 5. Catálogo Público Web (Vitrina E-commerce)
* **Vista Pública de Productos:**
  * Diseño tipo tienda digital moderna, limpia y minimalista.
  * Barra de categorías y buscador.
  * Grilla de productos con fotografías destacadas, descripción, precio y badge de disponibilidad.
  * Botón directo de consulta rápida (ej. botón de *"Pedir por WhatsApp"* con mensaje predeterminado).
  * 100% Mobile-first para clientes que ingresan desde redes sociales en sus celulares.

---

## ⚡ FASE 3: Lógica de Negocio y Conexión de Base de Datos
*Objetivo: Dar vida a todas las pantallas conectando Neon PostgreSQL y Drizzle ORM.*

1. **Sincronización de Base de Datos:**
   * Ejecución de `pnpm db:push` en Neon.
2. **Server Actions Transaccionales:**
   * `procesarVenta`: Descuenta stock automáticamente de forma atómica.
   * `registrarCompra`: Aumenta stock y actualiza costo de producto.
   * `crearProducto` / `actualizarProducto`: Validaciones con Zod.
3. **Alertas automáticas de Inventario:**
   * Notificación cuando un producto cruce el umbral de `minStock`.

---

## 🚀 FASE 4: Pulido y Despliegue en Vercel
1. Auditoría de accesibilidad, contrastes y rendimiento en dispositivos móviles reales.
2. Configuración de variables de entorno de producción en Vercel.
3. Despliegue continuo con un solo comando o vía GitHub.
