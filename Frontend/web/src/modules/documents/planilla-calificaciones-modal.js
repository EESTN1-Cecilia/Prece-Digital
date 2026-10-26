import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { h } from "../../layouts/site-layout.js";
import { getFechaActual, BotonCerrarBarra } from "./document-helpers.js";
import { useUsuarioActual } from "../../estado/index.js";
import { StudentsService } from "../students/students-service.js";
import { PLANES_BOLETIN } from "../students/components/boletin-digital-modal.js";
import { BoletinNotasService } from "../students/boletin-notas-service.js";
import * as XLSX from "xlsx";

// Cursos de referencia por defecto para docentes si no vienen en la sesión
const ASIGNACIONES_DEFAULT = [
  { anio: 1, curso: "1°", division: "1", materia: "Matemática I" },
  { anio: 2, curso: "2°", division: "1", materia: "Matemática II" },
  { anio: 3, curso: "3°", division: "3", materia: "Matemática III" }
];

/**
 * Normaliza nombres para hacer coincidir las materias asignadas al docente
 * con los nombres oficiales que aparecen en las filas de PLANES_BOLETIN.
 */
export function obtenerClavesMateriaBoletin(materiaDocente, anio = 1) {
  if (!materiaDocente) return ["MATEMÁTICA", "MATEMATICAS"];

  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+(I|II|III|IV|V|VI|VII)\b/g, "")
      .replace(/\s+CICLO\s+SUPERIOR\b/g, "")
      .trim();

  const mNorm = norm(materiaDocente);
  const plan = PLANES_BOLETIN[anio] || PLANES_BOLETIN[1] || {};
  const todas = [
    ...(plan.formacionGeneral || []),
    ...(plan.tcoEspecifica || []),
    ...(plan.orientaciones?.programacion || []),
    ...(plan.orientaciones?.informatica || [])
  ];

  const matched = todas.filter((m) => {
    const pNorm = norm(m);
    return (
      pNorm === mNorm ||
      pNorm.startsWith(mNorm) ||
      mNorm.startsWith(pNorm) ||
      (mNorm === "MATEMATICA" && pNorm.startsWith("MATEMATICA")) ||
      (mNorm === "MATEMATICAS" && pNorm.startsWith("MATEMATICA")) ||
      (mNorm === "INGLES" && pNorm.startsWith("INGLES"))
    );
  });

  const keys = new Set([materiaDocente, ...matched]);
  return Array.from(keys);
}

