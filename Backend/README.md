# Prece Digital - Backend

Repositorio de desarrollo del Backend de **Prece Digital**.

Contiene la API, lógica de negocio, acceso a datos, autenticación, validaciones, servicios y pruebas del sistema.

---

## Estructura

```text
config/              # Configuración (app, permisos, dominios)
controllers/         # Controladores globales
database/            # Stores en memoria, repositorios, seeds
middlewares/         # Auth, autorización, CORS, not-found
modules/             # Módulos de negocio (uno por dominio)
routes/              # Registro de rutas de la API
scripts/             # Utilidades
services/            # Servicios globales
src/                 # Arranque (app.mjs, server.mjs)
test/                # Pruebas
utils/               # Helpers (errores, respuestas, body)
.env.example
package.json
```

## Manejo de errores

Todos los endpoints devuelven el mismo formato ante un error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son validos.",
    "details": [{ "field": "dni", "message": "El DNI es obligatorio." }]
  }
}
```

Los controladores y servicios no arman respuestas de error: lanzan un `ApiError` y el
middleware centralizado (`middlewares/error.middleware.mjs`) lo traduce.

```js
import { noEncontrado, conflicto } from "../utils/api-error.mjs";

if (!usuario) {
  throw noEncontrado("El usuario solicitado");
}
```

| Situación | Helper | Código HTTP |
| --- | --- | --- |
| Datos inválidos con detalle por campo | `errorDeValidacion(details)` | 422 |
| Solicitud mal formada | `solicitudInvalida()` | 400 |
| Sin autenticación válida | `noAutenticado()` | 401 |
| Autenticado sin permisos | `sinPermisos()` | 403 |
| Registro inexistente | `noEncontrado("El curso solicitado")` | 404 |
| Conflicto de datos | `conflicto()` | 409 |
| Cualquier error no previsto | — | 500 |

Los errores de MySQL previstos se traducen solos: `ER_DUP_ENTRY` y las violaciones de
clave foránea salen como `409`, sin exponer la consulta ni el nombre del índice.

Ante un error inesperado el cliente recibe siempre un mensaje genérico. El detalle y el
stack quedan únicamente en el log del servidor, que registra fecha, método, ruta y tipo
de error, y nunca el cuerpo de la petición ni las cabeceras.

Para devolver un código distinto de 200 en una respuesta correcta:

```js
import { conEstado } from "../utils/http-response.mjs";

return conEstado(201, { data: usuario });
```

Pruebas:

```bash
npm test
```

## Roles y permisos

Un permiso es `<modulo>:<accion>`, por ejemplo `identity:read`. Los módulos y las
acciones viven en la base (`modulos`, `permisos`), y `rol_permisos` define qué puede
hacer cada rol. Los permisos de un usuario son la unión de los de todos sus roles
activos.

Acciones previstas: `read`, `create`, `update`, `delete`, `approve` y `upload`.

### Endpoints

| Método y ruta | Permiso requerido |
| --- | --- |
| `GET /api/v1/me` | solo sesión válida |
| `GET /api/v1/modules` | `identity:read` |
| `GET /api/v1/roles` | `identity:read` |
| `GET /api/v1/permissions` | `identity:read` |
| `GET /api/v1/roles/:codigo/permissions` | `identity:read` |
| `PUT /api/v1/roles/:codigo/permissions` | `identity:update` |

`PUT` reemplaza por completo los permisos del rol y rechaza con `422` cualquier código
que no exista en el catálogo, así el cliente no puede inventar permisos.

### Proteger un endpoint

```js
import { requierePermiso } from "../middlewares/authorization.middleware.mjs";

