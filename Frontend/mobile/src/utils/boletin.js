/* Boletin del alumno: reglas y HTML del PDF (funciones puras).
   El agrupado de materias es EL MISMO que usa la web (un solo codigo), asi la
   app y la web muestran el mismo boletin. El texto del PDF replica el de
   Frontend/web/src/modules/boletin/boletin-pdf.js. */

import { agruparMaterias } from "../../../web/src/modules/boletin/boletin-grupos.js";

export { agruparMaterias };

export function estadoMateria(materia) {
  if (materia.situacionOficial) {
    const { tipo, tipoEtiqueta, estadoEtiqueta } = materia.situacionOficial;
    return tipo === "cursada" ? estadoEtiqueta : `${tipoEtiqueta} · ${estadoEtiqueta}`;
  }

  return null;
}

/* Resumen: solo cuenta lo que ya figura en el boletin. */
export function resumenBoletin({ materias, inasistencias, materiasPendientes }) {
  const aRevisar = materias.filter((materia) => ["tep", "ted", "debajo_de_6"].includes(materia.estadoActual)).length;

  return [
    ["Materias", materias.length],
    ["Aprobadas", materias.filter((materia) => materia.estadoActual === "aprobada").length],
    ["A revisar", aRevisar],
    ["Ausentes", inasistencias.ausentes],
    ["Previas pendientes", materiasPendientes.length]
  ];
}

export function esNotaMarcada(resultado) {
  return Boolean(resultado) && ["tep", "ted", "debajo_de_6"].includes(resultado.estado);
}

export const TEXTO_SIGLAS = "TEP: trayectoria educativa en proceso. TED: trayectoria educativa con dificultad.";

export function nombreArchivoBoletin(datos) {
  const limpio = (texto) =>
    String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");

  return `Boletin-${limpio(datos.alumno?.nombreCompleto) || "alumno"}-${datos.cicloLectivo}.pdf`;
}

/* Todo texto que viene del Backend se escapa: el HTML nunca ejecuta datos. */
export function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const BORDO = "#5c0f0f";
const COLOR_ESTADO = { aprobada: "#1f6b3a", tep: "#8a5a00", ted: "#a62b2b", debajo_de_6: "#a62b2b" };
const FONDO_ESTADO = { tep: "#fdf3dc", ted: "#fbe9e7", debajo_de_6: "#fbe9e7" };

function celda(resultado) {
  if (!resultado) return `<td class="nota vacia">—</td>`;
  const fondo = esNotaMarcada(resultado) ? `background:${FONDO_ESTADO[resultado.estado]};` : "";
  return `<td class="nota" style="${fondo}color:${COLOR_ESTADO[resultado.estado] ?? "#1a0b0b"}">${esc(resultado.valor)}</td>`;
}

