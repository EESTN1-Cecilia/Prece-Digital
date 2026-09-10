import { getDatabasePool } from "../../database/client.mjs";

/* Consultas SQL parametrizadas para listados de alumnos.
   Toda la logica de negocio y validaciones vive en el service. */

const CAMPOS_ALUMNO = `
  e.id AS alumno_id,
  e.nombre,
  e.apellido,
  e.dni,
  e.condicion,
  e.activo AS alumno_activo,
  ad.id AS anio_division_id,
  ad.anio_curso,
  ad.division,
  ad.turno_aula,
  ad.turno_taller,
  o.nombre AS orientacion,
  cl.id AS ciclo_lectivo_id,
  cl.anio AS periodo,
  e.escuela_id
`;

function joinsBase() {
  return `
    FROM estudiantes e
    JOIN anios_divisiones ad ON ad.id = e.anio_division_id
    LEFT JOIN orientaciones o ON o.id = ad.orientacion_id
    JOIN ciclos_lectivos cl ON cl.id = ad.ciclo_lectivo_id
  `;
}

/* Ordenamientos permitidos: mapas de "como viene del frontend" a SQL seguro.
   Nunca se interpola el valor directamente. */
const ORDEN_POR = {
  apellido: "e.apellido, e.nombre",
  apellido_desc: "e.apellido DESC, e.nombre DESC",
  nombre: "e.nombre, e.apellido",
  nombre_desc: "e.nombre DESC, e.apellido DESC",
  dni: "e.dni",
  dni_desc: "e.dni DESC",
  curso: "ad.anio_curso, ad.division, e.apellido",
  curso_desc: "ad.anio_curso DESC, ad.division DESC, e.apellido DESC"
};

export function ordenValido(orden) {
  return Boolean(ORDEN_POR[orden]);
}

export function ordenSql(orden) {
  return ORDEN_POR[orden] ?? ORDEN_POR.apellido;
}

/* Filtros por curso/division/grupo/taller con contexto asociado. */
export async function contextoCursoEscuela(escuelaId, anioCurso) {
  const databasePool = getDatabasePool();
  const [filas] = await databasePool.query(
    `SELECT ad.anio_curso, cl.anio AS periodo, cl.id AS ciclo_lectivo_id
       FROM anios_divisiones ad
       JOIN ciclos_lectivos cl ON cl.id = ad.ciclo_lectivo_id
      WHERE ad.escuela_id = ? AND ad.anio_curso = ?
      GROUP BY ad.anio_curso, cl.anio, cl.id
      ORDER BY cl.anio DESC
      LIMIT 1`,
    [escuelaId, anioCurso]
  );

  return filas[0] ?? null;
}

export async function contextoDivision(escuelaId, anioDivisionId) {
  const databasePool = getDatabasePool();
  const [filas] = await databasePool.query(
    `SELECT ad.anio_curso, ad.division, ad.turno_aula, ad.turno_taller,
            o.nombre AS orientacion, cl.anio AS periodo, cl.id AS ciclo_lectivo_id
       FROM anios_divisiones ad
       LEFT JOIN orientaciones o ON o.id = ad.orientacion_id
       JOIN ciclos_lectivos cl ON cl.id = ad.ciclo_lectivo_id
      WHERE ad.id = ? AND ad.escuela_id = ?
      LIMIT 1`,
    [anioDivisionId, escuelaId]
  );

  return filas[0] ?? null;
}

export async function contextoGrupoTaller(escuelaId, grupoTallerId) {
  const databasePool = getDatabasePool();
  const [filas] = await databasePool.query(
    `SELECT gt.id AS grupo_taller_id, gt.nombre AS grupo_taller, gt.cupo_maximo,
            m.nombre AS taller, m.id AS materia_id,
            cl.anio AS periodo, cl.id AS ciclo_lectivo_id
       FROM grupos_taller gt
       LEFT JOIN materias m ON m.id = gt.materia_id
       JOIN ciclos_lectivos cl ON cl.id = gt.ciclo_lectivo_id
      WHERE gt.id = ? AND gt.escuela_id = ?
      LIMIT 1`,
    [grupoTallerId, escuelaId]
  );

  return filas[0] ?? null;
}

export async function contextoMateria(escuelaId, materiaId) {
  const databasePool = getDatabasePool();
  const [filas] = await databasePool.query(
    `SELECT id AS materia_id, nombre AS taller
       FROM materias
      WHERE id = ? AND escuela_id = ?
      LIMIT 1`,
    [materiaId, escuelaId]
  );

  return filas[0] ?? null;
}

/* Lista alumnos por curso (anio), con filtros y paginacion. */
export async function listarPorCurso({ escuelaId, anioCurso, soloActivos, orden, limite, offset }) {
  const databasePool = getDatabasePool();
  const condiciones = ["e.escuela_id = ?", "ad.anio_curso = ?"];

  if (soloActivos) {
    condiciones.push("e.activo = 1");
  }

  const [filas] = await databasePool.query(
    `SELECT ${CAMPOS_ALUMNO}
     ${joinsBase()}
     WHERE ${condiciones.join(" AND ")}
     ORDER BY ${ordenSql(orden)}
     LIMIT ? OFFSET ?`,
    [escuelaId, anioCurso, limite, offset]
  );

  return filas;
}

export async function totalPorCurso({ escuelaId, anioCurso, soloActivos }) {
  const databasePool = getDatabasePool();
  const condiciones = ["e.escuela_id = ?", "ad.anio_curso = ?"];

  if (soloActivos) {
    condiciones.push("e.activo = 1");
  }

  const [filas] = await databasePool.query(
    `SELECT COUNT(*) AS total
     ${joinsBase()}
     WHERE ${condiciones.join(" AND ")}`,
    [escuelaId, anioCurso]
  );

  return filas[0].total;
}