export const apiRoutes = {
  "GET /api/v1/students": requierePermiso("students:read", listStudents)
};
```

El controlador recibe `contexto` con `usuario` y `permisos` ya resueltos. La
comprobación ocurre antes de ejecutarlo: un usuario sin sesión recibe `401` y uno
autenticado sin el permiso, `403`.

Los roles y permisos se leen siempre de la base a partir del id del usuario
autenticado. Nada de lo que envíe el cliente influye en la autorización.

### Autenticación

`identidadDelRequest()`, en `middlewares/authorization.middleware.mjs`, es el único
punto que hay que conectar cuando esté el login con JWT: alcanza con que el middleware
de autenticación deje el usuario verificado en `request.usuario`.

Mientras tanto, para probar la API en desarrollo se puede definir `AUTH_DEV_USER_ID`
con el id de un usuario existente. Se ignora cuando `APP_ENV=production` y viene vacío
por defecto.

### Rutas con parámetros

El registro de rutas admite parámetros con `:nombre`, que llegan al controlador en
`params`:

```js
"GET /api/v1/roles/:codigo/permissions": requierePermiso("identity:read", getRolePermissions)
```

## Forma de trabajo

El equipo Backend debe trabajar únicamente sobre este repositorio. No se deben realizar cambios directamente sobre la carpeta `Backend/` del repositorio principal `Prece-Digital`.

Flujo recomendado:

```text
main -> rama de trabajo -> desarrollo -> push -> Pull Request -> revisión -> merge a main
```

Antes de comenzar:

```bash
git checkout main
git pull origin main
git checkout -b feature/nombre-funcionalidad
```

Subir cambios:

```bash
git add .
git commit -m "feat: agregar endpoint de login"
git push -u origin feature/login
```

Integración con el repositorio principal mediante `git subtree`:

```bash
git fetch backend
git subtree pull --prefix=Backend backend main --squash
```

## Entorno local

```bash
npm install
npm run dev
```

La API queda disponible en `http://localhost:3000`.

## Arquitectura

Cada módulo bajo `modules/` sigue la convención **controlador → servicio → repositorio → store**:

```
modules/<x>/
├── <x>.controller.mjs   # Traduce HTTP a llamadas de servicio
├── <x>.service.mjs      # Lógica de negocio y validaciones
├── <x>.repository.mjs   # Persistencia (actualmente en memoria)
└── README.md
```

Reglas comunes:
- Autenticación y autorización por roles y permisos (ver `config/permissions.config.mjs`).
- Errores uniformes mediante `HttpError` (código `error`, `message`, opcional `details`).
- Respuestas REST con formato `{ statusCode, body: { data } }`.
- Validación de datos en la capa de servicio.
- Variables sensibles en `.env`.

---

# Documentación de Endpoints

> **Autenticación**: salvo `/health`, `/auth/login`, `/auth/refresh` y `/auth/logout`, todos los endpoints requieren el header:
> ```
> Authorization: Bearer <accessToken>
> ```
>
> **Formato de respuestas**:
> - Éxito (2xx): `{ "data": { ... } }`
> - Error (4xx/5xx): `{ "error": "<codigo>", "message": "<descripcion>", "details": { ... }? }`

---

## 1. Salud y Catálogo

### `GET /health`
Verifica que la API esté activa.

**Respuesta 200:**
```json
{
  "status": "ok",
  "service": "prece-digital-api"
}
```

### `GET /api/v1/modules`
Lista los módulos del sistema. **No requiere auth.**

**Respuesta 200:**
```json
{
  "data": [
    { "id": "auth", "name": "Autenticación" },
    { "id": "spaces", "name": "Espacios y Aulas" }
  ]
}
```

### `GET /api/v1/roles`
Lista los roles del sistema. **No requiere auth.**

**Respuesta 200:**
```json
{
  "data": [
    { "id": "admin", "name": "Administrador" },
    { "id": "jefe_area", "name": "Jefe de Área" },
    { "id": "server", "name": "Server" }
  ]
}
```

---

## 2. Autenticación

### `POST /auth/login`
Inicia sesión y devuelve tokens.

**Body:**
```json
{ "email": "admin@prece.local", "password": "Admin123!" }
```

