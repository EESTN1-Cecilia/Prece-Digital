/* Cursos reales a cargo de un docente, a partir de las asignaciones de su sesion.

   El backend copia cada catedra de la grilla de Direccion a una asignacion
   { role: "docente", anio, division, materia, catedraId } (catedras.service.mjs).
   La asignacion base del rol ({ role: "docente" } sin curso) NO es un curso: se
   descarta. Nunca se inventan cursos ni materias: sin asignaciones, lista vacia. */

const soloDigitos = (valor) => String(valor ?? "").replace(/\D/g, "");

export function cursosAsignadosDelDocente(user) {
  const vistos = new Map();

  for (const asignacion of user?.assignments ?? []) {
    if (asignacion?.role !== "docente") continue;
    const anio = soloDigitos(asignacion.anio ?? asignacion.curso);
    const division = soloDigitos(asignacion.division ?? asignacion.numDivision);
    if (!anio || !division) continue;

    const materia = String(asignacion.materia ?? "").trim() || null;
    const clave = `${anio}-${division}|${(materia ?? "").toLowerCase()}`;
    if (vistos.has(clave)) continue;

    vistos.set(clave, {
      id: `${anio}-${division}`,
      anio: Number(anio),
      curso: `${anio}°`,
      division,
      materia,
      grupoTaller: asignacion.grupoTaller ?? null,
      catedraId: asignacion.catedraId ?? null,
      turno: asignacion.turno ?? null
    });
  }

  return [...vistos.values()].sort((a, b) => a.anio - b.anio || Number(a.division) - Number(b.division) || String(a.materia ?? "").localeCompare(String(b.materia ?? "")));
}
