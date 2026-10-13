# Libro Matriz digital

Módulo del Libro Matriz digital: registra el Libro Matriz de cada alumno (número de libro, número de folio, fecha de registro y datos administrativos adicionales), permite consultarlo y actualizarlo, y conserva el historial de modificaciones con quién y cuándo. Por ser información administrativa, el acceso está restringido por permisos.

## Modelo

- Registro: `alumnoId` + `numeroLibro` + `numeroFolio` + `fechaRegistro` + `estado` + `datosAdicionales`.
- El `alumno` y el `dni` salen de `students.repository` (única fuente de alumnos); se exponen como texto (`"Apellido, Nombre"` y DNI en string).
- `escuelaId` se toma del padrón del alumno; el cliente no puede elegir la escuela.
- Un alumno tiene a lo sumo un registro de Libro Matriz.
- La combinación `numeroLibro` + `numeroFolio` es única en toda la institución: no se permite el mismo libro y folio para alumnos distintos ni registros duplicados.
- Número de libro y de folio: letras, números, espacios, puntos, barras, guiones y guiones bajos, hasta 30 caracteres.
- Estados centralizados en `catalogo.mjs` (`ESTADOS_REGISTRO`): `activo` y `archivado`.
- `datosAdicionales` es un objeto de campos administrativos (texto, número, booleano o nulo), hasta 20 campos; se sanitiza cada nombre y valor.
- La fecha de registro es obligatoria con formato `AAAA-MM-DD` y no puede ser futura.
- El responsable de cada operación es siempre el usuario autenticado: el cliente no puede elegir ni falsificar el usuario responsable.
- No hay borrado físico: `archivado` da de baja lógica y el registro se conserva completo (con su historial) para consulta administrativa.
- Historial inmutable: cada modificación conserva el estado anterior en `historial` y actualiza `actualizadoEn`/`actualizadoPor`. Cada operación queda auditada en `registrarAuditoria` del módulo, además de la auditoría transversal del request.

## Endpoints

- GET /api/v1/book-registry/catalogos — estados permitidos, órdenes y límites
- GET /api/v1/book-registry — buscar con filtros (alumnoId, numeroLibro, numeroFolio, estado, q, desde, hasta), orden y paginación
- GET /api/v1/book-registry/:registryId — ver un registro
- GET /api/v1/book-registry/:registryId/historial — historial de modificaciones del registro
- PATCH /api/v1/book-registry/:registryId — actualizar (numeroLibro, numeroFolio, fechaRegistro, estado, datosAdicionales) conservando el historial
- GET /api/v1/students/:studentId/book-registry — consultar el Libro Matriz del alumno (404 si no tiene)
- GET /api/v1/students/:studentId/book-registry/exists — verificar si el alumno tiene Libro Matriz
- POST /api/v1/students/:studentId/book-registry — registrar el Libro Matriz del alumno
- GET /api/v1/alumnos/:alumnoId/libro-matriz — consultar el Libro Matriz del alumno

## Permisos

- GET: BOOK_REGISTRY_READ (`book-registry.read`)
- POST/PATCH: BOOK_REGISTRY_WRITE (`book-registry.write`)

Secretaría registra y actualiza; preceptoría y docentes solo consultan. Los listados responden `{ data, filtros, paginacion }`. Las operaciones protegidas responden 401 sin token y 403 sin permisos.
