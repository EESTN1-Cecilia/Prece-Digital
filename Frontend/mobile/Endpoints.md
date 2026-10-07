# Mobile (aplicación móvil)

Aplicación móvil del proyecto PreceDigital. Este documento es el **relevamiento técnico y
funcional de los endpoints**.

---

## Relevamiento de endpoints para Mobile

---

### 1. Resumen del relevamiento

#### 1.1 Objetivo

Determinar qué functionalities necesita la app móvil, qué endpoints de la API común ya las
cubren, cuáles se pueden reutilizar sin cambios, cuáles requieren ajustes en Backend y
cuáles no están cubiertos.

#### 1.2 Uso de la API común

Mobile debe consumir **la misma API que Web**, bajo el prefijo `/api/v1`. No existe ni debe
existir un backend, servidor o autenticación paralela para Mobile.

#### 1.3 Reutilización y no duplicación

La API expone **190 endpoints** en `Backend/routes/index.mjs`. El relevamiento verificó
endpoint por endpoint contra esa fuente. Solo se marcan como *Nuevo endpoint* funcionalidades para las que **no existe equivalente**; el motivo queda justificado en la sección 11.3.

#### 1.4 Roles y permisos

La autorización es **exclusiva del Backend**. Mobile no implementa autorización paralela:

- `verifyToken` resuelve la identidad desde el Bearer token.
- `authorize` (`required`) valida permiso contra `config/permissions.config.mjs`.
- El cliente solo oculta opciones de UI: eso es usabilidad, no seguridad.

Mobile debe consumir `GET /api/v1/auth/me` para conocer roles, permisos y alcances, y usar
ese resultado únicamente para decidir qué mostrar.

#### 1.5 Mínima exposición de datos

Varios endpoints devuelven más información de la que una pantalla móvil necesita, o incluso
información de otros usuarios. Todos están clasificados como *Reutilizable con ajustes* y el
campo a excluir está detallado en la sección 12.

#### 1.6 Resumen de clasificaciones

| Clasificación | Cantidad aproximada |
| --- | --- |
| Reutilizable | 12 |
| Reutilizable con ajustes | 27 |
| Nuevo endpoint (no cubierto) | 7 |

---

### 2. Funcionalidades relevadas

Roles **sin** el permiso necesario se indican como `No aplica`. Cuando no se pudo determinar
con el código, figura `Pendiente de definición`.

| Funcionalidad | Rol | Acción | Información necesaria | Endpoint | Clasificación | Datos restringidos |
|---|---|---|---|---|---|---|
| Autenticarse con email y contraseña | Todos | Escribir body | Sesión: tokens + usuario | `POST /api/v1/auth/login` | Reutilizable | Contraseña y hash nunca en respuesta |
| Renovar sesión | Todos | Escribir body | Token nuevo | `POST /api/v1/auth/refresh` | Reutilizable | Refresh token enStorage seguro |
| Cerrar sesión | Todos | Escribir body | Confirmación | `POST /api/v1/auth/logout` | Reutilizable | — |
| Información del usuario autenticado | Todos | Leer | `user`, `roles`, `permisos`, `alcances` | `GET /api/v1/auth/me` | Reutilizable | `passwordHash`, `isActive` interno |
| Resumen de permisos por módulo | Todos | Leer | Resumen por módulo | `GET /api/v1/auth/permissions` | Reutilizable | — |
| Perfil y datos asociados al usuario | Todos | Leer | Nombre, email, roles | `GET /api/v1/auth/me` | Reutilizable con ajustes | Assignments de otros roles |
| Cambiar contraseña propia | Todos | Escribir body | — | No identificado | Nuevo endpoint | Contraseña actual y nueva |
| Mi contexto operativo (docente/división) | preceptor, docente | Leer | Divisions y materias propias | No identificado | Nuevo endpoint | Alcances de otros docentes |
| Mi horario | preceptor, docente, jefe_area, server | Leer | Horario semanal propio | No identificado | Nuevo endpoint | Horarios de otros docentes |
| Listar cursos | Todos con `academics.read` | Leer | Cursos con paginación | `GET /api/v1/cursos` | Reutilizable | — |
| Ver detalle de curso | Todos con `academics.read` | Leer | Año, turno, orientación | `GET /api/v1/cursos/:cursoId` | Reutilizable | — |
| Listar divisiones de un curso | Todos con `academics.read` | Leer | Divisiones | `GET /api/v1/cursos/:cursoId/divisiones` | Reutilizable | — |
| Listar divisiones | Todos con `academics.read` | Leer | Divisiones | `GET /api/v1/divisiones` | Reutilizable | — |
| Grupos | preceptor, docente, server | Leer | Alumnos por grupo de taller | `GET /api/v1/students/listas/grupo` | Reutilizable con ajustes | Requiere `tallerId` + `grupo`; sin entidad `grupo` propia |
| Alumnos de una división | Todos con `academics.read` | Leer | Alumnos de la división | `GET /api/v1/divisiones/:divisionId/alumnos` | Reutilizable | — |
| Materias de una división | Todos con `academics.read` | Leer | Materias | `GET /api/v1/divisiones/:divisionId/materias` | Reutilizable | — |
| Docentes de una división | Todos con `academics.read` | Leer | Nombres de docentes | `GET /api/v1/divisiones/:divisionId/docentes` | Reutilizable | — |
| Horario de una división | Todos con `academics.read` | Leer | Día y rango horario | `GET /api/v1/divisiones/:divisionId/horarios` | Reutilizable con ajustes | No incluye materia, docente ni aula |
| Horario de un curso | Todos con `academics.read` | Leer | Día y rango horario | `GET /api/v1/cursos/:cursoId/horarios` | Reutilizable con ajustes | No incluye materia, docente ni aula |
| Asignaciones de horario | preceptor, docente, jefe_area, server | Leer | Materia, docente, aula, franja | `GET /api/v1/schedule-assignments` | Reutilizable con ajustes | `createdBy`, `updatedBy`; sin paginación |
| Turnos | preceptor, docente, jefe_area, server | Leer | Turnos | `GET /api/v1/shifts` | Reutilizable con ajustes | Sin paginación |
| Franjas horarias | preceptor, docente, jefe_area, server | Leer | Franjas por día | `GET /api/v1/time-slots` | Reutilizable con ajustes | Sin paginación |
| Espacios y aulas | preceptor, jefe_area, server | Leer | Aulas, tipo, capacidad | `GET /api/v1/spaces` | Reutilizable con ajustes | Sin paginación |
| Edificios | jefe_area, server | Leer | Edificios | `GET /api/v1/buildings` | Reutilizable con ajustes | Sin paginación |
| Bandeja de notificaciones | Todos con `notifications.read` | Leer | Título, mensaje, estado | `GET /api/v1/notifications` | Reutilizable con ajustes | `recipientId`, `schoolId`, `referenceId` de terceros |
| Contador de no leídas | Todos con `notifications.read` | Leer | `unreadCount` | `GET /api/v1/notifications/unread-count` | Reutilizable | — |
| Marcar notificación leída | Todos con `notifications.read` | Escribir | Notificación actualizada | `POST /api/v1/notifications/:notificationId/read` | Reutilizable | Ya valida propiedad |
| Marcar todas leídas | Todos con `notifications.read` | Escribir | `markedAsRead` | `POST /api/v1/notifications/read-all` | Reutilizable | — |
| Registrar dispositivo para push | Todos | Escribir | Push token del dispositivo | No identificado | Nuevo endpoint | Tokens de dispositivo |
| Ausencias de un docente | preceptor, docente, jefe_area, server | Leer | Fechas, tipo, estado | `GET /api/v1/absences` | Reutilizable con ajustes | Ausencias de otros docentes; sin paginación |
| Registrar ausencia | preceptor, jefe_area, server | Escribir | Nueva ausencia | `POST /api/v1/absences` | Reutilizable con ajustes | `teacherId` elegido por el cliente |
| Mis ausencias | preceptor, docente | Leer | Ausencias propias | No identificado | Nuevo endpoint | — |
| Novedades / incidentes | preceptor, docente, jefe_area, server | Leer | Novedades | `GET /api/v1/incidents` | Reutilizable con ajustes | Sin paginación |
| Situación académica de un alumno | Todos con `academic-records.read` | Leer | Resumen y materias | `GET /api/v1/alumnos/:alumnoId/situacion-academica` | Reutilizable con ajustes | Historial de otros períodos |
| Listado de situaciones académicas | Todos con `academic-records.read` | Leer | Registros con paginación | `GET /api/v1/situaciones-academicas` | Reutilizable | — |
| Catálogos de situación académica | Todos con `academic-records.read` | Leer | Tipos, estados, transiciones | `GET /api/v1/situaciones-academicas/catalogos` | Reutilizable | — |
| Historial académico | Todos con `academic-records.read` | Leer | Historial completo | `GET /api/v1/alumnos/:alumnoId/historial-academico` | Reutilizable con ajustes | Payload histórico completo |
| Listado de alumnos | secretario, preceptor, docente, jefe_area | Leer | Datos mínimos del alumno | `GET /api/v1/students` | Reutilizable con ajustes | Dirección, contacto, email, teléfono en cada fila |
| Alumnos por división | secretario, preceptor, docente, jefe_area | Leer | Listado paginado | `GET /api/v1/students/listas/division` | Reutilizable | — |
| Directorio de divisiones | secretario, preceptor, docente, jefe_area | Leer | Divisiones | `GET /api/v1/students/divisions` | Reutilizable | — |
| Ficha resumida de alumno | secretario, preceptor, docente, jefe_area | Leer | Identificación y curso | `GET /api/v1/students/:studentId/summary` | Reutilizable con ajustes | Sin filtro de escuela |
| Perfil completo de alumno | secretario, preceptor, docente, jefe_area | Leer | Legajo completo | `GET /api/v1/students/:studentId/profile` | Reutilizable con ajustes | `historialCambios`, `perfilCompletoUrl` interno |
| Observaciones de un alumno | secretario, preceptor, docente, jefe_area | Leer | Tipo, descripción, estado | `GET /api/v1/students/:studentId/observations` | Reutilizable con ajustes | Sin filtro de escuela |
| Todas las observaciones | secretario, preceptor, docente, jefe_area | Leer | Listado | `GET /api/v1/observations` | Reutilizable con ajustes | Sin filtro de escuela ni paginación |
| Crear observación | secretario, preceptor, jefe_area | Escribir | Nueva observación | `POST /api/v1/students/:studentId/observations` | Reutilizable con ajustes | Autor es el usuario autenticado |
| Actualizar alumno | secretario, jefe_area, server | Escribir | Campos del legajo | `PATCH /api/v1/students/:studentId` | Reutilizable con ajustes | Uso administrativo |
| Desactivar alumno | secretario, server | Escribir | Baja lógica | `DELETE /api/v1/students/:studentId` | Reutilizable con ajustes | Uso administrativo |
| Pase de alumno | secretario, server | Escribir | Motivo y colegio destino | `POST /api/v1/students/:studentId/transfers` | Reutilizable con ajustes | Uso administrativo |
| Constancia de alumno regular | secretario, preceptor, server | Escribir | Constancia | `POST /api/v1/students/:studentId/certificate` | Reutilizable con ajustes | Emite documento |
| Tablero de secretaría | secretario, preceptor, jefe_area | Leer | Indicadores y alertas | `GET /api/v1/dashboard/secretaria` | Reutilizable con ajustes | Datos institucionales de toda la escuela |
| Descartar alerta | secretario, server | Escribir | Alerta descartada | `POST /api/v1/alerts/:alertId/dismiss` | Reutilizable con ajustes | — |
| Tutorías de un alumno | secretario, preceptor, docente, jefe_area | Leer | Responsables | `GET /api/v1/students/:studentId/tutors` | Reutilizable | Datos de contacto de responsables |
| Alumnos de un tutor | secretario, preceptor, docente, jefe_area | Leer | Datos mínimos | `GET /api/v1/tutors/:tutorId/students` | Reutilizable | — |
| Directorio de docentes | secretario, preceptor, jefe_area, server | Leer | Nombre y apellido | `GET /api/v1/teachers` | Reutilizable con ajustes | `documentNumber`, `email`, `phone`; sin paginación |
| Materias de un docente | secretario, preceptor, jefe_area, server | Leer | Materias asignadas | `GET /api/v1/teachers/:teacherId/subjects` | Reutilizable | — |
| Reservas de espacios | Todos con `reservations.read` | Leer | Reservas | `GET /api/v1/reservations` | Reutilizable con ajustes | `ownerId` controlable por cliente |
| Crear reserva | Todos con `reservations.write` | Escribir | Nueva reserva | `POST /api/v1/reservations` | Reutilizable con ajustes | Cliente puede elegir `ownerId` |
| Aprobar / rechazar reserva | secretario, jefe_area, server | Escribir | Estado de la reserva | `POST /api/v1/reservations/:reservationId/approve` | Reutilizable con ajustes | Sin validación de propiedad |
| Cargar asistencia | preceptor, docente | Escribir | Asistencia por alumno | No identificado | Nuevo endpoint | — |
| Consultar asistencia | preceptor, docente | Leer | Inasistencias del alumno | No identificado | Nuevo endpoint | — |
| Cargar calificaciones | docente | Escribir | Evaluación | No identificado | Nuevo endpoint | Información académica restringida |
| Administrar usuarios | admin, director, secretario, jefe_area, server | Escribir | Alta de usuario | `POST /api/v1/users` | Reutilizable con ajustes | `passwordTemporal` en claro |
| Administrar roles y permisos | admin, director, server | Escribir | Permisos por rol | `PUT /api/v1/authorization/roles/:codigo/permissions` | Reutilizable con ajustes | Solo `identity.update`; uso administrativo |
| Auditoría | admin, director, server | Leer | Registros de auditoría | `GET /api/v1/audit/logs` | Reutilizable con ajustes | IP, `valorAnterior`, `valorNuevo` |

