# Planificaciones Docentes

Registro de planificaciones de aula integrando docentes, materias, cursos, divisiones y años, con
trazabilidad de estados y comparación contra el seguimiento curricular.

## Base

`/api/v1/teacher-plans`

## Estados

| Estado | Descripción |
| --- | --- |
| `borrador` | Creada por el docente, editable |
| `en_revision` | Enviada a revisión, sin cambios de contenido bloqueados |
| `observada` | Devuelta con observaciones, el docente puede corregir |
| `aprobada` | Validada por jefatura, solo `planning.manage` edita contenido |
| `finalizada` | Docencia concluida, solo `planning.manage` edita contenido |
| `archivada` | Terminal, inmutable |

Transiciones permitidas:

```
borrador    -> en_revision | archivada
en_revision -> borrador | aprobada | observada | archivada
observada   -> borrador | en_revision | archivada
aprobada    -> finalizada | archivada
finalizada  -> archivada
archivada   -> (ninguna)
```

La transición al mismo estado devuelve `409 conflict`.

## Permisos

| Permiso | Valor | Uso |
| --- | --- | --- |
| `PLANNING_READ` | `planning.read` | Consulta de planificaciones, historial y comparación |
| `PLANNING_WRITE` | `planning.write` | Crear, editar y enviar a revisión |
| `PLANNING_REVIEW` | `planning.review` | Aprobar, observar y finalizar |
| `PLANNING_MANAGE` | `planning.manage` | Archivar, editar contenido aprobado/finalizado |

Grants: `docente` (read, write), `jefe_area` y `server` (los cuatro), `secretario` (read),
`admin` y `director` (todos por `ALL_PERMISSIONS`).

Reglas de seguridad aplicadas en el servicio:

- Un docente solo crea, edita y transiciona planificaciones de su propio `teacherId`.
- Un docente sin `planning.review` ni `planning.manage` solo lista sus propias planificaciones.
- `archivada` es inmutable: `409 conflict`.
- Editar contenido en `aprobada` o `finalizada` exige `planning.manage`: `403 forbidden`.
- Los permisos de transición se evalúan por estado destino dentro de `PATCH /:planId/status`,
  por lo que esa ruta declara `planning.write` y el servicio refine el requisito.

## Endpoints

| Método | Ruta | Permiso |
| --- | --- | --- |
| `POST` | `/api/v1/teacher-plans` | `PLANNING_WRITE` |
| `GET` | `/api/v1/teacher-plans` | `PLANNING_READ` |
| `GET` | `/api/v1/teacher-plans/by-teacher/:teacherId` | `PLANNING_READ` |
| `GET` | `/api/v1/teacher-plans/by-subject/:subjectId` | `PLANNING_READ` |
| `GET` | `/api/v1/teacher-plans/by-course/:courseId` | `PLANNING_READ` |
| `GET` | `/api/v1/teacher-plans/by-period/:year` | `PLANNING_READ` |
| `GET` | `/api/v1/teacher-plans/:planId` | `PLANNING_READ` |
| `GET` | `/api/v1/teacher-plans/:planId/status` | `PLANNING_READ` |
| `GET` | `/api/v1/teacher-plans/:planId/history` | `PLANNING_READ` |
| `GET` | `/api/v1/teacher-plans/:planId/curriculum-comparison` | `PLANNING_READ` |
| `PATCH` | `/api/v1/teacher-plans/:planId` | `PLANNING_WRITE` |
| `PATCH` | `/api/v1/teacher-plans/:planId/status` | `PLANNING_WRITE` + permiso por transición |
| `DELETE` | `/api/v1/teacher-plans/:planId` | `PLANNING_MANAGE` (archiva) |

## Datos

```json
{
  "title": "Planificación Matemática 1° A",
  "teacherId": "tch_1",
  "subjectId": "mat_1",
  "courseId": "1A",
  "divisionId": "div_1",
  "year": 2026,
  "period": "primer_trimestre",
  "contents": [{ "name": "Números naturales", "description": "...", "estimatedHours": 12 }],
  "activities": [{ "name": "Clase inaugural", "type": "clase", "date": "2026-03-02" }],
  "observations": "Ajuste de tiempos por pérdida de días"
}
```

- `teacherId`, `subjectId`, `courseId`, `year`, `contents` y `activities` son opcionales salvo donde se indica.
- Requeridos en `POST`: `title`, `teacherId`, `subjectId`, `courseId`, `year`.
- `divisionId` y `period` son opcionales. Períodos: `anual`, `primer_cuatrimestre`,
  `segundo_cuatrimestre`, `primer_trimestre`, `segundo_trimestre`, `tercer_trimestre`.
- Tipos de actividad: `clase`, `taller`, `evaluacion`, `tarea`, `proyecto`, `informe`, `otra`.
- `year` debe ser entero entre 2000 y 2100.
- La asociación `teacherId + subjectId + courseId + divisionId + year` es única mientras
  `UNIQUE_COMBINATION.enabled` sea `true`; duplicados devuelven `409 conflict`.
- `PATCH /:planId` no admite cambios de asociación ni de estado: usa los endpoints de estado y,
  si la combinación cambia, crea una nueva planificación.

## Filtros, orden y paginación

Filtros: `teacherId`, `subjectId`, `courseId`, `divisionId`, `year`, `period`, `status`.

Orden: `orden` (`createdAt` por defecto, o `updatedAt`, `year`, `status`, `title`, `period`) y
`direccion` (`desc` por defecto, o `asc`).

Paginación: `pagina` (1 por defecto) y `porPagina` (20 por defecto, máximo 100).

```json
{
  "data": [],
  "filtros": { "teacherId": null, "status": null, "orden": "createdAt", "direccion": "desc", "pagina": 1, "porPagina": 20 },
  "paginacion": { "total": 0, "pagina": 1, "porPagina": 20, "totalPaginas": 0 }
}
```

## Auditoría

`GET /:planId/history` devuelve entradas ordenadas de la más reciente a la más antigua con
`type` (`creacion`, `modificacion`, `cambio_estado`), `fromStatus`, `toStatus`, `changes`
(`field`, `before`, `after`), `comment`, `performedBy` y `createdAt`. Mover a `observada` exige
`comment`.

## Comparación curricular

`GET /:planId/curriculum-comparison` cruza los contenidos planificados con los contenidos del
seguimiento curricular (`/api/v1/curriculum/contenidos`) del mismo `subjectId`, `courseId`,
`divisionId` y `year`, emparejando nombres sin distinguir mayúsculas, acentos ni espacios.
Devuelve `planificados` con su `seguimiento` asociado, `sinPlanificar` y un `resumen` con
`conSeguimiento`, `sinSeguimiento`, `contenidosCurriculum` y `promedioAvance`.

## Ejemplos

```bash
curl -X POST http://localhost:3000/api/v1/teacher-plans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Planificación Matemática 1° A","teacherId":"tch_1","subjectId":"mat_1","courseId":"1A","year":2026}'

curl -X PATCH http://localhost:3000/api/v1/teacher-plans/tpl_1/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"en_revision"}'

curl -X PATCH http://localhost:3000/api/v1/teacher-plans/tpl_1/status \
  -H "Authorization: Bearer $TOKEN_JEFE" -H "Content-Type: application/json" \
  -d '{"status":"aprobada","comment":"Ajuste de carga horaria"}'
```
