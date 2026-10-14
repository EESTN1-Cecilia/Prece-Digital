# Planificaciones docentes

Módulo de planificaciones de cada docente por materia, curso, división y período,
con su contenido por secciones, el circuito de presentación y revisión de Jefatura
y el historial de estados.

## Modelo

- **Planificación**: `docenteId`, `materiaId`, `cursoId`, `divisionId`, `anioLectivo` (1990–2100) y `periodo` (`anual`, `1` o `2`; se guarda como `cuatrimestre` `null`, `1` o `2`). El turno se hereda del curso.
- **Relaciones**: solo se puede planificar una combinación cubierta por una asignación de materia **activa** del módulo de docentes. Una asignación sin división cubre todas las divisiones del curso; una anual cubre cualquier cuatrimestre. La división tiene que pertenecer al curso.
- **Unicidad**: una planificación vigente (no rechazada) por docente + materia + división + ciclo lectivo + período (409).
- **Contenido**: secciones de texto (`fundamentacion`, `objetivos`, `contenidos`, `estrategias`, `actividades`, `recursos`, `evaluacion`, `cronograma`, `bibliografia`, `observaciones`). La lista sale de `GET /api/v1/planificaciones/catalogos`.
- **Estados**: `borrador`, `presentada`, `en_revision`, `observada`, `corregida`, `aprobada`, `rechazada`.
  - Docente (`teaching-plans.write`): edita en `borrador` u `observada`; presentar pasa `borrador → presentada` y `observada → corregida`.
  - Jefatura (`teaching-plans.manage`): `presentada`/`corregida → en_revision | observada | aprobada | rechazada` y `en_revision → observada | aprobada | rechazada`. Observar y rechazar exigen `motivo`.
- **Acciones disponibles**: cada planificación responde `acciones` (`ver`, `editar`, `presentar`, `revisar`) y `transiciones` calculadas para el usuario del token. El frontend las muestra tal cual.
- **Historial de estados**: `historialEstados` crece con cada cambio (estado anterior, nuevo, fecha, usuario y motivo); nada se reescribe.
- Toda alta, modificación, presentación y cambio de estado queda en auditoría con el responsable del token.

## Autorización docente

Un usuario con rol `docente` (sin ser además admin, director o jefatura) queda acotado
a sus propias planificaciones, resueltas por su legajo de docente (`teachers.userId`):
los listados y opciones solo devuelven lo suyo, y consultar u operar sobre una
planificación ajena responde 403. Sin legajo asociado, los listados vuelven vacíos y el
alta responde 403.

## Endpoints

### Catálogos y opciones

- GET /api/v1/planificaciones/catalogos — estados, transiciones, secciones, turnos, períodos y años de curso
- GET /api/v1/planificaciones/opciones — combinaciones planificables (ciclo lectivo → curso → división → materia → docente) según las asignaciones; filtros `anioLectivo`, `incluirInactivas=true`

### Planificaciones

- GET /api/v1/planificaciones — listar con búsqueda `q` (ID, docente, materia, curso, división), filtros (`docenteId`, `materiaId`, `anio`, `cursoId`, `divisionId`, `turno`, `estado`, `anioLectivo`, `periodo`, `fechaPresentacionDesde`, `fechaPresentacionHasta`, `fechaRevisionDesde`, `fechaRevisionHasta`), `orden` y paginación (`pagina`, `porPagina`). Cada fila incluye `cantidadObservaciones` calculada desde el historial de estados.
- POST /api/v1/planificaciones — cargar (queda en `borrador`)
- GET /api/v1/planificaciones/:planificacionId — detalle con contenido e historial
- PATCH /api/v1/planificaciones/:planificacionId — modificar datos generales o secciones (solo en `borrador` u `observada`)
- POST /api/v1/planificaciones/:planificacionId/presentar — presentar para revisión
- POST /api/v1/planificaciones/:planificacionId/estado — cambio de estado de revisión (`{ estado, motivo }`)

### Consultas

- GET /api/v1/planificaciones/por-docente/:docenteId — docente, materias a cargo, cursos/divisiones, resumen por estado y planificaciones
- GET /api/v1/planificaciones/por-materia/:materiaId — materia, resumen y planificaciones
- GET /api/v1/planificaciones/por-curso/:cursoId — curso, divisiones, resumen y planificaciones (filtros `divisionId`, `materiaId`)

Las tres aceptan `anioLectivo`, `periodo` y `estado`.

## Permisos

- Lectura: `teaching-plans.read` (admin, director, secretaría, docente, jefatura)
- Alta, modificación y presentación: `teaching-plans.write` (admin, director, docente, jefatura)
- Revisión: `teaching-plans.manage` (admin, director, jefatura)

Los listados responden `{ data, filtros, paginacion }`; los recursos simples, `{ data }`.
Las operaciones protegidas responden 401 sin token y 403 sin permisos.

## Pendientes

- Comparación con diseño curricular: el contenido hoy es texto libre por sección,
  sin identificadores curriculares. Antes de comparar contra un diseño, hay que
  ampliar el modelo para relacionar unidades/contenidos con el catálogo curricular.
