# Mobile (aplicación móvil)

Relevamiento funcional y técnico de la aplicación móvil.

---

## Reglas del relevamiento

- Mobile consume la **misma API común** que Web (`/api/v1`), sin API paralela ni autenticación propia.
- La autorización es siempre definitiva en Backend (`verifyToken` + `authorize`). Ocultar botones en la app es usabilidad, no seguridad.
- No se inventan endpoints ni reglas: lo que no está en `Backend/routes/index.mjs` se marca como **pendiente / requiere definición o desarrollo**.
- Las rutas propuestas se escriben con placeholder `<recurso>` para no presentarlas como existentes.
- No se debe duplicar lógica de negocio entre Web y Mobile.
- Los ajustes necesarios de la API común deberán respetar la arquitectura, validaciones, autenticación, autorización, auditoría y manejo de errores existentes.

---

## 1. Funcionalidades relevadas

Clasificación utilizada:

- **Existe en API**: la funcionalidad ya está cubierta por la API existente.
- **Existe con ajustes**: existe funcionalidad relacionada, pero requiere modificaciones para su utilización segura o eficiente desde Mobile.
- **No existe en API**: no existe actualmente una implementación utilizable y requiere definición o desarrollo.

### 1.1 Autenticación y sesión

| Funcionalidad | Estado | Módulo |
|---|---|---|
| Login con email y contraseña | Existe en API | `auth` |
| Refresh token con rotación | Existe en API | `auth` |
| Logout / revocación de sesión | Existe en API | `auth` |
| Perfil del usuario autenticado | Existe en API | `auth` |
| Roles, permisos y resumen por módulo | Existe en API | `auth` + `authorization` |
| Cambio de contraseña del propio usuario | **No existe en API** | — |
| Bloqueo por intentos (`429 TOO_MANY_ATTEMPTS`) | Existe en API | `auth` |

### 1.2 Mi contexto operativo (identidad del docente / división)

| Funcionalidad | Estado | Evidencia |
|---|---|---|
| Saber "quién soy" como docente | **No existe en API** | `teachers` tiene campo `userId`, pero no hay lookup por usuario ni semilla que lo conecte |
| Mis divisiones asignadas | **Existe con ajustes** | `GET /api/v1/auth/me` devuelve asignaciones, pero no hay endpoint de "mi contexto" listo para consumir |
| Mis cursos / materias | Existe con ajustes | Requiere `courseId`/`divisionId` del cliente |

### 1.3 Horarios

| Funcionalidad | Estado | Módulo |
|---|---|---|
| Horario de una división | Existe en API (reducido) | `schedules`, `academic` |
| Horario de un curso | Existe en API (reducido) | `academic` |
| Asignaciones materia/docente/espacio | Existe en API | `schedules` |
| Turnos y franjas horarias | Existe en API | `schedules` |
| "Mi horario" (del usuario autenticado) | **No existe en API** | No hay autoscoping por `teacherId` |
| Horario semanal consolidado en una consulta | **No existe en API** | Requiere composición de varios endpoints |

### 1.4 Alumnos y legajo

| Funcionalidad | Estado | Módulo |
|---|---|---|
| Listado y búsqueda de alumnos | Existe en API | `students` |
| Listados por curso / división / taller | Existe en API | `students` |
| Ficha resumida | Existe con ajustes | `students` |
| Perfil completo del alumno | Existe con ajustes (payload pesado) | `students` |
| Observaciones del alumno | Existe en API | `students` |
| Todas las observaciones | Existe en API | `students` |
| Dar de alta / modificar / desactivar alumno | Existe en API (uso administrativo) | `students` |
| Pase de alumno | Existe en API | `students` |
| Constancia de alumno regular | Existe en API | `students` |
| Situación académica del alumno | Existe en API | `academic-records` |
| Historial académico | Existe en API | `academic-records` |
| Tablero de secretaría | Existe con ajustes (pesado) | `students` |

### 1.5 Observaciones y alertas

| Funcionalidad | Estado | Módulo |
|---|---|---|
| Listar observaciones | Existe en API | `students` |
| Crear observación | Existe en API | `students` |
| Descartar alerta | Existe en API | `students` |

### 1.6 Notificaciones

