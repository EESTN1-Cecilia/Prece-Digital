# Students

Modulo para estudiantes, contactos responsables, trayectoria academica, pases y datos de legajo.

## Gestion de alumnos (CRUD)

Operaciones sobre el legajo de alumnos (`Backend/modules/students/student.*`), protegidas
con `verifyToken` + `authorize`. Requieren `students.read` para lectura y `students.write`
para crear, modificar o desactivar; el cliente nunca decide los permisos.

| Operación | Método y ruta | Permiso |
| --- | --- | --- |
| Crear alumno | `POST /api/v1/students` | `students.write` |
| Consultar por id | `GET /api/v1/students/:studentId` | `students.read` |
| Listar / buscar | `GET /api/v1/students` | `students.read` |
| Modificar | `PATCH /api/v1/students/:studentId` | `students.write` |
| Desactivar | `DELETE /api/v1/students/:studentId` | `students.write` |

### Datos del alumno

`nombre`, `apellido`, `dni` (obligatorios); `fechaNacimiento`, `genero`, `nacionalidad`,
`provincia`, `localidad`, `codigoPostal`, `direccion`, `email`, `telefono`, `contacto`
(responsable/tutor: nombre, apellido, parentesco, telefono, email), `curso`, `division`,
`condicion` (regular/irregular), `estado` (activo/inactivo), `fechaAlta`, `fechaBaja`.

- La edad **no se almacena**: se calcula desde `fechaNacimiento` en cada respuesta.
- `turno` y `orientacion` se derivan del catálogo de la escuela (`catalogo.mjs`, espejo de
  `anios_divisiones` en schema.sql) a partir de `curso` + `division`. Si el cliente los
  enviara igualmente, el backend los ignora/deriva: el turno de la división manda.

### Búsqueda y filtros

`GET /api/v1/students` acepta, combinables entre sí:

- `dni` (exacto), `apellido` y `nombre` (búsqueda parcial, case-insensitive).
- `curso`, `division`, `condicion`, `estado` (`activo` por defecto; `inactivo` o `todos`).
- `edad` (calculada desde `fechaNacimiento`).
- `orden` (`apellido`, `apellido_desc`, `nombre`, `nombre_desc`, `dni`, `dni_desc`,
  `curso`, `curso_desc`).
- Paginación: `pagina` (default 1) y `porPagina` (default 20, máximo 100).

Respuesta:

```json
{
  "data": [ ... ],
  "filtros": { "dni": null, "apellido": "lop", "orden": "apellido" },
  "paginacion": {
    "total": 2, "pagina": 1, "porPagina": 20, "totalPaginas": 1,
    "tieneAnterior": false, "tieneSiguiente": false
  }
}
```

Todos los parámetros se validan en el backend; valores inválidos devuelven `422` sin tocar
el almacenamiento.

### Validaciones y consistencia

- Campos obligatorios y formatos: DNI numérico de 7 a 9 dígitos, email y teléfono con
  formato, fecha de nacimiento válida y no futura, condición regular/irregular.
- DNI único: un segundo alumno con el mismo DNI devuelve `409 Conflict`.
- Curso y división se validan juntos y deben existir en el catálogo de la escuela
  (`422` en caso contrario).
- En la modificación solo se aceptan los campos del legajo; el resto se ignora (sanitizado).
- Los parámetros de búsqueda/ordenamiento están en listas permitidas: no permiten ejecutar
  consultas arbitrarias.

### Baja lógica

`DELETE` desactiva el alumno (`estado: inactivo`, se fija `fechaBaja`). El registro y su
historial académico se conservan: nunca se elimina físicamente. Los alumnos inactivos se
excluyen de los listados por defecto y siguen siendo consultables por su identificador.

### Auditoría

Las operaciones sensibles (crear, modificar, desactivar) quedan registradas con actor,
acción, valor anterior y nuevo en `store.studentsAudit` (via `studentRepository.registrarAuditoria`).
Es una traza local del módulo, preparada para integrarse a la auditoría transversal del
backend cuando esté disponible.