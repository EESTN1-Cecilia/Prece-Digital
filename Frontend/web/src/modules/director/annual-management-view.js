import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { h } from "../../layouts/site-layout.js";
import { pedir } from "../../services/http.js";

const anioActual = new Date().getFullYear();

function urlInforme(anio, curso, division) {
  const params = new URLSearchParams({ anio: String(anio) });
  if (curso) params.set("curso", curso);
  if (division) params.set("division", division);
  return `/api/v1/annual-management/report?${params}`;
}

function exportRows(report) {
  const sheets = [];
  sheets.push({
    name: "Resumen",
    rows: [
      { Indicador: "Ciclo lectivo", Valor: report.anio },
      { Indicador: "Generado", Valor: new Date(report.generadoEn).toLocaleString("es-AR") },
      { Indicador: "Matrícula histórica disponible", Valor: report.matricula.disponible ? "Sí" : "No" },
      { Indicador: "Alumnos matriculados", Valor: report.matricula.total ?? "Sin fotografía" },
      { Indicador: "Inasistencias registradas", Valor: report.asistencia.totalInasistencias },
      { Indicador: "Situaciones académicas", Valor: report.academico.totalSituaciones },
      { Indicador: "Alumnos con situaciones no aprobadas", Valor: report.academico.alumnosConSituacionesNoAprobadas },
      { Indicador: "Evaluaciones registradas", Valor: report.academico.totalEvaluaciones }
    ]
  });
  if (report.matricula.porDivision) {
    sheets.push({ name: "Matrícula", rows: report.matricula.porDivision.map((item) => ({ Curso: item.curso, División: item.division, Alumnos: item.cantidad })) });
  }
  sheets.push({
    name: "Inasistencias",
    rows: report.asistencia.alumnosConMasInasistencias.map((item) => ({
      Alumno: item.alumno,
      Curso: item.curso ?? "",
      División: item.division ?? "",
      Inasistencias: item.cantidad
    }))
  });
  sheets.push({
    name: "Situación académica",
    rows: report.academico.porEstado.map((item) => ({ Estado: item.estado, Registros: item.cantidad }))
  });
  if (report.resultadosCierre) {
    sheets.push({
      name: "Cierre anual",
      rows: Object.entries(report.resultadosCierre).map(([decision, cantidad]) => ({ Decisión: decision, Alumnos: cantidad }))
    });
  }
  sheets.push({
    name: "Materias con dificultades",
    rows: report.academico.materiasConDificultades.map((item) => ({
      Materia: item.materia,
      Desaprobadas: item.desaprobadas,
      Libres: item.libres,
      Total: item.total
    }))
  });
  return sheets;
}

