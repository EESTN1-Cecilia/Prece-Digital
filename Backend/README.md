# Prece Digital - Backend

API de Prece Digital en Node.js (sin framework): autenticación, permisos, lógica de negocio, persistencia y auditoría.

Forma parte del monorepo `Prece-Digital`: se trabaja desde la raíz (ver `README.md` de la raíz).

## Comandos

Desde `Backend/` (o desde la raíz con `-w @prece-digital/api`):

```bash
npm run dev              # API con nodemon en http://localhost:3000
npm start                # API sin recarga
npm test                 # tests (node:test, sin base de datos)
npm run docs:endpoints   # regenera docs/ENDPOINTS.md desde routes/index.mjs
```

Variables de entorno: copiar `.env.example` a `.env`.

## Usuarios de desarrollo

Fuera de producción la API arranca con datos de todos los módulos (`database/seeds/index.mjs`).

| Email | Contraseña | Rol |
| --- | --- | --- |
| `admin@prece.local` | `Admin123!` | admin |
| `director@prece.local` | `Director123!` | director |
| `secretario@prece.local` | `Secretaria123!` | secretario |
| `preceptor@prece.local` | `Preceptor123!` | preceptor |
| `docente@prece.local` | `Docente123!` | docente |
| `jefearea@prece.local` | `JefeArea123!` | jefe_area |
| `server@prece.local` | `Server123!` | server |

## Estructura

```text
config/        app.config (entorno) y permissions.config (roles -> permisos)
controllers/   controladores transversales (health, catálogo, autorización)
database/      memory-store, repositorios transversales, seeds, schema.sql (modelo objetivo)
docs/          ENDPOINTS.md (generado)
middlewares/   auth (verifyToken), authorize, cors, errores, not-found
modules/       un módulo por dominio: <x>.controller -> <x>.service -> <x>.repository
routes/        index.mjs: registro único de rutas
scripts/       generar-endpoints, auth-smoke
src/           app.mjs (servidor HTTP) y server.mjs (arranque)
test/          tests de integración y unidad
utils/         api-error, http-response, read-body
```

## Convenciones

### Rutas

Una sola lista en `routes/index.mjs`:

```js
{ method: "GET", path: "/api/v1/students/:studentId", middlewares: [verifyToken, required(P.STUDENTS_READ)], handler: studentsController.obtenerAlumno }
```

- `:nombre` llega al handler en `params`. El cuerpo JSON llega en `body` (lo lee `utils/read-body.mjs`).
- `required(P.X)` falla al arrancar si el permiso no existe en `config/permissions.config.mjs`.
- Referencia completa: [`docs/ENDPOINTS.md`](docs/ENDPOINTS.md). Cuerpos y filtros: README de cada módulo.

### Autenticación y permisos

- Login con JWT (`/api/v1/auth/login`) + refresh token rotativo.
- `verifyToken` deja el usuario en `ctx.user`; `authorize` evalúa sus roles contra `config/permissions.config.mjs`, respetando el alcance (`schoolId`, `courseId`, ...).
- Un permiso es siempre `<modulo>.<accion>` (`students.read`, `identity.update`). Módulos y roles: `Shared/src/domain.mjs`.
- `PUT /api/v1/authorization/roles/:codigo/permissions` cambia la matriz de un rol en tiempo de ejecución.

### Respuestas

- Éxito: el handler devuelve `{ data }` (200) o `{ statusCode, body }` para otro código.
- Error: se lanza un `ApiError` (`utils/api-error.mjs`) y `middlewares/error.middleware.mjs` responde:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Los datos enviados no son validos.", "details": [{ "field": "dni", "message": "..." }] } }
```

| Situación | Helper | HTTP |
| --- | --- | --- |
| Datos inválidos por campo | `errorDeValidacion(details)` | 422 |
| Solicitud mal formada | `solicitudInvalida()` | 400 |
| Sin autenticación | `noAutenticado()` / `MISSING_TOKEN` / `INVALID_TOKEN` | 401 |
| Sin permiso | `sinPermisos()` / `FORBIDDEN` | 403 |
| Inexistente | `noEncontrado("El curso solicitado")` | 404 |
| Conflicto | `conflicto()` | 409 |
| Otro código | `errorHttp(status, "CODIGO", mensaje)` | — |
| No previsto | — | 500 genérico |

Los códigos van en `MAYUSCULAS_CON_GUION_BAJO`.

### Persistencia

Todos los módulos persisten en el store en memoria (`database/memory-store.mjs`) a través de su repositorio. Los alumnos tienen una sola fuente (`modules/students/students.repository.mjs`) que usan también `academic`, `academic-records` y `tutors`.

`database/schema.sql` es el modelo objetivo para MySQL/PostgreSQL. La migración se hace módulo por módulo reemplazando el repositorio, sin tocar controladores ni servicios.

## Contrato con el Frontend

`test/contrato-frontend.test.mjs` recorre `Frontend/web/src` y falla si el frontend llama a un endpoint que no existe en `routes/index.mjs`. `test/documentacion.test.mjs` falla si `docs/ENDPOINTS.md` o las rutas citadas en los README no coinciden con el código.