**Respuesta 200:**
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<uuid>",
  "tokenType": "Bearer",
  "user": {
    "id": "usr_1",
    "email": "admin@prece.local",
    "displayName": "Administrador",
    "assignments": [ { "role": "admin" } ],
    "isActive": true,
    "deactivatedAt": null
  }
}
```

**Posibles errores:**
| Código HTTP | `error` | Código |
|---|---|---|
| 400 | `invalid_credentials_payload` | email y contraseña obligatorios |
| 401 | `invalid_credentials` | credenciales inválidas o cuenta desactivada |

### `POST /auth/refresh`
Rota el refresh token y emite uno nuevo.

**Body:** `{ "refreshToken": "<token>" }`

**Respuesta 200:** igual a `login`.

### `POST /auth/logout`
Invalida el refresh token.

**Body:** `{ "refreshToken": "<token>" }`

**Respuesta 200:**
```json
{ "ok": true, "message": "Sesión cerrada" }
```

### `GET /auth/me`
Devuelve los datos del usuario autenticado.

**Respuesta 200:**
```json
{ "data": { "id": "usr_1", "email": "...", "displayName": "...", "assignments": [], "isActive": true, "deactivatedAt": null } }
```

### `GET /auth/users` · Permiso `users.read`
Lista todos los usuarios.

**Respuesta 200:** `{ "data": [ ... ] }`

### `POST /auth/users/:userId/deactivate` · Permiso `users.deactivate`
Desactiva la cuenta de un usuario.

**Respuesta 200:** `{ "data": { "id": "...", "isActive": false, "deactivatedAt": "<iso>" } }`

---

## 3. Estructura Académica Base (cursos, divisiones, materias)

Permisos: `academics.read`, `academics.write`, `academics.manage`.

### `GET /api/v1/courses`
Lista cursos. Filtros: `schoolId`, `careerId`, `includeInactive`.

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "crs_...",
      "name": "1° Año",
      "code": "1A",
      "careerId": "car_...",
      "order": 1,
      "schoolId": "esc-1",
      "isActive": true,
      "createdAt": "<iso>",
      "updatedAt": "<iso>"
    }
  ]
}
```

### `POST /api/v1/courses` · Permiso `academics.write`
Crea un curso (año).

**Body:**
```json
{
  "name": "1° Año",
  "code": "1A",
  "careerId": "car_...",
  "order": 1,
  "schoolId": "esc-1"
}
```

**Respuesta 201:** `{ "data": { "id": "crs_...", ... } }`

**Errores:** `400` `validation_error` (campos requeridos: `name`, `code`, `schoolId`).

### `GET /api/v1/courses/:courseId` · Permiso `academics.read`
Detalle de un curso.

**Respuesta 200:** `{ "data": { ... } }` — **404** `not_found` si no existe.

### `PATCH /api/v1/courses/:courseId` · Permiso `academics.write`
Actualiza parcialmente un curso.

**Body:** cualquier campo del curso.

**Respuesta 200:** `{ "data": { ... } }`

### `DELETE /api/v1/courses/:courseId` · Permiso `academics.manage`
Baja lógica de un curso.

**Respuesta 200:** `{ "data": { "isActive": false, ... } }`

---

### `GET /api/v1/divisions`
Lista divisiones. Filtros: `schoolId`, `courseId`, `shiftId`, `includeInactive`.

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "div_...",
      "name": "1° A",
      "code": "1A-DIV",
      "courseId": "crs_...",
      "shiftId": "shf_...",
      "schoolId": "esc-1",
      "turno": "manana",
      "isActive": true
    }
  ]
}
```

### `POST /api/v1/divisions` · Permiso `academics.write`
Crea una división.

**Body:**
```json
{
  "name": "1° A",
  "code": "1A-DIV",
  "courseId": "crs_...",
  "shiftId": "shf_...",
  "turno": "manana",
  "schoolId": "esc-1"
}
```

**Respuesta 201:** `{ "data": { "id": "div_...", ... } }`

**Turnos válidos (`turno`):** `manana`, `tarde`, `contraturno`.

**Errores:** `400` `validation_error` (turno inválido o campos requeridos: `name`, `code`, `courseId`, `schoolId`).

### `GET /api/v1/divisions/:divisionId` · Permiso `academics.read`
Detalle de una división.

**Respuesta 200:** `{ "data": { ... } }` — **404** `not_found`.

### `PATCH /api/v1/divisions/:divisionId` · Permiso `academics.write`
Actualiza una división.

**Respuesta 200:** `{ "data": { ... } }`

### `DELETE /api/v1/divisions/:divisionId` · Permiso `academics.manage`
Baja lógica de una división.

**Respuesta 200:** `{ "data": { "isActive": false, ... } }`

---

### `GET /api/v1/subjects`
Lista materias. Filtros: `schoolId`, `careerId`, `courseId`, `area`, `includeInactive`.

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "sub_...",
      "name": "Matemática",
      "code": "MAT",
      "careerId": "car_...",
      "courseId": "crs_...",
      "area": "Científica",
      "hoursPerWeek": 5,
      "requiresWorkshop": false,
      "schoolId": "esc-1",
      "isActive": true
    }
  ]
}
```

