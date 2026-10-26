import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { h } from "../../../layouts/site-layout.js";
import { DirectorService } from "../director-service.js";

// Íconos auxiliares SVG
function IconCheckShield({ className = "w-5 h-5", width = "20", height = "20" }) {
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
    h("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }),
    h("path", { d: "m9 12 2 2 4-4" })
  );
}

function IconCheckSquare({ className = "w-5 h-5", width = "20", height = "20" }) {
  return h(
    "svg",
    {
      className,
      width,
      height,
      viewBox: "0 0 24 24",
      fill: "currentColor",
      "aria-hidden": "true",
      style: { flexShrink: 0 }
    },
    h("path", {
      fillRule: "evenodd",
      d: "M4.5 3.75A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V6a2.25 2.25 0 00-2.25-2.25h-15zm11.78 6.28a.75.75 0 00-1.06-1.06L9.75 14.44l-2.22-2.22a.75.75 0 00-1.06 1.06l2.75 2.75a.75.75 0 001.06 0l6-6z",
      clipRule: "evenodd"
    })
  );
}

function IconUsers({ className = "w-4 h-4", width = "16", height = "16" }) {
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
    h("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
    h("circle", { cx: "9", cy: "7", r: "4" }),
    h("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
    h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
  );
}

function IconGraduationCap({ className = "w-4 h-4", width = "16", height = "16" }) {
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
    h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
    h("path", { d: "M6 12v5c3 3 9 3 12 0v-5" })
  );
}

function IconSearch({ className = "w-4 h-4", width = "16", height = "16" }) {
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
    h("circle", { cx: "11", cy: "11", r: "8" }),
    h("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })
  );
}

function IconUserPlus({ className = "w-4 h-4", width = "15", height = "15" }) {
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
    h("path", { d: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
    h("circle", { cx: "8.5", cy: "7", r: "4" }),
    h("line", { x1: "20", y1: "8", x2: "20", y2: "14" }),
    h("line", { x1: "23", y1: "11", x2: "17", y2: "11" })
  );
}

function IconUserCheck({ className = "w-4 h-4", width = "15", height = "15" }) {
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
    h("path", { d: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
    h("circle", { cx: "8.5", cy: "7", r: "4" }),
    h("polyline", { points: "17 11 19 13 23 9" })
  );
}

function IconPlus({ className = "w-4 h-4", width = "15", height = "15" }) {
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

function IconClose({ className = "w-4 h-4", width = "16", height = "16" }) {
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
    h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
    h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
  );
}

/**
 * Modal para asignar o reasignar un Preceptor a un Curso y División.
 * Solo ofrece cuentas reales con rol Preceptor: la asignacion define que
 * alumnos puede ver esa cuenta.
 */
function ModalAsignarPreceptor({ abierto, division, preceptores, alCerrar, alGuardar }) {
  const [preceptorSeleccionado, setPreceptorSeleccionado] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setPreceptorSeleccionado(division?.preceptor?.id || preceptores[0]?.id || "");
  }, [division, preceptores]);

  if (!abierto || !division) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const encontrado = preceptores.find((p) => p.id === preceptorSeleccionado);
    if (!encontrado) return;

    setGuardando(true);
    try {
      await alGuardar(division.id, { id: encontrado.id, nombreCompleto: encontrado.nombreCompleto, email: encontrado.email });
      alCerrar();
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    h(
      "div",
      { className: "director-modal-backdrop", onClick: (e) => e.target === e.currentTarget && alCerrar() },
    h(
      "div",
      { className: "director-modal-container", role: "dialog", "aria-modal": "true" },
      // Header
      h(
        "div",
        { className: "director-modal-header" },
        h(
          "div",
          null,
          h("h2", { className: "director-modal-title" }, division.preceptor ? "Reasignar Preceptor" : "Asignar Preceptor"),
          h(
            "p",
            { className: "director-modal-subtitle" },
            `${division.curso} · ${division.division} (Turno ${division.turno} · ${division.orientacion})`
          )
        ),
        h(
          "button",
          { type: "button", className: "director-modal-close-btn", onClick: alCerrar, "aria-label": "Cerrar" },
          h(IconClose, null)
        )
      ),

      // Formulario
      h(
        "form",
        { className: "director-modal-form", onSubmit: handleSubmit },

        // Info preceptor actual
        division.preceptor
          ? h(
              "div",
              { className: "asignaciones-current-info" },
              h("span", { className: "asignaciones-current-label" }, "Preceptor asignado actualmente:"),
              h(
                "div",
                { className: "asignaciones-current-val" },
                h("strong", null, division.preceptor.nombre),
                h("span", null, ` (${division.preceptor.email})`)
              )
            )
          : null,

        // Selección de preceptor
        preceptores.length
          ? h(
              "div",
              { className: "form-group" },
              h("label", { className: "form-label", htmlFor: "asignar-preceptor" }, "Seleccionar Preceptor del Personal:"),
              h(
                "select",
                {
                  id: "asignar-preceptor",
                  className: "director-filter-select w-full",
                  value: preceptorSeleccionado,
                  onChange: (e) => setPreceptorSeleccionado(e.target.value)
                },
                preceptores.map((p) =>
                  h("option", { key: p.id, value: p.id }, `${p.nombreCompleto} (${p.email})`)
                )
              ),
              h("p", { className: "director-modal-subtitle" }, "El preceptor va a ver solo los alumnos de las divisiones que tenga asignadas.")
            )
          : h(
              "p",
              { className: "asignaciones-current-info" },
              "No hay cuentas con el rol Preceptor. Creá el perfil desde la sección Personal y volvé a esta pantalla."
            ),

        // Botones de acción
        h(
          "div",
          { className: "director-modal-actions" },
          h(
            "button",
            { type: "button", className: "btn-director-secondary", onClick: alCerrar, disabled: guardando },
            "Cancelar"
          ),
          h(
            "button",
            { type: "submit", className: "btn-director-primary", disabled: guardando || !preceptores.length },
            guardando ? "Guardando..." : "Confirmar Asignación"
          )
        )
      )
    )
  ),
  document.body
);
}

