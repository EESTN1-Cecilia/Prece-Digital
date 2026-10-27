import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { h } from "../../../layouts/site-layout.js";
import { ROLES_DISPONIBLES, DirectorService } from "../director-service.js";
import { CustomSelect } from "../../../components/common/custom-select.js";

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

function IconBook({ className = "w-4 h-4", width = "18", height = "18" }) {
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
    h("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
    h("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" })
  );
}

const SITUACIONES_REVISTA = [
  { id: "titular", nombre: "Titular" },
  { id: "provisional", nombre: "Provisional" },
  { id: "suplente", nombre: "Suplente" }
];

const FORMULARIO_INICIAL = {
  nombre: "",
  apellido: "",
  email: "",
  dni: "",
  telefono: "",
  area: "Docencia",
  roles: [],
  materia: "",
  situacionRevista: "titular",
  docenteSuplido: "",
  modulos: 4,
  horaDesde: "",
  horaHasta: ""
};

export function NuevoPerfilModal({ abierto, alCerrar, alPerfilCreado }) {
  const [form, setForm] = useState(FORMULARIO_INICIAL);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [creadoExitoso, setCreadoExitoso] = useState(null);
  const [copiado, setCopiado] = useState(false);

  // Bloquea el scroll de la pagina mientras el modal esta abierto
  useEffect(() => {
    if (!abierto) return undefined;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierto]);

  if (!abierto) return null;

  const esDocente = form.roles.includes("docente");

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    const claveError = campo === "horaDesde" || campo === "horaHasta" ? "horario" : campo;
    if (errores[claveError]) {
      setErrores((prev) => ({ ...prev, [claveError]: null }));
    }
  };

  const toggleRol = (rolId) => {
    setForm((prev) => {
      // Solo se puede asignar un único rol
      const nuevosRoles = [rolId];
      return {
        ...prev,
        roles: nuevosRoles,
        situacionRevista: rolId === "docente" ? (prev.situacionRevista || "titular") : prev.situacionRevista,
        modulos: rolId === "docente" ? (prev.modulos || 4) : prev.modulos
      };
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
      errs.roles = "Selecciona un rol para el perfil.";
    }
    if (esDocente) {
      if (!form.materia.trim()) errs.materia = "Indica la materia que dicta.";
      if (!form.situacionRevista) errs.situacionRevista = "Selecciona la situación de revista.";
      if (form.situacionRevista === "suplente" && !form.docenteSuplido.trim()) {
        errs.docenteSuplido = "Ingresa el apellido y nombre del docente al que suple.";
      }
      const mod = parseInt(form.modulos, 10);
      if (isNaN(mod) || mod <= 0) {
        errs.modulos = "Indica la cantidad de módulos semanales (mayor a 0).";
      }
      if (!form.horaDesde || !form.horaHasta) {
        errs.horario = "Completa el horario desde y hasta.";
      } else if (form.horaHasta <= form.horaDesde) {
        errs.horario = "La hora de fin debe ser posterior a la de inicio.";
      }
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

  const contenido = h(
    "div",
    { className: "director-modal-backdrop", onClick: (e) => e.target === e.currentTarget && handleCerrarModal() },
    h(
      "div",
      {
        className: `director-modal-container director-modal-container--perfil ${esDocente ? "director-modal-container--wide-docente" : ""}`,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "modal-director-titulo"
      },

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

            // Layout flexible: en 1 columna o 2 columnas (con panel docente al costado derecho)
            h(
              "div",
              { className: `director-modal-perfil-grid ${esDocente ? "director-modal-perfil-grid--split" : ""}` },

              // COLUMNA PRINCIPAL (Izquierda): Datos del Usuario y Asignación de Roles
              h(
                "div",
                { className: "director-modal-perfil-col-left" },

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
                    h(CustomSelect, {
                      id: "area-perfil-modal",
                      value: form.area,
                      onChange: (val) => handleChange("area", val),
                      options: [
                        { value: "Dirección", label: "Equipo Directivo" },
                        { value: "Secretaría", label: "Secretaría y Administración" },
                        { value: "Preceptoría", label: "Cuerpo de Preceptoría" },
                        { value: "Informática", label: "Dpto. Informática y Programación" },
                        { value: "Electromecánica", label: "Dpto. Electromecánica" },
                        { value: "Taller", label: "Área de Talleres Técnicos" },
                        { value: "Exactas", label: "Ciencias Exactas y Naturales" },
                        { value: "Docencia", label: "Cuerpo Docente General" }
                      ],
                      ariaLabel: "Área / Departamento Escolar",
                      className: "director-form-custom-select"
                    })
                  )
                ),

                // Sección: Asignación de Roles Visual (solo los 5 roles permitidos, rol único)
                h(
                  "div",
                  { className: "director-roles-section" },
                  h(
                    "div",
                    { className: "director-roles-header" },
                    h("label", { className: "director-form-label" }, "Asignación de Rol *"),
                    h("span", { className: "director-roles-sublabel" }, "Selecciona el rol institucional para el usuario (rol único).")
                  ),
                  errores.roles ? h("span", { className: "director-form-error" }, errores.roles) : null,

                  h(
                    "div",
                    { className: `director-roles-grid ${esDocente ? "director-roles-grid--compact" : ""}`, role: "radiogroup" },
                    ROLES_DISPONIBLES.map((rol) => {
                      const seleccionado = form.roles.length === 1 && form.roles[0] === rol.id;

                      return h(
                        "button",
                        {
                          key: rol.id,
                          type: "button",
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
                )
              ),

              // COLUMNA DERECHA: Datos del Cargo Docente (al costado derecho con el diseño de docente)
              esDocente
                ? h(
                    "div",
                    { className: "director-modal-perfil-col-right" },
                    h(
                      "div",
                      { className: "director-docente-section" },
                      h(
                        "div",
                        { className: "director-docente-section__header" },
                        h("span", { className: "director-docente-section__icon" }, h(IconBook, null)),
                        h(
                          "div",
                          null,
                          h("strong", { className: "director-docente-section__title" }, "Datos del Cargo Docente"),
                          h("span", { className: "director-roles-sublabel" }, "Materia, situación de revista y carga horaria semanal.")
                        )
                      ),

                      // Materia
                      h(
                        "div",
                        { className: "director-form-group" },
                        h("label", { className: "director-form-label", htmlFor: "perfil-materia" }, "Materia que dicta *"),
                        h("input", {
                          id: "perfil-materia",
                          type: "text",
                          className: `director-form-input ${errores.materia ? "director-form-input--error" : ""}`,
                          placeholder: "Ej: Matemática, Programación, etc.",
                          value: form.materia,
                          onChange: (e) => handleChange("materia", e.target.value)
                        }),
                        errores.materia ? h("span", { className: "director-form-error" }, errores.materia) : null
                      ),

                      // Situación de revista (diseño idéntico al de asignación docente)
                      h(
                        "div",
                        { className: "director-form-group" },
                        h("label", { className: "director-form-label" }, "Situación de Revista *"),
                        h(
                          "div",
                          { className: "asignaciones-situacion-grid asignaciones-situacion-grid--compact" },
                          [
                            { id: "titular", label: "Titular", desc: "Cargo efectivo" },
                            { id: "provisorio", label: "Provisorio", desc: "Vacante transitoria" },
                            { id: "suplente", label: "Suplente", desc: "Reemplazo de titular" }
                          ].map((sit) =>
                            h(
                              "div",
                              {
                                key: sit.id,
                                className: `asignaciones-situacion-card asignaciones-situacion-card--compact ${
                                  form.situacionRevista === sit.id ? `asignaciones-situacion-card--active-${sit.id}` : ""
                                }`,
                                onClick: () => handleChange("situacionRevista", sit.id)
                              },
                              h("span", { className: "asignaciones-situacion-title" }, sit.label),
                              h("span", { className: "asignaciones-situacion-desc" }, sit.desc)
                            )
                          )
                        ),
                        errores.situacionRevista
                          ? h("span", { className: "director-form-error" }, errores.situacionRevista)
                          : null
                      ),

                      // Docente al que suple (solo si es suplente)
                      form.situacionRevista === "suplente"
                        ? h(
                            "div",
                            { className: "director-form-group" },
                            h(
                              "label",
                              { className: "director-form-label", htmlFor: "perfil-docente-suplido" },
                              "Apellido y Nombre del Docente al que suple *"
                            ),
                            h("input", {
                              id: "perfil-docente-suplido",
                              type: "text",
                              className: `director-form-input ${errores.docenteSuplido ? "director-form-input--error" : ""}`,
                              placeholder: "Ej: Fernández, Carlos",
                              value: form.docenteSuplido,
                              onChange: (e) => handleChange("docenteSuplido", e.target.value)
                            }),
                            errores.docenteSuplido
                              ? h("span", { className: "director-form-error" }, errores.docenteSuplido)
                              : null
                          )
                        : null,

                      // Módulos semanales (diseño stepper con chips idéntico al de docente)
                      h(
                        "div",
                        { className: "director-form-group" },
                        h(
                          "div",
                          { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
                          h("label", { className: "director-form-label" }, "Módulos Semanales *"),
                          h(
                            "span",
                            { className: "asignaciones-materia-modulos-detail" },
                            !form.modulos || parseInt(form.modulos, 10) <= 0
                              ? "0 módulos semanales"
                              : `${form.modulos} ${parseInt(form.modulos, 10) === 1 ? "módulo semanal" : "módulos semanales"}`
                          )
                        ),
                        h(
                          "div",
                          { className: "asignaciones-stepper-wrap asignaciones-stepper-wrap--compact" },
                          h(
                            "button",
                            {
                              type: "button",
                              className: "asignaciones-stepper-btn asignaciones-stepper-btn--compact",
                              onClick: () => {
                                const actual = parseInt(form.modulos, 10) || 0;
                                handleChange("modulos", Math.max(1, actual - 1));
                              },
                              disabled: (parseInt(form.modulos, 10) || 0) <= 1,
                              title: "Restar 1 módulo"
                            },
                            "−"
                          ),
                          h("input", {
                            type: "number",
                            min: "1",
                            max: "10",
                            step: "1",
                            className: "asignaciones-stepper-input asignaciones-stepper-input--compact",
                            value: form.modulos || "",
                            placeholder: "0",
                            onChange: (e) => {
                              const val = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                              handleChange("modulos", val);
                            }
                          }),
                          h(
                            "button",
                            {
                              type: "button",
                              className: "asignaciones-stepper-btn asignaciones-stepper-btn--compact",
                              onClick: () => {
                                const actual = parseInt(form.modulos, 10) || 0;
                                handleChange("modulos", Math.min(10, actual + 1));
                              },
                              disabled: (parseInt(form.modulos, 10) || 0) >= 10,
                              title: "Sumar 1 módulo"
                            },
                            "+"
                          ),
                          // Atajos rápidos del 1 al 8
                          h(
                            "div",
                            { className: "asignaciones-stepper-chips asignaciones-stepper-chips--compact" },
                            [1, 2, 3, 4, 5, 6, 7, 8].map((num) =>
                              h(
                                "button",
                                {
                                  key: num,
                                  type: "button",
                                  className: `asignaciones-chip-btn asignaciones-chip-btn--compact ${
                                    parseInt(form.modulos, 10) === num ? "asignaciones-chip-btn--active" : ""
                                  }`,
                                  onClick: () => handleChange("modulos", num),
                                  title: `${num} módulo${num > 1 ? "s" : ""} semanales`
                                },
                                `${num} mód`
                              )
                            )
                          )
                        ),
                        errores.modulos ? h("span", { className: "director-form-error" }, errores.modulos) : null
                      ),

                      // Horario desde / hasta
                      h(
                        "div",
                        { className: "director-form-group" },
                        h("label", { className: "director-form-label" }, "Horario Semanal *"),
                        h(
                          "div",
                          { className: "director-horario-row" },
                          h("label", { className: "director-horario-label", htmlFor: "perfil-hora-desde" }, "Desde"),
                          h("input", {
                            id: "perfil-hora-desde",
                            type: "time",
                            className: `director-form-input ${errores.horario ? "director-form-input--error" : ""}`,
                            value: form.horaDesde,
                            onChange: (e) => handleChange("horaDesde", e.target.value)
                          }),
                          h("label", { className: "director-horario-label", htmlFor: "perfil-hora-hasta" }, "Hasta"),
                          h("input", {
                            id: "perfil-hora-hasta",
                            type: "time",
                            className: `director-form-input ${errores.horario ? "director-form-input--error" : ""}`,
                            value: form.horaHasta,
                            onChange: (e) => handleChange("horaHasta", e.target.value)
                          })
                        ),
                        errores.horario ? h("span", { className: "director-form-error" }, errores.horario) : null
                      )
                    )
                  )
                : null
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

  // Se dibuja sobre <body> para que el difuminado cubra toda la pantalla
  return createPortal(contenido, document.body);
}
