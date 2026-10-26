# Endpoints de la API

<!-- Archivo generado por `npm run docs:endpoints` desde routes/index.mjs. No editar a mano. -->

Total: 416 endpoints. Autenticacion: `Authorization: Bearer <accessToken>` salvo las rutas publicas.

## health

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/health` | publica |

## modules

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/modules` | publica |

## roles

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/roles` | publica |

## authorization

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/authorization/me` | sesion valida |
| GET | `/api/v1/authorization/modules` | `identity.read` |
| GET | `/api/v1/authorization/roles` | `identity.read` |
| GET | `/api/v1/authorization/permissions` | `identity.read` |
| GET | `/api/v1/authorization/roles/:codigo/permissions` | `identity.read` |
| PUT | `/api/v1/authorization/roles/:codigo/permissions` | `identity.update` |

## auth

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | publica |
| POST | `/api/v1/auth/refresh` | publica |
| POST | `/api/v1/auth/logout` | publica |
| GET | `/api/v1/auth/me` | sesion valida |
| GET | `/api/v1/auth/permissions` | sesion valida |

## users

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/users` | `users.read` |
| POST | `/api/v1/users` | `identity.create` |
| GET | `/api/v1/users/:userId` | `users.read` |
| PATCH | `/api/v1/users/:userId` | `identity.update` |
| PUT | `/api/v1/users/:userId/roles` | `identity.update` |
| PATCH | `/api/v1/users/:userId/deactivate` | `users.deactivate` |

## schools

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/schools/:schoolId/courses/:courseId/divisions/:divisionId/students` | `students.read` |

## students

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/students/listas/curso` | `students.read` |
| GET | `/api/v1/students/listas/division` | `students.read` |
| GET | `/api/v1/students/listas/grupo` | `students.read` |
| GET | `/api/v1/students/listas/taller` | `students.read` |
| POST | `/api/v1/students` | `students.write` |
| POST | `/api/v1/students/bulk` | `students.write` |
| GET | `/api/v1/students` | `students.read` |
| GET | `/api/v1/students/divisions` | `students.read` |
| GET | `/api/v1/students/:studentId` | `students.read` |
| PATCH | `/api/v1/students/:studentId` | `students.write` |
| DELETE | `/api/v1/students/:studentId` | `students.write` |
| GET | `/api/v1/students/:studentId/summary` | `students.read` |
| GET | `/api/v1/students/:studentId/profile` | `students.read` |
| GET | `/api/v1/students/:studentId/observations` | `observations.read` |
| POST | `/api/v1/students/:studentId/observations` | `observations.write` |
| POST | `/api/v1/students/:studentId/transfers` | `students.write` |
| POST | `/api/v1/students/:studentId/certificate` | `documents.write` |
| GET | `/api/v1/students/:studentId/particular-conditions` | `particular-conditions.read` |
| POST | `/api/v1/students/:studentId/particular-conditions` | `particular-conditions.write` |
| POST | `/api/v1/students/:studentId/promover` | `course-changes.write` |
| POST | `/api/v1/students/:studentId/cambio-curso` | `course-changes.write` |
| POST | `/api/v1/students/:studentId/cambio-division` | `course-changes.write` |
| GET | `/api/v1/students/:studentId/book-registry/exists` | `book-registry.read` |
| GET | `/api/v1/students/:studentId/book-registry` | `book-registry.read` |
| POST | `/api/v1/students/:studentId/book-registry` | `book-registry.write` |
| POST | `/api/v1/students/:studentId/tutors` | `students.write` |
| GET | `/api/v1/students/:studentId/tutors` | `students.read` |

## observations

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/observations/catalogos` | `observations.read` |
| GET | `/api/v1/observations` | `observations.read` |
| GET | `/api/v1/observations/:observationId` | `observations.read` |
| PATCH | `/api/v1/observations/:observationId` | `observations.write` |
| POST | `/api/v1/observations/:observationId/seguimientos` | `observations.write` |
| GET | `/api/v1/observations/:observationId/seguimientos` | `observations.read` |

