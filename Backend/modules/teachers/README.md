# Docentes

Módulo de gestión de docentes: registro y mantenimiento del legajo del docente
(datos personales, título, especialidades y estado) y de sus asociaciones con la
estructura académica, con historial por período y baja lógica.

## Modelo

- **Docente**: `apellido`, `nombre`, `tipoDocumento` (`dni`, `lc`, `le`, `ci`, `pasaporte`), `documento`, `email`, `telefono`, `titulo`, `especialidades[]`, `area` (opcional, id del catálogo de áreas institucionales de `config/areas.config.mjs`) y `estado` (`activo` / `inactivo`).
- Unicidad por `(escuelaId, documento)` y `(escuelaId, email)`.
- **Asignación de materia**: docente + materia, con alcance opcional (curso y/o división) y período.
- **Asignación de curso/división**: docente + curso y/o división, con `rol` (`titular`, `suplente`, `ayudante`) y período.
- **Período**: `anio` lectivo obligatorio (1990–2100) y `cuatrimestre` opcional (`1`, `2` o `null` para período anual).
- Unicidad de asignaciones por docente + materia/alcance + rol + período.
- **Historial inmutable**: cada modificación guarda el snapshot anterior en `historial`; nada se borra.
- **Baja lógica**: `DELETE` deja el recurso en `estado: "inactivo"` con `fechaBaja`; un docente inactivo no puede recibir nuevas asignaciones (409).
- Toda alta, modificación y baja queda registrada en auditoría con el responsable del token.

## Endpoints

### Docentes

- GET /api/v1/teachers/catalogos — estados, tipos de documento, roles y estados de asignación, áreas y materias dictadas
- POST /api/v1/teachers — registrar docente
- GET /api/v1/teachers — listar con filtros (`q`, `estado`, `area`, `materiaId`, `orden`) y paginación; cada docente trae `asignaciones` (materias y cursos activos)
- GET /api/v1/teachers/:teacherId — ver un docente
- PATCH /api/v1/teachers/:teacherId — modificar datos del docente
- DELETE /api/v1/teachers/:teacherId — baja lógica

### Consultas inversas

- GET /api/v1/teachers/by-subject/:subjectId — docentes que dictan una materia (con sus asignaciones)
- GET /api/v1/teachers/by-course/:cursoId — docentes asociados a un curso
- GET /api/v1/teachers/by-division/:divisionId — docentes asociados a una división

### Asignaciones de materia

- POST /api/v1/teachers/:teacherId/subjects — asignar una materia
- GET /api/v1/teachers/:teacherId/subjects — listar asignaciones del docente (filtros `anio`, `cuatrimestre`, `estado`, `orden`)
- GET /api/v1/teachers/:teacherId/subjects/:assignmentId — ver una asignación
- PATCH /api/v1/teacher-subjects/:assignmentId — modificar (materia, alcance, período, horas, observaciones, estado)
- DELETE /api/v1/teacher-subjects/:assignmentId — baja lógica

### Asignaciones de curso/división

- POST /api/v1/teachers/:teacherId/courses — asignar un curso o división
- GET /api/v1/teachers/:teacherId/courses — listar asignaciones del docente
- GET /api/v1/teachers/:teacherId/courses/:assignmentId — ver una asignación
- PATCH /api/v1/teacher-courses/:assignmentId — modificar (alcance, rol, período, observaciones, estado)
- DELETE /api/v1/teacher-courses/:assignmentId — baja lógica

## Permisos

- Legado/acceso de lectura: `teachers.read`
- Alta y modificación: `teachers.write`
- Baja de docentes (`DELETE`): `teachers.manage`
- La baja de asignaciones usa `teachers.write`.

Los listados responden `{ data, filtros, paginacion }`; los recursos simples, `{ data }`.
Las operaciones protegidas responden 401 sin token y 403 sin permisos.

## Cuenta de acceso

Una persona con rol Docente tiene una cuenta (`usuarios`) y un registro docente
ligados por `userId` (`docente-cuenta.service.mjs`):

- Al crear un perfil con rol Docente (`POST /api/v1/users`) se crea su registro
  docente, o se reusa el que ya existía sin cuenta si DNI, correo, nombre y
  apellido son de la misma persona; si no coinciden, responde 409 y no pisa datos.
- Editar el docente actualiza la cuenta y viceversa; correo y DNI no pueden
  chocar con otra cuenta ni con otro docente (409).
- La baja (`DELETE`, o `estado: "inactivo"`) desactiva la cuenta y cierra sus
  sesiones: el docente deja de poder ingresar al Portal Docente. Nadie puede
  darse de baja a sí mismo (403).
- Quitarle el rol Docente a la cuenta deja inactivo el registro docente.
