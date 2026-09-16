# Grupos, Burbujas y Talleres

Módulo para la gestión de agrupaciones de alumnos dentro de la institución: grupos completos o parciales de un curso, burbujas, grupos de taller y agrupaciones temporales.

Un grupo se vincula con **alumnos** (integrantes), con un **curso/división** de origen, un **taller** cuando corresponde, y una **planificación** de espacio y horario. Todas las operaciones relevantes quedan registradas en un **historial** de cambios para trazabilidad.

## Modelos de datos

### Grupo

| Campo          | Tipo   | Descripción                                                    |
|----------------|--------|----------------------------------------------------------------|
| id             | string | ID único (prefijo `grp_`)                                      |
| name           | string | Nombre o identificador del grupo (max 200)                     |
| type           | string | `curso`, `burbuja`, `taller`, `temporal`, `otro`               |
| courseId       | string | Curso de origen (referencia)                                   |
| divisionId     | string | División de origen (referencia)                                |
| workshopId     | string | Taller asociado, cuando corresponda (nullable)                 |
| spaceId        | string | Espacio asignado a la planificación (nullable)                 |
| scheduleId     | string | Horario asignado a la planificación (nullable)                 |
| status         | string | `activo`, `inactivo`, `finalizado`                             |
| description    | string | Descripción (max 2000)                                        |
| observations   | string | Observaciones (max 2000)                                       |
| schoolId       | string | Escuela                                                         |
| memberCount    | number | Cantidad de integrantes activos (calculado)                    |
| members        | array  | Integrantes activos `{ id, studentId, createdAt }`             |
| createdBy      | string | Usuario responsable de la creación                             |
| updatedBy      | string | Usuario de la última modificación                              |
| createdAt      | string | Fecha de creación (ISO)                                        |
| updatedAt      | string | Fecha de última modificación (ISO)                             |
| course/division| object | Referencia `{ id }` al origen                                  |
| workshop/space | object | Entidad enriquecida al consultar (nullable)                    |
| schedule       | object | Entidad enriquecida al consultar (nullable)                    |

### Integrante (asociación alumno-grupo)

| Campo       | Tipo    | Descripción                               |
|-------------|---------|-------------------------------------------|
| id          | string  | ID único (prefijo `gmb_`)                 |
| groupId     | string  | Grupo                                     |
| studentId   | string  | Alumno (ref. al módulo de estudiantes)    |
| isActive    | boolean | Asociación vigente                        |
| createdBy   | string  | Usuario que agregó al alumno              |
| createdAt   | string  | Fecha de alta (ISO)                       |
| removedBy   | string  | Usuario que desasoció (nullable)          |
| removedAt   | string  | Fecha de baja (nullable)                  |

### Historial de cambios

| Campo        | Tipo    | Descripción                                  |
|--------------|---------|----------------------------------------------|
| id           | string  | ID único (prefijo `gh_`)                     |
| groupId      | string  | Grupo afectado                               |
| action       | string  | `create`, `update`, `activo`, `inactivo`, `finalizado`, `member_added`, `member_removed` |
| previousData | object  | Estado anterior (nullable)                   |
| newData      | object  | Estado nuevo (nullable)                      |
| changedBy    | string  | Usuario que realizó el cambio                |
| changedAt    | string  | Fecha/hora del cambio (ISO)                  |

## Reglas de negocio

- El grupo debe tener un identificador único y un nombre no vacío.
- Tipo de grupo válido: `curso`, `burbuja`, `taller`, `temporal`, `otro`.
- No se permiten **asociaciones duplicadas** entre un alumno y un grupo (409 si ya pertenece como activo).
- El **curso/división** de origen se guarda como referencia y se valida como campo obligatorio cuando corresponde.
- El **taller** asociado debe existir y estar activo (409 si está desactivado).
- El **espacio** asociado debe existir y estar **disponible** (`status === "activo"`).
- El **horario** asociado debe existir y estar activo.
- **Conflicto de planificación**: dos grupos activos no pueden compartir el mismo espacio **y** el mismo horario.
- **Conflicto de integrantes**: un alumno no puede pertenecer a dos grupos activos que compartan horario o espacio (incompatibles en el mismo período/horario).
- Un grupo **desactivado o finalizado** no acepta nuevos integrantes ni nuevas asignaciones.
- Un grupo **finalizado** no puede volver a cambiar de estado.
- La **desactivación/finalización no elimina** el grupo ni su historial (trazabilidad conservada).
- Todas las operaciones relevantes (creación, modificación, estado, integrantes, asociaciones) quedan registradas en el historial.
- Los permisos se verifican en el backend (`groups.read`, `groups.write`, `groups.manage`), nunca se confía en lo enviado por el frontend.