## seguimientos-observacion

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/seguimientos-observacion/:seguimientoId` | `observations.read` |
| PATCH | `/api/v1/seguimientos-observacion/:seguimientoId` | `observations.write` |

## alumnos

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/alumnos/:alumnoId/observaciones/resumen` | `observations.read` |
| GET | `/api/v1/alumnos/:alumnoId/observaciones` | `observations.read` |
| GET | `/api/v1/alumnos/:alumnoId/condiciones/resumen` | `particular-conditions.read` |
| GET | `/api/v1/alumnos/:alumnoId/condiciones` | `particular-conditions.read` |
| GET | `/api/v1/alumnos/:alumnoId/movimientos-cursos` | `course-changes.read` |
| GET | `/api/v1/alumnos/:alumnoId/movimientos-cursos/ultimo` | `course-changes.read` |
| GET | `/api/v1/alumnos/:alumnoId/situacion-curso` | `course-changes.read` |
| GET | `/api/v1/alumnos/:alumnoId/libro-matriz` | `book-registry.read` |
| GET | `/api/v1/alumnos/:alumnoId/situacion-academica` | `academic-records.read` |
| GET | `/api/v1/alumnos/:alumnoId/situacion-academica/:materiaId` | `academic-records.read` |
| GET | `/api/v1/alumnos/:alumnoId/historial-academico` | `academic-records.read` |
| GET | `/api/v1/alumnos/:alumnoId/calificaciones` | `grades.read` |
| GET | `/api/v1/alumnos/:alumnoId/calificaciones/resumen` | `grades.read` |
| GET | `/api/v1/alumnos/:alumnoId/inasistencias` | `attendance.read` |
| GET | `/api/v1/alumnos/:alumnoId/alertas` | `attendance-alerts.read` |
| GET | `/api/v1/alumnos/:alumnoId/alertas/resumen` | `attendance-alerts.read` |
| GET | `/api/v1/alumnos/:alumnoId/seguimiento-inasistencia` | `attendance-followups.read` |
| GET | `/api/v1/alumnos/:alumnoId/seguimiento-inasistencia/ultima` | `attendance-followups.read` |
| GET | `/api/v1/alumnos/:alumnoId/seguimiento-inasistencia/resumen` | `attendance-followups.read` |

## dashboard

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/dashboard/secretaria` | `students.read` |
| GET | `/api/v1/dashboard/server` | `inventory.read` |

## jefatura

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/jefatura/cursos-grupos` | `academics.read` |
| GET | `/api/v1/jefatura/grilla` | `schedules.read` |

## alerts

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/alerts/:alertId/dismiss` | `students.write` |

## particular-conditions

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/particular-conditions/catalogos` | `particular-conditions.read` |
| GET | `/api/v1/particular-conditions` | `particular-conditions.read` |
| GET | `/api/v1/particular-conditions/:conditionId` | `particular-conditions.read` |
| PATCH | `/api/v1/particular-conditions/:conditionId` | `particular-conditions.write` |
| POST | `/api/v1/particular-conditions/:conditionId/finalizar` | `particular-conditions.write` |

## movimientos-cursos

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/movimientos-cursos/catalogos` | `course-changes.read` |
| GET | `/api/v1/movimientos-cursos/asignados` | `course-changes.read` |
| GET | `/api/v1/movimientos-cursos/operaciones/:operacionId` | `course-changes.read` |
| POST | `/api/v1/movimientos-cursos/masivos` | `course-changes.write` |
| GET | `/api/v1/movimientos-cursos` | `course-changes.read` |
| GET | `/api/v1/movimientos-cursos/:movimientoId` | `course-changes.read` |

## book-registry

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/book-registry/catalogos` | `book-registry.read` |
| GET | `/api/v1/book-registry` | `book-registry.read` |
| GET | `/api/v1/book-registry/:registryId/historial` | `book-registry.read` |
| GET | `/api/v1/book-registry/:registryId` | `book-registry.read` |
| PATCH | `/api/v1/book-registry/:registryId` | `book-registry.write` |

