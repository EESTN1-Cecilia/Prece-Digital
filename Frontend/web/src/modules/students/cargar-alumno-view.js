import React, { useState, useEffect } from "react";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { StudentsService } from "./students-service.js";
import { AuthService } from "../../services/auth-service.js";

export default function CargarAlumnoView() {
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(null);
  const [errors, setErrors] = useState({});

  // Escuchar cambios de rol globales
  useEffect(() => {
    const handleRoleChanged = (e) => {
      setUser(e.detail);
    };
    window.addEventListener("auth:role_changed", handleRoleChanged);
    return () => window.removeEventListener("auth:role_changed", handleRoleChanged);
  }, []);

  // Estado unificado del formulario
  const [formData, setFormData] = useState({
    // Paso 1: Datos del Estudiante
    nombre: "",
    apellido: "",
    dni: "",
    cuil: "",
    genero: "Masculino",
    fechaNacimiento: "",
    curso: "1°",
    division: "1",
    turno: "Mañana",
    estado: "Activo",
    fechaIngreso: new Date().toISOString().split("T")[0],
    pais: "Argentina",
    provincia: "Buenos Aires",
    distrito: "Esteban Echeverría",
    localidad: "Monte Grande",
    codigoPostal: "1842",

    // Paso 2: Datos del Tutor
    tutorNombre: "",
    tutorApellido: "",
    tutorDni: "",
    tutorCuil: "",
    tutorGenero: "Femenino",
    tutorFechaNacimiento: "",
    tutorParentesco: "Madre",
    tutorTelefono: "",
    tutorEmail: "",
    // Domicilio del Tutor
    tutorCalle: "",
    tutorAltura: "",
    tutorPiso: "",
    tutorTorre: "",
    tutorDepto: "",
    tutorEntreCalle1: "",
    tutorEntreCalle2: "",
    tutorProvincia: "Buenos Aires",
    tutorDistrito: "Esteban Echeverría",
    tutorLocalidad: "Monte Grande",
    tieneSegundoTutor: false,
    tutor2Nombre: "",
    tutor2Apellido: "",
    tutor2Dni: "",
    tutor2Parentesco: "Padre",
    tutor2Telefono: "",

    // Paso 3: Otros Datos
    mismoDomicilioQueTutor: true,
    alumnoCalle: "",
    alumnoAltura: "",
    alumnoPiso: "",
    alumnoTorre: "",
    alumnoDepto: "",
    alumnoEntreCalle1: "",
    alumnoEntreCalle2: "",
    alumnoProvincia: "Buenos Aires",
    alumnoDistrito: "Esteban Echeverría",
    alumnoLocalidad: "Monte Grande",
    telefonoParticular: "",
    emailParticular: "",
    telefonoEmergencia: "",
    contactoEmergenciaNombre: "",
    obraSocial: "",
    numeroAfiliado: "",
    grupoSanguineo: "0+",
    observacionesSalud: "",

    // Paso 4: Documentos
    documentoTipo: "DNI del Estudiante (Frente y Dorso)",
    documentos: [
      { id: 1, tipo: "DNI del Estudiante (Frente y Dorso)", nombre: "dni_estudiante_frente_dorso.pdf", tamano: "1.4 MB", fecha: "Hoy" },
      { id: 2, tipo: "Partida de Nacimiento", nombre: "partida_nacimiento_legalizada.pdf", tamano: "2.1 MB", fecha: "Hoy" }
    ]
  });

  const handleChange = (campo, valor) => {
    setFormData((prev) => ({
      ...prev,
      [campo]: valor
    }));
    if (errors[campo]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[campo];
        return next;
      });
    }
  };

  // Validaciones por paso
  const validarPaso = (paso) => {
    const errs = {};
    if (paso === 1) {
      if (!formData.nombre.trim()) errs.nombre = "El nombre es obligatorio.";
      if (!formData.apellido.trim()) errs.apellido = "El apellido es obligatorio.";
      if (!formData.dni.trim()) errs.dni = "El DNI es obligatorio.";
    } else if (paso === 2) {
      if (!formData.tutorNombre.trim()) errs.tutorNombre = "El nombre del tutor es obligatorio.";
      if (!formData.tutorApellido.trim()) errs.tutorApellido = "El apellido del tutor es obligatorio.";
      if (!formData.tutorTelefono.trim()) errs.tutorTelefono = "El teléfono de contacto es obligatorio.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSiguiente = () => {
    if (validarPaso(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((prev) => prev + 1);
        window.scrollTo({ top: 180, behavior: "smooth" });
      }
    }
  };

  const handleAnterior = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 180, behavior: "smooth" });
    } else {
      window.location.hash = "#/alumnos";
    }
  };

  const handleGuardar = async (e) => {
    if (e) e.preventDefault();
    if (!validarPaso(1) || !validarPaso(2)) {
      alert("Por favor complete los campos obligatorios antes de registrar al alumno.");
      return;
    }

    setSaving(true);
    try {
      // Domicilio unificado
      const calleFinal = formData.mismoDomicilioQueTutor ? formData.tutorCalle : formData.alumnoCalle;
      const alturaFinal = formData.mismoDomicilioQueTutor ? formData.tutorAltura : formData.alumnoAltura;
      const entreCallesFinal = formData.mismoDomicilioQueTutor
        ? `${formData.tutorEntreCalle1} y ${formData.tutorEntreCalle2}`
        : `${formData.alumnoEntreCalle1} y ${formData.alumnoEntreCalle2}`;

      const res = await StudentsService.createAlumno({
        ...formData,
        calle: calleFinal,
        altura: alturaFinal,
        entreCalles: entreCallesFinal,
        telefono: formData.telefonoParticular || formData.tutorTelefono
      });

      setSaveSuccess(res.data);
    } catch {
      alert("Ocurrió un inconveniente al guardar el estudiante. Intente nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDocumentoMock = () => {
    const nuevoDoc = {
      id: Date.now(),
      tipo: formData.documentoTipo,
      nombre: `doc_${formData.documentos.length + 1}_${Date.now().toString().slice(-4)}.pdf`,
      tamano: "1.2 MB",
      fecha: "Recién cargado"
    };
    setFormData((prev) => ({
      ...prev,
      documentos: [...prev.documentos, nuevoDoc]
    }));
  };

  const handleRemoveDocumento = (docId) => {
    setFormData((prev) => ({
      ...prev,
      documentos: prev.documentos.filter((d) => d.id !== docId)
    }));
  };

  return h(
    "section",
    { className: "cargar-alumno-page secretaria-dashboard" },

    // Barra superior: Volver al listado e información escolar
    h(
      "div",
      { className: "secretaria-top-bar" },
      h(
        "button",
        {
          type: "button",
          className: "btn-volver-atras",
          onClick: () => {
            window.location.hash = "#/alumnos";
          },
          title: "Volver al listado de alumnos",
          "aria-label": "Volver al listado de alumnos"
        },
        h(
          "svg",
          {
            className: "btn-volver-atras__icon",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            "aria-hidden": "true"
          },
          h("path", {
            fillRule: "evenodd",
            d: "M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z",
            clipRule: "evenodd"
          })
        ),
        h("span", null, "Volver al Listado de Alumnos")
      ),
      h(
        "div",
        { className: "secretaria-eyebrow" },
        `${user.escuela || "E.E.S.T N°1 MONTE GRANDE"} · CICLO ${user.cicloLectivo || 2026}`
      )
    ),

    // Título y bajada descriptiva
    h(
      "div",
      { className: "secretaria-title-row" },
      h(
        "div",
        null,
        h("h1", { className: "secretaria-title" }, "Cargar Alumno"),
        h(
          "p",
          { className: "secretaria-subtitle" },
          "Formulario oficial de matriculación y alta de estudiantes en el padrón institucional."
        )
      ),
      h(
        "div",
        { className: "wizard-badge-step" },
        `Paso ${currentStep} de 4`
      )
    ),

    // Modal o aviso de confirmación exitosa
    saveSuccess
      ? h(
          "div",
          { className: "save-success-banner" },
          h(
            "div",
            { className: "save-success-icon-wrap" },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "currentColor", width: 28, height: 28 },
              h("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" })
            )
          ),
          h(
            "div",
            { className: "save-success-text" },
            h("h3", null, "¡Estudiante Registrado con Éxito!"),
            h(
              "p",
              null,
              `Se dio de alta en el sistema a `,
              h("strong", null, `${saveSuccess.apellido}, ${saveSuccess.nombre}`),
              ` con Legajo `,
              h("span", { className: "legajo-pill" }, saveSuccess.legajo),
              ` asignado a ${saveSuccess.curso} ${saveSuccess.division}° división (Turno ${saveSuccess.turno}).`
            )
          ),
          h(
            "div",
            { className: "save-success-actions" },
            h(
              "button",
              {
                type: "button",
                className: "btn-volver-listado-success",
                onClick: () => {
                  window.location.hash = "#/alumnos";
                }
              },
              "Ir al Listado de Alumnos"
            ),
            h(
              "button",
              {
                type: "button",
                className: "btn-cargar-otro",
                onClick: () => {
                  setSaveSuccess(null);
                  setCurrentStep(1);
                  setFormData((prev) => ({
                    ...prev,
                    nombre: "",
                    apellido: "",
                    dni: "",
                    cuil: "",
                    tutorNombre: "",
                    tutorApellido: "",
                    tutorDni: "",
                    tutorTelefono: ""
                  }));
                }
              },
              "+ Cargar Otro Alumno"
            )
          )
        )
      : null,

    // Selector de Pestañas / Pasos tipo Dashboard
    h(
      "div",
      { className: "wizard-tabs-container", role: "tablist", "aria-label": "Pasos de registro" },
      [
        { step: 1, title: "Datos del Estudiante", subtitle: "Ficha personal y nacimiento" },
        { step: 2, title: "Datos del Tutor", subtitle: "Responsables y domicilio" },
        { step: 3, title: "Otros Datos", subtitle: "Domicilio, contacto y salud" },
        { step: 4, title: "Documentos", subtitle: "Legajo y documentación" }
      ].map((tab) => {
        const isActive = currentStep === tab.step;
        const isCompleted = currentStep > tab.step;
        return h(
          "button",
          {
            key: tab.step,
            type: "button",
            role: "tab",
            "aria-selected": isActive,
            className: `wizard-tab-btn ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`,
            onClick: () => {
              if (tab.step < currentStep || validarPaso(currentStep)) {
                setCurrentStep(tab.step);
              }
            }
          },
          h("span", { className: "wizard-tab-number" }, isCompleted ? "✓" : String(tab.step)),
          h(
            "div",
            { className: "wizard-tab-text" },
            h("span", { className: "wizard-tab-title" }, tab.title),
            h("span", { className: "wizard-tab-subtitle" }, tab.subtitle)
          )
        );
      })
    ),

    // Tarjeta del Formulario Principal
    h(
      DashboardCard,
      {
        title:
          currentStep === 1
            ? "1. Datos del Estudiante"
            : currentStep === 2
            ? "2. Datos del Tutor y Familiares"
            : currentStep === 3
            ? "3. Domicilio, Contacto y Salud"
            : "4. Documentación y Confirmación",
        icon: currentStep === 4 ? "clipboard" : "user-search",
        className: "dashboard-card--highlight cargar-alumno-card",
        collapsible: false
      },

      h(
        "form",
        {
          className: "wizard-form-body",
          onSubmit: (e) => e.preventDefault()
        },

        // ==========================================
        // PASO 1: DATOS DEL ESTUDIANTE
        // ==========================================
        currentStep === 1
          ? h(
              React.Fragment,
              null,

              // Sección Alumno
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Datos del Alumno"),
                h("span", { className: "form-section-desc" }, "Información de identidad y cursada")
              ),
              h(
                "div",
                { className: "form-grid-3col" },

                // Nombre
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "nombre" }, "Nombre:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "nombre",
                    className: `form-field-input ${errors.nombre ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese nombre....",
                    value: formData.nombre,
                    onChange: (e) => handleChange("nombre", e.target.value)
                  }),
                  errors.nombre ? h("span", { className: "field-error-msg" }, errors.nombre) : null
                ),

                // Apellido
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "apellido" }, "Apellido:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "apellido",
                    className: `form-field-input ${errors.apellido ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese apellido....",
                    value: formData.apellido,
                    onChange: (e) => handleChange("apellido", e.target.value)
                  }),
                  errors.apellido ? h("span", { className: "field-error-msg" }, errors.apellido) : null
                ),

                // DNI
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "dni" }, "DNI:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "dni",
                    className: `form-field-input ${errors.dni ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese DNI....",
                    value: formData.dni,
                    onChange: (e) => handleChange("dni", e.target.value)
                  }),
                  errors.dni ? h("span", { className: "field-error-msg" }, errors.dni) : null
                ),

                // CUIL
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "cuil" }, "CUIL:"),
                  h("input", {
                    id: "cuil",
                    className: "form-field-input",
                    type: "text",
                    placeholder: "Ingrese CUIL....",
                    value: formData.cuil,
                    onChange: (e) => handleChange("cuil", e.target.value)
                  })
                ),

                // Género
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "genero" }, "Género:"),
                  h(
                    "select",
                    {
                      id: "genero",
                      className: "form-field-select",
                      value: formData.genero,
                      onChange: (e) => handleChange("genero", e.target.value)
                    },
                    h("option", { value: "Masculino" }, "Masculino"),
                    h("option", { value: "Femenino" }, "Femenino"),
                    h("option", { value: "No binario" }, "No binario"),
                    h("option", { value: "Otro" }, "Otro")
                  )
                ),

                // Fecha de Nacimiento
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "fechaNacimiento" }, "Fecha de Nacimiento:"),
                  h("input", {
                    id: "fechaNacimiento",
                    className: "form-field-input",
                    type: "date",
                    value: formData.fechaNacimiento,
                    onChange: (e) => handleChange("fechaNacimiento", e.target.value)
                  })
                ),

                // Curso
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "curso" }, "Curso:"),
                  h(
                    "select",
                    {
                      id: "curso",
                      className: "form-field-select",
                      value: formData.curso,
                      onChange: (e) => handleChange("curso", e.target.value)
                    },
                    ["1°", "2°", "3°", "4°", "5°", "6°", "7°"].map((c) =>
                      h("option", { key: c, value: c }, c)
                    )
                  )
                ),

                // División
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "division" }, "División:"),
                  h(
                    "select",
                    {
                      id: "division",
                      className: "form-field-select",
                      value: formData.division,
                      onChange: (e) => handleChange("division", e.target.value)
                    },
                    ["1", "2", "3", "4", "5", "6"].map((d) =>
                      h("option", { key: d, value: d }, `${d}° División`)
                    )
                  )
                ),

                // Turno
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "turno" }, "Turno:"),
                  h(
                    "select",
                    {
                      id: "turno",
                      className: "form-field-select",
                      value: formData.turno,
                      onChange: (e) => handleChange("turno", e.target.value)
                    },
                    h("option", { value: "Mañana" }, "Mañana"),
                    h("option", { value: "Tarde" }, "Tarde"),
                    h("option", { value: "Vespertino" }, "Vespertino"),
                    h("option", { value: "Doble Escolaridad" }, "Doble Escolaridad")
                  )
                ),

                // Estado
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "estado" }, "Estado:"),
                  h(
                    "select",
                    {
                      id: "estado",
                      className: "form-field-select",
                      value: formData.estado,
                      onChange: (e) => handleChange("estado", e.target.value)
                    },
                    h("option", { value: "Activo" }, "Activo"),
                    h("option", { value: "Inactivo" }, "Inactivo"),
                    h("option", { value: "Pase pendiente" }, "Pase pendiente")
                  )
                ),

                // Fecha de Ingreso
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "fechaIngreso" }, "Fecha de Ingreso:"),
                  h("input", {
                    id: "fechaIngreso",
                    className: "form-field-input",
                    type: "date",
                    value: formData.fechaIngreso,
                    onChange: (e) => handleChange("fechaIngreso", e.target.value)
                  })
                )
              ),

              // Separador decorativo
              h("div", { className: "form-divider" }),

              // Sección Lugar de Nacimiento
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Lugar de Nacimiento"),
                h("span", { className: "form-section-desc" }, "Datos de origen geográfico")
              ),
              h(
                "div",
                { className: "form-grid-3col" },

                // País
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "pais" }, "País:"),
                  h(
                    "select",
                    {
                      id: "pais",
                      className: "form-field-select",
                      value: formData.pais,
                      onChange: (e) => handleChange("pais", e.target.value)
                    },
                    h("option", { value: "Argentina" }, "Argentina"),
                    h("option", { value: "Bolivia" }, "Bolivia"),
                    h("option", { value: "Brasil" }, "Brasil"),
                    h("option", { value: "Chile" }, "Chile"),
                    h("option", { value: "Paraguay" }, "Paraguay"),
                    h("option", { value: "Uruguay" }, "Uruguay"),
                    h("option", { value: "Otro" }, "Otro")
                  )
                ),

                // Provincia
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "provincia" }, "Provincia:"),
                  h(
                    "select",
                    {
                      id: "provincia",
                      className: "form-field-select",
                      value: formData.provincia,
                      onChange: (e) => handleChange("provincia", e.target.value)
                    },
                    h("option", { value: "Buenos Aires" }, "Buenos Aires"),
                    h("option", { value: "CABA" }, "Ciudad Autónoma de Buenos Aires"),
                    h("option", { value: "Córdoba" }, "Córdoba"),
                    h("option", { value: "Santa Fe" }, "Santa Fe"),
                    h("option", { value: "Mendoza" }, "Mendoza"),
                    h("option", { value: "Otra" }, "Otra")
                  )
                ),

                // Distrito
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "distrito" }, "Distrito / Partido:"),
                  h(
                    "select",
                    {
                      id: "distrito",
                      className: "form-field-select",
                      value: formData.distrito,
                      onChange: (e) => handleChange("distrito", e.target.value)
                    },
                    h("option", { value: "Esteban Echeverría" }, "Esteban Echeverría"),
                    h("option", { value: "Ezeiza" }, "Ezeiza"),
                    h("option", { value: "Almirante Brown" }, "Almirante Brown"),
                    h("option", { value: "Lomas de Zamora" }, "Lomas de Zamora"),
                    h("option", { value: "Lanús" }, "Lanús"),
                    h("option", { value: "Otro" }, "Otro")
                  )
                ),

                // Localidad
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "localidad" }, "Localidad:"),
                  h(
                    "select",
                    {
                      id: "localidad",
                      className: "form-field-select",
                      value: formData.localidad,
                      onChange: (e) => handleChange("localidad", e.target.value)
                    },
                    h("option", { value: "Monte Grande" }, "Monte Grande"),
                    h("option", { value: "El Jagüel" }, "El Jagüel"),
                    h("option", { value: "Luis Guillón" }, "Luis Guillón"),
                    h("option", { value: "Canning" }, "Canning"),
                    h("option", { value: "9 de Julio" }, "9 de Julio"),
                    h("option", { value: "Otra" }, "Otra")
                  )
                ),

                // Código Postal
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "codigoPostal" }, "Código Postal:"),
                  h("input", {
                    id: "codigoPostal",
                    className: "form-field-input",
                    type: "text",
                    placeholder: "Ingrese Código Postal....",
                    value: formData.codigoPostal,
                    onChange: (e) => handleChange("codigoPostal", e.target.value)
                  })
                )
              )
            )
          : null,

        // ==========================================
        // PASO 2: DATOS DEL TUTOR
        // ==========================================
        currentStep === 2
          ? h(
              React.Fragment,
              null,

              // Sección Tutor Principal
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Tutor Principal"),
                h("span", { className: "form-section-desc" }, "Adulto responsable legal")
              ),
              h(
                "div",
                { className: "form-grid-3col" },

                // Nombre
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorNombre" }, "Nombre:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "tutorNombre",
                    className: `form-field-input ${errors.tutorNombre ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese nombre....",
                    value: formData.tutorNombre,
                    onChange: (e) => handleChange("tutorNombre", e.target.value)
                  }),
                  errors.tutorNombre ? h("span", { className: "field-error-msg" }, errors.tutorNombre) : null
                ),

                // Apellido
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorApellido" }, "Apellido:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "tutorApellido",
                    className: `form-field-input ${errors.tutorApellido ? "input-error" : ""}`,
                    type: "text",
                    placeholder: "Ingrese apellido....",
                    value: formData.tutorApellido,
                    onChange: (e) => handleChange("tutorApellido", e.target.value)
                  }),
                  errors.tutorApellido ? h("span", { className: "field-error-msg" }, errors.tutorApellido) : null
                ),

                // DNI
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorDni" }, "DNI:"),
                  h("input", {
                    id: "tutorDni",
                    className: "form-field-input",
                    type: "text",
                    placeholder: "Ingrese DNI....",
                    value: formData.tutorDni,
                    onChange: (e) => handleChange("tutorDni", e.target.value)
                  })
                ),

                // CUIL
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorCuil" }, "CUIL:"),
                  h("input", {
                    id: "tutorCuil",
                    className: "form-field-input",
                    type: "text",
                    placeholder: "Ingrese CUIL....",
                    value: formData.tutorCuil,
                    onChange: (e) => handleChange("tutorCuil", e.target.value)
                  })
                ),

                // Género
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorGenero" }, "Género:"),
                  h(
                    "select",
                    {
                      id: "tutorGenero",
                      className: "form-field-select",
                      value: formData.tutorGenero,
                      onChange: (e) => handleChange("tutorGenero", e.target.value)
                    },
                    h("option", { value: "Femenino" }, "Femenino"),
                    h("option", { value: "Masculino" }, "Masculino"),
                    h("option", { value: "No binario" }, "No binario"),
                    h("option", { value: "Otro" }, "Otro")
                  )
                ),

                // Fecha de Nacimiento
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorFechaNacimiento" }, "Fecha de Nacimiento:"),
                  h("input", {
                    id: "tutorFechaNacimiento",
                    className: "form-field-input",
                    type: "date",
                    value: formData.tutorFechaNacimiento,
                    onChange: (e) => handleChange("tutorFechaNacimiento", e.target.value)
                  })
                ),

                // Parentesco
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorParentesco" }, "Parentesco:"),
                  h(
                    "select",
                    {
                      id: "tutorParentesco",
                      className: "form-field-select",
                      value: formData.tutorParentesco,
                      onChange: (e) => handleChange("tutorParentesco", e.target.value)
                    },
                    h("option", { value: "Madre" }, "Madre"),
                    h("option", { value: "Padre" }, "Padre"),
                    h("option", { value: "Tutor/a Legal" }, "Tutor/a Legal"),
                    h("option", { value: "Abuelo/a" }, "Abuelo/a"),
                    h("option", { value: "Hermano/a Mayor" }, "Hermano/a Mayor"),
                    h("option", { value: "Otro" }, "Otro")
                  )
                ),

                // Teléfono
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorTelefono" }, "Teléfono de Contacto:", h("span", { className: "required-star" }, " *")),
                  h("input", {
                    id: "tutorTelefono",
                    className: `form-field-input ${errors.tutorTelefono ? "input-error" : ""}`,
                    type: "tel",
                    placeholder: "Ingrese Teléfono....",
                    value: formData.tutorTelefono,
                    onChange: (e) => handleChange("tutorTelefono", e.target.value)
                  }),
                  errors.tutorTelefono ? h("span", { className: "field-error-msg" }, errors.tutorTelefono) : null
                ),

                // Email
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorEmail" }, "Correo Electrónico:"),
                  h("input", {
                    id: "tutorEmail",
                    className: "form-field-input",
                    type: "email",
                    placeholder: "correo@ejemplo.com....",
                    value: formData.tutorEmail,
                    onChange: (e) => handleChange("tutorEmail", e.target.value)
                  })
                )
              ),

              // Separador
              h("div", { className: "form-divider" }),

              // Sección Domicilio del Tutor
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Domicilio"),
                h("span", { className: "form-section-desc" }, "Dirección de residencia del tutor")
              ),
              h(
                "div",
                { className: "form-grid-3col" },

                // Calle
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorCalle" }, "Calle:"),
                  h("input", {
                    id: "tutorCalle",
                    className: "form-field-input",
                    type: "text",
                    placeholder: "Calle....",
                    value: formData.tutorCalle,
                    onChange: (e) => handleChange("tutorCalle", e.target.value)
                  })
                ),

                // Altura
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorAltura" }, "Altura / Número:"),
                  h("input", {
                    id: "tutorAltura",
                    className: "form-field-input",
                    type: "text",
                    placeholder: "Altura....",
                    value: formData.tutorAltura,
                    onChange: (e) => handleChange("tutorAltura", e.target.value)
                  })
                ),

                // Piso / Torre / Depto
                h(
                  "div",
                  { className: "form-grid-3col-inner" },
                  h(
                    "div",
                    { className: "form-field-group" },
                    h("label", { className: "form-field-label", htmlFor: "tutorPiso" }, "Piso:"),
                    h("input", {
                      id: "tutorPiso",
                      className: "form-field-input",
                      type: "text",
                      placeholder: "Piso....",
                      value: formData.tutorPiso,
                      onChange: (e) => handleChange("tutorPiso", e.target.value)
                    })
                  ),
                  h(
                    "div",
                    { className: "form-field-group" },
                    h("label", { className: "form-field-label", htmlFor: "tutorTorre" }, "Torre:"),
                    h("input", {
                      id: "tutorTorre",
                      className: "form-field-input",
                      type: "text",
                      placeholder: "Torre....",
                      value: formData.tutorTorre,
                      onChange: (e) => handleChange("tutorTorre", e.target.value)
                    })
                  ),
                  h(
                    "div",
                    { className: "form-field-group" },
                    h("label", { className: "form-field-label", htmlFor: "tutorDepto" }, "Depto:"),
                    h("input", {
                      id: "tutorDepto",
                      className: "form-field-input",
                      type: "text",
                      placeholder: "Depto....",
                      value: formData.tutorDepto,
                      onChange: (e) => handleChange("tutorDepto", e.target.value)
                    })
                  )
                ),

                // Entre calles
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorEntreCalle1" }, "Entre calle 1:"),
                  h("input", {
                    id: "tutorEntreCalle1",
                    className: "form-field-input",
                    type: "text",
                    placeholder: "Entre calle....",
                    value: formData.tutorEntreCalle1,
                    onChange: (e) => handleChange("tutorEntreCalle1", e.target.value)
                  })
                ),
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorEntreCalle2" }, "Entre calle 2:"),
                  h("input", {
                    id: "tutorEntreCalle2",
                    className: "form-field-input",
                    type: "text",
                    placeholder: "Entre calle....",
                    value: formData.tutorEntreCalle2,
                    onChange: (e) => handleChange("tutorEntreCalle2", e.target.value)
                  })
                ),

                // Localidad
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label", htmlFor: "tutorLocalidad" }, "Localidad:"),
                  h(
                    "select",
                    {
                      id: "tutorLocalidad",
                      className: "form-field-select",
                      value: formData.tutorLocalidad,
                      onChange: (e) => handleChange("tutorLocalidad", e.target.value)
                    },
                    h("option", { value: "Monte Grande" }, "Monte Grande"),
                    h("option", { value: "El Jagüel" }, "El Jagüel"),
                    h("option", { value: "Luis Guillón" }, "Luis Guillón"),
                    h("option", { value: "Canning" }, "Canning"),
                    h("option", { value: "Otra" }, "Otra")
                  )
                )
              ),

              // Botón Agregar Segundo Tutor
              h(
                "div",
                { className: "agregar-extra-container" },
                !formData.tieneSegundoTutor
                  ? h(
                      "button",
                      {
                        type: "button",
                        className: "btn-agregar-extra",
                        onClick: () => handleChange("tieneSegundoTutor", true)
                      },
                      "+ Agregar segundo tutor o responsable"
                    )
                  : h(
                      "div",
                      { className: "segundo-tutor-box" },
                      h(
                        "div",
                        { className: "segundo-tutor-header" },
                        h("h4", null, "Segundo Tutor / Responsable Alternativo"),
                        h(
                          "button",
                          {
                            type: "button",
                            className: "btn-eliminar-extra",
                            onClick: () => handleChange("tieneSegundoTutor", false)
                          },
                          "✕ Quitar"
                        )
                      ),
                      h(
                        "div",
                        { className: "form-grid-3col" },
                        h(
                          "div",
                          { className: "form-field-group" },
                          h("label", { className: "form-field-label" }, "Nombre:"),
                          h("input", {
                            className: "form-field-input",
                            type: "text",
                            placeholder: "Nombre....",
                            value: formData.tutor2Nombre,
                            onChange: (e) => handleChange("tutor2Nombre", e.target.value)
                          })
                        ),
                        h(
                          "div",
                          { className: "form-field-group" },
                          h("label", { className: "form-field-label" }, "Apellido:"),
                          h("input", {
                            className: "form-field-input",
                            type: "text",
                            placeholder: "Apellido....",
                            value: formData.tutor2Apellido,
                            onChange: (e) => handleChange("tutor2Apellido", e.target.value)
                          })
                        ),
                        h(
                          "div",
                          { className: "form-field-group" },
                          h("label", { className: "form-field-label" }, "Teléfono:"),
                          h("input", {
                            className: "form-field-input",
                            type: "tel",
                            placeholder: "Teléfono....",
                            value: formData.tutor2Telefono,
                            onChange: (e) => handleChange("tutor2Telefono", e.target.value)
                          })
                        )
                      )
                    )
              )
            )
          : null,

        // ==========================================
        // PASO 3: OTROS DATOS
        // ==========================================
        currentStep === 3
          ? h(
              React.Fragment,
              null,

              // Domicilio del Alumno
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Domicilio del Alumno"),
                h(
                  "label",
                  { className: "checkbox-label-toggle" },
                  h("input", {
                    type: "checkbox",
                    checked: formData.mismoDomicilioQueTutor,
                    onChange: (e) => handleChange("mismoDomicilioQueTutor", e.target.checked)
                  }),
                  h("span", null, "Mismo domicilio que el tutor principal")
                )
              ),

              !formData.mismoDomicilioQueTutor
                ? h(
                    "div",
                    { className: "form-grid-3col" },
                    h(
                      "div",
                      { className: "form-field-group" },
                      h("label", { className: "form-field-label" }, "Calle:"),
                      h("input", {
                        className: "form-field-input",
                        type: "text",
                        placeholder: "Calle....",
                        value: formData.alumnoCalle,
                        onChange: (e) => handleChange("alumnoCalle", e.target.value)
                      })
                    ),
                    h(
                      "div",
                      { className: "form-field-group" },
                      h("label", { className: "form-field-label" }, "Altura:"),
                      h("input", {
                        className: "form-field-input",
                        type: "text",
                        placeholder: "Altura....",
                        value: formData.alumnoAltura,
                        onChange: (e) => handleChange("alumnoAltura", e.target.value)
                      })
                    ),
                    h(
                      "div",
                      { className: "form-field-group" },
                      h("label", { className: "form-field-label" }, "Localidad:"),
                      h(
                        "select",
                        {
                          className: "form-field-select",
                          value: formData.alumnoLocalidad,
                          onChange: (e) => handleChange("alumnoLocalidad", e.target.value)
                        },
                        h("option", { value: "Monte Grande" }, "Monte Grande"),
                        h("option", { value: "El Jagüel" }, "El Jagüel"),
                        h("option", { value: "Luis Guillón" }, "Luis Guillón"),
                        h("option", { value: "Canning" }, "Canning")
                      )
                    )
                  )
                : h(
                    "div",
                    { className: "info-box-sync" },
                    h("span", { className: "info-box-icon" }, "ℹ"),
                    h("p", null, "El domicilio registrado para el alumno se sincroniza automáticamente con el del tutor.")
                  ),

              h("div", { className: "form-divider" }),

              // Contacto y Emergencias
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Contacto y Emergencias"),
                h("span", { className: "form-section-desc" }, "Canales de comunicación directa")
              ),
              h(
                "div",
                { className: "form-grid-3col" },
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Teléfono particular del alumno:"),
                  h("input", {
                    className: "form-field-input",
                    type: "tel",
                    placeholder: "Ej: 11-4290-0000....",
                    value: formData.telefonoParticular,
                    onChange: (e) => handleChange("telefonoParticular", e.target.value)
                  })
                ),
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Email de contacto:"),
                  h("input", {
                    className: "form-field-input",
                    type: "email",
                    placeholder: "alumno@correo.com....",
                    value: formData.emailParticular,
                    onChange: (e) => handleChange("emailParticular", e.target.value)
                  })
                ),
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Teléfono de emergencia adicional:"),
                  h("input", {
                    className: "form-field-input",
                    type: "tel",
                    placeholder: "Teléfono de urgencias....",
                    value: formData.telefonoEmergencia,
                    onChange: (e) => handleChange("telefonoEmergencia", e.target.value)
                  })
                )
              ),

              h("div", { className: "form-divider" }),

              // Datos de Salud
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Datos de Salud"),
                h("span", { className: "form-section-desc" }, "Ficha médica y coberturas")
              ),
              h(
                "div",
                { className: "form-grid-3col" },
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Obra Social / Prepaga:"),
                  h("input", {
                    className: "form-field-input",
                    type: "text",
                    placeholder: "IOMA, OSECAC, OSDE, Ninguna....",
                    value: formData.obraSocial,
                    onChange: (e) => handleChange("obraSocial", e.target.value)
                  })
                ),
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Número de Afiliado:"),
                  h("input", {
                    className: "form-field-input",
                    type: "text",
                    placeholder: "N° carnet / credencial....",
                    value: formData.numeroAfiliado,
                    onChange: (e) => handleChange("numeroAfiliado", e.target.value)
                  })
                ),
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Grupo Sanguíneo:"),
                  h(
                    "select",
                    {
                      className: "form-field-select",
                      value: formData.grupoSanguineo,
                      onChange: (e) => handleChange("grupoSanguineo", e.target.value)
                    },
                    ["0+", "0-", "A+", "A-", "B+", "B-", "AB+", "AB-", "No especificado"].map((gs) =>
                      h("option", { key: gs, value: gs }, gs)
                    )
                  )
                )
              ),
              h(
                "div",
                { className: "form-field-group", style: { marginTop: "14px" } },
                h("label", { className: "form-field-label" }, "Alergias / Medicación / Observaciones Médicas:"),
                h("textarea", {
                  className: "form-field-textarea",
                  rows: 3,
                  placeholder: "Detalle alergias alimentarias o medicamentosas, patologías preexistentes o requerimientos específicos....",
                  value: formData.observacionesSalud,
                  onChange: (e) => handleChange("observacionesSalud", e.target.value)
                })
              )
            )
          : null,

        // ==========================================
        // PASO 4: DOCUMENTOS Y CONFIRMACIÓN
        // ==========================================
        currentStep === 4
          ? h(
              React.Fragment,
              null,

              // Sección Cargar Documento
              h(
                "div",
                { className: "form-section-header" },
                h("h3", { className: "form-section-title" }, "Documentación"),
                h("span", { className: "form-section-desc" }, "Archivos adjuntos para el legajo digital")
              ),

              h(
                "div",
                { className: "form-grid-2col" },
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Tipo de Documento:"),
                  h(
                    "select",
                    {
                      className: "form-field-select",
                      value: formData.documentoTipo,
                      onChange: (e) => handleChange("documentoTipo", e.target.value)
                    },
                    h("option", { value: "DNI del Estudiante (Frente y Dorso)" }, "DNI del Estudiante (Frente y Dorso)"),
                    h("option", { value: "DNI del Tutor" }, "DNI del Tutor"),
                    h("option", { value: "Partida de Nacimiento" }, "Partida de Nacimiento"),
                    h("option", { value: "Ficha de Salud y Vacunación" }, "Ficha de Salud y Vacunación"),
                    h("option", { value: "Certificado de Estudios / Pase" }, "Certificado de Estudios / Pase"),
                    h("option", { value: "Constancia de CUIL" }, "Constancia de CUIL")
                  )
                ),
                h(
                  "div",
                  { className: "form-field-group" },
                  h("label", { className: "form-field-label" }, "Subir archivo:"),
                  h(
                    "div",
                    {
                      className: "file-upload-dropzone",
                      onClick: handleAddDocumentoMock
                    },
                    h(
                      "svg",
                      { className: "dropzone-icon", viewBox: "0 0 24 24", fill: "currentColor", width: 24, height: 24 },
                      h("path", { d: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" })
                    ),
                    h("span", { className: "dropzone-title" }, "Hacer clic para Cargar Documentos"),
                    h("span", { className: "dropzone-hint" }, "Formatos admitidos: PDF, JPG, PNG (máx. 5 MB)")
                  )
                )
              ),

              // Lista de documentos adjuntados
              h(
                "div",
                { className: "documentos-list-container" },
                h("h4", { className: "documentos-list-title" }, `Documentos adjuntados (${formData.documentos.length}):`),
                h(
                  "div",
                  { className: "documentos-cards-grid" },
                  formData.documentos.map((doc) =>
                    h(
                      "div",
                      { key: doc.id, className: "documento-card-item" },
                      h(
                        "div",
                        { className: "documento-card-left" },
                        h("span", { className: "doc-icon-badge" }, "PDF"),
                        h(
                          "div",
                          { className: "doc-info" },
                          h("span", { className: "doc-tipo" }, doc.tipo),
                          h("span", { className: "doc-filename" }, `${doc.nombre} · ${doc.tamano}`)
                        )
                      ),
                      h(
                        "button",
                        {
                          type: "button",
                          className: "btn-delete-doc",
                          onClick: () => handleRemoveDocumento(doc.id),
                          title: "Eliminar archivo"
                        },
                        "✕"
                      )
                    )
                  )
                ),
                h(
                  "button",
                  {
                    type: "button",
                    className: "btn-agregar-doc-link",
                    onClick: handleAddDocumentoMock
                  },
                  "+ Agregar documento adicional"
                )
              ),

              h("div", { className: "form-divider" }),

              // Resumen institucional previo al guardado
              h(
                "div",
                { className: "resumen-previo-card" },
                h("h4", { className: "resumen-previo-title" }, "Resumen de Matriculación"),
                h(
                  "div",
                  { className: "resumen-previo-grid" },
                  h(
                    "div",
                    { className: "resumen-col" },
                    h("span", { className: "resumen-lbl" }, "Estudiante:"),
                    h("span", { className: "resumen-val" }, `${formData.apellido || "—"}, ${formData.nombre || "—"}`)
                  ),
                  h(
                    "div",
                    { className: "resumen-col" },
                    h("span", { className: "resumen-lbl" }, "DNI:"),
                    h("span", { className: "resumen-val" }, formData.dni || "—")
                  ),
                  h(
                    "div",
                    { className: "resumen-col" },
                    h("span", { className: "resumen-lbl" }, "Curso y División:"),
                    h("span", { className: "resumen-val" }, `${formData.curso} ${formData.division}° (${formData.turno})`)
                  ),
                  h(
                    "div",
                    { className: "resumen-col" },
                    h("span", { className: "resumen-lbl" }, "Tutor Responsable:"),
                    h("span", { className: "resumen-val" }, `${formData.tutorApellido || "—"}, ${formData.tutorNombre || "—"} (${formData.tutorParentesco})`)
                  )
                )
              )
            )
          : null,

        // ==========================================
        // FOOTER DE NAVEGACIÓN Y ACCIONES DEL WIZARD
        // ==========================================
        h(
          "div",
          { className: "wizard-footer-actions" },

          // Botón Anterior
          h(
            "button",
            {
              type: "button",
              className: "btn-wizard-anterior",
              onClick: handleAnterior
            },
            currentStep === 1 ? "Cancelar y volver" : "← Anterior"
          ),

          // Puntos indicadores (Dots)
          h(
            "div",
            { className: "wizard-dots-indicator" },
            [1, 2, 3, 4].map((dot) =>
              h("span", {
                key: dot,
                className: `wizard-dot ${dot === currentStep ? "active" : ""} ${dot < currentStep ? "passed" : ""}`,
                onClick: () => {
                  if (dot < currentStep || validarPaso(currentStep)) {
                    setCurrentStep(dot);
                  }
                },
                title: `Ir al paso ${dot}`
              })
            )
          ),

          // Botón Siguiente / Cargar Alumno
          currentStep < 4
            ? h(
                "button",
                {
                  type: "button",
                  className: "btn-wizard-siguiente",
                  onClick: handleSiguiente
                },
                "Siguiente →"
              )
            : h(
                "button",
                {
                  type: "button",
                  className: "btn-wizard-submit",
                  disabled: saving,
                  onClick: handleGuardar
                },
                saving ? "Guardando en el padrón..." : "✓ Cargar Alumno"
              )
        )
      )
    )
  );
}