| Funcionalidad | Estado | Módulo |
|---|---|---|
| Bandeja de notificaciones | Existe con ajustes | `notifications` |
| Contador de no leídas | Existe en API | `notifications` |
| Marcar como leída | Existe con ajustes | `notifications` |
| Marcar todas como leídas | Existe con ajustes | `notifications` |
| Crear notificación (uso interno) | Existe en API | `notifications` |
| Registrar dispositivo / push token | **No existe en API** | No hay `deviceId`, `pushToken` ni suscripciones |

### 1.7 Asistencia

| Funcionalidad | Estado | Módulo |
|---|---|---|
| Módulo de asistencia | **No existe en API** | Hay carpeta y permisos, pero **ninguna ruta** |
| Listado de inasistencias en resumen / perfil | Existe como stub | `students` devuelve `disponible: false` e inasistencias en cero |
| Permisos `attendance.read` / `attendance.write` | Existen en catálogo, sin ruta asociada | `config/permissions.config.mjs` |

### 1.8 Calificaciones

| Funcionalidad | Estado |
|---|---|
| Módulo de calificaciones | **No existe en API** (carpeta y permisos sin rutas) |

### 1.9 Docentes

| Funcionalidad | Estado | Módulo |
|---|---|---|
| Listar / consultar docentes | Existe en API | `teachers` |
| Materias asignadas a un docente | Existe en API | `teachers` |
| Vincular usuario con registro docente | **No existe en API** | Falta lookup por `userId` |

### 1.10 Ausencias y novedades

| Funcionalidad | Estado | Módulo |
|---|---|---|
| Registrar ausencia docente | Existe en API | `absences` |
| Listar / consultar ausencias | Existe con ajustes | `absences` |
| Eliminar ausencia | Existe en API | `absences` |
| Novedades / incidentes | Existe con ajustes | `absences` |
| "Mis ausencias" | **No existe en API** | No hay autoscoping por `teacherId` |

### 1.11 Espacios y aulas

| Funcionalidad | Estado | Módulo |
|---|---|---|
| Listar edificios / espacios | Existe en API | `spaces` |
| Reservas de espacios | Existe con ajustes | `reservations` |
| Aprobar / rechazar / cancelar reserva | Existe en API | `reservations` |
| Carreras | Existe en API | `spaces` |

### 1.12 Estructura académica

| Funcionalidad | Estado | Módulo |
|---|---|---|
| Ciclos, orientaciones, cursos, divisiones | Existe en API | `academic` |
| Alumnos / materias / docentes / horarios por curso o división | Existe en API | `academic` |
| Catálogos y situaciones académicas | Existe en API | `academic-records` |
| Alumnos por escuela/curso/división | Existe en API | `schools` |

### 1.13 Gestión (uso administrativo, no prioritario en Mobile)

| Funcionalidad | Estado | Módulo |
|---|---|---|
| Usuarios | Existe en API | `auth` |
| Roles y permisos | Existe en API | `authorization` |
| Talleres y sesiones | Existe en API | `workshops` |
| Inventario y movimientos | Existe en API | `inventory` |
| Solicitudes y comentarios | Existe en API | `requests` |
| Curriculum (áreas, planes, actividades) | Existe en API | `curriculum` |
| Auditoría y logs | Existe en API (uso interno) | `audit` |
| Tutorías | Existe en API | `tutors` |
| Inventario documental / legajo digital | **No existe en API** | Carpeta sin código ni rutas |

---

## 2. Matriz de roles y permisos

### 2.1 Roles reales del catálogo

Los roles existen en `Backend/config/permissions.config.mjs`:

`admin`, `director`, `secretario`, `preceptor`, `docente`, `jefe_area`, `server`.

`admin` y `director` reciben `ALL_PERMISSIONS`.

No hay roles de alumno ni de familia: el alcance MVP excluye cuentas de estudiantes o familias (`Shared/docs/mvp-scope.md`).

### 2.2 Permisos por rol

Resumen de los permisos que intersectan con los flujos de Mobile:

