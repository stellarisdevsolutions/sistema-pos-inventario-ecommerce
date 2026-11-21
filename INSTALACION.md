# Instalación de GadgetHub

## Demostración con la base de pruebas

1. Instala Node.js 24, habilita Corepack y ejecuta `corepack pnpm install --frozen-lockfile` desde el repositorio.
2. Configura `DATABASE_URL` con la conexión de la base Neon de pruebas. Si ya está configurada en el entorno, puedes reutilizarla.
3. Ejecuta `corepack pnpm dev:demo`. El servidor escucha en la interfaz local. El proceso genera una clave de sesión temporal cuando falta `SESSION_SECRET`. En ese caso, tendrás que iniciar sesión otra vez al reiniciar el servidor.

En el portal, elige un rol en **Cuentas de prueba** para rellenar los campos y luego pulsa **Entrar al panel**. También puedes escribir el correo y `password123` manualmente.

| Rol | Correo |
| --- | --- |
| Administrador | `admin@aurastudio.com` |
| Supervisor | `supervisor@aurastudio.com` |
| Cajera | `cajera@aurastudio.com` |
| Almacenero | `almacen@aurastudio.com` |

El acceso de demostración acepta los registros originales de la semilla en este modo. Si ya cambiaste la contraseña o desactivaste una cuenta, se respetan esos cambios. El modo de demostración también admite los PIN heredados del administrador y supervisor de la semilla. Si vas a configurar PIN nuevos en la base de pruebas y quieres conservarlos entre reinicios, usa un `SUPERVISOR_PIN_SECRET` estable. El arranque reutiliza los datos existentes. Para poblar una base de pruebas vacía con `corepack pnpm db:seed`, configura `SEED_PASSWORD` con una contraseña de 16 a 100 caracteres.

## Despliegue de pruebas de `main` en Vercel

1. Configura `DATABASE_URL` con la conexión a la base de pruebas y `SESSION_SECRET` en el entorno **Production** de Vercel. Para la clave de sesión, genera un valor con `openssl rand -hex 32`.
2. Publica `main` y abre `/portal`. El selector **Cuentas de prueba** aparece automáticamente en el despliegue de producción de esa rama. Elige un rol y pulsa **Entrar al panel**.
3. Si cambias la configuración de Vercel, vuelve a desplegar. Si falla el inicio de sesión, comprueba que la conexión apunta a la base de pruebas con el esquema y las cuentas cargadas.

## Instalación de producción

1. Crea una base PostgreSQL de Neon exclusiva para producción. Si usas Vercel con `main`, configura `ENABLE_DEMO_LOGIN=0` en **Production** para ocultar el selector y deshabilitar la validación de credenciales heredadas de la semilla. En el gestor de secretos del despliegue, configura `DATABASE_URL` y `SESSION_SECRET`. Usa una clave estable con al menos 32 bytes aleatorios. Puedes generar una con `openssl rand -hex 32`. Configura también `SUPERVISOR_PIN_SECRET` si quieres una clave independiente para los PIN.
2. Ejecuta `corepack pnpm install --frozen-lockfile`. En una base vacía, aplica las migraciones con `corepack pnpm exec drizzle-kit migrate` desde un entorno con acceso directo a PostgreSQL. Para una base existente, revisa primero su esquema y el historial de migraciones. Consulta la [auditoría](AUDITORIA_PANEL_ADMIN.md) para la base de pruebas actual.
3. Da de alta el primer administrador con un correo propio y un hash generado con `hashPassword` de `src/lib/auth/password.ts`. Inserta el registro en `users` con rol `admin` mediante una operación de aprovisionamiento autorizada. Crea las demás cuentas desde el módulo **Usuarios**. Reserva `db:seed` para pruebas.
4. Ejecuta `corepack pnpm test` y `corepack pnpm build`. Arranca el artefacto con `corepack pnpm start` detrás de HTTPS. Comprueba el inicio de sesión con el administrador y ejecuta `corepack pnpm test:http` contra el proceso que acabas de levantar.
5. Si el despliegue restringe el acceso a Internet, autoriza el endpoint HTTPS que usa el driver de Neon y los dominios `fonts.googleapis.com` y `fonts.gstatic.com` para el build. En el entorno cloud con proxy, usa `NODE_USE_ENV_PROXY=1`.

Las contraseñas reales se validan mediante PBKDF2 y las claves de sesión deben configurarse antes de habilitar el acceso.

## Paleta del panel

Edita `--admin-pigment` en [src/app/admin-theme.css](src/app/admin-theme.css) para recolorear las acciones, los enlaces activos y los acentos del panel y del portal. Los fondos, el texto y los bordes tienen variables propias en `:root` y `.dark`. Los colores de stock, alerta y error distinguen estados operativos. La tienda usa sus propios tokens `--store-*`.

## Migración de devoluciones a proveedores

Antes de publicar una versión con devoluciones a proveedores, aplica [la migración 0002](drizzle/0002_purchase_returns.sql) en la base que usará ese despliegue. Con el historial de Drizzle al día, usa `corepack pnpm exec drizzle-kit migrate`. Para una base existente sin historial, verifica primero que su esquema corresponda a la versión anterior y ejecuta solo la migración nueva en una transacción. La migración crea las tablas de devoluciones y protege las compras que ya tienen una devolución registrada.

## Cobros recuperables y alta de catálogo

Aplica las migraciones [0003 de intentos de cobro](drizzle/0003_checkout_requests.sql) y [0004 de variantes](drizzle/0004_product_variants.sql) antes del despliegue que usa esas funciones. Un intento pendiente de confirmación se conserva en el navegador para el mismo operador. Reintenta desde ese navegador para recuperar el ticket o confirmar el cobro.

En **Inventario**, descarga la plantilla Excel y rellena solo la hoja **Carga**. El archivo admite hasta 500 altas. Valida el archivo antes de confirmar. Las filas existentes se informan como conflictos y las altas confirmadas generan una apertura de Kárdex. Usa el mismo grupo y nombre de selector para las variantes de un modelo. Para las fotos, podés usar la imagen de cada ficha o una URL pública HTTPS.
