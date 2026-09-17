import { h } from "../../../../layouts/site-layout.js";

function normalizarEstadoClase(estado) {
  return String(estado || "activa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function StatusBadge({ estado }) {
  const est = estado || "Activa";
  return h("span", { className: `observation-status observation-status--${normalizarEstadoClase(est)}` }, est);
}

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

  const formatearFechaSimple = (fechaStr) => {
    if (!fechaStr) return "—";
    try {
      if (fechaStr.includes("/")) return fechaStr;
      const parts = fechaStr.split("T")[0].split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return fechaStr;
    } catch {
      return fechaStr;
    }
  };

  const formatearObsId = (id) => {
    if (!id) return "#OBS-001";
    const str = String(id).trim();
    if (str.startsWith("#")) return str;
    return `#${str.toUpperCase()}`;
  };

  const saludList = condicionesParticulares.salud || [];
  const pedagogicasList = condicionesParticulares.pedagogicas || [];

  return h(
    "div",
    { className: "student-tab-content-pane" },

    // Sección 7: Observaciones del Alumno
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
            { className: "history-list observations-profile-list" },
            observaciones.map((obs) =>
              h(
                "article",
                { className: "history-item", key: obs.id || Math.random() },
                h(
                  "div",
                  { className: "history-item__main" },
                  h(
                    "div",
                    { className: "history-item__top-grid" },
                    h(
                      "div",
                      { className: "history-item__field" },
                      h("dt", null, "Tipo"),
                      h(
                        "dd",
                        null,
                        h("span", { className: "history-item__value history-item__value--type" }, obs.tipo || "General")
                      )
                    ),
                    h(
                      "div",
                      { className: "history-item__field" },
                      h("dt", null, "Estado"),
                      h("dd", null, h(StatusBadge, { estado: obs.estado || "Activa" }))
                    ),
                    h(
                      "div",
                      { className: "history-item__field" },
                      h("dt", null, "ID"),
                      h(
                        "dd",
                        null,
                        h("span", { className: "history-item__value history-item__value--id" }, formatearObsId(obs.id))
                      )
                    ),
                    h(
                      "div",
                      { className: "history-item__field" },
                      h("dt", null, "Fecha"),
                      h("dd", { className: "font-semibold", style: { color: "#1e293b", fontSize: "14px" } }, formatearFechaSimple(obs.fecha))
                    )
                  ),
                  h(
                    "div",
                    { className: "history-item__content" },
                    h(
                      "div",
                      { className: "history-item__details" },
                      h(
                        "div",
                        { className: "history-item__field history-item__field--full" },
                        h("dt", null, "Descripción"),
                        h("dd", { style: { color: "#1e293b", fontSize: "14.5px", lineHeight: "1.55" } }, obs.descripcion)
                      ),
                      h(
                        "div",
                        { className: "history-item__field" },
                        h("dt", null, "Sector"),
                        h("dd", { style: { fontWeight: "600", color: "#334155" } }, obs.sector || "Preceptoría")
                      ),
                      h(
                        "div",
                        { className: "history-item__field" },
                        h("dt", null, "Responsable"),
                        h("dd", { style: { fontWeight: "600", color: "#334155" } }, obs.usuarioResponsable || obs.responsable || "Personal Institucional")
                      )
                    ),
                    h(
                      "div",
                      { className: "history-item__audit" },
                      h(
                        "div",
                        { className: "history-item__field" },
                        h("dt", null, "Creada"),
                        h(
                          "dd",
                          null,
                          obs.creadoEn ? formatearFechaHora(obs.creadoEn) : obs.creada || formatearFechaSimple(obs.fecha)
                        )
                      ),
                      h(
                        "div",
                        { className: "history-item__field" },
                        h("dt", null, "Modificada"),
                        h(
                          "dd",
                          null,
                          obs.actualizadoEn && obs.actualizadoEn !== obs.creadoEn
                            ? formatearFechaHora(obs.actualizadoEn)
                            : obs.modificada || "—"
                        )
                      )
                    )
                  )
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
          h("h3", { className: "condition-subcard-title" },
            h("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "#059669", strokeWidth: "2" },
              h("path", { d: "M22 12h-4l-3 9L9 3l-3 9H2" })
            ),
            "Salud y Cuidados Especiales"
          ),
          saludList.length > 0
            ? saludList.map((c, i) =>
                h(
                  "div",
                  { key: i, className: "condition-entry condition-entry--salud" },
                  h("div", { className: "condition-entry-header" },
                    h("span", { className: "condition-type" }, c.tipo || "Salud / Médica"),
                    h(StatusBadge, { estado: c.estado || "Vigente" })
                  ),
                  h("p", { className: "condition-desc" }, c.descripcion),
                  c.observaciones ? h("div", { className: "condition-notes" }, h("strong", null, "Nota:"), ` ${c.observaciones}`) : null,
                  h("div", { className: "condition-responsible" }, h("strong", null, "Responsable:"), ` ${c.usuarioResponsable || "Secretaría / Enfermería"}`)
                )
              )
            : h("p", { className: "text-muted text-sm" }, "No registra condiciones de salud particulares.")
        ),

        // Condiciones Pedagógicas / Inclusión
        h(
          "div",
          { className: "condition-subcard" },
          h("h3", { className: "condition-subcard-title" },
            h("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "#2563eb", strokeWidth: "2" },
              h("path", { d: "M12 14l9-5-9-5-9 5 9 5z" }),
              h("path", { d: "M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" })
            ),
            "Orientación y Adecuaciones Pedagógicas"
          ),
          pedagogicasList.length > 0
            ? pedagogicasList.map((p, i) =>
                h(
                  "div",
                  { key: i, className: "condition-entry condition-entry--pedagogica" },
                  h("div", { className: "condition-entry-header" },
                    h("span", { className: "condition-type" }, p.tipo || "Adecuación Curricular"),
                    h(StatusBadge, { estado: p.estado || "Activa" })
                  ),
                  h("p", { className: "condition-desc" }, p.descripcion),
                  p.observaciones ? h("div", { className: "condition-notes" }, h("strong", null, "Seguimiento:"), ` ${p.observaciones}`) : null,
                  h("div", { className: "condition-responsible" }, h("strong", null, "Equipo:"), ` ${p.usuarioResponsable || "Equipo de Orientación Escolar (EOE)"}`)
                )
              )
            : h("p", { className: "text-muted text-sm" }, "Sin adecuaciones curriculares registradas.")
        )
      )
    )
  );
}

