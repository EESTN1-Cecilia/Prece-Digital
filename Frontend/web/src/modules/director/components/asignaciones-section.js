import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { h } from "../../../layouts/site-layout.js";
import { DirectorService } from "../director-service.js";
import { CustomSelect } from "../../../components/common/custom-select.js";

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

function IconSchool({ className = "w-4 h-4", width = "16", height = "16" }) {
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
    h("path", { d: "M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" }),
    h("path", { d: "M18 10h4" }),
    h("path", { d: "M2 10h4" }),
    h("path", { d: "m22 7-10-5L2 7l10 5 10-5Z" }),
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

function IconList({ className = "w-4 h-4", width = "16", height = "16" }) {
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
    h("line", { x1: "8", y1: "6", x2: "21", y2: "6" }),
    h("line", { x1: "8", y1: "12", x2: "21", y2: "12" }),
    h("line", { x1: "8", y1: "18", x2: "21", y2: "18" }),
    h("line", { x1: "3", y1: "6", x2: "3.01", y2: "6" }),
    h("line", { x1: "3", y1: "12", x2: "3.01", y2: "12" }),
    h("line", { x1: "3", y1: "18", x2: "3.01", y2: "18" })
  );
}

function IconGrid({ className = "w-4 h-4", width = "16", height = "16" }) {
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
    h("rect", { x: "3", y: "3", width: "7", height: "7", rx: "2" }),
    h("rect", { x: "14", y: "3", width: "7", height: "7", rx: "2" }),
    h("rect", { x: "14", y: "14", width: "7", height: "7", rx: "2" }),
    h("rect", { x: "3", y: "14", width: "7", height: "7", rx: "2" })
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

function IconChevronDown({ className = "w-4 h-4", width = "16", height = "16" }) {
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
    h("polyline", { points: "6 9 12 15 18 9" })
  );
}

/**
 * Normaliza una cadena para comparaciones seguras de docentes/preceptores (sin tildes, minúsculas, sin prefijos como 'Prof.')
 */
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

/**
 * Comprueba de forma infalible si dos objetos representan al mismo docente o preceptor
 */
function sonMismoDocente(d1, d2) {
  if (!d1 || !d2) return false;

  // 1. Coincidencia por Email (prioridad unívoca)
  const email1 = String(d1.email || "").trim().toLowerCase();
  const email2 = String(d2.email || "").trim().toLowerCase();
  if (email1 && email2 && email1 === email2) return true;

  // 2. Coincidencia exacta por ID
  const id1 = d1.id !== undefined && d1.id !== null ? String(d1.id).trim() : "";
  const id2 = d2.id !== undefined && d2.id !== null ? String(d2.id).trim() : "";
  if (id1 && id2 && id1 === id2) return true;

  // 3. Coincidencia por ID numérico (ej: "usr-doc-6" vs 6 o "doc-6")
  if (id1 && id2) {
    const num1 = id1.replace(/\D/g, "");
    const num2 = id2.replace(/\D/g, "");
    if (num1 && num2 && num1 === num2) return true;
  }

  // 4. Coincidencia por Nombre normalizado
  const nom1 = normalizarTextoDocente(d1.nombreCompleto || d1.nombre || "");
  const nom2 = normalizarTextoDocente(d2.nombreCompleto || d2.nombre || "");
  if (nom1 && nom2) {
    if (nom1 === nom2) return true;
    if (nom1.length > 5 && nom2.length > 5 && (nom1.includes(nom2) || nom2.includes(nom1))) return true;
  }

  return false;
}

/**
 * Obtiene todas las divisiones asignadas a un preceptor dado.
 */
function getDivisionesPreceptor(preceptor, todasLasDivisiones) {
  if (!preceptor) return [];
  return (todasLasDivisiones || []).filter((d) => {
    if (!d.preceptor) return false;
    return sonMismoDocente(preceptor, d.preceptor);
  });
}

/**
 * Obtiene todas las cátedras asignadas a un profesor para una materia específica.
 */
function getCatedrasProfesorPorMateria(profesor, materia, todasLasCatedras) {
  if (!profesor || !materia) return [];
  const matNorm = String(materia).toLowerCase().trim();
  return (todasLasCatedras || []).filter((c) => {
    if (String(c.materia || "").toLowerCase().trim() !== matNorm) return false;
    if (!c.profesor) return false;
    return sonMismoDocente(profesor, c.profesor);
  });
}

/**
 * Obtiene todas las cátedras asignadas a un profesor en cualquier materia.
 */
function getCatedrasProfesor(profesor, todasLasCatedras) {
  if (!profesor) return [];
  return (todasLasCatedras || []).filter((c) => {
    if (!c.profesor) return false;
    return sonMismoDocente(profesor, c.profesor);
  });
}

/**
 * Comprueba si un curso pertenece a un docente dado.
 */
function esCursoAsignadoADocente(curso, docente) {
  if (!curso || !curso.profesor || !docente) return false;
  return sonMismoDocente(docente, curso.profesor);
}

/**
 * Renderiza el badge estilizado de situación de revista (titular, provisorio, suplente).
 */
function renderBadgeSituacion(sit) {
  const s = String(sit || "titular").toLowerCase().trim();
  const label = s === "provisorio" ? "Provisorio" : s === "suplente" ? "Suplente" : "Titular";
  return h(
    "span",
    {
      className: `asignaciones-badge-situacion asignaciones-badge-situacion--${s}`,
      style: { marginLeft: "4px", flexShrink: 0 }
    },
    label
  );
}

/**
 * Formatea curso y división de forma compacta (ej: '1°1', '1°4', '2°4').
 */
function formatoCursoDivision(c) {
  if (!c) return "";
  const numDiv = String(c.numDivision || c.division || "").replace(/[^\d]/g, "");
  const numCurso = String(c.curso || c.anio || "").replace(/[^\d]/g, "");

  if (numCurso && numDiv) {
    return `${numCurso}°${numDiv}`;
  }
  if (numCurso) {
    return `${numCurso}°`;
  }
  return String(c.division || "").replace(/divisi[oó]n\s*/i, "").trim();
}

/**
 * Renderiza la celda de división para preceptores mostrando hasta 2 divisiones y botón 'Ver más'.
 */
function renderDivisionCellPreceptores(item, divisionesPreceptores, expandidas, toggleExpand) {
  const todasDelPreceptor = item.preceptor
    ? getDivisionesPreceptor(item.preceptor, divisionesPreceptores)
    : [item];

  // Si no tiene preceptor o solo tiene 1 división
  if (!item.preceptor || todasDelPreceptor.length <= 1) {
    return h(
      "div",
      { className: "asignaciones-division-tag-wrap" },
      h("span", { className: "asignaciones-div-badge" }, formatoCursoDivision(item)),
      item.orientacion && item.orientacion !== "Ciclo Básico"
        ? h("span", { className: "asignaciones-div-orientacion" }, item.orientacion)
        : null
    );
  }

  // Tiene 2 o más divisiones asignadas
  const esExpandida = Boolean(expandidas[item.id]);
  const aMostrar = esExpandida ? todasDelPreceptor : todasDelPreceptor.slice(0, 2);
  const faltantes = todasDelPreceptor.length - 2;

  return h(
    "div",
    { className: "asignaciones-division-tag-wrap" },
    aMostrar.map((d) => {
      const texto = formatoCursoDivision(d);
      return h(
        "span",
        {
          key: d.id,
          className: `asignaciones-div-badge ${d.id === item.id ? "asignaciones-div-badge--current" : ""}`,
          title: `${formatoCursoDivision(d)} (Turno ${d.turno})`
        },
        texto
      );
    }),
    todasDelPreceptor.length > 2
      ? h(
          "button",
          {
            type: "button",
            className: `asignaciones-ver-mas-btn ${esExpandida ? "asignaciones-ver-mas-btn--expanded" : ""}`,
            onClick: (e) => {
              e.stopPropagation();
              toggleExpand(item.id);
            },
            title: esExpandida
              ? "Mostrar menos divisiones"
              : `Ver más: ${todasDelPreceptor.slice(2).map((d) => formatoCursoDivision(d)).join(", ")}`
          },
          esExpandida ? "Ver menos" : `Ver más (+${faltantes})`
        )
      : null
  );
}

/**
 * Renderiza la celda de división para profesores mostrando hasta 2 divisiones y botón 'Ver más'.
 */
function renderDivisionCellProfesores(item, catedrasProfesores, expandidas, toggleExpand) {
  const todasDelProfesor = item.profesor
    ? getCatedrasProfesorPorMateria(item.profesor, item.materia, catedrasProfesores)
    : [item];

  // Si no tiene profesor o solo tiene 1 división en esta materia
  if (!item.profesor || todasDelProfesor.length <= 1) {
    return h(
      "div",
      { className: "asignaciones-division-tag-wrap" },
      h("span", { className: "asignaciones-div-badge" }, formatoCursoDivision(item))
    );
  }

  // Tiene 2 o más divisiones en esta materia
  const esExpandida = Boolean(expandidas[item.id]);
  const aMostrar = esExpandida ? todasDelProfesor : todasDelProfesor.slice(0, 2);
  const faltantes = todasDelProfesor.length - 2;

  return h(
    "div",
    { className: "asignaciones-division-tag-wrap" },
    aMostrar.map((c) => {
      const texto = formatoCursoDivision(c);
      return h(
        "span",
        {
          key: c.id,
          className: `asignaciones-div-badge ${c.id === item.id ? "asignaciones-div-badge--current" : ""}`,
          title: `${formatoCursoDivision(c)} (${c.materia || item.materia}) · Turno ${c.turno}`
        },
        texto
      );
    }),
    todasDelProfesor.length > 2
      ? h(
          "button",
          {
            type: "button",
            className: `asignaciones-ver-mas-btn ${esExpandida ? "asignaciones-ver-mas-btn--expanded" : ""}`,
            onClick: (e) => {
              e.stopPropagation();
              toggleExpand(item.id);
            },
            title: esExpandida
              ? "Mostrar menos divisiones"
              : `Ver más: ${todasDelProfesor.slice(2).map((c) => formatoCursoDivision(c)).join(", ")}`
          },
          esExpandida ? "Ver menos" : `Ver más (+${faltantes})`
        )
      : null
  );
}

/**
 * Modal para asignar o reasignar un Preceptor a uno o varios Cursos y Divisiones
 */