---

### 3. Matriz de endpoints

#### 3.1 Autenticación, sesión e identidad

| Endpoint | Método | Funcionalidad Mobile | Rol | Permiso | Clasificación | Ajuste requerido | Motivo |
|---|---|---|---|---|---|---|---|
| `/api/v1/auth/login` | POST | Login | Todos | Ninguno | Reutilizable | — | Contrato completo y estable |
| `/api/v1/auth/refresh` | POST | Renovar sesión | Todos | Ninguno | Reutilizable | — | Rotación ya implementada |
| `/api/v1/auth/logout` | POST | Cerrar sesión | Todos | Ninguno | Reutilizable | — | Revoca el refresh token |
| `/api/v1/auth/me` | GET | Sesión, roles, permisos, alcances | Todos | Solo token | Reutilizable | — | Es la fuente de verdad de autorización |
| `/api/v1/auth/permissions` | GET | Habilitar pantallas | Todos | Solo token | Reutilizable | — | Solo usabilidad, no seguridad |
| `/api/v1/authorization/me` | GET | Alternativa de sesión | Todos | Solo token | Reutilizable con ajustes | Definir cuál es el canónico | Duplica `auth/me` |
| `/api/v1/authorization/modules` | GET | Módulos y permisos | secretario, server | `identity.read` | Reutilizable | — | Uso administrativo |
| `/api/v1/authorization/roles` | GET | Listar roles | secretario, server | `identity.read` | Reutilizable | — | **No usa `roles.read`: ese permiso no existe** |
| `/api/v1/authorization/permissions` | GET | Catálogo de permisos | secretario, server | `identity.read` | Reutilizable | — | — |
| `/api/v1/authorization/roles/:codigo/permissions` | GET | Permisos de un rol | secretario, server | `identity.read` | Reutilizable | — | — |
| `/api/v1/authorization/roles/:codigo/permissions` | PUT | Reemplazar permisos | admin, director, server | `identity.update` | Reutilizable con ajustes | Restringir a uso administrativo | Cambia la autorización en ejecución |
| `/api/v1/users` | GET | Directorio de usuarios | secretario, jefe_area, server | `users.read` | Reutilizable con ajustes | Agregar paginación | Sin paginación |
| `/api/v1/users/:userId` | GET | Detalle de usuario | secretario, jefe_area, server | `users.read` | Reutilizable con ajustes | Excluir datos administrativos | Datos de otros usuarios |
| `/api/v1/users/:userId/roles` | PUT | Reemplazar roles | admin, director, server | `identity.update` | Reutilizable con ajustes | Restringir a uso administrativo | — |
| `/api/v1/users/:userId/deactivate` | PATCH | Baja lógica | admin, director, server | `users.deactivate` | Reutilizable con ajustes | Restringir a uso administrativo | Revoca sesiones |

#### 3.2 Alumnos y legajo

