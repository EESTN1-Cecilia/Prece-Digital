# Identity

Vistas de consulta y gestión de usuarios, roles y permisos.

```text
usuarios-view.js            listado con búsqueda, filtros combinables y paginación
usuario-detalle-view.js     detalle del usuario y asignación de roles
usuario-formulario-view.js  alta y edición de usuarios
roles-view.js               catálogo de roles y matriz de permisos por módulo
identidad.test.mjs          chequeo de la lógica pura (npm test)
```

Rutas: `#/usuarios`, `#/usuarios/nuevo`, `#/usuarios/<id>`, `#/usuarios/<id>/editar`,
`#/roles`.

El adaptador de datos es [`src/services/identity-api.js`](../../services/identity-api.js) y la
comprobación de permisos, [`src/utils/permisos.js`](../../utils/permisos.js). Los botones,
campos, tablas, modales y avisos salen de la biblioteca compartida
[`src/components/ui`](../../components/ui/README.md): el módulo no define elementos visuales
propios. El usuario autenticado y sus permisos salen del estado global
([`src/estado`](../../estado/README.md)), que hace un solo `GET /api/v1/auth/me` para toda la
aplicación.

## Autorización

El frontend usa los permisos del usuario autenticado solo para ocultar o deshabilitar
controles. Toda acción se envía igualmente al backend y la vista muestra la respuesta,
incluidos `401` y `403`. Un botón visible no implica que la acción esté permitida.

Formato de permiso: `<módulo>.<acción>` (por ejemplo `identity.create`), el mismo del
backend. Módulos y roles salen de `Shared/src/domain.mjs`; los códigos que usa la interfaz
están en `src/utils/permisos.js`.

## Endpoints

| Método y ruta | Uso |
| --- | --- |
| `GET /api/v1/auth/me` | usuario autenticado, `roles` y `permisos` |
| `GET /api/v1/authorization/roles` | catálogo de roles |
| `GET /api/v1/authorization/modules` | catálogo de módulos |
| `GET /api/v1/authorization/permissions` | catálogo de permisos, con módulo y acción |
| `GET /api/v1/authorization/roles/:codigo/permissions` | permisos del rol |
| `PUT /api/v1/authorization/roles/:codigo/permissions` | cuerpo `{ "permisos": ["identity.read"] }` |
| `GET /api/v1/users` | listado; filtros `q`, `rol`, `estado` (la paginación es local) |
| `GET /api/v1/users/:userId` | detalle |
| `POST /api/v1/users` | alta; nombre, apellido, email, dni, roles. Devuelve `passwordTemporal` una sola vez |
| `PATCH /api/v1/users/:userId` | edición y baja lógica: `{ "estado": "inactivo" }` |
| `PUT /api/v1/users/:userId/roles` | cuerpo `{ "roles": ["preceptor"] }` |

No hay datos de demostración: si el backend falla, la vista muestra el error.

El token viaja en `Authorization: Bearer` (`services/http.js`); un `401` borra la sesión y
redirige al login. Los errores del backend (`{ error: { code, message, details } }`) se
traducen en `services/http.js`; los `details` se muestran junto a cada campo.

## Datos sensibles

`normalizarUsuario()` arma el objeto de la vista con una lista blanca de campos. Si la
API devolviera `password_hash`, tokens, credenciales o cualquier campo interno, queda
descartado antes de llegar a la interfaz. El chequeo correspondiente está en
`identidad.test.mjs`.

## Pendiente de validación institucional

La matriz de permisos por rol y alcance figura como pendiente en
`Shared/docs/mvp-scope.md`. La vista de roles no la fija en el código: las filas salen de
`GET /api/v1/authorization/modules` y las columnas de `GET /api/v1/authorization/permissions`, así que solo se puede
marcar una combinación de módulo y acción que el backend haya declarado. Donde no existe
el permiso, la celda muestra un guion en lugar de una casilla.

## Alcance al asignar un rol

`usuario_roles` tiene `escuela_id` y cada rol declara sus alcances (`school`, `course`,
`area`, `subject`, `shift`, `period`), pero la asignación de la interfaz sigue siendo de
rol plano.

Para completarla hace falta que el Backend exponga los catálogos de escuelas, cursos,
divisiones, materias, turnos y períodos (su issue #3, *Modelado de la Estructura
Académica Base*). Cuando existan, el cuerpo de `PUT /api/v1/users/:id/roles` debería
pasar de `["preceptor"]` a algo como:

```json
{ "roles": [{ "rol": "preceptor", "alcance": { "tipo": "course", "id": 12 } }] }
```

Mientras tanto no se construye el selector: sin catálogo, sería un campo vacío que no
puede validarse contra nada.
