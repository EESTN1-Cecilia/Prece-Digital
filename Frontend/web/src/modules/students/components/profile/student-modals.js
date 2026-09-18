import React, { useState } from "react";
import { h } from "../../../../layouts/site-layout.js";

/**
 * Modal 1: Constancia de Alumno Regular (con vista previa oficial y opción de imprimir)
 */
export function StudentCertificateModal({
  certificado = {},
  isOpen,
  onClose
}) {
  if (!isOpen) return null;

  const data = certificado.data || certificado || {};

  const handlePrint = () => {
    window.print();
  };

  return h(
    "div",
    { className: "modal-overlay" },
    h(
      "div",
      { className: "modal-container modal-lg certificate-modal" },
      // Header
      h(
        "div",
        { className: "modal-header" },
        h(
          "div",
          { className: "modal-title-wrap" },
          h(
            "svg",
            { className: "modal-title-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
            h("polyline", { points: "14 2 14 8 20 8" })
          ),
          h("h2", { className: "modal-title" }, "Constancia de Alumno Regular")
        ),
        h(
          "button",
          {
            type: "button",
            className: "modal-close-btn",
            onClick: onClose,
            "aria-label": "Cerrar modal"
          },
          "✕"
        )
      ),

      // Body: Hoja membretada oficial
      h(
        "div",
        { className: "modal-body" },
        h(
          "div",
          { className: "certificate-paper" },
          h(
            "div",
            { className: "cert-header" },
            h("div", { className: "cert-institution" }, "DIRECCIÓN GENERAL DE CULTURA Y EDUCACIÓN"),
            h("div", { className: "cert-school" }, "E.E.S.T N° 1 MONTE GRANDE"),
            h("div", { className: "cert-district" }, "Distrito Esteban Echeverría • Pcia. de Buenos Aires")
          ),
          h("h3", { className: "cert-main-title" }, "CONSTANCIA DE ALUMNO REGULAR"),
          h(
            "div",
            { className: "cert-body-text" },
            data.textoOficial ||
              `Por la presente se certifica que ${data.nombreCompleto || "el/la estudiante"}, DNI N° ${data.dni || "S/D"}, es alumno/a REGULAR del ${data.curso || "1°"} año, División ${data.division || "1"}°, Turno ${data.turno || "Mañana"}, durante el Ciclo Lectivo 2026 en esta institución educativa.`
          ),
          h(
            "div",
            { className: "cert-meta-info" },
            h("p", null, `A solicitud de la parte interesada y a los efectos que correspondan, se expide la presente en Monte Grande a los ${data.fechaEmision || new Date().toLocaleDateString("es-AR")}.`),
            h("p", { className: "cert-validez" }, `Validez: ${data.validoHasta || "30 días corridos"}`)
          ),
          h(
            "div",
            { className: "cert-signatures" },
            h(
              "div",
              { className: "signature-box" },
              h("div", { className: "signature-line" }),
              h("span", null, "Sello de la Institución")
            ),
            h(
              "div",
              { className: "signature-box" },
              h("div", { className: "signature-line" }),
              h("span", null, "Firma y Sello de Autoridad")
            )
          )
        )
      ),

      // Footer
      h(
        "div",
        { className: "modal-footer" },
        h(
          "button",
          {
            type: "button",
            className: "btn-secondary",
            onClick: onClose
          },
          "Cerrar"
        ),
        h(
          "button",
          {
            type: "button",
            className: "btn-primary",
            onClick: handlePrint
          },
          h(
            "svg",
            { className: "btn-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
            h("path", { d: "M6 9V2h12v7" }),
            h("path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
            h("rect", { x: "6", y: "14", width: "12", height: "8" })
          ),
          h("span", null, "Imprimir / Descargar PDF")
        )
      )
    )
  );
}

/**
 * Modal 2: Iniciar Cambio de Colegio / Pase
 */
export function StudentTransferModal({
  alumno = {},
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false
}) {
  const [colegioDestino, setColegioDestino] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!colegioDestino.trim()) {
      setError("Debe especificar la institución educativa de destino.");
      return;
    }
    if (!motivo.trim()) {
      setError("Debe especificar el motivo del cambio de colegio.");
      return;
    }
    setError("");
    onSubmit({ colegioDestino: colegioDestino.trim(), motivo: motivo.trim() });
  };

  return h(
    "div",
    { className: "modal-overlay" },
    h(
      "div",
      { className: "modal-container modal-md" },
      h(
        "div",
        { className: "modal-header" },
        h(
          "div",
          { className: "modal-title-wrap" },
          h("h2", { className: "modal-title" }, "Iniciar Trámite de Cambio de Colegio")
        ),
        h(
          "button",
          { type: "button", className: "modal-close-btn", onClick: onClose },
          "✕"
        )
      ),
      h(
        "form",
        { onSubmit: handleSubmit },
        h(
          "div",
          { className: "modal-body" },
          h(
            "div",
            { className: "warning-alert-box mb-4" },
            h("strong", null, "Confirmación de Pase Institucional"),
            h("p", null, `Al iniciar el trámite para ${alumno.nombreCompleto || "el alumno"}, el estado cambiará a 'Pase pendiente' y se registrará en el historial de auditoría.`)
          ),
          error
            ? h("div", { className: "error-alert-box mb-3" }, error)
            : null,
          h(
            "div",
            { className: "form-group mb-3" },
            h("label", { className: "form-label" }, "Colegio o Institución de Destino *"),
            h("input", {
              type: "text",
              className: "form-control",
              placeholder: "Ej: E.E.S.T N° 2 Luis Guillón",
              value: colegioDestino,
              onInput: (e) => setColegioDestino(e.target.value),
              required: true
            })
          ),
          h(
            "div",
            { className: "form-group" },
            h("label", { className: "form-label" }, "Motivo del Pase / Traslado *"),
            h("textarea", {
              className: "form-control",
              rows: 3,
              placeholder: "Ej: Cambio de domicilio familiar a otra localidad.",
              value: motivo,
              onInput: (e) => setMotivo(e.target.value),
              required: true
            })
          )
        ),
        h(
          "div",
          { className: "modal-footer" },
          h(
            "button",
            { type: "button", className: "btn-secondary", onClick: onClose, disabled: isSubmitting },
            "Cancelar"
          ),
          h(
            "button",
            { type: "submit", className: "btn-danger-action", disabled: isSubmitting },
            isSubmitting ? "Iniciando trámite..." : "Confirmar e Iniciar Pase"
          )
        )
      )
    )
  );
}

/**
 * Modal 3: Modificar Información del Alumno
 */
export function StudentEditModal({
  alumno = {},
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false
}) {
  const [formData, setFormData] = useState({
    nombre: alumno.nombre || "",
    apellido: alumno.apellido || "",
    dni: alumno.dni || "",
    email: alumno.email || "",
    telefono: alumno.telefono || "",
    telefonoAlternativo: alumno.telefonoAlternativo || "",
    domicilio: alumno.domicilio || "",
    localidad: alumno.localidad || "",
    codigoPostal: alumno.codigoPostal || "",
    genero: alumno.genero || "No especificado",
    estado: alumno.estado || "Activo"
  });
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.dni.trim()) {
      setError("Nombre, Apellido y DNI son campos obligatorios.");
      return;
    }
    setError("");
    onSubmit(formData);
  };

  return h(
    "div",
    { className: "modal-overlay" },
    h(
      "div",
      { className: "modal-container modal-lg" },
      h(
        "div",
        { className: "modal-header" },
        h(
          "div",
          { className: "modal-title-wrap" },
          h("h2", { className: "modal-title" }, "Modificar Información del Alumno")
        ),
        h(
          "button",
          { type: "button", className: "modal-close-btn", onClick: onClose },
          "✕"
        )
      ),
      h(
        "form",
        { onSubmit: handleSubmit },
        h(
          "div",
          { className: "modal-body" },
          error
            ? h("div", { className: "error-alert-box mb-3" }, error)
            : null,
          h(
            "div",
            { className: "form-row-2" },
            h(
              "div",
              { className: "form-group" },
              h("label", { className: "form-label" }, "Nombre *"),
              h("input", {
                type: "text",
                className: "form-control",
                value: formData.nombre,
                onInput: (e) => handleChange("nombre", e.target.value),
                required: true
              })
            ),
            h(
              "div",
              { className: "form-group" },
              h("label", { className: "form-label" }, "Apellido *"),
              h("input", {
                type: "text",
                className: "form-control",
                value: formData.apellido,
                onInput: (e) => handleChange("apellido", e.target.value),
                required: true
              })
            )
          ),
          h(
            "div",
            { className: "form-row-2" },
            h(
              "div",
              { className: "form-group" },
              h("label", { className: "form-label" }, "DNI *"),
              h("input", {
                type: "text",
                className: "form-control",
                value: formData.dni,
                onInput: (e) => handleChange("dni", e.target.value),
                required: true
              })
            ),
            h(
              "div",
              { className: "form-group" },
              h("label", { className: "form-label" }, "Estado Institucional"),
              h(
                "select",
                {
                  className: "form-control",
                  value: formData.estado,
                  onChange: (e) => handleChange("estado", e.target.value)
                },
                h("option", { value: "Activo" }, "Activo"),
                h("option", { value: "Inactivo" }, "Inactivo"),
                h("option", { value: "Pase pendiente" }, "Pase pendiente"),
                h("option", { value: "Egresado" }, "Egresado")
              )
            )
          ),
          h(
            "div",
            { className: "form-row-2" },
            h(
              "div",
              { className: "form-group" },
              h("label", { className: "form-label" }, "Teléfono"),
              h("input", {
                type: "text",
                className: "form-control",
                value: formData.telefono,
                onInput: (e) => handleChange("telefono", e.target.value)
              })
            ),
            h(
              "div",
              { className: "form-group" },
              h("label", { className: "form-label" }, "Teléfono Alternativo"),
              h("input", {
                type: "text",
                className: "form-control",
                value: formData.telefonoAlternativo,
                onInput: (e) => handleChange("telefonoAlternativo", e.target.value)
              })
            )
          ),
          h(
            "div",
            { className: "form-group" },
            h("label", { className: "form-label" }, "Correo Electrónico"),
            h("input", {
              type: "email",
              className: "form-control",
              value: formData.email,
              onInput: (e) => handleChange("email", e.target.value)
            })
          ),
          h(
            "div",
            { className: "form-row-3" },
            h(
              "div",
              { className: "form-group col-span-2" },
              h("label", { className: "form-label" }, "Domicilio"),
              h("input", {
                type: "text",
                className: "form-control",
                value: formData.domicilio,
                onInput: (e) => handleChange("domicilio", e.target.value)
              })
            ),
            h(
              "div",
              { className: "form-group" },
              h("label", { className: "form-label" }, "Localidad"),
              h("input", {
                type: "text",
                className: "form-control",
                value: formData.localidad,
                onInput: (e) => handleChange("localidad", e.target.value)
              })
            )
          )
        ),
        h(
          "div",
          { className: "modal-footer" },
          h(
            "button",
            { type: "button", className: "btn-secondary", onClick: onClose, disabled: isSubmitting },
            "Cancelar"
          ),
          h(
            "button",
            { type: "submit", className: "btn-primary", disabled: isSubmitting },
            isSubmitting ? "Guardando cambios..." : "Guardar Modificaciones"
          )
        )
      )
    )
  );
}