| Permiso | admin | director | secretario | preceptor | docente | jefe_area | server |
|---|---|---|---|---|---|---|---|
| `students.read` | sí | sí | sí | sí | no | sí | sí |
| `students.write` | sí | sí | sí | sí | no | no | sí |
| `observations.read` | sí | sí | sí | sí | no | sí | sí |
| `observations.write` | sí | sí | sí | sí | no | no | sí |
| `schedules.read` | sí | sí | no | sí | sí | sí | sí |
| `absences.read` | sí | sí | sí | sí | sí | sí | sí |
| `absences.write` | sí | sí | sí | sí | sí | sí | sí |
| `academics.read` | sí | sí | sí | sí | sí | sí | sí |
| `academic-records.read` | sí | sí | sí | sí | sí | sí | sí |
| `academic-records.write` | sí | sí | sí | sí | sí | sí | sí |
| `teachers.read` | sí | sí | sí | sí | no | sí | sí |
| `notifications.read` | sí | sí | sí | sí | sí | sí | sí |
| `notifications.write` | sí | sí | sí | sí | no | sí | sí |
| `attendance.read` | sí | sí | no | sí | sí | no | no |
| `attendance.write` | sí | sí | no | sí | sí | no | no |
| `grades.read` | sí | sí | no | no | sí | no | no |
| `grades.write` | sí | sí | no | no | sí | no | no |
| `documents.read` | sí | sí | sí | sí | sí | no | sí |
| `documents.write` | sí | sí | sí | sí | sí | no | sí |
| `spaces.read` | sí | sí | no | sí | no | sí | sí |
| `reservations.read` | sí | sí | sí | sí | sí | sí | sí |
| `reservations.write` | sí | sí | sí | sí | sí | sí | sí |
| `inventory.read` | sí | sí | no | no | no | sí | sí |
| `requests.read` | sí | sí | sí | sí | no | sí | sí |
| `curriculum.read` | sí | sí | no | sí | sí | sí | sí |
| `workshops.read` | sí | sí | no | sí | sí | sí | sí |
| `audit.read` | sí | sí | no | no | no | no | sí |
| `users.read` | sí | sí | sí | no | no | sí | sí |
| `roles.read` | sí | sí | no | no | no | no | sí |

**Nota:** la matriz institucional exacta de permisos por rol y alcance sigue **pendiente de validación** en `Shared/docs/mvp-scope.md`. La tabla refleja el código vigente, no una decisión validada.

### 2.3 Alcance (scope)

Cada asignación rol→contexto puede acotarse por:

`schoolId`, `courseId`, `divisionId`, `subjectId`, `shiftId`, `periodId`.

Un valor omitido significa "todo ese nivel".

`teacherId` y `userId` **no** son claves de alcance en el código actual.

Consecuencia directa: un usuario con permiso puede consultar datos de cualquier docente si el endpoint no valida pertenencia.

### 2.4 Matriz de funcionalidades × roles para Mobile

| Funcionalidad Mobile | admin | director | secretario | preceptor | docente | jefe_area | server |
|---|---|---|---|---|---|---|---|
| Login y perfil | sí | sí | sí | sí | sí | sí | sí |
| Ver mi horario | con ajustes | con ajustes | no (sin permiso) | con ajustes | con ajustes | con ajustes | con ajustes |
| Cargar asistencia | requiere módulo | requiere módulo | no (sin permiso) | requiere módulo | requiere módulo | no (sin permiso) | no (sin permiso) |
| Mis ausencias / novedades | con ajustes | con ajustes | con ajustes | con ajustes | con ajustes | con ajustes | con ajustes |
| Listar alumnos de mi división | sí | sí | sí | sí | no (sin permiso) | sí | sí |
| Ficha de alumno | sí | sí | sí | sí | no (sin permiso) | sí | sí |
| Observaciones | sí | sí | sí | sí | no (sin permiso) | sí | sí |
| Situación académica | sí | sí | sí | sí | sí | sí | sí |
| Notificaciones | sí | sí | sí | sí | sí | sí | sí |
| Reservar espacio | sí | sí | sí | sí | sí | sí | sí |
| Aprobar reservas | sí | sí | sí | sí | sí | sí | sí |
| Administrar usuarios y roles | sí | sí | no (sin permiso) | no | no | no | sí |
| Auditoría | sí | sí | no | no | no | no | sí |

---

