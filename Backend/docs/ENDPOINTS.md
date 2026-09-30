# Endpoints de la API

<!-- Archivo generado por `npm run docs:endpoints` desde routes/index.mjs. No editar a mano. -->

Total: 199 endpoints. Autenticacion: `Authorization: Bearer <accessToken>` salvo las rutas publicas.

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
| POST | `/api/v1/students/:studentId/tutors` | `students.write` |
| GET | `/api/v1/students/:studentId/tutors` | `students.read` |

## observations

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/observations` | `observations.read` |

## dashboard

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/dashboard/secretaria` | `students.read` |

## alerts

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/alerts/:alertId/dismiss` | `students.write` |

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

## alumnos

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/alumnos/:alumnoId/situacion-academica` | `academic-records.read` |
| GET | `/api/v1/alumnos/:alumnoId/situacion-academica/:materiaId` | `academic-records.read` |
| GET | `/api/v1/alumnos/:alumnoId/historial-academico` | `academic-records.read` |

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
| POST | `/api/v1/teachers` | `teachers.write` |
| GET | `/api/v1/teachers` | `teachers.read` |
| GET | `/api/v1/teachers/:teacherId` | `teachers.read` |
| PATCH | `/api/v1/teachers/:teacherId` | `teachers.write` |
| DELETE | `/api/v1/teachers/:teacherId` | `teachers.manage` |
| POST | `/api/v1/teachers/:teacherId/subjects` | `teachers.write` |
| GET | `/api/v1/teachers/:teacherId/subjects` | `teachers.read` |

## teacher-subjects

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| DELETE | `/api/v1/teacher-subjects/:assignmentId` | `teachers.write` |

## absences

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/absences` | `absences.write` |
| GET | `/api/v1/absences` | `absences.read` |
| GET | `/api/v1/absences/:absenceId` | `absences.read` |
| PATCH | `/api/v1/absences/:absenceId` | `absences.write` |
| DELETE | `/api/v1/absences/:absenceId` | `absences.manage` |

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

## incidents

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/incidents` | `absences.write` |
| GET | `/api/v1/incidents` | `absences.read` |
| GET | `/api/v1/incidents/:incidentId` | `absences.read` |
| PATCH | `/api/v1/incidents/:incidentId` | `absences.write` |

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
| GET | `/api/v1/inventory/:itemId` | `inventory.read` |
| PATCH | `/api/v1/inventory/:itemId` | `inventory.write` |
| DELETE | `/api/v1/inventory/:itemId` | `inventory.manage` |

## inventory-movements

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/inventory-movements` | `inventory.write` |
| GET | `/api/v1/inventory-movements` | `inventory.read` |

## requests

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| POST | `/api/v1/requests` | `requests.write` |
| GET | `/api/v1/requests` | `requests.read` |
| GET | `/api/v1/requests/:requestId` | `requests.read` |
| PATCH | `/api/v1/requests/:requestId` | `requests.write` |
| POST | `/api/v1/requests/:requestId/comments` | `requests.write` |
| GET | `/api/v1/requests/:requestId/comments` | `requests.read` |

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
| GET | `/api/v1/notifications/:notificationId` | `notifications.read` |
| POST | `/api/v1/notifications/:notificationId/read` | `notifications.read` |
| POST | `/api/v1/notifications/read-all` | `notifications.read` |

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

## audit

| Metodo | Ruta | Permiso |
| --- | --- | --- |
| GET | `/api/v1/audit/logs` | `audit.read` |
| GET | `/api/v1/audit/logs/:logId` | `audit.read` |
| GET | `/api/v1/audit/errors` | `audit.read` |
| GET | `/api/v1/audit/errors/:errorId` | `audit.read` |
| GET | `/api/v1/audit/report` | `audit.read` |
| GET | `/api/v1/audit/export` | `audit.export` |