### `POST /api/v1/subjects` · Permiso `academics.write`
Crea una materia.

**Body:**
```json
{
  "name": "Matemática",
  "code": "MAT",
  "careerId": "car_...",
  "courseId": "crs_...",
  "area": "Científica",
  "hoursPerWeek": 5,
  "requiresWorkshop": false,
  "schoolId": "esc-1"
}
```

**Respuesta 201:** `{ "data": { "id": "sub_...", ... } }`

### `GET /api/v1/subjects/:subjectId` · Permiso `academics.read`
Detalle de una materia.

**Respuesta 200:** `{ "data": { ... } }` — **404** `not_found`.

### `PATCH /api/v1/subjects/:subjectId` · Permiso `academics.write`
Actualiza una materia.

**Respuesta 200:** `{ "data": { ... } }`

### `DELETE /api/v1/subjects/:subjectId` · Permiso `academics.manage`
Baja lógica de una materia.

**Respuesta 200:** `{ "data": { "isActive": false, ... } }`

---

### `GET /api/v1/academic-assignments`
Lista asignaciones docente-materia. Filtros: `schoolId`, `subjectId`, `teacherId`, `courseId`, `divisionId`, `careerId`.

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "aca_...",
      "subjectId": "sub_...",
      "teacherId": "tch_...",
      "courseId": "crs_...",
      "divisionId": "div_...",
      "shiftId": "shf_...",
      "careerId": "car_...",
      "periodId": "2026",
      "schoolId": "esc-1",
      "isActive": true
    }
  ]
}
```

### `POST /api/v1/academic-assignments` · Permiso `academics.write`
Asigna un docente a una materia en una división.

**Body:**
```json
{
  "subjectId": "sub_...",
  "teacherId": "tch_...",
  "courseId": "crs_...",
  "divisionId": "div_...",
  "shiftId": "shf_...",
  "careerId": "car_...",
  "periodId": "2026",
  "schoolId": "esc-1"
}
```

**Respuesta 201:** `{ "data": { "id": "aca_...", ... } }`

**Errores:**
| Código HTTP | `error` | Motivo |
|---|---|---|
| 400 | `validation_error` | campos requeridos: `subjectId`, `teacherId`, `courseId`, `divisionId`, `schoolId` |
| 409 | `conflict` | ya existe la asignación docente para esa materia/división |

### `GET /api/v1/academic-assignments/:assignmentId` · Permiso `academics.read`
Detalle de una asignación.

**Respuesta 200:** `{ "data": { ... } }` — **404** `not_found`.

### `PATCH /api/v1/academic-assignments/:assignmentId` · Permiso `academics.write`
Actualiza una asignación.

**Respuesta 200:** `{ "data": { ... } }`

### `DELETE /api/v1/academic-assignments/:assignmentId` · Permiso `academics.manage`
Quita la asignación (baja lógica).

**Respuesta 200:** `{ "data": { "isActive": false, ... } }`

---

## 4. Espacios, Pabellones y Carreras

Permisos: `spaces.read`, `spaces.write`, `spaces.manage`.

### `GET /api/v1/spaces` · Permiso `spaces.read`
Lista espacios. Filtros: `schoolId`, `buildingId`, `type`, `includeInactive`.

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "spc_...",
      "name": "Taller Mecánica",
      "code": "TL-MEC",
      "type": "taller",
      "capacity": 20,
      "buildingId": "bld_...",
      "floor": 1,
      "sector": "Sector A",
      "hasProjector": true,
      "hasComputers": false,
      "hasWorkshop": true,
      "schoolId": "esc-1",
      "isActive": true
    }
  ]
}
```

