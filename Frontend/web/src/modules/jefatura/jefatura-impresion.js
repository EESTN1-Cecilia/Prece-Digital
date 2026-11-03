/* Impresion de las listas de talleres (A4, para guardar como PDF o imprimir).

   `armarDocumento` devuelve un HTML completo y autonomo (sin depender de los
   estilos de la aplicacion) y `imprimirDocumento` lo manda al cuadro de
   impresion del navegador desde un marco oculto. En el cuadro de impresion el
   destino "Guardar como PDF" genera el archivo. */


/* Texto institucional del membrete; se puede pasar otro en `datos.organismo`. */
const ORGANISMO = "Dirección General de Cultura y Educación · Provincia de Buenos Aires";

const ENTIDADES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ENTIDADES[caracter]);
}

function fechaCorta(fecha) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(fecha);
}

function fechaLarga(fecha) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short" }).format(fecha);
}

const COLUMNAS_ASISTENCIA = 5;

function tablaNomina(alumnos, resumen) {
  if (!alumnos.length) return '<p class="aviso">El grupo no tiene alumnos asignados.</p>';

  const fechas = Array.from({ length: COLUMNAS_ASISTENCIA }, () => '<th class="fecha">&nbsp;/&nbsp;</th>').join("");
  const celdas = Array.from({ length: COLUMNAS_ASISTENCIA }, () => '<td class="casilla"></td>').join("");

  return `<table class="tabla tabla--nomina">
    <thead>
      <tr>
        <th rowspan="2" class="num">N.º</th>
        <th rowspan="2">Apellido y nombre</th>
        <th colspan="${COLUMNAS_ASISTENCIA}" class="grupo-cols">Asistencia (fecha)</th>
        <th rowspan="2" class="obs">Observaciones</th>
      </tr>
      <tr>${fechas}</tr>
    </thead>
    <tbody>${alumnos
      .map(
        (alumno, indice) => `<tr>
        <td class="num">${indice + 1}</td>
        <td><strong>${escaparHtml(alumno.apellido)}</strong>, ${escaparHtml(alumno.nombre)}</td>
        ${celdas}
        <td class="obs"></td>
      </tr>`
      )
      .join("")}</tbody>
    <tfoot><tr><td colspan="${3 + COLUMNAS_ASISTENCIA}">Total del grupo: <strong>${resumen.total}</strong> alumnos &nbsp;·&nbsp; Mujeres: <strong>${resumen.F}</strong> &nbsp;·&nbsp; Varones: <strong>${resumen.M}</strong>${resumen.X ? ` &nbsp;·&nbsp; Sin dato: <strong>${resumen.X}</strong>` : ""}</td></tr></tfoot>
  </table>`;
}

function unicos(valores) {
  return [...new Set(valores.filter(Boolean))];
}

function seccionGrupo(datos, grupo, ahora) {
  const { resumen } = grupo;
  const sesiones = grupo.sesiones ?? [];
  const turnos = unicos(sesiones.map((sesion) => sesion.turno));
  const anio = ahora.getFullYear();
  const codigoDoc = `TAL-${grupo.codigo}-${anio}`;
  const emision = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(ahora);

  return `<section class="pagina">
    <header class="membrete">
      <img class="sello" src="${import.meta.env.BASE_URL}assets/tecnica-n1-monte-grande.png" alt="Escudo de la Escuela Técnica N.º 1">
      <div class="institucion">
        <p class="organismo">${escaparHtml(datos.organismo)}</p>
        <p class="escuela">${escaparHtml(datos.escuela)}</p>
        <p class="area">Jefatura de Área · Talleres</p>
      </div>
      <div class="documento">
        <p><span>Ciclo lectivo</span><strong>${anio}</strong></p>
        <p><span>Código</span><strong>${escaparHtml(codigoDoc)}</strong></p>
      </div>
    </header>

    <div class="titulo">
      <p class="sobretitulo">Nómina de alumnos por grupo de taller</p>
      <h1>Curso ${escaparHtml(datos.curso)} <span>·</span> Grupo ${escaparHtml(grupo.codigo)}</h1>
    </div>

    <dl class="datos">
      <div><dt>Curso</dt><dd>${escaparHtml(datos.curso)}</dd></div>
      <div><dt>Grupo de taller</dt><dd>${escaparHtml(grupo.codigo)}</dd></div>
      <div><dt>Ciclo</dt><dd>${escaparHtml(datos.ciclo)}</dd></div>
      <div><dt>Turno del taller</dt><dd>${escaparHtml(turnos.length ? turnos.join(" y ") : "Sin cronograma")}</dd></div>
      <div><dt>Alumnos</dt><dd>${resumen.total}</dd></div>
      <div><dt>Mujeres</dt><dd>${resumen.F}</dd></div>
      <div><dt>Varones</dt><dd>${resumen.M}</dd></div>
      <div><dt>Fecha de emisión</dt><dd>${escaparHtml(emision)}</dd></div>
    </dl>


    <h2>Nómina y registro de asistencia</h2>
    ${tablaNomina(grupo.alumnos, resumen)}

    <div class="firmas">
      <div><span></span><p>Docente a cargo</p><small>Firma y aclaración</small></div>
      <div><span></span><p>Jefatura de Área</p><small>Firma y aclaración</small></div>
      <div><span></span><p>Dirección</p><small>Firma y sello</small></div>
    </div>
    <p class="nota">Documento de uso académico interno. La nómina refleja la división de talleres vigente al momento de la emisión.</p>
  </section>`;
}