export function boletinHtml(datos, { logo = "", emitido = new Date().toLocaleDateString("es-AR") } = {}) {
  const { alumno, inasistencias, materiasPendientes, cicloLectivo, criterio } = datos;
  const grupos = agruparMaterias(datos);

  const filas = grupos
    .flatMap((grupo) => [
      `<tr class="seccion"><th colspan="5">${esc(grupo.titulo)}</th></tr>`,
      ...grupo.materias.map((materia) => {
        const situacion = estadoMateria(materia);
        return `<tr>
          <th scope="row" class="materia">${esc(materia.materia)}${materia.docente ? `<span class="docente">${esc(materia.docente)}</span>` : ""}</th>
          ${celda(materia.periodos.c1.resultado)}${celda(materia.periodos.c2.resultado)}${celda(materia.periodos.final.resultado)}
          <td class="estado" style="color:${COLOR_ESTADO[materia.estadoActual] ?? "#1a0b0b"}">${esc(materia.estadoActualEtiqueta)}${situacion ? `<span class="docente">${esc(situacion)}</span>` : ""}</td>
        </tr>`;
      })
    ])
    .join("");

  const pendientes = materiasPendientes.length
    ? `<ul>${materiasPendientes.map((p) => `<li>${esc(p.materia)} — ciclo ${esc(p.anioCursada)}${p.cursoOrigen?.etiqueta ? ` (${esc(p.cursoOrigen.etiqueta)})` : ""}</li>`).join("")}</ul>`
    : "<p>No tiene materias pendientes.</p>";

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(nombreArchivoBoletin(datos))}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1a0b0b; font-size: 11px; margin: 0; }
  .cabecera { background: ${BORDO}; color: #fff; padding: 14px 18px; display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #e8c5c5; }
  .cabecera img { width: 58px; height: 58px; }
  .escuela { font-size: 9.5px; font-weight: 700; letter-spacing: .06em; color: #e8c5c5; margin: 0; }
  .titulo { font-size: 19px; font-weight: 800; margin: 2px 0 0; }
  .ciclo { margin-left: auto; font-size: 12px; color: #e8c5c5; }
  .alumno { display: flex; border: 1px solid #e6e6e6; margin-top: 12px; }
  .alumno > div { flex: 1; padding: 8px 10px; border-left: 1px solid #e6e6e6; }
  .alumno > div:first-child { flex: 2; border-left: 0; }
  .alumno dt, .alumno .et { font-size: 7.5px; font-weight: 700; color: #5a5555; text-transform: uppercase; }
  .alumno .va { font-size: 11px; font-weight: 700; margin-top: 4px; }
  .resumen { display: flex; background: #f6eaea; margin-top: 10px; padding: 8px 0; }
  .resumen > div { flex: 1; text-align: center; border-left: 1px solid #e8c5c5; }
  .resumen > div:first-child { border-left: 0; }
  .resumen strong { display: block; font-size: 16px; color: ${BORDO}; }
  .resumen span { font-size: 8px; color: #5a5555; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; border: 1px solid #e6e6e6; }
  thead th { background: ${BORDO}; color: #fff; font-size: 9.5px; padding: 6px 8px; text-align: center; }
  thead th:first-child { text-align: left; }
  tr.seccion th { background: ${BORDO}; color: #fff; text-align: left; font-size: 9px; letter-spacing: .04em; padding: 4px 10px; }
  td, tbody th.materia { border-top: 1px solid #e6e6e6; border-left: 1px solid #e6e6e6; padding: 6px 8px; vertical-align: middle; }
  tbody th.materia { text-align: left; font-size: 10.5px; border-left: 0; }
  .docente { display: block; font-weight: 400; font-size: 8px; color: #5a5555; margin-top: 2px; }
  td.nota { text-align: center; font-weight: 700; width: 48px; }
  td.nota.vacia { color: #7a7474; font-weight: 400; }
  td.estado { font-weight: 700; font-size: 9.5px; width: 120px; }
  tbody tr:nth-child(even) td, tbody tr:nth-child(even) th.materia { background-color: #fbf8f8; }
  .pie { display: flex; gap: 14px; margin-top: 14px; }
  .bloque { flex: 1; border: 1px solid #e6e6e6; border-left: 4px solid #e8c5c5; padding: 8px 12px; }
  .bloque h3 { margin: 0 0 4px; font-size: 10.5px; color: ${BORDO}; }
  .bloque p, .bloque ul { margin: 2px 0; font-size: 9.5px; } .bloque ul { padding-left: 14px; }
  .criterio { font-size: 8.5px; color: #5a5555; margin-top: 10px; }
  .firmas { display: flex; justify-content: space-around; margin-top: 46px; }
  .firmas div { width: 170px; border-top: 1px solid #5a5555; text-align: center; padding-top: 4px; font-size: 8.5px; color: #5a5555; }
  .emision { margin-top: 18px; font-size: 8px; color: #5a5555; }
</style></head><body>
  <div class="cabecera">${logo ? `<img src="${logo}" alt="">` : ""}<div><p class="escuela">E.E.S. TÉCNICA N°1</p><p class="titulo">BOLETÍN DE CALIFICACIONES</p></div><div class="ciclo">Ciclo lectivo ${esc(cicloLectivo)}</div></div>
  <div class="alumno">
    <div><div class="et">Alumno/a</div><div class="va">${esc(alumno.nombreCompleto)}</div></div>
    <div><div class="et">DNI</div><div class="va">${esc(alumno.dni)}</div></div>
    <div><div class="et">Curso y división</div><div class="va">${esc(alumno.cursoDivision ?? "Sin registro")}</div></div>
    <div><div class="et">Ciclo lectivo</div><div class="va">${esc(cicloLectivo)}</div></div>
  </div>
  <div class="resumen">${resumenBoletin(datos).map(([e, v]) => `<div><strong>${esc(v)}</strong><span>${esc(e)}</span></div>`).join("")}</div>
  ${filas
    ? `<table><thead><tr><th>Materia</th><th>1° C</th><th>2° C</th><th>Final</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table>`
    : `<p>Todavía no hay calificaciones registradas para este ciclo.</p>`}
  <div class="pie">
    <div class="bloque"><h3>Inasistencias</h3>
      <p>${esc(inasistencias.ausentes)} ausente(s) de jornada completa: ${esc(inasistencias.ausentesJustificados)} justificada(s), ${esc(inasistencias.ausentesInjustificados)} injustificada(s).</p>
      ${inasistencias.llegadasTarde || inasistencias.ausentesParciales ? `<p>Llegadas tarde: ${esc(inasistencias.llegadasTarde)}. Retiros anticipados: ${esc(inasistencias.ausentesParciales)}.</p>` : ""}
    </div>
    <div class="bloque"><h3>Materias pendientes de aprobación</h3>${pendientes}</div>
  </div>
  <p class="criterio">${esc(criterio)} ${esc(TEXTO_SIGLAS)}</p>
  <div class="firmas"><div>Firma del preceptor/a</div><div>Firma y sello de Dirección</div></div>
  <p class="emision">Consulta generada el ${esc(emitido)} desde Prece Digital.</p>
</body></html>`;
}
