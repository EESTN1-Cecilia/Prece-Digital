import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { h } from "../../layouts/site-layout.js";
import { getFechaActual, BotonCerrarBarra } from "./document-helpers.js";
import { useUsuarioActual } from "../../estado/index.js";
import { StudentsService } from "../students/students-service.js";
import { PLANES_BOLETIN } from "../students/components/boletin-digital-modal.js";
import { descargarPlanillaPdf } from "./planilla-pdf.js";
import { calcularMetricas, resumenCurso } from "./planilla-estructura.js";
import { descargarPlanillaXlsx } from "./planilla-xlsx.js";
import { BoletinOficialService } from "../boletin/boletin-oficial-service.js";
import { buscarNota, recalcularNota } from "../boletin/boletin-oficial-datos.js";
import { PeriodosCargaService, bloqueosDe, enumerar } from "../grades/periodos-carga.js";
import { CustomSelect } from "../../components/common/custom-select.js";

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

  // Lista de asignaciones activas (docente o todas las materias del curso para personal directivo/secretaría/preceptoría)
  const asignacionesDisponibles = useMemo(() => {
    const baseDocente = (
      asignacionesDocente && asignacionesDocente.length > 0
        ? asignacionesDocente
        : (user?.assignments || []).filter((a) => Boolean(a.materia || a.curso || a.anio))
    ).filter((a) => Boolean(a.materia || a.curso || a.anio));

    const cRef = String(alumnoInicial?.curso || cursoInicial || "").trim();
    const dRef = String(alumnoInicial?.division || divisionInicial || "").replace(/\D/g, "");
    const anioRef = Number(cRef.replace(/\D/g, "")) || 1;
    const divRef = dRef || "1";

    const materiasDelCurso = (anio, div, orientacion = "") => {
      const plan = PLANES_BOLETIN[anio] || PLANES_BOLETIN[1] || {};
      const claveOri = String(orientacion || "").toUpperCase().includes("INFORM") ? "informatica" : "programacion";
      const lista = [
        ...(plan.formacionGeneral || []),
        ...(plan.tcoEspecifica || plan.orientaciones?.[claveOri] || [])
      ];
      return lista.map((mat) => ({
        anio,
        curso: `${anio}°`,
        division: String(div),
        materia: mat
      }));
    };

    if (baseDocente.length > 0) {
      if (!esDocente && cRef) {
        const tieneCurso = baseDocente.some(
          (a) => Number(String(a.anio || a.curso || "").replace(/\D/g, "")) === anioRef && String(a.division).replace(/\D/g, "") === divRef
        );
        if (!tieneCurso) {
          return [...materiasDelCurso(anioRef, divRef, alumnoInicial?.orientacion), ...baseDocente];
        }
      }
      return baseDocente;
    }

    if (cRef) {
      return materiasDelCurso(anioRef, divRef, alumnoInicial?.orientacion);
    }

    return ASIGNACIONES_DEFAULT;
  }, [asignacionesDocente, user?.assignments, alumnoInicial, cursoInicial, divisionInicial, esDocente]);

  const claveAsignacion = (a) =>
    `${a.curso || `${a.anio || 1}°`}-${String(a.division || "1").replace(/\D/g, "") || "1"}-${a.materia || "Matemática"}`;

  // Determinar la asignación inicial
  const asignacionDefault = useMemo(() => {
    const buscarMatch = (cBuscado, dBuscado) => {
      const cNum = Number(String(cBuscado || "").replace(/\D/g, ""));
      const dStr = String(dBuscado || "").replace(/\D/g, "");
      const delCurso = asignacionesDisponibles.filter(
        (a) => Number(String(a.anio || a.curso || "").replace(/\D/g, "")) === cNum && String(a.division || "").replace(/\D/g, "") === dStr
      );
      if (delCurso.length === 0) return null;
      if (materiaInicial) {
        const porMateria = delCurso.find(
          (a) => String(a.materia || "").toUpperCase() === String(materiaInicial).toUpperCase()
        );
        if (porMateria) return porMateria;
      }
      return delCurso[0];
    };

    if (alumnoInicial) {
      const match = buscarMatch(alumnoInicial.curso, alumnoInicial.division);
      if (match) return match;
    }
    if (cursoInicial && divisionInicial) {
      const match = buscarMatch(cursoInicial, divisionInicial);
      if (match) return match;
    }
    return asignacionesDisponibles[0] || { anio: 1, curso: "1°", division: "1", materia: "Matemática I" };
  }, [alumnoInicial, cursoInicial, divisionInicial, materiaInicial, asignacionesDisponibles]);

  // Estados de selección de curso, división y materia
  const [selectedAsigKey, setSelectedAsigKey] = useState(() => claveAsignacion(asignacionDefault));

  useEffect(() => {
    setSelectedAsigKey(claveAsignacion(asignacionDefault));
  }, [asignacionDefault]);

  const asignacionActual = useMemo(() => {
    const found = asignacionesDisponibles.find((a) => claveAsignacion(a) === selectedAsigKey);
    return found || asignacionDefault;
  }, [selectedAsigKey, asignacionesDisponibles, asignacionDefault]);

  const anioNum = useMemo(() => {
    return Number(String(asignacionActual.anio || asignacionActual.curso || "1").replace(/\D/g, "")) || 1;
  }, [asignacionActual]);

  const cursoStr = asignacionActual.curso || `${anioNum}°`;
  const divisionStr = String(asignacionActual.division || "1").replace(/\D/g, "") || "1";
  const materiaStr = asignacionActual.materia || materiaInicial || "Matemática";

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

  // Nombre oficial de la materia en el plan (el mismo con el que la ve el boletín)
  const materiaOficial = useMemo(() => {
    const claves = obtenerClavesMateriaBoletin(materiaStr, anioNum);
    return claves[1] ?? claves[0];
  }, [materiaStr, anioNum]);

  // Ciclo lectivo en que se carga la planilla
  const cicloLectivo = new Date().getFullYear();

  // Períodos de carga que la Dirección bloqueó: esas columnas quedan de solo lectura
  const [estadoPeriodos, setEstadoPeriodos] = useState(null);
  useEffect(() => {
    if (!abierto) return undefined;
    let vigente = true;
    PeriodosCargaService.obtener(cicloLectivo)
      .then((datos) => vigente && setEstadoPeriodos(datos))
      .catch(() => vigente && setEstadoPeriodos(null));
    return () => {
      vigente = false;
    };
  }, [abierto, cicloLectivo]);
  const bloqueo = useMemo(() => bloqueosDe(estadoPeriodos, user?.assignments ?? []), [estadoPeriodos, user?.assignments]);
  const avisoBloqueo = useMemo(() => {
    const nombres = (estadoPeriodos?.periodos ?? []).filter((periodo) => bloqueo[periodo.id]).map((periodo) => periodo.nombre);
    return nombres.length > 0 ? `La Dirección bloqueó la carga de notas de: ${enumerar(nombres)}. Esas columnas son de solo lectura.` : null;
  }, [estadoPeriodos, bloqueo]);

  // Arma las notas de un alumno a partir de su registro del backend (misma fuente que el boletín y el portal)
  const notasDeRegistro = useCallback(
    (registro) => {
      const claves = obtenerClavesMateriaBoletin(materiaStr, anioNum);
      let entrada = null;
      let detalle = null;
      for (const k of claves) {
        entrada = entrada ?? buscarNota(registro?.notas, k);
        detalle = detalle ?? buscarNota(registro?.detalle, k);
      }
      entrada = entrada ?? {};
      detalle = detalle ?? {};

      const rawC1 = String(entrada.informe1 || "").trim();
      const rawC2 = String(entrada.informe2 || "").trim();
      const esConcepto = (v) => ["TEA", "TEP", "TED"].includes(v.toUpperCase());
      const c1 = esConcepto(rawC1) ? "" : rawC1;
      const c2 = esConcepto(rawC2) ? "" : rawC2;
      const dic = entrada.diciembre || "-";
      const feb = entrada.febrero || "-";
      const final = recalcularNota({ informe1: c1, informe2: c2, diciembre: entrada.diciembre || "", febrero: entrada.febrero || "" }).definitiva;

      const p1 = detalle.p1 || "";
      const p2 = detalle.p2 || "";
      const p3 = detalle.p3 || "";
      const p4 = detalle.p4 || "";
      const f1 = Number(detalle.f1) || 0;
      const f2 = Number(detalle.f2) || 0;
      let v1 = detalle.v1 || (esConcepto(rawC1) ? rawC1.toUpperCase() : "");
      let v2 = detalle.v2 || (esConcepto(rawC2) ? rawC2.toUpperCase() : "");

      // Sugerir valoraciones iniciales si hay nota
      if (c1 && !v1) v1 = parseFloat(c1) >= 7 ? "TEA" : "TEP";
      if (c2 && !v2) v2 = parseFloat(c2) >= 7 ? "TEA" : "TEP";

      const clavesPrevias = Object.keys(registro?.notas || {}).filter((k) =>
        claves.some((c) => k.toUpperCase() === c.toUpperCase())
      );

      return { p1, p2, v1, c1, f1, p3, p4, v2, c2, f2, dic, feb, final, clavesPrevias };
    },
    [anioNum, materiaStr]
  );

  // Cargar estudiantes de la división actual estrictamente desde la base de datos
  const cargarEstudiantes = useCallback(async () => {
    setCargandoAlumnos(true);
    try {
      let rawList = [];

      // Siempre se carga la nómina COMPLETA de la división (todas las páginas);
      // estudiantesIniciales (una sola página del listado) solo es respaldo.
      const coincide = (alu) => {
        const cNum = Number(String(alu.curso || "").replace(/\D/g, ""));
        const dStr = String(alu.division || "").replace(/\D/g, "");
        return cNum === anioNum && dStr === divisionStr;
      };
      try {
        const res = await StudentsService.getTodosLosAlumnos({
          curso: `${anioNum}°`,
          division: divisionStr,
          estado: "activo",
          sortBy: "apellido",
          sortOrder: "asc"
        });
        rawList = res?.data || [];
      } catch (errCarga) {
        console.error("No se pudo cargar la nómina completa; se usa la lista recibida:", errCarga);
      }
      if (rawList.length === 0) {
        rawList = (estudiantesIniciales || []).filter(coincide);
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

      // Las notas salen del backend: las mismas que ve el alumno en su portal
      let registros = {};
      try {
        registros = await BoletinOficialService.obtenerVarios(
          rawList.map((alu) => alu.id),
          cicloLectivo
        );
      } catch (errNotas) {
        console.error("No se pudieron cargar las calificaciones:", errNotas);
        setToastMsg("No se pudieron cargar las calificaciones guardadas");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3500);
      }

      // Mapear con sus notas guardadas
      const listConNotas = rawList.map((alu, idx) => {
        const studentId = alu.id || `alu-row-${idx + 1}`;
        const notas = notasDeRegistro(registros[studentId]);

        return {
          id: studentId,
          num: idx + 1,
          apellido: alu.apellido || "Estudiante",
          nombre: alu.nombre || "",
          dni: alu.dni || "",
          isSelected: Boolean(alumnoInicial) && (alumnoInicial.id === alu.id || alumnoInicial.dni === alu.dni),
          bloqueado: false,
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
    notasDeRegistro,
    cicloLectivo
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
        if (e.id === studentId && e.bloqueado) return e;
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

  // Guardar calificaciones en el backend: el boletín oficial y el portal del alumno leen estos mismos registros
  const [guardando, setGuardando] = useState(false);
  const handleGuardarCalificaciones = async () => {
    if (guardando) return;
    setGuardando(true);
    const avisar = (mensaje, ms = 3000) => {
      setToastMsg(mensaje);
      setShowToast(true);
      setTimeout(() => setShowToast(false), ms);
    };

    try {
      const aGuardar = estudiantes.filter((st) => !st.bloqueado);
      const vacio = (valor) => (valor === "-" ? "" : String(valor ?? "").trim());

      for (const st of aGuardar) {
        const notasPayload = {
          informe1: vacio(st.c1) || vacio(st.v1),
          informe2: vacio(st.c2) || vacio(st.v2),
          diciembre: vacio(st.dic),
          febrero: vacio(st.feb)
        };
        const detallePayload = { p1: st.p1, p2: st.p2, v1: st.v1, f1: st.f1, p3: st.p3, p4: st.p4, v2: st.v2, f2: st.f2 };

        await BoletinOficialService.guardarMateria(st.id, {
          ciclo: cicloLectivo,
          materia: materiaOficial,
          notas: notasPayload,
          detalle: detallePayload
        });

        for (const clavePrevia of st.clavesPrevias || []) {
          if (clavePrevia !== materiaOficial) {
            await BoletinOficialService.guardarMateria(st.id, {
              ciclo: cicloLectivo,
              materia: clavePrevia,
              notas: notasPayload,
              detalle: detallePayload
            });
          }
        }
      }

      // Disparar eventos globales para actualizar otras vistas (listados de boletines, tableros)
      window.dispatchEvent(
        new CustomEvent("prece:calificaciones-updated", {
          detail: { curso: cursoStr, division: divisionStr, materia: materiaStr }
        })
      );
      window.dispatchEvent(new CustomEvent("prece:boletin-updated"));

      avisar("✓ Calificaciones guardadas: ya las ven el Boletín Oficial y el portal del alumno");
    } catch (e) {
      console.error("Error al guardar calificaciones:", e);
      avisar(`No se guardaron las calificaciones: ${e?.mensaje ?? "intentá de nuevo."}`, 5000);
    } finally {
      setGuardando(false);
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

  // Métricas en vivo, por cuatrimestre: TEA o 7 o más = aprobado; el resto = desaprobado
  const metricas = useMemo(() => calcularMetricas(estudiantes), [estudiantes]);

  // Exportar PDF (Oficio vertical, una hoja) o Excel con el mismo diseño y los datos de pantalla
  const exportar = async (descargar, formato) => {
    try {
      await descargar({
        anioLectivo: fecha.anio,
        materia: materiaStr,
        curso: cursoStr,
        division: divisionStr,
        turno: turnoStr,
        docente: nombreDocente,
        preceptor: nombrePreceptor,
        estudiantes: estudiantesOrdenados,
        metricas
      });
    } catch (err) {
      console.error(`Error exportando planilla a ${formato}:`, err);
      setToastMsg(`No se pudo generar el archivo ${formato}. Intentá de nuevo.`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };
  const handleExportarPdf = () => exportar(descargarPlanillaPdf, "PDF");
  const handleExportarExcel = () => exportar(descargarPlanillaXlsx, "Excel");

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
            ? h(CustomSelect, {
                className: "doc-planilla-course-select",
                value: selectedAsigKey,
                onChange: (val) => setSelectedAsigKey(val),
                ariaLabel: "Cambiar curso y materia asignada",
                options: asignacionesDisponibles.map((asig) => ({
                  value: claveAsignacion(asig),
                  label: `${asig.curso || `${asig.anio}°`} ${asig.division}° · ${asig.materia || "Materia"}`
                }))
              })
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
              title: "Guardar notas: las ven el boletín oficial y el portal del alumno"
            },
            h(
              "svg",
              { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
              h("polyline", { points: "17 21 17 13 7 13 7 21" }),
              h("polyline", { points: "7 3 7 8 15 8" })
            ),
            h("span", null, "Guardar Calificaciones")
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
              className: "matriz-btn matriz-btn--excel",
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

          // Descargar PDF
          h(
            "button",
            {
              type: "button",
              className: "matriz-btn matriz-btn--pdf",
              onClick: handleExportarPdf,
              title: "Descargar planilla en PDF (Oficio, vertical)"
            },
            h(
              "svg",
              { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
              h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
              h("polyline", { points: "14 2 14 8 20 8" })
            ),
            h("span", null, "PDF")
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

      avisoBloqueo
        ? h("div", { className: "doc-planilla-aviso-bloqueo no-print", role: "status" }, "🔒 ", avisoBloqueo)
        : null,

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
              ...resumenCurso(metricas).map((grupo) =>
                h(
                  "div",
                  {
                    key: grupo.titulo,
                    className: `doc-stat-group${grupo.celdas.length === 1 ? " doc-stat-group--compact" : ""}`
                  },
                  h("div", { className: "doc-stat-group__header" }, grupo.titulo),
                  h(
                    "div",
                    { className: "doc-stat-group__cells" },
                    ...grupo.celdas.map(([nombre, valor]) =>
                      h(
                        "div",
                        {
                          key: `${grupo.titulo}-${nombre}`,
                          className: `doc-stat-item${nombre === "Aprobados" ? " doc-stat-item--success" : nombre === "Desaprobados" ? " doc-stat-item--danger" : ""}`
                        },
                        h("span", { className: "doc-stat-item__label" }, nombre.toUpperCase()),
                        h("strong", { className: "doc-stat-item__value" }, valor)
                      )
                    )
                  )
                )
              )
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
                    const rowClass = e.isSelected ? "doc-planilla-row--selected" : e.bloqueado ? "doc-planilla-row--locked" : "";
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
                          disabled: Boolean(e.bloqueado) || bloqueo.cuatrimestre1,
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
                        h(CustomSelect, {
                          className: "doc-planilla-cell-select",
                          disabled: Boolean(e.bloqueado) || bloqueo.cuatrimestre1,
                          value: e.v1 || "-",
                          ariaLabel: `Valoración preliminar 1°C de ${e.apellido}`,
                          options: [
                            { value: "-", label: "-" },
                            { value: "TEA", label: "TEA" },
                            { value: "TEP", label: "TEP" },
                            { value: "TED", label: "TED" }
                          ],
                          onChange: (val) => handleCellChange(e.id, "v1", val === "-" ? "" : val)
                        })
                      ),

                      // 1er Cuatrimestre: Calif. 1C
                      h(
                        "td",
                        { style: { padding: "2px" } },
                        h("input", {
                          disabled: Boolean(e.bloqueado) || bloqueo.cuatrimestre1,
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
                          disabled: Boolean(e.bloqueado) || bloqueo.cuatrimestre1,
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
                          disabled: Boolean(e.bloqueado) || bloqueo.cuatrimestre2,
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
                        h(CustomSelect, {
                          className: "doc-planilla-cell-select",
                          disabled: Boolean(e.bloqueado) || bloqueo.cuatrimestre2,
                          value: e.v2 || "-",
                          ariaLabel: `Valoración preliminar 2°C de ${e.apellido}`,
                          options: [
                            { value: "-", label: "-" },
                            { value: "TEA", label: "TEA" },
                            { value: "TEP", label: "TEP" },
                            { value: "TED", label: "TED" }
                          ],
                          onChange: (val) => handleCellChange(e.id, "v2", val === "-" ? "" : val)
                        })
                      ),

                      // 2do Cuatrimestre: Calif. 2C
                      h(
                        "td",
                        { style: { padding: "2px" } },
                        h("input", {
                          disabled: Boolean(e.bloqueado) || bloqueo.cuatrimestre2,
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
                          disabled: Boolean(e.bloqueado) || bloqueo.cuatrimestre2,
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
                          disabled: Boolean(e.bloqueado) || bloqueo.diciembre,
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
                          disabled: Boolean(e.bloqueado) || bloqueo.febrero,
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
                          disabled: Boolean(e.bloqueado),
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