| Endpoint | Método | Funcionalidad Mobile | Rol | Permiso | Clasificación | Ajuste requerido | Motivo |
|---|---|---|---|---|---|---|---|
| `/api/v1/students` | GET | Listado y búsqueda | secretario, preceptor, docente, jefe_area | `students.read` | Reutilizable con ajustes | Proyección mínima de campos | Cada fila trae dirección, contacto, email, teléfono y fecha de nacimiento |
| `/api/v1/students/divisions` | GET | Selector de divisiones | secretario, preceptor, docente, jefe_area | `students.read` | Reutilizable | — | — |
| `/api/v1/students/listas/curso` | GET | Alumnos por curso | secretario, preceptor, docente, jefe_area | `students.read` | Reutilizable | — | Paginación incluida |
| `/api/v1/students/listas/division` | GET | Alumnos por división | secretario, preceptor, docente, jefe_area | `students.read` | Reutilizable | — | Paginación incluida |
| `/api/v1/students/listas/taller` | GET | Alumnos por taller | secretario, preceptor, docente, jefe_area | `students.read` | Reutilizable | — | — |
| `/api/v1/students/listas/grupo` | GET | Alumnos por grupo de taller | secretario, preceptor, docente, jefe_area | `students.read` | Reutilizable con ajustes | Definir si hay entidad `grupo` | Solo existe grupo dentro de taller |
| `/api/v1/students/:studentId` | GET | Ficha de alumno | secretario, preceptor, docente, jefe_area | `students.read` | Reutilizable con ajustes | Filtrar por `schoolId` | `findById` no valida escuela |
| `/api/v1/students/:studentId/summary` | GET | Ficha resumida | secretario, preceptor, docente, jefe_area | `students.read` | Reutilizable con ajustes | Filtrar por `schoolId` | Acceso cross-escuela |
| `/api/v1/students/:studentId/profile` | GET | Perfil completo | secretario, preceptor, docente, jefe_area | `students.read` | Reutilizable con ajustes | Excluir `historialCambios` y `perfilCompletoUrl`; filtrar por `schoolId` | Snapshots de datos personales y ruta interna de Web |
| `/api/v1/students/:studentId/observations` | GET | Observaciones del alumno | secretario, preceptor, docente, jefe_area | `observations.read` | Reutilizable con ajustes | Filtrar por `schoolId` | Sin filtro de escuela |
| `/api/v1/students/:studentId/observations` | POST | Crear observación | secretario, preceptor, jefe_area | `observations.write` | Reutilizable con ajustes | Filtrar por `schoolId` | Sin filtro de escuela |
| `/api/v1/observations` | GET | Bandeja de observaciones | secretario, preceptor, docente, jefe_area | `observations.read` | Reutilizable con ajustes | Filtrar por `schoolId`; agregar paginación | Devuelve todas |
| `/api/v1/dashboard/secretaria` | GET | Indicadores y alertas | secretario, preceptor, jefe_area | `students.read` | Reutilizable con ajustes | Revisar alcance y costo | Recalcula todos los alumnos activos en cada llamada |
| `/api/v1/alerts/:alertId/dismiss` | POST | Descartar alerta | secretario, server | `students.write` | Reutilizable | — | No hay endpoint de listado de alertas; llegan en el tablero |
| `/api/v1/students/:studentId/tutors` | GET | Responsables del alumno | secretario, preceptor, docente, jefe_area | `students.read` | Reutilizable | — | Datos de contacto de terceros |
| `/api/v1/tutors/:tutorId/students` | GET | Alumnos a cargo | secretario, preceptor, docente, jefe_area | `students.read` | Reutilizable | — | Ya devuelve datos mínimos |
| `/api/v1/tutors` | GET | Listado de tutores | secretario, preceptor, docente, jefe_area | `students.read` | Reutilizable | — | Paginación incluida |

#### 3.3 Estructura académica

| Endpoint | Método | Funcionalidad Mobile | Rol | Permiso | Clasificación | Ajuste requerido | Motivo |
|---|---|---|---|---|---|---|---|
| `/api/v1/cursos` | GET | Selector de cursos | Todos con `academics.read` | `academics.read` | Reutilizable | — | Paginación incluida |
| `/api/v1/cursos/:cursoId` | GET | Detalle de curso | Todos con `academics.read` | `academics.read` | Reutilizable | — | — |
| `/api/v1/cursos/:cursoId/divisiones` | GET | Divisiones del curso | Todos con `academics.read` | `academics.read` | Reutilizable | — | — |
| `/api/v1/divisiones` | GET | Selector de divisiones | Todos con `academics.read` | `academics.read` | Reutilizable | — | Paginación incluida |
| `/api/v1/divisiones/:divisionId` | GET | Detalle de división | Todos con `academics.read` | `academics.read` | Reutilizable | — | — |
| `/api/v1/divisiones/:divisionId/alumnos` | GET | Alumnos de la división | Todos con `academics.read` | `academics.read` | Reutilizable | — | Ya devuelve datos mínimos |
| `/api/v1/divisiones/:divisionId/materias` | GET | Materias de la división | Todos con `academics.read` | `academics.read` | Reutilizable | — | — |
| `/api/v1/divisiones/:divisionId/docentes` | GET | Docentes de la división | Todos con `academics.read` | `academics.read` | Reutilizable | — | Ya devuelve nombre y apellido |
| `/api/v1/divisiones/:divisionId/horarios` | GET | Horario de la división | Todos con `academics.read` | `academics.read` | Reutilizable con ajustes | Agregar materia, docente y aula | Hoy solo devuelve día y rango horario |
| `/api/v1/cursos/:cursoId/horarios` | GET | Horario del curso | Todos con `academics.read` | `academics.read` | Reutilizable con ajustes | Agregar materia, docente y aula | Ídem |
| `/api/v1/schools/:schoolId/courses/:courseId/divisions/:divisionId/students` | GET | Alumnos por escuela/curso/división | Todos con `students.read` | `students.read` | Reutilizable | — | Ruta larga; considerar alias |
| `/api/v1/situaciones-academicas` | GET | Listado de situaciones | Todos con `academic-records.read` | `academic-records.read` | Reutilizable | — | Filtros y paginación incluidos |
| `/api/v1/situaciones-academicas/catalogos` | GET | Tipos y estados válidos | Todos con `academic-records.read` | `academic-records.read` | Reutilizable | — | — |
| `/api/v1/alumnos/:alumnoId/situacion-academica` | GET | Situación del alumno | Todos con `academic-records.read` | `academic-records.read` | Reutilizable con ajustes | Filtrar por `schoolId`; permitir proyección mínima | Devuelve historial agrupado completo |
| `/api/v1/alumnos/:alumnoId/historial-academico` | GET | Historial completo | Todos con `academic-records.read` | `academic-records.read` | Reutilizable con ajustes | Filtrar por `schoolId`; agregar paginación | Todos los períodos |

#### 3.4 Horarios, espacios y reservas

| Endpoint | Método | Funcionalidad Mobile | Rol | Permiso | Clasificación | Ajuste requerido | Motivo |
|---|---|---|---|---|---|---|---|
| `/api/v1/shifts` | GET | Turnos | preceptor, docente, jefe_area, server | `schedules.read` | Reutilizable con ajustes | Agregar paginación | Sin paginación |
| `/api/v1/time-slots` | GET | Franjas horarias | preceptor, docente, jefe_area, server | `schedules.read` | Reutilizable con ajustes | Agregar paginación | Sin paginación |
| `/api/v1/schedules` | GET | Horarios del período | preceptor, docente, jefe_area, server | `schedules.read` | Reutilizable con ajustes | Agregar paginación | Sin paginación |
| `/api/v1/schedule-assignments` | GET | Asignaciones de horario | preceptor, docente, jefe_area, server | `schedules.read` | Reutilizable con ajustes | Agregar paginación; excluir `createdBy`/`updatedBy`; derivar `teacherId` del token | `teacherId` lo elige el cliente; sin paginación |
| `/api/v1/spaces` | GET | Aulas y espacios | preceptor, jefe_area, server | `spaces.read` | Reutilizable con ajustes | Agregar paginación | Sin paginación |
| `/api/v1/buildings` | GET | Edificios | jefe_area, server | `spaces.read` | Reutilizable con ajustes | Agregar paginación | Sin paginación |
| `/api/v1/reservations` | GET | Reservas | Todos con `reservations.read` | `reservations.read` | Reutilizable con ajustes | Agregar paginación y filtro por propietario | Sin paginación; `ownerId` visible |
| `/api/v1/reservations` | POST | Crear reserva | Todos con `reservations.write` | `reservations.write` | Reutilizable con ajustes | Derivar `ownerId` del token | Cliente puede reservar en nombre de otro |
| `/api/v1/reservations/:reservationId/approve` | POST | Aprobar reserva | secretario, jefe_area, server | `reservations.manage` | Reutilizable con ajustes | Validar propiedad y alcance | Sin validación de propiedad |
| `/api/v1/reservations/:reservationId/reject` | POST | Rechazar reserva | secretario, jefe_area, server | `reservations.manage` | Reutilizable con ajustes | Validar propiedad y alcance | Sin validación de propiedad |

#### 3.5 Notificaciones

| Endpoint | Método | Funcionalidad Mobile | Rol | Permiso | Clasificación | Ajuste requerido | Motivo |
|---|---|---|---|---|---|---|---|
| `/api/v1/notifications` | GET | Bandeja | Todos con `notifications.read` | `notifications.read` | Reutilizable con ajustes | Ignorar `recipientId` del cliente; agregar paginación; excluir campos internos | Cliente puede pedir notificaciones de otro |
| `/api/v1/notifications/unread-count` | GET | Badge | Todos con `notifications.read` | `notifications.read` | Reutilizable | — | Siempre usa el usuario autenticado |
| `/api/v1/notifications/:notificationId` | GET | Detalle | Todos con `notifications.read` | `notifications.read` | Reutilizable con ajustes | Validar que sea del usuario | No valida propiedad |
| `/api/v1/notifications/:notificationId/read` | POST | Marcar leída | Todos con `notifications.read` | `notifications.read` | Reutilizable | — | Ya valida propiedad (`403`) |
| `/api/v1/notifications/read-all` | POST | Marcar todas | Todos con `notifications.read` | `notifications.read` | Reutilizable | — | Usa el usuario autenticado |

#### 3.6 Ausencias y novedades

