import { h } from "../../../../layouts/site-layout.js";

/**
 * StudentObservationsTab: Presenta las observaciones institucionales registradas y las condiciones particulares (salud, pedagógicas).
 */
export function StudentObservationsTab({
  observaciones = [],
  condicionesParticulares = {},
  onOpenObservationModal,
  puedeRegistrar = true
}) {
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

  const getTipoBadgeClass = (tipo) => {
    const t = String(tipo || "").toLowerCase();
    if (t.includes("pedag")) return "tipo-badge-pedagogica";
    if (t.includes("admin")) return "tipo-badge-administrativa";
    if (t.includes("conviv")) return "tipo-badge-convivencia";
    if (t.includes("salud")) return "tipo-badge-salud";
    return "tipo-badge-general";
  };

  const saludList = condicionesParticulares.salud || [];
  const pedagogicasList = condicionesParticulares.pedagogicas || [];

  return h(
    "div",
    { className: "student-tab-content-pane" },

    // Sección 7: Observaciones
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
              h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
              h("polyline", { points: "14 2 14 8 20 8" }),
              h("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
              h("line", { x1: "16", y1: "17", x2: "8", y2: "17" }),
              h("polyline", { points: "10 9 9 9 8 9" })
            )
          ),
          h(
            "div",
            null,
            h("h2", { className: "profile-section-title" }, "7. Observaciones del Alumno"),
            h("span", { className: "profile-section-subtitle-inline" }, "Registro cronológico de novedades y seguimiento")
          )
        ),
        puedeRegistrar
          ? h(
              "button",
              {
                type: "button",
                className: "btn-action-primary",
                onClick: onOpenObservationModal
              },
              h(
                "svg",
                { className: "btn-action-icon", viewBox: "0 0 20 20", fill: "currentColor" },
                h("path", { d: "M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" })
              ),
              h("span", null, "Registrar Nueva Observación")
            )
          : null
      ),

      observaciones && observaciones.length > 0
        ? h(
            "div",
            { className: "observations-timeline" },
            observaciones.map((obs) =>
              h(
                "div",
                { key: obs.id, className: "obs-item-card" },
                h(
                  "div",
                  { className: "obs-item-header" },
                  h(
                    "div",
                    { className: "obs-item-meta" },
                    h("span", { className: `obs-tipo-badge ${getTipoBadgeClass(obs.tipo)}` }, obs.tipo || "General"),
                    h("span", { className: "obs-fecha" }, formatearFechaSimple(obs.fecha)),
                    h("span", { className: "obs-sector" }, `Sector: ${obs.sector || "Preceptoría"}`),
                    obs.estado
                      ? h("span", { className: "obs-estado-pill" }, obs.estado)
                      : null
                  ),
                  h("span", { className: "obs-user" }, `Responsable: ${obs.usuarioResponsable || "Personal Institucional"}`)
                ),
                h("p", { className: "obs-description" }, obs.descripcion),
                h(
                  "div",
                  { className: "obs-item-footer" },
                  h("span", { className: "text-xs text-muted" }, `Registro ID: ${obs.id}`),
                  obs.creadoEn
                    ? h("span", { className: "text-xs text-muted" }, `Registrado: ${formatearFechaHora(obs.creadoEn)}`)
                    : null
                )
              )
            )
          )
        : h(
            "div",
            { className: "empty-state-card" },
            h("p", null, "No hay observaciones registradas para este alumno.")
          )
    ),

    // Sección 8: Condiciones Particulares
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
              h("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })
            )
          ),
          h(
            "div",
            null,
            h("h2", { className: "profile-section-title" }, "8. Condiciones Particulares"),
            h("span", { className: "profile-section-subtitle-inline" }, "Salud, adaptaciones curriculares y equipo de orientación")
          )
        )
      ),

      h(
        "div",
        { className: "conditions-grid" },

        // Condiciones de Salud
        h(
          "div",
          { className: "condition-subcard" },
          h("h3", { className: "condition-subcard-title" }, "Salud y Cuidados Especiales"),
          saludList.length > 0
            ? saludList.map((c, i) =>
                h(
                  "div",
                  { key: i, className: "condition-entry" },
                  h("div", { className: "condition-entry-header" },
                    h("span", { className: "condition-type font-semibold" }, c.tipo || "Salud"),
                    h("span", { className: "condition-status active" }, c.estado || "Vigente")
                  ),
                  h("p", { className: "condition-desc" }, c.descripcion),
                  c.observaciones ? h("p", { className: "condition-notes" }, `Nota: ${c.observaciones}`) : null,
                  h("span", { className: "condition-responsible" }, `Responsable: ${c.usuarioResponsable || "Secretaría / Enfermería"}`)
                )
              )
            : h("p", { className: "text-muted text-sm" }, "No registra condiciones de salud particulares.")
        ),

        // Condiciones Pedagógicas / Inclusión
        h(
          "div",
          { className: "condition-subcard" },
          h("h3", { className: "condition-subcard-title" }, "Orientación y Adecuaciones Pedagógicas"),
          pedagogicasList.length > 0
            ? pedagogicasList.map((p, i) =>
                h(
                  "div",
                  { key: i, className: "condition-entry" },
                  h("div", { className: "condition-entry-header" },
                    h("span", { className: "condition-type font-semibold" }, p.tipo || "Pedagógica"),
                    h("span", { className: "condition-status active" }, p.estado || "Activa")
                  ),
                  h("p", { className: "condition-desc" }, p.descripcion),
                  p.observaciones ? h("p", { className: "condition-notes" }, `Seguimiento: ${p.observaciones}`) : null,
                  h("span", { className: "condition-responsible" }, `Equipo: ${p.usuarioResponsable || "EOE"}`)
                )
              )
            : h("p", { className: "text-muted text-sm" }, "Sin adecuaciones curriculares registradas.")
        )
      )
    )
  );
}
