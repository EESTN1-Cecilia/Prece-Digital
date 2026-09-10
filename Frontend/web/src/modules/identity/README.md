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
([`src/estado`](../../estado/README.md)), que hace un solo `GET /api/v1/me` para toda la
aplicación.

## Autorización

El frontend usa los permisos del usuario autenticado solo para ocultar o deshabilitar
controles. Toda acción se envía igualmente al backend y la vista muestra la respuesta,
incluidos `401` y `403`. Un botón visible no implica que la acción esté permitida.

Formato de permiso esperado: `<módulo>:<acción>`, donde el módulo sale de
`GET /api/v1/modules` y la acción del catálogo `ACCIONES`, tomado de la issue #13 del
Backend: `read`, `create`, `update`, `delete`, `approve` y `upload`. Por ejemplo,
`identity:create`. Un permiso `*` habilita todo (superadministrador).
Usuarios y roles comparten el módulo `identity`: la matriz fina por recurso figura como
pendiente de validación en `Shared/docs/mvp-scope.md`.

## Contrato esperado del backend

Los endpoints que todavía no existen están igualmente consumidos por el adaptador y,
mientras devuelvan `404`, las lecturas degradan a datos de demostración con un aviso
visible en pantalla (`origen: "demo"`). Las escrituras nunca degradan: propagan el error
del backend.

| Método y ruta | Uso | Estado |
| --- | --- | --- |
| `GET /api/v1/me` | usuario autenticado, `roles` y `permisos` | implementado |
| `GET /api/v1/roles` | catálogo de roles | implementado |
| `GET /api/v1/modules` | catálogo de módulos del sistema | implementado |
| `GET /api/v1/permissions` | catálogo de permisos, con módulo y acción | implementado |
| `GET /api/v1/roles/:codigo/permissions` | permisos del rol | implementado |
| `PUT /api/v1/roles/:codigo/permissions` | cuerpo `{ "permisos": ["identity:read"] }` | implementado |
| `GET /api/v1/users` | listado; parámetros `q`, `rol`, `area`, `estado`, `page`, `pageSize` | pendiente |
| `GET /api/v1/users/:id` | detalle | pendiente |
| `POST /api/v1/users` | alta; cuerpo con nombre, apellido, email, dni, roles | pendiente |
| `PUT /api/v1/users/:id/roles` | cuerpo `{ "roles": ["preceptor"] }` | pendiente |
| `PATCH /api/v1/users/:id` | edición y baja lógica: `{ "estado": "suspendido" }` | pendiente |

Los endpoints de autorización quedaron implementados en el PR #78 del Backend, que
cierra su issue #13. Los de usuarios siguen sin tener issue en ese repositorio.

### Autenticación y CORS

El Backend definió en su issue #2 autenticación propia con **JWT y refresh tokens**
(`/auth/login`, `/auth/refresh`, `/auth/logout`), no sesión por cookie. Por eso
`services/http.js` envía el token en la cabecera `Authorization: Bearer` y no usa
`credentials`. El token se guarda con `guardarToken()` y un `401` lo borra, invalida la
sesión y redirige al login.

`middlewares/cors.middleware.mjs` solo devuelve `Access-Control-Allow-Origin: *` y no
responde `OPTIONS`. Con eso alcanza para las lecturas, pero toda escritura (`POST`,
`PUT`, `PATCH`) dispara un preflight que el Backend contesta `404` y el navegador la
bloquea. Para habilitarlas hace falta responder `OPTIONS` con
`Access-Control-Allow-Methods` y `Access-Control-Allow-Headers` incluyendo
`Authorization` y `Content-Type`. Está anotado como issue #70 del Backend.

### Formato de error

El backend responde los errores así, y `services/http.js` los traduce a un mensaje para
el usuario:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos.",
    "details": [{ "field": "dni", "message": "El DNI es obligatorio." }]
  }
}
```

Los `details` se muestran junto al campo correspondiente del formulario. El `code` queda
en `error.codigo` por si hace falta distinguir un caso sin mirar el texto.

Respuesta esperada del listado:

```json
{
  "data": {
    "items": [{ "id": 1, "nombre": "Ana", "apellido": "Perez" }],
    "total": 14,
    "paginas": 2
  }
}
```

El adaptador tolera alias habituales (`first_name`/`nombre`, `activo`/`estado`,
`creado_en`/`createdAt`) y acepta también un array plano como `data`.

## Datos sensibles

`normalizarUsuario()` arma el objeto de la vista con una lista blanca de campos. Si la
API devolviera `password_hash`, tokens, credenciales o cualquier campo interno, queda
descartado antes de llegar a la interfaz. El chequeo correspondiente está en
`identidad.test.mjs`.

## Pendiente de validación institucional

La matriz de permisos por rol y alcance figura como pendiente en
`Shared/docs/mvp-scope.md`. La vista de roles no la fija en el código: las filas salen de
`GET /api/v1/modules` y las columnas de `GET /api/v1/permissions`, así que solo se puede
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