| Endpoint | Método | Funcionalidad Mobile | Rol | Permiso | Clasificación | Ajuste requerido | Motivo |
|---|---|---|---|---|---|---|---|
| `/api/v1/absences` | GET | Ausencias | preceptor, docente, jefe_area, server | `absences.read` | Reutilizable con ajustes | Agregar paginación; derivar `teacherId` del token para vista propia | `teacherId` lo elige el cliente |
| `/api/v1/absences` | POST | Registrar ausencia | preceptor, jefe_area, server | `absences.write` | Reutilizable con ajustes | Derivar `schoolId` del token | `schoolId` es obligatorio en el body |
| `/api/v1/absences/:absenceId` | GET | Detalle de ausencia | preceptor, docente, jefe_area, server | `absences.read` | Reutilizable | — | — |
| `/api/v1/incidents` | GET | Novedades | preceptor, docente, jefe_area, server | `absences.read` | Reutilizable con ajustes | Agregar paginación | Sin paginación |

#### 3.7 Docentes

| Endpoint | Método | Funcionalidad Mobile | Rol | Permiso | Clasificación | Ajuste requerido | Motivo |
|---|---|---|---|---|---|---|---|
| `/api/v1/teachers` | GET | Directorio | secretario, preceptor, jefe_area, server | `teachers.read` | Reutilizable con ajustes | Agregar paginación; excluir `documentNumber`, `email`, `phone` | Datos personales de terceros |
| `/api/v1/teachers/:teacherId` | GET | Ficha de docente | secretario, preceptor, jefe_area, server | `teachers.read` | Reutilizable con ajustes | Excluir datos de contacto | Datos personales de terceros |
| `/api/v1/teachers/:teacherId/subjects` | GET | Materias del docente | secretario, preceptor, jefe_area, server | `teachers.read` | Reutilizable | — | — |

#### 3.8 Endpoints nuevos requeridos

Ninguno de estos existe. Se documentan con placeholder para no presentarlos como
funcionalidad disponible.

| Endpoint propuesto | Método | Funcionalidad Mobile | Rol | Permiso | Clasificación | Ajuste requerido | Motivo |
|---|---|---|---|---|---|---|---|
| `/api/v1/<recurso>/mi-contexto` | GET | Contexto del usuario autenticado | preceptor, docente | Pendiente de definición | Nuevo endpoint | No existe actualmente | No hay resolución usuario → docente ni entidad de contexto |
| `/api/v1/<recurso>/mi-horario` | GET | Horario del docente autenticado | preceptor, docente | `schedules.read` | Nuevo endpoint | No existe actualmente | `teacherId` lo elige el cliente y no es clave de alcance |
| `/api/v1/<recurso>/mis-ausencias` | GET | Ausencias propias | preceptor, docente | `absences.read` | Nuevo endpoint | No existe actualmente | Mismo problema de autoscoping |
| `/api/v1/<recurso>/mi-asistencia` | GET | Asistencia propia | preceptor, docente | `attendance.read` | Nuevo endpoint | No existe actualmente | No hay módulo de asistencia |
| `/api/v1/<recurso>/dispositivos` | POST | Registrar push token | Todos | Pendiente de definición | Nuevo endpoint | No existe actualmente | No hay entidad de dispositivo ni suscripciones |
| `/api/v1/<recurso>/cambio-password` | POST | Cambiar contraseña propia | Todos | Pendiente de definición | Nuevo endpoint | No existe actualmente | No hay ruta de cambio de contraseña |
| `/api/v1/<recurso>/asistencia` | GET/POST | Cargar asistencia | preceptor, docente | `attendance.read` / `attendance.write` | Nuevo endpoint | No existe actualmente | Los permisos existen en el catálogo pero no hay ruta que los use |

---

### 4. Datos mínimos por funcionalidad

Los campos de estas tablas salen del análisis de `students.repository.mjs`,
`notifications.repository.mjs`, `schedules.repository.mjs`, `absences.service.mjs`,
`audit.service.mjs` y `user.repository.mjs`.

| Funcionalidad | Datos obligatorios | Datos opcionales | Datos que NO deben enviarse |
|---|---|---|---|
| Login | `accessToken`, `refreshToken`, `user` | `roles`, `permisos`, `alcances` | Contraseña, `passwordHash`, tokens de otros usuarios |
| Sesión (`auth/me`) | `user.id`, `user.nombre`, `roles`, `permisos` | `alcances`, `assignments` | `passwordHash`, `deactivatedAt`, email de terceros |
| Bandeja de notificaciones | `id`, `title`, `body`, `type`, `isRead`, `createdAt` | `priority`, `readAt`, `referenceType` | `recipientId`, `schoolId`, `referenceId` |
| Contador de no leídas | `unreadCount` | — | — |
| Listado de alumnos | `id`, `apellido`, `nombre`, `dni`, `curso`, `division`, `estado` | `edad`, `condicion`, `turno` | `direccion`, `contacto`, `email`, `telefono`, `fechaNacimiento` en el listado |
| Ficha de alumno (`summary`) | Identificación, `curso`, `division`, `condicion` | `edad`, `estado` | Snapshots de cambios |
| Perfil completo (`profile`) | Solo los campos que la pantalla declare | — | `historialCambios` (snapshots completos), `perfilCompletoUrl` |
| Observaciones | `tipo`, `descripcion`, `sector`, `fecha`, `estado` | Autor | Datos de alumnos fuera del alcance |
| Horario de división | `dia`, `desde`, `hasta`, `tipo` | — | — (ya es un payload reducido) |
| Asignaciones de horario | `materia`, `docente`, `espacio`, `dia`, `horaInicio`, `horaFin` | `turno`, `timeSlotId`, `isActive` | `createdBy`, `updatedBy` |
| Situación académica | Resumen por estado y materias del período | Historial de otros períodos | Historial completo si no se pide |
| Ausencias | `fecha`, `tipo`, `estado`, `motivo` | `startDate`, `endDate`, `schoolId` | Ausencias de otros docentes |
| Novedades | `tipo`, `descripcion`, `severity`, `status`, `date` | — | — |
| Directorio de docentes | `id`, `nombre`, `apellido` | Especialidades | `documentNumber`, `email`, `phone` |
| Espacios | `id`, `nombre`, `tipo`, `capacidad` | `buildingId`, `resources` | `createdBy`, `updatedBy` |
| Reservas | `id`, `spaceId`, `date`, `startTime`, `endTime`, `status` | `motivo` | `ownerId` de terceros |
| Alumnos por división | `id`, `apellido`, `nombre`, `dni` | — | — |
| Auditoría | — | — | `ip`, `usuarioId`, `valorAnterior`, `valorNuevo` |

---

### 5. Roles y permisos

#### 5.1 Roles reales del proyecto

Definidos en `Shared/src/domain.mjs` y `Backend/config/permissions.config.mjs`. **No hay
otros roles.** En particular no existen roles de alumno ni de familia.

`admin` y `director` tienen `ALL_PERMISSIONS` (los 53 permisos del catálogo).

Los permisos pueden reemplazarse en ejecución con
`PUT /api/v1/authorization/roles/:codigo/permissions` (`identity.update`), por lo que la
tabla siguiente refleja el catálogo por defecto.

#### 5.2 Permisos por rol

| Permiso | admin | director | secretario | preceptor | docente | jefe_area | server |
|---|---|---|---|---|---|---|---|
| `users.read` | sí | sí | sí | no | no | sí | sí |
| `users.deactivate` | sí | sí | no | no | no | no | sí |
| `identity.read` | sí | sí | sí | no | no | no | sí |
| `identity.create` | sí | sí | no | no | no | no | sí |
| `identity.update` | sí | sí | no | no | no | no | sí |
| `students.read` | sí | sí | sí | sí | sí | sí | no |
| `students.write` | sí | sí | sí | sí | no | no | no |
| `observations.read` | sí | sí | sí | sí | sí | sí | no |
| `observations.write` | sí | sí | sí | sí | no | sí | no |
| `attendance.read` | sí | sí | no | sí | sí | no | no |
| `attendance.write` | sí | sí | no | sí | sí | no | no |
| `grades.read` | sí | sí | no | no | sí | no | no |
| `grades.write` | sí | sí | no | no | sí | no | no |
| `schools.read` | sí | sí | sí | sí | sí | sí | no |
| `documents.read` | sí | sí | sí | sí | sí | no | sí |
| `documents.write` | sí | sí | sí | sí | no | no | sí |
| `spaces.read` | sí | sí | sí | sí | no | no | sí |
| `spaces.write` | sí | sí | no | no | no | no | sí |
| `spaces.manage` | sí | sí | no | no | no | no | sí |
| `schedules.read` | sí | sí | sí | sí | sí | sí | sí |
| `schedules.write` | sí | sí | no | no | no | sí | sí |
| `schedules.manage` | sí | sí | no | no | no | no | sí |
| `teachers.read` | sí | sí | sí | sí | no | sí | sí |
| `teachers.write` | sí | sí | no | no | no | sí | sí |
| `teachers.manage` | sí | sí | no | no | no | no | sí |
| `absences.read` | sí | sí | sí | sí | sí | sí | sí |
| `absences.write` | sí | sí | no | no | no | sí | sí |
| `absences.manage` | sí | sí | no | no | no | no | sí |
| `workshops.read` | sí | sí | sí | sí | sí | sí | sí |
| `workshops.write` | sí | sí | no | no | no | sí | sí |
| `workshops.manage` | sí | sí | no | no | no | no | sí |
| `inventory.read` | sí | sí | sí | sí | no | no | sí |
| `inventory.write` | sí | sí | no | no | no | no | sí |
| `inventory.manage` | sí | sí | no | no | no | no | sí |
| `requests.read` | sí | sí | sí | sí | no | sí | sí |
| `requests.write` | sí | sí | no | no | no | no | sí |
| `requests.manage` | sí | sí | no | no | no | no | sí |
| `reservations.read` | sí | sí | sí | sí | sí | sí | sí |
| `reservations.write` | sí | sí | sí | sí | sí | sí | sí |
| `reservations.manage` | sí | sí | sí | sí | sí | sí | sí |
| `notifications.read` | sí | sí | sí | sí | sí | sí | sí |
| `notifications.write` | sí | sí | sí | sí | no | sí | sí |
| `curriculum.read` | sí | sí | sí | sí | sí | sí | sí |
| `curriculum.write` | sí | sí | no | no | no | sí | sí |
| `curriculum.manage` | sí | sí | no | no | no | sí | sí |
| `academics.read` | sí | sí | sí | sí | sí | sí | sí |
| `academics.write` | sí | sí | no | no | no | sí | sí |
| `academics.manage` | sí | sí | no | no | no | sí | sí |
| `academic-records.read` | sí | sí | sí | sí | sí | sí | sí |
| `academic-records.write` | sí | sí | no | no | no | sí | sí |
| `academic-records.manage` | sí | sí | no | no | no | sí | sí |
| `audit.read` | sí | sí | no | no | no | no | sí |
| `audit.export` | sí | sí | no | no | no | no | sí |

