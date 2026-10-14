# Control de Planificación

Registro y consulta de las revisiones que Jefatura de Área realiza sobre las planificaciones
docentes, verificando los contenidos planificados contra el diseño curricular vigente.

## Base

`/api/v1/planning-controls`

## Estados del control

El estado del control es independiente del estado de la planificación: registrar o mover un
control nunca modifica `planificaciones_docentes.estado`. El campo `planningStatus` de cada
respuesta expone el estado de la planificación solo a modo informativo.

| Estado | Descripción |
| --- | --- |
| `pendiente` | Control registrado, aún sin revisar |
| `en_revision` | Revisión en curso por Jefatura |
| `aprobada` | La planificación cumple el diseño curricular |
| `aprobada_con_observaciones` | Aprobada con observaciones registradas |
| `requiere_correccion` | Debe volver al docente con observaciones |
| `finalizada` | Terminal, sin cambios |

Transiciones permitidas:

```
pendiente             -> en_revision
en_revision           -> aprobada | aprobada_con_observaciones | requiere_correccion
requiere_correccion   -> en_revision
aprobada              -> finalizada
aprobada_con_observaciones -> finalizada
finalizada            -> (ninguna)
```

- Repetir el estado actual devuelve `409 conflict`.
- `requiere_correccion` y `aprobada_con_observaciones` exigen observaciones registradas (`422`).
- `finalizada` no admite modificaciones: `409 conflict`.

## Permisos

Se reutilizan los permisos de BE-05 del módulo de planificaciones:

| Permiso | Uso |
| --- | --- |
| `PLANNING_READ` (`planning.read`) | Consulta de controles, historiales y filtros |
| `PLANNING_REVIEW` (`planning.review`) | Registrar y modificar controles, y transiciones salvo `finalizada` |
| `PLANNING_MANAGE` (`planning.manage`) | Transición a `finalizada` |

`jefe_area` y `server` cuentan con `planning.review` y `planning.manage`; `docente` solo tiene
lectura sobre el módulo de planificaciones y por tanto no registra ni modifica controles. El
`reviewedBy` y el responsable de la auditoría se toman siempre de la sesión: cualquier valor
enviado por el frontend se descarta.

## Endpoints

| Método | Ruta | Permiso |
| --- | --- | --- |
| `POST` | `/api/v1/planning-controls` | `PLANNING_REVIEW` |
| `GET` | `/api/v1/planning-controls` | `PLANNING_READ` |
| `GET` | `/api/v1/planning-controls/pending` | `PLANNING_READ` |
| `GET` | `/api/v1/planning-controls/by-teacher/:teacherId` | `PLANNING_READ` |
| `GET` | `/api/v1/planning-controls/by-subject/:subjectId` | `PLANNING_READ` |
| `GET` | `/api/v1/planning-controls/by-course/:courseId` | `PLANNING_READ` |
| `GET` | `/api/v1/planning-controls/by-period/:year` | `PLANNING_READ` |
| `GET` | `/api/v1/planning-controls/by-status/:status` | `PLANNING_READ` |
| `GET` | `/api/v1/planning-controls/planning/:planId` | `PLANNING_READ` |
| `GET` | `/api/v1/planning-controls/planning/:planId/history` | `PLANNING_READ` |
| `GET` | `/api/v1/planning-controls/:controlId` | `PLANNING_READ` |
| `GET` | `/api/v1/planning-controls/:controlId/history` | `PLANNING_READ` |
| `PATCH` | `/api/v1/planning-controls/:controlId` | `PLANNING_REVIEW` |
| `PATCH` | `/api/v1/planning-controls/:controlId/status` | `PLANNING_REVIEW` + permiso por transición |

## Datos

```json
{
  "planningId": "tpl_1",
  "contents": [
    {
      "name": "Numeros naturales",
      "description": "Unidades y decenas",
      "plannedContentName": "Numeros naturales",
      "curriculumContentId": "cnt_1",
      "evaluated": true
    }
  ],
  "curriculumMatch": "parcial",
  "observations": "FaltaVinculacion explicita con el contenido 3",
  "status": "en_revision",
  "reviewDate": "2026-04-10"
}
```

