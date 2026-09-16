import { getDatabasePool } from "../../database/client.mjs";

/* Consultas SQL parametrizadas para listados de alumnos.
   Los listados por grupo y taller resuelven miembros via modulos
   in-memory (Groups / Workshops) y luego buscan los datos personales
   del alumno en MySQL con listarPorIds. */

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

/* ------------------------------------------------------------------
   Helpers de construccion dinamica de WHERE / params
   ------------------------------------------------------------------ */

function agregarFiltros(condiciones, params, filtros) {
  if (filtros.soloActivos) {
    condiciones.push("e.activo = 1");
  }

  if (filtros.condicion) {
    condiciones.push("e.condicion = ?");
    params.push(filtros.condicion);
  }

  if (filtros.periodo) {
    condiciones.push("cl.anio = ?");
    params.push(filtros.periodo);
  }
}

/* ------------------------------------------------------------------
   Contexto (para la respuesta uniforme)
   ------------------------------------------------------------------ */

export async function contextoCursoEscuela(escuelaId, anioCurso, periodo) {
  const databasePool = getDatabasePool();
  const condiciones = ["ad.escuela_id = ?", "ad.anio_curso = ?"];
  const params = [escuelaId, anioCurso];

  if (periodo) {
    condiciones.push("cl.anio = ?");
    params.push(periodo);
  }

  const [filas] = await databasePool.query(
    `SELECT ad.anio_curso, cl.anio AS periodo, cl.id AS ciclo_lectivo_id
       FROM anios_divisiones ad
       JOIN ciclos_lectivos cl ON cl.id = ad.ciclo_lectivo_id
      WHERE ${condiciones.join(" AND ")}
      GROUP BY ad.anio_curso, cl.anio, cl.id
      ORDER BY cl.anio DESC
      LIMIT 1`,
    params
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

/* ------------------------------------------------------------------
   Listados por curso (anio) y por division — MySQL
   ------------------------------------------------------------------ */

export async function listarPorCurso({ escuelaId, anioCurso, soloActivos, condicion, periodo, orden, limite, offset }) {
  const databasePool = getDatabasePool();
  const condiciones = ["e.escuela_id = ?", "ad.anio_curso = ?"];
  const params = [escuelaId, anioCurso];

  agregarFiltros(condiciones, params, { soloActivos, condicion, periodo });

  const [filas] = await databasePool.query(
    `SELECT ${CAMPOS_ALUMNO}
     ${joinsBase()}
     WHERE ${condiciones.join(" AND ")}
     ORDER BY ${ordenSql(orden)}
     LIMIT ? OFFSET ?`,
    [...params, limite, offset]
  );

  return filas;
}

export async function totalPorCurso({ escuelaId, anioCurso, soloActivos, condicion, periodo }) {
  const databasePool = getDatabasePool();
  const condiciones = ["e.escuela_id = ?", "ad.anio_curso = ?"];
  const params = [escuelaId, anioCurso];

  agregarFiltros(condiciones, params, { soloActivos, condicion, periodo });

  const [filas] = await databasePool.query(
    `SELECT COUNT(*) AS total
     ${joinsBase()}
     WHERE ${condiciones.join(" AND ")}`,
    params
  );

  return filas[0].total;
}

export async function listarPorDivision({ escuelaId, anioDivisionId, soloActivos, condicion, periodo, orden, limite, offset }) {
  const databasePool = getDatabasePool();
  const condiciones = ["e.escuela_id = ?", "ad.id = ?"];
  const params = [escuelaId, anioDivisionId];

  agregarFiltros(condiciones, params, { soloActivos, condicion, periodo });

  const [filas] = await databasePool.query(
    `SELECT ${CAMPOS_ALUMNO}
     ${joinsBase()}
     WHERE ${condiciones.join(" AND ")}
     ORDER BY ${ordenSql(orden)}
     LIMIT ? OFFSET ?`,
    [...params, limite, offset]
  );

  return filas;
}

export async function totalPorDivision({ escuelaId, anioDivisionId, soloActivos, condicion, periodo }) {
  const databasePool = getDatabasePool();
  const condiciones = ["e.escuela_id = ?", "ad.id = ?"];
  const params = [escuelaId, anioDivisionId];

  agregarFiltros(condiciones, params, { soloActivos, condicion, periodo });

  const [filas] = await databasePool.query(
    `SELECT COUNT(*) AS total
     ${joinsBase()}
     WHERE ${condiciones.join(" AND ")}`,
    params
  );

  return filas[0].total;
}

/* ------------------------------------------------------------------
   Listados por IDs (puente con modulos in-memory)
   ------------------------------------------------------------------ */

export async function listarPorIds({ escuelaId, ids, soloActivos, condicion, orden, limite, offset }) {
  if (!ids.length) return [];

  const databasePool = getDatabasePool();
  const placeholders = ids.map(() => "?").join(",");
  const condiciones = ["e.escuela_id = ?", `e.id IN (${placeholders})`];
  const params = [escuelaId, ...ids];

  agregarFiltros(condiciones, params, { soloActivos, condicion });

  const [filas] = await databasePool.query(
    `SELECT ${CAMPOS_ALUMNO}
     ${joinsBase()}
     WHERE ${condiciones.join(" AND ")}
     ORDER BY ${ordenSql(orden)}
     LIMIT ? OFFSET ?`,
    [...params, limite, offset]
  );

  return filas;
}

export async function totalPorIds({ escuelaId, ids, soloActivos, condicion }) {
  if (!ids.length) return 0;

  const databasePool = getDatabasePool();
  const placeholders = ids.map(() => "?").join(",");
  const condiciones = ["e.escuela_id = ?", `e.id IN (${placeholders})`];
  const params = [escuelaId, ...ids];

  agregarFiltros(condiciones, params, { soloActivos, condicion });

  const [filas] = await databasePool.query(
    `SELECT COUNT(*) AS total
     ${joinsBase()}
     WHERE ${condiciones.join(" AND ")}`,
    params
  );

  return filas[0].total;
}
