# PantSys · Backend

**PantSys** es un sistema ERP integral para la gestión de un taller textil, desarrollado como
proyecto para la **Universidad Tecnológica de la Sierra Hidalguense (UTSH)**.

Este repositorio contiene la **API REST**: autenticación (contraseña y biometría), control de
acceso por módulo, catálogo de insumos, lotes, movimientos de inventario, proveedores y órdenes de
compra. El cliente Angular vive en [`erp-textil-front`](../erp-textil-front).

---

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js ≥ 20 (ESM, `"type": "module"`) |
| Framework | Express 4 |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL 16 |
| Autenticación | JWT (access + refresh) |
| Hashing | bcryptjs |
| Biometría | `@simplewebauthn/server` 13 |
| Correo transaccional | Resend 6 |
| Contenedor de la BD | Docker Compose |

---

## Puesta en marcha

```bash
npm install                 # `postinstall` ejecuta `prisma generate`
docker compose up -d        # PostgreSQL
npx prisma migrate deploy   # aplica el esquema
npm run seed                # datos de prueba
npm run dev                 # http://localhost:3000
```

### Comandos

```bash
npm run dev              # servidor con recarga automática (node --watch)
npm start                # migra y arranca (producción)
npm run seed             # puebla la base con datos de prueba
npm run prisma:migrate   # crea una migración nueva (desarrollo)
npm run prisma:generate  # regenera el cliente de Prisma
npm run prisma:studio    # explorador visual de la base
```

---

## Configuración del archivo `.env`

Copia la plantilla y rellena los valores. **El `.env` real nunca se sube al repositorio**
(ya está en `.gitignore`); `.env.example` sí, sin valores.

```bash
cp .env.example .env
```

