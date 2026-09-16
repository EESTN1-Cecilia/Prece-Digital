# Reasignaciones de Espacios

Módulo para registrar el movimiento **temporal** de una actividad (asignación horaria de un curso/división/materia con un docente) desde su espacio original hacia un **espacio alternativo** disponible, para una **fecha específica** y su período (horario).

La reasignación mantiene **trazabilidad completa**: se conserva el espacio original, el espacio destino, el docente, la fecha, el motivo, el usuario responsable y el **historial** de cada cambio (creación, corrección, reversión). Cuando la reasignación se origina por una **ausencia docente** o **liberación de espacio**, se vincula con la liberación del módulo de ausencias (`availabilityId`) para que el espacio liberado quede marcado como **utilizado** hasta que se revierta.

## Modelos de datos

### Reasignación

| Campo                | Tipo    | Descripción                                                        |
|----------------------|---------|--------------------------------------------------------------------|
| id                   | string  | ID único (prefijo `rsa_`)                                          |
| scheduleAssignmentId | string  | Asignación horaria afectada (ref. al módulo de horarios)           |
| courseId             | string  | Curso derivado de la asignación                                    |
| divisionId           | string  | División derivada de la asignación                                 |
| subjectId            | string  | Materia derivada de la asignación                                  |
| teacherId            | string  | Docente derivado de la asignación                                  |
| originalSpaceId      | string  | Espacio original (antes de la reasignación)                        |
| newSpaceId           | string  | Espacio destino (nuevo espacio)                                    |
| date                 | string  | Fecha específica de la reasignación (`YYYY-MM-DD`)                 |
| dayOfWeek            | string  | Día de la semana de la asignación (lunes-viernes/sabado/domingo)   |
| startTime            | string  | Hora de inicio (`HH:MM`)                                           |
| endTime              | string  | Hora de fin (`HH:MM`)                                              |
| reason               | string  | Motivo de la reasignación (max 500)                                |
| availabilityId       | string  | Si proviene de una ausencia: id de la liberación (nullable)        |
| status               | string  | `activa`, `revertida`                                              |
| schoolId             | string  | Escuela                                                            |
| createdBy            | string  | Usuario que creó la reasignación                                   |
| updatedBy            | string  | Usuario de la última modificación                                  |
| createdAt            | string  | Fecha de creación (ISO)                                            |
| updatedAt            | string  | Fecha de última modificación (ISO)                                 |
| originalSpace/newSpace | object | Entidad enriquecida al consultar                                   |
| teacher              | object  | Docente enriquecido al consultar (nullable)                        |
| scheduleAssignment   | object  | Asignación horaria enriquecida al consultar                        |
| availability         | object  | Liberación de espacio vinculada (nullable)                         |
| history              | array   | Historial de cambios de la reasignación                            |

### Historial de cambios

| Campo        | Tipo    | Descripción                                  |
|--------------|---------|----------------------------------------------|
| id           | string  | ID único (prefijo `rsh_`)                     |
| reassignmentId | string | Reasignación afectada                        |
| action       | string  | `create`, `update`, `revert`                  |
| previousData | object  | Estado anterior (nullable)                    |
| newData      | object  | Estado nuevo (nullable)                       |
| changedBy    | string  | Usuario que realizó el cambio                 |
| changedAt    | string  | Fecha/hora del cambio (ISO)                   |

## Reglas de negocio

- Se exigen `scheduleAssignmentId`, `newSpaceId` y `date`; el resto de los datos (curso, división, materia, docente, día, horario) se **derivan** de la asignación horaria.
- La **fecha** debe estar en `YYYY-MM-DD` y **coincidir con el día de la semana** de la asignación (422 si no coincide).
- El **espacio original** se resuelve desde la asignación; el **espacio destino** debe existir y estar **activo** (`status === "activo"`).
- **Reasignación innecesaria**: el espacio destino no puede ser igual al espacio actual de la asignación (400).
- **Reasignación duplicada**: una asignación solo puede tener **una reasignación activa** a la vez (409); debe revertirse o corregirse antes de crear otra.
- **Conflictos del espacio destino** (409):
  - Otra clase asignada en el mismo día y horario (solapamiento) en el espacio destino.
  - Una reserva de espacio incompatible en esa fecha e **horario** en el espacio destino.