## tutors

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/tutors` | `students.write` |
| GET | `/api/v1/tutors` | `students.read` |
| GET | `/api/v1/tutors/:tutorId` | `students.read` |
| PATCH | `/api/v1/tutors/:tutorId` | `students.write` |
| DELETE | `/api/v1/tutors/:tutorId` | `students.write` |
| GET | `/api/v1/tutors/:tutorId/students` | `students.read` |

## student-tutors

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| PATCH | `/api/v1/student-tutors/:relationId` | `students.write` |
| DELETE | `/api/v1/student-tutors/:relationId` | `students.write` |

## ciclos

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/ciclos` | `academics.write` |
| GET | `/api/v1/ciclos` | `academics.read` |
| GET | `/api/v1/ciclos/:cicloId` | `academics.read` |
| PATCH | `/api/v1/ciclos/:cicloId` | `academics.write` |
| DELETE | `/api/v1/ciclos/:cicloId` | `academics.manage` |

## orientaciones

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/orientaciones` | `academics.write` |
| GET | `/api/v1/orientaciones` | `academics.read` |
| GET | `/api/v1/orientaciones/:orientacionId` | `academics.read` |
| PATCH | `/api/v1/orientaciones/:orientacionId` | `academics.write` |
| DELETE | `/api/v1/orientaciones/:orientacionId` | `academics.manage` |

## cursos

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/cursos` | `academics.write` |
| GET | `/api/v1/cursos` | `academics.read` |
| GET | `/api/v1/cursos/:cursoId` | `academics.read` |
| GET | `/api/v1/cursos/:cursoId/divisiones` | `academics.read` |
| GET | `/api/v1/cursos/:cursoId/alumnos` | `academics.read` |
| GET | `/api/v1/cursos/:cursoId/materias` | `academics.read` |
| GET | `/api/v1/cursos/:cursoId/docentes` | `academics.read` |
| GET | `/api/v1/cursos/:cursoId/horarios` | `academics.read` |
| PATCH | `/api/v1/cursos/:cursoId` | `academics.write` |
| DELETE | `/api/v1/cursos/:cursoId` | `academics.manage` |

## divisiones

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/divisiones` | `academics.write` |
| GET | `/api/v1/divisiones` | `academics.read` |
| GET | `/api/v1/divisiones/:divisionId` | `academics.read` |
| GET | `/api/v1/divisiones/:divisionId/alumnos` | `academics.read` |
| GET | `/api/v1/divisiones/:divisionId/materias` | `academics.read` |
| GET | `/api/v1/divisiones/:divisionId/docentes` | `academics.read` |
| GET | `/api/v1/divisiones/:divisionId/horarios` | `academics.read` |
| PATCH | `/api/v1/divisiones/:divisionId` | `academics.write` |
| DELETE | `/api/v1/divisiones/:divisionId` | `academics.manage` |

## situaciones-academicas

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/situaciones-academicas` | `academic-records.write` |
| GET | `/api/v1/situaciones-academicas` | `academic-records.read` |
| GET | `/api/v1/situaciones-academicas/catalogos` | `academic-records.read` |
| GET | `/api/v1/situaciones-academicas/pendientes` | `academic-records.read` |
| GET | `/api/v1/situaciones-academicas/recursadas` | `academic-records.read` |
| GET | `/api/v1/situaciones-academicas/intensificadas` | `academic-records.read` |
| GET | `/api/v1/situaciones-academicas/:situacionId` | `academic-records.read` |
| PATCH | `/api/v1/situaciones-academicas/:situacionId` | `academic-records.write` |

## calificaciones

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/calificaciones/catalogos` | `grades.read` |
| POST | `/api/v1/calificaciones` | `grades.write` |
| GET | `/api/v1/calificaciones` | `grades.read` |
| GET | `/api/v1/calificaciones/:calificacionId` | `grades.read` |
| PATCH | `/api/v1/calificaciones/:calificacionId` | `grades.write` |
| DELETE | `/api/v1/calificaciones/:calificacionId` | `grades.write` |

## docentes

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/docentes/:docenteId/calificaciones` | `grades.read` |

## buildings

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/buildings` | `spaces.write` |
| GET | `/api/v1/buildings` | `spaces.read` |
| GET | `/api/v1/buildings/:buildingId` | `spaces.read` |
| PATCH | `/api/v1/buildings/:buildingId` | `spaces.write` |

## spaces

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/spaces` | `spaces.write` |
| GET | `/api/v1/spaces` | `spaces.read` |
| GET | `/api/v1/spaces/:spaceId` | `spaces.read` |
| PATCH | `/api/v1/spaces/:spaceId` | `spaces.write` |
| DELETE | `/api/v1/spaces/:spaceId` | `spaces.manage` |

