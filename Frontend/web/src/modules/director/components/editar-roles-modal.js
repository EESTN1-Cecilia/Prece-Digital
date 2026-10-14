import React, { useEffect, useState } from "react";
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

export function EditarRolesModal({ usuario, abierto, alCerrar, alRolesActualizados }) {
  const [rolesSeleccionados, setRolesSeleccionados] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (usuario) {
      const ids = (usuario.roles || []).map((r) => typeof r === "string" ? r : r.id);
      setRolesSeleccionados(ids);
      setError(null);
    }
  }, [usuario]);

  if (!abierto || !usuario) return null;

  const toggleRol = (rolId) => {
    setRolesSeleccionados((prev) =>
      prev.includes(rolId) ? prev.filter((r) => r !== rolId) : [...prev, rolId]
    );
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (rolesSeleccionados.length === 0) {
      setError("Debes asignar al menos un rol al usuario.");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      await DirectorService.actualizarRoles(usuario.id, rolesSeleccionados);
      if (alRolesActualizados) {
        alRolesActualizados(usuario.id, rolesSeleccionados);
      }
      alCerrar();
    } catch (err) {
      setError(err.message || "Error al actualizar los roles del usuario.");
    } finally {
      setGuardando(false);
    }
  };

  return h(
    "div",
    { className: "director-modal-backdrop", onClick: (e) => e.target === e.currentTarget && alCerrar() },
    h(
      "div",
      { className: "director-modal-container", role: "dialog", "aria-modal": "true", "aria-labelledby": "modal-edit-roles-titulo" },

      // Header
      h(
        "div",
        { className: "director-modal-header" },
        h(
          "div",
          null,
          h("h2", { id: "modal-edit-roles-titulo", className: "director-modal-title" }, "Modificar Roles y Permisos"),
          h(
            "p",
            { className: "director-modal-subtitle" },
            `Usuario: `,
            h("strong", null, usuario.nombreCompleto),
            ` (${usuario.email})`
          )
        ),
        h(
          "button",
          {
            type: "button",
            className: "director-modal-close-btn",
            onClick: alCerrar,
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

        h(
          "div",
          { className: "director-roles-grid" },
          ROLES_DISPONIBLES.map((rol) => {
            const seleccionado = rolesSeleccionados.includes(rol.id);

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
            guardando ? "Guardando..." : "Guardar Roles Asignados"
          )
        )
      )
    )
  );
}
