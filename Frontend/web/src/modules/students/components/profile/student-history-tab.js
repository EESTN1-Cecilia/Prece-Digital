import { h } from "../../../../layouts/site-layout.js";

/**
 * StudentHistoryTab: Auditoría y registro de modificaciones históricas en el perfil del alumno.
 */
export function StudentHistoryTab({ historial = [] }) {
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

  return h(
    "div",
    { className: "student-tab-content-pane" },

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
            "svg",
            { className: "profile-section-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            h("circle", { cx: "12", cy: "12", r: "10" }),
            h("polyline", { points: "12 6 12 12 16 14" })
          ),
          h("h2", { className: "profile-section-title" }, "10. Historial de Cambios y Auditoría")
        ),
        h("span", { className: "profile-section-subtitle" }, "Trazabilidad inmutable de eventos y modificaciones administrativas")
      ),

      historial && historial.length > 0
        ? h(
            "div",
            { className: "audit-history-timeline" },
            historial.map((item, idx) =>
              h(
                "div",
                { key: item.id || idx, className: "audit-entry-card" },
                h(
                  "div",
                  { className: "audit-entry-header" },
                  h(
                    "div",
                    { className: "audit-entry-title-wrap" },
                    h("span", { className: "audit-type-tag" }, item.tipoCambio || "Modificación"),
                    h("span", { className: "audit-timestamp" }, formatearFechaHora(item.fecha))
                  ),
                  h(
                    "div",
                    { className: "audit-user-info" },
                    h("span", { className: "audit-user font-medium" }, `Usuario: ${item.usuario || "admin"}`),
                    item.sector ? h("span", { className: "audit-sector text-muted text-xs" }, ` • Sector: ${item.sector}`) : null
                  )
                ),
                h("p", { className: "audit-description" }, item.descripcion),
                (item.anterior || item.nuevo)
                  ? h(
                      "div",
                      { className: "audit-diff-box" },
                      item.anterior
                        ? h("div", { className: "diff-prev" },
                            h("span", { className: "diff-label" }, "Anterior:"),
                            h("span", { className: "diff-content" }, String(item.anterior))
                          )
                        : null,
                      item.nuevo
                        ? h("div", { className: "diff-next" },
                            h("span", { className: "diff-label" }, "Nuevo:"),
                            h("span", { className: "diff-content" }, String(item.nuevo))
                          )
                        : null
                    )
                  : null,
                h(
                  "div",
                  { className: "audit-footer" },
                  h("span", { className: "text-xs text-muted" }, `Registro ID: ${item.id || idx + 1}`)
                )
              )
            )
          )
        : h(
            "div",
            { className: "empty-state-card" },
            h("p", null, "No hay registros de modificaciones para este alumno.")
          )
    )
  );
}