### `POST /api/v1/spaces` · Permiso `spaces.write`
Crea un espacio.

**Body:**
```json
{
  "name": "Taller Mecánica",
  "code": "TL-MEC",
  "type": "taller",
  "capacity": 20,
  "buildingId": "bld_...",
  "floor": 1,
  "sector": "Sector A",
  "hasProjector": true,
  "hasWorkshop": true,
  "schoolId": "esc-1"
}
```

**Respuesta 201:** `{ "data": { "id": "spc_...", ... } }`

**Tipos válidos (`type`):** `aula`, `taller`, `laboratorio`, `auditorio`, `sala`, `otro`.

**Errores:** `400` `validation_error` (campos: `name`, `code`, `type`, `schoolId`; o tipo inválido).

### `GET /api/v1/spaces/:spaceId` · Permiso `spaces.read`
Detalle de un espacio. **Respuesta 200** / **404** `not_found`.

### `PATCH /api/v1/spaces/:spaceId` · Permiso `spaces.write`
Actualiza un espacio. **Respuesta 200** / **404**.

### `DELETE /api/v1/spaces/:spaceId` · Permiso `spaces.manage`
Baja lógica. **Respuesta 200** `{ "data": { "isActive": false, ... } }`.

### Edificios (`/api/v1/buildings`)
CRUD análogo al de espacios: `GET` (listar), `POST` (crear, **201**), `GET /:buildingId`, `PATCH /:buildingId`. Requiere `spaces.read` / `spaces.write`.
- Alta: `{ "name", "code", "floors", "schoolId" }`.

### Carreras (`/api/v1/careers`)
CRUD análogo: `GET`, `POST` (**201**), `GET /:careerId`, `PATCH /:careerId`. Requiere `spaces.read` / `spaces.write`.
- Alta: `{ "name", "code", "duration", "schoolId" }`.

---

## 5. Horarios

Permisos: `schedules.read`, `schedules.write`, `schedules.manage`.

### Turnos (`/api/v1/shifts`)
- `GET` lista (filtro `schoolId`).
- `POST` crea (**201**): `{ "name", "code", "startTime", "endTime", "schoolId" }`.
- `GET /:shiftId`, `PATCH /:shiftId`.

### Franjas horarias (`/api/v1/time-slots`)
- `GET` lista (filtros `schoolId`, `shiftId`, `dayOfWeek`).
- `POST` crea (**201**): `{ "name", "dayOfWeek", "startTime", "endTime", "shiftId", "schoolId" }`.
- **Días válidos:** `lunes`, `martes`, `miercoles`, `jueves`, `viernes`, `sabado`.
- `GET /:timeSlotId`, `PATCH /:timeSlotId`.

### Horarios (`/api/v1/schedules`)
- `GET` lista (filtros `schoolId`, `year`).
- `POST` crea (**201**): `{ "name", "year", "period", "startDate", "endDate", "schoolId" }`.
- `GET /:scheduleId`, `PATCH /:scheduleId`.

### Asignaciones horarias (`/api/v1/schedule-assignments`)
Asignan un espacio+docente+materia a una franja. Detectan **conflictos de espacio y de docente**.

`POST` (**201**):
```json
{
  "scheduleId": "sch_...",
  "timeSlotId": "tsl_...",
  "spaceId": "spc_...",
  "subjectId": "sub_...",
  "teacherId": "tch_...",
  "courseId": "crs_...",
  "divisionId": "div_...",
  "schoolId": "esc-1"
}
```

**Errores:** `409` `conflict` si el espacio o el docente ya tienen asignación en esa franja.

