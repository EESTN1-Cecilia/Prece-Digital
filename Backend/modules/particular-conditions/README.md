# Condiciones particulares de alumnos

Módulo de condiciones particulares: registra las condiciones informadas sobre un alumno (salud, accesibilidad, adaptaciones, situaciones familiares, etc.), permite consultarlas y finalizarlas, y conserva el historial completo de cada condición y de las condiciones de cada alumno. Por tratarse de información privada y sensible, el acceso está restringido por permisos y no se expone en otros endpoints.

## Modelo

- Condición: `alumnoId` + `descripcion` + `fechaInicio` + `estado` + responsable del registro.
- El `alumno` y el `dni` salen de `students.repository` (única fuente de alumnos); se exponen como texto (`"Apellido, Nombre"` y DNI en string).
- `escuelaId` se toma del padrón del alumno; el cliente no puede elegir la escuela.
- Estados centralizados en `catalogo.mjs` (`ESTADOS_CONDICION`): `activa` y `finalizada`. Agregar un estado nuevo (por ejemplo `suspendida`) es agregar una fila a ese catálogo.
- El responsable de cada operación es siempre el usuario autenticado: el cliente no puede elegir ni falsificar el responsable.
- La fecha de inicio es obligatoria con formato `AAAA-MM-DD` y no puede ser futura. La descripción admite hasta 1000 caracteres.
- Una condición `activa` puede modificarse o finalizarse. Una condición `finalizada` no se modifica, pero se conserva completa (incluida su fecha y responsable de finalización) para consulta histórica.
- No se admiten dos condiciones activas del mismo alumno con la misma descripción (comparada sin tildes ni mayúsculas).
- Finalizar no elimina el registro: guarda `fechaFinalizacion` y `finalizadoPor`.
- Historial inmutable: cada modificación o finalización conserva el estado anterior en `historial` y actualiza `actualizadoEn`/`actualizadoPor`. No hay baja.
- Cada operación queda auditada en `registrarAuditoria` del módulo, además de la auditoría transversal del request.

## Endpoints

- GET /api/v1/particular-conditions/catalogos — estados permitidos y órdenes disponibles
- GET /api/v1/particular-conditions — listar con filtros (alumnoId, estado, desde, hasta, q), orden y paginación (`estado=activa` o `estado=finalizada` para consultar solo activas o solo finalizadas; `desde`/`hasta` para un período)
- GET /api/v1/particular-conditions/:conditionId — ver una condición
- PATCH /api/v1/particular-conditions/:conditionId — modificar (descripcion, fechaInicio) una condición activa conservando el historial
- POST /api/v1/particular-conditions/:conditionId/finalizar — finalizar o desactivar una condición activa
- GET /api/v1/students/:studentId/particular-conditions — condiciones de un alumno, más recientes primero
- POST /api/v1/students/:studentId/particular-conditions — registrar una condición del alumno
- GET /api/v1/alumnos/:alumnoId/condiciones — historial completo de condiciones del alumno
- GET /api/v1/alumnos/:alumnoId/condiciones/resumen — total, activas, finalizadas y última finalización

## Permisos

- GET: PARTICULAR_CONDITIONS_READ (`particular-conditions.read`)
- POST/PATCH: PARTICULAR_CONDITIONS_WRITE (`particular-conditions.write`)

Secretaría y preceptoría registran y consultan; docentes y jefatura de área solo consultan. Los listados responden `{ data, filtros, paginacion }`. Las operaciones protegidas responden 401 sin token y 403 sin permisos.
