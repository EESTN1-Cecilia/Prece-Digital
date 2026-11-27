import React, { Fragment, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { CustomSelect } from "../../components/common/custom-select.js";
import { LoadingState, EmptyState } from "../../components/common/state-handlers.js";
import {
  AsistenciasService,
  MESES_DEL_ANIO
} from "./asistencias-service.js";
import { descargarAsistenciasPdf, descargarAsistenciasExcel } from "./asistencias-export.js";
import { useUsuarioActual } from "../../estado/index.js";
import { cursosAsignadosDelDocente } from "../../utils/asignaciones-docente.js";

const ESTADOS_ASISTENCIA = {
  P: { label: "Presente", clase: "cell-presente" },
  A: { label: "Ausente", clase: "cell-ausente" },
  J: { label: "Justificada", clase: "cell-justificada" },
  T: { label: "Tarde / Media falta", clase: "cell-tarde" },
  "—": { label: "Sin clase / Feriado", clase: "cell-inactivo" }
};

const LETRAS_DIAS = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];

/* Hoja de la planilla: A4 apaisada con 0,5 cm de margen en los cuatro lados.
   El area util (287 x 200 mm) se calcula una vez y la planilla se ajusta para
   ocupar toda esa area en UNA sola hoja. Si se imprime en otro papel, cambiar
   solo PAPEL_ANCHO_MM y PAPEL_ALTO_MM. */
const MM_A_PX = 96 / 25.4;
const PAPEL_ANCHO_MM = 297;
const PAPEL_ALTO_MM = 210;
const MARGEN_MM = 5;
const AREA_ANCHO_PX = Math.floor((PAPEL_ANCHO_MM - 2 * MARGEN_MM) * MM_A_PX);
// 3 px de holgura abajo: evita que el redondeo del navegador cree una 2.a hoja en blanco
const AREA_ALTO_PX = Math.floor((PAPEL_ALTO_MM - 2 * MARGEN_MM) * MM_A_PX) - 3;

const ESTILO_IMPRESION_PLANILLA = `
  @page {
    size: ${PAPEL_ANCHO_MM}mm ${PAPEL_ALTO_MM}mm;
    margin: ${MARGEN_MM}mm;
  }
  *, *::before, *::after {
    box-sizing: border-box !important;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: ${AREA_ANCHO_PX}px !important;
    height: ${AREA_ALTO_PX}px !important;
    overflow: hidden !important;
    background: #ffffff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #000000;
  }
  .marco-hoja-impresion {
    width: ${AREA_ANCHO_PX}px !important;
    height: ${AREA_ALTO_PX}px !important;
    overflow: hidden !important;
    position: relative !important;
    break-inside: avoid !important;
    page-break-after: avoid !important;
  }
  .hoja-asistencia-impresion {
    transform-origin: top left !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    gap: 4px !important;
    box-sizing: border-box !important;
  }
  .hoja-asistencia-impresion > .asistencias-page {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
    background: #ffffff !important;
  }
`;

/* Reglas de pantalla del sitio, sin las de impresión: el boletín, la matriz y el
   perfil ocultan todo (body * { visibility: hidden }) y fijan A4 al imprimir. */
function reglasDePantalla() {
  const reglas = [];
  const recorrer = (lista) => {
    for (const regla of lista) {
      if (regla instanceof CSSImportRule) {
        if (regla.styleSheet) recorrer(regla.styleSheet.cssRules);
      } else if (regla instanceof CSSPageRule) {
        continue;
      } else if (regla instanceof CSSMediaRule && /\bprint\b/.test(regla.media.mediaText)) {
        continue;
      } else {
        reglas.push(regla.cssText);
      }
    }
  };
  const externas = [];
  for (const hoja of document.styleSheets) {
    try {
      recorrer(hoja.cssRules);
    } catch {
      if (hoja.href) externas.push(hoja.href); // fuentes de otro dominio
    }
  }
  return { css: reglas.join("\n"), externas };
}

/* Imprime la planilla de asistencia ocupando la hoja completa en formato apaisado.
   Utiliza un iframe limpio para aislar estilos de navegación y garantizar
   que la grilla de días, totales y balances llenen el ancho de la hoja (100%)
   y entren en una única página oficial. */