## careers

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/careers` | `academics.write` |
| GET | `/api/v1/careers` | `academics.read` |
| GET | `/api/v1/careers/:careerId` | `academics.read` |
| PATCH | `/api/v1/careers/:careerId` | `academics.write` |

## shifts

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/shifts` | `schedules.write` |
| GET | `/api/v1/shifts` | `schedules.read` |
| GET | `/api/v1/shifts/:shiftId` | `schedules.read` |
| PATCH | `/api/v1/shifts/:shiftId` | `schedules.write` |

## time-slots

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/time-slots` | `schedules.write` |
| GET | `/api/v1/time-slots` | `schedules.read` |
| GET | `/api/v1/time-slots/:timeSlotId` | `schedules.read` |
| PATCH | `/api/v1/time-slots/:timeSlotId` | `schedules.write` |

## schedules

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/schedules` | `schedules.write` |
| GET | `/api/v1/schedules` | `schedules.read` |
| GET | `/api/v1/schedules/:scheduleId` | `schedules.read` |
| PATCH | `/api/v1/schedules/:scheduleId` | `schedules.write` |

## schedule-assignments

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/schedule-assignments` | `schedules.write` |
| GET | `/api/v1/schedule-assignments` | `schedules.read` |
| GET | `/api/v1/schedule-assignments/:assignmentId` | `schedules.read` |
| PATCH | `/api/v1/schedule-assignments/:assignmentId` | `schedules.write` |
| DELETE | `/api/v1/schedule-assignments/:assignmentId` | `schedules.manage` |

## teachers

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/teachers/catalogos` | `teachers.read` |
| GET | `/api/v1/teachers/by-subject/:subjectId` | `teachers.read` |
| GET | `/api/v1/teachers/by-course/:cursoId` | `teachers.read` |
| GET | `/api/v1/teachers/by-division/:divisionId` | `teachers.read` |
| POST | `/api/v1/teachers` | `teachers.write` |
| GET | `/api/v1/teachers` | `teachers.read` |
| GET | `/api/v1/teachers/:teacherId` | `teachers.read` |
| PATCH | `/api/v1/teachers/:teacherId` | `teachers.write` |
| DELETE | `/api/v1/teachers/:teacherId` | `teachers.manage` |
| POST | `/api/v1/teachers/:teacherId/subjects` | `teachers.write` |
| GET | `/api/v1/teachers/:teacherId/subjects` | `teachers.read` |
| GET | `/api/v1/teachers/:teacherId/subjects/:assignmentId` | `teachers.read` |
| POST | `/api/v1/teachers/:teacherId/courses` | `teachers.write` |
| GET | `/api/v1/teachers/:teacherId/courses` | `teachers.read` |
| GET | `/api/v1/teachers/:teacherId/courses/:assignmentId` | `teachers.read` |

## teacher-subjects

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| PATCH | `/api/v1/teacher-subjects/:assignmentId` | `teachers.write` |
| DELETE | `/api/v1/teacher-subjects/:assignmentId` | `teachers.write` |

## teacher-courses

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| PATCH | `/api/v1/teacher-courses/:assignmentId` | `teachers.write` |
| DELETE | `/api/v1/teacher-courses/:assignmentId` | `teachers.write` |

## inasistencias

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/inasistencias/motivos` | `attendance.read` |
| POST | `/api/v1/inasistencias` | `attendance.write` |
| GET | `/api/v1/inasistencias` | `attendance.read` |
| GET | `/api/v1/inasistencias/estadisticas` | `attendance.read` |
| GET | `/api/v1/inasistencias/alumno/:alumnoId/totales` | `attendance.read` |
| GET | `/api/v1/inasistencias/:inasistenciaId/historial` | `attendance.read` |
| GET | `/api/v1/inasistencias/:inasistenciaId` | `attendance.read` |
| POST | `/api/v1/inasistencias/:inasistenciaId/justify` | `attendance.write` |
| PATCH | `/api/v1/inasistencias/:inasistenciaId` | `attendance.write` |

## absences

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/absences/available-spaces` | `absences.read` |
| GET | `/api/v1/absences/affected-activities` | `absences.read` |
| GET | `/api/v1/absences/grid` | `absences.read` |
| POST | `/api/v1/absences` | `absences.write` |
| GET | `/api/v1/absences` | `absences.read` |
| GET | `/api/v1/absences/:absenceId/history` | `absences.read` |
| GET | `/api/v1/absences/:absenceId/availability` | `absences.read` |
| POST | `/api/v1/absences/:absenceId/reactivate` | `absences.manage` |
| GET | `/api/v1/absences/:absenceId` | `absences.read` |
| PATCH | `/api/v1/absences/:absenceId` | `absences.write` |
| POST | `/api/v1/absences/:absenceId/annul` | `absences.manage` |
| DELETE | `/api/v1/absences/:absenceId` | `absences.manage` |

