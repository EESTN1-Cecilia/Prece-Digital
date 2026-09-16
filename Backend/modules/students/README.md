# Students

Modulo de listados de alumnos por curso, division, grupo y taller.

## Arquitectura

- **Alumnos (datos personales)**: MySQL (`estudiantes`, `anios_divisiones`, `orientaciones`, `ciclos_lectivos`).
- **Cursos y divisiones**: MySQL (`anios_divisiones`, `ciclos_lectivos`).
- **Grupos**: modulo in-memory `groups` (prefijo `grp_`).
- **Talleres**: modulo in-memory `workshops` (prefijo `wrk_`).

Los listados por **grupo** y **taller** resuelven los miembros del grupo/taller en memoria
y luego buscan los datos personales del alumno en MySQL via `listarPorIds`.

## Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/v1/students/listas/curso` | Alumnos de un curso (1-7) |
| GET | `/api/v1/students/listas/division` | Alumnos de una division especifica |
| GET | `/api/v1/students/listas/grupo` | Alumnos de un grupo in-memory |
| GET | `/api/v1/students/listas/taller` | Alumnos de un taller in-memory |

Todos requieren `verifyToken` + `STUDENTS_READ`.

### Parametros comunes

| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| `soloActivos` | boolean | Solo alumnos activos |
| `condicion` | string | `regular` o `irregular` |
| `periodo` | number | Anio del ciclo lectivo (ej: 2026) |
| `orden` | string | `apellido`, `nombre`, `dni` (+ `_desc`) |
| `pagina` | number | Pagina (default: 1) |
| `porPagina` | number | Items por pagina (default: 20, max: 100) |

### Parametros especificos

- **Curso**: `anioCurso` (1-7, obligatorio)
- **Division**: `anioDivisionId` (id numerico, obligatorio)
- **Grupo**: `groupId` (id string `grp_*`, obligatorio)
- **Taller**: `workshopId` (id string `wrk_*`, obligatorio)

## Formato de respuesta

```json
{
  "data": [
    {
      "id": "1",
      "nombre": "Ana",
      "apellido": "Garcia",
      "dni": "11111111",
      "curso": 4,
      "division": "1",
      "grupo": { "id": "grp_xxx", "nombre": "Grupo A" },
      "taller": { "id": "wrk_xxx", "nombre": "Taller Mecanica" },
      "estado": "activo",
      "condicion": "regular"
    }
  ],
  "contexto": {
    "tipo": "curso",
    "curso": { "anio": 4 },
    "division": null,
    "grupo": null,
    "taller": null,
    "periodoAcademico": 2026,
    "fechaConsulta": "2026-09-16T12:00:00.000Z"
  },
  "filtros": { "soloActivos": true, "orden": "apellido", "pagina": 1, "porPagina": 20 },
  "paginacion": { "total": 45, "pagina": 1, "porPagina": 20, "totalPaginas": 3 }
}
```

## Migraciones

- `001_listados_alumnos.sql`: columna `condicion` en `estudiantes`, tabla `inscripciones_taller`.
