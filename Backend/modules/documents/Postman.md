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

### Eventos de ausencia y notificaciones (`/api/v1/absence-events`)
Cuando se registra una ausencia activa, el backend detecta la actividad afectada, genera un evento y notifica a través del sistema general de notificaciones. Los destinatarios se resuelven siempre en el servidor (el frontend nunca los elige).

**Reglas de destinatarios:**
- Preceptoría (rol `preceptor`) de la escuela de la ausencia: siempre.
- Dirección (rol `director`) de la misma escuela: solo para tipos `medica`, `personal`, `injustificada`.
- Una notificación por destinatario y evento (sin duplicados). Los eventos se conservan aunque luego se anule la ausencia o se reasigne el grupo.

- `POST /api/v1/absence-events` · `absences.write` genera el evento a partir de una ausencia válida. **Idempotente**: si el evento ya existe devuelve 200 con `created: false` y no duplica notificaciones.
  ```json
  { "absenceId": "abs_..." }
  ```
  **Respuesta 201/200:** `{ "data": { "event": { ... }, "absence": { ... }, "affectedClass": { ... }, "notifications": [ ... ], "created": true|false } }`

- `GET /api/v1/absence-events` · `absences.read` lista eventos (filtros: `absenceId`, `teacherId`, `courseId`, `divisionId`, `subjectId`, `spaceId`, `date`, `startDate`, `endDate`, `status`).
- `GET /api/v1/absence-events/by-absence/:absenceId` · `absences.read`.
- `GET /api/v1/absence-events/:eventId` · `absences.read` devuelve el evento enriquecido (docente, espacio, asignación, reasignación vigente y cantidad de notificaciones).
- `GET /api/v1/absence-events/:eventId/affected-classes` · `absences.read` (clases afectadas con estado de clase y espacio actual, reflejando reasignaciones).
- `GET /api/v1/absence-events/:eventId/class-state` · `absences.read` (`sin_clase` con ausencia activa, `con_clase` si fue anulada).
- `GET /api/v1/absence-events/:eventId/space-availability` · `absences.read` (espacio liberado para el día y horario de la clase afectada).
- `GET /api/v1/absence-events/:eventId/notifications` · `absences.read` (notificaciones generadas para el evento).

