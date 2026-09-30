# Seguimiento de inasistencias

Módulo de seguimiento de inasistencias: registra las acciones que la institución realiza ante la inasistencia de un alumno (llamados, comunicaciones, notificaciones, entrevistas u otras medidas) y permite consultar el historial de intervenciones de cada alumno.

## Modelo

- Acción de seguimiento: `alumnoId` + `fecha` + `tipo` + `responsableId` + `observaciones`.
- `escuelaId` se toma de la asignación del usuario autenticado; el cliente no puede elegir la escuela.
- Tipo de acción centralizado en `catalogo.mjs` (`TIPOS_ACCION`): `llamado_familia`, `comunicacion_familia`, `notificacion`, `comunicacion_cuaderno`, `entrevista`, `otra_medida`. Agregar un tipo nuevo es agregar una fila a ese catálogo.
- El responsable sale siempre del usuario autenticado: si el cuerpo envía `usuarioResponsableId` distinto, la operación responde 422.
- La fecha de la acción es obligatoria, con formato `AAAA-MM-DD` y no puede ser futura (se registra lo que ya se hizo).
- Las observaciones son obligatorias, entre 5 y 500 caracteres.
- Un alumno puede tener tantas acciones como haga falta: una misma inasistencia puede generar varias.
- Historial inmutable: cada `PATCH` guarda el estado anterior (fecha, tipo y observaciones previas) en `historial` y actualiza `actualizadoEn`/`actualizadoPor`. No hay baja de seguimientos.
- Un seguimiento no crea, modifica ni cierra una inasistencia: convive con ella y la deja intacta. El modelo queda preparado para enlazarse al módulo de asistencia cuando exista.
- Crear y modificar quedan auditados en `registrarAuditoria` del módulo, además de la auditoría transversal que registra el request.

## Endpoints

- POST /api/v1/seguimientos-inasistencia — registrar una acción de seguimiento
- GET /api/v1/seguimientos-inasistencia — listar con filtros (alumnoId, tipo, responsableId, desde, hasta), orden y paginación
- GET /api/v1/seguimientos-inasistencia/catalogos — tipos de acción, órdenes de acciones y órdenes del listado de alumnos
- GET /api/v1/seguimientos-inasistencia/alumnos — alumnos con registros de seguimiento, con total de acciones y última fecha (orden `alumno`, `alumno_desc`, `total`, `total_desc`)
- GET /api/v1/seguimientos-inasistencia/:seguimientoId — ver una acción
- PATCH /api/v1/seguimientos-inasistencia/:seguimientoId — modificar (fecha, tipo, observaciones) conservando el historial
- GET /api/v1/alumnos/:alumnoId/seguimiento-inasistencia — historial del alumno con los mismos filtros y paginación
- GET /api/v1/alumnos/:alumnoId/seguimiento-inasistencia/ultima — última acción registrada del alumno (404 si nunca tuvo seguimiento)
- GET /api/v1/alumnos/:alumnoId/seguimiento-inasistencia/resumen — si ya tuvo seguimiento, cuántas acciones, desglose por tipo y última acción

## Permisos

- GET: ATTENDANCE_FOLLOWUPS_READ (`attendance-followups.read`)
- POST/PATCH: ATTENDANCE_FOLLOWUPS_WRITE (`attendance-followups.write`)

Preceptoria registra y consulta; secretaria, docentes y jefatura de área solo leen. Los listados responden `{ data, filtros, paginacion }`. Las operaciones protegidas responden 401 sin token y 403 sin permisos.
