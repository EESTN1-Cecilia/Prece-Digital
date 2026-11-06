import { useState } from "react";
import { h, IconoFigma } from "../../../../layouts/site-layout.js";

/**
 * StudentDocumentationTab: Panel centralizado de Documentación, Constancias Oficiales y Legajo Digital del Alumno.
 */
export function StudentDocumentationTab({
  alumno = {},
  escolar = {},
  onOpenAlumnoRegular,
  onOpenTramitePase,
  onOpenSolicitudPase,
  onOpenSituacionAcademica,
  onOpenRite,
  onOpenPlanillaCalificaciones,
  onOpenMatriz,
  onOpenBoletin
}) {
  const documentosAdjuntos = [];
  const [errorSubida, setErrorSubida] = useState("");

  const nombreAlumno = alumno.nombreCompleto || `${alumno.apellido || ""}, ${alumno.nombre || ""}`.trim() || "el estudiante";

  return h(
    "div",
    { className: "student-documentation-tab-container" },

    // Encabezado de la sección
    h(
      "div",
      { className: "doc-tab-intro" },
      h(
        "div",
        { className: "doc-tab-intro__text" },
        h("h2", { className: "doc-tab-title" }, "Documentación Oficial y Legajo Digital"),
        h(
          "p",
          { className: "doc-tab-desc" },
          `Gestión integral de constancias institucionales, solicitudes de pase, certificados de estudio en trámite y legajo físico/digital para ${nombreAlumno}.`
        )
      )
    ),

    // =========================================================================
    // SECCIÓN 1: CONSTANCIAS Y DOCUMENTOS OFICIALES EMITIBLES
    // =========================================================================
    h(
      "section",
      { className: "doc-official-cards-section" },
      h(
        "div",
        { className: "doc-section-header-row" },
        h("h3", { className: "doc-section-heading" }, "Constancias y Formularios Oficiales Digitalizados"),
        h("span", { className: "doc-section-badge" }, "Validez Legal Institucional")
      ),

      h(
        "div",
        { className: "doc-official-cards-grid" },

        // 1. Constancia de Alumno Regular
        h(
          "article",
          { className: "doc-official-card doc-official-card--primary" },
          h(
            "div",
            { className: "doc-official-card__header" },
            h(
              "div",
              { className: "doc-card-icon-wrap doc-card-icon-wrap--blue" },
              h(
                "svg",
                { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "22", height: "22" },
                h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                h("polyline", { points: "14 2 14 8 20 8" }),
                h("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
                h("line", { x1: "16", y1: "17", x2: "8", y2: "17" })
              )
            ),
            h(
              "span",
              { className: "doc-card-tag doc-card-tag--oficial" },
              "Formulario Oficial"
            )
          ),
          h(
            "div",
            { className: "doc-official-card__body" },
            h("h4", { className: "doc-card-title" }, "Constancia de Alumno Regular"),
            h(
              "p",
              { className: "doc-card-text" },
              "Formulario oficial impreso institucional para certificar la matrícula y regularidad del estudiante ante ANSES, transportes y obras sociales."
            )
          ),
          h(
            "div",
            { className: "doc-official-card__footer" },
            h(
              "button",
              {
                type: "button",
                className: "btn-emitir-doc btn-emitir-doc--primary",
                onClick: onOpenAlumnoRegular
              },
              h(IconoFigma, { className: "btn-emitir-icon", nombre: "clipboard" }),
              h("span", null, "Emitir e Imprimir")
            )
          )
        ),

        // 2. Constancia de Certificado de Estudio en Trámite
        h(
          "article",
          { className: "doc-official-card doc-official-card--tramite" },
          h(
            "div",
            { className: "doc-official-card__header" },
            h(
              "div",
              { className: "doc-card-icon-wrap doc-card-icon-wrap--indigo" },
              h(
                "svg",
                { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "22", height: "22" },
                h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
                h("path", { d: "M6 12v5c3 3 9 3 12 0v-5" })
              )
            ),
            h(
              "span",
              { className: "doc-card-tag doc-card-tag--dgcye" },
              "DGCyE Bs. As."
            )
          ),
          h(
            "div",
            { className: "doc-official-card__body" },
            h("h4", { className: "doc-card-title" }, "Certificado de Estudio en Trámite"),
            h(
              "p",
              { className: "doc-card-text" },
              "Constancia de analítico de estudios en trámite con especificación de materias adeudadas, ciclo, idiomas y validez legal de 30 días."
            )
          ),
          h(
            "div",
            { className: "doc-official-card__footer" },
            h(
              "button",
              {
                type: "button",
                className: "btn-emitir-doc btn-emitir-doc--indigo",
                onClick: onOpenTramitePase
              },
              h(
                "svg",
                { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "16", height: "16" },
                h("polyline", { points: "6 9 6 2 18 2 18 9" }),
                h("path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
                h("rect", { x: "6", y: "14", width: "12", height: "8" })
              ),
              h("span", null, "Emitir e Imprimir")
            )
          )
        ),

        // 3. Solicitud de Pases
        h(
          "article",
          { className: "doc-official-card doc-official-card--pase" },
          h(
            "div",
            { className: "doc-official-card__header" },
            h(
              "div",
              { className: "doc-card-icon-wrap doc-card-icon-wrap--amber" },
              h(
                "svg",
                { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "22", height: "22" },
                h("path", { d: "M16 17l5-5-5-5" }),
                h("path", { d: "M21 12H9" }),
                h("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" })
              )
            ),
            h(
              "span",
              { className: "doc-card-tag doc-card-tag--pase" },
              "Pase Institucional"
            )
          ),
          h(
            "div",
            { className: "doc-official-card__body" },
            h("h4", { className: "doc-card-title" }, "Solicitud de Pases"),
            h(
              "p",
              { className: "doc-card-text" },
              "Formulario oficial mediante el cual la Dirección solicita o concede el pase del alumno a otro establecimiento del distrito o provincia."
            )
          ),
          h(
            "div",
            { className: "doc-official-card__footer" },
            h(
              "button",
              {
                type: "button",
                className: "btn-emitir-doc btn-emitir-doc--amber",
                onClick: onOpenSolicitudPase
              },
              h(
                "svg",
                { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "16", height: "16" },
                h("path", { d: "M16 17l5-5-5-5" }),
                h("path", { d: "M21 12H9" })
              ),
              h("span", null, "Confeccionar Pase")
            )
          )
        ),

        // 4. Situación Académica
        h(
          "article",
          { className: "doc-official-card" },
          h(
            "div",
            { className: "doc-official-card__header" },
            h(
              "div",
              { className: "doc-card-icon-wrap doc-card-icon-wrap--emerald" },
              h(
                "svg",
                { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "22", height: "22" },
                h("path", { d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" })
              )
            ),
            h("span", { className: "doc-card-tag" }, "Rendimiento")
          ),
          h(
            "div",
            { className: "doc-official-card__body" },
            h("h4", { className: "doc-card-title" }, "Constancia Situación Académica"),
            h(
              "p",
              { className: "doc-card-text" },
              "Informe de materias cursadas, calificaciones preliminares, asistencias acumuladas y estado de regularidad académica."
            )
          ),
          h(
            "div",
            { className: "doc-official-card__footer" },
            h(
              "button",
              {
                type: "button",
                className: "btn-emitir-doc btn-emitir-doc--secondary",
                onClick: onOpenSituacionAcademica
              },
              "Ver Constancia"
            )
          )
        ),

        // 5. RITE (Trayectorias Educativas)
        h(
          "article",
          { className: "doc-official-card" },
          h(
            "div",
            { className: "doc-official-card__header" },
            h(
              "div",
              { className: "doc-card-icon-wrap doc-card-icon-wrap--purple" },
              h(
                "svg",
                { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "22", height: "22" },
                h("line", { x1: "18", y1: "20", x2: "18", y2: "10" }),
                h("line", { x1: "12", y1: "20", x2: "12", y2: "4" }),
                h("line", { x1: "6", y1: "20", x2: "6", y2: "14" })
              )
            ),
            h("span", { className: "doc-card-tag" }, "Evaluación TEA / TEP")
          ),
          h(
            "div",
            { className: "doc-official-card__body" },
            h("h4", { className: "doc-card-title" }, "RITE (Trayectorias Educativas)"),
            h(
              "p",
              { className: "doc-card-text" },
              "Registro Institucional de Trayectorias Educativas por cuatrimestre con valoración pedagógica (TEA, TEP, TED)."
            )
          ),
          h(
            "div",
            { className: "doc-official-card__footer" },
            h(
              "button",
              {
                type: "button",
                className: "btn-emitir-doc btn-emitir-doc--secondary",
                onClick: onOpenRite
              },
              "Ver RITE"
            )
          )
        ),

        // 6. Planilla de Calificaciones 2026
        h(
          "article",
          { className: "doc-official-card" },
          h(
            "div",
            { className: "doc-official-card__header" },
            h(
              "div",
              { className: "doc-card-icon-wrap doc-card-icon-wrap--slate" },
              h(
                "svg",
                { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "22", height: "22" },
                h("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
                h("path", { d: "M3 9h18M9 21V9" })
              )
            ),
            h("span", { className: "doc-card-tag" }, "Boletín 2026")
          ),
          h(
            "div",
            { className: "doc-official-card__body" },
            h("h4", { className: "doc-card-title" }, "Planilla de Calificaciones"),
            h(
              "p",
              { className: "doc-card-text" },
              "Planilla oficial de notas cuatrimestrales y finales de todas las materias del ciclo lectivo 2026."
            )
          ),
          h(
            "div",
            { className: "doc-official-card__footer" },
            h(
              "button",
              {
                type: "button",
                className: "btn-emitir-doc btn-emitir-doc--secondary",
                onClick: onOpenPlanillaCalificaciones
              },
              "Ver Planilla"
            )
          )
        ),

        // 7. Boletín Digital Oficial (1° a 7° Año)
        h(
          "article",
          { className: "doc-official-card doc-official-card--primary" },
          h(
            "div",
            { className: "doc-official-card__header" },
            h(
              "div",
              { className: "doc-card-icon-wrap doc-card-icon-wrap--blue" },
              h(
                "svg",
                { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "22", height: "22" },
                h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                h("polyline", { points: "14 2 14 8 20 8" }),
                h("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
                h("line", { x1: "16", y1: "17", x2: "8", y2: "17" })
              )
            ),
            h("span", { className: "doc-card-tag doc-card-tag--oficial" }, "Boletín Digital")
          ),
          h(
            "div",
            { className: "doc-official-card__body" },
            h("h4", { className: "doc-card-title" }, "Boletín Digital de Calificaciones"),
            h(
              "p",
              { className: "doc-card-text" },
              "Boletín oficial de calificaciones de 1° a 7° Año con informes cuatrimestrales, instancias de acreditación, pendientes y exportación a PDF y Excel."
            )
          ),
          h(
            "div",
            { className: "doc-official-card__footer" },
            h(
              "button",
              {
                type: "button",
                className: "btn-emitir-doc btn-emitir-doc--primary",
                onClick: onOpenBoletin
              },
              h(IconoFigma, { className: "btn-emitir-icon", nombre: "clipboard" }),
              h("span", null, "Abrir Boletín Digital")
            )
          )
        ),

        // 8. Libro Matriz Oficial
        h(
          "article",
          { className: "doc-official-card doc-official-card--matriz" },
          h(
            "div",
            { className: "doc-official-card__header" },
            h(
              "div",
              { className: "doc-card-icon-wrap doc-card-icon-wrap--dark" },
              h(
                "svg",
                { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "22", height: "22" },
                h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
                h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" })
              )
            ),
            h("span", { className: "doc-card-tag doc-card-tag--matriz" }, "Libro Matriz")
          ),
          h(
            "div",
            { className: "doc-official-card__body" },
            h("h4", { className: "doc-card-title" }, "Libro Matriz y Analítico Oficial"),
            h(
              "p",
              { className: "doc-card-text" },
              "Acta foliada institucional con el historial de calificaciones y acreditaciones de 1° a 7° año de Educación Técnica."
            )
          ),
          h(
            "div",
            { className: "doc-official-card__footer" },
            h(
              "button",
              {
                type: "button",
                className: "btn-emitir-doc btn-emitir-doc--matriz",
                onClick: onOpenMatriz
              },
              "Abrir Libro Matriz (7 Años)"
            )
          )
        )
      )
    ),

    // =========================================================================
    // SECCIÓN 2: LEGAJO DIGITAL Y DOCUMENTOS ADJUNTADOS
    // =========================================================================
    h(
      "section",
      { className: "doc-attached-section" },
      h(
        "div",
        { className: "doc-section-header-row" },
        h(
          "div",
          null,
          h("h3", { className: "doc-section-heading" }, "Legajo Digital y Archivos Adjuntados"),
          h("p", { className: "doc-section-subtext" }, "Documentación presentada por los tutores al momento de la matrícula.")
        ),
        h(
          "button",
          {
            type: "button",
            className: "btn-adjuntar-doc",
            onClick: () => setErrorSubida("La carga de archivos requiere almacenamiento seguro en el servidor, que aún no está configurado.")
          },
          h(
            "svg",
            { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "16", height: "16" },
            h("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
            h("line", { x1: "5", y1: "12", x2: "19", y2: "12" })
          ),
          h("span", null, "Adjuntar Documento")
        )
      ),

      errorSubida
        ? h("p", { className: "doc-upload-warning", role: "alert" }, errorSubida)
        : null,

      h(
        "div",
        { className: "doc-attached-table-wrap" },
        h(
          "table",
          { className: "doc-attached-table" },
          h(
            "thead",
            null,
            h(
              "tr",
              null,
              h("th", null, "Documento"),
              h("th", null, "Tipo / Requisito"),
              h("th", null, "Fecha de Carga"),
              h("th", null, "Tamaño"),
              h("th", null, "Estado"),
              h("th", { className: "text-right" }, "Acciones")
            )
          ),
          h(
            "tbody",
            null,
            documentosAdjuntos.length === 0
              ? h("tr", null, h("td", { colSpan: 6, className: "text-muted" }, "No hay documentos cargados en el servidor."))
              : documentosAdjuntos.map((doc) =>
              h(
                "tr",
                { key: doc.id, className: "doc-attached-row" },
                h(
                  "td",
                  { className: "doc-attached-name-cell" },
                  h(
                    "div",
                    { className: "doc-file-icon" },
                    h(
                      "svg",
                      { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: "16", height: "16" },
                      h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
                      h("polyline", { points: "14 2 14 8 20 8" })
                    )
                  ),
                  h("strong", { className: "doc-file-title" }, doc.nombre)
                ),
                h("td", { className: "text-muted" }, doc.tipo),
                h("td", null, doc.fecha),
                h("td", { className: "text-muted font-mono" }, doc.tamano),
                h(
                  "td",
                  null,
                  h(
                    "span",
                    { className: "badge-doc-verificado" },
                    "✓ ",
                    doc.estado
                  )
                ),
                h(
                  "td",
                  { className: "text-right" },
                  h(
                    "button",
                    {
                      type: "button",
                      className: "btn-table-action",
                      onClick: () => alert(`Descargando ${doc.nombre}...`),
                      title: "Descargar archivo"
                    },
                    "Descargar"
                  )
                )
              )
            )
          )
        )
      )
    ),

    null
  );
}

export default StudentDocumentationTab;
