# Cursos y divisiones

Módulo de estructura académica: ciclos, orientaciones, cursos, divisiones y consultas de alumnos, materias, docentes y horarios.

## Modelo

- Ciclo: primer ciclo (1ro-3ro, sin orientación) o segundo ciclo (4to-7mo, con orientación).
- Orientación: solamente asignable a cursos del segundo ciclo y debe estar activa.
- Curso: anio + turno (+ orientación cuando corresponde), pertenece a un único ciclo y escuela; único por `(escuelaId, anio, turno, orientacionId)`.
- División: pertenece a un único curso y hereda el turno de ese curso (el turno no se recibe ni se almacena en la división).

## Endpoints

- Ciclos: POST/GET /api/v1/ciclos, GET/PATCH/DELETE /api/v1/ciclos/:cicloId
- Orientaciones: POST/GET /api/v1/orientaciones, GET/PATCH/DELETE /api/v1/orientaciones/:orientacionId
- Cursos: POST/GET /api/v1/cursos, GET/PATCH/DELETE /api/v1/cursos/:cursoId
- Divisiones de un curso: GET /api/v1/cursos/:cursoId/divisiones
- Divisiones: POST/GET /api/v1/divisiones, GET/PATCH/DELETE /api/v1/divisiones/:divisionId
- Consultas: /api/v1/cursos/:cursoId/alumnos|materias|docentes|horarios y
  /api/v1/divisiones/:divisionId/alumnos|materias|docentes|horarios

## Permisos

- GET: ACADEMICS_READ
- POST/PATCH: ACADEMICS_WRITE
- DELETE: ACADEMICS_MANAGE

Los listados responden `{ data, filtros, paginacion }` con paginación completa y filtros por estado, anio, turno, ciclo y orientación. Estados: activo, inactivo, cerrado.