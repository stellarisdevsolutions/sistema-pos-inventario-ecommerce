# Auditoría del panel de administración

## Hallazgos y correcciones

| Módulo | Corrección aplicada | Riesgo pendiente |
| --- | --- | --- |
| Portal, sesión y roles | Las credenciales de demostración funcionan en `dev:demo` y en el despliegue de pruebas de `main` en Vercel. En una instalación real de Vercel, `ENABLE_DEMO_LOGIN=0` oculta el selector y deshabilita la validación de credenciales heredadas. Retiré la clave fija de contingencia de sesión. El token contiene únicamente identificador, rol y datos técnicos. Cada acción protegida comprueba en la base el estado y rol de la cuenta. El formulario de acceso se entrega en el HTML inicial. | Limitar intentos de inicio de sesión y de PIN en un almacén compartido, con métricas y alertas. Las sesiones previas quedan invalidadas. |
| Panel general | Los cortes mensuales usan la fecha comercial de Bolivia y las ventas parcialmente devueltas contribuyen con su importe neto. | Medir consultas con volumen real y agregar paginación o agregación SQL donde corresponda. |
| Ventas POS | La identidad sale de la sesión. El servidor valida productos, precios, descuentos, efectivo y pertenencia del turno. Cobro, anulación y devolución cambian ticket, stock, Kardex y caja en una sola operación de PostgreSQL. El reembolso se prorratea sobre lo cobrado, se valida contra el saldo y requiere PIN. | Añadir claves de idempotencia para el cobro ante reintentos de clientes. Registrar cada reembolso en una entidad con identificador, fecha, medio y operador para su propia conciliación y auditoría. |
| Cajas | Protegí apertura, cierre y consulta de tickets. El servidor registra quién cerró el turno y comprueba si el saldo cambió antes de guardar el arqueo. La migración añade unicidad para turnos abiertos por caja y por operador. | El flujo actual muestra importes antes del conteo. Hace falta un flujo separado de declaración ciega y conciliación supervisada para cumplir esa política. |
| Inventario y Kardex | Protegí categorías y cargas. La baja registra acta, detalle, stock y Kardex juntos, sin atribuir una autorización a una persona que no intervino. La tienda respeta la visibilidad web. | La creación de un producto con stock de apertura todavía tiene escrituras separadas. Las cargas usan disco local y validan tamaño y cabecera del archivo. En despliegue distribuido falta almacenamiento compartido y decodificación de imagen en servidor. |
| Compras | Alta y anulación actualizan compra, existencias y Kardex como una sola operación. La recepción calcula el costo promedio ponderado y la anulación exige existencias suficientes. | Definir la valoración al devolver mercancía tras movimientos posteriores, la nota de crédito y la conciliación del pago. La anulación conserva el costo promedio vigente. |
| Proveedores | La eliminación y la desvinculación de productos son atómicas. La clave foránea conserva la protección frente a compras concurrentes. | Paginar directorio e historial con volumen de producción. |
| Reporte Z y analítica | Cortes de día y agrupaciones consistentes en Bolivia. El período analítico se valida y acota a 366 días. | Los reembolsos siguen asociados a la fecha del ticket original. El registro por evento permitirá conciliar el día del reembolso y medio de pago. |
| Usuarios | Edición parcial validada, rechazo de auto-desactivación o degradación y PIN fuera de respuestas y formularios. Los PIN nuevos usan HMAC con clave privada. | Restablecer los PIN anteriores. Mantener una política para el último administrador y probar cambios de permisos con cuentas dedicadas. |
| Dependencias | Next.js y eslint-config-next subieron a 16.4.5. Los siete avisos moderados de Next.js dejaron de aparecer en el informe de pnpm. | Quedan dos avisos moderados transitivos en herramientas de desarrollo, esbuild vía Drizzle Kit y minimatch vía ESLint. |

## Antes de desplegar

Consulta la [guía de instalación](INSTALACION.md) para arrancar la demostración y preparar producción.

1. Configura `SESSION_SECRET` como secreto del entorno con al menos 32 bytes aleatorios. Usa una clave estable por entorno. `SUPERVISOR_PIN_SECRET` permite proteger PIN con una clave independiente.
2. Rotar las credenciales de demostración y restablecer las contraseñas de cuentas con formatos heredados. Una consulta de solo lectura encontró tres cuentas activas con formato heredado. Había una cuenta administrativa activa con formato PBKDF2. El conteo distingue formatos y no confirma la calidad ni disponibilidad de la contraseña. Los dos PIN heredados identificados deben configurarse de nuevo.
3. Revisar la migración `0001_unique_open_cash_shifts.sql` en una copia de la base. Neon ya tiene un esquema y carece del historial de Drizzle consultado. Establecer primero la línea base y aplicar la migración incremental mediante el procedimiento del proyecto. Se comprobaron cero duplicados de turno abierto y cero índices nuevos en la base conectada.
4. Ejecutar `pnpm test`, `pnpm build` y `pnpm test:http` antes de publicar. Para HTTP, levantar el artefacto con `pnpm start` e indicar su URL en `AUDIT_BASE_URL` si usa otro puerto.

Las pruebas automatizadas ejercitan reglas y acciones reales. Las mutaciones de base se verifican con PostgreSQL aislado mediante PGlite. Neon se consultó en modo de solo lectura. Quedan por probar el acceso con credenciales reales y escenarios con varios clientes concurrentes en un entorno de pruebas dedicado.

## Resultados de verificación

- `pnpm test` aprobó las 13 pruebas de lógica, autorización y PostgreSQL aislado.
- `pnpm test:http` aprobó las 13 pruebas contra el artefacto de producción.
- `pnpm build` terminó correctamente. Se verificaron la portada con 12 productos y una ficha con datos de Neon.
- ESLint conserva 67 errores y 178 advertencias. El informe de dependencias conserva dos avisos moderados de desarrollo.

## Referencias

- [Next.js. Autenticación y autorización de Server Actions](https://nextjs.org/docs/app/guides/authentication#server-actions)
- [PostgreSQL. Índices parciales](https://www.postgresql.org/docs/current/indexes-partial.html)
- [PostgreSQL. Operaciones de escritura en WITH](https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-MODIFYING)
- [OWASP. Almacenamiento de contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