function ModalAsignarPreceptor({ abierto, division, personal, todasLasDivisiones = [], alCerrar, alGuardar }) {
  const [preceptorSeleccionado, setPreceptorSeleccionado] = useState("");
  const [nombrePersonalizado, setNombrePersonalizado] = useState("");
  const [emailPersonalizado, setEmailPersonalizado] = useState("");
  const [cursosSeleccionados, setCursosSeleccionados] = useState([]);
  const [mostrarTodasLasDivisiones, setMostrarTodasLasDivisiones] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [verMasModal, setVerMasModal] = useState(false);

  // Filtrar preceptores disponibles desde el personal registrado
  const preceptoresDisponibles = useMemo(() => {
    const filtrados = (personal || []).filter((p) =>
      p.roles?.some((r) => r.id === "preceptor")
    );
    // Si no hay suficientes registrados con rol preceptor, agregamos catálogo institucional
    const fallback = [
      { id: "usr-preceptor-1", nombreCompleto: "Preceptor 1° A", email: "preceptor@prece.local" },
      { id: "usr-preceptor-2", nombreCompleto: "Carlos Ramos", email: "cramos@prece.local" },
      { id: "usr-preceptor-3", nombreCompleto: "Lucía Giménez", email: "lgimenez@prece.local" },
      { id: "usr-preceptor-4", nombreCompleto: "Mariano Benítez", email: "mbenitez@prece.local" },
      { id: "usr-preceptor-5", nombreCompleto: "Valeria Morales", email: "vmorales@prece.local" }
    ];

    const combinados = [...filtrados];
    for (const f of fallback) {
      if (!combinados.some((c) => sonMismoDocente(c, f))) {
        combinados.push(f);
      }
    }

    if (division?.preceptor) {
      const match = combinados.find((c) => sonMismoDocente(c, division.preceptor));
      if (match) {
        if (division.preceptor.nombre && (!match.nombreCompleto || match.nombreCompleto === "Preceptor 1° A")) {
          match.nombreCompleto = division.preceptor.nombre;
        }
        if (division.preceptor.id) {
          match.id = division.preceptor.id;
        }
      } else {
        combinados.unshift({
          id: division.preceptor.id || "usr-prec-actual",
          nombreCompleto: division.preceptor.nombre || "Preceptor Asignado",
          email: division.preceptor.email || "preceptor@prece.local"
        });
      }
    }

    return combinados;
  }, [personal, division]);

  useEffect(() => {
    if (division) {
      let pId = "";
      if (division.preceptor) {
        pId = division.preceptor.id || "";
        setPreceptorSeleccionado(pId);
        setNombrePersonalizado(division.preceptor.nombre || "");
        setEmailPersonalizado(division.preceptor.email || "");
      } else {
        pId = preceptoresDisponibles[0]?.id || "usr-preceptor-1";
        setPreceptorSeleccionado(pId);
        setNombrePersonalizado("");
        setEmailPersonalizado("");
      }

      // Marcar seleccionados todos los cursos que le pertenecen al preceptor
      const prec = division.preceptor || preceptoresDisponibles.find((p) => p.id === pId);
      const cursosDelPreceptor = getDivisionesPreceptor(prec, todasLasDivisiones).map((d) => d.id);
      if (division.id && division.id !== "div-nuevo") {
        setCursosSeleccionados(Array.from(new Set([division.id, ...cursosDelPreceptor])));
        setMostrarTodasLasDivisiones(true);
      } else {
        setCursosSeleccionados(cursosDelPreceptor);
        setMostrarTodasLasDivisiones(true);
      }
      setVerMasModal(false);
    }
  }, [division, preceptoresDisponibles, todasLasDivisiones]);

  const handleCambiarPreceptor = (val) => {
    setPreceptorSeleccionado(val);
    if (val === "otro") {
      setCursosSeleccionados(division.id && division.id !== "div-nuevo" ? [division.id] : []);
    } else {
      const prec = preceptoresDisponibles.find((p) => p.id === val);
      const cursosDelNuevo = getDivisionesPreceptor(prec, todasLasDivisiones).map((d) => d.id);
      const iniciales = division.id && division.id !== "div-nuevo"
        ? Array.from(new Set([division.id, ...cursosDelNuevo]))
        : cursosDelNuevo;
      setCursosSeleccionados(iniciales);
    }
  };

  const opcionesPreceptores = useMemo(() => {
    const list = preceptoresDisponibles.map((p) => ({
      value: p.id,
      label: `${p.nombreCompleto} (${p.email})`
    }));
    list.push({
      value: "otro",
      label: "➕ Asignar otro preceptor / nuevo nombre..."
    });
    return list;
  }, [preceptoresDisponibles]);

  const divisionesAsignadasActuales = useMemo(() => {
    if (!division?.preceptor) return [];
    return getDivisionesPreceptor(division.preceptor, todasLasDivisiones);
  }, [division, todasLasDivisiones]);

  const cursosDisponibles = useMemo(() => {
    if (!todasLasDivisiones || todasLasDivisiones.length === 0) {
      return division ? [division] : [];
    }
    if (mostrarTodasLasDivisiones) {
      const asignadosIds = new Set(divisionesAsignadasActuales.map((d) => d.id));
      if (division?.id && division.id !== "div-nuevo") asignadosIds.add(division.id);
      return [...todasLasDivisiones].sort((a, b) => {
        const aAsignado = asignadosIds.has(a.id) ? 1 : 0;
        const bAsignado = asignadosIds.has(b.id) ? 1 : 0;
        if (aAsignado !== bAsignado) return bAsignado - aAsignado;
        if (a.anio !== b.anio) return a.anio - b.anio;
        return String(a.numDivision || "").localeCompare(String(b.numDivision || ""));
      });
    }
    const delPreceptor = divisionesAsignadasActuales;
    if (delPreceptor.length === 0) return todasLasDivisiones;
    const combinadas = [...delPreceptor];
    if (division.id && division.id !== "div-nuevo" && !combinadas.some((d) => d.id === division.id)) {
      combinadas.push(division);
    }
    return combinadas;
  }, [mostrarTodasLasDivisiones, divisionesAsignadasActuales, todasLasDivisiones, division]);

  if (!abierto || !division) return null;

  const toggleCurso = (id) => {
    setCursosSeleccionados((prev) => {
      if (prev.includes(id)) {
        return prev.filter((cId) => cId !== id);
      }
      return [...prev, id];
    });
  };

  const seleccionarTodosCursos = () => {
    const todosIds = cursosDisponibles.map((c) => c.id);
    setCursosSeleccionados(todosIds);
  };

  const desmarcarTodosCursos = () => {
    setCursosSeleccionados([]);
  };

  const seleccionarSoloEsteCurso = () => {
    if (division.id && division.id !== "div-nuevo") {
      setCursosSeleccionados([division.id]);
    } else {
      setCursosSeleccionados([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const idsIniciales = divisionesAsignadasActuales.map((d) => d.id);
      const idsSeleccionados = cursosSeleccionados.filter((id) => id !== "div-nuevo");
      const idsAQuitar = idsIniciales.filter((id) => !idsSeleccionados.includes(id));

      if (idsSeleccionados.length > 0) {
        let datosPreceptor = null;
        if (preceptorSeleccionado === "otro") {
          if (!nombrePersonalizado.trim()) return;
          datosPreceptor = {
            id: `prec-${Date.now()}`,
            nombreCompleto: nombrePersonalizado.trim(),
            email: emailPersonalizado.trim() || "preceptor@prece.local"
          };
        } else {
          const encontrado = preceptoresDisponibles.find((p) => p.id === preceptorSeleccionado);
          datosPreceptor = encontrado
            ? { id: encontrado.id, nombreCompleto: encontrado.nombreCompleto, email: encontrado.email }
            : { id: "usr-preceptor-1", nombreCompleto: "Preceptor Designado", email: "preceptor@prece.local" };
        }

        await alGuardar(idsSeleccionados, datosPreceptor, idsAQuitar);
      } else {
        await alGuardar([], null, idsAQuitar.length > 0 ? idsAQuitar : (division.id !== "div-nuevo" ? [division.id] : []));
      }
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
        { className: "director-modal-container director-modal-container--wide", role: "dialog", "aria-modal": "true" },
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
              division.id === "div-nuevo"
                ? `Asignar Cursos a ${division.preceptor?.nombre || "Preceptor"}`
                : (division.preceptor ? "Reasignar Preceptor a Curso(s)" : "Asignar Preceptor a Curso(s)")
            ),
            h(
              "p",
              { className: "director-modal-subtitle" },
              division.id === "div-nuevo"
                ? (division.preceptor?.email || "Seleccione los cursos y divisiones a asignar")
                : `${formatoCursoDivision(division)} (Turno ${division.turno} · ${division.orientacion || "Ciclo Básico"})`
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

          // Grid de 2 columnas: izquierda opciones del preceptor, derecha cursos a asignar
          h(
            "div",
            { className: "asignaciones-modal-grid" },

            // COLUMNA IZQUIERDA
            h(
              "div",
              { className: "asignaciones-modal-col-left" },

              // Info preceptor actual
              division.preceptor
                ? h(
                    "div",
                    { className: "asignaciones-current-info" },
                    h("span", { className: "asignaciones-current-label" }, "Preceptor asignado actualmente:"),
                    h(
                      "div",
                      { className: "asignaciones-current-val" },
                      h("strong", null, division.preceptor.nombre || division.preceptor.nombreCompleto || "Preceptor"),
                      h("span", null, division.preceptor.email ? ` (${division.preceptor.email})` : "")
                    ),
                    divisionesAsignadasActuales.length > 0
                      ? h(
                          "div",
                          { className: "asignaciones-current-divisions-wrap" },
                          h("span", { className: "asignaciones-current-divisions-label" }, "Cursos asignados actualmente:"),
                          h(
                            "div",
                            { className: "asignaciones-division-tag-wrap" },
                            (verMasModal ? divisionesAsignadasActuales : divisionesAsignadasActuales.slice(0, 2)).map((d) =>
                              h("span", { key: d.id, className: "asignaciones-div-badge" }, formatoCursoDivision(d))
                            ),
                            divisionesAsignadasActuales.length > 2
                              ? h(
                                  "button",
                                  {
                                    type: "button",
                                    className: "asignaciones-ver-mas-btn",
                                    onClick: () => setVerMasModal(!verMasModal)
                                  },
                                  verMasModal ? "Ver menos" : `Ver más (+${divisionesAsignadasActuales.length - 2})`
                                )
                              : null
                          )
                        )
                      : null
                  )
                : null,

              // Selección de preceptor
              h(
                "div",
                { className: "form-group" },
                h("label", { className: "form-label" }, "Seleccionar Preceptor del Personal:"),
                h(CustomSelect, {
                  id: "select-preceptor-modal",
                  value: preceptorSeleccionado,
                  options: opcionesPreceptores,
                  onChange: handleCambiarPreceptor,
                  placeholder: "Seleccione un preceptor...",
                  isSearchable: true,
                  className: "w-full"
                })
              ),

              // Campos manuales si seleccionó "otro"
              preceptorSeleccionado === "otro"
                ? h(
                    "div",
                    { className: "asignaciones-custom-fields" },
                    h(
                      "div",
                      { className: "form-group" },
                      h("label", { className: "form-label" }, "Nombre y Apellido del Preceptor:"),
                      h("input", {
                        type: "text",
                        className: "search-input",
                        placeholder: "Ej. Martín Rodríguez",
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

            // COLUMNA DERECHA: Selección de Cursos
            h(
              "div",
              { className: "asignaciones-modal-col-right" },
              h(
                "div",
                { className: "asignaciones-multicursos-header" },
                h("span", null, `Cursos a asignar (${cursosSeleccionados.length} seleccionado${cursosSeleccionados.length > 1 ? "s" : ""}):`),
                h(
                  "div",
                  { style: { display: "flex", alignItems: "center", gap: "6px" } },
                  h(
                    "button",
                    {
                      type: "button",
                      className: "asignaciones-footer-tool-btn",
                      onClick: seleccionarTodosCursos,
                      title: "Marcar todas las divisiones disponibles"
                    },
                    "Marcar todas"
                  ),
                  h(
                    "button",
                    {
                      type: "button",
                      className: "asignaciones-footer-tool-btn",
                      onClick: desmarcarTodosCursos,
                      title: "Desmarcar todas las divisiones"
                    },
                    "Desmarcar todas"
                  ),
                  h(
                    "button",
                    {
                      type: "button",
                      className: "asignaciones-footer-tool-btn",
                      onClick: seleccionarSoloEsteCurso,
                      title: "Seleccionar solo la división actual"
                    },
                    "Solo este curso"
                  )
                )
              ),
              h(
                "div",
                { className: "asignaciones-multicursos-box asignaciones-multicursos-box--full" },
                h(
                  "div",
                  { className: "asignaciones-multicursos-list" },
                  cursosDisponibles.map((c) => {
                    const estaSeleccionado = cursosSeleccionados.includes(c.id);

                    return h(
                      "div",
                      {
                        key: c.id,
                        className: `asignaciones-materia-card ${estaSeleccionado ? "asignaciones-materia-card--selected" : ""}`,
                        style: { cursor: "pointer" },
                        onClick: () => toggleCurso(c.id)
                      },
                      h(
                        "div",
                        { className: "asignaciones-materia-card-header" },
                        h("input", {
                          type: "checkbox",
                          className: "asignaciones-multicursos-checkbox",
                          checked: estaSeleccionado,
                          onClick: (e) => e.stopPropagation(),
                          onChange: () => toggleCurso(c.id)
                        }),
                        h(
                          "div",
                          { className: "asignaciones-multicursos-info" },
                          h("span", { className: "asignaciones-multicursos-curso" }, formatoCursoDivision(c)),
                          h("span", { className: "asignaciones-multicursos-turno" }, `Turno ${c.turno}`),
                          c.orientacion
                            ? h("span", { style: { fontSize: "11.5px", color: "#334155", fontWeight: "600" } }, `(${c.orientacion})`)
                            : null,
                          h(
                            "span",
                            {
                              className: `asignaciones-multicursos-estado ${c.preceptor ? "asignaciones-multicursos-estado--assigned" : "asignaciones-multicursos-estado--unassigned"}`
                            },
                            c.preceptor ? `● ${c.preceptor.nombre || c.preceptor.nombreCompleto || "Asignado"}` : "○ Sin asignar"
                          )
                        )
                      )
                    );
                  })
                )
              )
            )
          ),

          // Botones de acción (Footer)
          h(
            "div",
            { className: "asignaciones-modal-footer" },
            // Botones Cancelar y Confirmar del lado izquierdo
            h(
              "div",
              { style: { display: "flex", alignItems: "center", gap: "10px" } },
              h(
                "button",
                { type: "button", className: "btn-director-secondary", onClick: alCerrar, disabled: guardando },
                "Cancelar"
              ),
              h(
                "button",
                { type: "submit", className: "btn-director-primary", disabled: guardando },
                guardando ? "Guardando..." : "Confirmar"
              )
            ),
            // Toggle para ver solo los cursos asignados o todas las divisiones de la institución
            todasLasDivisiones.length > 0
              ? h(
                  "div",
                  { style: { marginLeft: "auto" } },
                  h(
                    "button",
                    {
                      type: "button",
                      className: `asignaciones-footer-tool-btn ${mostrarTodasLasDivisiones ? "asignaciones-footer-tool-btn--accent" : ""}`,
                      onClick: () => setMostrarTodasLasDivisiones(!mostrarTodasLasDivisiones),
                      title: mostrarTodasLasDivisiones ? "Ver solo cursos asignados a este preceptor" : "Ver todos los cursos disponibles"
                    },
                    h(IconSchool, { width: "13", height: "13" }),
                    h("span", null, mostrarTodasLasDivisiones ? `Solo cursos asignados (${cursosSeleccionados.length})` : `Ver todas las divisiones (${todasLasDivisiones.length})`)
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

/**
 * Modal para asignar o reasignar un Profesor a una o varias Cátedras/Cursos
 */
function ModalAsignarProfesor({ abierto, catedra, personal, alCerrar, alGuardar, todasLasCatedras = [] }) {
  const [profesorSeleccionado, setProfesorSeleccionado] = useState("");
  const [nombrePersonalizado, setNombrePersonalizado] = useState("");
  const [emailPersonalizado, setEmailPersonalizado] = useState("");
  const [configMaterias, setConfigMaterias] = useState({});
  const [cursosSeleccionados, setCursosSeleccionados] = useState([]);
  const [mostrarTodasLasMaterias, setMostrarTodasLasMaterias] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [verMasModal, setVerMasModal] = useState(false);
  const [desplegadosMaterias, setDesplegadosMaterias] = useState({});

  // Helper para obtener la configuración inicial de una cátedra
  const obtenerConfigInicialCatedra = (c) => {
    if (!c) return { situacion: "titular", modulos: 4 };
    let mod = 4;
    if (c.modulos !== undefined && c.modulos !== null) {
      mod = parseInt(c.modulos, 10) || 4;
    } else if (c.horasSemanales !== undefined && c.horasSemanales !== null) {
      mod = parseInt(c.horasSemanales, 10) || 4;
    } else if (c.cargaHoraria) {
      const parsed = parseInt(String(c.cargaHoraria).replace(/[^\d]/g, ""), 10);
      if (!isNaN(parsed) && parsed > 0) mod = parsed;
    }
    mod = Math.min(10, Math.max(1, mod));
    return {
      situacion: c.situacion || "titular",
      modulos: mod
    };
  };

  const profesoresDisponibles = useMemo(() => {
    const filtrados = (personal || []).filter((p) =>
      p.roles?.some((r) => r.id === "docente" || r.id === "profesor")
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
      if (!combinados.some((c) => sonMismoDocente(c, f))) {
        combinados.push(f);
      }
    }

    if (catedra?.profesor) {
      const match = combinados.find((c) => sonMismoDocente(c, catedra.profesor));
      if (match) {
        if (catedra.profesor.nombre && (!match.nombreCompleto || match.nombreCompleto === "Docente Matemática")) {
          match.nombreCompleto = catedra.profesor.nombre;
        }
        if (catedra.profesor.id) {
          match.id = catedra.profesor.id;
        }
      } else {
        combinados.unshift({
          id: catedra.profesor.id || "usr-doc-actual",
          nombreCompleto: catedra.profesor.nombre || "Docente Asignado",
          email: catedra.profesor.email || "docente@prece.local"
        });
      }
    }

    return combinados;
  }, [personal, catedra]);

  useEffect(() => {
    if (catedra) {
      let docId = "";
      if (catedra.profesor) {
        docId = catedra.profesor.id || "";
        setProfesorSeleccionado(docId);
        setNombrePersonalizado(catedra.profesor.nombre || "");
        setEmailPersonalizado(catedra.profesor.email || "");
      } else {
        docId = profesoresDisponibles[0]?.id || "usr-doc-1";
        setProfesorSeleccionado(docId);
        setNombrePersonalizado("");
        setEmailPersonalizado("");
      }

      // Inicializar configuraciones individuales de todas las cátedras disponibles
      const mapConfig = {};
      (todasLasCatedras || []).forEach((c) => {
        mapConfig[c.id] = obtenerConfigInicialCatedra(c);
      });
      if (catedra.id && catedra.id !== "cat-nuevo") {
        mapConfig[catedra.id] = obtenerConfigInicialCatedra(catedra);
      }
      setConfigMaterias(mapConfig);

      // Cursos seleccionados: por defecto TODOS los cursos a los que está asignado el profesor
      const prof = catedra.profesor || profesoresDisponibles.find((p) => p.id === docId);
      const cursosDelProfesor = getCatedrasProfesor(
        prof,
        todasLasCatedras
      ).map((c) => c.id);
      if (catedra.id && catedra.id !== "cat-nuevo") {
        setCursosSeleccionados(Array.from(new Set([catedra.id, ...cursosDelProfesor])));
        setMostrarTodasLasMaterias(false);
      } else {
        setCursosSeleccionados(cursosDelProfesor);
        setMostrarTodasLasMaterias(true);
      }

      // Desplegados: La cátedra que abrió el modal se despliega para edición rápida.
      // Los cursos que ya están asignados inician contraídos con su flecha para desplegarlos a demanda.
      const inicialDesplegados = {};
      if (catedra.id && catedra.id !== "cat-nuevo") {
        inicialDesplegados[catedra.id] = true;
      } else if (cursosDelProfesor.length === 1) {
        inicialDesplegados[cursosDelProfesor[0]] = true;
      }
      setDesplegadosMaterias(inicialDesplegados);
      setVerMasModal(false);
    }
  }, [catedra, profesoresDisponibles, todasLasCatedras]);

  const handleCambiarProfesor = (val) => {
    setProfesorSeleccionado(val);
    if (val === "otro") {
      setCursosSeleccionados(catedra.id && catedra.id !== "cat-nuevo" ? [catedra.id] : []);
    } else {
      const prof = profesoresDisponibles.find((p) => p.id === val);
      const cursosDelNuevo = getCatedrasProfesor(
        prof,
        todasLasCatedras
      ).map((c) => c.id);
      const iniciales = catedra.id && catedra.id !== "cat-nuevo"
        ? Array.from(new Set([catedra.id, ...cursosDelNuevo]))
        : cursosDelNuevo;
      setCursosSeleccionados(iniciales);
    }
  };

  // Opciones para el CustomSelect de profesores
  const opcionesProfesores = useMemo(() => {
    const list = profesoresDisponibles.map((p) => ({
      value: p.id,
      label: `${p.nombreCompleto} (${p.email})`
    }));
    list.push({
      value: "otro",
      label: "➕ Asignar otro docente / nuevo nombre..."
    });
    return list;
  }, [profesoresDisponibles]);

  // Lista de cursos disponibles para asignación múltiple
  const cursosDisponibles = useMemo(() => {
    if (!todasLasCatedras || todasLasCatedras.length === 0) {
      return catedra ? [catedra] : [];
    }
    if (mostrarTodasLasMaterias) {
      return todasLasCatedras;
    }
    const marcados = todasLasCatedras.filter((c) => cursosSeleccionados.includes(c.id));
    return marcados.length > 0 ? marcados : (catedra ? [catedra] : []);
  }, [todasLasCatedras, catedra, mostrarTodasLasMaterias, cursosSeleccionados]);

  // Funciones de gestión individual de cada materia
  const obtenerConfig = (cursoId) => {
    if (configMaterias[cursoId]) return configMaterias[cursoId];
    const cat = (todasLasCatedras || []).find((c) => c.id === cursoId) || catedra;
    return obtenerConfigInicialCatedra(cat);
  };

  const actualizarConfigMateria = (cursoId, campo, valor) => {
    setConfigMaterias((prev) => {
      const actual = prev[cursoId] || obtenerConfig(cursoId);
      return {
        ...prev,
        [cursoId]: {
          ...actual,
          [campo]: valor
        }
      };
    });
  };

  const modificarModulosMateria = (cursoId, delta) => {
    setConfigMaterias((prev) => {
      const actual = prev[cursoId] || obtenerConfig(cursoId);
      const actualMod = parseInt(actual.modulos, 10) || 4;
      const nuevo = Math.min(10, Math.max(1, actualMod + delta));
      return {
        ...prev,
        [cursoId]: {
          ...actual,
          modulos: nuevo
        }
      };
    });
  };

  const handleInputModulos = (cursoId, valorStr) => {
    if (valorStr === "") {
      actualizarConfigMateria(cursoId, "modulos", "");
      return;
    }
    const num = parseInt(valorStr, 10);
    if (!isNaN(num)) {
      const clamped = Math.min(10, Math.max(1, num));
      actualizarConfigMateria(cursoId, "modulos", clamped);
    }
  };

  const handleBlurModulos = (cursoId) => {
    setConfigMaterias((prev) => {
      const actual = prev[cursoId] || { situacion: "titular", modulos: 4 };
      let num = parseInt(actual.modulos, 10);
      if (isNaN(num) || num < 1) num = 1;
      if (num > 10) num = 10;
      return {
        ...prev,
        [cursoId]: {
          ...actual,
          modulos: num
        }
      };
    });
  };

  const totalModulosSeleccionados = useMemo(() => {
    return cursosSeleccionados.reduce((total, id) => {
      const cfg = configMaterias[id] || obtenerConfig(id);
      const mod = parseInt(cfg.modulos, 10) || 4;
      return total + mod;
    }, 0);
  }, [cursosSeleccionados, configMaterias, todasLasCatedras, catedra]);

  const aplicarSituacionATodas = (sit) => {
    setConfigMaterias((prev) => {
      const nuevo = { ...prev };
      cursosSeleccionados.forEach((id) => {
        const actual = nuevo[id] || obtenerConfig(id);
        nuevo[id] = { ...actual, situacion: sit };
      });
      return nuevo;
    });
  };

  const aplicarModulosATodas = (mod) => {
    setConfigMaterias((prev) => {
      const nuevo = { ...prev };
      cursosSeleccionados.forEach((id) => {
        const actual = nuevo[id] || obtenerConfig(id);
        nuevo[id] = { ...actual, modulos: mod };
      });
      return nuevo;
    });
  };

  const toggleDesplegado = (id) => {
    setDesplegadosMaterias((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleCurso = (id) => {
    setCursosSeleccionados((prev) => {
      if (prev.includes(id)) {
        return prev.filter((cId) => cId !== id);
      }
      // Al marcar una materia la desplegamos para que pueda configurar situación y módulos
      setDesplegadosMaterias((dPrev) => ({ ...dPrev, [id]: true }));
      return [...prev, id];
    });
  };

  const seleccionarTodosCursos = () => {
    const todosIds = cursosDisponibles.map((c) => c.id);
    setCursosSeleccionados(todosIds);
  };

  const desmarcarTodosCursos = () => {
    setCursosSeleccionados([]);
  };

  const seleccionarSoloEsteCurso = () => {
    if (catedra.id && catedra.id !== "cat-nuevo") {
      setCursosSeleccionados([catedra.id]);
      setDesplegadosMaterias({ [catedra.id]: true });
    } else {
      setCursosSeleccionados([]);
    }
  };

  const divisionesAsignadasActuales = useMemo(() => {
    if (!catedra?.profesor) return [];
    return getCatedrasProfesor(catedra.profesor, todasLasCatedras);
  }, [catedra, todasLasCatedras]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      // 1. Cursos que el profesor tenía asignados antes de esta edición
      const idsIniciales = divisionesAsignadasActuales.map((c) => c.id);

      // 2. Cursos que quedan seleccionados
      const idsSeleccionados = cursosSeleccionados.filter((id) => id !== "cat-nuevo");

      // 3. Cursos que fueron desmarcados (deben quitarse)
      const idsAQuitar = idsIniciales.filter((id) => !idsSeleccionados.includes(id));

      if (idsAQuitar.length > 0) {
        await DirectorService.quitarAsignacionProfesor(idsAQuitar);
      }

      if (idsSeleccionados.length > 0) {
        let datosProfesor = null;
        if (profesorSeleccionado === "otro") {
          if (!nombrePersonalizado.trim()) return;
          datosProfesor = {
            id: `doc-${Date.now()}`,
            nombreCompleto: nombrePersonalizado.trim(),
            email: emailPersonalizado.trim() || "docente@prece.local"
          };
        } else {
          const encontrado = profesoresDisponibles.find((p) => p.id === profesorSeleccionado);
          datosProfesor = encontrado
            ? {
                id: encontrado.id,
                nombreCompleto: encontrado.nombreCompleto,
                email: encontrado.email
              }
            : {
                id: "usr-doc-1",
                nombreCompleto: "Docente Asignado",
                email: "docente@prece.local"
              };
        }

        const porCatedra = {};
        idsSeleccionados.forEach((id) => {
          const cfg = configMaterias[id] || obtenerConfig(id);
          const mod = Math.min(10, Math.max(1, parseInt(cfg.modulos, 10) || 4));
          porCatedra[id] = {
            situacion: cfg.situacion || "titular",
            modulos: mod,
            horasSemanales: mod,
            cargaHoraria: `${mod} mód. semanales`
          };
        });

        const cfgPrincipal = porCatedra[catedra.id] || Object.values(porCatedra)[0] || {
          situacion: "titular",
          modulos: 4,
          horasSemanales: 4,
          cargaHoraria: "4 mód. semanales"
        };

        datosProfesor.situacion = cfgPrincipal.situacion;
        datosProfesor.modulos = cfgPrincipal.modulos;
        datosProfesor.horasSemanales = cfgPrincipal.modulos;
        datosProfesor.cargaHoraria = cfgPrincipal.cargaHoraria;
        datosProfesor.porCatedra = porCatedra;

        await alGuardar(idsSeleccionados, datosProfesor, idsAQuitar);
      } else {
        // Se desmarcaron todos los cursos del docente
        await alGuardar([], null, idsAQuitar);
      }

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
        { className: "director-modal-container director-modal-container--wide", role: "dialog", "aria-modal": "true" },
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
              catedra.id === "cat-nuevo"
                ? `Asignar Materias a ${catedra.profesor?.nombre || "Docente"}`
                : (catedra.profesor ? "Reasignar Docente a Curso(s)" : "Asignar Docente a Curso(s)")
            ),
            h(
              "p",
              { className: "director-modal-subtitle" },
              catedra.id === "cat-nuevo"
                ? "Seleccione las materias y configure los módulos a asignar"
                : `${catedra.materia} · ${formatoCursoDivision(catedra)} (${catedra.turno})`
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

          // Grid de 2 columnas: izquierda opciones del profesor y horas, derecha cursos a asignar
          h(
            "div",
            { className: "asignaciones-modal-grid" },

            // COLUMNA IZQUIERDA
            h(
              "div",
              { className: "asignaciones-modal-col-left" },

              // Profesor actual
              catedra.profesor
                ? h(
                    "div",
                    { className: "asignaciones-current-info" },
                    h("span", { className: "asignaciones-current-label" }, "Docente asignado actualmente:"),
                    h(
                      "div",
                      { className: "asignaciones-current-val" },
                      h("strong", null, catedra.profesor.nombre),
                      h("span", null, ` (${catedra.profesor.email})`)
                    ),
                    divisionesAsignadasActuales.length > 0
                      ? h(
                          "div",
                          { className: "asignaciones-current-divisions-wrap" },
                          h(
                            "span",
                            { className: "asignaciones-current-divisions-label" },
                            "Cursos asignados actualmente al docente:"
                          ),
                          h(
                            "div",
                            { className: "asignaciones-division-tag-wrap" },
                            (verMasModal ? divisionesAsignadasActuales : divisionesAsignadasActuales.slice(0, 2)).map((c) =>
                              h(
                                "span",
                                {
                                  key: c.id,
                                  className: "asignaciones-div-badge",
                                  title: `${formatoCursoDivision(c)} (${c.materia}) · Turno ${c.turno} · ${c.situacion || "Titular"}`
                                },
                                h("span", null, `${formatoCursoDivision(c)} (${c.materia})`),
                                renderBadgeSituacion(c.situacion)
                              )
                            ),
                            divisionesAsignadasActuales.length > 2
                              ? h(
                                  "button",
                                  {
                                    type: "button",
                                    className: "asignaciones-ver-mas-btn",
                                    onClick: () => setVerMasModal(!verMasModal)
                                  },
                                  verMasModal ? "Ver menos" : `Ver más (+${divisionesAsignadasActuales.length - 2})`
                                )
                              : null
                          )
                        )
                      : null
                  )
                : null,

              // Selector de docente
              h(
                "div",
                { className: "form-group" },
                h("label", { className: "form-label" }, "Docente:"),
                h(CustomSelect, {
                  id: "select-profesor-modal",
                  value: profesorSeleccionado,
                  options: opcionesProfesores,
                  onChange: handleCambiarProfesor,
                  placeholder: "Seleccione un docente...",
                  isSearchable: true,
                  className: "w-full"
                })
              ),

              // Campos personalizados si eligió "otro"
              profesorSeleccionado === "otro"
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

              // Resumen de Asignación Docente
              h(
                "div",
                { className: "asignaciones-resumen-box" },
                h("span", { className: "asignaciones-resumen-header" }, "Resumen de Carga Docente"),
                h(
                  "div",
                  { className: "asignaciones-resumen-stats" },
                  h(
                    "div",
                    { className: "asignaciones-resumen-stat-card" },
                    h("span", { className: "asignaciones-resumen-stat-num" }, cursosSeleccionados.length),
                    h(
                      "span",
                      { className: "asignaciones-resumen-stat-lbl" },
                      cursosSeleccionados.length === 1 ? "Materia a asignar" : "Materias a asignar"
                    )
                  ),
                  h(
                    "div",
                    { className: "asignaciones-resumen-stat-card" },
                    h(
                      "span",
                      { className: "asignaciones-resumen-stat-num asignaciones-resumen-stat-num--accent" },
                      totalModulosSeleccionados
                    ),
                    h("span", { className: "asignaciones-resumen-stat-lbl" }, "Módulos totales/sem")
                  )
                ),
                cursosSeleccionados.length > 1
                  ? h(
                      "div",
                      { className: "asignaciones-resumen-bulk" },
                      h("span", { className: "asignaciones-resumen-bulk-label" }, "Aplicar a todas las seleccionadas:"),
                      h(
                        "div",
                        { className: "asignaciones-resumen-bulk-btns" },
                        ["titular", "provisorio", "suplente"].map((s) =>
                          h(
                            "button",
                            {
                              key: s,
                              type: "button",
                              className: "asignaciones-resumen-bulk-btn",
                              onClick: () => aplicarSituacionATodas(s),
                              title: `Asignar ${s} a todas las materias marcadas`
                            },
                            s === "titular" ? "Titular" : s === "provisorio" ? "Provisorio" : "Suplente"
                          )
                        )
                      ),
                      h(
                        "div",
                        { className: "asignaciones-resumen-bulk-btns" },
                        [1, 2, 3, 4, 5, 6, 7, 8].map((m) =>
                          h(
                            "button",
                            {
                              key: m,
                              type: "button",
                              className: "asignaciones-resumen-bulk-btn",
                              onClick: () => aplicarModulosATodas(m),
                              title: `Asignar ${m} módulos a todas las materias marcadas`
                            },
                            `${m} mód`
                          )
                        )
                      )
                    )
                  : null
              )
            ),

            // COLUMNA DERECHA: Selección de Cursos
            h(
              "div",
              { className: "asignaciones-modal-col-right" },
              h(
                "div",
                { className: "asignaciones-multicursos-header" },
                h("span", null, `Cursos a asignar (${cursosSeleccionados.length} seleccionado${cursosSeleccionados.length > 1 ? "s" : ""}):`),
                h(
                  "div",
                  { style: { display: "flex", alignItems: "center", gap: "6px" } },
                  h(
                    "button",
                    {
                      type: "button",
                      className: "asignaciones-footer-tool-btn",
                      onClick: seleccionarTodosCursos,
                      title: "Marcar todas las divisiones disponibles"
                    },
                    "Marcar todas"
                  ),
                  h(
                    "button",
                    {
                      type: "button",
                      className: "asignaciones-footer-tool-btn",
                      onClick: desmarcarTodosCursos,
                      title: "Desmarcar todos los cursos"
                    },
                    "Desmarcar todas"
                  ),
                  h(
                    "button",
                    {
                      type: "button",
                      className: "asignaciones-footer-tool-btn",
                      onClick: seleccionarSoloEsteCurso,
                      title: "Seleccionar solo la división actual"
                    },
                    "Solo este curso"
                  )
                )
              ),
              h(
                "div",
                { className: "asignaciones-multicursos-box asignaciones-multicursos-box--full" },
                h(
                  "div",
                  { className: "asignaciones-multicursos-list" },
                  cursosDisponibles.map((c) => {
                    const estaSeleccionado = cursosSeleccionados.includes(c.id);
                    const estaDesplegado = Boolean(desplegadosMaterias[c.id]);
                    const cfg = configMaterias[c.id] || obtenerConfig(c.id);
                    const modulosActual = parseInt(cfg.modulos, 10) || 1;

                    return h(
                      "div",
                      {
                        key: c.id,
                        className: `asignaciones-materia-card ${estaSeleccionado ? "asignaciones-materia-card--selected" : ""}`
                      },
                      // Cabecera clickeable de la materia (activa/desactiva selección o despliega)
                      h(
                        "div",
                        {
                          className: "asignaciones-materia-card-header",
                          onClick: () => {
                            if (estaSeleccionado) {
                              toggleDesplegado(c.id);
                            } else {
                              toggleCurso(c.id);
                            }
                          }
                        },
                        h("input", {
                          type: "checkbox",
                          className: "asignaciones-multicursos-checkbox",
                          checked: estaSeleccionado,
                          onClick: (e) => e.stopPropagation(),
                          onChange: () => toggleCurso(c.id)
                        }),
                        h(
                          "div",
                          { className: "asignaciones-multicursos-info" },
                          h("span", { className: "asignaciones-multicursos-curso" }, formatoCursoDivision(c)),
                          h("span", { className: "asignaciones-multicursos-turno" }, c.turno),
                          h(
                            "span",
                            {
                              className: "asignaciones-multicursos-materia",
                              style: { fontSize: "12px", color: "#334155", fontWeight: "700" }
                            },
                            `(${c.materia})`
                          ),
                          // Badge de situación actual / elegida
                          renderBadgeSituacion(estaSeleccionado ? cfg.situacion : c.situacion),
                          // Badge de módulos si está seleccionado
                          estaSeleccionado
                            ? h(
                                "span",
                                { className: "asignaciones-badge-modulos-mini" },
                                `${modulosActual} mód.`
                              )
                            : null,
                          h(
                            "span",
                            {
                              className: `asignaciones-multicursos-estado ${c.profesor ? "asignaciones-multicursos-estado--assigned" : "asignaciones-multicursos-estado--unassigned"}`
                            },
                            c.profesor ? `● ${c.profesor.nombre}` : "○ Sin asignar"
                          )
                        ),
                        // Flecha para desplegar / contraer
                        h(
                          "button",
                          {
                            type: "button",
                            className: `asignaciones-materia-expand-btn ${estaDesplegado ? "asignaciones-materia-expand-btn--open" : ""}`,
                            onClick: (e) => {
                              e.stopPropagation();
                              if (!estaSeleccionado) {
                                toggleCurso(c.id);
                              } else {
                                toggleDesplegado(c.id);
                              }
                            },
                            title: estaDesplegado ? "Contraer opciones" : "Desplegar opciones de revista y módulos",
                            "aria-label": estaDesplegado ? "Contraer opciones" : "Desplegar opciones"
                          },
                          h(IconChevronDown, {
                            className: `asignaciones-chevron-icon ${estaDesplegado ? "asignaciones-chevron-icon--rotated" : ""}`,
                            width: "16",
                            height: "16"
                          })
                        )
                      ),

                      // Panel de configuración debajo de la materia (solo si está seleccionada y desplegada)
                      estaSeleccionado && estaDesplegado
                        ? h(
                            "div",
                            {
                              className: "asignaciones-materia-config-body",
                              onClick: (e) => e.stopPropagation()
                            },
                            // Situación de revista para esta materia
                            h(
                              "div",
                              { className: "asignaciones-materia-ctrl-group" },
                              h("span", { className: "asignaciones-materia-ctrl-label" }, "Situación de Revista:"),
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
                                      className: `asignaciones-situacion-card asignaciones-situacion-card--compact ${cfg.situacion === sit.id ? `asignaciones-situacion-card--active-${sit.id}` : ""}`,
                                      onClick: () => actualizarConfigMateria(c.id, "situacion", sit.id)
                                    },
                                    h("span", { className: "asignaciones-situacion-title" }, sit.label),
                                    h("span", { className: "asignaciones-situacion-desc" }, sit.desc)
                                  )
                                )
                              )
                            ),

                            // Módulos semanales para esta materia (límite 10, no 50; atajos del 1 al 8)
                            h(
                              "div",
                              { className: "asignaciones-materia-ctrl-group" },
                              h(
                                "div",
                                { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
                                h("span", { className: "asignaciones-materia-ctrl-label" }, "Módulos Semanales:"),
                                h(
                                  "span",
                                  { className: "asignaciones-materia-modulos-detail" },
                                  `${modulosActual} ${modulosActual === 1 ? "módulo semanal" : "módulos semanales"}`
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
                                    onClick: () => modificarModulosMateria(c.id, -1),
                                    disabled: modulosActual <= 1,
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
                                  value: cfg.modulos,
                                  placeholder: "1",
                                  onChange: (e) => handleInputModulos(c.id, e.target.value),
                                  onBlur: () => handleBlurModulos(c.id)
                                }),
                                h(
                                  "button",
                                  {
                                    type: "button",
                                    className: "asignaciones-stepper-btn asignaciones-stepper-btn--compact",
                                    onClick: () => modificarModulosMateria(c.id, 1),
                                    disabled: modulosActual >= 10,
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
                                        className: `asignaciones-chip-btn asignaciones-chip-btn--compact ${modulosActual === num ? "asignaciones-chip-btn--active" : ""}`,
                                        onClick: () => actualizarConfigMateria(c.id, "modulos", num),
                                        title: `${num} módulo${num > 1 ? "s" : ""} semanales`
                                      },
                                      `${num} mód`
                                    )
                                  )
                                )
                              )
                            )
                          )
                        : null
                    );
                  })
                )
              )
            )
          ),

          // Footer: Cancelar y Confirmar a la izquierda, Ver otras materias a la derecha en la misma línea
          h(
            "div",
            { className: "asignaciones-modal-footer" },
            // Botones Cancelar y Confirmar del lado izquierdo
            h(
              "div",
              { style: { display: "flex", alignItems: "center", gap: "10px" } },
              h(
                "button",
                { type: "button", className: "btn-director-secondary", onClick: alCerrar, disabled: guardando },
                "Cancelar"
              ),
              h(
                "button",
                { type: "submit", className: "btn-director-primary", disabled: guardando },
                guardando ? "Guardando..." : "Confirmar"
              )
            ),
            // Ver otras materias del lado derecho en la misma línea
            todasLasCatedras.length > cursosDisponibles.length || mostrarTodasLasMaterias
              ? h(
                  "div",
                  { style: { marginLeft: "auto" } },
                  h(
                    "button",
                    {
                      type: "button",
                      className: `asignaciones-footer-tool-btn ${mostrarTodasLasMaterias ? "asignaciones-footer-tool-btn--accent" : ""}`,
                      onClick: () => setMostrarTodasLasMaterias(!mostrarTodasLasMaterias),
                      title: mostrarTodasLasMaterias ? "Ver solo cursos asignados" : "Ver otros cursos disponibles"
                    },
                    mostrarTodasLasMaterias
                      ? "Solo cursos asignados"
                      : "Ver otros cursos..."
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

/**
 * Calcula las métricas institucionales de asignación para Preceptores y Profesores.
 */
export function calcularMetricasAsignaciones(personal = [], divisionesPreceptores = [], catedrasProfesores = []) {
  // 1. PRECEPTORES
  const listaPreceptores = [];
  const agregarPreceptor = (candidato) => {
    if (!candidato) return;
    const index = listaPreceptores.findIndex((p) => sonMismoDocente(p, candidato));
    if (index === -1) {
      listaPreceptores.push({
        id: candidato.id,
        nombre: candidato.nombreCompleto || candidato.nombre || "Preceptor",
        email: candidato.email || ""
      });
    }
  };

  (personal || [])
    .filter((p) => p.roles?.some((r) => r.id === "preceptor"))
    .forEach(agregarPreceptor);

  const fallbackPrec = [
    { id: "usr-preceptor-1", nombre: "Preceptor 1° A", email: "preceptor@prece.local" },
    { id: "usr-preceptor-2", nombre: "Carlos Ramos", email: "cramos@prece.local" },
    { id: "usr-preceptor-3", nombre: "Lucía Giménez", email: "lgimenez@prece.local" },
    { id: "usr-preceptor-4", nombre: "Mariano Benítez", email: "mbenitez@prece.local" },
    { id: "usr-preceptor-5", nombre: "Valeria Morales", email: "vmorales@prece.local" }
  ];
  fallbackPrec.forEach(agregarPreceptor);
  (divisionesPreceptores || []).forEach((d) => {
    if (d.preceptor) agregarPreceptor(d.preceptor);
  });

  let preceptoresAsignados = 0;
  let preceptoresSinAsignar = 0;
  listaPreceptores.forEach((prec) => {
    const tieneCursos = (divisionesPreceptores || []).some((d) => d.preceptor && sonMismoDocente(prec, d.preceptor));
    if (tieneCursos) {
      preceptoresAsignados += 1;
    } else {
      preceptoresSinAsignar += 1;
    }
  });

  // 2. PROFESORES
  const listaDocentes = [];
  const agregarDocente = (candidato) => {
    if (!candidato) return;
    const index = listaDocentes.findIndex((d) => sonMismoDocente(d, candidato));
    if (index === -1) {
      listaDocentes.push({
        id: candidato.id,
        nombre: candidato.nombreCompleto || candidato.nombre || "Profesor",
        email: candidato.email || ""
      });
    }
  };

  (personal || [])
    .filter((p) => p.roles?.some((r) => r.id === "docente" || r.id === "profesor"))
    .forEach(agregarDocente);

  const fallbackDoc = [
    { id: "usr-doc-1", nombre: "Docente Matemática", email: "docente@prece.local" },
    { id: "usr-doc-2", nombre: "Prof. María Villatoro", email: "mvillatoro@prece.local" },
    { id: "usr-doc-3", nombre: "Prof. Lucía Ríos", email: "lrios@prece.local" },
    { id: "usr-doc-4", nombre: "Prof. Humberto Sosa", email: "hsosa@prece.local" },
    { id: "usr-doc-5", nombre: "Prof. Esteban Gómez", email: "egomez@prece.local" },
    { id: "usr-doc-6", nombre: "Prof. Andrea Ferreyra", email: "aferreyra@prece.local" },
    { id: "usr-doc-7", nombre: "Prof. Pablo Morales", email: "pmorales@prece.local" }
  ];
  fallbackDoc.forEach(agregarDocente);
  (catedrasProfesores || []).forEach((c) => {
    if (c.profesor) agregarDocente(c.profesor);
  });

  let profesoresAsignados = 0;
  let profesoresSinAsignar = 0;
  listaDocentes.forEach((doc) => {
    const tieneCursos = (catedrasProfesores || []).some((c) => c.profesor && sonMismoDocente(doc, c.profesor));
    if (tieneCursos) {
      profesoresAsignados += 1;
    } else {
      profesoresSinAsignar += 1;
    }
  });

  // 3. COBERTURA DE DIVISIONES
  const totalDivisiones = (divisionesPreceptores && divisionesPreceptores.length > 0) ? divisionesPreceptores.length : 27;
  const divisionesCubiertas = (divisionesPreceptores || []).filter((d) => d.preceptor && d.estado !== "sin_asignar").length;
  const divisionesSinPreceptor = Math.max(0, totalDivisiones - divisionesCubiertas);

  return {
    preceptores: {
      total: listaPreceptores.length,
      asignados: preceptoresAsignados,
      sinAsignar: preceptoresSinAsignar
    },
    profesores: {
      total: listaDocentes.length,
      asignados: profesoresAsignados,
      sinAsignar: profesoresSinAsignar
    },
    cobertura: {
      totalDivisiones,
      cubiertas: divisionesCubiertas,
      sinCubrir: divisionesSinPreceptor,
      porcentaje: Math.round((divisionesCubiertas / totalDivisiones) * 100)
    }
  };
}

/**
 * Componente Principal de la Sección de Asignaciones
 */
export function AsignacionesSection({ personal = [], onMostrarToast, subpestanaInicial = "preceptores" }) {
  // Subpestaña interna: 'preceptores' | 'profesores'
  const [subPestana, setSubPestana] = useState(subpestanaInicial || "preceptores");

  useEffect(() => {
    if (subpestanaInicial) {
      setSubPestana(subpestanaInicial);
    }
  }, [subpestanaInicial]);

  // Estado de Preceptores
  const [divisionesPreceptores, setDivisionesPreceptores] = useState([]);
  const [cargandoPreceptores, setCargandoPreceptores] = useState(true);
  const [busquedaPreceptores, setBusquedaPreceptores] = useState("");
  const [filtroAnioPreceptores, setFiltroAnioPreceptores] = useState("todos");
  const [filtroTurnoPreceptores, setFiltroTurnoPreceptores] = useState("todos");
  const [filtroEstadoPreceptores, setFiltroEstadoPreceptores] = useState("todos");
  const [divisionParaAsignar, setDivisionParaAsignar] = useState(null);
  const [modoVistaPreceptores, setModoVistaPreceptores] = useState("tabla"); // "tabla" | "tarjetas"

  // Estado de Profesores
  const [catedrasProfesores, setCatedrasProfesores] = useState([]);
  const [cargandoProfesores, setCargandoProfesores] = useState(true);
  const [busquedaProfesores, setBusquedaProfesores] = useState("");
  const [filtroAnioProfesores, setFiltroAnioProfesores] = useState("todos");
  const [filtroTurnoProfesores, setFiltroTurnoProfesores] = useState("todos");
  const [filtroEstadoProfesores, setFiltroEstadoProfesores] = useState("todos");
  const [filtroMateriaProfesores, setFiltroMateriaProfesores] = useState("todas");
  const [catedraParaAsignar, setCatedraParaAsignar] = useState(null);
  const [modoVistaProfesores, setModoVistaProfesores] = useState("tabla"); // "tabla" | "tarjetas"

  // Estados de expansión de división ("Ver más") en tablas
  const [expandidasPreceptores, setExpandidasPreceptores] = useState({});
  const [expandidasProfesores, setExpandidasProfesores] = useState({});

  const toggleExpandPreceptor = (id) => {
    setExpandidasPreceptores((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandProfesor = (id) => {
    setExpandidasProfesores((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Cargar datos iniciales
  useEffect(() => {
    const cargar = async () => {
      try {
        const [precData, profData] = await Promise.all([
          DirectorService.listarAsignacionesPreceptores(),
          DirectorService.listarAsignacionesProfesores()
        ]);
        setDivisionesPreceptores(precData);
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
  const handleGuardarPreceptor = async (divisionId, preceptorData, idsAQuitar = []) => {
    try {
      let actualizada = divisionesPreceptores;
      if (idsAQuitar && idsAQuitar.length > 0) {
        actualizada = await DirectorService.quitarAsignacionPreceptor(idsAQuitar);
      }
      if (divisionId && (Array.isArray(divisionId) ? divisionId.length > 0 : Boolean(divisionId)) && preceptorData) {
        actualizada = await DirectorService.guardarAsignacionPreceptor(divisionId, preceptorData);
      }
      setDivisionesPreceptores(actualizada);
      if (onMostrarToast) {
        const cantAsignadas = Array.isArray(divisionId) ? divisionId.length : (divisionId ? 1 : 0);
        const cantQuitadas = idsAQuitar ? idsAQuitar.length : 0;
        if (cantAsignadas > 0 && cantQuitadas > 0) {
          onMostrarToast(`Asignaciones actualizadas: ${cantAsignadas} división(es) asignada(s), ${cantQuitadas} quitada(s).`);
        } else if (cantQuitadas > 0) {
          onMostrarToast(`Se quitaron ${cantQuitadas} división(es) del preceptor.`);
        } else if (cantAsignadas > 1) {
          onMostrarToast(`Preceptor asignado exitosamente a ${cantAsignadas} cursos/divisiones.`);
        } else {
          onMostrarToast("Preceptor asignado exitosamente.");
        }
      }
    } catch {
      if (onMostrarToast) onMostrarToast("Error al asignar preceptor.");
    }
  };

  const handleQuitarPreceptor = async (divisionODivisiones) => {
    try {
      const lista = Array.isArray(divisionODivisiones) ? divisionODivisiones : [divisionODivisiones];
      const ids = lista.map((d) => d.id || d);
      const actualizada = await DirectorService.quitarAsignacionPreceptor(ids);
      setDivisionesPreceptores(actualizada);
      if (onMostrarToast) {
        onMostrarToast(
          ids.length > 1
            ? `Se quitaron las asignaciones del preceptor (${ids.length} divisiones).`
            : `Se quitó la asignación de preceptor.`
        );
      }
    } catch {
      if (onMostrarToast) onMostrarToast("Error al quitar asignación.");
    }
  };

  // Handlers para Profesores
  const handleGuardarProfesor = async (catedraId, profesorData, idsAQuitar = []) => {
    try {
      let actualizada = catedrasProfesores;
      if (idsAQuitar && idsAQuitar.length > 0) {
        actualizada = await DirectorService.quitarAsignacionProfesor(idsAQuitar);
      }
      if (catedraId && (Array.isArray(catedraId) ? catedraId.length > 0 : Boolean(catedraId)) && profesorData) {
        actualizada = await DirectorService.guardarAsignacionProfesor(catedraId, profesorData);
      }
      setCatedrasProfesores(actualizada);
      if (onMostrarToast) {
        const cantAsignadas = Array.isArray(catedraId) ? catedraId.length : (catedraId ? 1 : 0);
        const cantQuitadas = idsAQuitar ? idsAQuitar.length : 0;
        if (cantAsignadas > 0 && cantQuitadas > 0) {
          onMostrarToast(`Asignaciones actualizadas: ${cantAsignadas} cátedra(s) asignada(s), ${cantQuitadas} quitada(s).`);
        } else if (cantQuitadas > 0) {
          onMostrarToast(`Se quitaron ${cantQuitadas} cátedra(s) del docente.`);
        } else if (cantAsignadas > 1) {
          onMostrarToast(`Docente asignado exitosamente a ${cantAsignadas} cursos/divisiones.`);
        } else {
          onMostrarToast("Docente asignado exitosamente.");
        }
      }
    } catch {
      if (onMostrarToast) onMostrarToast("Error al procesar asignaciones docentes.");
    }
  };

  const handleQuitarProfesor = async (catedrasOItem) => {
    try {
      const lista = Array.isArray(catedrasOItem) ? catedrasOItem : [catedrasOItem];
      const ids = lista.map((c) => c.id || c);
      const actualizada = await DirectorService.quitarAsignacionProfesor(ids);
      setCatedrasProfesores(actualizada);
      if (onMostrarToast) {
        onMostrarToast(
          ids.length > 1
            ? `Se quitaron las asignaciones docentes (${ids.length} cátedras).`
            : `Se quitó la asignación docente de la cátedra.`
        );
      }
    } catch {
      if (onMostrarToast) onMostrarToast("Error al quitar asignación.");
    }
  };

  // Catálogo completo de preceptores: registrados en personal + fallback institucional + asignados en divisiones
  const catalogoPreceptoresCompleto = useMemo(() => {
    const lista = [];

    const agregarSiNoExiste = (candidato) => {
      if (!candidato) return;
      const index = lista.findIndex((d) => sonMismoDocente(d, candidato));
      if (index === -1) {
        lista.push({
          id: candidato.id || `prec-${Date.now()}-${Math.random()}`,
          nombre: candidato.nombreCompleto || candidato.nombre || "Preceptor Designado",
          email: candidato.email || "",
          avatar: candidato.avatar || (candidato.nombreCompleto || candidato.nombre || "P").charAt(0).toUpperCase(),
          turno: candidato.turno || null
        });
      } else {
        if (!lista[index].email && candidato.email) lista[index].email = candidato.email;
        if ((!lista[index].nombre || lista[index].nombre === "Preceptor") && (candidato.nombreCompleto || candidato.nombre)) {
          lista[index].nombre = candidato.nombreCompleto || candidato.nombre;
        }
      }
    };

    // 1. Preceptores de personal
    (personal || [])
      .filter((p) => p.roles?.some((r) => r.id === "preceptor"))
      .forEach(agregarSiNoExiste);

    // 2. Fallback institucional
    const fallback = [
      { id: "usr-preceptor-1", nombre: "Preceptor 1° A", email: "preceptor@prece.local", avatar: "P" },
      { id: "usr-preceptor-2", nombre: "Carlos Ramos", email: "cramos@prece.local", avatar: "C" },
      { id: "usr-preceptor-3", nombre: "Lucía Giménez", email: "lgimenez@prece.local", avatar: "L" },
      { id: "usr-preceptor-4", nombre: "Mariano Benítez", email: "mbenitez@prece.local", avatar: "M" },
      { id: "usr-preceptor-5", nombre: "Valeria Morales", email: "vmorales@prece.local", avatar: "V" }
    ];
    fallback.forEach(agregarSiNoExiste);

    // 3. Cualquier preceptor asignado en divisiones
    divisionesPreceptores.forEach((d) => {
      if (d.preceptor) {
        agregarSiNoExiste(d.preceptor);
      }
    });

    return lista;
  }, [personal, divisionesPreceptores]);

  // Agrupar filas EXCLUSIVAMENTE por preceptor (preceptores asignados y preceptores sin asignar)
  const filasPreceptores = useMemo(() => {
    const todasFilas = catalogoPreceptoresCompleto.map((prec) => {
      const misDivisiones = divisionesPreceptores.filter(
        (div) => div.preceptor && sonMismoDocente(prec, div.preceptor)
      );

      const tieneAsignadas = misDivisiones.length > 0;
      const aniosSet = new Set();
      const turnosSet = new Set();

      misDivisiones.forEach((d) => {
        if (d.curso || d.anio) aniosSet.add(d.curso || `${d.anio}°`);
        if (d.turno) turnosSet.add(d.turno);
      });

      const aniosArray = Array.from(aniosSet);
      const turnosArray = Array.from(turnosSet).map(
        (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
      );

      return {
        id: `prec-${prec.id || prec.email}`,
        tipo: tieneAsignadas ? "asignado" : "sin_asignar",
        curso: tieneAsignadas ? (aniosArray.join(", ") || "-") : "-",
        turno: tieneAsignadas ? (turnosArray.join(", ") || "Mañana") : (prec.turno || "-"),
        divisiones: misDivisiones,
        preceptor: prec,
        estado: tieneAsignadas ? "asignado" : "sin_asignar"
      };
    });

    return todasFilas.filter((fila) => {
      if (filtroEstadoPreceptores !== "todos" && fila.estado !== filtroEstadoPreceptores) {
        return false;
      }
      if (filtroTurnoPreceptores !== "todos") {
        if (fila.estado === "sin_asignar") return false;
        const coincideTurno = fila.divisiones.some(
          (d) => d.turno?.toLowerCase() === filtroTurnoPreceptores.toLowerCase()
        );
        if (!coincideTurno) return false;
      }
      if (filtroAnioPreceptores !== "todos") {
        if (fila.estado === "sin_asignar") return false;
        const coincideAnio = fila.divisiones.some(
          (d) => String(d.anio) === filtroAnioPreceptores || String(d.curso).includes(filtroAnioPreceptores)
        );
        if (!coincideAnio) return false;
      }
      if (busquedaPreceptores.trim()) {
        const q = busquedaPreceptores.trim().toLowerCase();
        const enNombre = (fila.preceptor?.nombre || "").toLowerCase().includes(q);
        const enEmail = (fila.preceptor?.email || "").toLowerCase().includes(q);
        const enDivisiones = fila.divisiones.some((d) =>
          `${formatoCursoDivision(d)} ${d.division || ""}`.toLowerCase().includes(q) ||
          (d.orientacion || "").toLowerCase().includes(q)
        );
        if (!enNombre && !enEmail && !enDivisiones) return false;
      }
      return true;
    });
  }, [
    catalogoPreceptoresCompleto,
    divisionesPreceptores,
    filtroEstadoPreceptores,
    filtroTurnoPreceptores,
    filtroAnioPreceptores,
    busquedaPreceptores
  ]);

  // Catálogo completo de docentes: registrados en personal + fallback institucional + asignados en cátedras
  const catalogoDocentesCompleto = useMemo(() => {
    const lista = [];

    const agregarSiNoExiste = (candidato) => {
      if (!candidato) return;
      const index = lista.findIndex((d) => sonMismoDocente(d, candidato));
      if (index === -1) {
        lista.push({
          id: candidato.id || `doc-${Date.now()}-${Math.random()}`,
          nombre: candidato.nombreCompleto || candidato.nombre || "Docente Asignado",
          email: candidato.email || "",
          avatar: candidato.avatar || (candidato.nombreCompleto || candidato.nombre || "D").charAt(0).toUpperCase(),
          turno: candidato.turno || null
        });
      } else {
        if (!lista[index].email && candidato.email) lista[index].email = candidato.email;
        if ((!lista[index].nombre || lista[index].nombre === "Docente") && (candidato.nombreCompleto || candidato.nombre)) {
          lista[index].nombre = candidato.nombreCompleto || candidato.nombre;
        }
      }
    };

    // 1. Docentes de personal
    (personal || [])
      .filter((p) => p.roles?.some((r) => r.id === "docente" || r.id === "profesor"))
      .forEach(agregarSiNoExiste);

    // 2. Fallback institucional
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

    // 3. Cualquier docente asignado en cátedras
    catedrasProfesores.forEach((c) => {
      if (c.profesor) {
        agregarSiNoExiste(c.profesor);
      }
    });

    return lista;
  }, [personal, catedrasProfesores]);

  // Agrupar filas EXCLUSIVAMENTE por docente (docentes asignados y docentes sin asignar)
  // Las materias sin asignar ya no se muestran como filas sueltas
  const filasProfesores = useMemo(() => {
    // Construir la fila/tarjeta de cada docente
    const todasFilas = catalogoDocentesCompleto.map((doc) => {
      const misCatedras = catedrasProfesores.filter(
        (cat) => cat.profesor && sonMismoDocente(doc, cat.profesor)
      );

      const tieneAsignadas = misCatedras.length > 0;
      const aniosSet = new Set();
      const turnosSet = new Set();
      let totalMod = 0;

      misCatedras.forEach((c) => {
        if (c.curso || c.anio) aniosSet.add(c.curso || `${c.anio}°`);
        if (c.turno) turnosSet.add(c.turno);
        totalMod += (c.modulos || c.horasSemanales || 4);
      });

      const aniosArray = Array.from(aniosSet);
      const turnosArray = Array.from(turnosSet).map(
        (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
      );

      return {
        id: `doc-${doc.id || doc.email}`,
        tipo: tieneAsignadas ? "asignado" : "sin_asignar",
        curso: tieneAsignadas ? (aniosArray.join(", ") || "-") : "-",
        turno: tieneAsignadas ? (turnosArray.join(", ") || "Mañana") : (doc.turno || "-"),
        catedras: misCatedras,
        profesor: doc,
        estado: tieneAsignadas ? "asignado" : "sin_asignar",
        totalModulos: totalMod
      };
    });

    // 3. Aplicar filtros sobre los docentes
    return todasFilas.filter((fila) => {
      // Filtro Estado
      if (filtroEstadoProfesores !== "todos" && fila.estado !== filtroEstadoProfesores) {
        return false;
      }

      // Filtro Turno
      if (filtroTurnoProfesores !== "todos") {
        if (fila.estado === "sin_asignar") return false;
        const tFiltro = filtroTurnoProfesores.toLowerCase();
        const coincideTurno = fila.catedras.some(
          (c) => (c.turno || "").toLowerCase() === tFiltro
        );
        if (!coincideTurno) return false;
      }

      // Filtro Año
      if (filtroAnioProfesores !== "todos") {
        if (fila.estado === "sin_asignar") return false;
        const coincideAnio = fila.catedras.some(
          (c) => String(c.anio || c.curso || "").replace(/[^\d]/g, "") === filtroAnioProfesores
        );
        if (!coincideAnio) return false;
      }

      // Filtro Materia
      if (filtroMateriaProfesores !== "todas") {
        if (fila.estado === "sin_asignar") return false;
        const coincideMateria = fila.catedras.some(
          (c) => c.materia === filtroMateriaProfesores
        );
        if (!coincideMateria) return false;
      }

      // Buscador
      if (busquedaProfesores.trim()) {
        const q = busquedaProfesores.trim().toLowerCase();
        const enNombre = (fila.profesor?.nombre || "").toLowerCase().includes(q);
        const enEmail = (fila.profesor?.email || "").toLowerCase().includes(q);
        const enMaterias = fila.catedras.some((c) =>
          (c.materia || "").toLowerCase().includes(q) ||
          `${formatoCursoDivision(c)} ${c.division || ""}`.toLowerCase().includes(q) ||
          (c.area || "").toLowerCase().includes(q)
        );
        if (!enNombre && !enEmail && !enMaterias) return false;
      }

      return true;
    });
  }, [
    catalogoDocentesCompleto,
    catedrasProfesores,
    filtroEstadoProfesores,
    filtroTurnoProfesores,
    filtroAnioProfesores,
    filtroMateriaProfesores,
    busquedaProfesores
  ]);

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

  const renderSubtabs = () =>
    h(
      "div",
      { className: "asignaciones-subtabs-nav" },
      [
        { id: "preceptores", label: "Preceptores", icon: IconUsers, count: preceptoresAsignadosCount },
        { id: "profesores", label: "Docentes", icon: IconGraduationCap, count: profesoresAsignadosCount }
      ].map((tab) =>
        h(
          "button",
          {
            key: tab.id,
            type: "button",
            className: `director-tab-btn ${subPestana === tab.id ? "director-tab-btn--active" : ""}`,
            onClick: () => setSubPestana(tab.id)
          },
          h(tab.icon, { width: "16", height: "16" }),
          h("span", null, tab.label),
          h(
            "span",
            { className: subPestana === tab.id ? "asignaciones-pill-active" : "asignaciones-pill-inactive" },
            tab.count
          )
        )
      )
    );

  return h(
    "div",
    { className: "director-section-content" },

    // =========================================================================
    // VISTA 1: ASIGNACIÓN DE CURSOS Y PRECEPTORES
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
              // Selector de Vista: Lista vs Tarjetas
              h(
                "div",
                { className: "asignaciones-view-switcher" },
                h(
                  "button",
                  {
                    type: "button",
                    className: `asignaciones-view-btn ${modoVistaPreceptores === "tabla" ? "asignaciones-view-btn--active" : ""}`,
                    onClick: () => setModoVistaPreceptores("tabla"),
                    title: "Ver como lista / tabla",
                    "aria-label": "Ver como lista"
                  },
                  h(IconList, { width: "16", height: "16" })
                ),
                h(
                  "button",
                  {
                    type: "button",
                    className: `asignaciones-view-btn ${modoVistaPreceptores === "tarjetas" ? "asignaciones-view-btn--active" : ""}`,
                    onClick: () => setModoVistaPreceptores("tarjetas"),
                    title: "Ver como tarjetas",
                    "aria-label": "Ver como tarjetas"
                  },
                  h(IconGrid, { width: "16", height: "16" })
                )
              )
            ),
            renderSubtabs()
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

          // Renderizado según modo de vista (Tabla / Lista o Tarjetas)
          modoVistaPreceptores === "tabla"
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
                      h("th", { style: { width: "45%" } }, "CURSOS Y DIVISIONES"),
                      h("th", { style: { width: "9%" } }, "TURNO"),
                      h("th", { style: { width: "21%" } }, "PRECEPTOR"),
                      h("th", { style: { width: "10%" } }, "ESTADO"),
                      h("th", { style: { width: "8%", textAlign: "left" } }, "ACCIONES")
                    )
                  ),
                  h(
                    "tbody",
                    null,
                    filasPreceptores.length === 0
                      ? h(
                          "tr",
                          null,
                          h(
                            "td",
                            { colSpan: 6, className: "asignaciones-empty-td" },
                            "No se encontraron preceptores con los filtros aplicados."
                          )
                        )
                      : filasPreceptores.map((fila) => {
                          const esExpandida = Boolean(expandidasPreceptores[fila.id]);
                          const aMostrar = esExpandida ? fila.divisiones : fila.divisiones.slice(0, 3);
                          const faltantes = fila.divisiones.length - 3;

                          return h(
                            "tr",
                            { key: fila.id },

                            // AÑO
                            h(
                              "td",
                              null,
                              h("span", { className: "asignaciones-cell-anio" }, fila.curso)
                            ),

                            // CURSOS Y DIVISIONES
                            h(
                              "td",
                              null,
                              fila.estado === "asignado"
                                ? h(
                                    "div",
                                    { className: "asignaciones-div-materia-tag-wrap" },
                                    aMostrar.map((d) =>
                                      h(
                                        "span",
                                        {
                                          key: d.id,
                                          className: "asignaciones-div-badge asignaciones-div-badge--materia",
                                          title: `${formatoCursoDivision(d)} · Turno ${d.turno} · ${d.orientacion || ""}`
                                        },
                                        h("span", null, formatoCursoDivision(d)),
                                        d.orientacion ? h("span", { style: { fontSize: "10.5px", color: "#64748b" } }, d.orientacion) : null
                                      )
                                    ),
                                    fila.divisiones.length > 3
                                      ? h(
                                          "button",
                                          {
                                            type: "button",
                                            className: `asignaciones-ver-mas-btn ${esExpandida ? "asignaciones-ver-mas-btn--expanded" : ""}`,
                                            onClick: () => toggleExpandPreceptor(fila.id)
                                          },
                                          esExpandida ? "Ver menos" : `Ver más (+${faltantes})`
                                        )
                                      : null
                                  )
                                : h(
                                    "span",
                                    { className: "asignaciones-unassigned" },
                                    "Sin divisiones asignadas"
                                  )
                            ),

                            // TURNO
                            h(
                              "td",
                              null,
                              h("span", { className: "asignaciones-cell-turno" }, fila.turno)
                            ),

                            // PRECEPTOR
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
                                        ? "asignaciones-user-avatar--blue"
                                        : "asignaciones-user-avatar--amber"
                                    }`
                                  },
                                  fila.preceptor.avatar || fila.preceptor.nombre.charAt(0).toUpperCase()
                                ),
                                h(
                                  "div",
                                  { className: "asignaciones-user-info" },
                                  h("strong", { className: "asignaciones-user-name" }, fila.preceptor.nombre),
                                  h("span", { className: "asignaciones-user-email" }, fila.preceptor.email)
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
                                    fila.divisiones.length > 1
                                      ? `● Asignado (${fila.divisiones.length})`
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
                                        onClick: () => setDivisionParaAsignar(fila.divisiones[0]),
                                        title: "Reasignar preceptor a estas divisiones"
                                      },
                                      h(IconUserCheck, null),
                                      h("span", null, "Reasignar")
                                    ),
                                    h(
                                      "button",
                                      {
                                        type: "button",
                                        className: "asignaciones-btn-quitar",
                                        onClick: () => handleQuitarPreceptor(fila.divisiones),
                                        title: "Quitar preceptor de las divisiones asignadas"
                                      },
                                      "Quitar"
                                    )
                                  )
                                : h(
                                    "button",
                                    {
                                      type: "button",
                                      className: "asignaciones-btn-asignar",
                                      onClick: () =>
                                        setDivisionParaAsignar({
                                          preceptor: fila.preceptor,
                                          id: "div-nuevo"
                                        }),
                                      title: "Asignar divisiones a este preceptor"
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
                filasPreceptores.length === 0
                  ? h(
                      "div",
                      { className: "asignaciones-cards-empty" },
                      "No se encontraron preceptores con los filtros aplicados."
                    )
                  : filasPreceptores.map((fila) => {
                      const esExpandida = Boolean(expandidasPreceptores[fila.id]);
                      const aMostrar = esExpandida ? fila.divisiones : fila.divisiones.slice(0, 3);
                      const faltantes = fila.divisiones.length - 3;

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
                                    ? "asignaciones-user-avatar--blue"
                                    : "asignaciones-user-avatar--amber"
                                }`
                              },
                              fila.preceptor.avatar || fila.preceptor.nombre.charAt(0).toUpperCase()
                            ),
                            h(
                              "div",
                              { className: "asignaciones-card-user-info" },
                              h("strong", { className: "asignaciones-card-name" }, fila.preceptor.nombre),
                              h("span", { className: "asignaciones-card-email" }, fila.preceptor.email)
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
                              ? (fila.divisiones.length > 1 ? `● Asignado (${fila.divisiones.length})` : "● Asignado")
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
                            h(IconCheckSquare, { width: "14", height: "14", className: "text-blue-600" }),
                            h(
                              "span",
                              null,
                              fila.divisiones.length === 1
                                ? "1 división asignada"
                                : fila.divisiones.length > 1
                                ? `${fila.divisiones.length} divisiones asignadas`
                                : "Sin divisiones asignadas"
                            )
                          ),
                          h(
                            "div",
                            { className: "asignaciones-card-metric-item" },
                            h(IconClock, { width: "14", height: "14", className: "text-slate-500" }),
                            h("span", null, `Turnos: ${fila.turno || "-"}`)
                          )
                        ),

                        // Divisiones asignadas
                        h(
                          "div",
                          { className: "asignaciones-card-materias-section" },
                          h("span", { className: "asignaciones-card-materias-label" }, "Divisiones asignadas:"),
                          fila.divisiones.length > 0
                            ? h(
                                "div",
                                { className: "asignaciones-div-materia-tag-wrap" },
                                aMostrar.map((d) =>
                                  h(
                                    "span",
                                    {
                                      key: d.id,
                                      className: "asignaciones-div-badge asignaciones-div-badge--materia",
                                      title: `${formatoCursoDivision(d)} · Turno ${d.turno} · ${d.orientacion || ""}`
                                    },
                                    h("span", null, formatoCursoDivision(d)),
                                    d.orientacion ? h("span", { style: { fontSize: "10.5px", color: "#64748b" } }, d.orientacion) : null
                                  )
                                ),
                                fila.divisiones.length > 3
                                  ? h(
                                      "button",
                                      {
                                        type: "button",
                                        className: `asignaciones-ver-mas-btn ${esExpandida ? "asignaciones-ver-mas-btn--expanded" : ""}`,
                                        onClick: () => toggleExpandPreceptor(fila.id)
                                      },
                                      esExpandida ? "Ver menos" : `Ver más (+${faltantes})`
                                    )
                                  : null
                              )
                            : h(
                                "span",
                                { className: "asignaciones-unassigned" },
                                "No tiene divisiones asignadas actualmente."
                              )
                        ),

                        // Card Footer: Botones Reasignar / Quitar / Asignar
                        h(
                          "div",
                          { className: "asignaciones-card-footer" },
                          fila.estado === "asignado"
                            ? [
                                h(
                                  "button",
                                  {
                                    key: "card-btn-reasignar-prec",
                                    type: "button",
                                    className: "asignaciones-btn-reasignar",
                                    onClick: () => setDivisionParaAsignar(fila.divisiones[0]),
                                    title: "Reasignar preceptor a estas divisiones"
                                  },
                                  h(IconUserCheck, null),
                                  h("span", null, "Reasignar")
                                ),
                                h(
                                  "button",
                                  {
                                    key: "card-btn-quitar-prec",
                                    type: "button",
                                    className: "asignaciones-btn-quitar",
                                    onClick: () => handleQuitarPreceptor(fila.divisiones),
                                    title: "Quitar preceptor de las divisiones asignadas"
                                  },
                                  "Quitar"
                                )
                              ]
                            : h(
                                "button",
                                {
                                  type: "button",
                                  className: "asignaciones-btn-asignar",
                                  style: { width: "100%", justifyContent: "center" },
                                  onClick: () =>
                                    setDivisionParaAsignar({
                                      preceptor: fila.preceptor,
                                      id: "div-nuevo"
                                    }),
                                  title: "Asignar divisiones a este preceptor"
                                },
                                h(IconUserPlus, null),
                                h("span", null, "Asignar Cursos")
                              )
                        )
                      );
                    })
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
              h("h2", { className: "asignaciones-card-title" }, "Asignacion de Cursos y Docentes"),
              // Selector de Vista: Lista vs Tarjetas (en reemplazo del badge de 18 de 24)
              h(
                "div",
                { className: "asignaciones-view-switcher" },
                h(
                  "button",
                  {
                    type: "button",
                    className: `asignaciones-view-btn ${modoVistaProfesores === "tabla" ? "asignaciones-view-btn--active" : ""}`,
                    onClick: () => setModoVistaProfesores("tabla"),
                    title: "Ver como lista / tabla",
                    "aria-label": "Ver como lista"
                  },
                  h(IconList, { width: "16", height: "16" })
                ),
                h(
                  "button",
                  {
                    type: "button",
                    className: `asignaciones-view-btn ${modoVistaProfesores === "tarjetas" ? "asignaciones-view-btn--active" : ""}`,
                    onClick: () => setModoVistaProfesores("tarjetas"),
                    title: "Ver como tarjetas",
                    "aria-label": "Ver como tarjetas"
                  },
                  h(IconGrid, { width: "16", height: "16" })
                )
              )
            ),
            renderSubtabs()
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
                placeholder: "Buscar por materia, división o docente...",
                value: busquedaProfesores,
                onChange: (e) => setBusquedaProfesores(e.target.value),
                "aria-label": "Buscar materia o docente"
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

          // Renderizado según modo de vista (Tabla / Lista o Tarjetas)
          modoVistaProfesores === "tabla"
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
                      h("th", { style: { width: "45%" } }, "DIVISIÓN Y MATERIA"),
                      h("th", { style: { width: "9%" } }, "TURNO"),
                      h("th", { style: { width: "21%" } }, "DOCENTE"),
                      h("th", { style: { width: "10%" } }, "ESTADO"),
                      h("th", { style: { width: "8%", textAlign: "left" } }, "ACCIONES")
                    )
                  ),
                  h(
                    "tbody",
                    null,
                    filasProfesores.length === 0
                      ? h(
                          "tr",
                          null,
                          h(
                            "td",
                            { colSpan: 6, className: "asignaciones-empty-td" },
                            "No se encontraron docentes con los filtros aplicados."
                          )
                        )
                      : filasProfesores.map((fila) => {
                          const esExpandida = Boolean(expandidasProfesores[fila.id]);
                          const aMostrar = esExpandida ? fila.catedras : fila.catedras.slice(0, 3);
                          const faltantes = fila.catedras.length - 3;

                          return h(
                            "tr",
                            { key: fila.id },

                            // AÑO
                            h(
                              "td",
                              null,
                              h("span", { className: "asignaciones-cell-anio" }, fila.curso)
                            ),

                            // DIVISIÓN Y MATERIA
                            h(
                              "td",
                              null,
                              fila.estado === "asignado"
                                ? h(
                                    "div",
                                    { className: "asignaciones-div-materia-tag-wrap" },
                                    aMostrar.map((c) =>
                                      h(
                                        "span",
                                        {
                                          key: c.id,
                                          className: "asignaciones-div-badge asignaciones-div-badge--materia",
                                          title: `${formatoCursoDivision(c)} (${c.materia}) · ${c.area || ""} · Turno ${c.turno} · ${c.modulos || 4} mód. semanales`
                                        },
                                        h("span", null, `${formatoCursoDivision(c)} (${c.materia})`),
                                        renderBadgeSituacion(c.situacion)
                                      )
                                    ),
                                    fila.catedras.length > 3
                                      ? h(
                                          "button",
                                          {
                                            type: "button",
                                            className: `asignaciones-ver-mas-btn ${esExpandida ? "asignaciones-ver-mas-btn--expanded" : ""}`,
                                            onClick: () => toggleExpandProfesor(fila.id)
                                          },
                                          esExpandida ? "Ver menos" : `Ver más (+${faltantes})`
                                        )
                                      : null
                                  )
                                : h(
                                    "span",
                                    { className: "asignaciones-unassigned" },
                                    "Sin materias asignadas"
                                  )
                            ),

                            // TURNO
                            h(
                              "td",
                              null,
                              h("span", { className: "asignaciones-cell-turno" }, fila.turno)
                            ),

                            // PROFESOR
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
                                  fila.profesor.avatar || fila.profesor.nombre.charAt(0).toUpperCase()
                                ),
                                h(
                                  "div",
                                  { className: "asignaciones-user-info" },
                                  h("strong", { className: "asignaciones-user-name" }, fila.profesor.nombre),
                                  h(
                                    "div",
                                    { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "2px" } },
                                    h("span", { className: "asignaciones-user-email" }, fila.profesor.email),
                                    fila.totalModulos > 0
                                      ? h(
                                          "span",
                                          { className: "asignaciones-tag-horas" },
                                          `${fila.totalModulos} mód/sem`
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
                                    fila.catedras.length > 1
                                      ? `● Asignado (${fila.catedras.length})`
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
                                        onClick: () => setCatedraParaAsignar(fila.catedras[0]),
                                        title: "Reasignar docente a estas materias"
                                      },
                                      h(IconUserCheck, null),
                                      h("span", null, "Reasignar")
                                    ),
                                    h(
                                      "button",
                                      {
                                        type: "button",
                                        className: "asignaciones-btn-quitar",
                                        onClick: () => handleQuitarProfesor(fila.catedras),
                                        title: "Quitar docente de las materias asignadas"
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
                                        setCatedraParaAsignar({
                                          profesor: fila.profesor,
                                          id: "cat-nuevo"
                                        }),
                                      title: "Asignar materias a este docente"
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
                filasProfesores.length === 0
                  ? h(
                      "div",
                      { className: "asignaciones-cards-empty" },
                      "No se encontraron docentes con los filtros aplicados."
                    )
                  : filasProfesores.map((fila) => {
                      const esExpandida = Boolean(expandidasProfesores[fila.id]);
                      const aMostrar = esExpandida ? fila.catedras : fila.catedras.slice(0, 3);
                      const faltantes = fila.catedras.length - 3;

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
                              fila.profesor.avatar || fila.profesor.nombre.charAt(0).toUpperCase()
                            ),
                            h(
                              "div",
                              { className: "asignaciones-card-user-info" },
                              h("strong", { className: "asignaciones-card-name" }, fila.profesor.nombre),
                              h("span", { className: "asignaciones-card-email" }, fila.profesor.email)
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
                            fila.estado === "asignado" ? "● Asignado" : "● Sin asignar"
                          )
                        ),

                        // Métricas: Turnos y Cuántas materias tiene asignadas
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
                              fila.catedras.length === 1
                                ? "1 materia asignada"
                                : fila.catedras.length > 1
                                ? `${fila.catedras.length} materias asignadas`
                                : "Sin materias asignadas"
                            )
                          ),
                          h(
                            "div",
                            { className: "asignaciones-card-metric-item" },
                            h(IconClock, { width: "14", height: "14", className: "text-slate-500" }),
                            h("span", null, `Turnos: ${fila.turno || "-"}`)
                          ),
                          fila.totalModulos > 0
                            ? h(
                                "div",
                                { className: "asignaciones-card-metric-item" },
                                h("span", { className: "asignaciones-tag-horas" }, `${fila.totalModulos} mód/sem`)
                              )
                            : null
                        ),

                        // Materias asignadas
                        h(
                          "div",
                          { className: "asignaciones-card-materias-section" },
                          h("span", { className: "asignaciones-card-materias-label" }, "Materias asignadas:"),
                          fila.catedras.length > 0
                            ? h(
                                "div",
                                { className: "asignaciones-div-materia-tag-wrap" },
                                aMostrar.map((c) =>
                                  h(
                                    "span",
                                    {
                                      key: c.id,
                                      className: "asignaciones-div-badge asignaciones-div-badge--materia",
                                      title: `${formatoCursoDivision(c)} (${c.materia}) · ${c.area || ""} · Turno ${c.turno} · ${c.modulos || 4} mód. semanales`
                                    },
                                    h("span", null, `${formatoCursoDivision(c)} (${c.materia})`),
                                    renderBadgeSituacion(c.situacion)
                                  )
                                ),
                                fila.catedras.length > 3
                                  ? h(
                                      "button",
                                      {
                                        type: "button",
                                        className: `asignaciones-ver-mas-btn ${esExpandida ? "asignaciones-ver-mas-btn--expanded" : ""}`,
                                        onClick: () => toggleExpandProfesor(fila.id)
                                      },
                                      esExpandida ? "Ver menos" : `Ver más (+${faltantes})`
                                    )
                                  : null
                              )
                            : h(
                                "span",
                                { className: "asignaciones-unassigned" },
                                "No tiene materias asignadas actualmente."
                              )
                        ),

                        // Card Footer: Botones Reasignar / Quitar / Asignar
                        h(
                          "div",
                          { className: "asignaciones-card-footer" },
                          fila.estado === "asignado"
                            ? [
                                h(
                                  "button",
                                  {
                                    key: "card-btn-reasignar",
                                    type: "button",
                                    className: "asignaciones-btn-reasignar",
                                    onClick: () => setCatedraParaAsignar(fila.catedras[0]),
                                    title: "Reasignar docente a estas materias"
                                  },
                                  h(IconUserCheck, null),
                                  h("span", null, "Reasignar")
                                ),
                                h(
                                  "button",
                                  {
                                    key: "card-btn-quitar",
                                    type: "button",
                                    className: "asignaciones-btn-quitar",
                                    onClick: () => handleQuitarProfesor(fila.catedras),
                                    title: "Quitar docente de las materias asignadas"
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
                                    setCatedraParaAsignar({
                                      profesor: fila.profesor,
                                      id: "cat-nuevo"
                                    }),
                                  title: "Asignar materias a este docente"
                                },
                                h(IconUserPlus, null),
                                h("span", null, "Asignar Materias")
                              )
                        )
                      );
                    })
              )
        )
      : null,

    // Modal para Preceptor
    divisionParaAsignar
      ? h(ModalAsignarPreceptor, {
          abierto: Boolean(divisionParaAsignar),
          division: divisionParaAsignar,
          personal,
          todasLasDivisiones: divisionesPreceptores,
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
          todasLasCatedras: catedrasProfesores,
          alCerrar: () => setCatedraParaAsignar(null),
          alGuardar: handleGuardarProfesor
        })
      : null
  );
}
