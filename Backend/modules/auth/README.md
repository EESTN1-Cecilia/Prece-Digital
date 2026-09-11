# Auth

Login propio con JWT, refresh tokens, control de permisos por rol y alcance, y bajas lógicas de cuentas.

## Endpoints

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| POST | `/auth/login` | No | Inicia sesión |
| POST | `/auth/refresh` | No | Rota el refresh token y emite un access token nuevo |
| POST | `/auth/logout` | No | Revoca el refresh token |
| GET | `/auth/me` | Bearer | Perfil y asignaciones del usuario autenticado |
| POST | `/auth/users/:userId/deactivate` | Bearer + `users.deactivate` | Baja lógica de la cuenta |

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