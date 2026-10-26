# Asistencia por clase

Toma de asistencia del docente para una clase: una división (`<año>-<división>`,
por ejemplo `1-1`) + una materia + una fecha, con el estado de cada alumno
activo de la división.

## Reglas

- La identidad sale del token. Una cuenta solo docente opera únicamente sobre
  los cursos que tiene asignados (`modules/auth/alcance-cursos.service.mjs`) y
  sobre las materias que dicta en ese curso.
- Estados: el catálogo institucional de Preceptoría (`presente`, `ausente`,
  `tarde`). La justificación de una inasistencia sigue en el módulo de
  inasistencias.
- Registro completo: se guardan todos los alumnos activos de la división, sin
  repetir ni agregar alumnos de otras divisiones.
- Una sola toma por división + materia + fecha (409 si se repite).
- No se registran fechas futuras.
- Corrige quien tomó la asistencia o un rol institucional con
  `attendance.write`; cada corrección guarda en `historial` cómo estaba, quién la
  hizo y cuándo. Nada se borra.

## Endpoints

- GET /api/v1/docente/cursos/:cursoId/alumnos — lista de la división (orden, apellido, nombre, DNI, género, condición)
- GET /api/v1/asistencia-clases/catalogo — estados admitidos
- GET /api/v1/asistencia-clases — tomas registradas (filtros `cursoId`, `materia`, `desde`, `hasta`; `incluirRegistros=1` agrega los estados por alumno)
- POST /api/v1/asistencia-clases — registrar una toma `{ cursoId, materia, fecha, registros: [{ alumnoId, estado }] }`
- PUT /api/v1/asistencia-clases/planilla — guardar varios días de la planilla mensual `{ cursoId, materia, tomas: [{ fecha, registros }] }`: registra los días nuevos y corrige los ya tomados; si un día es inválido no se guarda ninguno
- GET /api/v1/asistencia-clases/:claseId — detalle con alumnos e historial
- PUT /api/v1/asistencia-clases/:claseId — corregir `{ registros }`

## Permisos

`attendance.read` para consultar y `attendance.write` para registrar y corregir;
la lista de alumnos exige además `students.read`.

## Modelo SQL

`tomas_asistencia_materia` (cabecera, única por división + materia + fecha),
`asistencias_materia` (una fila por alumno, columna `toma_id`) y
`tomas_asistencia_correcciones`. Ver `database/migrations/016_tomas_asistencia_materia.sql`.

## Planilla mensual

El Portal Docente muestra estas tomas con la planilla mensual institucional
(`Frontend/web/src/modules/attendance/asistencias-view.js`): cada columna-día
con datos es una toma de la materia en esa división. No hay una tabla aparte
para la planilla.