## Endpoints

### Grupos

| Método | Ruta                                           | Descripción                          | Permiso         |
|--------|------------------------------------------------|--------------------------------------|-----------------|
| POST   | `/api/v1/groups`                               | Crear grupo                          | groups.write    |
| GET    | `/api/v1/groups`                               | Listar grupos (con filtros)          | groups.read     |
| GET    | `/api/v1/groups/:groupId`                      | Consultar grupo por ID               | groups.read     |
| PATCH  | `/api/v1/groups/:groupId`                      | Modificar grupo                      | groups.write    |
| POST   | `/api/v1/groups/:groupId/activate`             | Activar grupo                        | groups.manage   |
| POST   | `/api/v1/groups/:groupId/deactivate`           | Desactivar grupo                     | groups.manage   |
| POST   | `/api/v1/groups/:groupId/finalize`             | Finalizar grupo                      | groups.manage   |

### Asociaciones

| Método | Ruta                                           | Descripción                          | Permiso         |
|--------|------------------------------------------------|--------------------------------------|-----------------|
| PATCH  | `/api/v1/groups/:groupId/division`             | Asociar curso/división               | groups.write    |
| PATCH  | `/api/v1/groups/:groupId/workshop`             | Asociar taller                       | groups.write    |
| PATCH  | `/api/v1/groups/:groupId/space`                | Asociar espacio                      | groups.write    |
| PATCH  | `/api/v1/groups/:groupId/schedule`             | Asociar horario                      | groups.write    |

### Integrantes

| Método | Ruta                                           | Descripción                          | Permiso         |
|--------|------------------------------------------------|--------------------------------------|-----------------|
| POST   | `/api/v1/groups/:groupId/members`              | Asociar alumno a grupo (`{studentId}`) | groups.write   |
| GET    | `/api/v1/groups/:groupId/members`              | Alumnos de un grupo                  | groups.read     |
| DELETE | `/api/v1/groups/:groupId/members/:studentId`   | Desasociar alumno                    | groups.write    |
| GET    | `/api/v1/groups/by-student/:studentId`         | Grupos de un alumno                  | groups.read     |

### Consultas por curso/división y planificación

| Método | Ruta                                           | Descripción                          | Permiso         |
|--------|------------------------------------------------|--------------------------------------|-----------------|
| GET    | `/api/v1/groups/by-course/:courseId`           | Grupos de un curso                   | groups.read     |
| GET    | `/api/v1/groups/by-division/:divisionId`       | Grupos de una división               | groups.read     |
| GET    | `/api/v1/groups/:groupId/planning`             | Espacio y horario actual del grupo   | groups.read     |
| GET    | `/api/v1/groups/:groupId/history`              | Historial del grupo                  | groups.read     |

### Filtros de listado (`GET /api/v1/groups`)

`type`, `courseId`, `divisionId`, `workshopId`, `spaceId`, `scheduleId`, `status`, `schoolId`, `includeInactive`

## Seguridad y auditoría

- Todas las rutas requieren `verifyToken` + permiso del módulo.
- Rol/es con `groups.read`: lectura; `groups.write`: creación, modificación e integrantes; `groups.manage`: activar/desactivar/finalizar.
- Los permisos se resuelven contra `permissions.config.mjs` en el backend.
- Errores uniformes: 401 (no autenticado), 403 (sin permiso), 400/422 (validación), 404 (no encontrado), 409 (conflicto).
- No se exponen datos internos ni identificadores de alumnos fuera de la respuesta autorizada.

## MySQL (migración)

Las tablas `grupos`, `grupo_integrantes` e `historial_grupos` están definidas en:

```
Backend/database/migrations/003_grupos.sql
```

Las referencias a curso/división se mantienen como identificadores textuales para ser consistentes con los módulos in-memory de horarios, espacios, talleres y ausencias.