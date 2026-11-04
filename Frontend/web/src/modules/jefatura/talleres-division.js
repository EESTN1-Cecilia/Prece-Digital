/* Division de la lista de un curso en dos grupos de taller.

   Funciones puras (sin React ni API) para poder probarlas aparte. Un "grupo"
   es "A" (primer grupo de taller del curso, ej. 1.1) o "B" (segundo, ej. 1.3).
   La asignacion es un objeto { [alumnoId]: "A" | "B" }. */

const COLLATOR = new Intl.Collator("es", { sensitivity: "base" });

export const GRUPOS = ["A", "B"];

/* F, M o X (sin dato / otro). Acepta "Femenino", "F", "Mujer", "Masculino", "Varon"... */
export function generoDe(genero) {
  const texto = String(genero ?? "").trim().toLowerCase();
  if (/^(f|fem|mujer)/.test(texto)) return "F";
  if (/^(m|masc|var|hombre)/.test(texto)) return "M";
  return "X";
}

/* Lista del curso ordenada por apellido y nombre: es el orden sobre el que se corta. */
export function ordenarAlumnos(alumnos) {
  return [...alumnos].sort(
    (a, b) => COLLATOR.compare(a.apellido ?? "", b.apellido ?? "") || COLLATOR.compare(a.nombre ?? "", b.nombre ?? "")
  );
}

export function cortePorMitad(cantidad) {
  return Math.ceil(cantidad / 2);
}

/* Reparte cada genero por separado, alternando entre A y B, y arranca cada
   genero por el grupo que va con menos alumnos. Resultado: grupos que difieren
   en a lo sumo 1 alumno en total y en a lo sumo 1 por genero. */
export function dividirEquilibrado(alumnos) {
  const ordenados = ordenarAlumnos(alumnos);
  const asignacion = {};
  const total = { A: 0, B: 0 };

  for (const genero of ["F", "M", "X"]) {
    let siguiente = total.A <= total.B ? "A" : "B";
    for (const alumno of ordenados.filter((item) => generoDe(item.genero) === genero)) {
      asignacion[alumno.id] = siguiente;
      total[siguiente] += 1;
      siguiente = siguiente === "A" ? "B" : "A";
    }
  }

  return asignacion;
}

/* Corte en un punto de la lista: los primeros `corte` alumnos van al grupo A y el resto al B. */
export function dividirPorCorte(alumnos, corte) {
  const limite = Math.max(0, Math.min(alumnos.length, Number(corte) || 0));
  const asignacion = {};
  ordenarAlumnos(alumnos).forEach((alumno, indice) => {
    asignacion[alumno.id] = indice < limite ? "A" : "B";
  });
  return asignacion;
}

/* Pasa a `grupo` a todos los alumnos entre dos posiciones de la lista (inclusive,
   en cualquier orden): "desde un punto hasta otro punto". */
export function asignarRango(asignacion, alumnos, desde, hasta, grupo) {
  if (!GRUPOS.includes(grupo)) return asignacion;
  const ordenados = ordenarAlumnos(alumnos);
  const inicio = Math.max(0, Math.min(desde, hasta));
  const fin = Math.min(ordenados.length - 1, Math.max(desde, hasta));
  const siguiente = { ...asignacion };
  for (let indice = inicio; indice <= fin; indice += 1) {
    siguiente[ordenados[indice].id] = grupo;
  }
  return siguiente;
}

export function alternarGrupo(asignacion, alumnoId) {
  return { ...asignacion, [alumnoId]: asignacion[alumnoId] === "A" ? "B" : "A" };
}

/* Asignacion final: la base segun el modo ("equilibrado" | "corte") y encima los
   cambios manuales de la jefatura. Un alumno nuevo en la lista cae en la base. */
export function construirAsignacion({ alumnos, modo = "equilibrado", corte, manual = {} }) {
  const base =
    modo === "corte"
      ? dividirPorCorte(alumnos, corte ?? cortePorMitad(alumnos.length))
      : dividirEquilibrado(alumnos);
  const ids = new Set(alumnos.map((alumno) => alumno.id));
  const resultado = { ...base };
  for (const [id, grupo] of Object.entries(manual)) {
    if (ids.has(id) && GRUPOS.includes(grupo)) resultado[id] = grupo;
  }
  return resultado;
}

/* { A: { total, F, M, X }, B: { ... } } */
export function resumirGrupos(alumnos, asignacion) {
  const resumen = {
    A: { total: 0, F: 0, M: 0, X: 0 },
    B: { total: 0, F: 0, M: 0, X: 0 }
  };
  for (const alumno of alumnos) {
    const grupo = asignacion[alumno.id] === "B" ? "B" : "A";
    resumen[grupo].total += 1;
    resumen[grupo][generoDe(alumno.genero)] += 1;
  }
  return resumen;
}