async function imprimirPlanillaAsistencia(original) {
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  // Dimensiones de referencia de página apaisada para renderizado previo a impresión
  Object.assign(marco.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "1300px",
    height: "1000px",
    border: "0"
  });
  document.body.appendChild(marco);

  const { css, externas } = reglasDePantalla();
  const doc = marco.contentDocument;
  doc.open();
  doc.write(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Planilla Oficial de Asistencia - E.E.S.T N° 1</title>` +
      externas.map((href) => `<link rel="stylesheet" href="${href}">`).join("") +
      `<style>${css}</style><style>${ESTILO_IMPRESION_PLANILLA}</style></head>` +
      `<body class="asistencias-imprimiendo"><div class="marco-hoja-impresion"><div class="hoja-asistencia-impresion"></div></div></body></html>`
  );
  doc.close();

  const contenedor = doc.querySelector(".hoja-asistencia-impresion");
  const hoja = doc.importNode(original, true);

  // Copiamos valores de observaciones ingresados a mano en inputs
  const inputsOriginales = original.querySelectorAll("input");
  hoja.querySelectorAll("input").forEach((input, i) => {
    input.setAttribute("value", inputsOriginales[i]?.value ?? "");
    input.removeAttribute("placeholder");
  });
  contenedor.appendChild(hoja);

  await Promise.all(
    [...doc.querySelectorAll('link[rel="stylesheet"]')].map(
      (link) => link.sheet || new Promise((listo) => { link.onload = listo; link.onerror = listo; })
    )
  );
  await doc.fonts?.ready;
  await Promise.all([...doc.images].map((img) => img.decode().catch(() => {})));

  /* Ajuste a UNA hoja que ocupa toda el area util:
     - Se ensancha el contenido a (ancho / escala) y se lo reduce con transform, de modo
       que siempre llene el ancho de la hoja.
     - La escala se busca para que el alto resultante coincida con el alto de la hoja.
     - Si la planilla es corta (pocos alumnos), el contenedor se estira hasta el alto
       total y reparte el espacio sobrante entre sus bloques. */
  let escala = 1;
  for (let i = 0; i < 6; i += 1) {
    contenedor.style.width = `${AREA_ANCHO_PX / escala}px`;
    contenedor.style.height = "auto";
    const altoNatural = contenedor.scrollHeight;
    const nueva = Math.min(1, AREA_ALTO_PX / altoNatural);
    if (Math.abs(nueva - escala) < 0.002) {
      escala = Math.min(escala, nueva);
      break;
    }
    escala = nueva;
  }
  contenedor.style.width = `${AREA_ANCHO_PX / escala}px`;
  contenedor.style.minHeight = `${AREA_ALTO_PX / escala}px`;
  contenedor.style.transform = `scale(${escala})`;

  const ventana = marco.contentWindow;
  ventana.addEventListener("afterprint", () => setTimeout(() => marco.remove(), 0));
  ventana.focus();
  ventana.print();
}

const imprimirEnHojaOficio = imprimirPlanillaAsistencia;

/* Cursos del docente para el selector. Si dicta dos materias en la misma division,
   cada una es una opcion distinta (id con la materia); cursoId es siempre "año-division". */
function cursosDocente(user) {
  const lista = cursosAsignadosDelDocente(user);
  const porCurso = new Map();
  lista.forEach((c) => porCurso.set(c.id, (porCurso.get(c.id) ?? 0) + 1));
  return lista.map((c) => ({
    ...c,
    cursoId: c.id,
    id: porCurso.get(c.id) > 1 ? `${c.id}|${c.materia ?? ""}` : c.id,
    turno: c.turno || "Mañana",
    orientacion: c.anio <= 3 ? "Ciclo Básico" : "Ciclo Superior",
    preceptor: `Docente: ${user?.displayName || user?.nombre || "Docente"}`
  }));
}

export default function AsistenciasView({ modoDocente = false, grupoTaller = null, onVolver = null }) {
  const user = useUsuarioActual();
  const paginaRef = useRef(null);

  const esDocente =
    modoDocente ||
    Boolean(grupoTaller) ||
    user?.rol === "docente" ||
    (Array.isArray(user?.roles) &&
      user.roles.includes("docente") &&
      !user.roles.includes("preceptor") &&
      !user.roles.includes("admin") &&
      !user.roles.includes("director"));

  // Lista de cursos disponibles dinámicos
  /* Fuera del docente, la lista sale solo del backend (un preceptor recibe los
     cursos que le asigno la Direccion): nunca se arranca con el catalogo completo. */
  /* Lista de un grupo de taller: un unico "curso" con la materia Taller · Grupo X.Y */
  const cursoGrupo = useMemo(
    () => (grupoTaller ? { id: grupoTaller.id, curso: grupoTaller.curso, division: grupoTaller.division, turno: grupoTaller.turno || "Mañana", materia: grupoTaller.materia, orientacion: "Ciclo Básico", preceptor: `Docente: ${grupoTaller.docentes || "A designar"}` } : null),
    [grupoTaller?.id, grupoTaller?.curso, grupoTaller?.division, grupoTaller?.turno, grupoTaller?.materia, grupoTaller?.docentes]
  );
  const clavesAlumnos = grupoTaller?.alumnoIds ? grupoTaller.alumnoIds.join(",") : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const alumnosGrupo = useMemo(() => grupoTaller?.alumnoIds ?? null, [clavesAlumnos]);

  const [cursos, setCursos] = useState(() => (cursoGrupo ? [cursoGrupo] : esDocente ? cursosDocente(user) : []));
  const [errorCarga, setErrorCarga] = useState(null);
  const [cursosListos, setCursosListos] = useState(esDocente);

  // Estados de navegación y selección de curso/mes
  const [selectedCursoId, setSelectedCursoId] = useState(() => {
    if (grupoTaller) return grupoTaller.id;
    const hash = typeof window !== "undefined" ? window.location.hash || "" : "";
    if (hash.includes("?")) {
      const q = new URLSearchParams(hash.split("?")[1]);
      const c = q.get("curso");
      const d = q.get("div") || q.get("division");
      if (c && d) {
        return `${String(c).replace(/\D/g, "")}-${String(d).replace(/\D/g, "")}`;
      }
    }
    return "1-1";
  });
  const [selectedMes, setSelectedMes] = useState(new Date().getMonth() + 1); // Mes actual
  const [selectedAnio, setSelectedAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cargar lista dinámica de cursos según rol
  useEffect(() => {
    let montado = true;

    if (cursoGrupo) {
      setCursos([cursoGrupo]);
      setSelectedCursoId(cursoGrupo.id);
      return undefined;
    }

    if (esDocente) {
      const asigs = cursosDocente(user);
      if (montado) {
        setCursos(asigs);
        const hash = window.location.hash || "";
        const q = hash.includes("?") ? new URLSearchParams(hash.split("?")[1]) : null;
        const pedido = q?.get("curso") && (q.get("div") || q.get("division"))
          ? `${String(q.get("curso")).replace(/\D/g, "")}-${String(q.get("div") || q.get("division")).replace(/\D/g, "")}`
          : null;
        const materiaPedida = String(q?.get("materia") ?? "").trim().toLowerCase();
        const elegido =
          asigs.find((c) => c.cursoId === pedido && (!materiaPedida || String(c.materia ?? "").toLowerCase() === materiaPedida)) ||
          asigs.find((c) => c.cursoId === pedido) ||
          asigs[0];
        setSelectedCursoId(elegido?.id ?? null);
        setCursosListos(true);
      }
      return;
    }

    AsistenciasService.getCursosDisponibles().then((lista) => {
      if (!montado) return;
      const propios = Array.isArray(lista) ? lista : [];
      setCursos(propios);
      setCursosListos(true);
      /* Si el curso pedido (URL o "1-1" por defecto) no es de la sesion, se pasa al primero propio. */
      setSelectedCursoId((actual) => (propios.some((c) => c.id === actual) ? actual : propios[0]?.id ?? null));
    });
    return () => {
      montado = false;
    };
  }, [esDocente, user, cursoGrupo]);

  // Leer parámetros de URL si cambian
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || "";
      if (hash.includes("?")) {
        const q = new URLSearchParams(hash.split("?")[1]);
        const c = q.get("curso");
        const d = q.get("div") || q.get("division");
        if (c && d) {
          setSelectedCursoId(`${String(c).replace(/\D/g, "")}-${String(d).replace(/\D/g, "")}`);
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Datos de la planilla
  const [planilla, setPlanilla] = useState(null);
  const [planillaOriginal, setPlanillaOriginal] = useState(null);

  // Obtener curso actual
  const cursoActual = useMemo(() => {
    return (
      cursos.find((c) => c.id === selectedCursoId) ||
      cursos[0] || {
        id: "1-1",
        curso: "1°",
        division: "1",
        turno: "Mañana",
        materia: undefined,
        orientacion: "Ciclo Básico",
        preceptor: esDocente ? `Docente: ${user?.nombre || "Docente"}` : "Preceptoría"
      }
    );
  }, [cursos, selectedCursoId, esDocente, user]);

  const obtenerAnioCurso = useCallback((curso) => {
    const valor = curso?.anio ?? curso?.curso ?? curso?.id?.split("-")[0] ?? "";
    return Number(String(valor).replace(/\D/g, "")) || 1;
  }, []);

  const aniosDisponibles = useMemo(
    () => [...new Set(cursos.map(obtenerAnioCurso))].sort((a, b) => a - b),
    [cursos, obtenerAnioCurso]
  );
  const anioCursoActual = obtenerAnioCurso(cursoActual);
  const cursosDelAnio = useMemo(
    () => cursos.filter((curso) => obtenerAnioCurso(curso) === anioCursoActual),
    [cursos, anioCursoActual, obtenerAnioCurso]
  );

  const seleccionarAnio = (anio) => {
    const cursosDelNuevoAnio = cursos.filter((curso) => obtenerAnioCurso(curso) === anio);
    const mismaDivision = cursosDelNuevoAnio.find((curso) => String(curso.division) === String(cursoActual.division));
    setSelectedCursoId((mismaDivision || cursosDelNuevoAnio[0])?.id ?? selectedCursoId);
  };

  // Cargar planilla al cambiar de curso o mes (con materia si es docente)
  const cursoPermitido = cursos.some((c) => c.id === selectedCursoId);

  const cargarPlanilla = useCallback(async () => {
    setLoading(true);
    setSaveSuccess(false);
    setErrorCarga(null);
    /* Nunca se abre la planilla de un curso que la sesion no tiene asignado. */
    if (!cursoPermitido) {
      setPlanilla(null);
      setPlanillaOriginal(null);
      setLoading(!cursosListos);
      return;
    }
    const materiaDocente = esDocente ? cursoActual.materia || null : null;
    if (esDocente && !materiaDocente) {
      setPlanilla(null);
      setPlanillaOriginal(null);
      setErrorCarga("Este curso no tiene una materia asignada. Pedile a la Dirección que complete tu cátedra.");
      setLoading(false);
      return;
    }
    try {
      const data = await AsistenciasService.getPlanilla(
        cursoActual.cursoId || selectedCursoId,
        selectedMes,
        selectedAnio,
        materiaDocente,
        alumnosGrupo
      );
      setPlanilla(data);
      setPlanillaOriginal(JSON.parse(JSON.stringify(data)));
    } catch (err) {
      /* Nunca queda en pantalla la planilla del curso anterior. */
      setPlanilla(null);
      setPlanillaOriginal(null);
      setErrorCarga(err?.mensaje || "No se pudo cargar la planilla. Revisá la conexión y volvé a intentar.");
    } finally {
      setLoading(false);
    }
  }, [selectedCursoId, selectedMes, selectedAnio, esDocente, cursoActual.materia, cursoActual.cursoId, cursoPermitido, cursosListos, alumnosGrupo]);

  useEffect(() => {
    cargarPlanilla();
  }, [cargarPlanilla]);

  // Calcular cantidad de cambios no guardados
  const cambiosCount = useMemo(() => {
    if (!planilla || !planillaOriginal) return 0;
    let count = 0;

    // Comparar celdas de registros de asistencia
    const origReg = planillaOriginal.registros || {};
    const currReg = planilla.registros || {};
    const allOrdenes = new Set([...Object.keys(origReg), ...Object.keys(currReg)]);

    allOrdenes.forEach((orden) => {
      const origDias = origReg[orden] || {};
      const currDias = currReg[orden] || {};
      const allDias = new Set([...Object.keys(origDias), ...Object.keys(currDias)]);
      allDias.forEach((dia) => {
        const valOrig = origDias[dia] != null ? origDias[dia] : "P";
        const valCurr = currDias[dia] != null ? currDias[dia] : "P";
        if (valOrig !== valCurr) {
          count++;
        }
      });
    });

    // Comparar observaciones por alumno
    const origObs = planillaOriginal.observacionesPorAlumno || {};
    const currObs = planilla.observacionesPorAlumno || {};
    const allObsOrdenes = new Set([...Object.keys(origObs), ...Object.keys(currObs)]);

    allObsOrdenes.forEach((orden) => {
      if ((origObs[orden] || "").trim() !== (currObs[orden] || "").trim()) {
        count++;
      }
    });

    return count;
  }, [planilla, planillaOriginal]);

  // Días del mes actual
  const diasMes = useMemo(() => {
    const totalDias = new Date(selectedAnio, selectedMes, 0).getDate();
    const dias = [];
    for (let d = 1; d <= totalDias; d++) {
      const fecha = new Date(selectedAnio, selectedMes - 1, d);
      const diaSemanaIndex = fecha.getDay();
      const letraDia = LETRAS_DIAS[diaSemanaIndex];
      const esFinDeSemana = diaSemanaIndex === 0 || diaSemanaIndex === 6;
      const efemeride = (planilla?.observacionesMes || []).find((e) => e.dia === d);

      dias.push({
        numero: d,
        letra: letraDia,
        esFinDeSemana,
        efemeride: efemeride ? efemeride.descripcion : null
      });
    }
    return dias;
  }, [selectedMes, selectedAnio, planilla]);

  // Alternar estado de una celda con un clic
  const handleToggleEstado = (ordenAlumno, diaNumero, esInactivo) => {
    if (esInactivo) return; // No editar fines de semana ni feriados directos

    const actual = planilla?.registros?.[ordenAlumno]?.[diaNumero] || "P";
    let siguiente = "P";
    if (actual === "P") siguiente = "A";
    else if (actual === "A") siguiente = "J";
    else if (actual === "J") siguiente = "T";
    else if (actual === "T") siguiente = "P";

    setPlanilla((prev) => ({
      ...prev,
      registros: {
        ...prev.registros,
        [ordenAlumno]: {
          ...(prev.registros[ordenAlumno] || {}),
          [diaNumero]: siguiente
        }
      }
    }));
  };

  // Marcar todos presentes en un día específico
  const handleMarcarDiaTodosPresentes = (diaNumero) => {
    if (!planilla) return;
    setPlanilla((prev) => {
      const nextRegistros = { ...prev.registros };
      prev.alumnos.forEach((al) => {
        if (!nextRegistros[al.orden]) nextRegistros[al.orden] = {};
        if (nextRegistros[al.orden][diaNumero] !== "—") {
          nextRegistros[al.orden][diaNumero] = "P";
        }
      });
      return { ...prev, registros: nextRegistros };
    });
  };

  // Descartar/cancelar cambios y volver al estado original
  const handleCancelarCambios = () => {
    if (planillaOriginal) {
      setPlanilla(JSON.parse(JSON.stringify(planillaOriginal)));
    }
  };

  // Guardar planilla
  const handleGuardarPlanilla = async () => {
    if (!planilla || saving) return;
    setSaving(true);
    try {
      const guardada = await AsistenciasService.guardarPlanilla(planilla);
      if (guardada?.sincronizacion?.fallidas) {
        alert("La planilla se guardó, pero algunas inasistencias no llegaron al portal del alumno. Volvé a guardar para reintentar.");
      }
      /* La version nueva queda en pantalla: el proximo guardado la usa. */
      const { sincronizacion, ...sinSync } = guardada;
      setPlanilla(sinSync);
      setPlanillaOriginal(JSON.parse(JSON.stringify(sinSync)));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e) {
      if (e?.status === 409) {
        alert(e.mensaje || "Otra persona guardó esta planilla mientras la tenías abierta. Se va a recargar con los cambios guardados.");
        await cargarPlanilla();
      } else {
        alert(e?.mensaje || "No se pudieron guardar los registros de asistencia. No se perdió nada de lo que cargaste: volvé a intentar.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Imprimir la planilla en una sola hoja apaisada, ocupando toda la hoja, con margen de 0,5 cm
  const handleImprimir = () => {
    if (paginaRef.current) {
      imprimirEnHojaOficio(paginaRef.current);
    }
  };

  const handleDescargarPdf = () => {
    if (!planilla) return;
    descargarAsistenciasPdf({
      cursoActual,
      mesNombre: mesInfo.nombre,
      anio: selectedAnio,
      diasMes,
      alumnos: planilla.alumnos || [],
      registros: planilla.registros || {},
      calcularTotalesAlumno,
      balanceMensual,
      esDocente
    }).catch(() => alert("No se pudo generar el PDF de la planilla."));
  };

  const handleDescargarExcel = () => {
    if (!planilla) return;
    descargarAsistenciasExcel({
      cursoActual,
      mesNombre: mesInfo.nombre,
      anio: selectedAnio,
      diasMes,
      alumnos: planilla.alumnos || [],
      registros: planilla.registros || {},
      calcularTotalesAlumno,
      balanceMensual
    }).catch(() => alert("No se pudo exportar la planilla a Excel."));
  };

  // Separación de alumnos en Varones y Mujeres (según formato oficial de la foto)
  const varones = useMemo(() => {
    return (planilla?.alumnos || []).filter((a) => a.genero === "M");
  }, [planilla]);

  const mujeres = useMemo(() => {
    return (planilla?.alumnos || []).filter((a) => a.genero === "F");
  }, [planilla]);

  // Cálculos por alumno (totales de la fila)
  const calcularTotalesAlumno = (ordenAlumno) => {
    const reg = planilla?.registros?.[ordenAlumno] || {};
    let presentes = 0;
    let ausentesInjust = 0;
    let ausentesJust = 0;
    let tardes = 0;

    diasMes.forEach((d) => {
      const valor = reg[d.numero];
      if (valor === "P") presentes++;
      else if (valor === "A") ausentesInjust++;
      else if (valor === "J") ausentesJust++;
      else if (valor === "T") {
        tardes++;
        presentes += 0.5;
        ausentesInjust += 0.5;
      }
    });

    const totalInasistencias = ausentesInjust + ausentesJust;
    const baseEvaluada = presentes + totalInasistencias;
    const porcentajeCalculado = baseEvaluada > 0 ? (presentes / baseEvaluada) * 100 : 100;
    const porcentajeNumero = Number(porcentajeCalculado.toFixed(1));

    let porcentajeClass = "pct-good";
    if (porcentajeNumero < 75) {
      porcentajeClass = "pct-danger";
    } else if (porcentajeNumero < 85) {
      porcentajeClass = "pct-warning";
    }

    return {
      presentes,
      ausentesJust,
      ausentesInjust,
      ef: 0,
      totalInasistencias,
      baseEvaluada,
      porcentajeNumero,
      porcentajeAsistencia: `${porcentajeNumero}%`,
      porcentajeClass
    };
  };

  // Cálculos de las filas de balance diario (totales por columna)
  const totalesDiarios = useMemo(() => {
    if (!planilla) return {};

    const varonesPresentes = {};
    const varonesAusentes = {};
    const mujeresPresentes = {};
    const mujeresAusentes = {};
    const totalPresentes = {};
    const totalAusentes = {};

    diasMes.forEach((d) => {
      let vP = 0,
        vA = 0,
        mP = 0,
        mA = 0;

      varones.forEach((al) => {
        const val = planilla.registros?.[al.orden]?.[d.numero];
        if (val === "P") vP++;
        else if (val === "A" || val === "J") vA++;
        else if (val === "T") {
          vP += 0.5;
          vA += 0.5;
        }
      });

      mujeres.forEach((al) => {
        const val = planilla.registros?.[al.orden]?.[d.numero];
        if (val === "P") mP++;
        else if (val === "A" || val === "J") mA++;
        else if (val === "T") {
          mP += 0.5;
          mA += 0.5;
        }
      });

      varonesPresentes[d.numero] = vP;
      varonesAusentes[d.numero] = vA;
      mujeresPresentes[d.numero] = mP;
      mujeresAusentes[d.numero] = mA;
      totalPresentes[d.numero] = vP + mP;
      totalAusentes[d.numero] = vA + mA;
    });

    return {
      varonesPresentes,
      varonesAusentes,
      mujeresPresentes,
      mujeresAusentes,
      totalPresentes,
      totalAusentes
    };
  }, [planilla, diasMes, varones, mujeres]);

  // Estadísticas globales del mes para los cuadros finales
  const balanceMensual = useMemo(() => {
    if (!planilla || diasMes.length === 0) return {};

    let totalAsistenciasAcumuladas = 0;
    let totalInasistenciasAcumuladas = 0;
    let diasHabilesEfectivos = 0;

    diasMes.forEach((d) => {
      if (!d.esFinDeSemana && !d.efemeride) {
        diasHabilesEfectivos++;
        totalAsistenciasAcumuladas += totalesDiarios.totalPresentes?.[d.numero] || 0;
        totalInasistenciasAcumuladas += totalesDiarios.totalAusentes?.[d.numero] || 0;
      }
    });

    const totalMatricula = (planilla.alumnos || []).length;
    const asistenciaMedia =
      diasHabilesEfectivos > 0
        ? (totalAsistenciasAcumuladas / diasHabilesEfectivos).toFixed(1)
        : "0";

    const basePosible = totalAsistenciasAcumuladas + totalInasistenciasAcumuladas;
    const porcentajeAsistencia =
      basePosible > 0
        ? ((totalAsistenciasAcumuladas / basePosible) * 100).toFixed(1)
        : "100";

    return {
      matriculaInicial: totalMatricula,
      entradas: 0,
      salidas: 0,
      matriculaFinal: totalMatricula,
      totalAsistencia: Math.round(totalAsistenciasAcumuladas),
      totalInasistencia: Math.round(totalInasistenciasAcumuladas),
      asistenciaMedia,
      porcentajeAsistencia: `${porcentajeAsistencia}%`,
      diasHabiles: diasHabilesEfectivos
    };
  }, [planilla, diasMes, totalesDiarios]);

  const mesInfo = MESES_DEL_ANIO.find((m) => m.id === selectedMes) || MESES_DEL_ANIO[6];

  if (cursosListos && cursos.length === 0) {
    return h(
      "section",
      { className: "asistencias-page secretaria-dashboard" },
      h(EmptyState, { mensaje: esDocente ? "Todavía no tenés cátedras asignadas. La Dirección debe asignarte tus cursos y materias." : "Todavía no tenés cursos asignados. La Dirección debe asignártelos para ver sus asistencias." })
    );
  }

  return h(
    Fragment,
    null,
    h(
      "section",
      { className: "asistencias-page secretaria-dashboard", ref: paginaRef },

      // =========================================================================
      // BARRA SUPERIOR INSTITUCIONAL
    // =========================================================================
    h(
      "div",
      { className: "secretaria-top-bar no-print" },
      h(
        "button",
        {
          type: "button",
          className: "btn-volver-atras",
          onClick: () => {
            if (onVolver) {
              onVolver();
            } else {
              window.location.hash = esDocente ? "#/inicio" : "#/cursos";
            }
          },
          title: esDocente ? "Volver atrás" : "Volver a Directorio de Cursos"
        },
        h(
          "svg",
          {
            className: "btn-volver-atras__icon",
            viewBox: "0 0 20 20",
            fill: "currentColor"
          },
          h("path", {
            fillRule: "evenodd",
            d: "M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z",
            clipRule: "evenodd"
          })
        ),
        h("span", null, esDocente ? "Volver Atrás" : "Volver a Directorio de Cursos")
      ),
      h(
        "div",
        { className: "secretaria-eyebrow" },
        esDocente
          ? `${user.escuela || "E.E.S.T N°1 MONTE GRANDE"} · LIBRO DE ASISTENCIA POR MATERIA · CICLO 2026`
          : `${user.escuela || "E.E.S.T N°1 MONTE GRANDE"} · LIBRO DE ASISTENCIA DIARIA · CICLO 2026`
      )
    ),

    // =========================================================================
    // ENCABEZADO Y TÍTULO DE LA PLANILLA
    // =========================================================================
    h(
      "div",
      { className: "secretaria-title-row no-print" },
      h(
        "div",
        null,
        h("h1", { className: "secretaria-title" }, "Planilla de Registro de Asistencias"),
        esDocente && cursoActual.materia
          ? h("p", { style: { margin: "4px 0 0", color: "#64748b", fontSize: "14px", fontWeight: "600" } }, `Cátedra: ${cursoActual.materia}`)
          : null
      ),
      h(
        "div",
        { className: "asistencia-badge-info" },
        h("span", { className: "badge-curso-activo" }, `${cursoActual.curso} ${cursoActual.division}°`),
        esDocente && cursoActual.materia
          ? h("span", { className: "badge-curso-activo", style: { background: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0" } }, cursoActual.materia)
          : null,
        h("span", { className: "badge-turno-activo" }, `Turno ${cursoActual.turno}`)
      )
    ),

    // =========================================================================
    // SELECTOR DE CURSOS RÁPIDOS Y MES (TABS & CONTROLES)
    // =========================================================================
    h(
      "div",
      { className: "asistencias-controls-panel no-print" },

      // Selector jerárquico: primero año, después división y turno.
      grupoTaller ? null : h(
        "div",
        { className: "asistencias-course-picker" },
        h(
          "div",
          { className: "asistencias-course-picker__header" },
          h("span", { className: "asistencias-section-label" }, "SELECCIONAR CURSO"),
          h("span", { className: "asistencias-course-picker__count" }, `${cursos.length} ${cursos.length === 1 ? "curso disponible" : "cursos disponibles"}`)
        ),
        h(
          "div",
          { className: "asistencias-course-picker__row" },
          h("span", { className: "asistencias-course-picker__row-label" }, "Año"),
          h(
            "div",
            { className: "asistencias-year-options", role: "group", "aria-label": "Seleccionar año" },
            aniosDisponibles.map((anio) =>
              h(
                "button",
                {
                  key: anio,
                  type: "button",
                  className: `asistencia-year-option ${anio === anioCursoActual ? "active" : ""}`,
                  onClick: () => seleccionarAnio(anio),
                  "aria-pressed": anio === anioCursoActual
                },
                `${anio}° año`
              )
            )
          )
        ),
        h(
          "div",
          { className: "asistencias-course-picker__row" },
          h("span", { className: "asistencias-course-picker__row-label" }, "División"),
          h(
            "div",
            { className: "asistencias-division-options", role: "group", "aria-label": `Divisiones de ${anioCursoActual}° año` },
            cursosDelAnio.map((curso) => {
              const isActive = curso.id === selectedCursoId;
              return h(
                "button",
                {
                  key: curso.id,
                  type: "button",
                  className: `asistencia-division-option ${isActive ? "active" : ""}`,
                  onClick: () => setSelectedCursoId(curso.id),
                  "aria-pressed": isActive
                },
                h("strong", null, `${curso.division}ª división`),
                h("span", null, `Turno ${curso.turno}`)
              );
            })
          ),
        )
      ),

      // Fila de Filtros Secundarios y Botones de Acción
      h(
        "div",
        { className: "asistencias-actions-bar" },

        // Selector de Mes y Año
        h(
          "div",
          { className: "asistencias-mes-selector-group" },
          h(CustomSelect, {
            value: String(selectedMes),
            options: MESES_DEL_ANIO.map((m) => ({
              value: String(m.id),
              label: `Mes: ${m.nombre} 2026`
            })),
            onChange: (val) => setSelectedMes(parseInt(val, 10))
          })
        ),

        // Botones de acción
        h(
          "div",
          { className: "asistencias-buttons-group" },
          saveSuccess
            ? h("span", { className: "save-pill-badge" }, "✓ Registro guardado correctamente")
            : null,

          h(
            "button",
            {
              type: "button",
              className: "btn-asistencias-accion btn-excel-planilla",
              onClick: handleDescargarExcel,
              disabled: !planilla,
              title: "Descargar planilla en Excel (.xlsx)"
            },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: 16, height: 16 },
              h("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
              h("polyline", { points: "7 10 12 15 17 10" }),
              h("line", { x1: "12", y1: "15", x2: "12", y2: "3" })
            ),
            h("span", null, "Excel")
          ),

          h(
            "button",
            {
              type: "button",
              className: "btn-asistencias-accion btn-pdf-planilla",
              onClick: handleDescargarPdf,
              disabled: !planilla,
              title: "Descargar planilla en PDF (A4 apaisada)"
            },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: 16, height: 16 },
              h("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
              h("polyline", { points: "14 2 14 8 20 8" })
            ),
            h("span", null, "PDF")
          ),

          h(
            "button",
            {
              type: "button",
              className: "btn-asistencias-accion btn-imprimir-planilla",
              onClick: handleImprimir,
              title: "Imprimir planilla en formato oficial"
            },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", width: 16, height: 16 },
              h("path", { d: "M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" }),
              h("path", { d: "M6 14h12v8H6z" })
            ),
            h("span", null, "Imprimir Planilla")
          )
        )
      )
    ),

    // =========================================================================
    // PLANILLA DIGITALIZADA (FORMATO OFICIAL LIBRO DE ASISTENCIA)
    // =========================================================================
    h(
      "div",
      { className: "planilla-asistencia-card" },

      // Cabecera Oficial de la Planilla (como en el libro físico)
      h(
        "div",
        { className: "registro-diario-header" },
        h("img", {
          className: "registro-escuela-logo",
          src: "/assets/logo_tec.png",
          alt: "Escudo E.E.S.T. N° 1"
        }),
        h(
          "div",
          { className: "registro-header-left" },
          h("span", { className: "registro-escuela-name" }, "E.E.S.T N° 1 - MONTE GRANDE"),
          h(
            "h2",
            { className: "registro-main-title" },
            esDocente && cursoActual.materia
              ? `REGISTRO DE ASISTENCIA: ${cursoActual.curso} ${cursoActual.division}° DIVISIÓN - ${cursoActual.materia.toUpperCase()} (${cursoActual.turno.toUpperCase()})`
              : `REGISTRO DE ASISTENCIA: ${cursoActual.curso} ${cursoActual.division}° DIVISIÓN (${cursoActual.turno.toUpperCase()})`
          )
        ),
        h(
          "div",
          { className: "registro-header-right" },
          h("div", { className: "registro-header-box" }, h("span", null, "MES DE:"), h("strong", null, mesInfo.nombre.toUpperCase())),
          h("div", { className: "registro-header-box" }, h("span", null, "DEL:"), h("strong", null, String(selectedAnio))),
          h("div", { className: "registro-header-box" }, h("span", null, "DÍAS HÁBILES:"), h("strong", null, String(balanceMensual.diasHabiles || mesInfo.diasHabiles)))
        )
      ),

      loading
        ? h(LoadingState, { mensaje: "Cargando nómina y registro de asistencias del curso..." })
        : !planilla
        ? h(EmptyState, { mensaje: errorCarga || "Ese curso no está asignado a tu perfil." })
        : h(
            "div",
            { className: "planilla-table-scroll-container" },
            h(
              "table",
              { className: "tabla-registro-asistencias" },

              // Encabezado de Columnas (Días 1..31 + Totales)
              h(
                "thead",
                null,
                h(
                  "tr",
                  { className: "tr-dias-header" },
                  h("th", { className: "th-col-orden sticky-col col-1", rowSpan: 2 }, "N°"),
                  h("th", { className: "th-col-nombre sticky-col col-2", rowSpan: 2 }, "APELLIDO/S Y NOMBRE/S"),

                  // Columnas de días
                  diasMes.map((dia) =>
                    h(
                      "th",
                      {
                        key: `d-${dia.numero}`,
                        className: `th-dia-num ${dia.esFinDeSemana ? "th-dia-weekend" : ""} ${dia.efemeride ? "th-dia-jornada" : ""}`,
                        title: dia.efemeride ? `Día ${dia.numero}: ${dia.efemeride}` : `Día ${dia.numero}`
                      },
                      String(dia.numero)
                    )
                  ),

                  // Columnas fijas de totales a la derecha
                  h("th", { className: "th-col-asistencia", rowSpan: 2 }, "ASISTENCIA"),
                  h("th", { className: "th-col-inasistencia-group", colSpan: 3 }, "INASISTENCIA"),
                  h("th", { className: "th-col-total-inasist", rowSpan: 2 }, "TOTAL"),
                  h(
                    "th",
                    {
                      className: "th-col-porcentaje-asist",
                      rowSpan: 2,
                      title: "Porcentaje total de asistencia del alumno en el mes"
                    },
                    "% ASISTENCIA"
                  ),
                  h("th", { className: "th-col-observaciones", rowSpan: 2 }, "OBSERVACIONES")
                ),
                h(
                  "tr",
                  { className: "tr-dias-sub" },
                  // Letras del día (L, M, M, J, V, S, D)
                  diasMes.map((dia) =>
                    h(
                      "th",
                      {
                        key: `letra-${dia.numero}`,
                        className: `th-dia-letra ${dia.esFinDeSemana ? "th-dia-weekend" : ""}`
                      },
                      dia.letra
                    )
                  ),
                  // Sub-encabezados de inasistencia
                  h("th", { className: "th-sub-in" }, "JUSTIF."),
                  h("th", { className: "th-sub-in" }, "INJUST."),
                  h("th", { className: "th-sub-in" }, "EF")
                )
              ),

              h(
                "tbody",
                null,

                // -------------------------------------------------------------
                // SECCIÓN: VARONES
                // -------------------------------------------------------------
                h(
                  "tr",
                  { className: "tr-section-divider" },
                  h(
                    "td",
                    { colSpan: diasMes.length + 9, className: "td-section-banner" },
                    h("span", { className: "sticky-section-title" }, "VARONES")
                  )
                ),

                varones.map((alumno) => {
                  const totales = calcularTotalesAlumno(alumno.orden);
                  return h(
                    "tr",
                    { key: `al-${alumno.orden}`, className: "tr-alumno-fila" },
                    h("td", { className: "td-orden sticky-col col-1" }, alumno.orden),
                    h("td", { className: "td-nombre sticky-col col-2" }, `${alumno.apellido}, ${alumno.nombre}`),

                    // Celdas de días
                    diasMes.map((dia) => {
                      const valor = planilla?.registros?.[alumno.orden]?.[dia.numero] || (dia.esFinDeSemana || dia.efemeride ? "—" : "P");
                      const esInactivo = dia.esFinDeSemana || Boolean(dia.efemeride);
                      const estadoInfo = ESTADOS_ASISTENCIA[valor] || { label: "", clase: "" };

                      return h(
                        "td",
                        {
                          key: `celda-${alumno.orden}-${dia.numero}`,
                          className: `td-celda-asistencia ${estadoInfo.clase} ${esInactivo ? "is-inactive-cell" : ""}`,
                          onClick: () => handleToggleEstado(alumno.orden, dia.numero, esInactivo),
                          title: esInactivo ? (dia.efemeride || "Fin de semana") : `${alumno.apellido}: ${estadoInfo.label} (Clic para cambiar)`
                        },
                        valor
                      );
                    }),

                    // Totales
                    h("td", { className: "td-total td-presentes" }, totales.presentes),
                    h("td", { className: "td-total td-just" }, totales.ausentesJust || "—"),
                    h("td", { className: "td-total td-injust" }, totales.ausentesInjust || "—"),
                    h("td", { className: "td-total td-ef" }, totales.ef || "—"),
                    h("td", { className: "td-total td-inasist-total" }, totales.totalInasistencias || "0"),
                    h(
                      "td",
                      {
                        className: `td-total td-porcentaje ${totales.porcentajeClass}`,
                        title: `${totales.porcentajeAsistencia} de asistencia (${totales.presentes} presentes de ${totales.baseEvaluada} días computados)`
                      },
                      totales.porcentajeAsistencia
                    ),
                    h("td", { className: "td-observaciones-input" },
                      h("input", {
                        type: "text",
                        className: "input-obs-alumno",
                        placeholder: "Observaciones...",
                        value: planilla?.observacionesPorAlumno?.[alumno.orden] || "",
                        onChange: (e) => {
                          const val = e.target.value;
                          setPlanilla((prev) => ({
                            ...prev,
                            observacionesPorAlumno: {
                              ...prev.observacionesPorAlumno,
                              [alumno.orden]: val
                            }
                          }));
                        }
                      })
                    )
                  );
                }),

                // Totales de Varones al pie de la sección
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-varones" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "VARONES PRESENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `vp-${d.numero}`, className: "td-tot-col" }, d.esFinDeSemana || d.efemeride ? "—" : totalesDiarios.varonesPresentes[d.numero])
                  ),
                  h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-varones" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "VARONES AUSENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `va-${d.numero}`, className: "td-tot-col" }, d.esFinDeSemana || d.efemeride ? "—" : totalesDiarios.varonesAusentes[d.numero])
                  ),
                  h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-varones" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "VARONES INSCRIPTOS"),
                  diasMes.map((d) =>
                    h("td", { key: `vi-${d.numero}`, className: "td-tot-col" }, varones.length)
                  ),
                  h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                ),

                // -------------------------------------------------------------
                // SECCIÓN: MUJERES
                // -------------------------------------------------------------
                h(
                  "tr",
                  { className: "tr-section-divider" },
                  h(
                    "td",
                    { colSpan: diasMes.length + 9, className: "td-section-banner" },
                    h("span", { className: "sticky-section-title" }, "MUJERES")
                  )
                ),

                mujeres.map((alumno) => {
                  const totales = calcularTotalesAlumno(alumno.orden);
                  return h(
                    "tr",
                    { key: `al-${alumno.orden}`, className: "tr-alumno-fila" },
                    h("td", { className: "td-orden sticky-col col-1" }, alumno.orden),
                    h("td", { className: "td-nombre sticky-col col-2" }, `${alumno.apellido}, ${alumno.nombre}`),

                    // Celdas de días
                    diasMes.map((dia) => {
                      const valor = planilla?.registros?.[alumno.orden]?.[dia.numero] || (dia.esFinDeSemana || dia.efemeride ? "—" : "P");
                      const esInactivo = dia.esFinDeSemana || Boolean(dia.efemeride);
                      const estadoInfo = ESTADOS_ASISTENCIA[valor] || { label: "", clase: "" };

                      return h(
                        "td",
                        {
                          key: `celda-${alumno.orden}-${dia.numero}`,
                          className: `td-celda-asistencia ${estadoInfo.clase} ${esInactivo ? "is-inactive-cell" : ""}`,
                          onClick: () => handleToggleEstado(alumno.orden, dia.numero, esInactivo),
                          title: esInactivo ? (dia.efemeride || "Fin de semana") : `${alumno.apellido}: ${estadoInfo.label} (Clic para cambiar)`
                        },
                        valor
                      );
                    }),

                    // Totales
                    h("td", { className: "td-total td-presentes" }, totales.presentes),
                    h("td", { className: "td-total td-just" }, totales.ausentesJust || "—"),
                    h("td", { className: "td-total td-injust" }, totales.ausentesInjust || "—"),
                    h("td", { className: "td-total td-ef" }, totales.ef || "—"),
                    h("td", { className: "td-total td-inasist-total" }, totales.totalInasistencias || "0"),
                    h(
                      "td",
                      {
                        className: `td-total td-porcentaje ${totales.porcentajeClass}`,
                        title: `${totales.porcentajeAsistencia} de asistencia (${totales.presentes} presentes de ${totales.baseEvaluada} días computados)`
                      },
                      totales.porcentajeAsistencia
                    ),
                    h("td", { className: "td-observaciones-input" },
                      h("input", {
                        type: "text",
                        className: "input-obs-alumno",
                        placeholder: "Observaciones...",
                        value: planilla?.observacionesPorAlumno?.[alumno.orden] || "",
                        onChange: (e) => {
                          const val = e.target.value;
                          setPlanilla((prev) => ({
                            ...prev,
                            observacionesPorAlumno: {
                              ...prev.observacionesPorAlumno,
                              [alumno.orden]: val
                            }
                          }));
                        }
                      })
                    )
                  );
                }),

                // Totales de Mujeres al pie de la sección
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-mujeres" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "MUJERES PRESENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `mp-${d.numero}`, className: "td-tot-col" }, d.esFinDeSemana || d.efemeride ? "—" : totalesDiarios.mujeresPresentes[d.numero])
                  ),
                  h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-mujeres" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "MUJERES AUSENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `ma-${d.numero}`, className: "td-tot-col" }, d.esFinDeSemana || d.efemeride ? "—" : totalesDiarios.mujeresAusentes[d.numero])
                  ),
                  h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-mujeres" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "MUJERES INSCRIPTAS"),
                  diasMes.map((d) =>
                    h("td", { key: `mi-${d.numero}`, className: "td-tot-col" }, mujeres.length)
                  ),
                  h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                ),

                // -------------------------------------------------------------
                // RESUMEN GENERAL DIARIO DEL CURSO
                // -------------------------------------------------------------
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-general" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "ALUMNOS PRESENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `tp-${d.numero}`, className: "td-tot-col td-tot-highlight" }, d.esFinDeSemana || d.efemeride ? "—" : totalesDiarios.totalPresentes[d.numero])
                  ),
                  h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-general" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "ALUMNOS AUSENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `ta-${d.numero}`, className: "td-tot-col td-tot-highlight" }, d.esFinDeSemana || d.efemeride ? "—" : totalesDiarios.totalAusentes[d.numero])
                  ),
                  h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-general" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "ALUMNOS INSCRIPTOS"),
                  diasMes.map((d) =>
                    h("td", { key: `ti-${d.numero}`, className: "td-tot-col td-tot-highlight" }, (planilla?.alumnos || []).length)
                  ),
                  h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                )
              )
            )
          )
    ),

    // =========================================================================
    // BLOQUES DE BALANCE MENSUAL, EFEMÉRIDES Y FIRMAS (IDÉNTICO A LA FOTO)
    // =========================================================================
    h(
      "div",
      { className: "asistencia-footer-balances-grid" },

      // Cuadro 1: Matrícula de Estudiantes
      h(
        "div",
        { className: "balance-box-card" },
        h("h4", { className: "balance-box-title" }, "ESTUDIANTES"),
        h(
          "table",
          { className: "balance-mini-table" },
          h("tbody", null,
            h("tr", null, h("td", null, "MATRICULADAS/OS 1° DÍA"), h("td", { className: "val" }, balanceMensual.matriculaInicial || 30)),
            h("tr", null, h("td", null, "ENTRADAS"), h("td", { className: "val" }, balanceMensual.entradas || 0)),
            h("tr", null, h("td", null, "SALIDAS"), h("td", { className: "val" }, balanceMensual.salidas || 0)),
            h("tr", { className: "tr-resaltada" }, h("td", null, "MATRICULADAS/OS ÚLTIMO DÍA"), h("td", { className: "val" }, balanceMensual.matriculaFinal || 30))
          )
        )
      ),

      // Cuadro 2: Asistencias e Inasistencias
      h(
        "div",
        { className: "balance-box-card" },
        h("h4", { className: "balance-box-title" }, "ASISTENCIAS / INASISTENCIAS"),
        h(
          "table",
          { className: "balance-mini-table" },
          h("tbody", null,
            h("tr", null, h("td", null, "TOTAL DE ASISTENCIA"), h("td", { className: "val" }, balanceMensual.totalAsistencia || 0)),
            h("tr", null, h("td", null, "TOTAL DE INASISTENCIA"), h("td", { className: "val" }, balanceMensual.totalInasistencia || 0)),
            h("tr", null, h("td", null, "ASISTENCIA MEDIA"), h("td", { className: "val" }, balanceMensual.asistenciaMedia || "0.0")),
            h("tr", { className: "tr-resaltada" }, h("td", null, "% DE ASISTENCIA"), h("td", { className: "val font-bold" }, balanceMensual.porcentajeAsistencia || "100%"))
          )
        )
      ),

      // Cuadro 3: Observaciones y Jornadas del Mes (Efemérides)
      h(
        "div",
        { className: "balance-box-card balance-box-observaciones" },
        h("h4", { className: "balance-box-title" }, `OBSERVACIONES DEL MES DE ${mesInfo.nombre.toUpperCase()}`),
        h(
          "div",
          { className: "efemerides-list" },
          (planilla?.observacionesMes || []).length === 0
            ? h("p", { className: "text-muted" }, "Sin jornadas especiales registradas para este mes.")
            : (planilla.observacionesMes).map((efem) =>
                h(
                  "div",
                  { key: efem.dia, className: "efemeride-item" },
                  h("span", { className: "efemeride-dia" }, `${efem.dia}:`),
                  h("span", { className: "efemeride-desc" }, efem.descripcion)
                )
              )
        )
      ),

      // Cuadro 4: Firmas Institucionales
      h(
        "div",
        { className: "balance-box-card balance-box-firmas" },
        h(
          "div",
          { className: "firma-area" },
          h("div", { className: "firma-line" }),
          h("span", { className: "firma-label" }, esDocente ? "FIRMA DOCENTE" : "FIRMA PRECEPTOR"),
          h("span", { className: "firma-subtext" }, esDocente ? `${user?.nombre || "Docente"} (${cursoActual.materia || "Materia"})` : cursoActual.preceptor)
        ),
        h(
          "div",
          { className: "firma-area" },
          h("div", { className: "firma-line" }),
          h("span", { className: "firma-label" }, "FIRMA DE SUPERVISIÓN"),
          h("span", { className: "firma-subtext" }, "Secretaría / Dirección")
        )
      )
    ),

    // =========================================================================
    // MODAL / BARRA FLOTANTE FIJA AL VIEWPORT DE PANTALLA (PORTAL EN BODY)
    // =========================================================================
    cambiosCount > 0 && typeof document !== "undefined"
      ? createPortal(
          h(
            "div",
            { className: "asistencias-floating-bar no-print" },
            h(
              "div",
              { className: "floating-bar-info" },
              h("span", { className: "floating-bar-badge" }, String(cambiosCount)),
              h(
                "span",
                { className: "floating-bar-text" },
                cambiosCount === 1
                  ? "Tienes 1 cambio sin guardar en el registro"
                  : `Tienes ${cambiosCount} cambios sin guardar en el registro`
              )
            ),
            h(
              "div",
              { className: "floating-bar-actions" },
              h(
                "button",
                {
                  type: "button",
                  className: "btn-floating-cancel",
                  onClick: handleCancelarCambios,
                  disabled: saving,
                  title: "Descartar todos los cambios no guardados"
                },
                h(
                  "svg",
                  { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", width: 15, height: 15 },
                  h("line", { x1: "18", y1: "6", x2: "6", y2: "18" }),
                  h("line", { x1: "6", y1: "6", x2: "18", y2: "18" })
                ),
                h("span", null, "Cancelar")
              ),
              h(
                "button",
                {
                  type: "button",
                  className: "btn-floating-save",
                  onClick: handleGuardarPlanilla,
                  disabled: saving,
                  title: "Guardar todos los cambios realizados"
                },
                h(
                  "svg",
                  { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", width: 15, height: 15 },
                  h("polyline", { points: "20 6 9 17 4 12" })
                ),
                h("span", null, saving ? "Guardando..." : "Guardar cambios")
              )
            )
          ),
          document.body
        )
      : null
    )
  );
}