## absence-liberations

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| PATCH | `/api/v1/absence-liberations/:availabilityId` | `absences.write` |

## absence-events

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/absence-events` | `absences.read` |
| POST | `/api/v1/absence-events` | `absences.write` |
| GET | `/api/v1/absence-events/by-absence/:absenceId` | `absences.read` |
| GET | `/api/v1/absence-events/:eventId/class-state` | `absences.read` |
| GET | `/api/v1/absence-events/:eventId/space-availability` | `absences.read` |
| GET | `/api/v1/absence-events/:eventId/affected-classes` | `absences.read` |
| GET | `/api/v1/absence-events/:eventId/notifications` | `absences.read` |
| GET | `/api/v1/absence-events/:eventId` | `absences.read` |

## incidents

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/incidents` | `absences.write` |
| GET | `/api/v1/incidents` | `absences.read` |
| GET | `/api/v1/incidents/:incidentId` | `absences.read` |
| PATCH | `/api/v1/incidents/:incidentId` | `absences.write` |

## alertas

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/alertas/inasistencias` | `attendance.write` |
| GET | `/api/v1/alertas/inasistencias` | `attendance.read` |
| GET | `/api/v1/alertas/inasistencias/:inasistenciaId` | `attendance.read` |
| PATCH | `/api/v1/alertas/inasistencias/:inasistenciaId` | `attendance.write` |
| DELETE | `/api/v1/alertas/inasistencias/:inasistenciaId` | `attendance.write` |
| POST | `/api/v1/alertas/evaluar` | `attendance-alerts.write` |
| GET | `/api/v1/alertas/evaluaciones` | `attendance-alerts.read` |
| GET | `/api/v1/alertas/catalogos` | `attendance-alerts.read` |
| GET | `/api/v1/alertas` | `attendance-alerts.read` |
| GET | `/api/v1/alertas/:alertaId` | `attendance-alerts.read` |
| PATCH | `/api/v1/alertas/:alertaId` | `attendance-alerts.write` |
| POST | `/api/v1/alertas/:alertaId/reenviar` | `attendance-alerts.write` |

## configuracion-alertas

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/configuracion-alertas` | `attendance-alerts.read` |
| PUT | `/api/v1/configuracion-alertas` | `attendance-alerts.configure` |

## seguimientos-inasistencia

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/seguimientos-inasistencia` | `attendance-followups.write` |
| GET | `/api/v1/seguimientos-inasistencia` | `attendance-followups.read` |
| GET | `/api/v1/seguimientos-inasistencia/catalogos` | `attendance-followups.read` |
| GET | `/api/v1/seguimientos-inasistencia/alumnos` | `attendance-followups.read` |
| GET | `/api/v1/seguimientos-inasistencia/:seguimientoId` | `attendance-followups.read` |
| PATCH | `/api/v1/seguimientos-inasistencia/:seguimientoId` | `attendance-followups.write` |

## workshops

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/workshops` | `workshops.write` |
| GET | `/api/v1/workshops` | `workshops.read` |
| GET | `/api/v1/workshops/:workshopId` | `workshops.read` |
| PATCH | `/api/v1/workshops/:workshopId` | `workshops.write` |
| DELETE | `/api/v1/workshops/:workshopId` | `workshops.manage` |