/**
 * Modal para asignar o reasignar un Profesor a una Cátedra/Materia
 */
function ModalAsignarProfesor({ abierto, catedra, personal, alCerrar, alGuardar }) {
  const [profesorSeleccionado, setProfesorSeleccionado] = useState("");
  const [nombrePersonalizado, setNombrePersonalizado] = useState("");
  const [emailPersonalizado, setEmailPersonalizado] = useState("");
  const [cargaHoraria, setCargaHoraria] = useState("4 hs semanales");
  const [guardando, setGuardando] = useState(false);

  const profesoresDisponibles = useMemo(() => {
    const filtrados = (personal || []).filter((p) =>
      p.roles?.some((r) => r.id === "docente")
    );
    const fallback = [
      { id: "usr-doc-1", nombreCompleto: "Docente Matemática", email: "docente@prece.local" },
      { id: "usr-doc-2", nombreCompleto: "Prof. María Villatoro", email: "mvillatoro@prece.local" },
      { id: "usr-doc-3", nombreCompleto: "Prof. Lucía Ríos", email: "lrios@prece.local" },
      { id: "usr-doc-4", nombreCompleto: "Prof. Humberto Sosa", email: "hsosa@prece.local" },
      { id: "usr-doc-5", nombreCompleto: "Prof. Esteban Gómez", email: "egomez@prece.local" },
      { id: "usr-doc-6", nombreCompleto: "Prof. Andrea Ferreyra", email: "aferreyra@prece.local" },
      { id: "usr-doc-7", nombreCompleto: "Prof. Pablo Morales", email: "pmorales@prece.local" }
    ];

    const combinados = [...filtrados];
    for (const f of fallback) {
      if (!combinados.some((c) => c.email === f.email || c.id === f.id)) {
        combinados.push(f);
      }
    }
    return combinados;
  }, [personal]);

  useEffect(() => {
    if (catedra?.profesor) {
      setProfesorSeleccionado(catedra.profesor.id || "");
      setNombrePersonalizado(catedra.profesor.nombre || "");
      setEmailPersonalizado(catedra.profesor.email || "");
      setCargaHoraria(catedra.cargaHoraria || "4 hs semanales");
    } else {
      setProfesorSeleccionado(profesoresDisponibles[0]?.id || "usr-doc-1");
      setNombrePersonalizado("");
      setEmailPersonalizado("");
      setCargaHoraria("4 hs semanales");
    }
  }, [catedra, profesoresDisponibles]);

  if (!abierto || !catedra) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      let datosProfesor = null;
      if (profesorSeleccionado === "otro") {
        if (!nombrePersonalizado.trim()) return;
        datosProfesor = {
          id: `doc-${Date.now()}`,
          nombreCompleto: nombrePersonalizado.trim(),
          email: emailPersonalizado.trim() || "docente@prece.local",
          cargaHoraria
        };
      } else {
        const encontrado = profesoresDisponibles.find((p) => p.id === profesorSeleccionado);
        datosProfesor = encontrado
          ? { id: encontrado.id, nombreCompleto: encontrado.nombreCompleto, email: encontrado.email, cargaHoraria }
          : { id: "usr-doc-1", nombreCompleto: "Docente Asignado", email: "docente@prece.local", cargaHoraria };
      }

      await alGuardar(catedra.id, datosProfesor);
      alCerrar();
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    h(
      "div",
      { className: "director-modal-backdrop", onClick: (e) => e.target === e.currentTarget && alCerrar() },
    h(
      "div",
      { className: "director-modal-container", role: "dialog", "aria-modal": "true" },
      // Header
      h(
        "div",
        { className: "director-modal-header" },
        h(
          "div",
          null,
          h("h2", { className: "director-modal-title" }, catedra.profesor ? "Reasignar Profesor a Cátedra" : "Asignar Profesor a Cátedra"),
          h(
            "p",
            { className: "director-modal-subtitle" },
            `${catedra.materia} · ${catedra.curso} ${catedra.division} (${catedra.turno})`
          )
        ),
        h(
          "button",
          { type: "button", className: "director-modal-close-btn", onClick: alCerrar, "aria-label": "Cerrar" },
          h(IconClose, null)
        )
      ),

      // Formulario
      h(
        "form",
        { className: "director-modal-form", onSubmit: handleSubmit },

        // Profesor actual
        catedra.profesor
          ? h(
              "div",
              { className: "asignaciones-current-info" },
              h("span", { className: "asignaciones-current-label" }, "Profesor asignado actualmente:"),
              h(
                "div",
                { className: "asignaciones-current-val" },
                h("strong", null, catedra.profesor.nombre),
                h("span", null, ` (${catedra.profesor.email})`)
              )
            )
          : null,

        // Selector de profesor
        h(
          "div",
          { className: "form-group" },
          h("label", { className: "form-label" }, "Profesor / Docente:"),
          h(
            "select",
            {
              className: "director-filter-select w-full",
              value: profesorSeleccionado,
              onChange: (e) => setProfesorSeleccionado(e.target.value)
            },
            profesoresDisponibles.map((p) =>
              h("option", { key: p.id, value: p.id }, `${p.nombreCompleto} (${p.email})`)
            ),
            h("option", { value: "otro" }, "➕ Asignar otro profesor / nuevo docente...")
          )
        ),

        // Carga horaria
        h(
          "div",
          { className: "form-group" },
          h("label", { className: "form-label" }, "Carga Horaria / Régimen:"),
          h(
            "select",
            {
              className: "director-filter-select w-full",
              value: cargaHoraria,
              onChange: (e) => setCargaHoraria(e.target.value)
            },
            h("option", { value: "2 hs semanales" }, "2 hs semanales (Módulo simple)"),
            h("option", { value: "3 hs semanales" }, "3 hs semanales"),
            h("option", { value: "4 hs semanales" }, "4 hs semanales (Módulo doble estándar)"),
            h("option", { value: "6 hs semanales" }, "6 hs semanales (Taller / Laboratorio)"),
            h("option", { value: "8 hs semanales" }, "8 hs semanales (Práctica profesionalizante)"),
            h("option", { value: "10 hs semanales" }, "10 hs semanales (Especialidad técnica)")
          )
        ),

        // Campos personalizados si eligió "otro"
        profesorSeleccionado === "otro"
          ? h(
              "div",
              { className: "asignaciones-custom-fields" },
              h(
                "div",
                { className: "form-group" },
                h("label", { className: "form-label" }, "Nombre y Apellido del Profesor:"),
                h("input", {
                  type: "text",
                  className: "search-input",
                  placeholder: "Ej. Prof. Javier Zanetti",
                  value: nombrePersonalizado,
                  onChange: (e) => setNombrePersonalizado(e.target.value),
                  required: true
                })
              ),
              h(
                "div",
                { className: "form-group" },
                h("label", { className: "form-label" }, "Correo Institucional:"),
                h("input", {
                  type: "email",
                  className: "search-input",
                  placeholder: "jzanetti@prece.local",
                  value: emailPersonalizado,
                  onChange: (e) => setEmailPersonalizado(e.target.value)
                })
              )
            )
          : null,

        // Botones de acción
        h(
          "div",
          { className: "director-modal-actions" },
          h(
            "button",
            { type: "button", className: "btn-director-secondary", onClick: alCerrar, disabled: guardando },
            "Cancelar"
          ),
          h(
            "button",
            { type: "submit", className: "btn-director-primary", disabled: guardando },
            guardando ? "Guardando..." : "Confirmar Asignación"
          )
        )
      )
    )
  ),
  document.body
);
}