Observaciones verificadas en el código:

- **No existe el permiso `roles.read`.** Los endpoints del módulo de autorización usan
  `identity.read` e `identity.update`. La constante `roles.read` usada en
  `Frontend/web/src/app/rutas.js` es solo del cliente y no corresponde a ningún permiso del
  catálogo.
- **`server` no tiene `students.read`**, ni `users.read` de alumnos, ni
  `observations.read`. Es un rol técnico de infraestructura.
- **`docente` sí tiene `students.read` y `observations.read`**, pero no `students.write`
  ni `observations.write`.
- **`attendance.*` y `grades.*` están asignados a `preceptor` y `docente`, pero no existe
  ninguna ruta que los use.**

#### 5.3 Alcance (scope)

Las únicas claves de alcance definidas son:

```
schoolId, courseId, divisionId, subjectId, shiftId, periodId
```

`teacherId` y `userId` **no** son claves de alcance. Una asignación sin valor significa
"todo ese nivel", y `scopeMatches` solo rechaza cuando ambas partes están definidas y
difieren.

Consecuencia: los endpoints que no pasan contexto explícito a `authorize` no aplican
alcance. `GET /api/v1/students/:studentId`, `/summary`, `/profile` y las observaciones
usan `required(P.X)` sin contexto, por lo que el alcance queda en manos de la asignación de
permiso, no del recurso.

#### 5.4 Funcionalidades por rol

| Rol | Funcionalidades | Consulta | Modificación | Restricciones |
|---|---|---|---|---|
| `admin` | Todo | Todos los módulos | Todos los módulos | Sin validación de que no se autodesactive o automodifique |
| `director` | Todo | Todos los módulos | Todos los módulos | Igual que `admin` |
| `secretario` | Legajo, observaciones, tutorías, asistencia institucional,Structure académica, reservas, notificaciones | Alumnos, observaciones, docentes, cursos, divisiones | Alumnos, observaciones, ausencias, reservas, usuarios | Sin `academics.write`; sin `spaces.write`; sin `absences.manage` |
| `preceptor` | Legajo, observaciones, asistencia, horarios, espacios, talleres | Alumnos, observaciones, docentes, horarios, espacios | Observaciones, ausencias, reservas | Sin `students.write`; sin `grades.*`; sin `attendance.manage` (no existe) |
| `docente` | Horarios propios, ausencias, asistencia, calificaciones, situación académica, observaciones de lectura | Alumnos, observaciones de lectura, horarios, ausencias, Materias | Sin escritura salvo ausencias y reservas | Sin `students.write`; sin `observations.write`; sin `spaces.read`; sin `teachers.read` |
| `jefe_area` | Docentes, horarios, ausencias, academics, curriculum | Alumnos, observaciones, docentes, horarios | Observaciones, ausencias, horarios, docentes, academics | Sin `spaces.read`; sin `inventory.read`; sin `students.write` |
| `server` | Espacios, horarios, inventario, solicitudes, reservas, auditoría | Espacios, horarios, docentes, inventario, auditoría | Espacios, horarios, docentes, inventario, reservas, permisos de roles | Sin `students.read`; sin `observations.read`; sin `academics.write` |

#### 5.5 Restricciones que Mobile debe respetar

- Nunca enviar `roles` ni `permisos` desde el cliente como autoridad. Se leen de
  `GET /api/v1/auth/me`.
- No mostrar una acción solo porque el permiso existe: puede faltar el alcance.
- No reimplementar reglas de negocio (DNI único, estados de materia, conflictos de horario)
  en React Native.
- Los permisos pueden cambiar en ejecución; Mobile debe releerlos al volver del segundo
  plano o al detectar un `403`.

---

### 6. Validaciones y reglas de negocio

Origen: **S** = Servicio, **M** = Middleware, **R** = Ruta, **D** = Documentación,
**W** = Uso en Web.

| Regla | Endpoint | Detalle | Origen |
|---|---|---|---|
| Token Bearer válido | Todos los protegidos | Sin token o token inválido → `401 UNAUTHENTICATED` | M |
| Permiso suficiente | Todos los protegidos con `required(...)` | Sin permiso → `403 FORBIDDEN` | M |
| Alcance suficiente | Cuando `authorize` recibe contexto | `403 FORBIDDEN` con mensaje de alcance | M |
| Login con credenciales válidas | `/api/v1/auth/login` | Mensaje genérico para no revelar si el usuario existe | S |
| Límite de intentos por email (5) | `/api/v1/auth/login` | Bloqueo temporal → `429 TOO_MANY_ATTEMPTS` | D |
| Límite de intentos por IP (20) | `/api/v1/auth/login` | Bloqueo temporal → `429 TOO_MANY_ATTEMPTS` | D |
| Reutilización de refresh revocado | `/api/v1/auth/refresh` | Revoca todas las sesiones del usuario | S |
| No desactivar ni modificar la propia cuenta | `/api/v1/users/:userId` y `/deactivate` | Regla de negocio | D |
| Permisos de rol válidos al reemplazarlos | `/api/v1/authorization/roles/:codigo/permissions` | Código debe existir en el catálogo | S |
| `dni` de 7 a 9 dígitos | `/api/v1/students` | Formato numérico | S |
| `dni` único | `/api/v1/students` | Duplicado → `409 CONFLICT` | S |
| Email y teléfono con formato | `/api/v1/students` | Validación de formato | S |
| `fechaNacimiento` válida y no futura | `/api/v1/students` | Validación de fecha | S |
| `condicion` ∈ `regular`/`irregular` | `/api/v1/students` | Lista cerrada | S |
| Curso y división existen y son coherentes | `/api/v1/students` | Si no → `422 VALIDATION_ERROR` | S |
| Solo campos del legajo en modificación | `/api/v1/students/:studentId` | Sanitización: el resto se ignora | S |
| Parámetros de búsqueda en listas permitidas | `/api/v1/students` | Sin SQL arbitrario | S |
| Baja lógica, no física | `/api/v1/students/:studentId` | `estado: inactivo` + `fechaBaja` | S |
| `anioCurso` y `division` obligatorios | `/api/v1/students/listas/division` | `404 NOT_FOUND` si la división no existe | S |
| `tallerId` y `grupo` obligatorios | `/api/v1/students/listas/grupo` | `404` si el taller no existe | S |
| `recipientId`, `title`, `body` obligatorios | `POST /api/v1/notifications` | `422 VALIDATION_ERROR` | S |
| `type` de notificación en lista cerrada | `POST /api/v1/notifications` | 7 tipos válidos | S |
| Notificación pertenece al usuario | `/api/v1/notifications/:notificationId/read` | `403 FORBIDDEN` si no es suya | S |
| `teacherId`, `date`, `type`, `schoolId` obligatorios | `POST /api/v1/absences` | `422 VALIDATION_ERROR` | S |
| `type` de ausencia en lista cerrada | `/api/v1/absences` | 6 tipos válidos | S |
| `status` de ausencia en lista cerrada | `PATCH /api/v1/absences/:absenceId` | `pendiente`, `aprobada`, `rechazada`, `cancelada` | S |
| `type` de novedad en lista cerrada | `/api/v1/incidents` | 5 tipos válidos | S |
| `severity` de novedad en lista cerrada | `/api/v1/incidents` | `leve`, `moderada`, `grave`, `muy_grave` | S |
| 10 campos obligatorios en asignación | `POST /api/v1/schedule-assignments` | `scheduleId`, `dayOfWeek`, `startTime`, `endTime`, `spaceId`, `subjectId`, `teacherId`, `courseId`, `divisionId`, `schoolId` | S |
| `dayOfWeek` en lista cerrada | `/api/v1/schedule-assignments` | 7 días válidos | S |
| Hora en formato `HH:MM` (00:00–23:59) | `/api/v1/schedule-assignments` | Regex estricta | S |
| `endTime` posterior a `startTime` | `/api/v1/schedule-assignments` | `422 VALIDATION_ERROR` | S |
| Espacio debe estar activo | `/api/v1/schedule-assignments` | Inactivo → `409 CONFLICT` | S |
| Docente debe existir y estar activo | `/api/v1/schedule-assignments` | Inactivo → `409 CONFLICT` | S |
| Franja horaria debe estar activa | `/api/v1/schedule-assignments` | Inactiva → `409 CONFLICT` | S |
| Sin conflictos de horario | `/api/v1/schedule-assignments` | Detecta solapamiento por curso, docente y espacio → `409 CONFLICT` | S |
| División hereda el turno del curso | Módulo académico | El turno no se recibe ni se almacena en la división | D |
| Orientación solo en segundo ciclo | Módulo académico | Validación de negocio | D |
| Unicidad alumno+materia+período | Módulo académico | `409 CONFLICT` | D |
| Transiciones de estado de materia | Módulo académico | Catálogo central `TRANSICIONES` | D |
| Historial inmutable | Módulo académico | Cada cambio guarda el snapshot anterior | D |
| Body JSON máximo 1 MiB | Todas | `413 PAYLOAD_TOO_LARGE` | M |
| Sanitización de campos sensibles | Todas las mutaciones | El body se audita con contraseñas y tokens ocultos | S |
| Auditoría de mutaciones | `POST`/`PATCH`/`PUT`/`DELETE` | Automática; los `GET` no se auditan | D |