## workshop-sessions

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/workshop-sessions` | `workshops.write` |
| GET | `/api/v1/workshop-sessions` | `workshops.read` |
| GET | `/api/v1/workshop-sessions/:sessionId` | `workshops.read` |
| PATCH | `/api/v1/workshop-sessions/:sessionId` | `workshops.write` |

## inventory

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/inventory` | `inventory.write` |
| GET | `/api/v1/inventory` | `inventory.read` |
| GET | `/api/v1/inventory/stock-low` | `inventory.read` |
| GET | `/api/v1/inventory/:itemId/stock` | `inventory.read` |
| GET | `/api/v1/inventory/:itemId/stock/verify` | `inventory.read` |
| GET | `/api/v1/inventory/:itemId/movements` | `inventory.read` |
| GET | `/api/v1/inventory/:itemId/history` | `inventory.read` |
| POST | `/api/v1/inventory/:itemId/movements` | `inventory.write` |
| POST | `/api/v1/inventory/:itemId/movements/adjust` | `inventory.manage` |
| GET | `/api/v1/inventory/:itemId` | `inventory.read` |
| PATCH | `/api/v1/inventory/:itemId` | `inventory.write` |
| DELETE | `/api/v1/inventory/:itemId` | `inventory.manage` |

## inventory-movements

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/inventory-movements` | `inventory.write` |
| GET | `/api/v1/inventory-movements` | `inventory.read` |
| GET | `/api/v1/inventory-movements/:movementId` | `inventory.read` |

## requests

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/requests` | `requests.write` |
| GET | `/api/v1/requests` | `requests.read` |
| GET | `/api/v1/requests/:requestId` | `requests.read` |
| PATCH | `/api/v1/requests/:requestId` | `requests.write` |
| POST | `/api/v1/requests/:requestId/comments` | `requests.write` |
| GET | `/api/v1/requests/:requestId/comments` | `requests.read` |

## material-requests

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/material-requests` | `requests.write` |
| GET | `/api/v1/material-requests` | `requests.read` |
| POST | `/api/v1/material-requests/:requestId/status` | `requests.manage` |
| POST | `/api/v1/material-requests/:requestId/approve` | `requests.manage` |
| POST | `/api/v1/material-requests/:requestId/reject` | `requests.manage` |
| POST | `/api/v1/material-requests/:requestId/cancel` | `requests.write` |
| POST | `/api/v1/material-requests/:requestId/deliver` | `requests.manage`, `inventory.write` |
| POST | `/api/v1/material-requests/:requestId/close` | `requests.manage` |
| GET | `/api/v1/material-requests/:requestId/history` | `requests.read` |
| GET | `/api/v1/material-requests/:requestId` | `requests.read` |
| PATCH | `/api/v1/material-requests/:requestId` | `requests.write` |

## material-reservations

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/material-reservations` | `reservations.write` |
| GET | `/api/v1/material-reservations` | `reservations.read` |
| GET | `/api/v1/material-reservations/availability` | `reservations.read` |
| POST | `/api/v1/material-reservations/:reservationId/approve` | `reservations.manage` |
| POST | `/api/v1/material-reservations/:reservationId/reject` | `reservations.manage` |
| POST | `/api/v1/material-reservations/:reservationId/cancel` | `reservations.write` |
| POST | `/api/v1/material-reservations/:reservationId/deliver` | `reservations.manage`, `inventory.write` |
| POST | `/api/v1/material-reservations/:reservationId/finish` | `reservations.manage` |
| GET | `/api/v1/material-reservations/:reservationId/history` | `reservations.read` |
| GET | `/api/v1/material-reservations/:reservationId` | `reservations.read` |
| PATCH | `/api/v1/material-reservations/:reservationId` | `reservations.write` |

## reservations

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/reservations` | `reservations.write` |
| GET | `/api/v1/reservations` | `reservations.read` |
| GET | `/api/v1/reservations/:reservationId` | `reservations.read` |
| PATCH | `/api/v1/reservations/:reservationId` | `reservations.write` |
| POST | `/api/v1/reservations/:reservationId/approve` | `reservations.manage` |
| POST | `/api/v1/reservations/:reservationId/reject` | `reservations.manage` |
| POST | `/api/v1/reservations/:reservationId/cancel` | `reservations.write` |

## notifications

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/notifications` | `notifications.write` |
| GET | `/api/v1/notifications` | `notifications.read` |
| GET | `/api/v1/notifications/unread-count` | `notifications.read` |
| POST | `/api/v1/notifications/read` | `notifications.write` |
| POST | `/api/v1/notifications/read-all` | `notifications.write` |
| GET | `/api/v1/notifications/:notificationId` | `notifications.read` |
| POST | `/api/v1/notifications/:notificationId/read` | `notifications.write` |
| POST | `/api/v1/notifications/:notificationId/archive` | `notifications.write` |

