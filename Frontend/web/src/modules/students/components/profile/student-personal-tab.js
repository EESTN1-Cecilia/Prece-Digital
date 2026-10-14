import React, { useState, useEffect } from "react";
import { h, IconoFigma } from "../../../../layouts/site-layout.js";

/**
 * Ícono de lápiz en formato SVG vectorial (sin emojis).
 */
function IconPencil({ className = "profile-field-edit-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("path", { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" }),
    h("path", { d: "m15 5 4 4" })
  );
}

/**
 * Ícono de confirmación (check) en formato SVG vectorial.
 */
function IconCheck({ className = "profile-field-inline-action-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("polyline", { points: "20 6 9 17 4 12" })
  );
}

/**
 * Ícono de cancelación (cruz) en formato SVG vectorial.
 */
function IconClose({ className = "profile-field-inline-action-icon" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
    h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
  );
}

/**
 * Ícono de cargando (spinner) en formato SVG vectorial.
 */
function IconSpinner({ className = "profile-field-inline-action-icon spinning" }) {
  return h(
    "svg",
    {
      className,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    h("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" })
  );
}

/**
 * Componente para renderizar una tarjeta de campo individual con soporte de edición en línea (in-place).
 */
function ProfileFieldItem({
  label,
  value,
  displayValue,
  fieldKey,
  className = "",
  valueClassName = "",
  editable = true,
  type = "text",
  options = null,
  required = false,
  onSave
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const renderedVal = displayValue !== undefined ? displayValue : (value || "S/D");

  useEffect(() => {
    if (!isEditing) {
      let initial = value ?? "";
      if (type === "date" && initial) {
        initial = String(initial).split("T")[0];
      }
      setInputValue(initial);
      setError("");
    }
  }, [value, isEditing, type]);

  const startEditing = () => {
    let initial = value ?? "";
    if (type === "date" && initial) {
      initial = String(initial).split("T")[0];
    }
    setInputValue(initial);
    setError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setError("");
    let initial = value ?? "";
    if (type === "date" && initial) {
      initial = String(initial).split("T")[0];
    }
    setInputValue(initial);
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (required && !String(inputValue).trim()) {
      setError("Campo obligatorio");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (onSave) {
        await onSave(fieldKey, inputValue);
      }
      setIsEditing(false);
    } catch (err) {
      setError(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && type !== "textarea") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  };

  if (isEditing) {
    return h(
      "div",
      { className: `profile-field-item is-editing ${className}`.trim() },
      h("span", { className: "profile-field-label" }, label),
      h(
        "div",
        { className: "profile-field-inline-editor" },
        type === "select"
          ? h(
              "select",
              {
                className: "profile-field-inline-select",
                value: inputValue,
                onChange: (e) => setInputValue(e.target.value),
                onKeyDown: handleKeyDown,
                disabled: saving,
                autoFocus: true
              },
              (options || []).map((opt) => {
                const optVal = typeof opt === "object" ? opt.value : opt;
                const optLabel = typeof opt === "object" ? opt.label : opt;
                return h("option", { key: optVal, value: optVal }, optLabel);
              })
            )
          : type === "textarea"
          ? h("textarea", {
              className: "profile-field-inline-textarea",
              rows: 2,
              value: inputValue,
              onChange: (e) => setInputValue(e.target.value),
              onKeyDown: handleKeyDown,
              disabled: saving,
              autoFocus: true
            })
          : h("input", {
              type: type || "text",
              className: "profile-field-inline-input",
              value: inputValue,
              onChange: (e) => setInputValue(e.target.value),
              onKeyDown: handleKeyDown,
              disabled: saving,
              autoFocus: true,
              required
            }),
        h(
          "div",
          { className: "profile-field-inline-actions" },
          h(
            "button",
            {
              type: "button",
              className: "profile-field-inline-btn btn-save",
              onClick: handleSave,
              disabled: saving,
              title: "Guardar (Enter)",
              "aria-label": "Guardar cambios"
            },
            saving ? h(IconSpinner, null) : h(IconCheck, null)
          ),
          h(
            "button",
            {
              type: "button",
              className: "profile-field-inline-btn btn-cancel",
              onClick: cancelEditing,
              disabled: saving,
              title: "Cancelar (Esc)",
              "aria-label": "Cancelar edición"
            },
            h(IconClose, null)
          )
        )
      ),
      error ? h("span", { className: "profile-field-inline-error" }, error) : null
    );
  }

  return h(
    "div",
    { className: `profile-field-item ${className}`.trim() },
    h("span", { className: "profile-field-label" }, label),
    h(
      "div",
      { className: "profile-field-item__row" },
      h(
        "span",
        {
          className: `profile-field-value ${valueClassName}`.trim(),
          title: String(renderedVal)
        },
        renderedVal
      ),
      editable && onSave
        ? h(
            "button",
            {
              type: "button",
              className: "profile-field-edit-btn",
              onClick: startEditing,
              title: `Editar ${label}`,
              "aria-label": `Editar ${label}`
            },
            h(IconPencil, null)
          )
        : null
    )
  );
}

/**
 * StudentPersonalTab: Muestra la información personal, datos de contacto y responsables/tutores.
 */
export function StudentPersonalTab({
  datosPersonales = {},
  contacto = {},
  tutores = [],
  onUpdateField,
  puedeModificar = true
}) {
  const handlerUpdate = puedeModificar ? onUpdateField : null;

  const formatearFecha = (fecha) => {
    if (!fecha) return "No registrado";
    try {
      const parts = String(fecha).split("T")[0].split("-");
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
    : datosPersonales.lugarNacimiento || "Monte Grande, Buenos Aires (Argentina)";

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
        h(ProfileFieldItem, {
          label: "ID de Alumno",
          value: datosPersonales.id,
          displayValue: String(datosPersonales.id || "S/D"),
          valueClassName: "mono font-semibold",
          editable: false
        }),
        h(ProfileFieldItem, {
          label: "Nombre",
          value: datosPersonales.nombre,
          fieldKey: "nombre",
          required: true,
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Apellido",
          value: datosPersonales.apellido,
          fieldKey: "apellido",
          required: true,
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Nombre Completo",
          value: datosPersonales.nombreCompleto || `${datosPersonales.apellido || ""}, ${datosPersonales.nombre || ""}`,
          valueClassName: "font-bold",
          editable: false
        }),
        h(ProfileFieldItem, {
          label: "DNI",
          value: datosPersonales.dni,
          fieldKey: "dni",
          className: "highlight-field",
          valueClassName: "font-bold text-accent",
          required: true,
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "CUIL",
          value: datosPersonales.cuil,
          fieldKey: "cuil",
          valueClassName: "mono",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Fecha de Nacimiento",
          value: datosPersonales.fechaNacimiento,
          displayValue: formatearFecha(datosPersonales.fechaNacimiento),
          fieldKey: "fechaNacimiento",
          type: "date",
          valueClassName: "font-medium",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Lugar de Nacimiento",
          value: typeof datosPersonales.lugarNacimiento === "object" ? datosPersonales.lugarNacimiento.localidad : datosPersonales.lugarNacimiento,
          displayValue: lugarNacimiento,
          fieldKey: "lugarNacimiento",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Nacionalidad",
          value: datosPersonales.nacionalidad || "Argentina",
          fieldKey: "nacionalidad",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Género",
          value: datosPersonales.genero || "No especificado",
          fieldKey: "genero",
          type: "select",
          options: ["Masculino", "Femenino", "No binario", "No especificado", "Otro"],
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Domicilio Real",
          value: datosPersonales.domicilio,
          fieldKey: "domicilio",
          valueClassName: "font-medium",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Localidad",
          value: datosPersonales.localidad || "Monte Grande",
          fieldKey: "localidad",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Código Postal",
          value: datosPersonales.codigoPostal || "1842",
          fieldKey: "codigoPostal",
          valueClassName: "font-mono",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Estado del Alumno",
          value: datosPersonales.estado || "Activo",
          fieldKey: "estado",
          type: "select",
          options: ["Activo", "Inactivo", "Pase pendiente", "Egresado"],
          valueClassName: "status-indicator font-bold",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Fecha de Ingreso",
          value: datosPersonales.fechaIngreso,
          displayValue: formatearFecha(datosPersonales.fechaIngreso),
          fieldKey: "fechaIngreso",
          type: "date",
          valueClassName: "font-medium",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Año Lectivo Actual",
          value: String(datosPersonales.anioLectivoActual || 2026),
          fieldKey: "anioLectivoActual",
          valueClassName: "font-semibold",
          editable: puedeModificar,
          onSave: handlerUpdate
        })
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
        h(ProfileFieldItem, {
          label: "Teléfono",
          value: contacto.telefono,
          displayValue: contacto.telefono || "No especificado",
          fieldKey: "telefono",
          valueClassName: "font-medium",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Teléfono Alternativo / Emergencias",
          value: contacto.telefonoAlternativo,
          displayValue: contacto.telefonoAlternativo || "No registrado",
          fieldKey: "telefonoAlternativo",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Correo Electrónico Institucional",
          value: contacto.email,
          displayValue: contacto.email || "No asignado",
          fieldKey: "email",
          type: "email",
          valueClassName: "text-link",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Domicilio Actual",
          value: contacto.domicilio,
          displayValue: contacto.domicilio || "No registrado",
          fieldKey: "domicilio",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Localidad",
          value: contacto.localidad,
          displayValue: contacto.localidad || "Monte Grande",
          fieldKey: "localidad",
          editable: puedeModificar,
          onSave: handlerUpdate
        }),
        h(ProfileFieldItem, {
          label: "Información Adicional de Contacto",
          value: contacto.observacionesContacto,
          displayValue: contacto.observacionesContacto || "Sin observaciones adicionales",
          fieldKey: "observacionesContacto",
          type: "textarea",
          valueClassName: "text-muted",
          editable: puedeModificar,
          onSave: handlerUpdate
        })
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
