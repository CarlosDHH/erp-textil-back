# ERP Textil — Backend

API REST para sistema ERP de taller textil, construida con **Express.js**, **PostgreSQL** y **Prisma ORM**. Incluye autenticación JWT, control de acceso por roles y estructura de permisos por módulo.

---

## Stack

| Capa | Tecnología |
|---|---|
| Runtime | Node.js ≥ 20 |
| Framework | Express 4 |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL 16 |
| Autenticación | JWT (access + refresh token) |
| Hashing | bcryptjs |
| Contenedor DB | Docker Compose |

---

## Estructura del proyecto

```
src/
├── app.js                  # Entry point
├── config/
│   └── prisma.js           # Instancia del cliente Prisma
├── controllers/
│   ├── auth.controller.js
│   ├── role.controller.js
│   └── user.controller.js
├── middlewares/
│   ├── apiKey.js           # Validación de API key para rutas internas
│   ├── auth.js             # authenticate + authorize
│   ├── errorHandler.js     # Manejo global de errores
│   └── notFound.js         # 404 handler
├── routes/
│   ├── auth.routes.js
│   ├── role.routes.js
│   └── user.routes.js
├── services/
│   ├── auth.service.js
│   ├── role.service.js
│   └── user.service.js
└── utils/
    ├── handleResponse.js   # Formato estándar de respuesta
    └── queryHelpers.js     # Paginación
prisma/
├── schema.prisma
├── seed.js
└── migrations/
```

---

## Modelo de datos

```
Role ──< User
Role ──< RolePermission >── Module
User ──< UserPermissionOverride >── Module
User ──< UserPermissionOverride (grantedBy)
Module ──< Module (parent/children)
```

| Tabla | Descripción |
|---|---|
| `roles` | Roles del sistema (admin, etc.) |
| `users` | Usuarios con soft delete y bloqueo por intentos |
| `modules` | Módulos de la aplicación con jerarquía opcional |
| `role_permissions` | Permisos CRUD por rol y módulo |
| `user_permission_overrides` | Overrides individuales con tipo grant/revoke y expiración |

---

## Primeros pasos

### 1. Prerrequisitos

- Node.js ≥ 20
- Docker Desktop

### 2. Clonar e instalar

```bash
git clone <repo-url>
cd base-backend
npm install
```

### 3. Variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores. Variables requeridas:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string de PostgreSQL |
| `JWT_SECRET` | Secreto para access token (mín. 32 chars) |
| `JWT_REFRESH_SECRET` | Secreto para refresh token (mín. 32 chars) |
| `JWT_EXPIRES_IN` | Duración del access token (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Duración del refresh token (default: `7d`) |
| `CORS_ORIGIN` | Origen permitido (default: `http://localhost:4200`) |
| `PORT` | Puerto del servidor (default: `3000`) |

### 4. Base de datos

```bash
# Levantar PostgreSQL
docker compose up -d

# Correr migración inicial
npm run prisma:migrate

# Crear rol admin + usuario inicial
npm run prisma:seed
```

Credenciales del seed:
- **Email:** `admin@sistema.com`
- **Password:** `Admin@123`

### 5. Iniciar servidor

```bash
# Desarrollo (hot reload)
npm run dev

# Producción
npm start
```

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor con hot reload (`--watch`) |
| `npm start` | Corre migraciones y levanta servidor |
| `npm run prisma:migrate` | Crea y aplica una nueva migración |
| `npm run prisma:generate` | Regenera el cliente Prisma |
| `npm run prisma:studio` | Abre Prisma Studio en `http://localhost:5555` |
| `npm run prisma:seed` | Inserta datos iniciales |

---

## API Reference

Todas las respuestas siguen este formato:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Descripción",
  "data": {}
}
```

Las listas paginadas incluyen un objeto `meta`:

```json
{
  "data": [...],
  "meta": { "total": 50, "page": 1, "limit": 20, "pages": 3 }
}
```

### Auth — `/api/auth`

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| `POST` | `/login` | `{ email, password }` | Retorna access token + refresh token |
| `POST` | `/refresh` | `{ refreshToken }` | Renueva el access token |

### Users — `/api/users`

> Requiere: `Authorization: Bearer <token>` + rol `admin`

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| `GET` | `/` | — | Lista paginada (`?page&limit&search`) |
| `POST` | `/` | `{ name, lastName, email, password, roleId, phone? }` | Crear usuario |
| `GET` | `/:id` | — | Obtener por ID |
| `PUT` | `/:id` | `{ name?, lastName?, phone?, roleId?, active? }` | Actualizar |
| `DELETE` | `/:id` | — | Soft delete |

### Roles — `/api/roles`

> Requiere: `Authorization: Bearer <token>` + rol `admin`

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| `GET` | `/` | — | Lista paginada (`?page&limit&search`) |
| `POST` | `/` | `{ name, description? }` | Crear rol |
| `GET` | `/:id` | — | Obtener por ID |
| `PUT` | `/:id` | `{ name?, description?, isActive? }` | Actualizar |
| `DELETE` | `/:id` | — | Elimina si no tiene usuarios asignados |

### Health check

```
GET /api/health
```

---

## Autenticación

El flujo usa dos tokens JWT:

| Token | Duración | Uso |
|---|---|---|
| Access token | 15 min | Header `Authorization: Bearer <token>` |
| Refresh token | 7 días | Body `{ refreshToken }` en `POST /api/auth/refresh` |

**Bloqueo de cuenta:** 5 intentos fallidos consecutivos bloquean la cuenta por 15 minutos.

### Middlewares

- `authenticate` — verifica el access token y expone `req.user` (`{ sub, email, role }`)
- `authorize(...roles)` — verifica que `req.user.role` esté en la lista de roles permitidos

```js
// Ejemplo de uso en una ruta nueva
router.get('/reporte', authenticate, authorize('admin', 'supervisor'), handler)
```

---

## Agregar un nuevo módulo

1. Crear `src/services/<modulo>.service.js`
2. Crear `src/controllers/<modulo>.controller.js`
3. Crear `src/routes/<modulo>.routes.js`
4. Registrar la ruta en `src/app.js`
5. Si hay nuevos modelos: agregar al `schema.prisma` y correr `npm run prisma:migrate`

---

## Convenciones

- Soft deletes con flag `deleted` en lugar de `DELETE` físico
- Todos los IDs son UUID v4 generados por Prisma
- Timestamps en `Timestamptz(3)` (zona horaria incluida)
- Los nombres de tablas y columnas van en `snake_case` vía `@map`
- Los modelos Prisma van en `PascalCase`
