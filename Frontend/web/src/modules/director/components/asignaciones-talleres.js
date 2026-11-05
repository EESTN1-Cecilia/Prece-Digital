import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { h } from "../../../layouts/site-layout.js";
import { CustomSelect } from "../../../components/common/custom-select.js";
import { StudentsService } from "../../students/students-service.js";
import { JefaturaService } from "../../jefatura/jefatura-service.js";
import { divisionesVisibles, gruposDeDivision } from "../../jefatura/talleres-cronograma.js";

/* Direccion: asigna un profe a cada grupo de taller (1.1, 1.3, ...).
   Cada eleccion se guarda en el sistema al instante; Jefatura y el docente la leen de ahi. */

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

function IconClock({ className = "w-4 h-4", width = "14", height = "14" }) {
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
    h("circle", { cx: "12", cy: "12", r: "10" }),
    h("polyline", { points: "12 6 12 12 16 14" })
  );
}

function nombreDe(persona) {
  return (
    persona.nombreCompleto ||
    persona.displayName ||
    [persona.nombre, persona.apellido].filter(Boolean).join(" ") ||
    persona.email ||
    "Docente"
  ).trim();
}

function esDocente(persona) {
  return (persona.roles ?? []).some((rol) => {
    const id = typeof rol === "string" ? rol : rol?.id ?? rol?.role;
    return id === "docente" || id === "profesor";
  });
}