- **Integración con ausencias/liberaciones**: si se indica `availabilityId`, la liberación debe existir, pertenecer al espacio destino, corresponder a la fecha y estar `disponible_por_ausencia`; al crear la reasignación, la liberación pasa a `utilizada` y deja de listarse como espacio disponible. Al revertir, vuelve a `disponible_por_ausencia`.
- **Atomizada**: toda validación ocurre antes de cualquier mutación. Si algo falla, la asignación horaria queda sin modificaciones.
- **La grilla refleja el cambio**: al crear/corregir, la asignación horaria vigente se actualiza al espacio destino (`scheduleAssignment.spaceId = newSpaceId`); al revertir se restaura el `originalSpaceId`.
- Solo se puede **corregir** una reasignación **activa** (espacio destino, fecha, motivo, liberación). Revertir una ya revertida es un 409.
- El historial conserva todas las operaciones (creación, corrección, reversión) con su `previousData`/`newData` para trazabilidad completa.
- Los permisos se verifican en el backend (`reassignments.read`, `reassignments.write`, `reassignments.manage`), nunca se confía en lo enviado por el frontend.

## Endpoints

| Método | Ruta                                                            | Descripción                                    | Permiso            |
|--------|-----------------------------------------------------------------|------------------------------------------------|--------------------|
| POST   | `/api/v1/reassignments`                                         | Crear reasignación                              | reassignments.write |
| GET    | `/api/v1/reassignments`                                         | Listar reasignaciones (con filtros)             | reassignments.read |
| GET    | `/api/v1/reassignments/:reassignmentId`                         | Consultar reasignación por ID                   | reassignments.read |
| PATCH  | `/api/v1/reassignments/:reassignmentId`                         | Corregir reasignación activa                    | reassignments.write |
| POST   | `/api/v1/reassignments/:reassignmentId/revert`                  | Revertir reasignación (restaura espacio original)| reassignments.write |
| GET    | `/api/v1/reassignments/current-space/:assignmentId`             | Espacio actual de una actividad (`?date=`)       | reassignments.read |
| GET    | `/api/v1/reassignments/by-activity/:assignmentId`               | Historial de reasignaciones de una actividad     | reassignments.read |

### Crear reasignación (`POST /api/v1/reassignments`)

```json
{
  "scheduleAssignmentId": "sca_...",
  "newSpaceId": "spc_...",
  "date": "2026-05-04",
  "reason": "Ausencia del docente titular",
  "availabilityId": "ava_..."
}
```

- `availabilityId` es opcional y se usa cuando la reasignación aprovecha un **espacio liberado por una ausencia**.

### Espacio actual de una actividad

`GET /api/v1/reassignments/current-space/:assignmentId` consulta qué espacio tiene asignada la actividad:

- Con `?date=YYYY-MM-DD` devuelve `spaceId` (espacio destino si hay una reasignación activa para esa fecha; si no, el espacio vigente de la asignación), el flag `reassigned` y `reassignmentId` cuando aplica.
- Sin `date` devuelve el espacio vigente de la asignación horaria.

### Filtros de listado (`GET /api/v1/reassignments`)

`schoolId`, `scheduleAssignmentId`, `courseId`, `divisionId`, `subjectId`, `teacherId`, `spaceId` (original o destino), `originalSpaceId`, `newSpaceId`, `date`, `startDate`, `endDate`, `dayOfWeek`, `status`, `includeInactive`

## Seguridad y auditoría

- Todas las rutas requieren `verifyToken` + permiso del módulo.
- Rol/es con `reassignments.read`: lectura; `reassignments.write`: creación, corrección y reversión; `reassignments.manage`: administración completa.
- Los permisos se resuelven contra `permissions.config.mjs` en el backend.
- Errores uniformes: 401 (no autenticado), 403 (sin permiso), 400/422 (validación), 404 (no encontrado), 409 (conflicto).
- No se exponen datos internos más allá de la respuesta autorizada.

## MySQL (migración)

Las tablas `reasignaciones_espacios` e `historial_reasignaciones` están definidas en:

```
Backend/database/migrations/004_reasignaciones.sql
```

Las referencias a asignaciones, espacios, docentes y materias se mantienen como identificadores textuales para ser consistentes con los módulos in-memory de horarios, espacios, ausencias y liberaciones.