import { useUsuarioActual } from "../../../../estado/index.js";

/**
 * Modal 4: Registrar / Cargar Observación Institucional
 */
export function StudentObservationModal({
  alumno = {},
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false
}) {
  const currentUser = useUsuarioActual();
  const defaultResponsable = currentUser?.rolNombre || currentUser?.nombre || "Preceptor Turno Mañana";

  const [tipo, setTipo] = useState("Académica");
  const [sector, setSector] = useState("Preceptoría");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [estado, setEstado] = useState("Activa");
  const [responsable, setResponsable] = useState(defaultResponsable);
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const nombreAlumno = alumno?.nombreCompleto || 
    (alumno?.apellido ? `${alumno.apellido}, ${alumno.nombre || ""}`.trim() : alumno?.nombre || "Estudiante");
  const dniAlumno = alumno?.dni || "S/D";
  const cursoAlumno = alumno?.curso ? `${alumno.curso}° ${alumno.division ? `${alumno.division}°` : ""}`.trim() : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedDesc = descripcion.trim();
    const trimmedTipo = tipo.trim();
    const trimmedSector = sector.trim();
    const trimmedFecha = fecha.trim();
    const trimmedResponsable = responsable.trim();

    if (!trimmedDesc || !trimmedTipo || !trimmedSector || !trimmedFecha) {
      setError("Completá todos los campos obligatorios para registrar la observación.");
      return;
    }

    setError("");
    onSubmit({
      tipo: trimmedTipo,
      sector: trimmedSector,
      fecha: trimmedFecha,
      estado: estado || "Activa",
      responsable: trimmedResponsable || defaultResponsable,
      usuarioResponsable: trimmedResponsable || defaultResponsable,
      descripcion: trimmedDesc
    });
  };

  return h(
    "div",
    { className: "modal-overlay" },
    h(
      "div",
      { className: "modal-container modal-lg observation-modal-dialog" },
      // Header
      h(
        "div",
        { className: "modal-header" },
        h(
          "div",
          { className: "modal-title-wrap" },
          h(
            "div",
            { className: "section-icon-badge", style: { width: "38px", height: "38px", minWidth: "38px" } },
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
            h("h2", { className: "modal-title" }, "Cargar Observación"),
            h("p", { className: "text-xs text-muted", style: { margin: "2px 0 0" } }, "Registrá una observación para el seguimiento institucional del estudiante.")
          )
        ),
        h(
          "button",
          {
            type: "button",
            className: "modal-close-btn",
            onClick: onClose,
            "aria-label": "Cerrar modal"
          },
          "✕"
        )
      ),

      // Form with guaranteed scrollable modal-body and fixed footer
      h(
        "form",
        {
          onSubmit: handleSubmit,
          style: { display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: "0", overflow: "hidden" }
        },
        
        // Scrollable Body
        h(
          "div",
          { className: "modal-body", style: { padding: "20px 24px", overflowY: "auto", flex: "1 1 auto" } },

          // Alumno Context Banner
          h(
            "div",
            {
              className: "active-filters-bar",
              style: {
                background: "#eff6ff",
                borderColor: "#bfdbfe",
                borderRadius: "10px",
                padding: "10px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px"
              }
            },
            h(
              "div",
              { style: { display: "flex", alignItems: "center", gap: "8px" } },
              h("span", { style: { color: "#1d4ed8", fontSize: "12px", fontWeight: "700" } }, "Alumno:"),
              h("strong", { style: { color: "#0f172a", fontSize: "14px", fontWeight: "700" } }, nombreAlumno)
            ),
            h(
              "div",
              { style: { display: "flex", gap: "14px", fontSize: "13px", color: "#475569", fontWeight: "500" } },
              dniAlumno !== "S/D" ? h("span", null, `DNI: ${dniAlumno}`) : null,
              cursoAlumno ? h("span", null, `Curso: ${cursoAlumno}`) : null
            )
          ),

          // Section Header
          h(
            "div",
            { className: "form-section-header", style: { marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" } },
            h("h3", { className: "form-section-title", style: { fontSize: "15px", fontWeight: "700", color: "#1e293b", margin: "0 0 2px 0" } }, "Información del seguimiento"),
            h("span", { className: "form-section-desc", style: { fontSize: "13px", color: "#64748b" } }, "Toda la información necesaria para registrar la situación institucional")
          ),

          error ? h("p", { className: "form-error-message", style: { marginBottom: "14px" } }, error) : null,

          // Form Grid (2 columns)
          h(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "16px",
                marginBottom: "16px"
              }
            },
            // Tipo de observación
            h(
              "div",
              { className: "form-field-group" },
              h("label", { className: "form-field-label" }, "Tipo de observación:", h("span", { className: "required-star" }, " *")),
              h(
                "select",
                {
                  className: "form-field-select",
                  value: tipo,
                  onChange: (e) => {
                    setTipo(e.target.value);
                    if (error) setError("");
                  }
                },
                h("option", { value: "Académica" }, "Académica"),
                h("option", { value: "Pedagógica" }, "Pedagógica"),
                h("option", { value: "Convivencia" }, "Convivencia"),
                h("option", { value: "Asistencia" }, "Asistencia"),
                h("option", { value: "Salud" }, "Salud / Médica"),
                h("option", { value: "Administrativa" }, "Administrativa"),
                h("option", { value: "General" }, "General")
              )
            ),

            // Sector emisor
            h(
              "div",
              { className: "form-field-group" },
              h("label", { className: "form-field-label" }, "Sector emisor:", h("span", { className: "required-star" }, " *")),
              h(
                "select",
                {
                  className: "form-field-select",
                  value: sector,
                  onChange: (e) => {
                    setSector(e.target.value);
                    if (error) setError("");
                  }
                },
                h("option", { value: "Preceptoría" }, "Preceptoría"),
                h("option", { value: "Secretaría" }, "Secretaría"),
                h("option", { value: "Dirección" }, "Dirección / Vicedirección"),
                h("option", { value: "Equipo de Orientación (EOE)" }, "Equipo de Orientación (EOE)"),
                h("option", { value: "Jefatura de Taller" }, "Jefatura de Taller"),
                h("option", { value: "Coordinación" }, "Coordinación"),
                h("option", { value: "Tutoría" }, "Tutoría"),
                h("option", { value: "Biblioteca" }, "Biblioteca")
              )
            ),

            // Fecha
            h(
              "div",
              { className: "form-field-group" },
              h("label", { className: "form-field-label" }, "Fecha:", h("span", { className: "required-star" }, " *")),
              h("input", {
                type: "date",
                className: "form-field-input",
                value: fecha,
                onChange: (e) => {
                  setFecha(e.target.value);
                  if (error) setError("");
                },
                required: true
              })
            ),

            // Estado
            h(
              "div",
              { className: "form-field-group" },
              h("label", { className: "form-field-label" }, "Estado:"),
              h(
                "select",
                {
                  className: "form-field-select",
                  value: estado,
                  onChange: (e) => setEstado(e.target.value)
                },
                h("option", { value: "Activa" }, "Activa"),
                h("option", { value: "Modificada" }, "Modificada"),
                h("option", { value: "Histórica" }, "Histórica")
              )
            ),

            // Responsable (Full Width)
            h(
              "div",
              { className: "form-field-group", style: { gridColumn: "1 / -1" } },
              h("label", { className: "form-field-label" }, "Responsable / Usuario emisor:"),
              h("input", {
                type: "text",
                className: "form-field-input",
                placeholder: "Nombre o cargo del responsable (ej: Preceptor Turno Mañana)...",
                value: responsable,
                onInput: (e) => setResponsable(e.target.value)
              })
            )
          ),

          // Textarea Descripción
          h(
            "div",
            { className: "form-field-group", style: { marginBottom: "4px" } },
            h("label", { className: "form-field-label" }, "Descripción detallada:", h("span", { className: "required-star" }, " *")),
            h("textarea", {
              className: "form-field-textarea",
              style: { minHeight: "100px", resize: "vertical" },
              value: descripcion,
              maxLength: 500,
              placeholder: "Describí la situación observada, acuerdos pedagógicos o novedades institucionales...",
              onInput: (e) => {
                setDescripcion(e.target.value);
                if (error) setError("");
              },
              required: true
            }),
            h(
              "div",
              { style: { display: "flex", justifyContent: "flex-end", marginTop: "4px" } },
              h("small", { style: { color: "#64748b", fontSize: "11.5px", fontWeight: "500" } }, `${descripcion.length}/500 caracteres`)
            )
          )
        ),

        // Pinned Footer
        h(
          "div",
          { className: "modal-footer", style: { flexShrink: 0 } },
          h(
            "button",
            {
              type: "button",
              className: "btn-secondary",
              onClick: onClose,
              disabled: isSubmitting
            },
            h(
              "svg",
              { className: "btn-icon", viewBox: "0 0 20 20", fill: "currentColor" },
              h("path", { fillRule: "evenodd", d: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z", clipRule: "evenodd" })
            ),
            h("span", null, "Cancelar y volver")
          ),
          h(
            "button",
            {
              type: "submit",
              className: "btn-primary",
              disabled: isSubmitting
            },
            isSubmitting
              ? "Guardando observación..."
              : [
                  h(
                    "svg",
                    { key: "icon", className: "btn-icon", viewBox: "0 0 20 20", fill: "currentColor" },
                    h("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" })
                  ),
                  h("span", { key: "text" }, "Guardar observación")
                ]
          )
        )
      )
    )
  );
}