- `teacherId`, `subjectId`, `courseId`, `divisionId`, `year`, `period`, `schoolId`, `reviewedBy`
  y `createdBy` se derivan de la planificación y de la sesión; no se aceptan desde el body.
- Requeridos en `POST`: `planningId` y `contents`.
- `status` de creación: `pendiente` (por defecto) o `en_revision`.
- `curriculumMatch`: `total`, `parcial`, `no_coincide`, `no_evaluado` (por defecto `no_evaluado`).
- `reviewDate` en `YYYY-MM-DD`, por defecto la fecha actual y nunca futura.
- `PATCH /:controlId` actualiza `contents`, `curriculumMatch`, `observations` y `reviewDate`.
  El estado se cambia en `PATCH /:controlId/status` y la planificación no se puede reasignar.

### Validaciones de contenidos y correspondencia

- `plannedContentName`, si se envía, debe corresponder a un contenido de la planificación (`422`).
- `curriculumContentId`, si se envía, debe pertenecer a un diseño curricular vigente del contexto
  de la planificación y su nombre debe coincidir con `name` (`422`).
- `curriculumMatch: total` exige todos los contenidos evaluados y vinculados al diseño.
- `curriculumMatch: parcial` exige al menos un contenido evaluado y observaciones.
- `curriculumMatch: no_coincide` exige observaciones.
- No puede existir un segundo control `pendiente` o `en_revision` para la misma planificación
  (`409 conflict`). Con `ALLOW_MULTIPLE_REVIEWS` en `true` se permiten revisiones sucesivas una vez
  cerrado el control anterior; en `false` solo se admite un control por planificación.

### Requisitos del contexto académico

La planificación debe existir (`404`), pertenecer a la escuela del usuario (`403`), tener un
docente activo (`422`) y contar con un diseño curricular vigente para su materia, curso, división
y año (`422`).

## Filtros, orden y paginación

Filtros combinables: `planningId`, `teacherId`, `subjectId`, `courseId`, `divisionId`, `year`,
`period`, `status`, `curriculumMatch` y `pendiente=true`.

Orden: `orden` (`createdAt` por defecto, o `updatedAt`, `reviewDate`, `status`, `year`,
`curriculumMatch`) y `direccion` (`desc` por defecto, o `asc`).

Paginación: `pagina` (1 por defecto) y `porPagina` (20 por defecto, máximo 100).

```json
{
  "data": [],
  "filtros": { "teacherId": null, "status": null, "pendiente": false, "pagina": 1, "porPagina": 20 },
  "paginacion": { "total": 0, "pagina": 1, "porPagina": 20, "totalPaginas": 0 }
}
```

## Auditoría

`GET /:controlId/history` devuelve las entradas del control (`creacion`, `actualizacion`,
`cambio_estado`) con `fromStatus`, `toStatus`, `changes` (`field`, `before`, `after`), `comment`,
`performedBy` y `createdAt`. `GET /planning/:planId/history` devuelve el historial de revisiones de
la planificación con el total de controles y el estado vigente de la planificación.

## Ejemplos

```bash
curl -X POST http://localhost:3000/api/v1/planning-controls \
  -H "Authorization: Bearer $TOKEN_JEFE" -H "Content-Type: application/json" \
  -d '{"planningId":"tpl_1","contents":[{"name":"Numeros naturales","plannedContentName":"Numeros naturales","curriculumContentId":"cnt_1","evaluated":true}],"curriculumMatch":"parcial","observations":"Ajustar la carga horaria"}'

curl -X PATCH http://localhost:3000/api/v1/planning-controls/ctl_1/status \
  -H "Authorization: Bearer $TOKEN_JEFE" -H "Content-Type: application/json" \
  -d '{"status":"requiere_correccion","observations":"Ajustar la carga horaria de probabilidad"}'
```
