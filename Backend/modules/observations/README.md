# Observaciones de alumnos

Módulo de observaciones: registra las novedades que un sector de la escuela anota sobre un alumno (académicas, de convivencia, de asistencia, administrativas o pedagógicas) y administra las acciones de seguimiento asociadas, con historial inmutable de cada cambio.

## Modelo

- Observación: `alumnoId` + `fecha` + `tipo` + `descripcion` + `sector` + `estado`.
- El `alumno` y el `dni` del listado salen de `students.repository` (única fuente de alumnos); se exponen como texto (`"Apellido, Nombre"` y DNI en string) para el contrato del frontend.
- `escuelaId` se toma del alumno; el cliente no puede elegir la escuela.
- Tipos centralizados en `catalogo.mjs` (`TIPOS_OBSERVACION`): Académica, Convivencia, Asistencia, Administrativa y Pedagógica. Agregar un tipo nuevo es agregar una fila a ese catálogo.
- Estados: `Activa`, `Modificada` e `Histórica`. Al modificar una observación, el estado anterior se guarda en `historial` y la observación pasa a `Modificada` si estaba `Activa`.
- El responsable es siempre el usuario autenticado que registra o modifica: el campo `responsable` del cuerpo se ignora.
- La fecha es obligatoria con formato `AAAA-MM-DD` y no puede ser futura. La descripción admite hasta 500 caracteres.
- Seguimiento: acción con `fecha` + `accion` + `observaciones` opcional + `estado` (`pendiente`, `realizada`, `cancelada`). Al pasar a `realizada` o `cancelada` se completa `fechaCierre`; al volver a `pendiente` se limpia.
- Historial inmutable: cada `PATCH` (observación o seguimiento) conserva el estado anterior en `historial` y actualiza `actualizadoEn`/`actualizadoPor`. No hay baja.
- Crear y modificar quedan auditados en `registrarAuditoria` del módulo, además de la auditoría transversal que registra el request.

## Endpoints

- GET /api/v1/observations/catalogos — tipos, estados, sectores sugeridos, estados de seguimiento y órdenes disponibles
- GET /api/v1/observations — listar con filtros (alumnoId, tipo, estado, sector, desde, hasta, q), orden y paginación
- GET /api/v1/observations/:observationId — ver una observación
- PATCH /api/v1/observations/:observationId — modificar (fecha, tipo, descripcion, sector, estado) conservando el historial
- GET /api/v1/students/:studentId/observations — observaciones de un alumno, más recientes primero
- POST /api/v1/students/:studentId/observations — registrar una observación del alumno
- GET /api/v1/observations/:observationId/seguimientos — acciones de seguimiento de una observación
- POST /api/v1/observations/:observationId/seguimientos — registrar una acción de seguimiento
- GET /api/v1/seguimientos-observacion/:seguimientoId — ver una acción de seguimiento
- PATCH /api/v1/seguimientos-observacion/:seguimientoId — modificar una acción de seguimiento conservando el historial
- GET /api/v1/alumnos/:alumnoId/observaciones — historial de observaciones del alumno con los mismos filtros y paginación
- GET /api/v1/alumnos/:alumnoId/observaciones/resumen — total de observaciones, desglose por tipo/estado, seguimientos pendientes y última observación

## Permisos

- GET: OBSERVATIONS_READ (`observations.read`)
- POST/PATCH: OBSERVATIONS_WRITE (`observations.write`)

Preceptoría, secretaría y jefatura de área registran y consultan; docentes solo leen. Los listados responden `{ data, filtros, paginacion }`. Las operaciones protegidas responden 401 sin token y 403 sin permisos.