| Variable | Obligatoria | Descripción |
|---|:---:|---|
| `PORT` | | Puerto del servidor. Por defecto `3000`. |
| `NODE_ENV` | | `development` o `production`. |
| `DATABASE_URL` | ✅ | `postgresql://USUARIO:CONTRASENA@HOST:PUERTO/BASE_DE_DATOS` |
| `JWT_SECRET` | ✅ | Secreto del access token. |
| `JWT_EXPIRES_IN` | | Vigencia del access token. Por defecto `15m`. |
| `JWT_REFRESH_SECRET` | ✅ | Secreto del refresh token. **Debe ser distinto** de `JWT_SECRET`. |
| `JWT_REFRESH_EXPIRES_IN` | | Vigencia del refresh token. Por defecto `7d`. |
| `CORS_ORIGIN` | | Origen permitido. Por defecto `http://localhost:4200`. |
| `FRONTEND_URL` | ✅ | Base del enlace de recuperación de contraseña. |
| `RESEND_API_KEY` | ✅ | Clave de API de [resend.com/api-keys](https://resend.com/api-keys). |
| `EMAIL_FROM` | ✅ | Remitente verificado, ej. `PantSys <no-reply@tudominio.com>`. |
| `WEBAUTHN_RP_ID` | | Dominio de las passkeys. Por defecto `localhost`. |
| `WEBAUTHN_ORIGIN` | | Origen de las passkeys. Por defecto `http://localhost:4200`. |

Ejemplo mínimo para desarrollo:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres123@localhost:5433/erp_textil"
JWT_SECRET=cambia-esto-por-una-cadena-larga-y-aleatoria
JWT_REFRESH_SECRET=otra-cadena-distinta-igual-de-larga
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:4200
FRONTEND_URL=http://localhost:4200
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="PantSys ERP <onboarding@resend.dev>"
```

> Para pruebas puedes usar el remitente `onboarding@resend.dev` de Resend sin verificar dominio,
> pero sólo entrega a la dirección con la que registraste tu cuenta. Para enviar a cualquier
> destinatario hay que verificar un dominio propio.

---

## El comando `seed`

```bash
npm run seed
```

Puebla la base con un juego de datos coherente: roles, módulos y sus permisos, usuarios de cada
rol, proveedores, insumos, lotes, movimientos y órdenes de compra.

**Es idempotente.** Trabaja con `upsert` y comprobaciones de existencia, así que se puede ejecutar
las veces que haga falta: no duplica registros ni pisa lo que ya existe.

### Histórico para los KPIs

El gráfico *"Insumos Registrados por Mes"* del dashboard agrupa por `Supply.createdAt`. Como esa
columna es `@default(now())`, una carga normal deja todos los insumos en el mes actual y el gráfico
muestra **una sola barra**.

Para evitarlo, el seed incluye un bloque que inserta insumos y lotes con la fecha de alta escrita
a mano y repartida en los **últimos 6 meses** (3 insumos y 3 lotes por mes). El script lo confirma
al terminar:

```
   📊 Histórico para KPIs (últimos 6 meses)
      Insumos nuevos: 18      Lotes nuevos: 18

   Insumos por mes de registro:
      2026-02  ███ 3
      2026-03  ███ 3
      2026-04  ███ 3
      2026-05  ███ 3
      2026-06  ███ 3
      2026-07  █████████████████████ 21
```

Congruencia garantizada por construcción:

- La **unidad de medida se deriva de la categoría** (Telas → Metros, Hilos → Conos, Tinta → Kg),
  así que no puede generarse una combinación absurda.
- `Supply.currentStock` se calcula como la **suma del saldo de sus lotes**, nunca se escribe suelto.
- Cada lote genera su movimiento de **entrada** y, si hubo consumo, su **salida**, ambos fechados
  dentro del mismo mes que el lote.
- Ninguna fecha cae en el futuro: en el mes en curso el día se recorta a hoy.

### Usuarios que crea el seed

| Correo | Contraseña | Rol |
|---|---|---|
| `admin@sistema.com` | `Admin@123` | admin |
| `almacen@sistema.com` | `Almacen@123` | almacenista |
| `compras@sistema.com` | `Compras@123` | comprador |
| `supervisor@sistema.com` | `Supervisor@123` | supervisor |

> Credenciales de desarrollo. Cámbialas antes de exponer la aplicación.

---

## Estructura

```
src/
├── app.js                  punto de entrada y montaje de rutas
├── config/
│   ├── prisma.js           instancia del cliente Prisma
│   ├── mailer.js           configuración de correo
│   └── webauthn.js         rpID / origin de las passkeys
├── controllers/            validan la entrada y delegan en el servicio
├── services/               lógica de negocio y acceso a datos
│   ├── auth.service.js         login, refresh, recuperación de contraseña
│   ├── mail.service.js         correos transaccionales con Resend
│   ├── webauthn.service.js     registro y verificación de passkeys
│   ├── activityLog.service.js  bitácora de modificaciones
│   └── …                       supply · batch · inventoryMovement · user · role …
├── middlewares/
│   ├── auth.js             authenticate (JWT) y authorize (por rol)
│   ├── permission.js       requireModulePermission (por módulo y acción)
│   └── errorHandler.js
└── utils/
    ├── handleResponse.js   forma única de respuesta
    ├── queryHelpers.js     paginación
    └── errors.js           errores de negocio tipados
```

---

## Autenticación y autorización

### JWT

`accessToken` de 15 minutos y `refreshToken` de 7 días. Cinco intentos fallidos bloquean la cuenta
durante 15 minutos; el backend responde `403` indicando los minutos restantes.

### Recuperación de contraseña (Resend)

1. `POST /api/auth/forgot-password` con el correo.
2. Si el usuario existe y no está eliminado, se genera un token aleatorio. **En la base se guarda
   sólo su hash SHA-256**, de modo que leer la tabla no permite reconstruir el enlace.
3. `mail.service.js` envía con Resend el enlace `{FRONTEND_URL}/auth/reset-password?token=…`,
   válido 60 minutos y de un solo uso.
4. `POST /api/auth/reset-password` con `{ token, password }` verifica el token, cifra la nueva
   contraseña con `bcrypt` y limpia el token junto con los intentos fallidos.

La respuesta de `forgot-password` es **idéntica exista o no el correo**, para no revelar qué
direcciones están registradas.

> El SDK de Resend no lanza excepciones: devuelve `{ data: null, error }`. El servicio comprueba
> ese `error` explícitamente; sin ese chequeo, un dominio sin verificar o una clave inválida se
> darían por enviados en silencio.

### Biometría (WebAuthn)

Registro y verificación de passkeys con `@simplewebauthn/server`. La clave pública se guarda en la
tabla `passkeys`; la privada nunca sale del dispositivo. El bloqueo por intentos fallidos aplica
igual que en el login con contraseña.

### Permisos por módulo

`requireModulePermission(slug, acción)` consulta la tabla `role_permissions`, que cruza rol y
módulo con los flags `canView`, `canCreate`, `canEdit` y `canDelete`. El rol `admin` pasa siempre.

---

## Bitácora de actividad

La tabla `movimientos_inventario` guarda dos cosas:

1. **Movimientos de stock** — `entry`, `exit`, `adjustment`, `loss`, con lote y cantidad.
2. **Modificaciones** — `update`, que se registra al editar un insumo, un lote o un usuario.

Por eso `lote_id` y `quantity` son opcionales: editar un insumo o un usuario no ocurre sobre ningún
lote ni mueve cantidad alguna. Esos eventos identifican el registro afectado con `entidad`,
`entidad_id` y `entidad_nombre`, y guardan en `reason` qué campos cambiaron.

`activityLog.service.js` compara el registro antes y después, y **sólo registra si algo cambió de
verdad**: guardar un formulario sin tocar nada no ensucia el historial. Al editar un lote el evento
entra en la misma transacción que la edición (si se revierte, su rastro también); al editar un
insumo o un usuario se escribe después y sin transacción, para que un fallo al auditar no deshaga
una edición ya guardada.

Alimenta la pestaña *"Actividad Reciente"* del perfil vía
`GET /api/inventoryMovement?userId=…`. El kardex excluye los eventos `update`, porque es un libro
de existencias y esos eventos no mueven stock.

---

## Modelo de datos

`Role`, `User`, `Module`, `RolePermission`, `UserPermissionOverride`, `Supplier`, `Supply`,
`Batch`, `InventoryMovement`, `PurchaseOrder`, `PurchaseOrderDetail` y `Passkey`.

Detalle completo en [`database.md`](./database.md) y en
[`prisma/schema.prisma`](./prisma/schema.prisma).

---

## Contrato de respuesta

```json
{ "statusCode": 200, "success": true, "message": "...", "data": {}, "errors": "" }
```

Listados paginados:

```json
{ "data": [], "meta": { "total": 50, "page": 1, "limit": 20, "pages": 3 } }
```

Endpoint de salud: `GET /api/health`. Detalle de los endpoints en [`API.md`](./API.md).