**Errores:** 404 evento/ausencia/docente/asignación/espacio inexistente · 409 ausencia no activa · 422 asignación que no corresponde al docente.

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
  "description": "Proyector del aula de informatica",
  "category": "tecnologia",
  "quantity": 2,
  "minQuantity": 1,
  "unit": "unidad",
  "status": "disponible",
  "location": "Server - Estante A"
}
```
**Respuesta 201:** `{ "data": { "id": "inv_...", "createdBy": "usr_...", ... } }`

**Categorías:** `mobiliario`, `equipamiento`, `material`, `herramienta`, `tecnologia`, `otro`.
**Estados:** `disponible`, `agotado`, `danado`, `en_reparacion`, `inactivo`.

### Stock
- `GET /api/v1/inventory/:itemId/stock` → stock vigente con nivel (`normal`, `bajo`, `agotado`).
- `GET /api/v1/inventory/stock-low` → materiales con stock bajo o agotado.
- `GET /api/v1/inventory/:itemId/stock/verify` → auditoría: reconstruye el stock
  desde el historial y devuelve `{ "stockActual", "stockCalculado", "consistente" }`.

### Movimientos
- `POST /api/v1/inventory/:itemId/movements` · `inventory.write` crea (**201**) con `{ "type", "quantity", "reason", "observations" }`.
  - **Tipos:** `alta`, `baja`, `donacion`, `prestamo`, `devolucion`.
  - `alta`, `donacion`, `devolucion` **incrementan**; `baja`, `prestamo` **decrementan**.
  - La baja/préstamo valida **stock suficiente** (error `422` si insuficiente); el stock nunca queda negativo.
  - `cantidad` siempre entero > 0; `motivo` obligatorio; responsable desde la sesión autenticada.
  - `devolucion` admite `referenceMovementId` (opcional): debe referenciar un `prestamo`
    del mismo material y no puede superar el saldo pendiente.
- `POST /api/v1/inventory/:itemId/movements/adjust` · `inventory.manage` → ajuste con
  `{ "nuevoStock", "reason", "observations" }`: fija el stock al valor objetivo.
- `GET /api/v1/inventory/:itemId/movements` (filtros: `type`, `motivo`, `fromDate`, `toDate`).
- `GET /api/v1/inventory-movements` (filtros: `itemId`, `type`, `userId`, `motivo`, `fromDate`, `toDate`).
- `GET /api/v1/inventory-movements/:movementId` → consulta de un movimiento por ID.

### Otros recursos
- `GET /api/v1/inventory` (filtros: `category`, `status`, `location`, `unit`, `search`, `includeInactive`).
- `GET /api/v1/inventory/:itemId` · `PATCH /api/v1/inventory/:itemId` (`inventory.write`) · `DELETE /api/v1/inventory/:itemId` (`inventory.manage`).
- `GET /api/v1/inventory/:itemId/history` → historial de modificaciones de datos.

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

### Avance curricular (`/api/v1/curriculum/materias`, `/disenos`, `/contenidos`, `/seguimientos`, `/avance`)
El avance de un contenido se deriva siempre del último seguimiento: no se puede
fijar `progress` ni `status` manualmente sobre un contenido (`422`).

Materias (escritura con `academics.write`):
- `POST /api/v1/curriculum/materias` — `{ "name", "code", "schoolId" }` (código único por escuela, `409` si se repite).
- `GET /api/v1/curriculum/materias` (filtro: `includeInactive`) · `GET /:subjectId` · `PATCH /:subjectId`.

Diseños (escritura con `curriculum.manage`):
- `POST /api/v1/curriculum/disenos` — `{ "subjectId", "year", "courseId", "divisionId", "name", "objectives", "status", "schoolId" }`.
  - **Estados:** `borrador`, `vigente`, `archivado` (uno por materia + año + curso, `409` si se repite; año entre 2000 y 2100).
- `GET /api/v1/curriculum/disenos` (filtros: `subjectId`, `courseId`, `year`, `status`) · `GET /:designId` · `PATCH /:designId`.

Contenidos (escritura con `curriculum.write`):
- `POST /api/v1/curriculum/contenidos` — `{ "designId", "name", "description", "teacherId", "order" }`.
  - **Estados:** `no_iniciado`, `en_desarrollo`, `parcialmente_desarrollado`, `desarrollado`, `no_desarrollado`, `reprogramado`.
  - El docente debe estar activo y asociado a la materia y curso del diseño (`422`). Nombre único por diseño (`409`).
- `GET /api/v1/curriculum/contenidos` (filtros: `designId`, `subjectId`, `teacherId`, `courseId`, `status`, `pendiente`, `year`).
- `GET /api/v1/curriculum/contenidos/pendientes` — contenidos en `no_iniciado` / `no_desarrollado`.
- `GET /:contentId` · `GET /:contentId/seguimientos` · `GET /:contentId/historial` · `PATCH /:contentId`.

Seguimientos (escritura con `curriculum.track.write`):
- `POST /api/v1/curriculum/seguimientos` — `{ "contentId", "status", "progress", "note", "date" }` (fecha en `YYYY-MM-DD`).
  - El avance del contenido se sincroniza con el último seguimiento. Un docente solo registra seguimientos de los contenidos a su cargo (`403`).
- `GET /api/v1/curriculum/seguimientos` (filtros: `contentId`, `designId`, `subjectId`, `teacherId`, `status`, `year`).
- `GET /:trackingId` · `PATCH /:trackingId`.

Avance (lectura con `curriculum.read`):
- `GET /api/v1/curriculum/avance/materia` · `/avance/curso` · `/avance/docente` · `/avance/periodo` · `/avance/pendientes`.
  - Cada reporte expone `total`, `pendientes`, `desarrollados`, `enProceso` y `promedio`, con `resumen` global.

---

## 14. Planificaciones Docentes

Base: `/api/v1/teacher-plans`. Permisos: `planning.read`, `planning.write`, `planning.review`, `planning.manage`.

### Creación y edición
- `POST /api/v1/teacher-plans` (**201**): `{ "title", "teacherId", "subjectId", "courseId", "divisionId", "year", "period", "contents", "activities", "observations", "schoolId" }`.
  - Requeridos: `title`, `teacherId`, `subjectId`, `courseId`, `year` (entero entre 2000 y 2100).
  - El docente debe estar activo y asociado a esa materia, curso y división (`422`); un docente solo crea a su nombre (`403`).
  - Combinación `teacherId + subjectId + courseId + divisionId + year` única (`409`).
  - **Períodos:** `anual`, `primer_cuatrimestre`, `segundo_cuatrimestre`, `primer_trimestre`, `segundo_trimestre`, `tercer_trimestre`.
  - `contents[]`: `{ "name", "description", "estimatedHours" }` · `activities[]`: `{ "name", "type", "description", "date" }`.
  - **Tipos de actividad:** `clase`, `taller`, `evaluacion`, `tarea`, `proyecto`, `informe`, `otra`.
  - Siempre nace en `borrador`.
- `PATCH /:planId` — actualiza `title`, `period`, `contents`, `activities`, `observations`. No admite cambios de asociación ni de estado (`422`).
  - En `aprobada` o `finalizada` el contenido solo se edita con `planning.manage` (`403`); `archivada` es inmutable (`409`).

### Estados
`PATCH /:planId/status` — `{ "status", "comment" }`. Transiciones:
`borrador → en_revision|archivada` · `en_revision → borrador|aprobada|observada|archivada` · `observada → borrador|en_revision|archivada` ·
`aprobada → finalizada|archivada` · `finalizada → archivada` · `archivada → ninguna`.
- El permiso se evalúa por estado destino: `planning.write` (`en_revision`), `planning.review` (`aprobada`, `observada`, `finalizada`), `planning.manage` (`archivada`).
- Repetir el estado actual devuelve `409`; `observada` exige `comment` (`422`).
- `DELETE /:planId` (`planning.manage`) archiva sin borrar el historial.

### Consulta
- `GET /api/v1/teacher-plans` (filtros: `teacherId`, `subjectId`, `courseId`, `divisionId`, `year`, `period`, `status`; orden: `orden`, `direccion`; paginación: `pagina`, `porPagina`).
  - Respuesta: `data`, `filtros` y `paginacion` (`total`, `pagina`, `porPagina`, `totalPaginas`).
  - Un docente sin `planning.review` ni `planning.manage` solo lista sus propias planificaciones.
- `GET /api/v1/teacher-plans/by-teacher/:teacherId` · `by-subject/:subjectId` · `by-course/:courseId` · `by-period/:year`.
- `GET /:planId` · `GET /:planId/status` (estado, `allowedTransitions` con su permiso, `canEditContent`) · `GET /:planId/history`.

### Integración curricular
- `GET /:planId/curriculum-comparison` — cruza lo planificado con los contenidos del seguimiento curricular del mismo `subjectId`, `courseId`, `divisionId` y `year`, emparejando nombres sin acentos ni mayúsculas.
  - Devuelve `planificados` (con su `seguimiento` o `null`), `sinPlanificar` y `resumen` con `conSeguimiento`, `sinSeguimiento`, `contenidosCurriculum` y `promedioAvance`.

---

## 15. Control de Planificación

Base: `/api/v1/planning-controls`. Solo lectura con `planning.read`; registro, modificación y
transiciones con `planning.review` (la transición a `finalizada` exige `planning.manage`).
El responsable (`reviewedBy`) y la auditoría se toman siempre de la sesión.

### Registro (escritura con `planning.review`)
- `POST /api/v1/planning-controls` (**201**): `{ "planningId", "contents", "curriculumMatch", "observations", "status", "reviewDate" }`.
  - Requeridos: `planningId` y `contents[]`. La planificación debe existir (`404`), ser de la escuela del usuario (`403`), tener docente activo (`422`) y contar con diseño curricular vigente para su materia, curso, división y año (`422`).
  - **Estados:** `pendiente`, `en_revision`, `aprobada`, `aprobada_con_observaciones`, `requiere_correccion`, `finalizada`. Se crea en `pendiente` o `en_revision`.
  - **Correspondencia con el diseño:** `total`, `parcial`, `no_coincide`, `no_evaluado`.
  - `contents[]`: `{ "name", "description", "plannedContentName", "curriculumContentId", "evaluated" }`.
    - `plannedContentName` debe existir en la planificación y `curriculumContentId` en el diseño vigente, con nombre coincidente (`422`).
    - `total` exige todos los contenidos evaluados y vinculados; `parcial` exige al menos uno evaluado y observaciones; `no_coincide` y `requiere_correccion` exigen observaciones (`422`).
  - `reviewDate` en `YYYY-MM-DD`, nunca futura (`422`). No se admiten dos controles `pendiente` o `en_revision` para la misma planificación (`409`).
- `PATCH /api/v1/planning-controls/:controlId` — actualiza `contents`, `curriculumMatch`, `observations` y `reviewDate`; no cambia estado ni reasigna la planificación (`422`). Un control `finalizada` no admite cambios (`409`).
- `PATCH /api/v1/planning-controls/:controlId/status` — `{ "status", "observations", "comment" }`.
  - Transiciones: `pendiente → en_revision` · `en_revision → aprobada | aprobada_con_observaciones | requiere_correccion` · `requiere_correccion → en_revision` · `aprobada | aprobada_con_observaciones → finalizada` · `finalizada → ninguna`.
  - Repetir estado devuelve `409`; `aprobada_con_observaciones` y `requiere_correccion` exigen observaciones (`422`).

### Consultas (lectura con `planning.read`)
- `GET /api/v1/planning-controls` (filtros combinables: `planningId`, `teacherId`, `subjectId`, `courseId`, `divisionId`, `year`, `period`, `status`, `curriculumMatch`, `pendiente`; orden: `orden`, `direccion`; paginación: `pagina`, `porPagina`). Respuesta con `data`, `filtros` y `paginacion`.
- `GET /api/v1/planning-controls/pending` — controles `pendiente` y `en_revision`.
- `GET /api/v1/planning-controls/by-teacher/:teacherId` · `by-subject/:subjectId` · `by-course/:courseId` · `by-period/:year` · `by-status/:status`.
- `GET /api/v1/planning-controls/:controlId` — incluye `planningTitle`, `planningStatus`, `teacher`, `subjectName`, `allowedTransitions` e `historyCount`.
- `GET /api/v1/planning-controls/planning/:planId` — control vigente de la planificación (`404` si aún no tiene controles).
- `GET /api/v1/planning-controls/planning/:planId/history` — historial de revisiones de la planificación.
- `GET /api/v1/planning-controls/:controlId/history` — auditoría del control (`creacion`, `actualizacion`, `cambio_estado` con `changes`, `comment`, `performedBy`).

El estado del control es independiente del estado de la planificación: registrar o mover un control
nunca modifica `planificaciones_docentes.estado`.

---

## Roles y permisos

Roles disponibles:

| Rol | Acceso principal |
|---|---|
| `admin` | Todos los permisos |
| `director` | Todos los permisos |
| `secretario` | Lectura de la mayoría; gestión de estudiantes y documentos |
| `preceptor` | Asistencias, estudiantes, lectura académica/espaacios |
| `docente` | Asistencias, calificaciones, sus materias; seguimiento de sus contenidos (`curriculum.track.write`); sus planificaciones (`planning.write`) |
| `jefe_area` | Horarios, docentes, ausencias, talleres, curriculum (lectura/escritura), seguimiento y revisión de planificaciones y sus controles |
| `server` | Espacios, horarios, inventario, solicitudes, reservas (gestión completa), curriculum y planificaciones (gestión completa) |

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