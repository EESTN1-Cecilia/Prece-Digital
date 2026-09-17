import { h } from "../../../../layouts/site-layout.js";

/**
 * StudentAttendanceTab: Muestra el historial completo y desglose estadístico de inasistencias del alumno.
 */
export function StudentAttendanceTab({ inasistencias = {} }) {
  const resumen = inasistencias.resumen || {};
  const detalle = inasistencias.detalle || [];

  const formatearFechaHora = (fechaStr) => {
    if (!fechaStr) return "—";
    try {
      const d = new Date(fechaStr);
      return d.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return fechaStr;
    }
  };

  const formatearFechaSimple = (fechaStr) => {
    if (!fechaStr) return "—";
    try {
      const parts = fechaStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return fechaStr;
    } catch {
      return fechaStr;
    }
  };

  const alertaActiva = resumen.alertaInasistencias || (resumen.total >= 15);

  return h(
    "div",
    { className: "student-tab-content-pane" },

    // Sección 6: Resumen de Inasistencias
    h(
      "div",
      { className: "profile-section-card" },
      h(
        "div",
        { className: "profile-section-header" },
        h(
          "div",
          { className: "profile-section-title-wrap" },
          h(
            "div",
            { className: "section-icon-badge" },
            h(
              "svg",
              { className: "profile-section-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }),
              h("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
              h("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
              h("line", { x1: "3", y1: "10", x2: "21", y2: "10" })
            )
          ),
          h(
            "div",
            null,
            h("h2", { className: "profile-section-title" }, "6. Inasistencias y Asistencia Escolar"),
            h("span", { className: "profile-section-subtitle-inline" }, `Período computado: ${resumen.periodo || "Ciclo Lectivo 2026"}`)
          )
        )
      ),

      // Banner de alerta si supera el límite
      alertaActiva
        ? h(
            "div",
            { className: "alert-banner-box danger" },
            h(
              "svg",
              {
                className: "alert-banner-icon",
                viewBox: "0 0 20 20",
                fill: "currentColor",
                style: { width: "20px", height: "20px", minWidth: "20px", flexShrink: 0 }
              },
              h("path", { fillRule: "evenodd", d: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z", clipRule: "evenodd" })
            ),
            h(
              "div",
              { className: "alert-banner-content" },
              h("strong", null, "Atención: Límite de inasistencias alcanzado"),
              h("p", null, `El alumno posee ${resumen.total || 0} inasistencias acumuladas (${resumen.injustificadas || 0} injustificadas). Requiere justificación o solicitud de reincorporación.`)
            )
          )
        : null,

      // Tarjetas de métricas
      h(
        "div",
        { className: "attendance-kpi-grid" },
        h(
          "div",
          { className: `attendance-kpi-card ${alertaActiva ? "danger" : ""}` },
          h("span", { className: "kpi-num" }, String(resumen.total ?? 0)),
          h("span", { className: "kpi-lbl" }, "Total Inasistencias")
        ),
        h(
          "div",
          { className: "attendance-kpi-card success" },
          h("span", { className: "kpi-num" }, String(resumen.justificadas ?? 0)),
          h("span", { className: "kpi-lbl" }, "Justificadas")
        ),
        h(
          "div",
          { className: "attendance-kpi-card warning" },
          h("span", { className: "kpi-num" }, String(resumen.injustificadas ?? 0)),
          h("span", { className: "kpi-lbl" }, "Injustificadas")
        ),
        h(
          "div",
          { className: "attendance-kpi-card accent" },
          h("span", { className: "kpi-num" }, `${resumen.porcentajeAsistencia ?? 100}%`),
          h("span", { className: "kpi-lbl" }, "Porcentaje Asistencia")
        )
      )
    ),

    // Sección de Detalle de Inasistencias
    h(
      "div",
      { className: "profile-section-card" },
      h(
        "div",
        { className: "profile-section-header" },
        h("h3", { className: "profile-section-title text-base font-semibold" }, "Historial Detallado de Inasistencias"),
        h("span", { className: "profile-section-subtitle" }, `${detalle.length} registros computados`)
      ),

      detalle && detalle.length > 0
        ? h(
            "div",
            { className: "table-responsive-wrapper" },
            h(
              "table",
              { className: "data-table attendance-table" },
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  h("th", null, "Fecha"),
                  h("th", null, "Tipo"),
                  h("th", null, "Estado"),
                  h("th", null, "Justificación / Motivo"),
                  h("th", null, "Observación"),
                  h("th", null, "Registrado Por"),
                  h("th", null, "Fecha Registro")
                )
              ),
              h(
                "tbody",
                null,
                detalle.map((item, idx) =>
                  h(
                    "tr",
                    { key: item.id || idx },
                    h("td", { className: "font-mono font-medium" }, formatearFechaSimple(item.fecha)),
                    h(
                      "td",
                      null,
                      h(
                        "span",
                        {
                          className: `badge-inasistencia ${
                            item.tipo?.toLowerCase().includes("justificada") && !item.tipo?.toLowerCase().includes("injustificada")
                              ? "justificada"
                              : "injustificada"
                          }`
                        },
                        item.tipo || "Injustificada"
                      )
                    ),
                    h("td", null, item.estado || "Registrada"),
                    h(
                      "td",
                      null,
                      item.justificacion
                        ? h("span", { className: "font-medium" }, item.justificacion)
                        : h("span", { className: "text-muted" }, item.motivo || "Sin justificativo")
                    ),
                    h("td", { className: "text-muted text-sm" }, item.observacion || "—"),
                    h("td", { className: "text-sm font-medium" }, item.usuarioRegistro || "Preceptoría"),
                    h("td", { className: "text-xs text-muted" }, formatearFechaHora(item.fechaRegistro))
                  )
                )
              )
            )
          )
        : h(
            "div",
            { className: "empty-state-card" },
            h("p", null, "El alumno no registra inasistencias en el período seleccionado.")
          )
    )
  );
}