const ESTILOS = `
  @page { size: A4 portrait; margin: 0 0 18mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding-inline: 14mm; color: #171414; font: 10pt/1.4 "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
  .pagina { break-after: page; }
  .pagina:last-of-type { break-after: auto; }

  .membrete { margin-top: 12mm; break-inside: avoid; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 5mm; padding-bottom: 3.5mm; border-bottom: 2.5pt solid #8b1e1e;  }
  .sello { display: block; width: 20mm; height: 20mm; object-fit: contain; }
  .institucion p { margin: 0; }
  .organismo { font-size: 7pt; letter-spacing: 0.03em; text-transform: uppercase; color: #5a5555; }
  .escuela { margin-top: 0.8mm !important; font-size: 13.5pt; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; color: #8b1e1e; }
  .area { margin-top: 0.8mm !important; font-size: 9.5pt; color: #5a5555; }
  .documento { min-width: 38mm; padding-left: 5mm; border-left: 0.75pt solid #c9c3c3; }
  .documento p { display: flex; flex-direction: column; margin: 0 0 1.5mm; }
  .documento p:last-child { margin: 0; }
  .documento span { font-size: 7pt; letter-spacing: 0.08em; text-transform: uppercase; color: #5a5555; }
  .documento strong { font-size: 10pt; color: #8b1e1e; }

  .titulo { margin: 5mm 0 3mm; padding-left: 3.5mm; border-left: 3pt solid #8b1e1e; }
  .sobretitulo { margin: 0; font-size: 8pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #5a5555; }
  h1 { margin: 0.5mm 0 0; font: 700 17pt/1.2 Georgia, "Times New Roman", serif; }
  h1 span { color: #7a7474; }
  h2 { break-after: avoid; margin: 4.5mm 0 2mm; padding-bottom: 1mm; border-bottom: 0.75pt solid #bcb4b4; font-size: 9pt; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: #8b1e1e; }

  .datos { display: grid; grid-template-columns: repeat(4, 1fr); margin: 0; border: 0.75pt solid #bcb4b4; background: #faf8f8; }
  .datos > div { padding: 1.6mm 3mm; border-right: 0.75pt solid #e6e6e6; border-bottom: 0.75pt solid #e6e6e6; }
  .datos > div:nth-child(4n) { border-right: 0; }
  .datos > div:nth-last-child(-n + 4) { border-bottom: 0; }
  dt { font-size: 7pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #5a5555; }
  dd { margin: 0.6mm 0 0; font-size: 11pt; font-weight: 600; }

  .tabla { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .tabla th, .tabla td { padding: 2mm 2.5mm; border: 0.75pt solid #c9c3c3; text-align: left; vertical-align: middle; }
  .tabla thead th { background: #8b1e1e; border-color: #8b1e1e; color: #fff; font-size: 8pt; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; text-align: center; }
  .tabla thead th:nth-child(2) { text-align: left; }
  .tabla--nomina thead th.grupo-cols { border-bottom-color: #c97a7a; }
  .tabla--nomina thead tr:nth-child(2) th { padding: 1.2mm 0; background: #a62b2b; border-color: #c97a7a; font-weight: 400; letter-spacing: 0; }
  .tabla tbody tr:nth-child(even) td { background: #faf8f8; }
  .tabla tr { break-inside: avoid; }
  .tabla thead { display: table-header-group; }
  .tabla tfoot { display: table-row-group; }
  .tabla tfoot td { padding: 2.4mm 3mm; background: #f5e8e8; border-color: #c9c3c3; font-size: 9pt; }
  .tabla--nomina td { height: 6.3mm; padding-top: 0.6mm; padding-bottom: 0.6mm; }
  .num { width: 11mm; text-align: center !important; font-variant-numeric: tabular-nums; }
  .casilla, .fecha { width: 15mm; padding-left: 0 !important; padding-right: 0 !important; }
  .obs { width: 33mm; }
  .aviso { margin: 0; padding: 3mm; border: 0.75pt dashed #bcb4b4; color: #5a5555; }

  .firmas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12mm; margin-top: 12mm; break-inside: avoid; }
  .firmas > div { text-align: center; }
  .firmas span { display: block; height: 0; border-top: 0.75pt solid #171414; }
  .firmas p { margin: 1.6mm 0 0; font-size: 9pt; font-weight: 600; }
  .firmas small { display: block; font-size: 7.5pt; color: #5a5555; }
  .nota { margin: 8mm 0 0; padding-top: 2mm; border-top: 0.5pt solid #e6e6e6; font-size: 7.5pt; font-style: italic; color: #5a5555; }
`;

