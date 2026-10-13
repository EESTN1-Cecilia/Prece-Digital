# Promoción y cambio de curso

Módulo de promoción y cambio de curso: registra los movimientos de curso y división de los alumnos (promociones, cambios de curso, cambios de división y otros movimientos definidos por la institución), individuales o masivos, conservando para cada movimiento la ubicación anterior y la nueva, el tipo, el período académico y el usuario responsable.

## Modelo

- Movimiento: `alumnoId` + `tipo` + destino (`cursoNuevo`/`divisionNueva`) + período (`anio`, `cuatrimestre` opcional) + `fecha` + `motivo` opcional.
- `escuelaId` se toma del alumno (módulo students); el cliente no elige la escuela.
- Tipo de movimiento centralizado en `catalogo.mjs` (`TIPOS_MOVIMIENTO`): `promocion` (curso inmediato siguiente, la división se mantiene o se indica), `cambio_curso` (otro curso, la división debe existir para ese curso), `cambio_division` (mismo curso, otra división), `otro`. Agregar un tipo nuevo es agregar una fila a ese catálogo.
- El destino se valida contra el catálogo académico real (`modules/students/catalogo.mjs`): curso y división deben existir en la EEST N1 y el backend deriva `turno` y `orientacion` del destino; el cliente no los inventa.
- No se registra un movimiento que deja al alumno donde ya estaba (409). Una promoción sobre el último curso (7°) o a un curso inexistente responde 422.
- El responsable sale siempre del usuario autenticado; si el cuerpo envía `usuarioResponsableId` distinto, la operación responde 422.
- El movimiento es inmutable: se crea y se consulta, jamás se modifica ni se borra. El historial del alumno no se sobrescribe. Lo único que cambia es la ubicación actual del alumno en `students`.
- La situacion academica y las inasistencias quedan asociadas a su período y alumno: este módulo no las toca.
- Las operaciones masivas validan todo antes de aplicar; cada movimiento queda enlazado a la misma `operacionId` para trazabilidad y el resultado se consulta con `GET /api/v1/movimientos-cursos/operaciones/:operacionId`.
- Crear movimientos queda auditado en `registrarAuditoria` del módulo, además de la auditoría transversal que registra el request.

## Endpoints

- GET /api/v1/movimientos-cursos/catalogos — tipos de movimiento, cursos válidos, rango de años, órdenes y límites
- GET /api/v1/movimientos-cursos — listar con filtros (alumnoId, tipo, anio, cuatrimestre, curso, division, desde, hasta, operacionId, q), orden y paginación
- GET /api/v1/movimientos-cursos/asignados — alumnos activos en un curso/división (con `curso` obligatorio), para cargar movimientos
- GET /api/v1/movimientos-cursos/operaciones/:operacionId — ver una operación masiva con su detalle por alumno
- GET /api/v1/movimientos-cursos/:movimientoId — ver un movimiento
- POST /api/v1/movimientos-cursos/masivos — registrar una carga masiva (hasta 500 alumnos), atomica cuando falla a mitad de camino
- POST /api/v1/students/:studentId/promover — promover al curso siguiente
- POST /api/v1/students/:studentId/cambio-curso — cambiar a otro curso
- POST /api/v1/students/:studentId/cambio-division — cambiar de división en el mismo curso
- GET /api/v1/alumnos/:alumnoId/movimientos-cursos — historial del alumno (más reciente primero)
- GET /api/v1/alumnos/:alumnoId/movimientos-cursos/ultimo — último movimiento del alumno (o `tieneMovimientos: false`)
- GET /api/v1/alumnos/:alumnoId/situacion-curso — situación actual del alumno: curso, división, turno, orientación, condición y total de movimientos

## Permisos

- GET: COURSE_CHANGES_READ (`course-changes.read`)
- POST: COURSE_CHANGES_WRITE (`course-changes.write`)

Secretaría registra y consulta; preceptoría, docentes y jefatura de área solo leen. Los listados responden `{ data, filtros, paginacion }`. Las operaciones protegidas responden 401 sin token y 403 sin permisos.