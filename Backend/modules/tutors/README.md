# Padres y tutores

Modulo para la gestion de padres, madres y tutores asociados a los alumnos:
alta, modificacion, consulta, listado, baja logica y las relaciones tutor/alumno
con su parentesco.

## Permisos

Los endpoints usan `verifyToken` + `authorize`. Se reutilizan los permisos del
legajo:

- `students.read` para consultar tutores, alumnos asociados y relaciones.
- `students.write` para registrar, modificar, desactivar y desvincular.

Sin token la API responde `401`; con token sin el permiso responde `403`. El
cliente nunca decide los permisos ni el alcance.

| Operacion | Metodo y ruta | Permiso |
| --- | --- | --- |
| Registrar tutor | `POST /api/v1/tutors` | `students.write` |
| Listar / buscar tutores | `GET /api/v1/tutors` | `students.read` |
| Consultar tutor | `GET /api/v1/tutors/:tutorId` | `students.read` |
| Modificar tutor | `PATCH /api/v1/tutors/:tutorId` | `students.write` |
| Desactivar tutor | `DELETE /api/v1/tutors/:tutorId` | `students.write` |
| Alumnos de un tutor | `GET /api/v1/tutors/:tutorId/students` | `students.read` |
| Asociar tutor a alumno | `POST /api/v1/students/:studentId/tutors` | `students.write` |
| Tutores de un alumno | `GET /api/v1/students/:studentId/tutors` | `students.read` |
| Modificar relacion | `PATCH /api/v1/student-tutors/:relationId` | `students.write` |
| Desvincular relacion | `DELETE /api/v1/student-tutors/:relationId` | `students.write` |

## Datos del tutor

`nombre`, `apellido` y `dni` (obligatorios); `telefono`, `email`, `direccion` y
`escuelaId` (opcionales). El email y el telefono se validan por formato. El DNI
debe tener entre 7 y 9 digitos y es unico por escuela (`409 Conflict` si se
repite).

En la creacion y modificacion solo se aceptan esos campos: cualquier otro dato
del cuerpo se ignora (sanitizacion), incluidos `isActive`, `id`, `password` o
`createdBy`. La escuela no se puede cambiar por modificacion: se toma del actor
o de `escuelaId` en el alta.

## Relaciones tutor/alumno

- Un alumno puede tener uno o varios responsables y un tutor puede estar
  asociado a uno o varios alumnos.
- Cada relacion registra el `parentesco` (lista cerrada: `padre`, `madre`,
  `tutor`, `responsable_legal`, `abuelo`, `abuela`, `hermano`, `hermana`,
  `otro`), `responsablePrincipal` y `autorizadoRetiro` (booleanos).
- Solo se puede asociar a alumnos y tutores existentes: si el alumno o el tutor
  no existe, la API responde `404`.
- La asociacion es unica: el par tutor/alumno no puede registrarse dos veces
  (ni siquiera despues de desvincular), responde `409`.

## Consulta de tutores de un alumno y alumnos de un tutor

- `GET /students/:studentId/tutors` devuelve las relaciones activas con los
  datos publicos del tutor (sin campos innecesarios). `?estado=todos` incluye
  las desvinculadas, para conservar el historial.
- `GET /tutors/:tutorId/students` devuelve las relaciones activas con los datos
  minimos del alumno (`id`, `apellido`, `nombre`, `dni`).

## Listado de tutores

`GET /api/v1/tutors` acepta filtros combinables: `apellido` y `nombre`
(parcial, sin distinguir tildes ni mayusculas), `dni` (exacto), `estado`
(`activo` por defecto, `inactivo` o `todos`); orden con `orden`
(`apellido`, `apellido_desc`, `nombre`, `nombre_desc`, `dni`, `dni_desc`) y
paginacion con `pagina` / `porPagina` (maximo 100). La respuesta incluye
`data`, `filtros` y `paginacion` con `total`, `totalPaginas`, `tieneAnterior`
y `tieneSiguiente`.

## Baja logica y desvinculacion

- `DELETE /api/v1/tutors/:tutorId` desactiva el tutor (`estado: inactivo` y
  `fechaBaja`). No se elimina fisicamente: las relaciones y el historial de los
  alumnos se conservan y el tutor sigue apareciendo en las consultas de
  historial con su estado.
- `DELETE /api/v1/student-tutors/:relationId` desvincula la relacion
  (`estado: inactivo` y `desvinculadoEn`). La relacion deja de listarse por
  defecto pero queda en la traza y en `?estado=todos`.

## Auditoria

Las operaciones sensibles (`tutor:create`, `tutor:update`,
`tutor:deactivate`, `relacion:create`, `relacion:update`,
`relacion:unlink`) quedan registradas con actor, entidad, antes y despues en
el almacen local (`store.tutorsAudit`), preparadas para integrarse a la
auditoria transversal del backend cuando exista.

## Registro de alumnos de referencia

Para validar que las relaciones apuntan a alumnos existentes, el modulo usa un
registro minimo del legajo (`store.studentsRef`) con `id`, `apellido`,
`nombre`, `dni` y `escuelaId`. Cuando el CRUD de alumnos este en este backend,
esa referencia se reemplaza por el repository real de alumnos sin cambiar los
endpoints.