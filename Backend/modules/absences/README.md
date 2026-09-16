# Ausencias y Novedades

Módulo para la gestión de ausencias y novedades/incidentes docentes.

Una ausencia queda vinculada a una asignación horaria (`scheduleAssignmentId`), lo que permite determinar automáticamente el curso, materia, espacio y horario afectados. Al registrar una ausencia se crea una **liberación de espacio** enriquecida con todo el contexto necesario para el módulo de reasignación. Al anular la ausencia se eliminan las liberaciones; al reactivarlas se restauran.

Las liberaciones se sincronizan automáticamente en cada operación (create, update, annul, reactivate) y se verifican contra reservas activas y otras asignaciones horarias para evitar conflictos.

## Modelos de datos

### Ausencia

| Campo                   | Tipo     | Descripción                                                            |
|-------------------------|----------|------------------------------------------------------------------------|
| id                      | string   | ID único (prefijo `abs_`)                                              |
| teacherId               | string   | Docente ausente                                                        |
| date                    | string   | Fecha de la ausencia (YYYY-MM-DD)                                      |
| scheduleAssignmentId    | string   | Asignación horaria afectada                                            |
| scheduleId              | string   | Horario al que pertenece la asignación (para filtrar por período)      |
| courseId                 | string   | Curso (derivado de la asignación)                                      |
| divisionId              | string   | División (derivada de la asignación)                                   |
| subjectId               | string   | Materia (derivada de la asignación)                                    |
| spaceId                 | string   | Espacio (derivado de la asignación)                                    |
| dayOfWeek               | string   | Día de la semana (lunes..domingo)                                      |
| startTime               | string   | Hora de inicio (HH:MM)                                                 |
| endTime                 | string   | Hora de fin (HH:MM)                                                    |
| type                    | string   | Tipo: injustificada, justificada, medica, personal, capacitacion, otra |
| status                  | string   | Estado: activa, anulada                                                |
| reason                  | string   | Motivo                                                                 |
| observations            | string   | Observaciones (max 2000 caracteres)                                    |
| createdBy               | string   | Usuario que registró                                                   |
| createdAt               | string   | Fecha/hora de registro (ISO)                                           |
| updatedBy               | string   | Usuario que modificó (nullable)                                        |
| updatedAt               | string   | Fecha/hora de última modificación (ISO)                                |

### Liberación de espacio (disponibilidad)

Se crea automáticamente al registrar una ausencia. El registro se elimina al anular la ausencia y se restaura al reactivarla. Cada liberación contiene el contexto completo necesario para el módulo de reasignación:

| Campo                   | Tipo     | Descripción                                                            |
|-------------------------|----------|------------------------------------------------------------------------|
| id                      | string   | ID único (prefijo `ava_`)                                              |
| spaceId                 | string   | Espacio liberado                                                       |
| scheduleAssignmentId    | string   | Asignación horaria cuya clase quedó sin docente                        |
| scheduleId              | string   | Horario al que pertenece la asignación                                 |
| courseId                 | string   | Curso/grupo de la clase afectada                                       |
| divisionId              | string   | División                                                               |
| subjectId               | string   | Materia de la clase afectada                                           |
| teacherId               | string   | Docente ausente                                                        |
| date                    | string   | Fecha (YYYY-MM-DD)                                                     |
| dayOfWeek               | string   | Día de la semana                                                       |
| startTime               | string   | Hora de inicio                                                         |
| endTime                 | string   | Hora de fin                                                            |
| absenceId               | string   | Ausencia que genera la disponibilidad                                  |
| absenceType             | string   | Tipo de ausencia (medica, personal, etc.)                              |
| absenceReason           | string   | Motivo declarado de la ausencia                                        |
| status                  | string   | `disponible_por_ausencia` (libre), `utilizada` (consumida por reasignación), `liberada` |
| reason                  | string   | Siempre `ausencia_docente` en este contexto                            |
| createdBy               | string   | Usuario que registró la ausencia                                       |
| createdByName           | string   | Nombre del usuario que registró (enriquecido)                          |
| createdAt               | string   | Fecha/hora de registro (ISO)                                           |
| space                   | object   | Espacio enriquecido: `{ id, name, code }`                              |
| teacher                 | object   | Docente enriquecido: `{ id, firstName, lastName, fullName }`           |
| scheduleAssignment      | object   | Asignación horaria enriquecida                                         |

**Conflictos detectados al consultar espacios disponibles (`available-spaces`):**
- Reservas activas en el mismo espacio, fecha y horario (excluyen la disponibilidad de la grilla)
- Otras asignaciones activas en el mismo espacio, día y horario (excluyen la disponibilidad de la grilla)

Las liberaciones con conflicto se mantienen en la base pero no aparecen en `available-spaces`.

### Historial de cambios

