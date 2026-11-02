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

## Periodos de carga (bloqueo por la Dirección)

La Dirección habilita o bloquea, por ciclo lectivo, la carga de cada período:
`cuatrimestre1`, `cuatrimestre2`, `diciembre` y `febrero` (las columnas de la
planilla y del boletín oficial). Por defecto todos están habilitados.

- Con un período bloqueado, alta, modificación y baja de calificaciones de ese
  período responden 409 `PERIODO_BLOQUEADO`. Una modificación tampoco puede
  mover una nota desde o hacia un período bloqueado.
- Vale para la API de calificaciones y para el guardado de la planilla /
  boletín oficial (`PUT /api/v1/boletin-oficial/alumnos/:alumnoId`). La planilla
  guarda todo o nada: si una nota modificada cae en un período bloqueado no se
  guarda ninguna. Las notas que llegan sin cambios no cuentan, y el detalle de
  la planilla de un cuatrimestre bloqueado (parciales, valoración, faltas)
  conserva lo guardado.
- Admin y director no se restringen.
- Cada cambio de estado queda en la auditoría del módulo con el responsable.

## Endpoints

### Calificaciones

- GET /api/v1/calificaciones/catalogos — tipos de evaluación, conceptos, condiciones y escala
- POST /api/v1/calificaciones — registrar calificación
- GET /api/v1/calificaciones — listar con filtros (`alumnoId`, `materiaId`, `cursoId`, `divisionId`, `docenteId`, `anio`, `cuatrimestre`, `tipoEvaluacion`, `condicion`, `estado`, `orden`) y paginación
- GET /api/v1/calificaciones/:calificacionId — ver una calificación
- PATCH /api/v1/calificaciones/:calificacionId — modificar valor, tipo, período, fecha, alcance u observaciones (guarda historial)
- DELETE /api/v1/calificaciones/:calificacionId — baja lógica

- GET /api/v1/calificaciones/periodos — estado de los períodos de carga (`anio`, por defecto el ciclo actual). Cualquier usuario autenticado.
- PUT /api/v1/calificaciones/periodos/:anio — bloquear o habilitar períodos: `{ "periodos": { "cuatrimestre1": false } }`. Permiso `grades.manage`.

### Consultas por alumno y docente

- GET /api/v1/alumnos/:alumnoId/calificaciones — boletín del alumno agrupado por materia
- GET /api/v1/alumnos/:alumnoId/calificaciones/resumen — resumen por materia (total y promedio)
- GET /api/v1/docentes/:docenteId/calificaciones — calificaciones asociadas a un docente

## Permisos

- Lectura: `grades.read`
- Alta, modificación y baja: `grades.write`
- Bloqueo de períodos de carga: `grades.manage` (admin y director)

Los listados responden `{ data, filtros, paginacion }`; los recursos simples, `{ data }`.
Las operaciones protegidas responden 401 sin token y 403 sin permisos.
