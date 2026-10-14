import React, { useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import { ROLES_DISPONIBLES, DirectorService } from "../director-service.js";

function IconCheck({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    {
      className,
      width,
      height,
      viewBox: "0 0 20 20",
      fill: "currentColor",
      "aria-hidden": "true",
      style: { flexShrink: 0 }
    },
    h("path", {
      fillRule: "evenodd",
      d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z",
      clipRule: "evenodd"
    })
  );
}

function IconCopy({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    {
      className,
      width,
      height,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      style: { flexShrink: 0 }
    },
    h("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }),
    h("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })
  );
}

function IconClose({ className = "w-5 h-5", width = "20", height = "20" }) {
  return h(
    "svg",
    {
      className,
      width,
      height,
      viewBox: "0 0 20 20",
      fill: "currentColor",
      "aria-hidden": "true",
      style: { flexShrink: 0 }
    },
    h("path", {
      fillRule: "evenodd",
      d: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z",
      clipRule: "evenodd"
    })
  );
}

function IconPlus({ className = "w-4 h-4", width = "16", height = "16" }) {
  return h(
    "svg",
    {
      className,
      width,
      height,
      viewBox: "0 0 20 20",
      fill: "currentColor",
      "aria-hidden": "true",
      style: { flexShrink: 0 }
    },
    h("path", { d: "M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" })
  );
}

const FORMULARIO_INICIAL = {
  nombre: "",
  apellido: "",
  email: "",
  dni: "",
  telefono: "",
  area: "Docencia",
  roles: ["docente"]
};

export function NuevoPerfilModal({ abierto, alCerrar, alPerfilCreado }) {
  const [form, setForm] = useState(FORMULARIO_INICIAL);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [creadoExitoso, setCreadoExitoso] = useState(null);
  const [copiado, setCopiado] = useState(false);

  if (!abierto) return null;

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) {
      setErrores((prev) => ({ ...prev, [campo]: null }));
    }
  };

  const toggleRol = (rolId) => {
    setForm((prev) => {
      const yaExiste = prev.roles.includes(rolId);
      let nuevosRoles;
      if (yaExiste) {
        nuevosRoles = prev.roles.filter((r) => r !== rolId);
      } else {
        nuevosRoles = [...prev.roles, rolId];
      }
      return { ...prev, roles: nuevosRoles };
    });
    if (errores.roles) {
      setErrores((prev) => ({ ...prev, roles: null }));
    }
  };

  const validar = () => {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = "El nombre es obligatorio.";
    if (!form.apellido.trim()) errs.apellido = "El apellido es obligatorio.";
    if (!form.email.trim()) {
      errs.email = "El correo es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Ingresa un correo con formato válido.";
    }
    if (!form.dni.trim()) {
      errs.dni = "El DNI es obligatorio.";
    } else if (!/^\d{7,9}$/.test(form.dni.trim().replace(/\D/g, ""))) {
      errs.dni = "El DNI debe contener entre 7 y 9 dígitos numéricos.";
    }
    if (!form.roles || form.roles.length === 0) {
      errs.roles = "Selecciona al menos un rol para el perfil.";
    }
    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar() || guardando) return;

    setGuardando(true);
    setErrorGlobal(null);

    try {
      const respuesta = await DirectorService.crearPerfil(form);
      setCreadoExitoso(respuesta);
      if (alPerfilCreado) {
        alPerfilCreado(respuesta);
      }
    } catch (err) {
      setErrorGlobal(err.message || "Error al crear el perfil de usuario.");
    } finally {
      setGuardando(false);
    }
  };

  const copiarPassword = () => {
    if (creadoExitoso?.passwordTemporal) {
      navigator.clipboard.writeText(creadoExitoso.passwordTemporal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  const reiniciarFormulario = () => {
    setForm(FORMULARIO_INICIAL);
    setCreadoExitoso(null);
    setErrores({});
    setErrorGlobal(null);
    setCopiado(false);
  };

  const handleCerrarModal = () => {
    reiniciarFormulario();
    alCerrar();
  };

  return h(
    "div",
    { className: "director-modal-backdrop", onClick: (e) => e.target === e.currentTarget && handleCerrarModal() },
    h(
      "div",
      { className: "director-modal-container", role: "dialog", "aria-modal": "true", "aria-labelledby": "modal-director-titulo" },

      // Header del Modal
      h(
        "div",
        { className: "director-modal-header" },
        h(
          "div",
          null,
          h("h2", { id: "modal-director-titulo", className: "director-modal-title" }, "Crear Nuevo Perfil / Usuario"),
          h("p", { className: "director-modal-subtitle" }, "Registra personal institucional y define sus permisos de acceso.")
        ),
        h(
          "button",
          {
            type: "button",
            className: "director-modal-close-btn",
            onClick: handleCerrarModal,
            "aria-label": "Cerrar modal"
          },
          h(IconClose, null)
        )
      ),

      // Cuerpo del Modal: Formulario o Pantalla de Éxito
      creadoExitoso
        ? // Vista de Éxito con Contraseña Temporal
          h(
            "div",
            { className: "director-modal-success-pane" },
            h(
              "div",
              { className: "director-success-badge-icon" },
              h(IconCheck, { className: "w-8 h-8" })
            ),
            h("h3", { className: "director-success-title" }, "¡Perfil creado exitosamente!"),
            h(
              "p",
              { className: "director-success-desc" },
              `Se ha generado el acceso institucional para `,
              h("strong", null, creadoExitoso.displayName || `${creadoExitoso.nombre} ${creadoExitoso.apellido}`),
              ` (${creadoExitoso.email}).`
            ),

            // Tarjeta de Contraseña Temporal
            h(
              "div",
              { className: "director-temp-password-card" },
              h("span", { className: "director-temp-password-label" }, "Contraseña Temporal de Acceso"),
              h(
                "div",
                { className: "director-temp-password-row" },
                h("code", { className: "director-temp-password-code" }, creadoExitoso.passwordTemporal || "Temporal123!"),
                h(
                  "button",
                  {
                    type: "button",
                    className: `director-copy-btn ${copiado ? "director-copy-btn--copied" : ""}`,
                    onClick: copiarPassword
                  },
                  copiado ? h(IconCheck, null) : h(IconCopy, null),
                  h("span", null, copiado ? "¡Copiada!" : "Copiar")
                )
              ),
              h(
                "p",
                { className: "director-temp-password-hint" },
                "Entrega esta contraseña al usuario. El sistema le solicitará cambiarla en su primer inicio de sesión."
              )
            ),

            // Botones de Acción de Éxito
            h(
              "div",
              { className: "director-modal-success-actions" },
              h(
                "button",
                {
                  type: "button",
                  className: "btn-director-secondary",
                  onClick: reiniciarFormulario
                },
                h(IconPlus, { width: "15", height: "15" }),
                h("span", null, "Crear otro perfil")
              ),
              h(
                "button",
                {
                  type: "button",
                  className: "btn-director-primary",
                  onClick: handleCerrarModal
                },
                "Finalizar y Ver Personal"
              )
            )
          )
        : // Formulario de Registro
          h(
            "form",
            { className: "director-modal-form", onSubmit: handleSubmit },

            errorGlobal
              ? h(
                  "div",
                  { className: "director-form-alert director-form-alert--error" },
                  errorGlobal
                )
              : null,

            // Fila 1: Nombre y Apellido
            h(
              "div",
              { className: "director-form-row" },
              h(
                "div",
                { className: "director-form-group" },
                h("label", { className: "director-form-label" }, "Nombre *"),
                h("input", {
                  type: "text",
                  className: `director-form-input ${errores.nombre ? "director-form-input--error" : ""}`,
                  placeholder: "Ej: Carlos",
                  value: form.nombre,
                  onChange: (e) => handleChange("nombre", e.target.value)
                }),
                errores.nombre ? h("span", { className: "director-form-error" }, errores.nombre) : null
              ),
              h(
                "div",
                { className: "director-form-group" },
                h("label", { className: "director-form-label" }, "Apellido *"),
                h("input", {
                  type: "text",
                  className: `director-form-input ${errores.apellido ? "director-form-input--error" : ""}`,
                  placeholder: "Ej: Fernández",
                  value: form.apellido,
                  onChange: (e) => handleChange("apellido", e.target.value)
                }),
                errores.apellido ? h("span", { className: "director-form-error" }, errores.apellido) : null
              )
            ),

            // Fila 2: Correo institucional y DNI
            h(
              "div",
              { className: "director-form-row" },
              h(
                "div",
                { className: "director-form-group" },
                h("label", { className: "director-form-label" }, "Correo Electrónico Institucional *"),
                h("input", {
                  type: "email",
                  className: `director-form-input ${errores.email ? "director-form-input--error" : ""}`,
                  placeholder: "cfernandez@escuela.edu.ar",
                  value: form.email,
                  onChange: (e) => handleChange("email", e.target.value)
                }),
                errores.email ? h("span", { className: "director-form-error" }, errores.email) : null
              ),
              h(
                "div",
                { className: "director-form-group" },
                h("label", { className: "director-form-label" }, "DNI (sin puntos) *"),
                h("input", {
                  type: "text",
                  className: `director-form-input ${errores.dni ? "director-form-input--error" : ""}`,
                  placeholder: "Ej: 32456789",
                  value: form.dni,
                  onChange: (e) => handleChange("dni", e.target.value)
                }),
                errores.dni ? h("span", { className: "director-form-error" }, errores.dni) : null
              )
            ),

            // Fila 3: Teléfono y Área
            h(
              "div",
              { className: "director-form-row" },
              h(
                "div",
                { className: "director-form-group" },
                h("label", { className: "director-form-label" }, "Teléfono de Contacto (opcional)"),
                h("input", {
                  type: "tel",
                  className: "director-form-input",
                  placeholder: "+54 11 4567-8900",
                  value: form.telefono,
                  onChange: (e) => handleChange("telefono", e.target.value)
                })
              ),
              h(
                "div",
                { className: "director-form-group" },
                h("label", { className: "director-form-label" }, "Área / Departamento Escolar"),
                h(
                  "select",
                  {
                    className: "director-form-select",
                    value: form.area,
                    onChange: (e) => handleChange("area", e.target.value)
                  },
                  h("option", { value: "Dirección" }, "Equipo Directivo"),
                  h("option", { value: "Secretaría" }, "Secretaría y Administración"),
                  h("option", { value: "Preceptoría" }, "Cuerpo de Preceptoría"),
                  h("option", { value: "Informática" }, "Dpto. Informática y Programación"),
                  h("option", { value: "Electromecánica" }, "Dpto. Electromecánica"),
                  h("option", { value: "Taller" }, "Área de Talleres Técnicos"),
                  h("option", { value: "Exactas" }, "Ciencias Exactas y Naturales"),
                  h("option", { value: "Docencia" }, "Cuerpo Docente General"),
                  h("option", { value: "Server y Pañol" }, "Pañol, Server y Soporte Técnico")
                )
              )
            ),

            // Sección: Asignación de Roles Visual
            h(
              "div",
              { className: "director-roles-section" },
              h(
                "div",
                { className: "director-roles-header" },
                h("label", { className: "director-form-label" }, "Asignación de Roles y Permisos *"),
                h("span", { className: "director-roles-sublabel" }, "Puedes seleccionar uno o varios roles para el usuario.")
              ),
              errores.roles ? h("span", { className: "director-form-error" }, errores.roles) : null,

              h(
                "div",
                { className: "director-roles-grid" },
                ROLES_DISPONIBLES.map((rol) => {
                  const seleccionado = form.roles.includes(rol.id);

                  return h(
                    "div",
                    {
                      key: rol.id,
                      className: `director-role-card ${seleccionado ? "director-role-card--active" : ""}`,
                      onClick: () => toggleRol(rol.id)
                    },
                    h(
                      "div",
                      { className: "director-role-card__header" },
                      h(
                        "div",
                        {
                          className: "director-role-card__checkbox",
                          style: {
                            borderColor: seleccionado ? rol.color : "#cbd5e1",
                            background: seleccionado ? rol.color : "transparent"
                          }
                        },
                        seleccionado ? h(IconCheck, { className: "w-3 h-3 text-white" }) : null
                      ),
                      h("strong", { className: "director-role-card__title" }, rol.nombre)
                    ),
                    h("p", { className: "director-role-card__desc" }, rol.descripcion)
                  );
                })
              )
            ),

            // Footer del Modal
            h(
              "div",
              { className: "director-modal-footer" },
              h(
                "button",
                {
                  type: "button",
                  className: "btn-director-secondary",
                  onClick: handleCerrarModal,
                  disabled: guardando
                },
                "Cancelar"
              ),
              h(
                "button",
                {
                  type: "submit",
                  className: "btn-director-primary",
                  disabled: guardando
                },
                guardando ? "Creando perfil..." : "Crear Perfil y Asignar Roles"
              )
            )
          )
    )
  );
}