- `GET` lista (filtros: `scheduleId`, `timeSlotId`, `spaceId`, `teacherId`, `courseId`).
- `GET /:assignmentId`, `PATCH /:assignmentId`, `DELETE /:assignmentId` (`schedules.manage`).

---

## 6. Docentes

Permisos: `teachers.read`, `teachers.write`, `teachers.manage`.

### `POST /api/v1/teachers` · `teachers.write`
```json
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "documentNumber": "30123456",
  "documentType": "dni",
  "email": "juan@prece.local",
  "phone": "1155551234",
  "schoolId": "esc-1"
}
```
**Respuesta 201:** `{ "data": { "id": "tch_...", ... } }`

**Errores:** `400` (campos requeridos) · `409` `conflict` (documento duplicado en la escuela).

### Otros recursos
- `GET /api/v1/teachers` (lista) · `GET /api/v1/teachers/:teacherId` (detalle).
- `PATCH /api/v1/teachers/:teacherId` (actualiza).
- `POST /api/v1/teachers/:teacherId/deactivate` (`teachers.manage`) — baja lógica.
- `GET /api/v1/teacher-subjects` (lista asignaciones de materias).
- `POST /api/v1/teachers/:teacherId/subjects` (`teachers.write`) — asigna materia.
- `DELETE /api/v1/teacher-subjects/:assignmentId` (`teachers.manage`) — quita asignación.

---

## 7. Ausencias y Novedades

Permisos: `absences.read`, `absences.write`, `absences.manage`.

### `POST /api/v1/absences` · `absences.write`
```json
{
  "teacherId": "tch_...",
  "date": "2026-09-10",
  "startTime": "07:30",
  "endTime": "10:00",
  "type": "justificada",
  "reason": "Licencia médica",
  "documented": true,
  "schoolId": "esc-1"
}
```
**Respuesta 201:** `{ "data": { "id": "abs_...", "status": "pendiente", ... } }`

**Tipos (`type`):** `injustificada`, `justificada`, `medica`, `personal`, `capacitacion`, `otra`.
**Estados (`status`):** `pendiente`, `aprobada`, `rechazada`, `cancelada`.

### Otros recursos
- `GET /api/v1/absences` (filtros: `teacherId`, `date`, `startDate`, `endDate`, `status`).
- `GET /api/v1/absences/:absenceId` · `PATCH /api/v1/absences/:absenceId` (cambia estado) · `DELETE /api/v1/absences/:absenceId`.

### Novedades / Incidentes (`/api/v1/incidents`)
- `POST` crea (**201**): `{ "teacherId", "date", "type", "description", "severity", "schoolId" }`.
  - **Tipos:** `comportamiento`, `academica`, `disciplinaria`, `administrativa`, `otra`.
  - **Severidad:** `leve`, `moderada`, `grave`, `muy_grave`.
  - **Estados:** `abierta`, `en_revision`, `resuelta`, `cerrada`.
- `GET` lista · `GET /:incidentId` · `PATCH /:incidentId`.

---

## 8. Talleres

Permisos: `workshops.read`, `workshops.write`.

### `POST /api/v1/workshops` · `workshops.write`
```json
{
  "name": "Taller de Robótica",
  "code": "WR-1",
  "careerId": "car_...",
  "spaceId": "spc_...",
  "teacherId": "tch_...",
  "capacity": 15,
  "groupType": "par",
  "schoolId": "esc-1"
}
```
**Respuesta 201:** `{ "data": { "id": "wrk_...", ... } }`

**Tipos de grupo (`groupType`):** `completo`, `par`, `impar`, `personalizado` (por defecto `completo`).

### Otros recursos
- `GET /api/v1/workshops` (filtros: `careerId`, `teacherId`, `spaceId`).
- `GET /api/v1/workshops/:workshopId` · `PATCH /api/v1/workshops/:workshopId`.
- `POST /api/v1/workshops/:workshopId/deactivate`.

### Sesiones (`/api/v1/workshop-sessions`)
- `POST` crea (**201**): `{ "workshopId", "date", "startTime", "endTime", "topic", "schoolId" }`.
- `GET` lista (filtros: `workshopId`, `date`, `startDate`, `endDate`, `status`).
- `GET /:sessionId` · `PATCH /:sessionId`.
  - **Estados:** `programada`, `en_curso`, `completada`, `cancelada`.