## devices

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/devices` | sesion valida |
| GET | `/api/v1/devices` | sesion valida |
| DELETE | `/api/v1/devices/:deviceId` | sesion valida |

## curriculum

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/curriculum/areas` | `curriculum.write` |
| GET | `/api/v1/curriculum/areas` | `curriculum.read` |
| GET | `/api/v1/curriculum/areas/:areaId` | `curriculum.read` |
| PATCH | `/api/v1/curriculum/areas/:areaId` | `curriculum.write` |
| POST | `/api/v1/curriculum/plans` | `curriculum.write` |
| GET | `/api/v1/curriculum/plans` | `curriculum.read` |
| GET | `/api/v1/curriculum/plans/:planId` | `curriculum.read` |
| PATCH | `/api/v1/curriculum/plans/:planId` | `curriculum.write` |
| POST | `/api/v1/curriculum/activities` | `curriculum.write` |
| GET | `/api/v1/curriculum/activities` | `curriculum.read` |
| GET | `/api/v1/curriculum/activities/:activityId` | `curriculum.read` |
| PATCH | `/api/v1/curriculum/activities/:activityId` | `curriculum.write` |
| POST | `/api/v1/curriculum/materias` | `academics.write` |
| GET | `/api/v1/curriculum/materias` | `curriculum.read` |
| GET | `/api/v1/curriculum/materias/:subjectId` | `curriculum.read` |
| PATCH | `/api/v1/curriculum/materias/:subjectId` | `academics.write` |
| POST | `/api/v1/curriculum/disenos` | `curriculum.manage` |
| GET | `/api/v1/curriculum/disenos` | `curriculum.read` |
| GET | `/api/v1/curriculum/disenos/:designId` | `curriculum.read` |
| PATCH | `/api/v1/curriculum/disenos/:designId` | `curriculum.manage` |
| POST | `/api/v1/curriculum/contenidos` | `curriculum.write` |
| GET | `/api/v1/curriculum/contenidos` | `curriculum.read` |
| GET | `/api/v1/curriculum/contenidos/pendientes` | `curriculum.read` |
| GET | `/api/v1/curriculum/contenidos/:contentId/seguimientos` | `curriculum.read` |
| GET | `/api/v1/curriculum/contenidos/:contentId/historial` | `curriculum.read` |
| GET | `/api/v1/curriculum/contenidos/:contentId` | `curriculum.read` |
| PATCH | `/api/v1/curriculum/contenidos/:contentId` | `curriculum.write` |
| POST | `/api/v1/curriculum/seguimientos` | `curriculum.track` |
| GET | `/api/v1/curriculum/seguimientos` | `curriculum.read` |
| GET | `/api/v1/curriculum/seguimientos/:trackingId` | `curriculum.read` |
| PATCH | `/api/v1/curriculum/seguimientos/:trackingId` | `curriculum.track` |
| GET | `/api/v1/curriculum/avance/materia` | `curriculum.read` |
| GET | `/api/v1/curriculum/avance/curso` | `curriculum.read` |
| GET | `/api/v1/curriculum/avance/docente` | `curriculum.read` |
| GET | `/api/v1/curriculum/avance/periodo` | `curriculum.read` |
| GET | `/api/v1/curriculum/avance/pendientes` | `curriculum.read` |

