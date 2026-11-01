/* Datos del Boletin Oficial de Calificaciones (vista del personal: Direccion,
   Secretaria, Preceptoria). Sin dependencias de pantalla: lo usan el modal, el
   PDF de impresion y las pruebas.

   Las notas NO se guardan en el navegador: viven en el backend, en el mismo
   registro de calificaciones que escribe la Planilla del docente y que lee el
   portal del alumno (ver boletin-oficial-service.js). Aca solo se arma la
   estructura del formulario a partir del registro que devuelve la API. */

import { PLANES_BOLETIN } from "../students/components/planes-boletin.js";

export const CAMPOS_NOTA = ["informe1", "informe2", "promedioAnual", "diciembre", "febrero", "definitiva"];
export const FILAS_PENDIENTES = 4;
export const PERIODOS_PENDIENTES = [
  ["abril", "Abril"],
  ["mayo", "Mayo"],
  ["agosto", "Agosto"],
  ["octubre", "Octubre"]
];

const quitarAcentos = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const normalizar = (texto) => quitarAcentos(texto).toUpperCase().replace(/\s+/g, " ").trim();

export function anioDelAlumno(alumno) {
  const digito = String(alumno?.curso ?? "").match(/[1-7]/);
  return digito ? Number(digito[0]) : 1;
}

/* El backend guarda las notas por ciclo lectivo (2026) y la pantalla las muestra
   por año de estudio (1° a 7°). El año de estudio actual del alumno es el ciclo
   actual; los anteriores, los ciclos previos (sin considerar repitencias). */
export function cicloDeAnio(anioEstudio, alumno, cicloActual = new Date().getFullYear()) {
  return cicloActual - (anioDelAlumno(alumno) - anioEstudio);
}

export function planDelAnio(anio, orientacion = "") {
  const plan = PLANES_BOLETIN[anio] ?? PLANES_BOLETIN[1];
  const clave = normalizar(orientacion).includes("INFORMATICA") ? "informatica" : "programacion";
  const taller = plan.tcoEspecifica ?? plan.orientaciones?.[clave] ?? [];
  return {
    nombreAnio: plan.nombreAnio,
    ciclo: plan.ciclo.replace("Ciclo ", ""),
    general: plan.formacionGeneral ?? [],
    taller,
    tituloTaller: plan.tcoEspecifica ? "TCO. ESPECÍFICA / TALLER" : "FORMACIÓN TÉCNICA ESPECÍFICA"
  };
}

const numero = (valor) => {
  const n = parseFloat(String(valor ?? "").replace(",", "."));
  return Number.isNaN(n) ? null : n;
};
const formato = (n) => String(Number(n.toFixed(2)));

/* Promedio anual y calificacion definitiva a partir de lo que se edita. */
export function recalcularNota(nota) {
  const a = numero(nota.informe1);
  const b = numero(nota.informe2);
  const promedioAnual = a !== null && b !== null ? formato((a + b) / 2) : "";
  const feb = numero(nota.febrero);
  const dic = numero(nota.diciembre);
  const definitiva = feb !== null ? formato(feb) : dic !== null ? formato(dic) : promedioAnual;
  return { ...nota, promedioAnual, definitiva };
}

export function promedioGeneral(notas, materias) {
  const valores = materias.map((m) => numero(notas[m]?.definitiva)).filter((n) => n !== null);
  return valores.length ? formato(valores.reduce((s, n) => s + n, 0) / valores.length) : "";
}

const notaVacia = () => Object.fromEntries(CAMPOS_NOTA.map((c) => [c, ""]));
const textoNota = (valor) => (valor === null || valor === undefined ? "" : String(valor));

export const pendienteVacio = () => ({
  materia: "",
  anio: "",
  ...Object.fromEntries(PERIODOS_PENDIENTES.flatMap(([k]) => [[`${k}C`, ""], [`${k}LF`, ""]]))
});

/* Registro sin datos: lo que se usa mientras carga o si el alumno no tiene nada. */
export const registroVacio = () => ({ notas: {}, inasistencias: "", pendientes: [], libroFolio: null, detalle: {} });

export function buscarNota(calificaciones, materia) {
  if (!calificaciones) return null;
  if (calificaciones[materia]) return calificaciones[materia];
  const buscada = normalizar(materia);
  const clave = Object.keys(calificaciones).find((k) => normalizar(k) === buscada);
  return clave ? calificaciones[clave] : null;
}

/* Arma el boletin de un alumno para un año: plan + notas del backend (`registro`). */
export function armarBoletinOficial(alumno, anio = anioDelAlumno(alumno), { registro: crudo = null, cicloLectivo = new Date().getFullYear() } = {}) {
  const plan = planDelAnio(anio, alumno?.orientacion);
  const registro = { ...registroVacio(), ...(crudo ?? {}) };
  const notas = {};
  [...plan.general, ...plan.taller].forEach((materia) => {
    const guardada = buscarNota(registro.notas, materia) ?? {};
    notas[materia] = recalcularNota(Object.fromEntries(CAMPOS_NOTA.map((c) => [c, textoNota(guardada[c] ?? notaVacia()[c])])));
  });
  const idNumerico = String(alumno?.id ?? "").replace(/\D/g, "") || "1";
  const libro = String(alumno?.libro ?? registro.libroFolio?.libro ?? cicloLectivo);
  const folio = String(alumno?.folio ?? registro.libroFolio?.folio ?? idNumerico.padStart(2, "0"));
  const pendientes = Array.from({ length: FILAS_PENDIENTES }, (_, i) => ({ ...pendienteVacio(), ...(registro.pendientes?.[i] ?? {}) }));
  return {
    alumno: {
      id: alumno?.id,
      apellido: alumno?.apellido ?? "",
      nombre: alumno?.nombre ?? "",
      nombreCompleto: `${alumno?.apellido ?? ""}, ${alumno?.nombre ?? ""}`.replace(/^, |, $/g, ""),
      dni: alumno?.dni ?? "",
      cursoDivision: `${anioDelAlumno(alumno)}° ${String(alumno?.division ?? "").replace(/\D/g, "") || "-"}`,
      turno: alumno?.turno && alumno.turno !== "-" ? alumno.turno : "",
      legajo: alumno?.legajoCompleto ?? `(${libro}-${folio}-${alumno?.legajo ?? alumno?.id ?? "S/N"})`,
      libro,
      folio
    },
    anio,
    plan,
    cicloLectivo,
    notas,
    inasistencias: textoNota(registro.inasistencias),
    pendientes
  };
}

/* Lo que se envia al backend al guardar el boletin. Promedio anual y definitiva
   no se envian: se calculan a partir de los informes, diciembre y febrero. */
export function cuerpoParaGuardar(boletin) {
  const notas = {};
  Object.entries(boletin.notas).forEach(([materia, nota]) => {
    notas[materia] = { informe1: nota.informe1 ?? "", informe2: nota.informe2 ?? "", diciembre: nota.diciembre ?? "", febrero: nota.febrero ?? "" };
  });
  return {
    anio: boletin.anio,
    notas,
    inasistencias: boletin.inasistencias ?? "",
    pendientes: boletin.pendientes,
    libroFolio: { libro: boletin.alumno.libro, folio: boletin.alumno.folio }
  };
}