function cadenaCss(texto) {
  return `"${String(texto).replace(/[\\"]/g, "\\$&").replace(/[\n\r]/g, " ")}"`;
}

/* Pie de pagina en las cajas de margen de @page: se repite en cada hoja sin
   pisar el contenido y numera las paginas. */
function estilosPie(datos, ahora) {
  const comun =
    "font: 8pt 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #5a5555; vertical-align: top; padding-top: 2.5mm; border-top: 0.75pt solid #c9c3c3;";
  return `
  @page {
    @bottom-left { content: ${cadenaCss(`${datos.escuela} · Curso ${datos.curso}`)}; ${comun} }
    @bottom-center { content: ${cadenaCss(`Emitido el ${fechaCorta(ahora)}`)}; ${comun} text-align: center; }
    @bottom-right { content: "Página " counter(page) " de " counter(pages); ${comun} text-align: right; }
  }`;
}

/* `datos`: { escuela, organismo?, curso, ciclo, ahora?, grupos: [{ letra, codigo, alumnos: [{ apellido, nombre, genero }],
   resumen: { total, F, M, X }, sesiones }] }. `solo` ("A" o "B") imprime un unico grupo. */
export function armarDocumento(datos, solo = null) {
  const ahora = datos.ahora ?? new Date();
  const completos = { ...datos, organismo: datos.organismo ?? ORGANISMO };
  const grupos = solo ? datos.grupos.filter((grupo) => grupo.letra === solo) : datos.grupos;
  const titulo = solo
    ? `Nómina de talleres ${datos.curso} - Grupo ${grupos[0]?.codigo ?? ""}`
    : `Nómina de talleres ${datos.curso}`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escaparHtml(titulo)}</title>
<style>${ESTILOS}${estilosPie(datos, ahora)}</style>
</head>
<body>
${grupos.map((grupo) => seccionGrupo(completos, grupo, ahora)).join("\n")}
</body>
</html>`;
}

/* Abre el cuadro de impresion con el documento. El marco se quita solo despues. */
export function imprimirDocumento(html) {
  const marco = document.createElement("iframe");
  marco.title = "Vista de impresión";
  marco.setAttribute("aria-hidden", "true");
  Object.assign(marco.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.append(marco);

  const documento = marco.contentDocument;
  documento.open();
  documento.write(html);
  documento.close();

  const quitar = () => marco.remove();
  marco.contentWindow.addEventListener("afterprint", () => setTimeout(quitar, 500));
  setTimeout(quitar, 10 * 60 * 1000);

  Promise.allSettled(Array.from(documento.images, (imagen) => imagen.decode())).then(() => {
    if (!marco.isConnected) return;
    marco.contentWindow.focus();
    marco.contentWindow.print();
  });
}