// ============================================================================
// MODAL: PLANILLA DE CALIFICACIONES OFICIAL PBA (VISTA DOCENTE Y LEGAJO)
// ============================================================================
export function PlanillaCalificacionesModal({
  abierto,
  onCerrar,
  alumnoInicial = null,
  cursoInicial = null,
  divisionInicial = null,
  materiaInicial = null,
  estudiantesIniciales = null,
  asignacionesDocente = null,
  esDocente = false,
  profesorNombre = null
}) {
  const user = useUsuarioActual();

  // Bloquear scrollbar del fondo mientras el modal esté abierto
  useEffect(() => {
    if (!abierto) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [abierto]);

  // Lista de asignaciones activas
  const asignacionesDisponibles = useMemo(() => {
    if (asignacionesDocente && asignacionesDocente.length > 0) return asignacionesDocente;
    if (user?.assignments && user.assignments.length > 0) return user.assignments;
    return ASIGNACIONES_DEFAULT;
  }, [asignacionesDocente, user?.assignments]);

  // Determinar la asignación inicial
  const asignacionDefault = useMemo(() => {
    if (alumnoInicial) {
      const cAlu = String(alumnoInicial.curso || "").trim();
      const dAlu = String(alumnoInicial.division || "").trim();
      const match = asignacionesDisponibles.find(
        (a) => (a.curso === cAlu || `${a.anio}°` === cAlu) && String(a.division) === dAlu
      );
      if (match) return match;
    }
    if (cursoInicial && divisionInicial) {
      const match = asignacionesDisponibles.find(
        (a) => (a.curso === cursoInicial || `${a.anio}°` === cursoInicial) && String(a.division) === String(divisionInicial)
      );
      if (match) return match;
    }
    return asignacionesDisponibles[0] || { anio: 1, curso: "1°", division: "1", materia: "Matemática I" };
  }, [alumnoInicial, cursoInicial, divisionInicial, asignacionesDisponibles]);

  // Estados de selección de curso, división y materia
  const [selectedAsigKey, setSelectedAsigKey] = useState(() => {
    return `${asignacionDefault.curso || `${asignacionDefault.anio}°`}-${asignacionDefault.division}`;
  });

  const asignacionActual = useMemo(() => {
    const found = asignacionesDisponibles.find(
      (a) => `${a.curso || `${a.anio}°`}-${a.division}` === selectedAsigKey
    );
    return found || asignacionDefault;
  }, [selectedAsigKey, asignacionesDisponibles, asignacionDefault]);

  const anioNum = useMemo(() => {
    return Number(String(asignacionActual.anio || asignacionActual.curso || "1").replace(/\D/g, "")) || 1;
  }, [asignacionActual]);

  const cursoStr = asignacionActual.curso || `${anioNum}°`;
  const divisionStr = String(asignacionActual.division || "1").replace(/\D/g, "") || "1";
  const materiaStr = materiaInicial || asignacionActual.materia || "Matemática";

  // Estados de datos
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [ordenCampo, setOrdenCampo] = useState("numero");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const fecha = useMemo(() => getFechaActual(), []);

  // Nombre del docente a cargo
  const nombreDocente = useMemo(() => {
    if (profesorNombre) return profesorNombre;
    if (user?.nombreCompleto) return user.nombreCompleto;
    if (user?.nombre || user?.apellido) {
      return `Prof. ${user.apellido || ""} ${user.nombre || ""}`.trim();
    }
    return "Prof. Titular";
  }, [profesorNombre, user]);

  // Nombre del preceptor/a (dinámico si es usuario preceptor o editable)
  const [nombrePreceptor, setNombrePreceptor] = useState(() => {
    if (user?.rol === "preceptor" || (Array.isArray(user?.roles) && user.roles.includes("preceptor"))) {
      return user.nombreCompleto || user.displayName || `${user.apellido || ""} ${user.nombre || ""}`.trim();
    }
    return "";
  });

  // Turno de la división
  const turnoStr = useMemo(() => {
    const raw = asignacionActual.turno || asignacionActual.shiftId || (anioNum <= 2 ? "mañana" : "tarde");
    return String(raw).toUpperCase();
  }, [asignacionActual, anioNum]);

  // Notas de un alumno tomadas del boletín compartido (backend). `boletines`
  // es { [alumnoId]: calificaciones } del curso; se busca la materia por sus
  // nombres equivalentes del plan.
  const notasDesdeBoletin = useCallback((calificacionesAlumno = {}) => {
    let c1 = "", c2 = "", dic = "-", feb = "-", final = "";
    let detalle = {};

    for (const clave of obtenerClavesMateriaBoletin(materiaStr, anioNum)) {
      const entrada = calificacionesAlumno[clave];
      if (entrada) {
        c1 = entrada.informe1 || "";
        c2 = entrada.informe2 || "";
        dic = entrada.diciembre || "-";
        feb = entrada.febrero || "-";
        final = entrada.definitiva || entrada.promedioAnual || "";
        detalle = entrada.detalle || {};
        break;
      }
    }

    const p1 = detalle.p1 || "", p2 = detalle.p2 || "", p3 = detalle.p3 || "", p4 = detalle.p4 || "";
    let v1 = detalle.v1 || "", v2 = detalle.v2 || "";
    const f1 = Number(detalle.f1) || 0, f2 = Number(detalle.f2) || 0;

    // Sugerir valoraciones iniciales si hay nota
    if (c1 && !v1) v1 = parseFloat(c1) >= 7 ? "TEA" : "TEP";
    if (c2 && !v2) v2 = parseFloat(c2) >= 7 ? "TEA" : "TEP";

    return { p1, p2, v1, c1, f1, p3, p4, v2, c2, f2, dic, feb, final };
  }, [anioNum, materiaStr]);

  // Cargar estudiantes de la división actual estrictamente desde la base de datos
  const cargarEstudiantes = useCallback(async () => {
    setCargandoAlumnos(true);
    try {
      let rawList = [];

      // Filtrar estrictamente de estudiantesIniciales SOLO los que pertenecen al curso y división actual
      const listaCoincidente = (estudiantesIniciales || []).filter((alu) => {
        const cNum = Number(String(alu.curso || "").replace(/\D/g, ""));
        const dStr = String(alu.division || "").replace(/\D/g, "");
        return cNum === anioNum && dStr === divisionStr;
      });

      if (listaCoincidente.length > 0) {
        rawList = listaCoincidente;
      } else {
        const res = await StudentsService.getAlumnos({
          curso: `${anioNum}°`,
          division: divisionStr,
          estado: "activo",
          limit: 100,
          sortBy: "apellido",
          sortOrder: "asc"
        });
        rawList = res?.data || [];
      }

      // Si alumnoInicial pertenece a este curso y división y no está en la lista, incluirlo
      if (alumnoInicial) {
        const cInit = Number(String(alumnoInicial.curso || "").replace(/\D/g, ""));
        const dInit = String(alumnoInicial.division || "").replace(/\D/g, "");
        if (cInit === anioNum && dInit === divisionStr) {
          const yaEsta = rawList.some((a) => a.id === alumnoInicial.id || a.dni === alumnoInicial.dni);
          if (!yaEsta) {
            rawList = [alumnoInicial, ...rawList];
          }
        }
      }

      // Notas guardadas en el boletín compartido del curso
      const boletinesDelCurso = await BoletinNotasService.deCurso(`${anioNum}-${divisionStr}`).catch(() => []);
      const calificacionesPorAlumno = new Map(boletinesDelCurso.map((item) => [item.alumno.id, item.boletin?.calificaciones ?? {}]));

      const listConNotas = rawList.map((alu, idx) => {
        const studentId = alu.id || `alu-row-${idx + 1}`;
        const notas = notasDesdeBoletin(calificacionesPorAlumno.get(studentId));

        return {
          id: studentId,
          num: idx + 1,
          apellido: alu.apellido || "Estudiante",
          nombre: alu.nombre || "",
          dni: alu.dni || "",
          isSelected: alumnoInicial && (alumnoInicial.id === alu.id || alumnoInicial.dni === alu.dni),
          ...notas
        };
      });

      setEstudiantes(listConNotas);
    } catch (err) {
      console.error("Error al cargar estudiantes para planilla:", err);
    } finally {
      setCargandoAlumnos(false);
    }
  }, [
    anioNum,
    divisionStr,
    estudiantesIniciales,
    alumnoInicial,
    notasDesdeBoletin
  ]);

  useEffect(() => {
    if (abierto) {
      cargarEstudiantes();
    }
  }, [abierto, cargarEstudiantes]);

  // Manejo interactivo de cambio de valores en cada celda
  const handleCellChange = (studentId, field, value) => {
    setEstudiantes((prev) =>
      prev.map((e) => {
        if (e.id !== studentId) return e;

        const updated = { ...e, [field]: value };

        // Auto-cálculo si se editan notas parciales del 1er cuatrimestre
        if (field === "p1" || field === "p2") {
          const np1 = parseFloat(field === "p1" ? value : e.p1);
          const np2 = parseFloat(field === "p2" ? value : e.p2);
          if (!isNaN(np1) && !isNaN(np2)) {
            const prom1 = ((np1 + np2) / 2).toFixed(1);
            updated.c1 = prom1.endsWith(".0") ? prom1.slice(0, -2) : prom1;
            if (!e.v1) updated.v1 = parseFloat(prom1) >= 7 ? "TEA" : "TEP";
          }
        }

        // Auto-cálculo si se editan notas parciales del 2do cuatrimestre
        if (field === "p3" || field === "p4") {
          const np3 = parseFloat(field === "p3" ? value : e.p3);
          const np4 = parseFloat(field === "p4" ? value : e.p4);
          if (!isNaN(np3) && !isNaN(np4)) {
            const prom2 = ((np3 + np4) / 2).toFixed(1);
            updated.c2 = prom2.endsWith(".0") ? prom2.slice(0, -2) : prom2;
            if (!e.v2) updated.v2 = parseFloat(prom2) >= 7 ? "TEA" : "TEP";
          }
        }

        // Sugerir valoraciones preliminares
        if (field === "c1" && value) {
          const num = parseFloat(value);
          if (!isNaN(num) && (!e.v1 || e.v1 === "-")) {
            updated.v1 = num >= 7 ? "TEA" : "TEP";
          }
        }
        if (field === "c2" && value) {
          const num = parseFloat(value);
          if (!isNaN(num) && (!e.v2 || e.v2 === "-")) {
            updated.v2 = num >= 7 ? "TEA" : "TEP";
          }
        }

        // Recalcular Calificación Final
        const valC1 = parseFloat(field === "c1" ? value : updated.c1);
        const valC2 = parseFloat(field === "c2" ? value : updated.c2);
        const valDic = parseFloat(field === "dic" ? value : updated.dic);
        const valFeb = parseFloat(field === "feb" ? value : updated.feb);

        if (!isNaN(valFeb)) {
          updated.final = String(valFeb);
        } else if (!isNaN(valDic)) {
          updated.final = String(valDic);
        } else if (!isNaN(valC1) && !isNaN(valC2)) {
          const promFin = ((valC1 + valC2) / 2).toFixed(2);
          updated.final = promFin.endsWith(".00") ? promFin.slice(0, -3) : promFin;
        }

        return updated;
      })
    );
  };

  // Guardar la planilla en el boletín compartido: las notas aparecen en el
  // Boletín Digital de Secretaría y en los boletines de preceptoría.
  const [guardando, setGuardando] = useState(false);
  const handleGuardarCalificaciones = async () => {
    const limpiar = (valor) => (valor && valor !== "-" ? String(valor).trim() : "");
    setGuardando(true);
    try {
      await BoletinNotasService.guardarMateria(`${anioNum}-${divisionStr}`, {
        materias: obtenerClavesMateriaBoletin(materiaStr, anioNum),
        notas: estudiantes.map((st) => ({
          alumnoId: st.id,
          informe1: limpiar(st.c1),
          informe2: limpiar(st.c2),
          promedioAnual: limpiar(st.final),
          diciembre: limpiar(st.dic),
          febrero: limpiar(st.feb),
          definitiva: limpiar(st.final),
          detalle: { p1: st.p1, p2: st.p2, v1: st.v1, f1: st.f1, p3: st.p3, p4: st.p4, v2: st.v2, f2: st.f2 }
        }))
      });

      // Avisar a otras vistas abiertas (listados de boletines, tableros)
      window.dispatchEvent(
        new CustomEvent("prece:calificaciones-updated", {
          detail: { curso: cursoStr, division: divisionStr, materia: materiaStr }
        })
      );
      window.dispatchEvent(new CustomEvent("prece:boletin-updated"));

      setToastMsg("✓ Calificaciones guardadas: ya figuran en el Boletín");
    } catch (fallo) {
      setToastMsg(fallo?.mensaje || "No se pudieron guardar las calificaciones.");
    } finally {
      setGuardando(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    }
  };

  // Exportar planilla completa a archivo Excel (XLSX)
  const handleExportarExcel = () => {
    try {
      const rows = [
        ["DIRECCIÓN GENERAL DE CULTURA Y EDUCACIÓN · PROVINCIA DE BUENOS AIRES"],
        ["ESCUELA DE EDUCACIÓN SECUNDARIA TÉCNICA N° 1 'CECILIA BERDICHEVSKI'"],
        [`PLANILLA OFICIAL DE CALIFICACIONES ${fecha.anio}`],
        [],
        ["MATERIA:", materiaStr, "", "AÑO:", cursoStr, "SECCIÓN:", `${divisionStr}°`],
        ["TURNO:", turnoStr, "", "PROFESOR/A:", nombreDocente, "PRECEPTOR/A:", nombrePreceptor || "-"],
        [],
        [
          "Nº",
          "APELLIDO/S Y NOMBRE/S",
          "DNI",
          "1C PARC.",
          "1C VAL. PREL.",
          "CALIF. 1C",
          "INAS. 1C",
          "2C PARC.",
          "2C VAL. PREL.",
          "CALIF. 2C",
          "INAS. 2C",
          "INT. DIC.",
          "INT. FEB.",
          "CALIF. FINAL"
        ]
      ];

      estudiantesOrdenados.forEach((e) => {
        rows.push([
          e.num,
          `${e.apellido}, ${e.nombre}`,
          e.dni,
          `${e.p1 || ""} ${e.p2 ? `- ${e.p2}` : ""}`.trim(),
          e.v1 || "-",
          e.c1 || "",
          e.f1 ?? 0,
          `${e.p3 || ""} ${e.p4 ? `- ${e.p4}` : ""}`.trim(),
          e.v2 || "-",
          e.c2 || "",
          e.f2 ?? 0,
          e.dic || "-",
          e.feb || "-",
          e.final || ""
        ]);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Planilla Calificaciones");

      const safeMateria = materiaStr.replace(/[^a-zA-Z0-9]/g, "_");
      XLSX.writeFile(wb, `Planilla_${cursoStr}_${divisionStr}_${safeMateria}.xlsx`);
    } catch (err) {
      console.error("Error exportando planilla a Excel:", err);
    }
  };

  // Ordenamiento de alumnos
  const estudiantesOrdenados = useMemo(() => {
    return [...estudiantes].sort((a, b) => {
      if (ordenCampo === "numero") {
        return ordenDir === "asc" ? a.num - b.num : b.num - a.num;
      }
      const nombreA = `${a.apellido}, ${a.nombre}`.toLowerCase();
      const nombreB = `${b.apellido}, ${b.nombre}`.toLowerCase();
      if (nombreA < nombreB) return ordenDir === "asc" ? -1 : 1;
      if (nombreA > nombreB) return ordenDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [estudiantes, ordenCampo, ordenDir]);

  const handleAlternarOrden = () => {
    if (ordenCampo === "numero") {
      setOrdenCampo("nombre");
      setOrdenDir("asc");
    } else if (ordenDir === "asc") {
      setOrdenDir("desc");
    } else {
      setOrdenCampo("numero");
      setOrdenDir("asc");
    }
  };

  // Métricas estadísticas en vivo
  const metricas = useMemo(() => {
    const total = estudiantes.length;
    let aprobados = 0;
    let desaprobados = 0;
    let sumaFinales = 0;
    let conNotaFinal = 0;

    estudiantes.forEach((e) => {
      const f = parseFloat(e.final);
      if (!isNaN(f) && f > 0) {
        sumaFinales += f;
        conNotaFinal++;
        if (f >= 7) aprobados++;
        else desaprobados++;
      }
    });

    const promedioCurso = conNotaFinal > 0 ? (sumaFinales / conNotaFinal).toFixed(2) : "-";

    return { total, aprobados, desaprobados, promedioCurso };
  }, [estudiantes]);

  if (!abierto) return null;

  const modalContent = h(
    "div",
    {
      className: "matriz-modal-backdrop",
      onClick: (e) => {
        if (e.target === e.currentTarget && onCerrar) onCerrar();
      }
    },

    // Toast de guardado exitoso
    showToast
      ? h(
          "div",
          { className: "doc-planilla-toast" },
          h(
            "svg",
            { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5" },
            h("path", { d: "M20 6L9 17l-5-5" })
          ),
          h("span", null, toastMsg)
        )
      : null,

    h(
      "div",
      {
        className: "matriz-modal-container doc-modal-paper-wrap doc-modal-paper-wrap--wide",
        role: "dialog",
        "aria-modal": "true"
      },

      // Barra superior de herramientas fija
      h(
        "div",
        { className: "matriz-toolbar no-print" },
        h(
          "div",
          { className: "matriz-toolbar__left", style: { display: "flex", alignItems: "center", gap: "10px" } },
          h("h2", { className: "matriz-toolbar__title" }, "Planilla de Calificaciones 2026"),

          // Selector de curso/materia para el docente si tiene más de una asignación
          asignacionesDisponibles.length > 1
            ? h(
                "select",
                {
                  className: "doc-planilla-course-select",
                  value: selectedAsigKey,
                  onChange: (e) => setSelectedAsigKey(e.target.value),
                  title: "Cambiar curso y materia asignada"
                },
                asignacionesDisponibles.map((asig) => {
                  const key = `${asig.curso || `${asig.anio}°`}-${asig.division}`;
                  return h(
                    "option",
                    { key, value: key },
                    `${asig.curso || `${asig.anio}°`} ${asig.division}° · ${asig.materia || "Materia"}`
                  );
                })
              )
            : h("span", { className: "matriz-toolbar__badge" }, `Curso: ${cursoStr} ${divisionStr}° · ${materiaStr}`)
        ),

        h(
          "div",
          { className: "matriz-toolbar__controls" },
          // Botón Guardar Calificaciones
          h(
            "button",
            {
              type: "button",
              className: "matriz-btn matriz-btn--primary",
              onClick: handleGuardarCalificaciones,
              disabled: guardando,
              title: "Guardar notas: se cargan automáticamente en el boletín del alumno"
            },
            h(
              "svg",
              { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
              h("polyline", { points: "17 21 17 13 7 13 7 21" }),
              h("polyline", { points: "7 3 7 8 15 8" })
            ),
            h("span", null, guardando ? "Guardando..." : "Guardar Calificaciones")
          ),

          // Alternar orden
          h(
            "button",
            {
              type: "button",
              className: "matriz-btn matriz-btn--secondary",
              onClick: handleAlternarOrden,
              title: "Alternar orden de alumnos"
            },
            h(
              "svg",
              { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M3 6h18M6 12h12M10 18h4" })
            ),
            h("span", null, `Ordenar: ${ordenCampo === "numero" ? "Por Nº" : ordenDir === "asc" ? "A-Z" : "Z-A"}`)
          ),

          // Exportar Excel
          h(
            "button",
            {
              type: "button",
              className: "matriz-btn matriz-btn--secondary",
              onClick: handleExportarExcel,
              title: "Descargar planilla en Excel (.xlsx)"
            },
            h(
              "svg",
              { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
              h("polyline", { points: "7 10 12 15 17 10" }),
              h("line", { x1: "12", y1: "15", x2: "12", y2: "3" })
            ),
            h("span", null, "Excel")
          ),

          // Imprimir / PDF
          h(
            "button",
            { type: "button", className: "matriz-btn matriz-btn--secondary", onClick: () => window.print() },
            h(
              "svg",
              { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("polyline", { points: "6 9 6 2 18 2 18 9" }),
              h("path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
              h("rect", { x: "6", y: "14", width: "12", height: "8" })
            ),
            h("span", null, "Imprimir")
          ),

          h(BotonCerrarBarra, { onCerrar })
        )
      ),

      // Contenedor scrollable
      h(
        "div",
        { className: "matriz-scroll-area" },

        // Hoja oficial de la planilla
        h(
          "div",
          { className: "doc-paper-sheet doc-paper-sheet--wide" },

          // Encabezado Oficial
          h(
            "div",
            { className: "doc-planilla-header" },
            h(
              "div",
              { className: "doc-planilla-top-row" },
              h("div", { className: "doc-provincia-tag" }, "DIRECCIÓN GENERAL DE CULTURA Y EDUCACIÓN · PROVINCIA DE BUENOS AIRES"),
              h(
                "div",
                { style: { display: "flex", alignItems: "center", gap: "10px" } },
                h("img", {
                  src: "/assets/logo_tec.png",
                  alt: "Escudo",
                  style: { width: "36px", height: "36px", objectFit: "contain", flexShrink: 0 },
                  onError: (e) => {
                    e.currentTarget.src = "/assets/Logo Tec.png";
                  }
                }),
                h("span", { className: "doc-escuela-title" }, "E.E.S.T. N° 1 \"CECILIA BERDICHEVSKI\"")
              )
            ),
            h("h1", { className: "doc-planilla-main-title" }, `PLANILLA OFICIAL DE CALIFICACIONES ${fecha.anio}`),

            // Grilla de Metadatos de la Materia
            h(
              "div",
              { className: "doc-planilla-meta-grid" },
              h("div", null, h("strong", null, "MATERIA: "), h("span", { className: "doc-field-underlined font-bold" }, materiaStr)),
              h("div", null, h("strong", null, "AÑO: "), h("span", { className: "doc-field-underlined" }, cursoStr)),
              h("div", null, h("strong", null, "SECCIÓN / DIV: "), h("span", { className: "doc-field-underlined" }, `${divisionStr}°`)),
              h("div", null, h("strong", null, "TURNO: "), h("span", { className: "doc-field-underlined" }, turnoStr)),
              h("div", null, h("strong", null, "PROFESOR/A: "), h("span", { className: "doc-field-underlined" }, nombreDocente)),
              h(
                "div",
                null,
                h("strong", null, "PRECEPTOR/A: "),
                h("input", {
                  type: "text",
                  className: "doc-field-underlined",
                  style: {
                    border: "none",
                    borderBottom: "1.5px solid #222a4c",
                    background: "transparent",
                    font: "inherit",
                    fontWeight: "700",
                    width: "160px",
                    padding: "0 4px",
                    color: "#1e293b"
                  },
                  placeholder: "____________________",
                  value: nombrePreceptor,
                  onChange: (e) => setNombrePreceptor(e.target.value),
                  title: "Nombre del preceptor/a (editable)"
                })
              )
            ),

            // Resumen Estadístico Superior en Vivo
            h(
              "div",
              { className: "doc-planilla-stats-box" },
              h("div", { className: "doc-stat-item" }, h("span", null, "TOTAL ESTUDIANTES:"), h("strong", null, metricas.total)),
              h("div", { className: "doc-stat-item text-success" }, h("span", null, "APROBADOS:"), h("strong", null, metricas.aprobados)),
              h("div", { className: "doc-stat-item text-danger" }, h("span", null, "DESAPROBADOS:"), h("strong", null, metricas.desaprobados)),
              h("div", { className: "doc-stat-item" }, h("span", null, "PROMEDIO DEL CURSO:"), h("strong", null, metricas.promedioCurso))
            )
          ),

          // Aviso interactivo informativo
          h(
            "div",
            {
              className: "no-print",
              style: {
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                borderRadius: "6px",
                padding: "8px 12px",
                fontSize: "12px",
                margin: "10px 0 14px 0",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }
            },
            h(
              "svg",
              { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("circle", { cx: "12", cy: "12", r: "10" }),
              h("line", { x1: "12", y1: "16", x2: "12", y2: "12" }),
              h("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" })
            ),
            h(
              "span",
              null,
              "Puedes editar las notas directamente en las celdas de la tabla. Al presionar ",
              h("strong", null, "\"Guardar Calificaciones\""),
              ", las notas se autocompletarán de inmediato en los Boletines Digitales Oficiales de cada estudiante."
            )
          ),

          // Tabla Oficial de Calificaciones
          h(
            "table",
            { className: "doc-planilla-table" },
            h(
              "thead",
              null,
              h(
                "tr",
                null,
                h("th", { rowSpan: 2, className: "col-num", onClick: handleAlternarOrden, style: { cursor: "pointer" }, title: "Ordenar por número" }, "Nº ⬍"),
                h("th", { rowSpan: 2, className: "col-name", onClick: handleAlternarOrden, style: { cursor: "pointer", textAlign: "left", paddingLeft: "8px" }, title: "Ordenar por apellido" }, "APELLIDO/S Y NOMBRE/S DEL/LA ESTUDIANTE ⬍"),
                h("th", { colSpan: 4 }, "1º CUATRIMESTRE"),
                h("th", { colSpan: 4 }, "2º CUATRIMESTRE"),
                h("th", { colSpan: 2 }, "INTENSIFICACIÓN"),
                h("th", { rowSpan: 2, className: "col-cal-final", style: { minWidth: "75px" } }, "CALIF. FINAL")
              ),
              h(
                "tr",
                null,
                h("th", { className: "col-sub", style: { width: "65px" } }, "PARC."),
                h("th", { className: "col-sub", style: { width: "55px" } }, "VAL. PREL."),
                h("th", { className: "col-sub", style: { width: "55px" } }, "CALIF. 1C"),
                h("th", { className: "col-sub", style: { width: "42px" } }, "INAS."),
                h("th", { className: "col-sub", style: { width: "65px" } }, "PARC."),
                h("th", { className: "col-sub", style: { width: "55px" } }, "VAL. PREL."),
                h("th", { className: "col-sub", style: { width: "55px" } }, "CALIF. 2C"),
                h("th", { className: "col-sub", style: { width: "42px" } }, "INAS."),
                h("th", { className: "col-sub", style: { width: "48px" } }, "DIC."),
                h("th", { className: "col-sub", style: { width: "48px" } }, "FEB.")
              )
            ),
            h(
              "tbody",
              null,
              cargandoAlumnos
                ? h(
                    "tr",
                    null,
                    h("td", { colSpan: 13, style: { textAlign: "center", padding: "20px", color: "#64748b" }, className: "text-muted" }, "Cargando estudiantes y calificaciones...")
                  )
                : estudiantesOrdenados.length === 0
                ? h(
                    "tr",
                    null,
                    h("td", { colSpan: 13, style: { textAlign: "center", padding: "26px", color: "#64748b", fontStyle: "italic" } }, "No se encontraron alumnos matriculados en esta división.")
                  )
                : estudiantesOrdenados.map((e) => {
                    const rowClass = e.isSelected ? "doc-planilla-row--selected" : "";
                    const fNum = parseFloat(e.final);
                    const isApproved = !isNaN(fNum) && fNum >= 7;
                    const isDisapproved = !isNaN(fNum) && fNum < 7;

                    return h(
                      "tr",
                      { key: e.id, className: rowClass },
                      h("td", { className: "text-center font-bold font-mono" }, e.num),
                      h(
                        "td",
                        { className: "text-left font-bold" },
                        h("span", { style: { color: "#1e293b" } }, `${e.apellido}, ${e.nombre}`),
                        e.dni ? h("span", { className: "text-muted font-mono", style: { fontSize: "10px", marginLeft: "6px" } }, `(${e.dni})`) : null
                      ),

                      // 1er Cuatrimestre: Parciales
                      h(
                        "td",
                        { style: { padding: "2px" } },
                        h("input", {
                          type: "text",
                          className: "doc-planilla-cell-input",
                          placeholder: "p1 - p2",
                          value: `${e.p1 || ""}${e.p2 ? ` - ${e.p2}` : ""}`,
                          onChange: (ev) => {
                            const val = ev.target.value;
                            const parts = val.split("-").map((p) => p.trim());
                            handleCellChange(e.id, "p1", parts[0] || "");
                            if (parts[1] !== undefined) handleCellChange(e.id, "p2", parts[1]);
                          }
                        })
                      ),

                      // 1er Cuatrimestre: Valoración Preliminar (TEA, TEP, TED)
                      h(
                        "td",
                        { style: { padding: "2px" } },
                        h(
                          "select",
                          {
                            className: "doc-planilla-cell-select",
                            value: e.v1 || "-",
                            onChange: (ev) => handleCellChange(e.id, "v1", ev.target.value === "-" ? "" : ev.target.value)
                          },
                          h("option", { value: "-" }, "-"),
                          h("option", { value: "TEA" }, "TEA"),
                          h("option", { value: "TEP" }, "TEP"),
                          h("option", { value: "TED" }, "TED")
                        )
                      ),

                      // 1er Cuatrimestre: Calif. 1C
                      h(
                        "td",
                        { style: { padding: "2px" } },
                        h("input", {
                          type: "text",
                          maxLength: 4,
                          className: `doc-planilla-cell-input ${parseFloat(e.c1) >= 7 ? "doc-planilla-cell-input--approved" : e.c1 ? "doc-planilla-cell-input--disapproved" : ""}`,
                          value: e.c1 || "",
                          onChange: (ev) => handleCellChange(e.id, "c1", ev.target.value)
                        })
                      ),

                      // 1er Cuatrimestre: Inasistencias
                      h(
                        "td",
                        { style: { padding: "2px" } },
                        h("input", {
                          type: "number",
                          min: 0,
                          max: 99,
                          className: "doc-planilla-cell-input",
                          value: e.f1 ?? 0,
                          onChange: (ev) => handleCellChange(e.id, "f1", Number(ev.target.value) || 0)
                        })
                      ),

                      // 2do Cuatrimestre: Parciales
                      h(
                        "td",
                        { style: { padding: "2px" } },
                        h("input", {
                          type: "text",
                          className: "doc-planilla-cell-input",
                          placeholder: "p3 - p4",
                          value: `${e.p3 || ""}${e.p4 ? ` - ${e.p4}` : ""}`,
                          onChange: (ev) => {
                            const val = ev.target.value;
                            const parts = val.split("-").map((p) => p.trim());
                            handleCellChange(e.id, "p3", parts[0] || "");
                            if (parts[1] !== undefined) handleCellChange(e.id, "p4", parts[1]);
                          }
                        })
                      ),

                      // 2do Cuatrimestre: Valoración Preliminar (TEA, TEP, TED)
                      h(
                        "td",
                        { style: { padding: "2px" } },
                        h(
                          "select",
                          {
                            className: "doc-planilla-cell-select",
                            value: e.v2 || "-",
                            onChange: (ev) => handleCellChange(e.id, "v2", ev.target.value === "-" ? "" : ev.target.value)
                          },
                          h("option", { value: "-" }, "-"),
                          h("option", { value: "TEA" }, "TEA"),
                          h("option", { value: "TEP" }, "TEP"),
                          h("option", { value: "TED" }, "TED")
                        )
                      ),

                      // 2do Cuatrimestre: Calif. 2C
                      h(
                        "td",
                        { style: { padding: "2px" } },
                        h("input", {
                          type: "text",
                          maxLength: 4,
                          className: `doc-planilla-cell-input ${parseFloat(e.c2) >= 7 ? "doc-planilla-cell-input--approved" : e.c2 ? "doc-planilla-cell-input--disapproved" : ""}`,
                          value: e.c2 || "",
                          onChange: (ev) => handleCellChange(e.id, "c2", ev.target.value)
                        })
                      ),

                      // 2do Cuatrimestre: Inasistencias
                      h(
                        "td",
                        { style: { padding: "2px" } },
                        h("input", {
                          type: "number",
                          min: 0,
                          max: 99,
                          className: "doc-planilla-cell-input",
                          value: e.f2 ?? 0,
                          onChange: (ev) => handleCellChange(e.id, "f2", Number(ev.target.value) || 0)
                        })
                      ),

                      // Intensificación: Diciembre
                      h(
                        "td",
                        { style: { padding: "2px" } },
                        h("input", {
                          type: "text",
                          maxLength: 4,
                          className: "doc-planilla-cell-input",
                          value: e.dic || "-",
                          onChange: (ev) => handleCellChange(e.id, "dic", ev.target.value)
                        })
                      ),

                      // Intensificación: Febrero
                      h(
                        "td",
                        { style: { padding: "2px" } },
                        h("input", {
                          type: "text",
                          maxLength: 4,
                          className: "doc-planilla-cell-input",
                          value: e.feb || "-",
                          onChange: (ev) => handleCellChange(e.id, "feb", ev.target.value)
                        })
                      ),

                      // Calificación Final (Calculada o ingresada)
                      h(
                        "td",
                        { style: { padding: "2px" } },
                        h("input", {
                          type: "text",
                          maxLength: 4,
                          className: `doc-planilla-cell-input doc-planilla-cell-input--final ${isApproved ? "doc-planilla-cell-input--approved" : isDisapproved ? "doc-planilla-cell-input--disapproved" : ""}`,
                          value: e.final || "",
                          onChange: (ev) => handleCellChange(e.id, "final", ev.target.value)
                        })
                      )
                    );
                  })
            )
          ),

          // Pie de Firmas Oficial
          h(
            "div",
            { className: "doc-planilla-footer-signatures" },
            h(
              "div",
              { className: "doc-signature-line-box" },
              h("div", { className: "doc-sig-line" }),
              h("span", null, "FIRMA DEL/LA PROFESOR/A"),
              h("span", { style: { fontSize: "10px", color: "#64748b", marginTop: "2px" } }, nombreDocente)
            ),
            h(
              "div",
              { className: "doc-signature-line-box" },
              h("div", { className: "doc-sig-line" }),
              h("span", null, "FIRMA DEL/LA PRECEPTOR/A"),
              nombrePreceptor
                ? h("span", { style: { fontSize: "10px", color: "#64748b", marginTop: "2px" } }, nombrePreceptor)
                : null
            ),
            h(
              "div",
              { className: "doc-signature-line-box" },
              h("div", { className: "doc-sig-line" }),
              h("span", null, "SELLO Y FIRMA DIRECTIVA"),
              h("span", { style: { fontSize: "10px", color: "#64748b", marginTop: "2px" } }, "Dirección E.E.S.T. N° 1")
            )
          )
        )
      )
    )
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}

export default PlanillaCalificacionesModal;
