/* Definicion unica de la planilla de calificaciones: columnas, grupos, textos y
   valores por alumno. La usan el PDF (planilla-pdf.js) y el Excel
   (planilla-xlsx.js) para que ambos muestren exactamente la misma estructura. */

export const INSTITUCION = {
  direccion: "DIRECCIÓN GENERAL DE CULTURA Y EDUCACIÓN · PROVINCIA DE BUENOS AIRES",
  escuela: "E.E.S.T. N.º 1 “Cecilia Berdichevski”"
};

export const tituloPlanilla = (anio) => `PLANILLA OFICIAL DE CALIFICACIONES ${anio}`;

/* Columnas academicas, en orden. `grupo` agrupa bajo un encabezado comun. */
export const COLUMNAS = [
  { id: "num", titulo: "Nº" },
  { id: "alumno", titulo: "APELLIDO Y NOMBRE" },
  { id: "parc1", titulo: "Parciales", grupo: "c1" },
  { id: "val1", titulo: "Val. prel.", grupo: "c1" },
  { id: "calif1", titulo: "Calif.", grupo: "c1", nota: true },
  { id: "inas1", titulo: "Inas.", grupo: "c1" },
  { id: "parc2", titulo: "Parciales", grupo: "c2" },
  { id: "val2", titulo: "Val. prel.", grupo: "c2" },
  { id: "calif2", titulo: "Calif.", grupo: "c2", nota: true },
  { id: "inas2", titulo: "Inas.", grupo: "c2" },
  { id: "dic", titulo: "Diciembre", grupo: "int" },
  { id: "feb", titulo: "Febrero", grupo: "int" },
  { id: "final", titulo: "CALIF. FINAL", nota: true }
];

export const GRUPOS = [
  { id: "c1", titulo: "1.º CUATRIMESTRE" },
  { id: "c2", titulo: "2.º CUATRIMESTRE" },
  { id: "int", titulo: "INTENSIFICACIÓN" }
];

export const FIRMAS = ["Firma del/de la profesor/a", "Firma del/de la preceptor/a", "Sello y firma de Dirección"];

/* Aprobacion POR CUATRIMESTRE: TEA o nota de 7 o mas = aprobado; el resto (TEP, TED
   o nota menor a 7) = desaprobado. Sin valoracion ni nota = sin calificar (todavia no
   se cargo nada: no cuenta como desaprobado). */
const aNumero = (v) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isNaN(n) ? null : n;
};

export function estadoCuatrimestre(valoracion, calificacion) {
  const v = String(valoracion ?? "").trim().toUpperCase();
  const n = aNumero(calificacion);
  if (v === "TEA" || (n !== null && n >= 7)) return "aprobado";
  if (v === "TEP" || v === "TED" || n !== null) return "desaprobado";
  return "sin_calificar";
}

export function calcularMetricas(estudiantes = []) {
  const cuatrimestre = (campoVal, campoNota) => {
    const r = { aprobados: 0, desaprobados: 0, sinCalificar: 0, promedio: "-" };
    let suma = 0;
    let cuantas = 0;
    estudiantes.forEach((e) => {
      const estado = estadoCuatrimestre(e[campoVal], e[campoNota]);
      if (estado === "aprobado") r.aprobados += 1;
      else if (estado === "desaprobado") r.desaprobados += 1;
      else r.sinCalificar += 1;
      const n = aNumero(e[campoNota]);
      if (n !== null && n > 0) {
        suma += n;
        cuantas += 1;
      }
    });
    if (cuantas) r.promedio = String(Number((suma / cuantas).toFixed(2)));
    return r;
  };
  return { total: estudiantes.length, c1: cuatrimestre("v1", "c1"), c2: cuatrimestre("v2", "c2") };
}

/* Resumen del curso en grupos: total y, por cada cuatrimestre, aprobados, desaprobados y promedio. */
export const resumenCurso = (m) => [
  { titulo: "ESTUDIANTES", celdas: [["Total", m.total]] },
  { titulo: "1.º CUATRIMESTRE", celdas: [["Aprobados", m.c1.aprobados], ["Desaprobados", m.c1.desaprobados], ["Promedio", m.c1.promedio]] },
  { titulo: "2.º CUATRIMESTRE", celdas: [["Aprobados", m.c2.aprobados], ["Desaprobados", m.c2.desaprobados], ["Promedio", m.c2.promedio]] }
];

/* Nota: "" -> "-", numerica -> numero (en Excel queda como numero), otra cosa -> texto (TEA, TEP...). */
export function valorNota(v) {
  const s = String(v ?? "").trim();
  if (!s) return "-";
  return /^\d+([.,]\d+)?$/.test(s) ? Number(s.replace(",", ".")) : s;
}

const parciales = (a, b) => [a, b].map((v) => String(v ?? "").trim()).filter(Boolean).join(" - ") || "-";
const entero = (v) => Number(v) || 0;

/* Valores de una fila, en el orden de COLUMNAS. */
export function valoresFila(e) {
  return [
    e.num,
    `${e.apellido}${e.nombre ? `, ${e.nombre}` : ""}`,
    parciales(e.p1, e.p2), valorNota(e.v1), valorNota(e.c1), entero(e.f1),
    parciales(e.p3, e.p4), valorNota(e.v2), valorNota(e.c2), entero(e.f2),
    valorNota(e.dic), valorNota(e.feb), valorNota(e.final)
  ];
}