Validaciones **pendientes de definición** (no se pudo determinar en el código):

- Formato de email usado por `/api/v1/auth/login` más allá de la existencia de la cuenta.
- Reglas de validación de asistencia y calificaciones (no existen módulos).
- Validación de ownership en reservas (no existe).
- Validación de alcance por escuela en consultas por id de alumno.

---

### 7. Manejo de errores

#### 7.1 Estructura

Definida en `Backend/utils/api-error.mjs` y `Backend/middlewares/error.middleware.mjs`:

```json
{ "error": { "code": "CODIGO", "message": "mensaje", "details": [] } }
```

`details` solo se incluye cuando existe. `ApiError` es la única clase de error de la API y
todos los servicios lanzan sus errores a través de ella.

#### 7.2 Códigos

| Situación | HTTP | Respuesta | Observaciones |
|---|---|---|---|
| Sin token o token inválido | `401` | `UNAUTHENTICATED` | Mensaje genérico: "Credenciales invalidas o sesion expirada." |
| Sesión expirada | `401` | `UNAUTHENTICATED` | Mismo mensaje genérico |
| Credenciales inválidas en login | `401` | `UNAUTHENTICATED` | Genérico, no revela si el email existe |
| Refresh token reutilizado | `401` | Código propio de autenticación | Revoca todas las sesiones del usuario |
| Login bloqueado por intentos | `429` | `TOO_MANY_ATTEMPTS` | 5 intentos por email, 20 por IP; ventana 15 min, bloqueo 15 min |
| Sin permiso | `403` | `FORBIDDEN` | "No tiene permisos para realizar esta accion." |
| Sin alcance | `403` | `FORBIDDEN` | "No tiene permiso para esta acción en el alcance solicitado" |
| Recurso inexistente | `404` | `NOT_FOUND` | Mensaje `"<recurso> no existe."` |
| Conflicto de negocio | `409` | `CONFLICT` | DNI duplicado, horario solapado, entidad inactiva |
| Solicitud inválida | `400` | `INVALID_REQUEST` | Pocas ocurrencias; helpers de la API |
| Datos inválidos | `422` | `VALIDATION_ERROR` | `details` con `{ field, message }` por campo |
| Body demasiado grande | `413` | `PAYLOAD_TOO_LARGE` | Límite de 1 MiB |
| Error interno | `500` | `INTERNAL_ERROR` | Mensaje genérico. Fuera de producción agrega `debug` |
| Petición incompleta | `422` | `VALIDATION_ERROR` | Campos requeridos faltantes |

#### 7.3 Observaciones críticas para Mobile

1. **`debug` se expone fuera de producción.** `error.middleware.mjs` agrega
   `debug: String(error.message)` cuando `env !== "production"`. Un build de Mobile mal
   configurado puede filtrar mensajes técnicos. Requiere que el ambiente se defina
   explícitamente.
2. **La forma de respuesta no es uniforme.** `DELETE /api/v1/absences/:absenceId` devuelve
   `{ message: "..." }` en lugar de `{ data: ... }`. Mobile debe tolerar ambos.
3. **Los errores se persisten.** Todo error, incluso el esperado, se registra en
   `errorLogs` con método, ruta, código, mensaje e IP. El cuerpo de la petición y las
   cabeceras nunca se registran.

---

### 8. Paginación, filtros y rendimiento

#### 8.1 Ya disponible

| Endpoint | Paginación | Filtros / orden |
|---|---|---|
| `/api/v1/students` | `pagina` (1), `porPagina` (20, máx 100) | `dni`, `apellido`, `nombre`, `q`, `curso`, `division`, `turno`, `condicion`, `estado`, `edad`, `orden` |
| `/api/v1/students/listas/curso` | `pagina`, `porPagina` | `anioCurso`, `orden`, `soloActivos` |
| `/api/v1/students/listas/division` | `pagina`, `porPagina` | `anioCurso`, `division`, `orden`, `soloActivos` |
| `/api/v1/students/listas/taller` | `pagina`, `porPagina` | `tallerId`, `orden`, `soloActivos` |
| `/api/v1/students/listas/grupo` | `pagina`, `porPagina` | `tallerId`, `grupo`, `orden`, `soloActivos` |
| `/api/v1/cursos` | `pagina`, `porPagina` | `estado`, `anio`, `turno`, `ciclo`, `orientacion` |
| `/api/v1/divisiones` | `pagina`, `porPagina` | `estado`, `anio`, `turno`, `ciclo`, `orientacion` |
| `/api/v1/situaciones-academicas` | `pagina`, `porPagina` | `alumnoId`, `materiaId`, `tipo`, `estado`, `anio`, `cuatrimestre` |
| `/api/v1/tutors` | `pagina`, `porPagina` | `apellido`, `nombre`, `dni`, `estado`, `orden` |

Los listados paginados responden `{ data, filtros, paginacion }` con `total`, `totalPaginas`,
`tieneAnterior` y `tieneSiguiente`.

#### 8.2 Requiere ajustes

| Endpoint | Falta | Impacto en Mobile |
|---|---|---|
| `/api/v1/notifications` | Paginación | Descarga el histórico completo en cada carga de bandeja |
| `/api/v1/notifications` | Filtro `since` / cursor | Sin sincronización incremental |
| `/api/v1/absences` | Paginación | Listado completo en cada consulta |
| `/api/v1/incidents` | Paginación | Listado completo |
| `/api/v1/schedule-assignments` | Paginación | Payload grande para un curso completo |
| `/api/v1/schedule-assignments` | Proyección de campos | Excede `createdBy`/`updatedBy` |
| `/api/v1/shifts`, `/api/v1/time-slots` | Paginación | Volumen bajo; aceptable |
| `/api/v1/spaces`, `/api/v1/buildings` | Paginación | Depende del tamaño de la institución |
| `/api/v1/teachers` | Paginación y proyección | Directorio completo con datos personales |
| `/api/v1/users` | Paginación | Directorio completo |
| `/api/v1/observations` | Paginación y filtro por escuela | Trae todas las observaciones |
| `/api/v1/reservations` | Paginación y filtro por propietario | Trae todas las reservas |
| `/api/v1/audit/logs` | Paginación | No debería consumirse desde Mobile |

#### 8.3 Pendiente

- **Sincronización incremental.** No se encontró ningún filtro por `updatedAt`,
  `actualizadoDesde` ni cursor `since` en los servicios. Es un requisito inevitable para
  cualquier caché local u offline. **Pendiente de definición.**
- **Endpoint agregado de contexto.** No existe un endpoint que devuelva en una sola
  respuesta los datos que Mobile necesita al abrir la app.
- **Estrategia de caché de `GET /api/v1/students/:studentId/profile`.** Recalcula el
  resumen académico y el historial de cambios en cada llamada.
- **`GET /api/v1/dashboard/secretaria`.** Recorre todos los alumnos activos y calcula sus
  materias en cada llamada. Necesita revisión de costo antes de usarse desde Mobile.
- **Volumen esperado de datos por institución.** **Pendiente de definición.**

---

### 9. Dependencias entre endpoints