## 3. Matriz de endpoints

Solo se listan rutas existentes en `Backend/routes/index.mjs`.

Las propuestas se indican con placeholder y **no existen actualmente**.

### 3.1 Autenticación y autorización

| Método y ruta | Permiso | Uso Mobile | Ajuste |
|---|---|---|---|
| `POST /api/v1/auth/login` | público | Login | — |
| `POST /api/v1/auth/refresh` | público | Renovar sesión | — |
| `POST /api/v1/auth/logout` | público | Cerrar sesión | — |
| `GET /api/v1/auth/me` | `verifyToken` | Sesión, roles, permisos, alcances | Base de la app |
| `GET /api/v1/auth/permissions` | `verifyToken` | Habilitar/deshabilitar pantallas | No es autorización |
| `GET /api/v1/authorization/me` | `verifyToken` | Alternativa a `auth/me` | Ver cuál se usa |
| `GET /api/v1/authorization/roles` | `roles.read` | Solo administrativo | No prioritario |
| `GET /api/v1/authorization/roles/:codigo/permissions` | `roles.read` | Solo administrativo | No prioritario |

### 3.2 Alumnos y legajo

| Método y ruta | Permiso | Uso Mobile | Ajuste |
|---|---|---|---|
| `GET /api/v1/students` | `students.read` | Listado con búsqueda y paginación | Proyección mínima |
| `GET /api/v1/students/divisions` | `students.read` | Selector de divisiones | — |
| `GET /api/v1/students/listas/curso` | `students.read` | Alumnos por curso | — |
| `GET /api/v1/students/listas/division` | `students.read` | Alumnos por división | — |
| `GET /api/v1/students/listas/taller` | `students.read` | Alumnos por taller | — |
| `GET /api/v1/students/listas/grupo` | `students.read` | Alumnos por grupo de taller | — |
| `GET /api/v1/students/:studentId` | `students.read` | Ficha | Requiere filtrado por escuela |
| `GET /api/v1/students/:studentId/summary` | `students.read` | Ficha resumida | Requiere filtrado por escuela |
| `GET /api/v1/students/:studentId/profile` | `students.read` | Perfil completo | Payload pesado, `historialCambios` incluido |
| `GET /api/v1/students/:studentId/observations` | `observations.read` | Observaciones del alumno | Sin filtro de escuela |
| `GET /api/v1/observations` | `observations.read` | Bandeja de observaciones | Sin filtro de escuela ni paginación |
| `GET /api/v1/dashboard/secretaria` | `students.read` | Indicadores | Muy pesado; requiere alcance |

### 3.3 Tutorías

| Método y ruta | Permiso | Uso Mobile |
|---|---|---|
| `GET /api/v1/tutors` | `students.read` | Listado con paginación |
| `GET /api/v1/tutors/:tutorId` | `students.read` | Ficha de tutor |
| `GET /api/v1/tutors/:tutorId/students` | `students.read` | Alumnos a cargo |
| `GET /api/v1/students/:studentId/tutors` | `students.read` | Responsables del alumno |

### 3.4 Estructura académica

| Método y ruta | Permiso | Uso Mobile |
|---|---|---|
| `GET /api/v1/cursos` | `academics.read` | Selector de cursos |
| `GET /api/v1/cursos/:cursoId` | `academics.read` | Detalle de curso |
| `GET /api/v1/cursos/:cursoId/divisiones` | `academics.read` | Divisiones del curso |
| `GET /api/v1/divisiones` | `academics.read` | Selector de divisiones |
| `GET /api/v1/divisiones/:divisionId` | `academics.read` | Detalle de división |
| `GET /api/v1/divisiones/:divisionId/alumnos` | `academics.read` | Alumnos de la división |
| `GET /api/v1/divisiones/:divisionId/materias` | `academics.read` | Materias de la división |
| `GET /api/v1/divisiones/:divisionId/docentes` | `academics.read` | Docentes de la división |
| `GET /api/v1/divisiones/:divisionId/horarios` | `academics.read` | Horario de la división (reducido) |
| `GET /api/v1/cursos/:cursoId/horarios` | `academics.read` | Horario del curso (reducido) |

### 3.5 Situación académica

