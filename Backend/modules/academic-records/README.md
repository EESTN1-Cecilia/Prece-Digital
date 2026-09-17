# Situación académica

Módulo de situación académica: registros que asocian a cada alumno con una materia dentro de un período académico, su tipo de situación y el estado de la materia, manteniendo el historial completo.

## Modelo

- Registro: alumno + materia + período (`anio` lectivo obligatorio y `cuatrimestre` opcional: 1, 2 o null para período anual).
- Tipo de situación (centralizado): `cursada`, `pendiente`, `recursada`, `intensificada`, `equivalencia`.
- Estado de la materia (centralizado): `en_curso`, `regular`, `aprobada`, `desaprobada`, `libre`.
- Transiciones entre estados validadas por un catálogo central (`TRANSICIONES`).
- Unicidad por `(alumnoId, materiaId, anio, cuatrimestre)`.
- Historial inmutabile: cada modificación guarda el snapshot anterior en `historial`; nunca se borra información de períodos previos.
- Las materias `recursadas` conservan el antecedente (`antecedenteId`) y el historial de la cursada anterior.

## Endpoints

- POST /api/v1/situaciones-academicas — registrar situación
- GET /api/v1/situaciones-academicas — listar con filtros (alumnoId, materiaId, tipo, estado, anio, cuatrimestre) y paginación
- GET /api/v1/situaciones-academicas/catalogos — tipos, estados y transiciones permitidas
- GET /api/v1/situaciones-academicas/pendientes|recursadas|intensificadas — materias según su tipo
- GET /api/v1/situaciones-academicas/:situacionId — ver un registro
- PATCH /api/v1/situaciones-academicas/:situacionId — modificar (estado, tipo, período, observaciones)
- GET /api/v1/alumnos/:alumnoId/situacion-academica — situación completa del alumno
  (resumen por tipo/estado y materias agrupadas, lista para la vista académica)
- GET /api/v1/alumnos/:alumnoId/situacion-academica/:materiaId — situación de una materia específica
- GET /api/v1/alumnos/:alumnoId/historial-academico — historial completo del alumno sin pérdida de períodos

## Permisos

- GET: ACADEMIC_RECORDS_READ
- POST/PATCH: ACADEMIC_RECORDS_WRITE

Los listados responden `{ data, filtros, paginacion }` con paginación completa. Las operaciones protegidas responden 401 sin token y 403 sin permisos, y las modificaciones se registran en auditoría.