Flujos verificados en el código de Web (`Frontend/web/src/`) y en la estructura de los
módulos.

#### 9.1 Sesión de la app

```
App inicia
→ GET /api/v1/auth/me              (identidad, roles, permisos, alcances)
→ POST /api/v1/auth/refresh        (solo si el access token expiró)
→ GET /api/v1/notifications/unread-count
```

`GET /api/v1/auth/me` es la dependencia raíz: sin ella Mobile no sabe qué mostrar.

#### 9.2 Ficha de alumno

```
GET /api/v1/students/:studentId/summary        (datos base)
GET /api/v1/students/:studentId/profile        (legajo completo)
GET /api/v1/students/:studentId/observations   (observaciones)
GET /api/v1/students/:studentId/tutors         (responsables)
```

Web dispara estas cuatro desde la vista de legajo. Ninguna está agregada en un solo
endpoint.

#### 9.3 Situación académica de un alumno

```
GET /api/v1/situaciones-academicas/catalogos              (tipos y estados válidos)
GET /api/v1/alumnos/:alumnoId/situacion-academica         (materias del período)
GET /api/v1/alumnos/:alumnoId/historial-academico         (todos los períodos)
```

Los catálogos son necesarias antes de renderizar estados o permitir edición.

#### 9.4 Horario de un curso o división

```
GET /api/v1/cursos/:cursoId                    (obtener el curso)
GET /api/v1/cursos/:cursoId/divisiones         (obtener divisiones)
GET /api/v1/schedule-assignments?courseId=...   (asignaciones reales)
```

`GET /api/v1/divisiones/:divisionId/horarios` reduce el número de requests, pero no alcanza
para una vista real: falta materia, docente y aula.

#### 9.5 Bandeja de notificaciones con detalle

```
GET /api/v1/notifications/unread-count          (badge)
GET /api/v1/notifications                       (listado)
GET /api/v1/notifications/:notificationId       (detalle)
POST /api/v1/notifications/:notificationId/read (marcar leída)
```

#### 9.6 Ausencias de un docente

```
GET /api/v1/teachers                            (buscar el docente)
GET /api/v1/absences?teacherId=...              (sus ausencias)
GET /api/v1/incidents?teacherId=...             (sus novedades)
```

El usuario tiene que **conocer el `teacherId`**, que no se obtiene de la sesión. Es la
dependencia que bloquea "mis ausencias".

#### 9.7 Selección de división para el preceptor

```
GET /api/v1/auth/me                              (alcances del usuario)
GET /api/v1/students/divisions                   (divisiones disponibles)
GET /api/v1/students/listas/division?anioCurso=&division=
```

#### 9.8 Posibilidad de reducir requests

| Situación actual | Posible reducción | Estado |
|---|---|---|
| 4 requests para la ficha de alumno | Endpoint agregado de legajo | No existe |
| 3 requests para horario | Usar `schedule-assignments` con filtro | Parcial: el endpoint existe pero el filtro `courseId` es del cliente |
| 3 requests para ausencias | Autoscoping por token | No existe |
| 2 requests para el badge | Incluir contador en `auth/me` | No existe |
| Listado + filtros de tutorías | Ya consolidado en `/api/v1/tutors/:tutorId/students` | Ya existe |

---

### 10. Necesidades de API

#### 10.1 Reutilizable

Se pueden consumir desde Mobile sin modificar el backend.

| Endpoint | Para qué |
|---|---|
| `POST /api/v1/auth/login` | Login |
| `POST /api/v1/auth/refresh` | Renovación de sesión |
| `POST /api/v1/auth/logout` | Cierre de sesión |
| `GET /api/v1/auth/me` | Identidad, roles, permisos y alcances |
| `GET /api/v1/auth/permissions` | Habilitar pantallas |
| `GET /api/v1/notifications/unread-count` | Badge |
| `POST /api/v1/notifications/:notificationId/read` | Marcar leída |
| `POST /api/v1/notifications/read-all` | Marcar todas |
| `GET /api/v1/cursos` y `GET /api/v1/cursos/:cursoId` | Selector de cursos |
| `GET /api/v1/divisiones` y `GET /api/v1/divisiones/:divisionId` | Selector de divisiones |
| `GET /api/v1/divisiones/:divisionId/alumnos` | Alumnos de la división |
| `GET /api/v1/divisiones/:divisionId/materias` | Materias |
| `GET /api/v1/divisiones/:divisionId/docentes` | Docentes |
| `GET /api/v1/situaciones-academicas` | Listado con filtros |
| `GET /api/v1/situaciones-academicas/catalogos` | Catálogos |
| `GET /api/v1/students/listas/division` | Alumnos por división |
| `GET /api/v1/students/divisions` | Directorio de divisiones |
| `GET /api/v1/tutors/:tutorId/students` | Alumnos a cargo |

#### 10.2 Reutilizable con ajustes

| Endpoint | Qué debe modificarse | Por qué | Qué necesita Mobile |
|---|---|---|---|
| `GET /api/v1/notifications` | Ignorar `recipientId` del cliente | Hoy un usuario puede pedir notificaciones ajenas | Bandeja con los datos propios |
| `GET /api/v1/notifications` | Agregar paginación y filtro incremental | Descarga todo el histórico | Bandeja con scroll y badge barato |
| `GET /api/v1/notifications/:notificationId` | Validar propiedad del recurso | El detalle no comprueba el destinatario | Abrir notificación desde la bandeja |
| `GET /api/v1/students` | Proyección mínima | Cada fila trae dirección, contacto y fecha de nacimiento | Listado liviano en red móvil |
| `GET /api/v1/students/:studentId/summary` | Filtrar por `schoolId` | Acceso cross-escuela | Ficha segura |
| `GET /api/v1/students/:studentId/profile` | Excluir `historialCambios` y `perfilCompletoUrl`; filtrar por `schoolId` | Snapshots personales y ruta interna de Web | Legajo sin datos de más |
| `GET /api/v1/students/:studentId/observations` | Filtrar por `schoolId` | Fuga entre instituciones | Observaciones del alumno |
| `GET /api/v1/observations` | Filtrar por `schoolId`; agregar paginación | Trae todas | Bandeja acotada |
| `POST /api/v1/students/:studentId/observations` | Filtrar por `schoolId` | Escritura sin control de escuela | Cargar observación |
| `GET /api/v1/alumnos/:alumnoId/situacion-academica` | Filtrar por `schoolId`; permitir proyección mínima | Devuelve historial agrupado completo | Situación del alumno |
| `GET /api/v1/divisiones/:divisionId/horarios` | Incluir materia, docente y aula | Payload insuficiente | Horario real |
| `GET /api/v1/schedule-assignments` | Agregar paginación; excluir `createdBy`/`updatedBy` | Payload grande con identificadores internos | Horario del docente |
| `GET /api/v1/absences` | Agregar paginación; derivar `teacherId` del token | Cliente elige el docente | Mis ausencias seguras |
| `POST /api/v1/absences` | Derivar `schoolId` del token | `schoolId` viene del body | Registrar ausencia |
| `GET /api/v1/incidents` | Agregar paginación | Listado completo | Novedades |
| `GET /api/v1/teachers` | Agregar paginación; excluir `documentNumber`, `email`, `phone` | Datos personales de terceros | Directorio mínimo |
| `GET /api/v1/spaces` | Agregar paginación | Sin paginación | Reservar aula |
| `POST /api/v1/reservations` | Derivar `ownerId` del token | Cliente puede reservar por otro | Reservar espacio propio |
| `POST /api/v1/reservations/:reservationId/approve` | Validar propiedad y alcance | Sin validación | Aprobar reservas |
| `GET /api/v1/dashboard/secretaria` | Revisar alcance, costo y proyección | Recalcula todos los alumnos | Indicadores |
| `POST /api/v1/users` | No exponer `passwordTemporal` a Mobile | Credencial en claro | Alta de usuario (uso administrativo) |

#### 10.3 Nuevo endpoint

Ninguno de estos existe en `Backend/routes/index.mjs` y no se encontró equivalente con otra
ruta, controlador o servicio.

| Funcionalidad | Motivo | Datos que debería devolver | Rol | Permiso | Validaciones necesarias | Dependencias |
|---|---|---|---|---|---|---|
| Mi contexto operativo | `teachers.userId` existe en el modelo pero no hay lookup por usuario ni semilla que lo conecte. `auth/me` no lo expone | Divisions, cursos y materias asignadas al usuario | preceptor, docente | Pendiente de definición | Verificar que el usuario tenga rol docente | `GET /api/v1/auth/me` |
| Mi horario | `teacherId` no es clave de alcance y lo elige el cliente | Horario semanal con materia, docente, aula y franja | preceptor, docente | `schedules.read` | Resolver usuario → docente; filtrar por escuela | Requiere "mi contexto" |
| Mis ausencias | Mismo problema de autoscoping | Ausencias y novedades del usuario | preceptor, docente | `absences.read` | Resolver usuario → docente | Requiere "mi contexto" |
| Registro de dispositivo para push | No existe `deviceId`, `pushToken` ni suscripciones en todo el backend | Confirmación de registro | Todos | Pendiente de definición | Token válido; vínculo con el usuario | `POST /api/v1/auth/login` |
| Cambio de contraseña | No existe ruta de cambio de contraseña | Confirmación | Todos | Pendiente de definición | Contraseña actual correcta; política de complejidad | `POST /api/v1/auth/login` |
| Módulo de asistencia | Los permisos `attendance.read`/`attendance.write` existen pero **ninguna ruta los usa** | Asistencia por alumno, fecha y estado | preceptor, docente | `attendance.read` / `attendance.write` | Estado de alumno; Periodo; Justificación | `GET /api/v1/students/listas/division` |
| Módulo de calificaciones | Los permisos `grades.read`/`grades.write` existen pero no hay rutas | Evaluación, nota y estado por alumno y materia | docente | `grades.read` / `grades.write` | Materia válida; Período; Rango de nota | `GET /api/v1/divisiones/:divisionId/materias` |

