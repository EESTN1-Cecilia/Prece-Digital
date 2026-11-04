/* Calculos del resumen de jefatura: talleres (cronograma) y alumnos (API),
   siempre separados en Ciclo Basico (1° a 3°) y Ciclo Superior (4° a 7°). */

import { CRONOGRAMA, cicloDeAnio } from "./talleres-cronograma.js";

export const ANIOS = [1, 2, 3, 4, 5, 6, 7];

/* Por anio: grupos de taller, sesiones semanales, cupo (suma del cupo de cada
   grupo segun la planilla) y docentes distintos. */
export function resumenTalleresPorAnio(cronograma = CRONOGRAMA) {
  return ANIOS.map((anio) => {
    const filas = cronograma.filter((fila) => fila.anio === anio);
    const cupoPorGrupo = new Map();
    for (const fila of filas) {
      cupoPorGrupo.set(fila.grupo, Math.max(cupoPorGrupo.get(fila.grupo) ?? 0, fila.alumnos ?? 0));
    }

    return {
      anio,
      ciclo: cicloDeAnio(anio),
      grupos: cupoPorGrupo.size,
      sesiones: filas.length,
      cupo: [...cupoPorGrupo.values()].reduce((suma, cupo) => suma + cupo, 0),
      docentes: new Set(filas.map((fila) => fila.docente).filter(Boolean)).size
    };
  });
}

/* Divisiones de Tecnico en Programacion (4° a 7°), segun el catalogo de la
   escuela. Se usa solo si la API no informa la orientacion del curso. */
const PROGRAMACION = new Set(["4-3", "4-4", "5-3", "5-4", "6-3", "6-4", "7-2", "7-3", "7-4"]);

/* "basico" (1° a 3°), "programacion" o "informatica" (4° a 7°). */
export function categoriaDeDivision(division) {
  const anio = Number(division.anio);
  if (anio <= 3) return "basico";

  const orientacion = String(division.orientacion ?? "");
  if (/program/i.test(orientacion)) return "programacion";
  if (/inform/i.test(orientacion)) return "informatica";
  return PROGRAMACION.has(`${anio}-${division.division}`) ? "programacion" : "informatica";
}

/* Alumnos y cursos por anio, a partir del catalogo de divisiones de la API.
   Ademas del total reparte los alumnos entre basico / programacion / informatica. */
export function resumenAlumnosPorAnio(divisiones = []) {
  return ANIOS.map((anio) => {
    const propias = divisiones.filter((division) => Number(division.anio) === anio);
    const reparto = { basico: 0, programacion: 0, informatica: 0 };
    for (const division of propias) {
      reparto[categoriaDeDivision(division)] += division.cantidad ?? 0;
    }

    return {
      anio,
      ciclo: cicloDeAnio(anio),
      cursos: propias.length,
      alumnos: propias.reduce((suma, division) => suma + (division.cantidad ?? 0), 0),
      activos: propias.reduce((suma, division) => suma + (division.activos ?? 0), 0),
      ...reparto
    };
  });
}

/* Total de alumnos de la escuela repartido en las tres categorias del grafico. */
export function alumnosPorCategoria(filas) {
  return filas.reduce(
    (total, fila) => ({
      basico: total.basico + fila.basico,
      programacion: total.programacion + fila.programacion,
      informatica: total.informatica + fila.informatica
    }),
    { basico: 0, programacion: 0, informatica: 0 }
  );
}

export function totalesPorCiclo(filas, campo) {
  return filas.reduce(
    (totales, fila) => ({ ...totales, [fila.ciclo]: totales[fila.ciclo] + (fila[campo] ?? 0) }),
    { basico: 0, superior: 0 }
  );
}

/* Sesiones semanales por tipo de taller, con el reparto entre ciclos. */
export function talleresPorTipo(cronograma = CRONOGRAMA) {
  const tipos = new Map();
  for (const fila of cronograma) {
    const actual = tipos.get(fila.taller) ?? { taller: fila.taller, basico: 0, superior: 0 };
    actual[cicloDeAnio(fila.anio)] += 1;
    tipos.set(fila.taller, actual);
  }

  return [...tipos.values()]
    .map((tipo) => ({ ...tipo, total: tipo.basico + tipo.superior }))
    .sort((a, b) => b.total - a.total || a.taller.localeCompare(b.taller, "es"));
}