/**
 * Componente Principal de la Sección de Asignaciones
 */
export function AsignacionesSection({ personal = [], onMostrarToast }) {
  // Subpestaña interna: 'preceptores' | 'profesores'
  const [subPestana, setSubPestana] = useState("preceptores");

  // Estado de Preceptores
  const [divisionesPreceptores, setDivisionesPreceptores] = useState([]);
  const [cargandoPreceptores, setCargandoPreceptores] = useState(true);
  const [busquedaPreceptores, setBusquedaPreceptores] = useState("");
  const [filtroAnioPreceptores, setFiltroAnioPreceptores] = useState("todos");
  const [filtroTurnoPreceptores, setFiltroTurnoPreceptores] = useState("todos");
  const [filtroEstadoPreceptores, setFiltroEstadoPreceptores] = useState("todos");
  const [divisionParaAsignar, setDivisionParaAsignar] = useState(null);
  const [preceptoresDisponibles, setPreceptoresDisponibles] = useState([]);

  // Estado de Profesores
  const [catedrasProfesores, setCatedrasProfesores] = useState([]);
  const [cargandoProfesores, setCargandoProfesores] = useState(true);
  const [busquedaProfesores, setBusquedaProfesores] = useState("");
  const [filtroAnioProfesores, setFiltroAnioProfesores] = useState("todos");
  const [filtroTurnoProfesores, setFiltroTurnoProfesores] = useState("todos");
  const [filtroEstadoProfesores, setFiltroEstadoProfesores] = useState("todos");
  const [filtroMateriaProfesores, setFiltroMateriaProfesores] = useState("todas");
  const [catedraParaAsignar, setCatedraParaAsignar] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    const cargar = async () => {
      try {
        const [precData, profData] = await Promise.all([
          DirectorService.obtenerAsignacionesPreceptores(),
          DirectorService.listarAsignacionesProfesores()
        ]);
        setDivisionesPreceptores(precData.divisiones);
        setPreceptoresDisponibles(precData.preceptores);
        setCatedrasProfesores(profData);
      } catch {
        // Silencioso
      } finally {
        setCargandoPreceptores(false);
        setCargandoProfesores(false);
      }
    };
    cargar();
  }, []);

  // Handlers para Preceptores
  const handleGuardarPreceptor = async (divisionId, preceptorData) => {
    try {
      const actualizada = await DirectorService.guardarAsignacionPreceptor(divisionId, preceptorData);
      setDivisionesPreceptores(actualizada);
      if (onMostrarToast) {
        onMostrarToast(`Preceptor asignado exitosamente a la división.`);
      }
    } catch {
      if (onMostrarToast) onMostrarToast("Error al asignar preceptor.");
    }
  };

  const handleQuitarPreceptor = async (division) => {
    try {
      const actualizada = await DirectorService.quitarAsignacionPreceptor(division.id);
      setDivisionesPreceptores(actualizada);
      if (onMostrarToast) {
        onMostrarToast(`Se quitó el preceptor de ${division.curso} ${division.division}.`);
      }
    } catch {
      if (onMostrarToast) onMostrarToast("Error al quitar asignación.");
    }
  };

  // Handlers para Profesores
  const handleGuardarProfesor = async (catedraId, profesorData) => {
    try {
      const actualizada = await DirectorService.guardarAsignacionProfesor(catedraId, profesorData);
      setCatedrasProfesores(actualizada);
      if (onMostrarToast) {
        onMostrarToast(`Profesor asignado exitosamente a la cátedra.`);
      }
    } catch {
      if (onMostrarToast) onMostrarToast("Error al asignar profesor.");
    }
  };

  const handleQuitarProfesor = async (catedra) => {
    try {
      const actualizada = await DirectorService.quitarAsignacionProfesor(catedra.id);
      setCatedrasProfesores(actualizada);
      if (onMostrarToast) {
        onMostrarToast(`Se quitó la asignación docente de ${catedra.materia} (${catedra.curso} ${catedra.division}).`);
      }
    } catch {
      if (onMostrarToast) onMostrarToast("Error al quitar asignación.");
    }
  };

  // Filtrado de Preceptores
  const divisionesFiltradas = useMemo(() => {
    return divisionesPreceptores.filter((d) => {
      if (filtroAnioPreceptores !== "todos" && String(d.anio) !== filtroAnioPreceptores) return false;
      if (filtroTurnoPreceptores !== "todos" && d.turno.toLowerCase() !== filtroTurnoPreceptores.toLowerCase()) return false;
      if (filtroEstadoPreceptores !== "todos" && d.estado !== filtroEstadoPreceptores) return false;

      if (busquedaPreceptores.trim()) {
        const q = busquedaPreceptores.trim().toLowerCase();
        const enDivision = `${d.curso} ${d.division}`.toLowerCase().includes(q);
        const enPreceptor = (d.preceptor?.nombre || "").toLowerCase().includes(q);
        const enEmail = (d.preceptor?.email || "").toLowerCase().includes(q);
        const enOri = (d.orientacion || "").toLowerCase().includes(q);
        if (!enDivision && !enPreceptor && !enEmail && !enOri) return false;
      }
      return true;
    });
  }, [divisionesPreceptores, busquedaPreceptores, filtroAnioPreceptores, filtroTurnoPreceptores, filtroEstadoPreceptores]);

  // Filtrado de Profesores
  const catedrasFiltradas = useMemo(() => {
    return catedrasProfesores.filter((c) => {
      if (filtroAnioProfesores !== "todos" && String(c.anio) !== filtroAnioProfesores) return false;
      if (filtroTurnoProfesores !== "todos" && c.turno.toLowerCase() !== filtroTurnoProfesores.toLowerCase()) return false;
      if (filtroEstadoProfesores !== "todos" && c.estado !== filtroEstadoProfesores) return false;
      if (filtroMateriaProfesores !== "todas" && c.materia !== filtroMateriaProfesores) return false;

      if (busquedaProfesores.trim()) {
        const q = busquedaProfesores.trim().toLowerCase();
        const enMateria = c.materia.toLowerCase().includes(q);
        const enDivision = `${c.curso} ${c.division}`.toLowerCase().includes(q);
        const enProfesor = (c.profesor?.nombre || "").toLowerCase().includes(q);
        const enEmail = (c.profesor?.email || "").toLowerCase().includes(q);
        const enArea = (c.area || "").toLowerCase().includes(q);
        if (!enMateria && !enDivision && !enProfesor && !enEmail && !enArea) return false;
      }
      return true;
    });
  }, [catedrasProfesores, busquedaProfesores, filtroAnioProfesores, filtroTurnoProfesores, filtroEstadoProfesores, filtroMateriaProfesores]);

  // Contadores dinámicos
  const preceptoresAsignadosCount = useMemo(() => {
    return divisionesPreceptores.filter((d) => d.estado === "asignado").length;
  }, [divisionesPreceptores]);

  const profesoresAsignadosCount = useMemo(() => {
    return catedrasProfesores.filter((c) => c.estado === "asignado").length;
  }, [catedrasProfesores]);

  // Lista única de materias para el filtro de materias
  const listaMateriasUnicas = useMemo(() => {
    const set = new Set();
    catedrasProfesores.forEach((c) => set.add(c.materia));
    return Array.from(set).sort();
  }, [catedrasProfesores]);

  return h(
    "div",
    { className: "director-section-content" },

    // =========================================================================
    // BARRA DE SUB-PESTAÑAS (PROFESORES Y PRECEPTORES)
    // Idéntico diseño a la segunda imagen de pestañas directivas
    // =========================================================================
    h(
      "div",
      { className: "asignaciones-subtabs-wrapper" },
      h(
        "div",
        { className: "asignaciones-subtabs-nav" },
        [
          { id: "preceptores", label: "Preceptores", icon: IconUsers, count: preceptoresAsignadosCount },
          { id: "profesores", label: "Profesores", icon: IconGraduationCap, count: profesoresAsignadosCount }
        ].map((tab) =>
          h(
            "button",
            {
              key: tab.id,
              type: "button",
              className: `director-tab-btn ${subPestana === tab.id ? "director-tab-btn--active" : ""}`,
              onClick: () => setSubPestana(tab.id)
            },
            h(tab.icon, { width: "15", height: "15" }),
            h("span", null, tab.label),
            h(
              "span",
              { className: subPestana === tab.id ? "asignaciones-pill-active" : "asignaciones-pill-inactive" },
              tab.count
            )
          )
        )
      )
    ),

    // =========================================================================
    // VISTA 1: ASIGNACIÓN DE CURSOS Y PRECEPTORES
    // Idéntico diseño a la primera imagen compartida
    // =========================================================================
    subPestana === "preceptores"
      ? h(
          "div",
          { className: "asignaciones-card" },

          // Header de la tarjeta
          h(
            "div",
            { className: "asignaciones-card-header" },
            h(
              "div",
              { className: "asignaciones-card-title-wrap" },
              h(
                "div",
                { className: "asignaciones-header-icon-box" },
                h(IconCheckSquare, { className: "w-5 h-5 text-blue-600", width: "22", height: "22" })
              ),
              h("h2", { className: "asignaciones-card-title" }, "Asignacion de Cursos y Preceptores"),
              h(
                "span",
                { className: "asignaciones-counter-badge" },
                `${preceptoresAsignadosCount} de ${divisionesPreceptores.length} divisiones con preceptor`
              )
            )
          ),

          // Toolbar de Filtros (Buscador, Años, Turnos, Estados)
          h(
            "div",
            { className: "asignaciones-toolbar" },

            // Buscador
            h(
              "div",
              { className: "asignaciones-search-wrap" },
              h(IconSearch, { className: "asignaciones-search-icon" }),
              h("input", {
                type: "text",
                className: "asignaciones-search-input",
                placeholder: "Buscar por división o preceptor...",
                value: busquedaPreceptores,
                onChange: (e) => setBusquedaPreceptores(e.target.value),
                "aria-label": "Buscar división o preceptor"
              }),
              busquedaPreceptores
                ? h(
                    "button",
                    {
                      type: "button",
                      className: "search-clear-btn",
                      onClick: () => setBusquedaPreceptores(""),
                      "aria-label": "Limpiar"
                    },
                    "✕"
                  )
                : null
            ),

            // Filtro Años
            h(
              "select",
              {
                className: "asignaciones-filter-select",
                value: filtroAnioPreceptores,
                onChange: (e) => setFiltroAnioPreceptores(e.target.value),
                "aria-label": "Filtrar por año"
              },
              h("option", { value: "todos" }, "Todos los Años"),
              [1, 2, 3, 4, 5, 6, 7].map((num) =>
                h("option", { key: num, value: String(num) }, `${num}° Año`)
              )
            ),

            // Filtro Turnos
            h(
              "select",
              {
                className: "asignaciones-filter-select",
                value: filtroTurnoPreceptores,
                onChange: (e) => setFiltroTurnoPreceptores(e.target.value),
                "aria-label": "Filtrar por turno"
              },
              h("option", { value: "todos" }, "Todos los Turnos"),
              h("option", { value: "mañana" }, "Mañana"),
              h("option", { value: "tarde" }, "Tarde")
            ),

            // Filtro Estados
            h(
              "select",
              {
                className: "asignaciones-filter-select",
                value: filtroEstadoPreceptores,
                onChange: (e) => setFiltroEstadoPreceptores(e.target.value),
                "aria-label": "Filtrar por estado"
              },
              h("option", { value: "todos" }, "Todos los Estados"),
              h("option", { value: "asignado" }, "Asignados"),
              h("option", { value: "sin_asignar" }, "Sin Asignar")
            )
          ),

          // Tabla de Preceptores
          h(
            "div",
            { className: "director-table-responsive" },
            h(
              "table",
              { className: "asignaciones-table" },
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  h("th", { style: { width: "10%" } }, "AÑO"),
                  h("th", { style: { width: "18%" } }, "DIVISIÓN"),
                  h("th", { style: { width: "16%" } }, "TURNO"),
                  h("th", { style: { width: "30%" } }, "PRECEPTOR"),
                  h("th", { style: { width: "14%" } }, "ESTADO"),
                  h("th", { style: { width: "12%", textAlign: "right" } }, "ACCIONES")
                )
              ),
              h(
                "tbody",
                null,
                divisionesFiltradas.length === 0
                  ? h(
                      "tr",
                      null,
                      h(
                        "td",
                        { colSpan: 6, className: "asignaciones-empty-td" },
                        "No se encontraron divisiones con los filtros aplicados."
                      )
                    )
                  : divisionesFiltradas.map((item) =>
                      h(
                        "tr",
                        { key: item.id },

                        // AÑO
                        h(
                          "td",
                          null,
                          h("span", { className: "asignaciones-cell-anio" }, item.curso)
                        ),

                        // DIVISIÓN
                        h(
                          "td",
                          null,
                          h(
                            "div",
                            { className: "asignaciones-division-tag-wrap" },
                            h("span", { className: "asignaciones-div-badge" }, item.division),
                            item.orientacion && item.orientacion !== "Ciclo Básico"
                              ? h("span", { className: "asignaciones-div-orientacion" }, item.orientacion)
                              : null
                          )
                        ),

                        // TURNO
                        h(
                          "td",
                          null,
                          h("span", { className: "asignaciones-cell-turno" }, item.turno)
                        ),

                        // PRECEPTOR
                        h(
                          "td",
                          null,
                          item.preceptor
                            ? h(
                                "div",
                                { className: "asignaciones-user-cell" },
                                h(
                                  "div",
                                  { className: "asignaciones-user-avatar asignaciones-user-avatar--blue" },
                                  item.preceptor.avatar || item.preceptor.nombre.charAt(0).toUpperCase()
                                ),
                                h(
                                  "div",
                                  { className: "asignaciones-user-info" },
                                  h("strong", { className: "asignaciones-user-name" }, item.preceptor.nombre),
                                  h("span", { className: "asignaciones-user-email" }, item.preceptor.email)
                                )
                              )
                            : h(
                                "span",
                                { className: "asignaciones-unassigned" },
                                "Sin preceptor asignado"
                              )
                        ),

                        // ESTADO
                        h(
                          "td",
                          null,
                          item.estado === "asignado"
                            ? h(
                                "span",
                                { className: "asignaciones-status-badge asignaciones-status-badge--assigned" },
                                "● Asignado"
                              )
                            : h(
                                "span",
                                { className: "asignaciones-status-badge asignaciones-status-badge--unassigned" },
                                "● Sin asignar"
                              )
                        ),

                        // ACCIONES
                        h(
                          "td",
                          { style: { textAlign: "right" } },
                          item.estado === "asignado"
                            ? h(
                                "div",
                                { className: "asignaciones-actions-wrap" },
                                h(
                                  "button",
                                  {
                                    type: "button",
                                    className: "asignaciones-btn-reasignar",
                                    onClick: () => setDivisionParaAsignar(item),
                                    title: "Reasignar preceptor a esta división"
                                  },
                                  h(IconUserCheck, null),
                                  h("span", null, "Reasignar")
                                ),
                                h(
                                  "button",
                                  {
                                    type: "button",
                                    className: "asignaciones-btn-quitar",
                                    onClick: () => handleQuitarPreceptor(item),
                                    title: "Quitar preceptor de esta división"
                                  },
                                  "Quitar"
                                )
                              )
                            : h(
                                "button",
                                {
                                  type: "button",
                                  className: "asignaciones-btn-asignar",
                                  onClick: () => setDivisionParaAsignar(item),
                                  title: "Asignar preceptor"
                                },
                                h(IconUserPlus, null),
                                h("span", null, "Asignar")
                              )
                        )
                      )
                    )
              )
            )
          )
        )
      : null,

    // =========================================================================
    // VISTA 2: ASIGNACIÓN DE CURSOS Y PROFESORES
    // Misma estética para docentes y cátedras
    // =========================================================================
    subPestana === "profesores"
      ? h(
          "div",
          { className: "asignaciones-card" },

          // Header de la tarjeta
          h(
            "div",
            { className: "asignaciones-card-header" },
            h(
              "div",
              { className: "asignaciones-card-title-wrap" },
              h(
                "div",
                { className: "asignaciones-header-icon-box asignaciones-header-icon-box--green" },
                h(IconCheckSquare, { className: "w-5 h-5 text-emerald-600", width: "22", height: "22" })
              ),
              h("h2", { className: "asignaciones-card-title" }, "Asignacion de Cursos y Profesores"),
              h(
                "span",
                { className: "asignaciones-counter-badge asignaciones-counter-badge--green" },
                `${profesoresAsignadosCount} de ${catedrasProfesores.length} cátedras con profesor`
              )
            )
          ),

          // Toolbar de Filtros (Buscador, Años, Turnos, Materias, Estados)
          h(
            "div",
            { className: "asignaciones-toolbar" },

            // Buscador
            h(
              "div",
              { className: "asignaciones-search-wrap" },
              h(IconSearch, { className: "asignaciones-search-icon" }),
              h("input", {
                type: "text",
                className: "asignaciones-search-input",
                placeholder: "Buscar por materia, división o profesor...",
                value: busquedaProfesores,
                onChange: (e) => setBusquedaProfesores(e.target.value),
                "aria-label": "Buscar materia o profesor"
              }),
              busquedaProfesores
                ? h(
                    "button",
                    {
                      type: "button",
                      className: "search-clear-btn",
                      onClick: () => setBusquedaProfesores(""),
                      "aria-label": "Limpiar"
                    },
                    "✕"
                  )
                : null
            ),

            // Filtro Años
            h(
              "select",
              {
                className: "asignaciones-filter-select",
                value: filtroAnioProfesores,
                onChange: (e) => setFiltroAnioProfesores(e.target.value),
                "aria-label": "Filtrar por año"
              },
              h("option", { value: "todos" }, "Todos los Años"),
              [1, 2, 3, 4, 5, 6, 7].map((num) =>
                h("option", { key: num, value: String(num) }, `${num}° Año`)
              )
            ),

            // Filtro Turnos
            h(
              "select",
              {
                className: "asignaciones-filter-select",
                value: filtroTurnoProfesores,
                onChange: (e) => setFiltroTurnoProfesores(e.target.value),
                "aria-label": "Filtrar por turno"
              },
              h("option", { value: "todos" }, "Todos los Turnos"),
              h("option", { value: "mañana" }, "Mañana"),
              h("option", { value: "tarde" }, "Tarde")
            ),

            // Filtro Materias
            h(
              "select",
              {
                className: "asignaciones-filter-select",
                value: filtroMateriaProfesores,
                onChange: (e) => setFiltroMateriaProfesores(e.target.value),
                "aria-label": "Filtrar por materia"
              },
              h("option", { value: "todas" }, "Todas las Materias"),
              listaMateriasUnicas.map((mat) =>
                h("option", { key: mat, value: mat }, mat)
              )
            ),

            // Filtro Estados
            h(
              "select",
              {
                className: "asignaciones-filter-select",
                value: filtroEstadoProfesores,
                onChange: (e) => setFiltroEstadoProfesores(e.target.value),
                "aria-label": "Filtrar por estado"
              },
              h("option", { value: "todos" }, "Todos los Estados"),
              h("option", { value: "asignado" }, "Asignados"),
              h("option", { value: "sin_asignar" }, "Sin Asignar")
            )
          ),

          // Tabla de Profesores
          h(
            "div",
            { className: "director-table-responsive" },
            h(
              "table",
              { className: "asignaciones-table" },
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  h("th", { style: { width: "8%" } }, "AÑO"),
                  h("th", { style: { width: "12%" } }, "DIVISIÓN"),
                  h("th", { style: { width: "24%" } }, "MATERIA / ASIGNATURA"),
                  h("th", { style: { width: "12%" } }, "TURNO"),
                  h("th", { style: { width: "26%" } }, "PROFESOR"),
                  h("th", { style: { width: "10%" } }, "ESTADO"),
                  h("th", { style: { width: "12%", textAlign: "right" } }, "ACCIONES")
                )
              ),
              h(
                "tbody",
                null,
                catedrasFiltradas.length === 0
                  ? h(
                      "tr",
                      null,
                      h(
                        "td",
                        { colSpan: 7, className: "asignaciones-empty-td" },
                        "No se encontraron materias con los filtros aplicados."
                      )
                    )
                  : catedrasFiltradas.map((item) =>
                      h(
                        "tr",
                        { key: item.id },

                        // AÑO
                        h(
                          "td",
                          null,
                          h("span", { className: "asignaciones-cell-anio" }, item.curso)
                        ),

                        // DIVISIÓN
                        h(
                          "td",
                          null,
                          h("span", { className: "asignaciones-div-badge" }, item.division)
                        ),

                        // MATERIA / ASIGNATURA
                        h(
                          "td",
                          null,
                          h(
                            "div",
                            { className: "asignaciones-materia-info" },
                            h("strong", { className: "asignaciones-materia-title" }, item.materia),
                            h(
                              "span",
                              { className: "asignaciones-materia-sub" },
                              `${item.area} · ${item.cargaHoraria}`
                            )
                          )
                        ),

                        // TURNO
                        h(
                          "td",
                          null,
                          h("span", { className: "asignaciones-cell-turno" }, item.turno)
                        ),

                        // PROFESOR
                        h(
                          "td",
                          null,
                          item.profesor
                            ? h(
                                "div",
                                { className: "asignaciones-user-cell" },
                                h(
                                  "div",
                                  { className: "asignaciones-user-avatar asignaciones-user-avatar--emerald" },
                                  item.profesor.avatar || item.profesor.nombre.charAt(0).toUpperCase()
                                ),
                                h(
                                  "div",
                                  { className: "asignaciones-user-info" },
                                  h("strong", { className: "asignaciones-user-name" }, item.profesor.nombre),
                                  h("span", { className: "asignaciones-user-email" }, item.profesor.email)
                                )
                              )
                            : h(
                                "span",
                                { className: "asignaciones-unassigned" },
                                "Sin profesor asignado"
                              )
                        ),

                        // ESTADO
                        h(
                          "td",
                          null,
                          item.estado === "asignado"
                            ? h(
                                "span",
                                { className: "asignaciones-status-badge asignaciones-status-badge--assigned" },
                                "● Asignado"
                              )
                            : h(
                                "span",
                                { className: "asignaciones-status-badge asignaciones-status-badge--unassigned" },
                                "● Sin asignar"
                              )
                        ),

                        // ACCIONES
                        h(
                          "td",
                          { style: { textAlign: "right" } },
                          item.estado === "asignado"
                            ? h(
                                "div",
                                { className: "asignaciones-actions-wrap" },
                                h(
                                  "button",
                                  {
                                    type: "button",
                                    className: "asignaciones-btn-reasignar",
                                    onClick: () => setCatedraParaAsignar(item),
                                    title: "Reasignar profesor a esta materia"
                                  },
                                  h(IconUserCheck, null),
                                  h("span", null, "Reasignar")
                                ),
                                h(
                                  "button",
                                  {
                                    type: "button",
                                    className: "asignaciones-btn-quitar",
                                    onClick: () => handleQuitarProfesor(item),
                                    title: "Quitar profesor de esta materia"
                                  },
                                  "Quitar"
                                )
                              )
                            : h(
                                "button",
                                {
                                  type: "button",
                                  className: "asignaciones-btn-asignar asignaciones-btn-asignar--emerald",
                                  onClick: () => setCatedraParaAsignar(item),
                                  title: "Asignar profesor"
                                },
                                h(IconUserPlus, null),
                                h("span", null, "Asignar")
                              )
                        )
                      )
                    )
              )
            )
          )
        )
      : null,

    // Modal para Preceptor
    divisionParaAsignar
      ? h(ModalAsignarPreceptor, {
          abierto: Boolean(divisionParaAsignar),
          division: divisionParaAsignar,
          preceptores: preceptoresDisponibles,
          alCerrar: () => setDivisionParaAsignar(null),
          alGuardar: handleGuardarPreceptor
        })
      : null,

    // Modal para Profesor
    catedraParaAsignar
      ? h(ModalAsignarProfesor, {
          abierto: Boolean(catedraParaAsignar),
          catedra: catedraParaAsignar,
          personal,
          alCerrar: () => setCatedraParaAsignar(null),
          alGuardar: handleGuardarProfesor
        })
      : null
  );
}