**No se creó ninguno de estos endpoints.**

---

### 11. Información que debe excluirse

Estos ajustes deben realizarse **en la API común**, no en React Native.

#### 11.1 Información sensible

| Campo | Dónde aparece | Motivo |
|---|---|---|
| `password`, `passwordHash` | `users` | Nunca debe salir del servidor |
| `accessToken`, `refreshToken` | `auth/login`, `auth/refresh` | Solo en la respuesta de autenticación, nunca en listados |
| `refreshTokenId` | Refresh tokens | Identificador interno de sesión |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Config | La API no arranca con valores de desarrollo en producción |

#### 11.2 Información interna

| Campo | Dónde aparece | Motivo |
|---|---|---|
| `createdBy`, `updatedBy` | `schedule-assignments`, `spaces`, `shifts`, `time-slots` | Identificadores internos de auditoría |
| `referenceType`, `referenceId` | `notifications` | Referencias internas entre módulos |
| `perfilCompletoUrl` | `students/:studentId/profile` | Ruta hash interna de Web (`#/alumnos/...`), inservible en Mobile |
| `ip`, `usuarioId` | `audit/logs`, `audit/errors` | Datos de trazabilidad, uso administrativo |
| `valorAnterior`, `valorNuevo` | `audit/logs` | Snapshots completos de entidades |
| `debug` | Respuestas `500` fuera de producción | Filtra mensajes técnicos del servidor |
| `schoolId` en respuestas de Mobile | Múltiples endpoints | Solo se usa para filtrar server-side |

#### 11.3 Información de otros usuarios

| Endpoint | Filtro faltante | Consecuencia |
|---|---|---|
| `GET /api/v1/notifications` | `recipientId` del cliente | Un usuario lee notificaciones ajenas |
| `GET /api/v1/notifications/:notificationId` | Propiedad del recurso | Detalle de cualquier notificación por id |
| `GET /api/v1/students/:studentId` y derivados | `schoolId` | Acceso a alumnos de otra escuela |
| `GET /api/v1/observations` | `schoolId` | Observaciones de toda la red |
| `GET /api/v1/schedule-assignments` | `teacherId` | Horarios de cualquier docente |
| `GET /api/v1/absences` | `teacherId` | Ausencias de cualquier docente |
| `POST /api/v1/reservations` | `ownerId` | Reserva en nombre de terceros |
| `GET /api/v1/teachers` | Proyección | DNI, email y teléfono de todos los docentes |

#### 11.4 Información innecesaria

| Endpoint | Campo a excluir | Motivo |
|---|---|---|
| `GET /api/v1/students` | `direccion`, `contacto`, `email`, `telefono`, `fechaNacimiento` | No hacen falta para listar; sí para la ficha |
| `GET /api/v1/students/:studentId/profile` | `historialCambios` | Snapshots de dirección, contacto y otros datos personales |
| `GET /api/v1/teachers` | `documentNumber`, `email`, `phone` | Datos de contacto no necesarios para referenciar un docente |
| `GET /api/v1/dashboard/secretaria` | Payload completo | Indicadores agregados, no el detalle de cada alumno |
| `GET /api/v1/alumnos/:alumnoId/historial-academico` | Períodos no solicitados | El móvil puede pedir solo el período actual |

#### 11.5 Información restringida por permisos

| Información | Permiso que la protege | Endpoints |
|---|---|---|
| Alta y edición de usuarios | `identity.create`, `identity.update` | `/api/v1/users` |
| Permisos por rol | `identity.update` | `/api/v1/authorization/roles/:codigo/permissions` |
| Modificación de alumnos | `students.write` | `/api/v1/students/:studentId` |
| Creación de observaciones | `observations.write` | `/api/v1/students/:studentId/observations` |
| Aprobación de reservas | `reservations.manage` | `/api/v1/reservations/:reservationId/approve` |
| Estados de materia | `academic-records.write` | `/api/v1/situaciones-academicas/:situacionId` |
| Auditoría y exportación | `audit.read`, `audit.export` | `/api/v1/audit/logs`, `/api/v1/audit/export` |
| Estructura académica (alta y baja) | `academics.write`, `academics.manage` | `/api/v1/cursos`, `/api/v1/divisiones` |

---

### 12. Pendientes

#### 12.1 Funcionalidad no definida

- **Pantallas y flujos concretos de Mobile.** No están especificados en ningún documento del
  repositorio. **Pendiente de definición.**
- **Qué roles acceden a la app.** No está definido si es solo `preceptor` y `docente`, o
  también `secretario`, `jefe_area`, `admin`, `director`. **Pendiente de definición.**
- **Modo consulta vs. carga.** No está definido si Mobile solo consulta o también carga
  asistencia, observaciones y novedades. **Pendiente de definición.**
- **Entidad `grupo`.** Solo existe como `grupoTaller` dentro de un taller y como filtro de
  `GET /api/v1/students/listas/grupo`. No hay entidad propia. **Pendiente de definición.**
- **Matriz institucional de permisos por rol y alcance.** `Shared/docs/mvp-scope.md` la
  lista como pendiente de validación. La tabla de la sección 6.2 refleja el código, no una
  decisión validada.

#### 12.2 Permisos y roles

- **Permiso para "mi contexto".** No existe un permiso específico. **Pendiente de definición.**
- **Permiso para registro de dispositivo.** **Pendiente de definición.**
- **Permiso para cambio de contraseña.** **Pendiente de definición.**
- **Verificar `roles.read`.** La constante existe en `Frontend/web/src/app/rutas.js` pero no
  en el catálogo del backend. Debe confirmarse si es residuo o si falta el permiso.

#### 12.3 Backend

- Autoscoping de notificaciones (`GET` y detalle).
- Filtro por `schoolId` en endpoints de alumno por id, observaciones y situación académica.
- Definir alcance por docente y resolver `teachers.userId`.
- Paginación en notificaciones, ausencias, incidencias, horarios, asignaciones, espacios,
  docentes, usuarios y observaciones.
- Proyecciones mínimas y exclusión de `createdBy`/`updatedBy`.
- Revisar costo y alcance de `GET /api/v1/dashboard/secretaria`.
- Unificar la forma de respuesta de `DELETE /api/v1/absences/:absenceId`.
- Definir si `debug` debe existir en builds de Mobile.
- Módulo de asistencia (permisos ya asignados, sin rutas).
- Módulo de calificaciones (permisos ya asignados, sin rutas).
- Endpoint de cambio de contraseña.

#### 12.4 Mobile

- Cliente HTTP con interceptores de sesión, refresh y reintentos.
- Pantalla de login y cierre de sesión.
- Consulta de permisos para habilitar navegación.
- Almacenamiento seguro de tokens (Keychain / Keystore).
- Configuración de URL base por ambiente válida para dispositivo físico.
- Definir librerías de estado, navegación y caché local.
- Estrategia de sincronización, si se aprueba modo offline.
- Pruebas de contrato contra la API.

#### 12.5 No identificado en el código o documentación actual

- Documento funcional `BE-05 — Roles y permisos`: **no identificado**.
- Política de contraseñas: **no identificada** (solo el hash bcrypt y las variables de
  entorno).
- Reglas de validación del formato de email en login: **no identificadas**.
- Límite de tamaño de página para los listados paginados de mobile: **no identificado**.
- Estrategia de versionado de datos para sincronización: **no identificada**.

---

### Anexo: Convenciones a respetar

- Un permiso se escribe `modulo.accion`. Acciones canónicas: `read`, `create`, `update`,
  `delete`, `approve`, `upload`. Legadas: `write` (crear+modificar+cargar) y `manage`
  (eliminar+aprobar).
- Los permisos de un usuario son la **unión** de los de sus roles.
- Respuesta estándar `{ data }`. Listados paginados: `{ data, filtros, paginacion }`.
- `Cache-Control: no-store` en respuestas con datos sensibles.
- Toda validación y sanitización vive en Backend. El cliente no decide permisos.
- `ApiError` es la única clase de error de la API.
- La auditoría registra `POST`/`PATCH`/`PUT`/`DELETE`; los `GET` no se auditan salvo uso
  explícito.
- Los GET que mobile vaya a consultar de forma recurrente deben evaluarse por costo antes de
  depender de ellos.