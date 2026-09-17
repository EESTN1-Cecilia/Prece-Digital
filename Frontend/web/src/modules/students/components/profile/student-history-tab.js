import { h } from "../../../../layouts/site-layout.js";

/**
 * StudentHistoryTab: Auditoría y registro de modificaciones históricas en el perfil del alumno.
 */
export function StudentHistoryTab({ historial = [] }) {
  const formatearFechaHora = (fechaStr) => {
    if (!fechaStr) return "—";
    try {
      const d = new Date(fechaStr);
      if (isNaN(d.getTime())) return fechaStr;
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

  const getTipoModifier = (tipo) => {
    const t = String(tipo || "").toLowerCase();
    if (t.includes("alta") || t.includes("inscrip")) return "alta";
    if (t.includes("actualiz") || t.includes("modif") || t.includes("domicilio")) return "actualizacion";
    if (t.includes("pase") || t.includes("transfer")) return "pase";
    if (t.includes("baja") || t.includes("egres")) return "baja";
    return "general";
  };

  const getTipoTagClass = (tipo) => {
    const mod = getTipoModifier(tipo);
    return `audit-type-tag audit-type-tag--${mod}`;
  };

  const getCardClass = (tipo) => {
    const mod = getTipoModifier(tipo);
    return `audit-entry-card audit-entry-card--${mod}`;
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
            "div",
            { className: "section-icon-badge" },
            h(
              "svg",
              { className: "profile-section-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("circle", { cx: "12", cy: "12", r: "10" }),
              h("polyline", { points: "12 6 12 12 16 14" })
            )
          ),
          h(
            "div",
            null,
            h("h2", { className: "profile-section-title" }, "10. Historial de Cambios y Auditoría"),
            h("span", { className: "profile-section-subtitle-inline" }, "Trazabilidad inmutable de eventos y modificaciones administrativas")
          )
        )
      ),

      historial && historial.length > 0
        ? h(
            "div",
            { className: "audit-history-timeline" },
            historial.map((item, idx) =>
              h(
                "article",
                { key: item.id || idx, className: getCardClass(item.tipoCambio) },
                h(
                  "div",
                  { className: "audit-entry-header" },
                  h(
                    "div",
                    { className: "audit-entry-title-wrap" },
                    h("span", { className: getTipoTagClass(item.tipoCambio) }, item.tipoCambio || "Modificación"),
                    h(
                      "span",
                      { className: "audit-timestamp" },
                      h(
                        "svg",
                        { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                        h("circle", { cx: "12", cy: "12", r: "10" }),
                        h("polyline", { points: "12 6 12 12 16 14" })
                      ),
                      formatearFechaHora(item.fecha)
                    )
                  ),
                  h(
                    "div",
                    { className: "audit-user-info" },
                    h(
                      "div",
                      { className: "audit-user-badge" },
                      h(
                        "svg",
                        { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                        h("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
                        h("circle", { cx: "12", cy: "7", r: "4" })
                      ),
                      `Usuario: ${item.usuario || "admin"}`
                    ),
                    item.sector
                      ? h("span", { className: "audit-sector-badge" }, `• Sector: ${item.sector}`)
                      : null
                  )
                ),
                h("p", { className: "audit-description" }, item.descripcion),
                item.anterior || item.nuevo
                  ? h(
                      "div",
                      { className: "audit-diff-box" },
                      item.anterior
                        ? h(
                            "div",
                            { className: "diff-prev" },
                            h("span", { className: "diff-chip diff-chip--prev" }, "Anterior"),
                            h("span", { className: "diff-content" }, String(item.anterior))
                          )
                        : null,
                      item.nuevo
                        ? h(
                            "div",
                            { className: "diff-next" },
                            h("span", { className: "diff-chip diff-chip--next" }, "Nuevo"),
                            h("span", { className: "diff-content" }, String(item.nuevo))
                          )
                        : null
                    )
                  : null,
                h(
                  "div",
                  { className: "audit-footer" },
                  h("span", { className: "audit-id-badge" }, `ID: ${item.id || `hist-${idx + 1}`}`),
                  h(
                    "span",
                    { className: "audit-certified-tag" },
                    h(
                      "svg",
                      { width: "13", height: "13", viewBox: "0 0 20 20", fill: "currentColor" },
                      h("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" })
                    ),
                    "Registro inmutable de auditoría"
                  )
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

