import { h, IconoFigma } from "../../../../layouts/site-layout.js";

/**
 * StudentPersonalTab: Muestra la información personal, datos de contacto y responsables/tutores.
 */
export function StudentPersonalTab({ datosPersonales = {}, contacto = {}, tutores = [] }) {
  const formatearFecha = (fecha) => {
    if (!fecha) return "No registrado";
    try {
      const parts = fecha.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return fecha;
    } catch {
      return fecha;
    }
  };

  const lugarNacimiento = typeof datosPersonales.lugarNacimiento === "object"
    ? `${datosPersonales.lugarNacimiento.localidad || "Monte Grande"}, ${datosPersonales.lugarNacimiento.provincia || "Buenos Aires"} (${datosPersonales.lugarNacimiento.pais || "Argentina"})`
    : datosPersonales.lugarNacimiento || "Monte Grande, Buenos Aires";

  return h(
    "div",
    { className: "student-tab-content-pane" },

    // Sección 1: Datos Personales
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
              h("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
              h("circle", { cx: "12", cy: "7", r: "4" })
            )
          ),
          h(
            "div",
            null,
            h("h2", { className: "profile-section-title" }, "1. Datos Personales"),
            h("span", { className: "profile-section-subtitle-inline" }, "Identificación oficial y antecedentes registrados")
          )
        )
      ),
      h(
        "div",
        { className: "profile-data-grid" },
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "ID de Alumno"),
          h("span", { className: "profile-field-value mono font-semibold" }, String(datosPersonales.id || "S/D"))
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Nombre"),
          h("span", { className: "profile-field-value" }, datosPersonales.nombre || "S/D")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Apellido"),
          h("span", { className: "profile-field-value" }, datosPersonales.apellido || "S/D")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Nombre Completo"),
          h("span", { className: "profile-field-value font-bold" }, datosPersonales.nombreCompleto || `${datosPersonales.apellido}, ${datosPersonales.nombre}`)
        ),
        h("div", { className: "profile-field-item highlight-field" },
          h("span", { className: "profile-field-label" }, "DNI"),
          h("span", { className: "profile-field-value font-bold text-accent" }, datosPersonales.dni || "S/D")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "CUIL"),
          h("span", { className: "profile-field-value mono" }, datosPersonales.cuil || "S/D")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Fecha de Nacimiento"),
          h("span", { className: "profile-field-value font-medium" }, formatearFecha(datosPersonales.fechaNacimiento))
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Lugar de Nacimiento"),
          h("span", { className: "profile-field-value" }, lugarNacimiento)
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Nacionalidad"),
          h("span", { className: "profile-field-value" }, datosPersonales.nacionalidad || "Argentina")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Género"),
          h("span", { className: "profile-field-value" }, datosPersonales.genero || "No especificado")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Domicilio Real"),
          h("span", { className: "profile-field-value font-medium" }, datosPersonales.domicilio || "S/D")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Localidad"),
          h("span", { className: "profile-field-value" }, datosPersonales.localidad || "Monte Grande")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Código Postal"),
          h("span", { className: "profile-field-value font-mono" }, datosPersonales.codigoPostal || "1842")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Estado del Alumno"),
          h("span", { className: "profile-field-value status-indicator font-bold" }, datosPersonales.estado || "Activo")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Fecha de Ingreso"),
          h("span", { className: "profile-field-value font-medium" }, formatearFecha(datosPersonales.fechaIngreso))
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Año Lectivo Actual"),
          h("span", { className: "profile-field-value font-semibold" }, String(datosPersonales.anioLectivoActual || 2026))
        )
      )
    ),

    // Sección 2: Información de Contacto
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
              h("path", { d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" })
            )
          ),
          h(
            "div",
            null,
            h("h2", { className: "profile-section-title" }, "2. Información de Contacto"),
            h("span", { className: "profile-section-subtitle-inline" }, "Canales de comunicación directos")
          )
        )
      ),
      h(
        "div",
        { className: "profile-data-grid" },
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Teléfono"),
          h("span", { className: "profile-field-value font-medium" }, contacto.telefono || "No especificado")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Teléfono Alternativo / Emergencias"),
          h("span", { className: "profile-field-value" }, contacto.telefonoAlternativo || "No registrado")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Correo Electrónico Institucional"),
          h("span", { className: "profile-field-value text-link" }, contacto.email || "No asignado")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Domicilio Actual"),
          h("span", { className: "profile-field-value" }, contacto.domicilio || "No registrado")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Localidad"),
          h("span", { className: "profile-field-value" }, contacto.localidad || "Monte Grande")
        ),
        h("div", { className: "profile-field-item" },
          h("span", { className: "profile-field-label" }, "Información Adicional de Contacto"),
          h("span", { className: "profile-field-value text-muted" }, contacto.observacionesContacto || "Sin observaciones adicionales")
        )
      )
    ),

    // Sección 3: Padres y Tutores
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
              h("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
              h("circle", { cx: "9", cy: "7", r: "4" }),
              h("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
              h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
            )
          ),
          h(
            "div",
            null,
            h("h2", { className: "profile-section-title" }, "3. Padres y Tutores"),
            h("span", { className: "profile-section-subtitle-inline" }, "Responsables legales y adultos autorizados")
          )
        )
      ),

      tutores && tutores.length > 0
        ? h(
            "div",
            { className: "tutors-grid" },
            tutores.map((tutor) =>
              h(
                "div",
                {
                  key: tutor.id,
                  className: `tutor-card ${tutor.tutorPrincipal ? "tutor-card-primary" : ""}`
                },
                h(
                  "div",
                  { className: "tutor-card-header" },
                  h(
                    "div",
                    { className: "tutor-name-wrap" },
                    h("h3", { className: "tutor-name" }, `${tutor.apellido || ""}, ${tutor.nombre || ""}`),
                    h("span", { className: "tutor-relation-pill" }, tutor.parentesco || "Tutor")
                  ),
                  tutor.tutorPrincipal
                    ? h("span", { className: "tutor-badge-main" }, "Tutor Principal")
                    : h("span", { className: "tutor-badge-secondary" }, "Tutor Secundario")
                ),
                h(
                  "div",
                  { className: "tutor-details-grid" },
                  h("div", { className: "tutor-detail-item" },
                    h("span", { className: "label" }, "DNI:"),
                    h("span", { className: "val" }, tutor.dni || "S/D")
                  ),
                  h("div", { className: "tutor-detail-item" },
                    h("span", { className: "label" }, "Teléfono:"),
                    h("span", { className: "val font-semibold" }, tutor.telefono || "No especificado")
                  ),
                  h("div", { className: "tutor-detail-item" },
                    h("span", { className: "label" }, "Email:"),
                    h("span", { className: "val" }, tutor.email || "No registrado")
                  ),
                  h("div", { className: "tutor-detail-item" },
                    h("span", { className: "label" }, "Domicilio:"),
                    h("span", { className: "val" }, tutor.domicilio || "Mismo que el alumno")
                  ),
                  h("div", { className: "tutor-detail-item" },
                    h("span", { className: "label" }, "Estado del Vínculo:"),
                    h("span", { className: "val status-tag active" }, tutor.estadoVinculo || "Activo")
                  ),
                  h("div", { className: "tutor-detail-item" },
                    h("span", { className: "label" }, "Autorizado a Retiro:"),
                    h("span", { className: "val" }, tutor.autorizadoRetiro !== false ? "✓ Sí, autorizado" : "✗ No autorizado")
                  )
                )
              )
            )
          )
        : h(
            "div",
            { className: "empty-state-card" },
            h("p", null, "El alumno no posee tutores o responsables legales registrados actualmente.")
          )
    )
  );
}