/* Lista alumnos por division (anio_division_id), con filtros y paginacion. */
export async function listarPorDivision({ escuelaId, anioDivisionId, soloActivos, orden, limite, offset }) {
  const databasePool = getDatabasePool();
  const condiciones = ["e.escuela_id = ?", "ad.id = ?"];

  if (soloActivos) {
    condiciones.push("e.activo = 1");
  }

  const [filas] = await databasePool.query(
    `SELECT ${CAMPOS_ALUMNO}
     ${joinsBase()}
     WHERE ${condiciones.join(" AND ")}
     ORDER BY ${ordenSql(orden)}
     LIMIT ? OFFSET ?`,
    [escuelaId, anioDivisionId, limite, offset]
  );

  return filas;
}

export async function totalPorDivision({ escuelaId, anioDivisionId, soloActivos }) {
  const databasePool = getDatabasePool();
  const condiciones = ["e.escuela_id = ?", "ad.id = ?"];

  if (soloActivos) {
    condiciones.push("e.activo = 1");
  }

  const [filas] = await databasePool.query(
    `SELECT COUNT(*) AS total
     ${joinsBase()}
     WHERE ${condiciones.join(" AND ")}`,
    [escuelaId, anioDivisionId]
  );

  return filas[0].total;
}

/* Lista alumnos por grupo_taller, con filtros y paginacion. */
export async function listarPorGrupoTaller({ escuelaId, grupoTallerId, soloActivos, orden, limite, offset }) {
  const databasePool = getDatabasePool();
  const condiciones = ["e.escuela_id = ?", "it.grupo_taller_id = ?", "it.activo = 1"];

  if (soloActivos) {
    condiciones.push("e.activo = 1");
  }

  const [filas] = await databasePool.query(
    `SELECT ${CAMPOS_ALUMNO}, it.grupo_taller_id, it.anio_division_id
     FROM inscripciones_taller it
     JOIN estudiantes e ON e.id = it.estudiante_id
     JOIN anios_divisiones ad ON ad.id = e.anio_division_id
     LEFT JOIN orientaciones o ON o.id = ad.orientacion_id
     JOIN ciclos_lectivos cl ON cl.id = ad.ciclo_lectivo_id
     WHERE ${condiciones.join(" AND ")}
     ORDER BY ${ordenSql(orden)}
     LIMIT ? OFFSET ?`,
    [escuelaId, grupoTallerId, limite, offset]
  );

  return filas;
}

export async function totalPorGrupoTaller({ escuelaId, grupoTallerId, soloActivos }) {
  const databasePool = getDatabasePool();
  const condiciones = ["e.escuela_id = ?", "it.grupo_taller_id = ?", "it.activo = 1"];

  if (soloActivos) {
    condiciones.push("e.activo = 1");
  }

  const [filas] = await databasePool.query(
    `SELECT COUNT(*) AS total
     FROM inscripciones_taller it
     JOIN estudiantes e ON e.id = it.estudiante_id
     JOIN anios_divisiones ad ON ad.id = e.anio_division_id
     JOIN ciclos_lectivos cl ON cl.id = ad.ciclo_lectivo_id
     WHERE ${condiciones.join(" AND ")}`,
    [escuelaId, grupoTallerId]
  );

  return filas[0].total;
}

/* Lista alumnos por taller (materia). */
export async function listarPorTaller({ escuelaId, materiaId, soloActivos, orden, limite, offset }) {
  const databasePool = getDatabasePool();
  const condiciones = ["e.escuela_id = ?", "gt.materia_id = ?", "it.activo = 1"];

  if (soloActivos) {
    condiciones.push("e.activo = 1");
  }

  const [filas] = await databasePool.query(
    `SELECT ${CAMPOS_ALUMNO}, m.nombre AS taller, m.id AS materia_id
     FROM inscripciones_taller it
     JOIN grupos_taller gt ON gt.id = it.grupo_taller_id
     JOIN materias m ON m.id = gt.materia_id
     JOIN estudiantes e ON e.id = it.estudiante_id
     JOIN anios_divisiones ad ON ad.id = e.anio_division_id
     LEFT JOIN orientaciones o ON o.id = ad.orientacion_id
     JOIN ciclos_lectivos cl ON cl.id = ad.ciclo_lectivo_id
     WHERE ${condiciones.join(" AND ")}
     ORDER BY ${ordenSql(orden)}
     LIMIT ? OFFSET ?`,
    [escuelaId, materiaId, limite, offset]
  );

  return filas;
}

export async function totalPorTaller({ escuelaId, materiaId, soloActivos }) {
  const databasePool = getDatabasePool();
  const condiciones = ["e.escuela_id = ?", "gt.materia_id = ?", "it.activo = 1"];

  if (soloActivos) {
    condiciones.push("e.activo = 1");
  }

  const [filas] = await databasePool.query(
    `SELECT COUNT(*) AS total
     FROM inscripciones_taller it
     JOIN grupos_taller gt ON gt.id = it.grupo_taller_id
     JOIN materias m ON m.id = gt.materia_id
     JOIN estudiantes e ON e.id = it.estudiante_id
     JOIN anios_divisiones ad ON ad.id = e.anio_division_id
     JOIN ciclos_lectivos cl ON cl.id = ad.ciclo_lectivo_id
     WHERE ${condiciones.join(" AND ")}`,
    [escuelaId, materiaId]
  );

  return filas[0].total;
}