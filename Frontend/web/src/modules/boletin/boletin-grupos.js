import { anioDelAlumno, planDelAnio } from "./boletin-oficial-datos.js";

/* Agrupa las materias del boletin como el formulario oficial: primero
   FORMACIÓN GENERAL y despues el taller (TCO. ESPECÍFICA en el ciclo basico,
   FORMACIÓN TÉCNICA ESPECÍFICA en el superior). Se decide por el plan de
   estudios del año del alumno; una materia que no figura en el plan queda en
   FORMACIÓN GENERAL. Devuelve [{ titulo, materias }] sin grupos vacios. */

const normalizar = (texto) =>
  String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

const normalizarRaiz = (texto) =>
  normalizar(texto)
    .replace(/\b(CICLO SUPERIOR|I|II|III|IV|V|VI|VII)\b/g, "")
    .replace(/\bMATEMATICAS\b/g, "MATEMATICA")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

function masReciente(rA, rB) {
  if (!rA) return rB ?? null;
  if (!rB) return rA ?? null;
  return String(rB.fecha ?? "") >= String(rA.fecha ?? "") ? rB : rA;
}

function completarResultadoFinal(materia) {
  const c1 = materia.periodos?.c1?.resultado ?? null;
  const c2 = materia.periodos?.c2?.resultado ?? null;
  const fin = materia.periodos?.final?.resultado ?? null;
  if (fin) return materia;

  const n1 = typeof c1?.nota === "number" ? c1.nota : parseFloat(String(c1?.valor ?? "").replace(",", "."));
  const n2 = typeof c2?.nota === "number" ? c2.nota : parseFloat(String(c2?.valor ?? "").replace(",", "."));
  if (Number.isNaN(n1) || Number.isNaN(n2)) return materia;

  const prom = Math.round(((n1 + n2) / 2) * 100) / 100;
  const estado = prom >= 7 ? "aprobada" : prom >= 6 ? "regular" : "debajo_de_6";
  const resultadoFinal = {
    valor: String(prom),
    nota: prom,
    estado,
    tipoEvaluacion: "promedio_anual",
    fecha: c2?.fecha || c1?.fecha || ""
  };

  return {
    ...materia,
    periodos: {
      ...materia.periodos,
      final: { ...(materia.periodos?.final ?? {}), resultado: resultadoFinal }
    }
  };
}

function unificarMateriasAlias(materias, planNombres) {
  const porRaiz = new Map();
  for (const m of materias) {
    const raiz = normalizarRaiz(m.materia) || m.materiaId;
    if (!porRaiz.has(raiz)) {
      porRaiz.set(raiz, m);
      continue;
    }
    const previa = porRaiz.get(raiz);
    const nombreEnPlan = planNombres.has(normalizar(m.materia)) ? m.materia : previa.materia;
    const c1 = masReciente(previa.periodos?.c1?.resultado, m.periodos?.c1?.resultado);
    const c2 = masReciente(previa.periodos?.c2?.resultado, m.periodos?.c2?.resultado);
    const fin = masReciente(previa.periodos?.final?.resultado, m.periodos?.final?.resultado);
    const ultimaFechaPrevia = Math.max(
      ...[previa.periodos?.c1?.resultado?.fecha, previa.periodos?.c2?.resultado?.fecha, previa.periodos?.final?.resultado?.fecha]
        .filter(Boolean)
        .map((f) => Date.parse(f) || 0),
      0
    );
    const ultimaFechaNueva = Math.max(
      ...[m.periodos?.c1?.resultado?.fecha, m.periodos?.c2?.resultado?.fecha, m.periodos?.final?.resultado?.fecha]
        .filter(Boolean)
        .map((f) => Date.parse(f) || 0),
      0
    );
    const base = ultimaFechaNueva >= ultimaFechaPrevia ? m : previa;
    porRaiz.set(raiz, {
      ...base,
      materia: nombreEnPlan,
      docente: base.docente || previa.docente || m.docente,
      periodos: {
        c1: { ...(base.periodos?.c1 ?? {}), resultado: c1 },
        c2: { ...(base.periodos?.c2 ?? {}), resultado: c2 },
        final: { ...(base.periodos?.final ?? {}), resultado: fin }
      }
    });
  }
  return [...porRaiz.values()].map(completarResultadoFinal);
}

export const COLOR_SECCION = [0.361, 0.071, 0.11]; // #5c121c, el mismo rojo del boletin oficial
export const COLOR_SECCION_CSS = "#5c121c";

export function agruparMaterias(datos) {
  const anio = anioDelAlumno({ curso: String(datos.alumno?.cursoDivision ?? "") });
  const plan = planDelAnio(anio, datos.alumno?.orientacion);
  const planNombres = new Set([...plan.general, ...plan.taller].map(normalizar));
  const materias = unificarMateriasAlias(datos.materias ?? [], planNombres);
  const taller = new Set(plan.taller.map(normalizar));

  const tecnicas = materias.filter((m) => taller.has(normalizar(m.materia)));
  const generales = materias.filter((m) => !taller.has(normalizar(m.materia)));

  return [
    { titulo: "FORMACIÓN GENERAL", materias: generales },
    { titulo: plan.tituloTaller, materias: tecnicas }
  ].filter((grupo) => grupo.materias.length > 0);
}
