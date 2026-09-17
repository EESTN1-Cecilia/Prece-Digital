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

/**
 * Modal 4: Registrar Nueva Observación
 */
export function StudentObservationModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false
}) {
  const [tipo, setTipo] = useState("Pedagógica");
  const [sector, setSector] = useState("Preceptoría");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      setError("Debe ingresar la descripción de la observación.");
      return;
    }
    setError("");
    onSubmit({ tipo, sector, descripcion: descripcion.trim() });
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
          h("h2", { className: "modal-title" }, "Registrar Observación Institucional")
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
              h("label", { className: "form-label" }, "Tipo de Observación *"),
              h(
                "select",
                {
                  className: "form-control",
                  value: tipo,
                  onChange: (e) => setTipo(e.target.value)
                },
                h("option", { value: "Pedagógica" }, "Pedagógica"),
                h("option", { value: "Administrativa" }, "Administrativa"),
                h("option", { value: "Convivencia" }, "Convivencia"),
                h("option", { value: "Salud" }, "Salud / Médica"),
                h("option", { value: "General" }, "General")
              )
            ),
            h(
              "div",
              { className: "form-group" },
              h("label", { className: "form-label" }, "Sector Emisor *"),
              h(
                "select",
                {
                  className: "form-control",
                  value: sector,
                  onChange: (e) => setSector(e.target.value)
                },
                h("option", { value: "Preceptoría" }, "Preceptoría"),
                h("option", { value: "Secretaría" }, "Secretaría"),
                h("option", { value: "Dirección" }, "Dirección / Vicedirección"),
                h("option", { value: "Equipo de Orientación (EOE)" }, "Equipo de Orientación (EOE)"),
                h("option", { value: "Jefatura de Taller" }, "Jefatura de Taller")
              )
            )
          ),
          h(
            "div",
            { className: "form-group mt-3" },
            h("label", { className: "form-label" }, "Descripción detallada *"),
            h("textarea", {
              className: "form-control",
              rows: 4,
              placeholder: "Describa el hecho, acuerdo pedagógico o situación a registrar...",
              value: descripcion,
              onInput: (e) => setDescripcion(e.target.value),
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
            { type: "submit", className: "btn-primary", disabled: isSubmitting },
            isSubmitting ? "Registrando..." : "Guardar Observación"
          )
        )
      )
    )
  );
}