| Método y ruta | Permiso | Uso Mobile |
|---|---|---|
| `GET /api/v1/situaciones-academicas` | `academic-records.read` | Listado con filtros y paginación |
| `GET /api/v1/situaciones-academicas/catalogos` | `academic-records.read` | Tipos y estados válidos |
| `GET /api/v1/alumnos/:alumnoId/situacion-academica` | `academic-records.read` | Situación del alumno |
| `GET /api/v1/alumnos/:alumnoId/historial-academico` | `academic-records.read` | Historial completo |

### 3.6 Horarios

| Método y ruta | Permiso | Uso Mobile | Ajuste |
|---|---|---|---|
| `GET /api/v1/shifts` | `schedules.read` | Turnos | Sin paginación |
| `GET /api/v1/time-slots` | `schedules.read` | Franjas | Sin paginación |
| `GET /api/v1/schedules` | `schedules.read` | Horarios | Sin paginación |
| `GET /api/v1/schedule-assignments` | `schedules.read` | Asignaciones materia/docente/espacio | Sin paginación; expone `createdBy`/`updatedBy` |

### 3.7 Docentes y ausencias

| Método y ruta | Permiso | Uso Mobile | Ajuste |
|---|---|---|---|
| `GET /api/v1/teachers` | `teachers.read` | Directorio | Sin paginación |
| `GET /api/v1/teachers/:teacherId/subjects` | `teachers.read` | Materias del docente | — |
| `GET /api/v1/absences` | `absences.read` | Ausencias | `teacherId` lo elige el cliente |
| `GET /api/v1/absences/:absenceId` | `absences.read` | Detalle | — |
| `GET /api/v1/incidents` | `absences.read` | Novedades | Sin paginación |
| `POST /api/v1/absences` | `absences.write` | Registrar ausencia | — |

### 3.8 Notificaciones

| Método y ruta | Permiso | Uso Mobile | Ajuste |
|---|---|---|---|
| `GET /api/v1/notifications` | `notifications.read` | Bandeja | Acepta `recipientId` del cliente; sin paginación |
| `GET /api/v1/notifications/unread-count` | `notifications.read` | Badge | — |
| `GET /api/v1/notifications/:notificationId` | `notifications.read` | Detalle | Sin verificación de propiedad |
| `POST /api/v1/notifications/:notificationId/read` | `notifications.read` | Marcar leída | — |
| `POST /api/v1/notifications/read-all` | `notifications.read` | Marcar todas | — |

### 3.9 Espacios y reservas

| Método y ruta | Permiso | Uso Mobile |
|---|---|---|
| `GET /api/v1/buildings` | `spaces.read` | Edificios |
| `GET /api/v1/spaces` | `spaces.read` | Aulas y espacios |
| `GET /api/v1/spaces/:spaceId` | `spaces.read` | Detalle de espacio |
| `GET /api/v1/reservations` | `reservations.read` | Reservas |
| `POST /api/v1/reservations` | `reservations.write` | Crear reserva (el cliente envía `ownerId`) |
| `POST /api/v1/reservations/:reservationId/approve` | `reservations.manage` | Aprobar |
| `POST /api/v1/reservations/:reservationId/reject` | `reservations.manage` | Rechazar |

### 3.10 Endpoints propuestos (NO existen)

Se documentan solamente para dimensionar el trabajo. No deben interpretarse como contrato.

| Propuesta | Propósito | Estado |
|---|---|---|
| `GET /api/v1/<recurso>/mi-contexto` | Contexto del usuario autenticado | No existe |
| `GET /api/v1/<recurso>/mi-horario` | Horario del docente autenticado | No existe |
| `GET /api/v1/<recurso>/mis-ausencias` | Ausencias del docente autenticado | No existe |
| `GET /api/v1/<recurso>/mi-asistencia` | Asistencia propia | No existe |
| `POST /api/v1/<recurso>/dispositivos` | Registrar push token | No existe |
| `POST /api/v1/<recurso>/cambio-password` | Cambiar propia contraseña | No existe |

---

## 4. Datos mínimos por funcionalidad

Principio: pedir solo lo que la pantalla necesita, para reducir carga, datos sensibles expuestos y riesgo de exposición accidental.