---

## 9. Inventario

Permisos: `inventory.read`, `inventory.write`, `inventory.manage`.

### `POST /api/v1/inventory` · `inventory.write`
```json
{
  "name": "Proyector Epson",
  "code": "PR-001",
  "category": "tecnologia",
  "brand": "Epson",
  "model": "EB-X05",
  "quantity": 2,
  "minQuantity": 1,
  "spaceId": "spc_...",
  "schoolId": "esc-1"
}
```
**Respuesta 201:** `{ "data": { "id": "inv_...", "status": "disponible", ... } }`

**Categorías:** `mobiliario`, `equipamiento`, `material`, `herramienta`, `tecnologia`, `otro`.
**Estados:** `disponible`, `en_uso`, `mantenimiento`, `dado_de_baja`.

### Movimientos (`/api/v1/inventory-movements`)
- `POST` crea (**201**): `{ "itemId", "type", "quantity", "schoolId" }`.
  - **Tipos:** `ingreso`, `egreso`, `transferencia`, `ajuste`.
  - El egreso valida **stock suficiente** (error `400` si insuficiente) y actualiza el stock del ítem.
- `GET` lista (filtros: `itemId`, `type`, `startDate`, `endDate`).

### Otros recursos
- `GET /api/v1/inventory` (filtros: `category`, `spaceId`, `status`).
- `GET /api/v1/inventory/:itemId` · `PATCH /api/v1/inventory/:itemId` · `DELETE /api/v1/inventory/:itemId` (`inventory.manage`).

---

## 10. Solicitudes

Permisos: `requests.read`, `requests.write`, `requests.manage`.

### `POST /api/v1/requests` · `requests.write`
```json
{
  "title": "Necesito proyector",
  "description": "Para aula 12 en el turno tarde",
  "type": "recurso",
  "priority": "alta",
  "assignedToId": "usr_2",
  "schoolId": "esc-1"
}
```
**Respuesta 201:** `{ "data": { "id": "req_...", "status": "pendiente", "requesterId": "<id actor>", ... } }`

**Tipos:** `espacio`, `recurso`, `mantenimiento`, `material`, `tecnologia`, `academica`, `otra`.
**Prioridad:** `baja`, `normal`, `alta`, `urgente`.
**Estados:** `pendiente`, `en_progreso`, `resuelta`, `cerrada`, `rechazada`.

### Otros recursos
- `GET /api/v1/requests` (filtros: `type`, `status`, `priority`, `sector`, etc.).
- `GET /api/v1/requests/:requestId` · `PATCH /api/v1/requests/:requestId` (cambia estado, fija `resolvedAt` al resolver).
- `GET /api/v1/requests/:requestId/comments` · `POST /api/v1/requests/:requestId/comments` (agrega comentario: `{ "content" }`).

---

## 11. Reservas

Permisos: `reservations.read`, `reservations.write`, `reservations.manage`.

### `POST /api/v1/reservations` · `reservations.write`
```json
{
  "resourceType": "espacio",
  "resourceId": "spc_...",
  "date": "2026-09-20",
  "startTime": "14:00",
  "endTime": "16:00",
  "purpose": "Reunión de área",
  "schoolId": "esc-1"
}
```
**Respuesta 201:** `{ "data": { "id": "res_...", "status": "pendiente", ... } }`

**Tipos de recurso:** `espacio`, `recurso`, `aula`, `taller`, `laboratorio`.
**Estados:** `pendiente`, `confirmada`, `rechazada`, `cancelada`.

**Errores:**
| Código HTTP | `error` | Motivo |
|---|---|---|
| 400 | `validation_error` | hora fin <= hora inicio, o campos requeridos |
| 409 | `conflict` | el recurso ya está reservado en ese horario |