| Campo        | Tipo     | Descripción                      |
|--------------|----------|----------------------------------|
| id           | string   | ID único (prefijo `ah_`)         |
| absenceId    | string   | Ausencia modificada              |
| action       | string   | create, update, annul, reactivate|
| previousData | object   | Estado anterior (nullable)       |
| newData      | object   | Estado nuevo                     |
| changedBy    | string   | Usuario que realizó el cambio    |
| changedAt    | string   | Fecha/hora del cambio (ISO)      |

## Reglas de negocio

- El docente debe existir y estar activo.
- La asignación horaria debe existir y estar activa.
- La asignación horaria debe corresponder al docente indicado.
- La fecha debe coincidir con el día de semana de la asignación.
- No se permiten duplicados (mismo docente + asignación + fecha), salvo si la ausencia fue anulada.
- Anular una ausencia elimina todas las liberaciones asociadas.
- Reactivar una ausencia restaura las liberaciones y el historial.
- No se puede modificar una ausencia anulada.
- La ausencia no elimina la asignación horaria original.
- Las liberaciones se enriquecen automáticamente con espacio, docente, asignación horaria y contexto de la ausencia.

## Endpoints

### Ausencias

| Método   | Ruta                                       | Descripción                                   | Permiso          |
|----------|--------------------------------------------|-----------------------------------------------|------------------|
| POST     | `/api/v1/absences`                         | Registrar ausencia (crea liberaciones)        | absences.write   |
| GET      | `/api/v1/absences`                         | Listar ausencias (con filtros)                | absences.read    |
| GET      | `/api/v1/absences/:absenceId`              | Consultar ausencia por ID                     | absences.read    |
| PATCH    | `/api/v1/absences/:absenceId`              | Modificar / corregir ausencia                 | absences.write   |
| POST     | `/api/v1/absences/:absenceId/annul`        | Anular ausencia (elimina liberaciones)        | absences.manage  |
| POST     | `/api/v1/absences/:absenceId/reactivate`   | Reactivar ausencia anulada (restaura)         | absences.manage  |
| DELETE   | `/api/v1/absences/:absenceId`              | Anular ausencia (alias HTTP DELETE)           | absences.manage  |
| GET      | `/api/v1/absences/:absenceId/history`      | Historial de cambios de una ausencia          | absences.read    |
| GET      | `/api/v1/absences/:absenceId/availability` | Detalle de disponibilidad generada por la ausencia | absences.read |
| GET      | `/api/v1/absences/available-spaces`        | Espacios disponibles (con conflict-checking)  | absences.read    |
| GET      | `/api/v1/absences/affected-activities`     | Actividades afectadas por ausencias           | absences.read    |
| GET      | `/api/v1/absences/grid`                    | Datos de grilla para vista de ausencias       | absences.read    |

### Liberaciones de espacio (PATCH)

| Método | Ruta                                         | Descripción                            | Permiso          |
|--------|----------------------------------------------|----------------------------------------|------------------|
| PATCH  | `/api/v1/absence-liberations/:availabilityId` | Actualizar estado de una liberación (utilizada / liberada) | absences.write |

Body: `{ "status": "utilizada" }` o `{ "status": "liberada" }`

### Filtros disponibles (query params)

**Ausencias:** `teacherId`, `courseId`, `divisionId`, `subjectId`, `spaceId`, `scheduleAssignmentId`, `scheduleId`, `period`, `date`, `startDate`, `endDate`, `dayOfWeek`, `schoolId`, `status`, `includeInactive`

**available-spaces:** `date`, `startTime`, `endTime`, `spaceId`, `schoolId`

**affected-activities / grid:** `teacherId`, `courseId`, `divisionId`, `subjectId`, `spaceId`, `scheduleAssignmentId`, `scheduleId`, `period`, `date`, `startDate`, `endDate`, `dayOfWeek`, `schoolId`, `status`, `includeInactive`

### Novedades

| Método | Ruta                                | Descripción      | Permiso          |
|--------|-------------------------------------|------------------|------------------|
| POST   | `/api/v1/incidents`                 | Registrar novedad| absences.write   |
| GET    | `/api/v1/incidents`                 | Listar novedades | absences.read    |
| GET    | `/api/v1/incidents/:incidentId`     | Ver novedad      | absences.read    |
| PATCH  | `/api/v1/incidents/:incidentId`     | Modificar novedad| absences.write   |

## MySQL (migración)

Las tablas `ausencias`, `disponibilidad_espacios` e `historial_ausencias` están definidas en:

```
Backend/database/migrations/002_ausencias_disponibilidad.sql
```

## Datos enriquecidos en cada respuesta

Los endpoints de espacios disponibles, actividades afectadas y grilla devuelven la información completa necesaria para el frontend y el módulo de reasignación:

- **Espacio:** nombre, código
- **Docente:** nombre completo, ID
- **Asignación horaria:** día, hora, materia, curso, división
- **Ausencia:** tipo, motivo, estado
- **Disponibilidad:** estado de la liberación, usuario que la creó