| Pantalla / flujo | Endpoint | Datos mínimos a mostrar | No enviar / no depender |
|---|---|---|---|
| Login | `POST /api/v1/auth/login` | `accessToken`, `refreshToken`, `user.nombre`, `user.email` | No guardar en logs ni en AsyncStorage |
| Sesión / permisos | `GET /api/v1/auth/me` | `user.id`, `user.nombre`, `roles`, `permisos`, `asignaciones` | `passwordHash`, campos administrativos |
| Bandeja de notificaciones | `GET /api/v1/notifications` | `id`, `titulo`, `mensaje`, `tipo`, `createdAt`, `leida` | `referenceId`, `schoolId` internos |
| Contador no leídas | `GET /api/v1/notifications/unread-count` | `noLeidas` | — |
| Listado de alumnos | `GET /api/v1/students` | `id`, `apellido`, `nombre`, `dni`, `curso`, `division`, `estado` | `direccion`, `contacto`, `email`, `telefono`, `fechaNacimiento` en el listado |
| Ficha de alumno | `GET /api/v1/students/:studentId/summary` | Datos identificatorios, curso, división, condición | `historialCambios`, snapshots |
| Perfil completo | `GET /api/v1/students/:studentId/profile` | Solo campos requeridos | `historialCambios`, `perfilCompletoUrl` (ruta interna de Web) |
| Observaciones | `GET /api/v1/students/:studentId/observations` | `tipo`, `descripcion`, `sector`, `fecha`, `estado`, autor | — |
| Horario de división | `GET /api/v1/divisiones/:divisionId/horarios` | `dia`, `desde`, `hasta`, `tipo` | No alcanza: falta materia/docente |
| Horario consolidado | `GET /api/v1/schedule-assignments` | `materia`, `docente`, `espacio`, `dia`, `horaInicio`, `horaFin` | `createdBy`, `updatedBy` |
| Situación académica | `GET /api/v1/alumnos/:alumnoId/situacion-academica` | Resumen por estado y materias agrupadas | Historial de años anteriores |
| Mis ausencias | `GET /api/v1/absences` | `fecha`, `tipo`, `estado`, `motivo` | Ausencias de otros docentes |
| Directorio de docentes | `GET /api/v1/teachers` | `id`, `nombre`, `apellido` | `documentNumber`, `email`, `telefono` |
| Aulas | `GET /api/v1/spaces` | `id`, `nombre`, `tipo`, `capacidad` | `createdBy`, `updatedBy` |

Contrato de respuesta observado:

```text
{ data }
```

Los listados con paginación agregan:

```text
filtros
paginacion
```

Los errores llegan como:

```text
{ error: { code, message, details } }
```

---

## 5. Seguridad

### 5.1 Lo que ya protege Backend

- Access token JWT HS256 con payload mínimo (`sub`, `typ`, `roles`); nunca datos sensibles.
- Refresh token opaco, con hash SHA-256 en el store, rotación por uso y revocación de todas las sesiones si se reutiliza uno ya revocado.
- Contraseñas con hash bcrypt, nunca en texto plano.
- `Cache-Control: no-store` en respuestas de sesión.
- Límite de cuerpo JSON (1 MiB) y stack traces no expuestos en producción.
- Auditoría automática en mutaciones (`POST`/`PATCH`/`PUT`/`DELETE`) con actor, acción, valores previos/nuevos e IP, sanitizada para no persistir contraseñas ni tokens.
- Un usuario no puede desactivar ni modificar su propia cuenta.
- Permisos y alcances se resuelven en Backend; el cliente solo oculta opciones.

### 5.2 Riesgos y hallazgos

Estos puntos requieren corrección en Backend antes de exponerlos en Mobile:

