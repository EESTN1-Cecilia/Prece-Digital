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
  onOpenMatriz
}) {
  const [documentosAdjuntos, setDocumentosAdjuntos] = useState([
    {
      id: "doc-1",
      nombre: "DNI_Estudiante_Frente_Dorso.pdf",
      tipo: "DNI del Estudiante",
      fecha: "02/03/2026",
      tamano: "1.4 MB",
      estado: "Verificado"
    },
    {
      id: "doc-2",
      nombre: "DNI_Tutor_Responsable.pdf",
      tipo: "DNI Tutores / Responsables",
      fecha: "02/03/2026",
      tamano: "1.2 MB",
      estado: "Verificado"
    },
    {
      id: "doc-3",
      nombre: "Partida_Nacimiento_Legalizada.pdf",
      tipo: "Partida de Nacimiento",
      fecha: "02/03/2026",
      tamano: "2.1 MB",
      estado: "Verificado"
    },
    {
      id: "doc-4",
      nombre: "Ficha_Medica_Salud_2026.pdf",
      tipo: "Ficha de Salud y Vacunación",
      fecha: "05/03/2026",
      tamano: "890 KB",
      estado: "Verificado"
    },
    {
      id: "doc-5",
      nombre: "Certificado_Estudios_Primarios.pdf",
      tipo: "Certificado de Nivel Primario / Pase",
      fecha: "02/03/2026",
      tamano: "3.4 MB",
      estado: "Verificado"
    }
  ]);

  const [modalSubirAbierto, setModalSubirAbierto] = useState(false);
  const [nuevoDocTipo, setNuevoDocTipo] = useState("Constancia Médica");
  const [nuevoDocNombre, setNuevoDocNombre] = useState("");

  const handleSubirDocumento = (e) => {
    e.preventDefault();
    if (!nuevoDocNombre.trim()) return;

    const nuevoItem = {
      id: `doc-${Date.now()}`,
      nombre: `${nuevoDocNombre.trim().replace(/\s+/g, "_")}.pdf`,
      tipo: nuevoDocTipo,
      fecha: new Date().toLocaleDateString("es-AR"),
      tamano: "1.1 MB",
      estado: "Verificado"
    };

    setDocumentosAdjuntos([nuevoItem, ...documentosAdjuntos]);
    setNuevoDocNombre("");
    setModalSubirAbierto(false);
  };

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
              "Gráfica Escolar"
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

        // 7. Libro Matriz Oficial
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
            onClick: () => setModalSubirAbierto(true)
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
            documentosAdjuntos.map((doc) =>
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

    // Modal simple para Adjuntar Documento Mock
    modalSubirAbierto
      ? h(
          "div",
          { className: "matriz-modal-backdrop", onClick: () => setModalSubirAbierto(false) },
          h(
            "div",
            {
              className: "modal-container modal-md",
              onClick: (e) => e.stopPropagation(),
              role: "dialog",
              "aria-modal": "true"
            },
            h(
              "div",
              { className: "modal-header" },
              h("h3", { className: "modal-title" }, "Adjuntar Documento al Legajo"),
              h(
                "button",
                {
                  type: "button",
                  className: "modal-close-btn",
                  onClick: () => setModalSubirAbierto(false)
                },
                "✕"
              )
            ),
            h(
              "form",
              { onSubmit: handleSubirDocumento, className: "modal-body" },
              h(
                "div",
                { className: "form-group", style: { marginBottom: "16px" } },
                h("label", { className: "form-label" }, "Tipo de Documento:"),
                h(
                  "select",
                  {
                    className: "form-select",
                    value: nuevoDocTipo,
                    onChange: (e) => setNuevoDocTipo(e.target.value)
                  },
                  h("option", { value: "Constancia Médica" }, "Constancia Médica / Certificado de Aptitud"),
                  h("option", { value: "Partida de Nacimiento" }, "Partida de Nacimiento"),
                  h("option", { value: "DNI Tutores" }, "DNI de Padres o Tutores"),
                  h("option", { value: "Pase Legalizado" }, "Pase o Constancia de Escuela de Origen"),
                  h("option", { value: "Documento Judicial" }, "Documentación Judicial o Custodia"),
                  h("option", { value: "Otro Documento" }, "Otro Documento")
                )
              ),
              h(
                "div",
                { className: "form-group", style: { marginBottom: "20px" } },
                h("label", { className: "form-label" }, "Nombre descriptivo del archivo:"),
                h("input", {
                  type: "text",
                  className: "form-input",
                  placeholder: "Ej: Certificado_Aptitud_Fisica_2026",
                  value: nuevoDocNombre,
                  onChange: (e) => setNuevoDocNombre(e.target.value),
                  required: true,
                  autoFocus: true
                })
              ),
              h(
                "div",
                { className: "modal-footer" },
                h(
                  "button",
                  {
                    type: "button",
                    className: "action-button action-button--secondary",
                    onClick: () => setModalSubirAbierto(false)
                  },
                  "Cancelar"
                ),
                h(
                  "button",
                  {
                    type: "submit",
                    className: "action-button action-button--primary"
                  },
                  "Guardar en Legajo"
                )
              )
            )
          )
        )
      : null
  );
}

export default StudentDocumentationTab;
