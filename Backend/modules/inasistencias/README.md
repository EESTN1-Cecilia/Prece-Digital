# Inasistencias de alumnos

Módulo de inasistencias de alumnos: registra la asistencia por alumno, curso y división en un período académico, con motivos y estados de justificación centralizados, correcciones trazables y totales siempre calculados desde los registros almacenados.

## Modelo

- Registro: alumno + curso + división + fecha + período académico (`anio` lectivo obligatorio y `cuatrimestre` opcional: 1, 2 o null para período anual).
- Motivo (catálogo central): `salud`, `personal`, `institucional`, `otra`.
- Estado de justificación (catálogo central): `no_justificada`, `pendiente`, `justificada`.
- Justificación: motivo, descripción y documento presentado, con `justificadaPor` (usuario responsable) y fecha de justificación. Nunca la decide el frontend: siempre la registra el backend con el usuario autenticado.
- Unicidad por `(alumnoId, fecha)`: una misma inasistencia no se registra dos veces.
- Curso y división se derivan del alumno (fuente única: módulo students); no se aceptan inconsistencias.
- Total: no se guardan valores manuales; se calculan siempre desde los registros.
- Reglas institucionales centralizadas (límites y condiciones en `catalogo.mjs`).
- Trazabilidad: cada cambio guarda el snapshot anterior en `historial` y registra auditoría; no existe borrado físico.

## Endpoints

- POST /api/v1/inasistencias — registrar una inasistencia
- GET /api/v1/inasistencias — listar con filtros (alumnoId, curso, division, fecha, desde, hasta, anio, cuatrimestre, estado, motivo) y paginación
- GET /api/v1/inasistencias/:inasistenciaId — ver una inasistencia
- GET /api/v1/inasistencias/:inasistenciaId/historial — historial de modificaciones
- PATCH /api/v1/inasistencias/:inasistenciaId — corregir (fecha, período, motivo, estado, justificación, observaciones)
- POST /api/v1/inasistencias/:inasistenciaId/justify — justificar una inasistencia
- GET /api/v1/inasistencias/alumno/:alumnoId/totales — totales de un alumno (justificadas, no justificadas, pendientes, por motivo)
- GET /api/v1/inasistencias/estadisticas — acumulados por curso/división, cuatrimestre y motivo
- GET /api/v1/inasistencias/motivos — catálogo de motivos, estados y cuatrimestres

## Permisos

- GET: ATTENDANCE_READ (`attendance.read`)
- POST/PATCH: ATTENDANCE_WRITE (`attendance.write`)

Los listados responden `{ data, filtros, paginacion }`. Las operaciones protegidas responden 401 sin token y 403 sin permisos. Toda creación, corrección y justificación registra `createdBy`/`updatedBy` y queda en auditoría.