| # | Hallazgo | Impacto |
|---|---|---|
| 1 | `GET /api/v1/notifications` acepta `recipientId` del cliente y el detalle por id no valida propiedad | Un usuario puede leer notificaciones de otro |
| 2 | Notificaciones sin paginación | Descarga completa del histórico en cada polling |
| 3 | Endpoints de alumno por id (`summary`, `profile`) no filtran por `schoolId` | Acceso cross-escuela con `students.read` |
| 4 | `GET /api/v1/observations` y observaciones por alumno sin filtro de escuela | Fuga de datos entre instituciones |
| 5 | `teacherId` no es clave de alcance; el cliente lo elige en horarios y ausencias | Un docente puede consultar el horario de otro |
| 6 | No existe resolución usuario→docente autenticado | Impide "mi horario" y "mis ausencias" seguros |
| 7 | `POST /api/v1/reservations` acepta `ownerId` del cliente; approve/reject/cancel no validan propiedad | Reserva en nombre de terceros |
| 8 | `GET /api/v1/schedule-assignments` sin paginación y expone `createdBy`/`updatedBy` | Payload grande y fuga de identificadores internos |
| 9 | `GET /api/v1/students/:studentId/profile` incluye `historialCambios` con snapshots completos | Datos personales de más; snapshot de dirección y contacto |
| 10 | `GET /api/v1/dashboard/secretaria` recalcula datos de todos los alumnos activos en cada llamada | Costo y exposición de datos institucionales |
| 11 | `GET /api/v1/users` y `GET /api/v1/teachers` sin paginación | Payload grande en pantallas de directorio |
| 12 | Detalle de error en ambientes no productivos puede filtrar mensajes internos | Exposición de información técnica |
| 13 | CORS abierto (`*`) | No aplica a app nativa, pero conviene restringir para Web |
| 14 | No hay registro de dispositivo ni push token | Notificaciones push no implementables |
| 15 | No hay endpoint de cambio de contraseña | El usuario no puede rotar su clave desde la app |

### 5.3 Recomendaciones para Mobile

- Guardar el access token en memoria; el refresh token en almacén seguro del dispositivo (Keychain / Keystore). Nunca en AsyncStorage ni en logs.
- No persistir legajos completos ni documentos sensibles en el dispositivo.
- Usar TLS en toda comunicación; la URL base debe venir de configuración, no hardcodeada.
- No confiar en la ausencia de botón para proteger una acción: toda escritura pasa por Backend.
- Registrar en cliente solo eventos de navegación y errores de red, nunca payloads con datos de alumnos.

---

## 6. Necesidades de API

### 6.1 Reutilizable tal cual

- `POST /api/v1/auth/login` y `POST /api/v1/auth/refresh`.
- `GET /api/v1/auth/me` para roles, permisos y alcances.
- `GET /api/v1/students` con búsqueda y paginación.
- `GET /api/v1/students/listas/division` y `GET /api/v1/divisiones/:divisionId/alumnos`.
- `GET /api/v1/alumnos/:alumnoId/situacion-academica`.
- `GET /api/v1/notifications/unread-count`.

### 6.2 Reutilizable con ajustes en Backend

- Proyección de lista de alumnos sin datos personales innecesarios.
- Autoscoping de notificaciones: ignorar `recipientId` del cliente y usar el usuario autenticado.
- Filtrado por `schoolId` en endpoints de alumno por id y observaciones.
- Paginación en notificaciones, ausencias, horarios, asignaciones, docentes y usuarios.
- Ocultar `createdBy`, `updatedBy` y snapshots en respuestas de Mobile.
- Resolver `teachers.userId` para vincular usuario con registro docente.
- Definir alcance por docente para "mi horario" y "mis ausencias`.

### 6.3 Requiere definición / desarrollo

- Pantallas y flujos concretos de Mobile.
- Módulo de asistencia: no existe backend. Requiere diseño de modelo, endpoints, permisos activos, reglas de justificaciones, cierres, alertas y resolución de conflictos de sincronización.
- Módulo de calificaciones: no existe backend.
- Notificaciones push: requiere registro de dispositivo y proveedor.
- Sincronización offline: requiere estrategia de conflictos, versionado de registros y cola local. `Shared/docs/mvp-scope.md` excluye el modo offline del MVP.
- Inventario documental / legajo digital: solo existe la carpeta del módulo.

---

## 7. Pendientes

### 7.1 Definición funcional

- [ ] Definir pantallas y flujos exactos de Mobile por rol.
- [ ] Validar la matriz de permisos y alcance por rol.
- [ ] Definir qué roles acceden a la app: ¿solo `preceptor` y `docente`, o también `secretario`, `jefe_area`, `admin`, `director`?
- [ ] Confirmar si la app es solo consulta o también carga (asistencia, observaciones, novedades).
- [ ] Definir volumen esperado de alumnos, divisiones y consultas concurrentes.