function textoSeguro(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function informeHtml(report) {
  const filas = (items, render) => items.map((item) => `<tr>${render(item)}</tr>`).join("");
  const tabla = (titulo, encabezado, contenido) => `
    <section><h2>${titulo}</h2><table><thead><tr>${encabezado.map((celda) => `<th>${celda}</th>`).join("")}</tr></thead><tbody>${contenido || `<tr><td colspan="${encabezado.length}">Sin datos registrados</td></tr>`}</tbody></table></section>`;
  const materias = filas(report.academico.materiasConDificultades, (item) =>
    `<td>${textoSeguro(item.materia)}</td><td>${item.desaprobadas}</td><td>${item.libres}</td><td>${item.total}</td>`);
  const inasistencias = filas(report.asistencia.alumnosConMasInasistencias, (item) =>
    `<td>${textoSeguro(item.alumno)}</td><td>${item.curso ?? "—"}</td><td>${textoSeguro(item.division ?? "—")}</td><td>${item.cantidad}</td>`);
  const divisiones = filas(report.matricula.porDivision ?? [], (item) =>
    `<td>${item.curso}° ${textoSeguro(item.division)}</td><td>${item.cantidad}</td>`);
  const estados = filas(report.academico.porEstado, (item) =>
    `<td>${textoSeguro(item.estado)}</td><td>${item.cantidad}</td>`);

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe anual ${report.anio}</title>
    <style>
      body{font:12px Arial,sans-serif;color:#20232a;margin:24px}header{border-bottom:3px solid #591c23;padding-bottom:12px;margin-bottom:20px}
      h1{color:#591c23;margin:0 0 6px}h2{font-size:15px;margin:20px 0 8px}p{margin:4px 0;color:#555}
      table{border-collapse:collapse;width:100%;margin-bottom:14px}th,td{border:1px solid #d5d7dc;padding:6px;text-align:left}th{background:#f3e8ea}
      @media print{body{margin:12mm}section{break-inside:avoid}button{display:none}}
    </style></head><body><header><p>Prece Digital · Informe institucional</p><h1>Informe anual ${report.anio}</h1>
    <p>Generado: ${textoSeguro(new Date(report.generadoEn).toLocaleString("es-AR"))}</p>
    <p>Filtros: ${report.filtros.curso ? `${report.filtros.curso}°` : "Todos los cursos"}${report.filtros.division ? ` · División ${textoSeguro(report.filtros.division)}` : ""}</p></header>
    <section><h2>Resumen</h2><p>Matrícula ${report.matricula.disponible ? report.matricula.total : "sin fotografía histórica disponible"}</p>
    <p>Inasistencias registradas: ${report.asistencia.totalInasistencias}</p><p>Situaciones académicas: ${report.academico.totalSituaciones}</p>
    <p>Alumnos con situaciones no aprobadas: ${report.academico.alumnosConSituacionesNoAprobadas}</p>
    <p>Evaluaciones registradas: ${report.academico.totalEvaluaciones}</p>
    ${report.resultadosCierre ? `<p>Promovidos: ${report.resultadosCierre.promovido} · Permanecen: ${report.resultadosCierre.permanece} · Egresados: ${report.resultadosCierre.egresado} · Retirados: ${report.resultadosCierre.retirado} · No continúan: ${report.resultadosCierre.no_continua}</p>` : ""}
    <p>Comparación de inasistencias: ${report.asistencia.comparacion.anioAnterior} (${report.asistencia.comparacion.totalAnterior}) frente a ${report.anio} (${report.asistencia.comparacion.totalActual})</p></section>
    ${tabla("Matrícula por curso y división", ["Curso y división", "Alumnos"], divisiones)}
    ${tabla("Asistencia: mayores cantidades de inasistencias registradas", ["Alumno", "Curso", "División", "Registros"], inasistencias)}
    ${tabla("Situación académica por estado", ["Estado", "Registros"], estados)}
    ${tabla("Materias con desaprobaciones o condición libre", ["Materia", "Desaprobadas", "Libres", "Total"], materias)}
    ${report.avisos.length ? `<section><h2>Notas sobre disponibilidad</h2><ul>${report.avisos.map((aviso) => `<li>${textoSeguro(aviso)}</li>`).join("")}</ul></section>` : ""}
    <script>window.addEventListener("load",()=>window.print())</script></body></html>`;
}

function Tarjeta({ titulo, valor, detalle }) {
  return h("article", { className: "annual-stat-card" },
    h("span", { className: "annual-stat-label" }, titulo),
    h("strong", { className: "annual-stat-value" }, valor),
    detalle ? h("span", { className: "annual-stat-detail" }, detalle) : null
  );
}

function decisionCompleta(alumno, decision, divisiones) {
  if (!decision?.decision) return false;
  if (decision.decision === "promovido" || decision.decision === "permanece") {
    const cursoDestino = decision.decision === "promovido" ? alumno.curso + 1 : alumno.curso;
    return divisiones.some((item) => item.anio === cursoDestino && item.division === decision.division);
  }
  if (decision.decision === "egresado") return alumno.curso === 7;
  if (decision.decision === "retirado" || decision.decision === "no_continua") {
    return String(decision.motivo ?? "").trim().length >= 5;
  }
  return false;
}

export default function AnnualManagementView() {
  const [seccion, setSeccion] = useState("informes");
  const [anioOrigen, setAnioOrigen] = useState(anioActual);
  const [anioNuevo, setAnioNuevo] = useState(anioActual + 1);
  const [preview, setPreview] = useState(null);
  const [decisiones, setDecisiones] = useState({});
  const [informe, setInforme] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [anioInforme, setAnioInforme] = useState(anioActual);
  const [curso, setCurso] = useState("");
  const [division, setDivision] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const alumnosDecididos = useMemo(
    () => preview?.alumnos.filter((alumno) => decisionCompleta(alumno, decisiones[alumno.alumnoId], preview.divisiones)).length ?? 0,
    [preview, decisiones]
  );

  async function cargarInforme() {
    setCargando(true);
    setError("");
    try {
      const resultado = await pedir(urlInforme(anioInforme, curso, division));
      setInforme(resultado);
    } catch (fallo) {
      setError(fallo.mensaje ?? "No se pudo generar el informe anual.");
    } finally {
      setCargando(false);
    }
  }

  async function cargarHistorial() {
    try {
      setHistorial(await pedir("/api/v1/annual-management/history"));
    } catch (fallo) {
      setError(fallo.mensaje ?? "No se pudo cargar el historial de cierres.");
    }
  }

  useEffect(() => {
    cargarInforme();
    cargarHistorial();
  }, []);

  function cambiarDecision(alumnoId, decision) {
    setDecisiones((actuales) => ({
      ...actuales,
      [alumnoId]: { ...actuales[alumnoId], decision, motivo: decision === "retirado" || decision === "no_continua" ? actuales[alumnoId]?.motivo ?? "" : "" }
    }));
  }

  function opcionesDivision(alumno, decision) {
    const anioDestino = decision === "promovido" ? alumno.curso + 1 : alumno.curso;
    return preview.divisiones.filter((item) => item.anio === anioDestino);
  }

  async function generarPreview(event) {
    event.preventDefault();
    setCargando(true);
    setError("");
    setExito("");
    setPreview(null);
    setDecisiones({});
    try {
      const params = new URLSearchParams({ anioActual: String(anioOrigen), anioNuevo: String(anioNuevo) });
      setPreview(await pedir(`/api/v1/annual-management/preview?${params}`));
    } catch (fallo) {
      setError(fallo.mensaje ?? "No se pudo preparar la actualización anual.");
    } finally {
      setCargando(false);
    }
  }

  async function confirmarCierre() {
    if (!preview || alumnosDecididos !== preview.alumnos.length) return;
    if (!window.confirm(`¿Confirmás el cierre ${preview.anioActual} y la creación de las listas ${preview.anioNuevo}? Esta acción no se puede repetir.`)) return;
    setGuardando(true);
    setError("");
    setExito("");
    try {
      const data = await pedir("/api/v1/annual-management/confirm", {
        method: "POST",
        body: JSON.stringify({
          previewId: preview.previewId,
          decisiones: preview.alumnos.map((alumno) => ({ alumnoId: alumno.alumnoId, ...decisiones[alumno.alumnoId] }))
        })
      });
      setExito(`Cierre ${data.anioActual} → ${data.anioNuevo} confirmado. El responsable y la fecha quedaron registrados.`);
      setPreview(null);
      setDecisiones({});
      await cargarHistorial();
      await cargarInforme();
    } catch (fallo) {
      setError(fallo.mensaje ?? "No se pudo confirmar el cierre anual.");
    } finally {
      setGuardando(false);
    }
  }

  async function exportarExcel() {
    if (!informe) return;
    setError("");
    setExportando(true);
    try {
      await pedir("/api/v1/annual-management/exports", {
        method: "POST",
        body: JSON.stringify({ anio: informe.anio, formato: "xlsx" })
      });
      const libro = XLSX.utils.book_new();
      for (const hoja of exportRows(informe)) {
        const worksheet = XLSX.utils.json_to_sheet(hoja.rows);
        XLSX.utils.book_append_sheet(libro, worksheet, hoja.name);
      }
      XLSX.writeFile(libro, `informe-institucional-${informe.anio}.xlsx`);
    } catch (fallo) {
      setError(fallo.mensaje ?? "No se pudo exportar el informe a Excel.");
    } finally {
      setExportando(false);
    }
  }

  async function exportarPdf() {
    if (!informe) return;
    const ventana = window.open("", "_blank");
    if (!ventana) {
      setError("El navegador bloqueó la ventana de impresión. Permití ventanas emergentes e intentá nuevamente.");
      return;
    }
    setExportando(true);
    try {
      await pedir("/api/v1/annual-management/exports", {
        method: "POST",
        body: JSON.stringify({ anio: informe.anio, formato: "pdf" })
      });
      ventana.document.open();
      ventana.document.write(informeHtml(informe));
      ventana.document.close();
    } catch (fallo) {
      ventana.close();
      setError(fallo.mensaje ?? "No se pudo preparar el PDF.");
    } finally {
      setExportando(false);
    }
  }

  const clases = informe?.opciones?.divisiones ?? [];
  const divisiones = clases.filter((item) => !curso || item.curso === Number(curso));

  return h("main", { className: "annual-page" },
    h("header", { className: "annual-header" },
      h("div", null,
        h("p", { className: "annual-eyebrow" }, "Administración institucional"),
        h("h1", null, "Cierre e informes anuales"),
        h("p", { className: "annual-subtitle" }, "Revisá la matrícula y consultá los datos académicos y de asistencia por ciclo lectivo.")
      ),
      h("nav", { className: "annual-tabs", "aria-label": "Secciones de gestión anual" },
        h("button", { type: "button", className: seccion === "informes" ? "is-active" : "", onClick: () => setSeccion("informes") }, "Informes anuales"),
        h("button", { type: "button", className: seccion === "cierre" ? "is-active" : "", onClick: () => setSeccion("cierre") }, "Actualización de listas")
      )
    ),
    error ? h("div", { className: "annual-alert annual-alert-error", role: "alert" }, error) : null,
    exito ? h("div", { className: "annual-alert annual-alert-success", role: "status" }, exito) : null,
    seccion === "cierre"
      ? h("section", { className: "annual-section" },
        h("h2", null, "Preparar listas del próximo ciclo"),
        h("p", { className: "annual-note" }, "La situación académica se muestra como antecedente. Como el sistema no define reglas automáticas de promoción, cada decisión debe seleccionarse y revisarse manualmente."),
        h("form", { className: "annual-filters", onSubmit: generarPreview },
          h("label", null, "Ciclo lectivo actual",
            h("input", { type: "number", min: 1990, max: 2099, required: true, value: anioOrigen, onChange: (event) => {
              const year = Number(event.target.value);
              setAnioOrigen(year);
              setAnioNuevo(year + 1);
            } })
          ),
          h("label", null, "Nuevo ciclo lectivo",
            h("input", { type: "number", min: 1991, max: 2100, required: true, value: anioNuevo, onChange: (event) => setAnioNuevo(Number(event.target.value)) })
          ),
          h("button", { type: "submit", className: "annual-primary-button", disabled: cargando }, cargando ? "Preparando…" : "Preparar vista previa")
        ),
        preview ? h(React.Fragment, null,
          h("div", { className: "annual-preview-summary" },
            h("strong", null, `${preview.cantidadAlumnos} alumnos`),
            h("span", null, `${preview.cantidadConAvisos} con avisos`),
            h("span", null, `Cierre ${preview.anioActual} → ${preview.anioNuevo}`)
          ),
          preview.alumnos.length === 0
            ? h("div", { className: "annual-empty" }, "No hay alumnos activos para revisar en este ciclo.")
            : h("div", { className: "annual-table-wrap" },
              h("table", { className: "annual-table" },
                h("thead", null, h("tr", null,
                  h("th", null, "Alumno"),
                  h("th", null, "Curso actual"),
                  h("th", null, "Antecedentes académicos"),
                  h("th", null, "Decisión para el nuevo ciclo"),
                  h("th", null, "Avisos")
                )),
                h("tbody", null, preview.alumnos.map((alumno) => {
                  const seleccion = decisiones[alumno.alumnoId] ?? {};
                  const requiereMotivo = ["retirado", "no_continua"].includes(seleccion.decision);
                  const sigue = ["promovido", "permanece"].includes(seleccion.decision);
                  const opciones = sigue ? opcionesDivision(alumno, seleccion.decision) : [];
                  return h("tr", { key: alumno.alumnoId },
                    h("td", null,
                      h("strong", null, alumno.nombreCompleto),
                      h("span", { className: "annual-secondary" }, `DNI ${alumno.dni ?? "sin dato"}`)
                    ),
                    h("td", null, alumno.curso ? `${alumno.curso}° ${alumno.division ?? ""}` : "Sin asignación"),
                    h("td", null,
                      alumno.situacionAcademica.cantidad
                        ? h("span", null, `Registros ${alumno.situacionAcademica.cantidad}: ${Object.entries(alumno.situacionAcademica.porEstado).filter(([, count]) => count).map(([state, count]) => `${state} ${count}`).join(" · ")}`)
                        : h("span", { className: "annual-warning-text" }, "Sin información suficiente")
                    ),
                    h("td", null,
                      h("select", { value: seleccion.decision ?? "", onChange: (event) => cambiarDecision(alumno.alumnoId, event.target.value) },
                        h("option", { value: "" }, "Seleccionar decisión"),
                        Number.isInteger(alumno.curso) && alumno.curso < 7 ? h("option", { value: "promovido" }, `Promover a ${alumno.curso + 1}°`) : null,
                        Number.isInteger(alumno.curso) ? h("option", { value: "permanece" }, `Permanece en ${alumno.curso}°`) : null,
                        alumno.curso === 7 ? h("option", { value: "egresado" }, "Egresado") : null,
                        h("option", { value: "retirado" }, "Retirado"),
                        h("option", { value: "no_continua" }, "No continúa")
                      ),
                      sigue ? h("select", {
                        value: seleccion.division ?? "",
                        onChange: (event) => setDecisiones((actuales) => ({ ...actuales, [alumno.alumnoId]: { ...actuales[alumno.alumnoId], division: event.target.value } }))
                      },
                      h("option", { value: "" }, "Seleccionar división"),
                      opciones.map((item) => h("option", { key: item.division, value: item.division }, `División ${item.division}`))) : null,
                      requiereMotivo ? h("input", {
                        type: "text",
                        maxLength: 300,
                        required: true,
                        placeholder: "Motivo de la baja (mín. 5 caracteres)",
                        value: seleccion.motivo ?? "",
                        onChange: (event) => setDecisiones((actuales) => ({ ...actuales, [alumno.alumnoId]: { ...actuales[alumno.alumnoId], motivo: event.target.value } }))
                      }) : null
                    ),
                    h("td", null, alumno.avisos.length
                      ? h("ul", { className: "annual-warning-list" }, alumno.avisos.map((aviso) => h("li", { key: aviso }, aviso)))
                      : h("span", { className: "annual-ok" }, "Sin inconsistencias detectadas"))
                  );
                }))
              )
            ),
          h("div", { className: "annual-confirm-row" },
            h("span", null, `${alumnosDecididos} de ${preview.alumnos.length} decisiones registradas`),
            h("button", { type: "button", className: "annual-primary-button", disabled: guardando || alumnosDecididos !== preview.alumnos.length, onClick: confirmarCierre }, guardando ? "Confirmando…" : "Confirmar cierre anual")
          )
        ) : null,
        h("section", { className: "annual-history" },
          h("h3", null, "Cierres realizados"),
          historial.length
            ? h("ul", null, historial.map((item) => h("li", { key: item.id },
              h("strong", null, `${item.anioActual} → ${item.anioNuevo}`),
              h("span", null, `${new Date(item.creadoEn).toLocaleString("es-AR")} · ${item.responsable}`)
            )))
            : h("p", { className: "annual-empty" }, "Todavía no hay cierres registrados.")
        )
      )
      : h("section", { className: "annual-section" },
        h("h2", null, "Informe institucional anual"),
        h("form", { className: "annual-filters", onSubmit: (event) => { event.preventDefault(); cargarInforme(); } },
          h("label", null, "Ciclo lectivo",
            h("input", { type: "number", min: 1990, max: 2100, value: anioInforme, onChange: (event) => setAnioInforme(Number(event.target.value)) })
          ),
          h("label", null, "Curso",
            h("select", { value: curso, onChange: (event) => { setCurso(event.target.value); setDivision(""); } },
              h("option", { value: "" }, "Todos"),
              (informe?.opciones?.cursos ?? [1, 2, 3, 4, 5, 6, 7]).map((item) => h("option", { key: item, value: item }, `${item}°`))
            )
          ),
          h("label", null, "División",
            h("select", { value: division, onChange: (event) => setDivision(event.target.value) },
              h("option", { value: "" }, "Todas"),
              [...new Set(divisiones.map((item) => item.division))].map((item) => h("option", { key: item, value: item }, item))
            )
          ),
          h("button", { type: "submit", className: "annual-primary-button", disabled: cargando }, cargando ? "Generando…" : "Generar informe")
        ),
        informe ? h(React.Fragment, null,
          h("div", { className: "annual-report-meta" }, `Ciclo ${informe.anio} · Generado ${new Date(informe.generadoEn).toLocaleString("es-AR")}`),
          h("div", { className: "annual-stat-grid" },
            h(Tarjeta, { titulo: "Matrícula", valor: informe.matricula.disponible ? informe.matricula.total : "Sin fotografía", detalle: informe.matricula.disponible ? "alumnos registrados al inicio del ciclo" : "no hay corte histórico para este ciclo" }),
            h(Tarjeta, { titulo: "Inasistencias", valor: informe.asistencia.totalInasistencias, detalle: `${informe.asistencia.alumnosConInasistencias} alumnos con registros` }),
            h(Tarjeta, { titulo: "Situaciones académicas", valor: informe.academico.totalSituaciones, detalle: `${informe.academico.alumnosConSituacionesAprobadas} alumnos con alguna materia aprobada` }),
            h(Tarjeta, { titulo: "Situaciones no aprobadas", valor: informe.academico.alumnosConSituacionesNoAprobadas, detalle: "alumnos con registros en estados distintos de aprobada" }),
            h(Tarjeta, { titulo: "Evaluaciones", valor: informe.academico.totalEvaluaciones, detalle: "registros, sin umbral de aprobación inferido" })
          ),
          informe.avisos.length ? h("div", { className: "annual-alert annual-alert-info" }, h("strong", null, "Disponibilidad de datos"), h("ul", null, informe.avisos.map((aviso) => h("li", { key: aviso }, aviso)))) : null,
          h("div", { className: "annual-report-grid" },
            h("section", { className: "annual-report-card" },
              h("h3", null, "Matrícula por curso y división"),
              informe.matricula.disponible && informe.matricula.porDivision.length
                ? h("div", { className: "annual-bars" }, informe.matricula.porDivision.map((item) => h("div", { className: "annual-bar-row", key: `${item.curso}-${item.division}` },
                  h("span", null, `${item.curso}° ${item.division}`),
                  h("div", { className: "annual-bar-track" }, h("span", { style: { width: `${Math.min(100, item.cantidad / Math.max(1, ...informe.matricula.porDivision.map((row) => row.cantidad)) * 100)}%` } })),
                  h("strong", null, item.cantidad)
                )))
                : h("p", { className: "annual-empty" }, "Sin fotografía de matrícula para este ciclo.")
            ),
            informe.matricula.cursosExtremos ? h("p", { className: "annual-course-extremes" },
              `Mayor matrícula: ${informe.matricula.cursosExtremos.mayorMatricula.map((item) => `${item.curso}° (${item.cantidad})`).join(", ")} · Menor matrícula: ${informe.matricula.cursosExtremos.menorMatricula.map((item) => `${item.curso}° (${item.cantidad})`).join(", ")}`
            ) : null,
            h("section", { className: "annual-report-card" },
              h("h3", null, "Comparación de matrícula"),
              informe.comparacionMatricula.disponible
                ? h("p", null, `${informe.comparacionMatricula.anioAnterior}: ${informe.comparacionMatricula.matriculaAnterior} · ${informe.anio}: ${informe.comparacionMatricula.matriculaActual} · Variación: ${informe.comparacionMatricula.variacion > 0 ? "+" : ""}${informe.comparacionMatricula.variacion}`)
                : h("p", { className: "annual-empty" }, "Se requieren fotografías de ambos ciclos para comparar.")
            ),
            h("section", { className: "annual-report-card" },
              h("h3", null, "Resultados del cierre"),
              informe.resultadosCierre
                ? h("ul", { className: "annual-outcomes" },
                  h("li", null, `Promovidos: ${informe.resultadosCierre.promovido}`),
                  h("li", null, `Permanecen: ${informe.resultadosCierre.permanece}`),
                  h("li", null, `Egresados: ${informe.resultadosCierre.egresado}`),
                  h("li", null, `Retirados: ${informe.resultadosCierre.retirado}`),
                  h("li", null, `No continúan: ${informe.resultadosCierre.no_continua}`)
                )
                : h("p", { className: "annual-empty" }, "No hay cierre anual registrado para este ciclo.")
            ),
            h("section", { className: "annual-report-card" },
              h("h3", null, "Inasistencias por curso"),
              informe.asistencia.porCurso.length
                ? h("ul", { className: "annual-outcomes" }, informe.asistencia.porCurso.map((item) => h("li", { key: item.curso }, `${item.curso}°: ${item.cantidad}`)))
                : h("p", { className: "annual-empty" }, "Sin inasistencias registradas.")
            ),
            h("section", { className: "annual-report-card" },
              h("h3", null, "Comparación de inasistencias"),
              informe.asistencia.comparacion.disponible
                ? h("p", null, `${informe.asistencia.comparacion.anioAnterior}: ${informe.asistencia.comparacion.totalAnterior} · ${informe.anio}: ${informe.asistencia.comparacion.totalActual} · Variación: ${informe.asistencia.comparacion.variacion > 0 ? "+" : ""}${informe.asistencia.comparacion.variacion}`)
                : h("p", { className: "annual-empty" }, "No hay registros en ninguno de los dos ciclos.")
            ),
            h("section", { className: "annual-report-card" },
              h("h3", null, "Alumnos con más inasistencias"),
              informe.asistencia.alumnosConMasInasistencias.length
                ? h("ol", { className: "annual-outcomes" }, informe.asistencia.alumnosConMasInasistencias.map((item) => h("li", { key: item.alumnoId }, `${item.alumno}: ${item.cantidad}`)))
                : h("p", { className: "annual-empty" }, "Sin registros de inasistencias.")
            ),
            h("section", { className: "annual-report-card" },
              h("h3", null, "Situación académica por estado"),
              informe.academico.porEstado.length
                ? h("ul", { className: "annual-outcomes" }, informe.academico.porEstado.map((item) => h("li", { key: item.estado }, `${item.estado}: ${item.cantidad}`)))
                : h("p", { className: "annual-empty" }, "Sin situaciones académicas registradas.")
            ),
            h("section", { className: "annual-report-card" },
              h("h3", null, "Comparación académica"),
              informe.academico.comparacion.disponible
                ? h("p", null, `${informe.academico.comparacion.anioAnterior}: ${informe.academico.comparacion.situacionesAnteriores} situaciones · ${informe.anio}: ${informe.academico.comparacion.situacionesActuales} situaciones`)
                : h("p", { className: "annual-empty" }, "No hay datos comparables para ambos ciclos.")
            ),
            h("section", { className: "annual-report-card annual-report-card-wide" },
              h("h3", null, "Materias con desaprobaciones o condición libre"),
              informe.academico.materiasConDificultades.length
                ? h("div", { className: "annual-table-wrap" }, h("table", { className: "annual-table" },
                  h("thead", null, h("tr", null, h("th", null, "Materia"), h("th", null, "Desaprobadas"), h("th", null, "Libres"), h("th", null, "Total"))),
                  h("tbody", null, informe.academico.materiasConDificultades.map((item) => h("tr", { key: item.materia },
                    h("td", null, item.materia), h("td", null, item.desaprobadas), h("td", null, item.libres), h("td", null, item.total)
                  )))
                ))
                : h("p", { className: "annual-empty" }, "Sin materias con esos estados.")
            )
          ),
          h("div", { className: "annual-export-row" },
            h("button", { type: "button", className: "annual-secondary-button", disabled: exportando, onClick: exportarPdf }, exportando ? "Preparando…" : "Imprimir / Guardar PDF"),
            h("button", { type: "button", className: "annual-secondary-button", disabled: exportando, onClick: exportarExcel }, exportando ? "Exportando…" : "Exportar tablas a Excel")
          )
        ) : null
      )
  );
}
