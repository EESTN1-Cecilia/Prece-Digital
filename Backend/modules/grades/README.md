# Calificaciones

Módulo de evaluaciones y calificaciones: registro del valor obtenido por un
alumno en una materia dentro de un período, con historial por modificación, baja
lógica, boletín por alumno y autorización acotada a las asignaciones del docente.

## Modelo

- **Calificación**: `alumnoId`, `materiaId`, `anio` lectivo obligatorio (1990–2100), `cuatrimestre` opcional (`1`, `2` o `null` para período anual), `tipoEvaluacion` (`escrito`, `oral`, `trabajo_practico`, `proyecto`, `recuperatorio`), `valor`, `fecha` (AAAA-MM-DD), `observaciones` opcionales y `periodo` (etiqueta libre opcional).
- **Alcance**: `cursoId` y/o `divisionId`. Si no se envían, se derivan de la matrícula del alumno en la estructura académica.
- **Docente**: `docenteId` y `asignacionMateriaId` del módulo de docentes. Para un usuario con rol `docente` se resuelven solos a partir de sus asignaciones.
- **Valor**: numérico (escala 1–10, admite coma decimal) o conceptual (`TEA`, `TEP`, `TED`). Del valor numérico se derivan `nota` y `condicion` (`aprobado` desde 6 / `desaprobado`).
- **Unicidad**: no puede haber dos calificaciones activas del mismo `alumnoId` + `materiaId` + `anio` + `cuatrimestre` + `tipoEvaluacion` (409).
- **Historial inmutable**: cada modificación guarda el snapshot anterior en `historial`; nada se borra.
- **Baja lógica**: `DELETE` deja la calificación en `estado: "inactivo"` con `fechaBaja`.
- Toda alta, modificación y baja queda registrada en auditoría con el responsable del token.

## Autorización docente

Un usuario con rol `docente` (sin ser además admin o director) solo puede cargar,
modificar y anular calificaciones que caigan dentro de una de sus asignaciones de
materia activas del período: el par materia + curso/división debe estar cubierto.
Si el usuario no tiene legajo de docente asociado o la asignación no cubre el
alcance solicitado, responde 403. Admin y director no se restringen.

## Endpoints

### Calificaciones

- GET /api/v1/calificaciones/catalogos — tipos de evaluación, conceptos, condiciones y escala
- POST /api/v1/calificaciones — registrar calificación
- GET /api/v1/calificaciones — listar con filtros (`alumnoId`, `materiaId`, `cursoId`, `divisionId`, `docenteId`, `anio`, `cuatrimestre`, `tipoEvaluacion`, `condicion`, `estado`, `orden`) y paginación
- GET /api/v1/calificaciones/:calificacionId — ver una calificación
- PATCH /api/v1/calificaciones/:calificacionId — modificar valor, tipo, período, fecha, alcance u observaciones (guarda historial)
- DELETE /api/v1/calificaciones/:calificacionId — baja lógica

### Consultas por alumno y docente

- GET /api/v1/alumnos/:alumnoId/calificaciones — boletín del alumno agrupado por materia
- GET /api/v1/alumnos/:alumnoId/calificaciones/resumen — resumen por materia (total y promedio)
- GET /api/v1/docentes/:docenteId/calificaciones — calificaciones asociadas a un docente

## Permisos

- Lectura: `grades.read`
- Alta, modificación y baja: `grades.write`

Los listados responden `{ data, filtros, paginacion }`; los recursos simples, `{ data }`.
Las operaciones protegidas responden 401 sin token y 403 sin permisos.