function normalizarTextoDocente(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(prof\.|profesor|profesora|docente|lic\.|ing\.)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function sonMismoDocente(d1, d2) {
  if (!d1 || !d2) return false;

  const email1 = String(d1.email || "").trim().toLowerCase();
  const email2 = String(d2.email || "").trim().toLowerCase();
  if (email1 && email2 && email1 === email2) return true;

  const id1 = d1.id !== undefined && d1.id !== null ? String(d1.id).trim() : "";
  const id2 = d2.id !== undefined && d2.id !== null ? String(d2.id).trim() : "";
  if (id1 && id2 && id1 === id2) return true;

  if (id1 && id2) {
    const num1 = id1.replace(/\D/g, "");
    const num2 = id2.replace(/\D/g, "");
    if (num1 && num2 && num1 === num2) return true;
  }

  const nom1 = normalizarTextoDocente(d1.nombreCompleto || d1.nombre || "");
  const nom2 = normalizarTextoDocente(d2.nombreCompleto || d2.nombre || "");
  if (nom1 && nom2) {
    if (nom1 === nom2) return true;
    if (nom1.length > 5 && nom2.length > 5 && (nom1.includes(nom2) || nom2.includes(nom1))) return true;
  }

  return false;
}

export function opcionesDocentes(personal = [], asignaciones = []) {
  const porId = new Map();
  for (const persona of personal.filter(esDocente)) {
    const id = String(persona.id ?? persona.email ?? "");
    if (id) porId.set(id, { id, nombre: nombreDe(persona), email: String(persona.email ?? "").toLowerCase() });
  }
  /* Un profe ya asignado sigue apareciendo aunque ya no figure en el personal. */
  for (const item of asignaciones) {
    if (item.docente?.id && !porId.has(item.docente.id)) porId.set(item.docente.id, item.docente);
  }
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function cursosConGrupos(divisiones = []) {
  const visibles = divisionesVisibles(divisiones).sort((a, b) => a.anio - b.anio || Number(a.division) - Number(b.division));
  return visibles.map((division) => ({
    clave: String(division.clave ?? `${division.anio}-${division.division}`),
    anio: division.anio,
    division: String(division.division),
    turno: division.turnoTaller || division.turnoAula || "",
    grupos: gruposDeDivision(
      division.anio,
      division.division,
      visibles.filter((item) => item.anio === division.anio).map((item) => item.division)
    )
  }));
}

function ModalAsignarTaller({
  abierto,
  itemInicial,
  docentesDisponibles = [],
  todosLosGrupos = [],
  porGrupo,
  alCerrar,
  alGuardar
}) {
  const [docenteSeleccionado, setDocenteSeleccionado] = useState("");
  const [nombrePersonalizado, setNombrePersonalizado] = useState("");
  const [emailPersonalizado, setEmailPersonalizado] = useState("");
  const [gruposSeleccionados, setGruposSeleccionados] = useState([]);
  const [mostrarTodosLosGrupos, setMostrarTodosLosGrupos] = useState(false);
  const [filtroAnioModal, setFiltroAnioModal] = useState("todos");
  const [guardando, setGuardando] = useState(false);
  const [verMasModal, setVerMasModal] = useState(false);

  const obtenerGruposDelDocente = useCallback(
    (doc) => {
      if (!doc) return [];
      return todosLosGrupos.filter((g) => {
        const asig = porGrupo.get(g.grupo);
        return asig?.docente && sonMismoDocente(doc, asig.docente);
      });
    },
    [todosLosGrupos, porGrupo]
  );

  useEffect(() => {
    if (itemInicial) {
      let docId = "";
      if (itemInicial.docente) {
        const match = docentesDisponibles.find((d) => sonMismoDocente(d, itemInicial.docente));
        docId = match?.id || itemInicial.docente.id || "";
        setDocenteSeleccionado(docId);
        setNombrePersonalizado(itemInicial.docente.nombre || "");
        setEmailPersonalizado(itemInicial.docente.email || "");
      } else {
        docId = docentesDisponibles[0]?.id || "";
        setDocenteSeleccionado(docId);
        setNombrePersonalizado("");
        setEmailPersonalizado("");
      }

      const docRef = itemInicial.docente || docentesDisponibles.find((d) => d.id === docId);
      const misGrupos = obtenerGruposDelDocente(docRef).map((g) => g.grupo);

      if (itemInicial.grupo && itemInicial.grupo !== "taller-nuevo") {
        setGruposSeleccionados(Array.from(new Set([itemInicial.grupo, ...misGrupos])));
        setMostrarTodosLosGrupos(false);
      } else {
        setGruposSeleccionados(misGrupos);
        setMostrarTodosLosGrupos(misGrupos.length === 0);
      }

      setFiltroAnioModal("todos");
      setVerMasModal(false);
    }
  }, [itemInicial, docentesDisponibles, obtenerGruposDelDocente]);

  const handleCambiarDocente = (val) => {
    setDocenteSeleccionado(val);
    if (val === "otro") {
      setGruposSeleccionados(
        itemInicial?.grupo && itemInicial.grupo !== "taller-nuevo" ? [itemInicial.grupo] : []
      );
    } else {
      const doc = docentesDisponibles.find((d) => d.id === val);
      const delNuevo = obtenerGruposDelDocente(doc).map((g) => g.grupo);
      const iniciales =
        itemInicial?.grupo && itemInicial.grupo !== "taller-nuevo"
          ? Array.from(new Set([itemInicial.grupo, ...delNuevo]))
          : delNuevo;
      setGruposSeleccionados(iniciales);
    }
  };

  const opcionesSelectDocentes = useMemo(() => {
    const list = docentesDisponibles.map((d) => ({
      value: d.id,
      label: d.email ? `${d.nombre} (${d.email})` : d.nombre
    }));
    list.push({
      value: "otro",
      label: "➕ Asignar otro docente / nuevo nombre..."
    });
    return list;
  }, [docentesDisponibles]);

  const gruposAsignadosActuales = useMemo(() => {
    let doc = null;
    if (docenteSeleccionado && docenteSeleccionado !== "otro") {
      doc = docentesDisponibles.find((d) => d.id === docenteSeleccionado);
    }
    if (!doc) {
      doc = itemInicial?.docente;
    }
    if (!doc) return [];
    return obtenerGruposDelDocente(doc);
  }, [docenteSeleccionado, docentesDisponibles, itemInicial, obtenerGruposDelDocente]);

  const opcionesCursosModal = [
    { value: "todos", label: "Todos los cursos" },
    { value: "1", label: "1° Año" },
    { value: "2", label: "2° Año" },
    { value: "3", label: "3° Año" },
    { value: "4", label: "4° Año" },
    { value: "5", label: "5° Año" },
    { value: "6", label: "6° Año" },
    { value: "7", label: "7° Año" }
  ];

  const gruposDisponiblesModal = useMemo(() => {
    if (!todosLosGrupos || todosLosGrupos.length === 0) return [];
    let listaBase;
    if (mostrarTodosLosGrupos || filtroAnioModal !== "todos") {
      const asignadosSet = new Set(gruposAsignadosActuales.map((g) => g.grupo));
      if (itemInicial?.grupo && itemInicial.grupo !== "taller-nuevo") {
        asignadosSet.add(itemInicial.grupo);
      }
      listaBase = [...todosLosGrupos].sort((a, b) => {
        const aAsig = asignadosSet.has(a.grupo) ? 1 : 0;
        const bAsig = asignadosSet.has(b.grupo) ? 1 : 0;
        if (aAsig !== bAsig) return bAsig - aAsig;
        if (a.anio !== b.anio) return a.anio - b.anio;
        return Number(a.division) - Number(b.division) || a.grupo.localeCompare(b.grupo, "es");
      });
    } else {
      const marcados = todosLosGrupos.filter((g) => gruposSeleccionados.includes(g.grupo));
      listaBase = marcados.length > 0 ? marcados : todosLosGrupos;
    }

    if (filtroAnioModal !== "todos") {
      return listaBase.filter((g) => String(g.anio) === filtroAnioModal);
    }
    return listaBase;
  }, [
    todosLosGrupos,
    mostrarTodosLosGrupos,
    filtroAnioModal,
    gruposAsignadosActuales,
    gruposSeleccionados,
    itemInicial
  ]);

  if (!abierto || !itemInicial) return null;

  const toggleGrupo = (codigoGrupo) => {
    setGruposSeleccionados((prev) =>
      prev.includes(codigoGrupo)
        ? prev.filter((g) => g !== codigoGrupo)
        : [...prev, codigoGrupo]
    );
  };

  const desmarcarTodosGrupos = () => {
    setGruposSeleccionados([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      let datosDocente = null;
      if (docenteSeleccionado === "otro") {
        if (!nombrePersonalizado.trim()) return;
        datosDocente = {
          id: `doc-taller-${Date.now()}`,
          nombre: nombrePersonalizado.trim(),
          email: emailPersonalizado.trim().toLowerCase() || "docente@prece.local"
        };
      } else {
        const encontrado = docentesDisponibles.find((d) => d.id === docenteSeleccionado);
        datosDocente = encontrado
          ? {
              id: encontrado.id,
              nombre: encontrado.nombre,
              email: encontrado.email || "docente@prece.local"
            }
          : itemInicial.docente
          ? {
              id: itemInicial.docente.id || `doc-taller-${Date.now()}`,
              nombre: itemInicial.docente.nombre,
              email: itemInicial.docente.email || "docente@prece.local"
            }
          : null;
      }

      const inicialesCodigos = gruposAsignadosActuales.map((g) => g.grupo);
      const seleccionadosCodigos = gruposSeleccionados.filter((g) => g !== "taller-nuevo");
      const codigosAQuitar = inicialesCodigos.filter((g) => !seleccionadosCodigos.includes(g));

      const cambios = [];
      for (const codigo of seleccionadosCodigos) {
        const info = todosLosGrupos.find((g) => g.grupo === codigo);
        if (info && datosDocente) {
          cambios.push({
            grupo: info.grupo,
            anio: info.anio,
            division: info.division,
            docente: datosDocente
          });
        }
      }
      for (const codigo of codigosAQuitar) {
        const info = todosLosGrupos.find((g) => g.grupo === codigo);
        if (info) {
          cambios.push({
            grupo: info.grupo,
            anio: info.anio,
            division: info.division,
            docente: null
          });
        }
      }

      await alGuardar(cambios, seleccionadosCodigos.length, codigosAQuitar.length);
      alCerrar();
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    h(
      "div",
      {
        className: "director-modal-backdrop",
        onClick: (e) => e.target === e.currentTarget && alCerrar()
      },
      h(
        "div",
        {
          className: "director-modal-container director-modal-container--wide",
          role: "dialog",
          "aria-modal": "true"
        },
        // Header
        h(
          "div",
          { className: "director-modal-header" },
          h(
            "div",
            null,
            h(
              "h2",
              { className: "director-modal-title" },
              itemInicial.grupo === "taller-nuevo"
                ? `Asignar Grupos de Taller a ${itemInicial.docente?.nombre || "Docente"}`
                : "Reasignar Docente a Grupo(s) de Taller"
            ),
            h(
              "p",
              { className: "director-modal-subtitle" },
              itemInicial.grupo === "taller-nuevo"
                ? itemInicial.docente?.email || "Seleccione los grupos de taller a asignar"
                : `${itemInicial.anio}°${itemInicial.division} · Grupo ${itemInicial.grupo} (Turno ${itemInicial.turno || "Mañana"})`
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
          { className: "director-modal-form", onSubmit: handleSubmit },
          h(
            "div",
            { className: "asignaciones-modal-grid" },

            // COLUMNA IZQUIERDA
            h(
              "div",
              { className: "asignaciones-modal-col-left" },
              itemInicial.docente
                ? h(
                    "div",
                    { className: "asignaciones-current-info" },
                    h("span", { className: "asignaciones-current-label" }, "Docente seleccionado:"),
                    h(
                      "div",
                      { className: "asignaciones-current-val" },
                      h("strong", null, itemInicial.docente.nombre || "Docente"),
                      h("span", null, itemInicial.docente.email ? ` (${itemInicial.docente.email})` : "")
                    ),
                    gruposAsignadosActuales.length > 0
                      ? h(
                          "div",
                          { className: "asignaciones-current-divisions-wrap" },
                          h(
                            "span",
                            { className: "asignaciones-current-divisions-label" },
                            "Grupos de taller asignados actualmente:"
                          ),
                          h(
                            "div",
                            { className: "asignaciones-division-tag-wrap" },
                            (verMasModal
                              ? gruposAsignadosActuales
                              : gruposAsignadosActuales.slice(0, 3)
                            ).map((g) =>
                              h(
                                "span",
                                { key: g.grupo, className: "asignaciones-div-badge" },
                                `${g.anio}°${g.division} (Grupo ${g.grupo})`
                              )
                            ),
                            gruposAsignadosActuales.length > 3
                              ? h(
                                  "button",
                                  {
                                    type: "button",
                                    className: "asignaciones-ver-mas-btn",
                                    onClick: () => setVerMasModal(!verMasModal)
                                  },
                                  verMasModal
                                    ? "Ver menos"
                                    : `Ver más (+${gruposAsignadosActuales.length - 3})`
                                )
                              : null
                          )
                        )
                      : null
                  )
                : null,

              h(
                "div",
                { className: "form-group" },
                h("label", { className: "form-label" }, "Seleccionar Docente de Taller:"),
                h(CustomSelect, {
                  id: "select-docente-taller-modal",
                  value: docenteSeleccionado,
                  options: opcionesSelectDocentes,
                  onChange: handleCambiarDocente,
                  placeholder: "Seleccione un docente...",
                  isSearchable: true,
                  className: "w-full"
                })
              ),

              docenteSeleccionado === "otro"
                ? h(
                    "div",
                    { className: "asignaciones-custom-fields" },
                    h(
                      "div",
                      { className: "form-group" },
                      h("label", { className: "form-label" }, "Nombre y Apellido del Docente:"),
                      h("input", {
                        type: "text",
                        className: "search-input",
                        placeholder: "Ej. Prof. Martín Rodríguez",
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
                        placeholder: "mrodriguez@prece.local",
                        value: emailPersonalizado,
                        onChange: (e) => setEmailPersonalizado(e.target.value)
                      })
                    )
                  )
                : null
            ),

            // COLUMNA DERECHA: Selección de Grupos de Taller
            h(
              "div",
              { className: "asignaciones-modal-col-right" },
              h(
                "div",
                { className: "asignaciones-multicursos-header" },
                h("span", { className: "asignaciones-multicursos-title" }, "Grupos de taller a asignar:"),
                h(
                  "div",
                  { className: "asignaciones-multicursos-actions" },
                  h(CustomSelect, {
                    id: "modal-filtro-curso-taller",
                    value: filtroAnioModal,
                    options: opcionesCursosModal,
                    onChange: setFiltroAnioModal,
                    ariaLabel: "Filtrar por curso",
                    className: "asignaciones-modal-filter-select asignaciones-modal-filter-select--curso"
                  }),
                  gruposSeleccionados.length > 0
                    ? h(
                        "button",
                        {
                          type: "button",
                          className: "asignaciones-btn-desmarcar",
                          onClick: desmarcarTodosGrupos,
                          title: "Desmarcar todos los grupos"
                        },
                        "Desmarcar todos"
                      )
                    : null
                )
              ),
              h(
                "div",
                { className: "asignaciones-multicursos-box asignaciones-multicursos-box--full" },
                h(
                  "div",
                  { className: "asignaciones-multicursos-list" },
                  gruposDisponiblesModal.map((g) => {
                    const estaSeleccionado = gruposSeleccionados.includes(g.grupo);
                    const actualDoc = porGrupo.get(g.grupo)?.docente ?? null;

                    return h(
                      "div",
                      {
                        key: g.grupo,
                        className: `asignaciones-materia-card ${
                          estaSeleccionado ? "asignaciones-materia-card--selected" : ""
                        }`,
                        style: { cursor: "pointer" },
                        onClick: () => toggleGrupo(g.grupo)
                      },
                      h(
                        "div",
                        { className: "asignaciones-materia-card-header" },
                        h("input", {
                          type: "checkbox",
                          className: "asignaciones-multicursos-checkbox",
                          checked: estaSeleccionado,
                          onClick: (e) => e.stopPropagation(),
                          onChange: () => toggleGrupo(g.grupo)
                        }),
                        h(
                          "div",
                          { className: "asignaciones-multicursos-info" },
                          h(
                            "span",
                            { className: "asignaciones-multicursos-curso" },
                            `${g.anio}°${g.division} · Grupo ${g.grupo}`
                          ),
                          h(
                            "span",
                            { className: "asignaciones-multicursos-turno" },
                            `Turno ${g.turno || "Mañana"}`
                          ),
                          h(
                            "span",
                            {
                              className: `asignaciones-multicursos-estado ${
                                actualDoc
                                  ? "asignaciones-multicursos-estado--assigned"
                                  : "asignaciones-multicursos-estado--unassigned"
                              }`
                            },
                            actualDoc ? `● ${actualDoc.nombre}` : "○ Sin asignar"
                          )
                        )
                      )
                    );
                  })
                )
              )
            )
          ),

          // Footer
          h(
            "div",
            { className: "asignaciones-modal-footer" },
            h(
              "div",
              { style: { display: "flex", alignItems: "center", gap: "10px" } },
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
                guardando ? "Guardando..." : "Confirmar"
              )
            ),
            todosLosGrupos.length > 0
              ? h(
                  "div",
                  { style: { marginLeft: "auto" } },
                  h(
                    "button",
                    {
                      type: "button",
                      className: `asignaciones-footer-tool-btn ${
                        mostrarTodosLosGrupos ? "asignaciones-footer-tool-btn--accent" : ""
                      }`,
                      onClick: () => setMostrarTodosLosGrupos(!mostrarTodosLosGrupos),
                      title: mostrarTodosLosGrupos
                        ? "Ver solo grupos asignados a este docente"
                        : "Ver todos los grupos de taller disponibles"
                    },
                    h(
                      "span",
                      null,
                      mostrarTodosLosGrupos
                        ? `Solo grupos seleccionados (${gruposSeleccionados.length})`
                        : `Ver todos los grupos (${todosLosGrupos.length})`
                    )
                  )
                )
              : null
          )
        )
      )
    ),
    document.body
  );
}

export default function AsignacionesTalleres({
  personal = [],
  modoVista = "tabla",
  onMostrarToast,
  onContar
}) {
  const [cursos, setCursos] = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [error, setError] = useState(null);

  // Filtros con el mismo diseño que Docentes y Preceptores
  const [busqueda, setBusqueda] = useState("");
  const [filtroAnio, setFiltroAnio] = useState("todos");
  const [filtroTurno, setFiltroTurno] = useState("todos");
  const [filtroGrupo, setFiltroGrupo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Expansión "Ver más" y modal
  const [expandidas, setExpandidas] = useState({});
  const [itemParaAsignar, setItemParaAsignar] = useState(null);

  const toggleExpand = (id) => {
    setExpandidas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const cargar = useCallback(() => {
    setError(null);
    Promise.all([StudentsService.getDivisiones(), JefaturaService.listarDocentesTalleres()])
      .then(([divisiones, lista]) => {
        setCursos(cursosConGrupos(divisiones ?? []));
        setAsignaciones(lista ?? []);
      })
      .catch((err) =>
        setError(err.mensaje || err.message || "No se pudieron cargar los grupos de taller.")
      );
  }, []);

  useEffect(() => cargar(), [cargar]);

  useEffect(() => {
    if (onContar) onContar(asignaciones.length);
  }, [asignaciones, onContar]);

  const porGrupo = useMemo(
    () => new Map(asignaciones.map((item) => [item.grupo, item])),
    [asignaciones]
  );

  // Catálogo plano de todos los grupos de taller con su curso, división y turno
  const todosLosGrupos = useMemo(() => {
    if (!cursos) return [];
    const lista = [];
    for (const c of cursos) {
      const turnoBase = c.turno
        ? c.turno.charAt(0).toUpperCase() + c.turno.slice(1).toLowerCase()
        : "";
      for (const g of c.grupos) {
        const num = Number(String(g).split(".")[1] || 1);
        const turnoGrupo = turnoBase || (num % 2 === 1 ? "Mañana" : "Tarde");
        lista.push({
          grupo: g,
          anio: c.anio,
          division: c.division,
          turno: turnoGrupo
        });
      }
    }
    return lista;
  }, [cursos]);

  // Catálogo completo de docentes (personal + fallback institucional + asignados en talleres)
  const catalogoDocentesTaller = useMemo(() => {
    const lista = [];
    const agregarSiNoExiste = (candidato) => {
      if (!candidato) return;
      const index = lista.findIndex((d) => sonMismoDocente(d, candidato));
      if (index === -1) {
        const nombre =
          candidato.nombreCompleto || candidato.nombre || "Docente Asignado";
        lista.push({
          id: candidato.id || `doc-taller-${Date.now()}-${Math.random()}`,
          nombre,
          email: String(candidato.email || "").toLowerCase(),
          avatar: candidato.avatar || nombre.charAt(0).toUpperCase(),
          turno: candidato.turno || null
        });
      } else {
        if (!lista[index].email && candidato.email) {
          lista[index].email = String(candidato.email).toLowerCase();
        }
        if (
          (!lista[index].nombre || lista[index].nombre === "Docente") &&
          (candidato.nombreCompleto || candidato.nombre)
        ) {
          lista[index].nombre = candidato.nombreCompleto || candidato.nombre;
        }
      }
    };

    opcionesDocentes(personal, asignaciones).forEach(agregarSiNoExiste);

    const fallback = [
      { id: "usr-doc-1", nombre: "Docente Matemática", email: "docente@prece.local", avatar: "D" },
      { id: "usr-doc-2", nombre: "Prof. María Villatoro", email: "mvillatoro@prece.local", avatar: "M" },
      { id: "usr-doc-3", nombre: "Prof. Lucía Ríos", email: "lrios@prece.local", avatar: "L" },
      { id: "usr-doc-4", nombre: "Prof. Humberto Sosa", email: "hsosa@prece.local", avatar: "H" },
      { id: "usr-doc-5", nombre: "Prof. Esteban Gómez", email: "egomez@prece.local", avatar: "E" },
      { id: "usr-doc-6", nombre: "Prof. Andrea Ferreyra", email: "aferreyra@prece.local", avatar: "A" },
      { id: "usr-doc-7", nombre: "Prof. Pablo Morales", email: "pmorales@prece.local", avatar: "P" }
    ];
    fallback.forEach(agregarSiNoExiste);

    asignaciones.forEach((item) => {
      if (item.docente) agregarSiNoExiste(item.docente);
    });

    return lista;
  }, [personal, asignaciones]);

  // Agrupar filas por docente (igual que en Docentes y Preceptores)
  const filasTalleres = useMemo(() => {
    const todasFilas = catalogoDocentesTaller.map((doc) => {
      const misGrupos = todosLosGrupos.filter((g) => {
        const asig = porGrupo.get(g.grupo);
        return asig?.docente && sonMismoDocente(doc, asig.docente);
      });

      const tieneAsignados = misGrupos.length > 0;
      const aniosSet = new Set();
      const turnosSet = new Set();

      misGrupos.forEach((g) => {
        if (g.anio) aniosSet.add(`${g.anio}°`);
        if (g.turno) turnosSet.add(g.turno);
      });

      const aniosArray = Array.from(aniosSet);
      const turnosArray = Array.from(turnosSet).map(
        (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
      );

      return {
        id: `taller-doc-${doc.id || doc.email}`,
        curso: tieneAsignados ? aniosArray.join(", ") || "-" : "-",
        turno: tieneAsignados ? turnosArray.join(", ") || "Mañana" : doc.turno || "-",
        grupos: misGrupos,
        docente: doc,
        estado: tieneAsignados ? "asignado" : "sin_asignar"
      };
    });

    return todasFilas.filter((fila) => {
      if (filtroEstado !== "todos" && fila.estado !== filtroEstado) {
        return false;
      }
      if (filtroTurno !== "todos") {
        if (fila.estado === "sin_asignar") return false;
        const coincideTurno = fila.grupos.some(
          (g) => (g.turno || "").toLowerCase() === filtroTurno.toLowerCase()
        );
        if (!coincideTurno) return false;
      }
      if (filtroAnio !== "todos") {
        if (fila.estado === "sin_asignar") return false;
        const coincideAnio = fila.grupos.some((g) => String(g.anio) === filtroAnio);
        if (!coincideAnio) return false;
      }
      if (filtroGrupo !== "todos") {
        if (fila.estado === "sin_asignar") return false;
        const coincideGrupo = fila.grupos.some((g) => g.grupo === filtroGrupo);
        if (!coincideGrupo) return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        const enNombre = (fila.docente?.nombre || "").toLowerCase().includes(q);
        const enEmail = (fila.docente?.email || "").toLowerCase().includes(q);
        const enGrupos = fila.grupos.some((g) =>
          `${g.anio}°${g.division} ${g.anio}° ${g.division} grupo ${g.grupo}`.toLowerCase().includes(q)
        );
        if (!enNombre && !enEmail && !enGrupos) return false;
      }
      return true;
    });
  }, [
    catalogoDocentesTaller,
    todosLosGrupos,
    porGrupo,
    filtroEstado,
    filtroTurno,
    filtroAnio,
    filtroGrupo,
    busqueda
  ]);

  const handleGuardarCambiosTaller = async (cambios, cantAsignados, cantQuitados) => {
    if (!cambios || cambios.length === 0) return;
    try {
      const lista = await JefaturaService.guardarDocentesTalleres(cambios);
      setAsignaciones(lista ?? []);
      if (onMostrarToast) {
        if (cantAsignados > 0 && cantQuitados > 0) {
          onMostrarToast(
            `Asignaciones de taller actualizadas: ${cantAsignados} grupo(s) asignado(s), ${cantQuitados} quitado(s).`
          );
        } else if (cantQuitados > 0) {
          onMostrarToast(`Se quitaron ${cantQuitados} grupo(s) de taller del docente.`);
        } else if (cantAsignados > 1) {
          onMostrarToast(`Docente asignado exitosamente a ${cantAsignados} grupos de taller.`);
        } else {
          onMostrarToast("Grupo de taller asignado exitosamente.");
        }
      }
    } catch (err) {
      if (onMostrarToast) {
        onMostrarToast(err.mensaje || "No se pudo guardar la asignación del grupo de taller.");
      }
    }
  };

  const handleQuitarGruposDocente = async (gruposDelDocente) => {
    if (!gruposDelDocente || gruposDelDocente.length === 0) return;
    try {
      const cambios = gruposDelDocente.map((g) => ({
        grupo: g.grupo,
        anio: g.anio,
        division: g.division,
        docente: null
      }));
      const lista = await JefaturaService.guardarDocentesTalleres(cambios);
      setAsignaciones(lista ?? []);
      if (onMostrarToast) {
        onMostrarToast(
          gruposDelDocente.length > 1
            ? `Se quitaron los grupos de taller del docente (${gruposDelDocente.length} grupos).`
            : "Se quitó la asignación del grupo de taller."
        );
      }
    } catch (err) {
      if (onMostrarToast) {
        onMostrarToast(err.mensaje || "Error al quitar la asignación de taller.");
      }
    }
  };

  const opcionesFiltroGrupos = useMemo(() => {
    return [
      { value: "todos", label: "Todos los Grupos" },
      ...todosLosGrupos.map((g) => ({
        value: g.grupo,
        label: `Grupo ${g.grupo} (${g.anio}°${g.division})`
      }))
    ];
  }, [todosLosGrupos]);

  if (error) {
    return h(
      "div",
      { className: "asignaciones-cards-empty", role: "alert" },
      error,
      " ",
      h(
        "button",
        {
          type: "button",
          className: "asignaciones-btn-reasignar",
          style: { marginLeft: "10px", display: "inline-flex" },
          onClick: cargar
        },
        "Reintentar"
      )
    );
  }

  return h(
    React.Fragment,
    null,

    // Toolbar de Filtros (idéntica a Docentes y Preceptores)
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
          placeholder: "Buscar por grupo (1.1), división o docente...",
          value: busqueda,
          onChange: (e) => setBusqueda(e.target.value),
          "aria-label": "Buscar por grupo, división o docente"
        }),
        busqueda
          ? h(
              "button",
              {
                type: "button",
                className: "search-clear-btn",
                onClick: () => setBusqueda(""),
                "aria-label": "Limpiar"
              },
              "✕"
            )
          : null
      ),

      // Filtro Años
      h(CustomSelect, {
        id: "filtro-anio-talleres",
        value: filtroAnio,
        onChange: setFiltroAnio,
        options: [
          { value: "todos", label: "Todos los Años" },
          ...[1, 2, 3, 4, 5, 6, 7].map((num) => ({
            value: String(num),
            label: `${num}° Año`
          }))
        ],
        ariaLabel: "Filtrar por año",
        className: "asignaciones-filter-custom-select"
      }),

      // Filtro Turnos
      h(CustomSelect, {
        id: "filtro-turno-talleres",
        value: filtroTurno,
        onChange: setFiltroTurno,
        options: [
          { value: "todos", label: "Todos los Turnos" },
          { value: "mañana", label: "Turno Mañana" },
          { value: "tarde", label: "Turno Tarde" }
        ],
        ariaLabel: "Filtrar por turno",
        className: "asignaciones-filter-custom-select"
      }),

      // Filtro Grupos
      h(CustomSelect, {
        id: "filtro-grupo-talleres",
        value: filtroGrupo,
        onChange: setFiltroGrupo,
        placeholder: "Todos los Grupos",
        options: opcionesFiltroGrupos,
        ariaLabel: "Filtrar por grupo de taller",
        className: "asignaciones-filter-custom-select asignaciones-filter-custom-select--materia"
      }),

      // Filtro Estados
      h(CustomSelect, {
        id: "filtro-estado-talleres",
        value: filtroEstado,
        onChange: setFiltroEstado,
        options: [
          { value: "todos", label: "Todos los Estados" },
          { value: "asignado", label: "Asignados" },
          { value: "sin_asignar", label: "Sin Asignar" }
        ],
        ariaLabel: "Filtrar por estado",
        className: "asignaciones-filter-custom-select"
      })
    ),

    // Vista Tabla o Tarjetas
    !cursos
      ? h("div", { className: "asignaciones-cards-empty" }, "Cargando grupos de taller...")
      : modoVista === "tabla"
      ? h(
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
                h("th", { style: { width: "7%" } }, "AÑO"),
                h("th", { style: { width: "45%" } }, "DIVISIÓN Y GRUPO DE TALLER"),
                h("th", { style: { width: "9%" } }, "TURNO"),
                h("th", { style: { width: "21%" } }, "DOCENTE"),
                h("th", { style: { width: "10%" } }, "ESTADO"),
                h("th", { style: { width: "8%", textAlign: "left" } }, "ACCIONES")
              )
            ),
            h(
              "tbody",
              null,
              filasTalleres.length === 0
                ? h(
                    "tr",
                    null,
                    h(
                      "td",
                      { colSpan: 6, className: "asignaciones-empty-td" },
                      "No se encontraron docentes o grupos de taller con los filtros aplicados."
                    )
                  )
                : filasTalleres.map((fila) => {
                    const esExpandida = Boolean(expandidas[fila.id]);
                    const aMostrar = esExpandida ? fila.grupos : fila.grupos.slice(0, 3);
                    const faltantes = fila.grupos.length - 3;

                    return h(
                      "tr",
                      { key: fila.id },

                      // AÑO
                      h(
                        "td",
                        null,
                        h("span", { className: "asignaciones-cell-anio" }, fila.curso)
                      ),

                      // DIVISIÓN Y GRUPO DE TALLER
                      h(
                        "td",
                        null,
                        fila.estado === "asignado"
                          ? h(
                              "div",
                              { className: "asignaciones-div-materia-tag-wrap" },
                              aMostrar.map((g) =>
                                h(
                                  "span",
                                  {
                                    key: g.grupo,
                                    className: "asignaciones-div-badge asignaciones-div-badge--materia",
                                    title: `${g.anio}°${g.division} (Grupo ${g.grupo}) · Turno ${g.turno}`
                                  },
                                  h("span", null, `${g.anio}°${g.division} (Grupo ${g.grupo})`)
                                )
                              ),
                              fila.grupos.length > 3
                                ? h(
                                    "button",
                                    {
                                      type: "button",
                                      className: `asignaciones-ver-mas-btn ${
                                        esExpandida ? "asignaciones-ver-mas-btn--expanded" : ""
                                      }`,
                                      onClick: () => toggleExpand(fila.id)
                                    },
                                    esExpandida ? "Ver menos" : `Ver más (+${faltantes})`
                                  )
                                : null
                            )
                          : h(
                              "span",
                              { className: "asignaciones-unassigned" },
                              "Sin grupos de taller asignados"
                            )
                      ),

                      // TURNO
                      h(
                        "td",
                        null,
                        h("span", { className: "asignaciones-cell-turno" }, fila.turno)
                      ),

                      // DOCENTE
                      h(
                        "td",
                        null,
                        h(
                          "div",
                          { className: "asignaciones-user-cell" },
                          h(
                            "div",
                            {
                              className: `asignaciones-user-avatar ${
                                fila.estado === "asignado"
                                  ? "asignaciones-user-avatar--emerald"
                                  : "asignaciones-user-avatar--amber"
                              }`
                            },
                            fila.docente.avatar || fila.docente.nombre.charAt(0).toUpperCase()
                          ),
                          h(
                            "div",
                            { className: "asignaciones-user-info" },
                            h("strong", { className: "asignaciones-user-name" }, fila.docente.nombre),
                            h(
                              "div",
                              {
                                style: {
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                  marginTop: "2px"
                                }
                              },
                              h("span", { className: "asignaciones-user-email" }, fila.docente.email),
                              fila.grupos.length > 0
                                ? h(
                                    "span",
                                    { className: "asignaciones-tag-horas" },
                                    `${fila.grupos.length} ${fila.grupos.length === 1 ? "grupo" : "grupos"}`
                                  )
                                : null
                            )
                          )
                        )
                      ),

                      // ESTADO
                      h(
                        "td",
                        null,
                        fila.estado === "asignado"
                          ? h(
                              "span",
                              { className: "asignaciones-status-badge asignaciones-status-badge--assigned" },
                              fila.grupos.length > 1
                                ? `● Asignado (${fila.grupos.length})`
                                : "● Asignado"
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
                        { style: { textAlign: "left" } },
                        fila.estado === "asignado"
                          ? h(
                              "div",
                              { className: "asignaciones-actions-wrap" },
                              h(
                                "button",
                                {
                                  type: "button",
                                  className: "asignaciones-btn-reasignar",
                                  onClick: () =>
                                    setItemParaAsignar({
                                      ...fila.grupos[0],
                                      docente: fila.docente
                                    }),
                                  title: "Reasignar grupos de taller de este docente"
                                },
                                h(IconUserCheck, null),
                                h("span", null, "Reasignar")
                              ),
                              h(
                                "button",
                                {
                                  type: "button",
                                  className: "asignaciones-btn-quitar",
                                  onClick: () => handleQuitarGruposDocente(fila.grupos),
                                  title: "Quitar docente de los grupos de taller asignados"
                                },
                                "Quitar"
                              )
                            )
                          : h(
                              "button",
                              {
                                type: "button",
                                className: "asignaciones-btn-asignar asignaciones-btn-asignar--emerald",
                                onClick: () =>
                                  setItemParaAsignar({
                                    grupo: "taller-nuevo",
                                    docente: fila.docente
                                  }),
                                title: "Asignar grupos de taller a este docente"
                              },
                              h(IconUserPlus, null),
                              h("span", null, "Asignar")
                            )
                      )
                    );
                  })
            )
          )
        )
      : h(
          "div",
          { className: "asignaciones-cards-grid" },
          filasTalleres.length === 0
            ? h(
                "div",
                { className: "asignaciones-cards-empty" },
                "No se encontraron docentes o grupos de taller con los filtros aplicados."
              )
            : filasTalleres.map((fila) => {
                const esExpandida = Boolean(expandidas[fila.id]);
                const aMostrar = esExpandida ? fila.grupos : fila.grupos.slice(0, 3);
                const faltantes = fila.grupos.length - 3;

                return h(
                  "div",
                  {
                    key: fila.id,
                    className: `asignaciones-docente-card ${
                      fila.estado === "asignado"
                        ? "asignaciones-docente-card--asignado"
                        : "asignaciones-docente-card--sin-asignar"
                    }`
                  },

                  // Header de la Tarjeta
                  h(
                    "div",
                    { className: "asignaciones-docente-card-header" },
                    h(
                      "div",
                      { className: "asignaciones-card-user" },
                      h(
                        "div",
                        {
                          className: `asignaciones-user-avatar ${
                            fila.estado === "asignado"
                              ? "asignaciones-user-avatar--emerald"
                              : "asignaciones-user-avatar--amber"
                          }`
                        },
                        fila.docente.avatar || fila.docente.nombre.charAt(0).toUpperCase()
                      ),
                      h(
                        "div",
                        { className: "asignaciones-card-user-info" },
                        h("strong", { className: "asignaciones-card-name" }, fila.docente.nombre),
                        h("span", { className: "asignaciones-card-email" }, fila.docente.email)
                      )
                    ),
                    h(
                      "span",
                      {
                        className: `asignaciones-status-badge ${
                          fila.estado === "asignado"
                            ? "asignaciones-status-badge--assigned"
                            : "asignaciones-status-badge--unassigned"
                        }`
                      },
                      fila.estado === "asignado"
                        ? fila.grupos.length > 1
                          ? `● Asignado (${fila.grupos.length})`
                          : "● Asignado"
                        : "● Sin asignar"
                    )
                  ),

                  // Métricas
                  h(
                    "div",
                    { className: "asignaciones-card-metrics" },
                    h(
                      "div",
                      { className: "asignaciones-card-metric-item" },
                      h(IconGraduationCap, { width: "14", height: "14", className: "text-slate-500" }),
                      h(
                        "span",
                        null,
                        fila.grupos.length === 1
                          ? "1 grupo asignado"
                          : fila.grupos.length > 1
                          ? `${fila.grupos.length} grupos asignados`
                          : "Sin grupos asignados"
                      )
                    ),
                    h(
                      "div",
                      { className: "asignaciones-card-metric-item" },
                      h(IconClock, { width: "14", height: "14", className: "text-slate-500" }),
                      h("span", null, `Turnos: ${fila.turno || "-"}`)
                    )
                  ),

                  // Grupos asignados
                  h(
                    "div",
                    { className: "asignaciones-card-materias-section" },
                    h("span", { className: "asignaciones-card-materias-label" }, "Grupos de taller asignados:"),
                    fila.grupos.length > 0
                      ? h(
                          "div",
                          { className: "asignaciones-div-materia-tag-wrap" },
                          aMostrar.map((g) =>
                            h(
                              "span",
                              {
                                key: g.grupo,
                                className: "asignaciones-div-badge asignaciones-div-badge--materia",
                                title: `${g.anio}°${g.division} (Grupo ${g.grupo}) · Turno ${g.turno}`
                              },
                              h("span", null, `${g.anio}°${g.division} (Grupo ${g.grupo})`)
                            )
                          ),
                          fila.grupos.length > 3
                            ? h(
                                "button",
                                {
                                  type: "button",
                                  className: `asignaciones-ver-mas-btn ${
                                    esExpandida ? "asignaciones-ver-mas-btn--expanded" : ""
                                  }`,
                                  onClick: () => toggleExpand(fila.id)
                                },
                                esExpandida ? "Ver menos" : `Ver más (+${faltantes})`
                              )
                            : null
                        )
                      : h(
                          "span",
                          { className: "asignaciones-unassigned" },
                          "No tiene grupos de taller asignados actualmente."
                        )
                  ),

                  // Card Footer
                  h(
                    "div",
                    { className: "asignaciones-card-footer" },
                    fila.estado === "asignado"
                      ? [
                          h(
                            "button",
                            {
                              key: "card-btn-reasignar-taller",
                              type: "button",
                              className: "asignaciones-btn-reasignar",
                              onClick: () =>
                                setItemParaAsignar({
                                  ...fila.grupos[0],
                                  docente: fila.docente
                                }),
                              title: "Reasignar docente a estos grupos"
                            },
                            h(IconUserCheck, null),
                            h("span", null, "Reasignar")
                          ),
                          h(
                            "button",
                            {
                              key: "card-btn-quitar-taller",
                              type: "button",
                              className: "asignaciones-btn-quitar",
                              onClick: () => handleQuitarGruposDocente(fila.grupos),
                              title: "Quitar docente de los grupos asignados"
                            },
                            "Quitar"
                          )
                        ]
                      : h(
                          "button",
                          {
                            type: "button",
                            className: "asignaciones-btn-asignar asignaciones-btn-asignar--emerald",
                            style: { width: "100%", justifyContent: "center" },
                            onClick: () =>
                              setItemParaAsignar({
                                grupo: "taller-nuevo",
                                docente: fila.docente
                              }),
                            title: "Asignar grupos de taller a este docente"
                          },
                          h(IconUserPlus, null),
                          h("span", null, "Asignar Grupos")
                        )
                  )
                );
              })
        ),

    // Modal para asignar / reasignar grupos de taller
    itemParaAsignar
      ? h(ModalAsignarTaller, {
          abierto: Boolean(itemParaAsignar),
          itemInicial: itemParaAsignar,
          docentesDisponibles: catalogoDocentesTaller,
          todosLosGrupos,
          porGrupo,
          alCerrar: () => setItemParaAsignar(null),
          alGuardar: handleGuardarCambiosTaller
        })
      : null
  );
}
