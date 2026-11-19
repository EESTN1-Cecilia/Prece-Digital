import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

export function EditarRolesModal({
  usuario,
  abierto,
  alCerrar,
  alRolesActualizados,
  alUsuarioActualizado
}) {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    dni: "",
    telefono: "",
    password: "",
    confirmPassword: ""
  });
  const [rolesSeleccionados, setRolesSeleccionados] = useState([]);
  const [mostrarCambioPassword, setMostrarCambioPassword] = useState(false);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (usuario) {
      const ids = (usuario.roles || []).map((r) => (typeof r === "string" ? r : r.id)).filter(Boolean);
      setForm({
        nombre: usuario.nombre || "",
        apellido: usuario.apellido || "",
        email: usuario.email || "",
        dni: usuario.dni && usuario.dni !== "-" ? String(usuario.dni).replace(/\D/g, "") : "",
        telefono: usuario.telefono && usuario.telefono !== "-" ? String(usuario.telefono) : "",
        password: "",
        confirmPassword: ""
      });
      setRolesSeleccionados(ids);
      setMostrarCambioPassword(false);
      setErrores({});
      setError(null);
    }
  }, [usuario]);

  useEffect(() => {
    if (!abierto || !usuario) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !guardando) alCerrar();
    };
    document.addEventListener("keydown", handleKeyDown);
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [abierto, usuario, guardando, alCerrar]);

  if (!abierto || !usuario) return null;

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) {
      setErrores((prev) => ({ ...prev, [campo]: null }));
    }
    if (error) setError(null);
  };

  const toggleRol = (rolId) => {
    setRolesSeleccionados([rolId]);
    if (errores.roles) {
      setErrores((prev) => ({ ...prev, roles: null }));
    }
    if (error) setError(null);
  };

  const validar = () => {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = "El nombre es obligatorio.";
    if (!form.apellido.trim()) errs.apellido = "El apellido es obligatorio.";
    if (!form.email.trim()) {
      errs.email = "El correo es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      errs.email = "Ingresa un correo con formato válido.";
    }
    const dniLimpio = form.dni.trim().replace(/\D/g, "");
    if (!dniLimpio) {
      errs.dni = "El DNI es obligatorio.";
    } else if (!/^\d{7,9}$/.test(dniLimpio)) {
      errs.dni = "El DNI debe contener entre 7 y 9 dígitos numéricos.";
    }
    const telLimpio = form.telefono.trim();
    if (telLimpio && !/^[\d\s+()-]{6,30}$/.test(telLimpio)) {
      errs.telefono = "El teléfono solo admite números, espacios y + ( ) - (6 a 30 caracteres).";
    }
    if (mostrarCambioPassword) {
      if (!form.password) {
        errs.password = "Ingresa la nueva contraseña.";
      } else if (form.password.length < 8 || form.password.length > 120) {
        errs.password = "La contraseña debe tener entre 8 y 120 caracteres.";
      }
      if (form.password && form.password !== form.confirmPassword) {
        errs.confirmPassword = "Las contraseñas no coinciden.";
      }
    }
    if (rolesSeleccionados.length === 0) {
      errs.roles = "Debes asignar al menos un rol al usuario.";
    }
    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!validar() || guardando) return;

    const payloadDatos = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      email: form.email.trim().toLowerCase(),
      dni: form.dni.trim().replace(/\D/g, ""),
      telefono: form.telefono.trim()
    };

    const dniOriginal = usuario.dni && usuario.dni !== "-" ? String(usuario.dni).replace(/\D/g, "") : "";
    const telOriginal = usuario.telefono && usuario.telefono !== "-" ? String(usuario.telefono).trim() : "";
    const datosCambiaron =
      payloadDatos.nombre !== (usuario.nombre || "") ||
      payloadDatos.apellido !== (usuario.apellido || "") ||
      payloadDatos.email !== String(usuario.email || "").trim().toLowerCase() ||
      payloadDatos.dni !== dniOriginal ||
      payloadDatos.telefono !== telOriginal;
    const cambioPassword = mostrarCambioPassword && Boolean(form.password);

    const rolesOriginales = (usuario.roles || [])
      .map((r) => (typeof r === "string" ? r : r.id))
      .filter(Boolean)
      .sort()
      .join(",");
    const rolesNuevos = [...rolesSeleccionados].sort().join(",");
    const rolesCambiaron = rolesOriginales !== rolesNuevos;

    setGuardando(true);
    setError(null);

    try {
      if (datosCambiaron || cambioPassword) {
        const payloadActualizar = {
          ...(datosCambiaron ? payloadDatos : {}),
          ...(cambioPassword ? { password: form.password } : {})
        };
        await DirectorService.actualizarPerfil(usuario.id, payloadActualizar);
      }
      if (rolesCambiaron) {
        await DirectorService.actualizarRoles(usuario.id, rolesSeleccionados);
      }

      if (alUsuarioActualizado) {
        alUsuarioActualizado(usuario.id, { ...payloadDatos, roles: rolesSeleccionados });
      } else if (alRolesActualizados) {
        alRolesActualizados(usuario.id, rolesSeleccionados);
      }
      alCerrar();
    } catch (err) {
      setError(err.message || "Error al actualizar los datos del usuario.");
    } finally {
      setGuardando(false);
    }
  };

  const nombreDisplay = usuario.nombreCompleto || usuario.nombre || usuario.displayName || usuario.email || "Usuario";

  return createPortal(
    h(
      "div",
      {
        className: "director-modal-backdrop",
        onClick: (e) => e.target === e.currentTarget && !guardando && alCerrar()
      },
      h(
        "div",
        {
          className: "director-modal-container director-modal-container--perfil",
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "modal-edit-roles-titulo"
        },

        // Header
        h(
          "div",
          { className: "director-modal-header" },
          h(
            "div",
            null,
            h("h2", { id: "modal-edit-roles-titulo", className: "director-modal-title" }, "Editar Datos y Rol del Usuario"),
            h(
              "p",
              { className: "director-modal-subtitle" },
              "Usuario: ",
              h("strong", null, nombreDisplay),
              usuario.email ? ` (${usuario.email})` : ""
            )
          ),
          h(
            "button",
            {
              type: "button",
              className: "director-modal-close-btn",
              onClick: alCerrar,
              disabled: guardando,
              "aria-label": "Cerrar"
            },
            h(IconClose, null)
          )
        ),

        // Formulario
        h(
          "form",
          { className: "director-modal-form", onSubmit: handleGuardar },

          error
            ? h(
                "div",
                { className: "director-form-alert director-form-alert--error" },
                error
              )
            : null,

          // Fila 1: Nombre y Apellido
          h(
            "div",
            { className: "director-form-row" },
            h(
              "div",
              { className: "director-form-group" },
              h("label", { className: "director-form-label", htmlFor: "edit-usuario-nombre" }, "Nombre *"),
              h("input", {
                id: "edit-usuario-nombre",
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
              h("label", { className: "director-form-label", htmlFor: "edit-usuario-apellido" }, "Apellido *"),
              h("input", {
                id: "edit-usuario-apellido",
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
              h("label", { className: "director-form-label", htmlFor: "edit-usuario-email" }, "Correo Electrónico Institucional *"),
              h("input", {
                id: "edit-usuario-email",
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
              h("label", { className: "director-form-label", htmlFor: "edit-usuario-dni" }, "DNI (sin puntos) *"),
              h("input", {
                id: "edit-usuario-dni",
                type: "text",
                inputMode: "numeric",
                autoComplete: "off",
                maxLength: 9,
                className: `director-form-input ${errores.dni ? "director-form-input--error" : ""}`,
                placeholder: "Ej: 32456789",
                value: form.dni,
                onChange: (e) => handleChange("dni", e.target.value.replace(/\D/g, "").slice(0, 9))
              }),
              errores.dni ? h("span", { className: "director-form-error" }, errores.dni) : null
            )
          ),

          // Fila 3: Teléfono y acción para cambiar contraseña
          h(
            "div",
            { className: "director-form-row" },
            h(
              "div",
              { className: "director-form-group" },
              h("label", { className: "director-form-label", htmlFor: "edit-usuario-telefono" }, "Teléfono de Contacto (opcional)"),
              h("input", {
                id: "edit-usuario-telefono",
                type: "tel",
                className: `director-form-input ${errores.telefono ? "director-form-input--error" : ""}`,
                placeholder: "+54 11 4567-8900",
                value: form.telefono,
                onChange: (e) => handleChange("telefono", e.target.value)
              }),
              errores.telefono ? h("span", { className: "director-form-error" }, errores.telefono) : null
            ),
            h(
              "div",
              { className: "director-form-group", style: { justifyContent: "flex-end" } },
              h("label", { className: "director-form-label" }, "Seguridad de acceso"),
              h(
                "button",
                {
                  type: "button",
                  className: "btn-director-secondary",
                  onClick: () => {
                    if (mostrarCambioPassword) {
                      setMostrarCambioPassword(false);
                      setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
                      setErrores((prev) => ({ ...prev, password: null, confirmPassword: null }));
                    } else {
                      setMostrarCambioPassword(true);
                    }
                  }
                },
                mostrarCambioPassword ? "Cancelar cambio de contraseña" : "Cambiar contraseña"
              )
            )
          ),

          // Fila 4: Nueva Contraseña y Confirmación (solo visible al hacer clic en Cambiar contraseña)
          mostrarCambioPassword
            ? h(
                "div",
                { className: "director-form-row" },
                h(
                  "div",
                  { className: "director-form-group" },
                  h("label", { className: "director-form-label", htmlFor: "edit-usuario-password" }, "Nueva Contraseña *"),
                  h("input", {
                    id: "edit-usuario-password",
                    type: "password",
                    autoComplete: "new-password",
                    className: `director-form-input ${errores.password ? "director-form-input--error" : ""}`,
                    placeholder: "Mínimo 8 caracteres",
                    value: form.password,
                    onChange: (e) => handleChange("password", e.target.value)
                  }),
                  errores.password ? h("span", { className: "director-form-error" }, errores.password) : null
                ),
                h(
                  "div",
                  { className: "director-form-group" },
                  h("label", { className: "director-form-label", htmlFor: "edit-usuario-confirm-password" }, "Confirmar Nueva Contraseña *"),
                  h("input", {
                    id: "edit-usuario-confirm-password",
                    type: "password",
                    autoComplete: "new-password",
                    className: `director-form-input ${errores.confirmPassword ? "director-form-input--error" : ""}`,
                    placeholder: "Repetir nueva contraseña",
                    value: form.confirmPassword,
                    onChange: (e) => handleChange("confirmPassword", e.target.value)
                  }),
                  errores.confirmPassword ? h("span", { className: "director-form-error" }, errores.confirmPassword) : null
                )
              )
            : null,

          // Sección de Rol
          h(
            "div",
            { className: "director-roles-section" },
            h(
              "div",
              { className: "director-roles-header" },
              h("label", { className: "director-form-label" }, "Rol Institucional *"),
              h("span", { className: "director-roles-sublabel" }, "Selecciona el rol institucional asignado al usuario.")
            ),
            errores.roles ? h("span", { className: "director-form-error" }, errores.roles) : null,

            h(
              "div",
              { className: "director-roles-grid", role: "radiogroup" },
              ROLES_DISPONIBLES.map((rol) => {
                const seleccionado = rolesSeleccionados.length === 1 && rolesSeleccionados[0] === rol.id;

                return h(
                  "div",
                  {
                    key: rol.id,
                    role: "radio",
                    "aria-checked": seleccionado,
                    className: `director-role-card ${seleccionado ? "director-role-card--active" : ""}`,
                    onClick: () => toggleRol(rol.id)
                  },
                  h(
                    "div",
                    { className: "director-role-card__header" },
                    h(
                      "div",
                      {
                        className: "director-role-card__radio",
                        style: {
                          borderColor: seleccionado ? rol.color : "#cbd5e1",
                          background: seleccionado ? rol.color : "#ffffff"
                        }
                      },
                      seleccionado
                        ? h("span", { className: "director-role-card__radio-dot" })
                        : null
                    ),
                    h("strong", { className: "director-role-card__title" }, rol.nombre)
                  ),
                  h("p", { className: "director-role-card__desc" }, rol.descripcion)
                );
              })
            )
          ),

          // Footer
          h(
            "div",
            { className: "director-modal-footer" },
            h(
              "button",
              {
                type: "button",
                className: "btn-director-secondary",
                onClick: alCerrar,
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
              guardando ? "Guardando..." : "Guardar Cambios"
            )
          )
        )
      )
    ),
    document.body
  );
}
