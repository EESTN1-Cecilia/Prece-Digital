# Auth

Login propio con JWT, refresh tokens, control de permisos por rol y alcance, y bajas lógicas de cuentas.

## Endpoints

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | No | Inicia sesión |
| POST | `/api/v1/auth/refresh` | No | Rota el refresh token y emite un access token nuevo |
| POST | `/api/v1/auth/logout` | No | Revoca el refresh token |
| GET | `/api/v1/auth/me` | Bearer | Perfil, roles y permisos del usuario autenticado |
| GET | `/api/v1/auth/permissions` | Bearer | Roles, permisos y resumen por módulo |
| GET | `/api/v1/users` | Bearer + `users.read` | Lista usuarios (filtros `q`, `rol`, `estado`) |
| POST | `/api/v1/users` | Bearer + `identity.create` | Alta con contraseña temporal |
| GET | `/api/v1/users/:userId` | Bearer + `users.read` | Detalle |
| PATCH | `/api/v1/users/:userId` | Bearer + `identity.update` | Datos y estado (`activo`/`inactivo`) |
| PUT | `/api/v1/users/:userId/roles` | Bearer + `identity.update` | Reemplaza los roles |
| PATCH | `/api/v1/users/:userId/deactivate` | Bearer + `users.deactivate` | Baja lógica de la cuenta |

## Estrategia de autenticación

- Las contraseñas se guardan como hash bcrypt, nunca en texto plano.
- El login emite un **access token** (JWT HS256, vence por `JWT_ACCESS_EXPIRES_IN`) y
  un **refresh token** opaco con expiración propia (`JWT_REFRESH_EXPIRES_IN`).
- El access token solo lleva `sub` (id del usuario), `typ` y `roles`; nunca datos sensibles.
- El refresh token se guarda como hash SHA-256 en el store y se rota en cada uso:
  reutilizar uno revocado invalida todas las sesiones del usuario.
- El cierre de sesión revoca el refresh token en uso.
- Los secretos JWT se leen de `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`. En
  producción es obligatorio definirlos por variables de entorno con 16 caracteres
  o más; la API no arranca con los valores de desarrollo.

## Protección contra fuerza bruta

El login se limita por cuenta y por origen:

- `LOGIN_MAX_EMAIL_ATTEMPTS` (5): intentos fallidos por email antes de bloquear la cuenta.
- `LOGIN_MAX_IP_ATTEMPTS` (20): intentos fallidos por IP antes de bloquear el origen.
- `LOGIN_WINDOW_MS` y `LOGIN_LOCK_MS` (900000): ventana de conteo y duración del bloqueo.

Mientras hay un bloqueo, todo intento responde `429 TOO_MANY_ATTEMPTS` con el mismo
mensaje genérico (no permite deducir qué cuenta está afectada). Un login exitoso
despeja el contador de la cuenta. El contador por email solo avanza para cuentas
reales, para no permitir bloquear emails inexistentes.

## Alcance

Cada asignación combina un rol con un contexto opcional:

- `schoolId` (escuela)
- `courseId` (curso)
- `divisionId` (división)
- `subjectId` (materia)
- `shiftId` (turno)
- `periodId` (período)

Un valor omitido en la asignación significa “todo ese nivel”. Una asignación más específica no habilita acciones de nivel más amplio.

## Bajas lógicas

Las cuentas no se borran. Se desactivan (`isActive: false`, `deactivatedAt`) y se revocan sus sesiones.

## Autorización

La autorización decide qué puede hacer el usuario autenticado. Se aplica siempre en el
backend: el frontend solo puede ocultar funcionalidades, eso es usabilidad, no seguridad.

- **Identidad** → del token JWT verificado (`verifyToken` deja el usuario en `ctx.user`).
- **Roles** → de las asignaciones del usuario en el store.
- **Permisos** → del catálogo central `config/permissions.config.mjs` (`ROL_CATALOGO`,
  `ROLE_PERMISSIONS` y los helpers de `modules/auth/permission.service.mjs`).

Un permiso se escribe `modulo.accion`. Las acciones canónicas del catálogo son
`read`, `create`, `update`, `delete`, `approve` y `upload`; se conservan las legadas
`write` (crear+modificar+cargar) y `manage` (eliminar+aprobar), más puntuales como
`users.deactivate`. El acceso se verifica con el middleware `authorize({ permission,
roles, context })` antes de ejecutar el controlador.

| Resultado | Respuesta |
| --- | --- |
| Sin token o token inválido | `401` |
| Autenticado sin el permiso o el alcance | `403` |
| Autenticado con permiso | Ejecuta la operación |

`GET /auth/me` y `GET /auth/permissions` devuelven roles, permisos y un resumen por
módulo calculados en el backend; el cliente nunca envía roles ni permisos. Un usuario
no puede desactivar ni modificar su propia cuenta. Incorporar un rol nuevo es agregar
su entrada en `ROL_CATALOGO` y su lista en `ROLE_PERMISSIONS`: no se toca ningún
controlador ni middleware.