### 7.2 Backend

- [ ] Corregir ownership de notificaciones (ignorar `recipientId` del cliente).
- [ ] Aplicar filtro de `schoolId` en endpoints de alumno por id y observaciones.
- [ ] Definir alcance por docente y resolver `teachers.userId`.
- [ ] Agregar paginación a listados usados por la app.
- [ ] Exponer proyecciones mínimas y ocultar campos internos.
- [ ] Evaluar el costo de `GET /api/v1/dashboard/secretaria` para uso móvil.
- [ ] Endpoint de cambio de contraseña.
- [ ] Módulo de asistencia (si entra en alcance).
- [ ] Módulo de calificaciones (si entra en alcance).

### 7.3 Mobile

- [ ] Cliente HTTP con interceptores de sesión, refresh y reintentos.
- [ ] Pantalla de login y cierre de sesión.
- [ ] Consulta de permisos para habilitar navegación.
- [ ] Almacenamiento seguro de tokens.
- [ ] Configuración de URL base por ambiente, válida para dispositivo físico.
- [ ] Decidir librería de estado y navegación.
- [ ] Estrategia de caché local y sincronización, si se aprueba modo offline.
- [ ] Pruebas de contrato contra la API, análogas a las de Web.

### 7.4 Documentación

- [ ] Registrar el contrato de endpoints Mobile cuando exista.
- [ ] Documentar el proceso de alta de un usuario docente (alta, roles, vínculo con registro docente).
- [ ] Registrar decisiones sobre el alcance de la app por institución.

---

## Anexo A. Fuentes consultadas

### Backend

- `Backend/routes/index.mjs`
- `Backend/docs/ENDPOINTS.md`
- `Backend/config/permissions.config.mjs`
- `Backend/modules/auth/README.md`
- `Backend/modules/auth/token.service.mjs`
- `Backend/modules/auth/permission.service.mjs`
- `Backend/middlewares/auth.middleware.mjs`
- `Backend/middlewares/authorize.middleware.mjs`
- `Backend/middlewares/error.middleware.mjs`
- `Backend/modules/audit/README.md`
- `Backend/modules/audit/audit.service.mjs`
- `Backend/modules/students/README.md`
- `Backend/modules/students/students.repository.mjs`
- `Backend/modules/students/students.service.mjs`
- `Backend/modules/students/legajo.service.mjs`
- `Backend/modules/tutors/README.md`
- `Backend/modules/academic/README.md`
- `Backend/modules/academic-records/README.md`
- `Backend/modules/schedules/README.md`
- `Backend/modules/teachers/README.md`
- `Backend/modules/absences/README.md`
- `Backend/modules/notifications/README.md`
- `Backend/modules/notifications/notifications.service.mjs`
- `Backend/modules/spaces/README.md`
- `Backend/modules/reservations/README.md`
- `Backend/modules/attendance/README.md`
- `Backend/modules/grades/README.md`
- `Backend/modules/documents/README.md`
- `Backend/modules/schools/README.md`
- `Backend/test/documentacion.test.mjs`
- `Backend/test/contrato-frontend.test.mjs`

### Shared

- `Shared/src/domain.mjs`
- `Shared/docs/mvp-scope.md`
- `Shared/docs/architecture.md`

### Web

- `Frontend/web/src/services/http.js`
- `Frontend/web/src/services/identity-api.js`
- `Frontend/web/src/services/notificaciones-api.js`
- `Frontend/web/src/utils/permisos.js`
- `Frontend/web/src/app/rutas.js`

---

## Anexo B. Convenciones técnicas a respetar

- `ApiError` para errores previsibles; nunca filtrar stack traces al cliente.
- Respuesta estándar `{ data }`; listados con `{ data, filtros, paginacion }`.
- `Cache-Control: no-store` en cualquier respuesta con datos sensibles.
- Validación y sanitización siempre en Backend; el cliente no decide permisos.
- Un permiso se escribe `modulo.accion`; las acciones canónicas son `read`, `create`, `update`, `delete`, `approve`, `upload`.