## teacher-plans

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/teacher-plans` | `planning.write` |
| GET | `/api/v1/teacher-plans` | `planning.read` |
| GET | `/api/v1/teacher-plans/by-teacher/:teacherId` | `planning.read` |
| GET | `/api/v1/teacher-plans/by-subject/:subjectId` | `planning.read` |
| GET | `/api/v1/teacher-plans/by-course/:courseId` | `planning.read` |
| GET | `/api/v1/teacher-plans/by-period/:year` | `planning.read` |
| GET | `/api/v1/teacher-plans/:planId/status` | `planning.read` |
| GET | `/api/v1/teacher-plans/:planId/history` | `planning.read` |
| GET | `/api/v1/teacher-plans/:planId/curriculum-comparison` | `planning.read` |
| PATCH | `/api/v1/teacher-plans/:planId/status` | `planning.write` |
| GET | `/api/v1/teacher-plans/:planId` | `planning.read` |
| PATCH | `/api/v1/teacher-plans/:planId` | `planning.write` |
| DELETE | `/api/v1/teacher-plans/:planId` | `planning.manage` |

## planning-controls

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/planning-controls` | `planning.review` |
| GET | `/api/v1/planning-controls` | `planning.read` |
| GET | `/api/v1/planning-controls/pending` | `planning.read` |
| GET | `/api/v1/planning-controls/by-teacher/:teacherId` | `planning.read` |
| GET | `/api/v1/planning-controls/by-subject/:subjectId` | `planning.read` |
| GET | `/api/v1/planning-controls/by-course/:courseId` | `planning.read` |
| GET | `/api/v1/planning-controls/by-period/:year` | `planning.read` |
| GET | `/api/v1/planning-controls/by-status/:status` | `planning.read` |
| GET | `/api/v1/planning-controls/planning/:planId/history` | `planning.read` |
| GET | `/api/v1/planning-controls/planning/:planId` | `planning.read` |
| GET | `/api/v1/planning-controls/:controlId/history` | `planning.read` |
| PATCH | `/api/v1/planning-controls/:controlId/status` | `planning.review` |
| GET | `/api/v1/planning-controls/:controlId` | `planning.read` |
| PATCH | `/api/v1/planning-controls/:controlId` | `planning.review` |

## groups

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/groups` | `groups.write` |
| GET | `/api/v1/groups` | `groups.read` |
| GET | `/api/v1/groups/by-student/:studentId` | `groups.read` |
| GET | `/api/v1/groups/by-course/:courseId` | `groups.read` |
| GET | `/api/v1/groups/by-division/:divisionId` | `groups.read` |
| POST | `/api/v1/groups/:groupId/members` | `groups.write` |
| GET | `/api/v1/groups/:groupId/members` | `groups.read` |
| DELETE | `/api/v1/groups/:groupId/members/:studentId` | `groups.write` |
| GET | `/api/v1/groups/:groupId/planning` | `groups.read` |
| GET | `/api/v1/groups/:groupId/history` | `groups.read` |
| PATCH | `/api/v1/groups/:groupId/division` | `groups.write` |
| PATCH | `/api/v1/groups/:groupId/workshop` | `groups.write` |
| PATCH | `/api/v1/groups/:groupId/space` | `groups.write` |
| PATCH | `/api/v1/groups/:groupId/schedule` | `groups.write` |
| POST | `/api/v1/groups/:groupId/activate` | `groups.manage` |
| POST | `/api/v1/groups/:groupId/deactivate` | `groups.manage` |
| POST | `/api/v1/groups/:groupId/finalize` | `groups.manage` |
| GET | `/api/v1/groups/:groupId` | `groups.read` |
| PATCH | `/api/v1/groups/:groupId` | `groups.write` |

## reassignments

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/reassignments` | `reassignments.write` |
| GET | `/api/v1/reassignments` | `reassignments.read` |
| GET | `/api/v1/reassignments/current-space/:assignmentId` | `reassignments.read` |
| GET | `/api/v1/reassignments/by-activity/:assignmentId` | `reassignments.read` |
| POST | `/api/v1/reassignments/:reassignmentId/revert` | `reassignments.write` |
| GET | `/api/v1/reassignments/:reassignmentId` | `reassignments.read` |
| PATCH | `/api/v1/reassignments/:reassignmentId` | `reassignments.write` |

## audit

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/audit/logs` | `audit.read` |
| GET | `/api/v1/audit/logs/:logId` | `audit.read` |
| GET | `/api/v1/audit/errors` | `audit.read` |
| GET | `/api/v1/audit/errors/:errorId` | `audit.read` |
| GET | `/api/v1/audit/report` | `audit.read` |
| GET | `/api/v1/audit/export` | `audit.export` |