### Otros recursos
- `GET /api/v1/reservations` (filtros: `resourceType`, `resourceId`, `date`, `status`).
- `GET /api/v1/reservations/:reservationId` · `PATCH /api/v1/reservations/:reservationId`.
- `POST /api/v1/reservations/:reservationId/approve` (`reservations.manage`) → `confirmada`.
- `POST /api/v1/reservations/:reservationId/reject` (`reservations.manage`) → `rechazada`.
- `POST /api/v1/reservations/:reservationId/cancel` (`reservations.write`) → `cancelada`.

---

## 12. Notificaciones

Permisos: `notifications.read`, `notifications.write`.

### `GET /api/v1/notifications`
Lista las notificaciones del usuario autenticado (o de `recipientId` si se pasa).

**Respuesta 200:**
```json
{
  "data": [
    {
      "id": "ntf_...",
      "recipientId": "usr_...",
      "title": "Nueva solicitud",
      "body": "Se asignó una solicitud a tu sector",
      "type": "solicitud",
      "isRead": false,
      "readAt": null,
      "createdAt": "<iso>"
    }
  ]
}
```

### Otros recursos
- `POST /api/v1/notifications` (`notifications.write`) — crea: `{ "recipientId", "title", "body", "type", "schoolId" }`.
  - **Tipos:** `sistema`, `solicitud`, `reserva`, `ausencia`, `inventario`, `mensaje`, `recordatorio`.
- `POST /api/v1/notifications/read-all` — marca todas como leídas.
- `GET /api/v1/notifications/unread-count` — `{ "data": { "unreadCount": N } }`.
- `GET /api/v1/notifications/:notificationId` · `POST /api/v1/notifications/:notificationId/read` (verifica propiedad: `403` si no es del usuario).

---

## 13. Seguimiento Curricular

Permisos: `curriculum.read`, `curriculum.write`, `curriculum.manage`.

### Áreas (`/api/v1/curriculum-areas`)
- `POST` crea (**201**): `{ "name", "code", "description", "schoolId" }`.
- `GET` lista (filtros: `responsibleId`) · `GET /:areaId` · `PATCH /:areaId`.

### Planes (`/api/v1/curriculum-plans`)
- `POST` crea (**201**): `{ "title", "areaId", "description", "startDate", "endDate", "objectives", "schoolId" }`.
  - **Estados:** `borrador`, `aprobado`, `en_ejecucion`, `finalizado`, `archivado`.
- `GET` lista (filtros: `areaId`, `status`) · `GET /:planId` · `PATCH /:planId`.

### Actividades (`/api/v1/curriculum-activities`)
- `POST` crea (**201**): `{ "planId", "title", "description", "type", "scheduledDate", "schoolId" }`.
  - **Tipos:** `actividad`, `evaluacion`, `tarea`, `obra`, `proyecto`, `otra`.
  - **Estados:** `pendiente`, `en_progreso`, `completada`, `cancelada` (al completarla fija `completedDate`).
- `GET` lista (filtros: `planId`, `status`, `type`) · `GET /:activityId` · `PATCH /:activityId`.

---

## Roles y permisos

Roles disponibles:

| Rol | Acceso principal |
|---|---|
| `admin` | Todos los permisos |
| `director` | Todos los permisos |
| `secretario` | Lectura de la mayoría; gestión de estudiantes y documentos |
| `preceptor` | Asistencias, estudiantes, lectura académica/espaacios |
| `docente` | Asistencias, calificaciones, sus materias |
| `jefe_area` | Horarios, docentes, ausencias, talleres, curriculum (lectura/escritura) |
| `server` | Espacios, horarios, inventario, solicitudes, reservas (gestión completa) |

---

## Códigos de error comunes

| Código HTTP | `error` | Descripción |
|---|---|---|
| 400 | `validation_error` | Datos inválidos o campos requeridos faltantes |
| 401 | `unauthenticated` / `invalid_credentials` | Sesión no válida |
| 403 | `forbidden` | Sin permiso para la acción/alcance |
| 404 | `not_found` | Recurso inexistente |
| 409 | `conflict` | Conflicto de unicidad / disponibilidad |
| 500 | `internal_error` | Error interno del servidor |