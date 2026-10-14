import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { h, ActionButton, IconoFigma } from "../../layouts/site-layout.js";
import { DashboardCard } from "../../components/dashboard/dashboard-card.js";
import { CustomSelect } from "../../components/common/custom-select.js";
import { LoadingState, EmptyState } from "../../components/common/state-handlers.js";
import {
  AsistenciasService,
  CURSOS_DISPONIBLES,
  MESES_DEL_ANIO
} from "./asistencias-service.js";
import { useUsuarioActual } from "../../estado/index.js";

const ESTADOS_ASISTENCIA = {
  P: { label: "Presente", clase: "cell-presente" },
  A: { label: "Ausente", clase: "cell-ausente" },
  J: { label: "Justificada", clase: "cell-justificada" },
  T: { label: "Tarde / Media falta", clase: "cell-tarde" },
  "—": { label: "Sin clase / Feriado", clase: "cell-inactivo" }
};

const LETRAS_DIAS = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];

export default function AsistenciasView() {
  const user = useUsuarioActual();
  const tabsRef = useRef(null);

  // Desplazamiento horizontal suave con las flechas
  const handleScrollTabs = (delta) => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: delta, behavior: "smooth" });
    }
  };

  // Lista de cursos disponibles dinámicos
  const [cursos, setCursos] = useState(CURSOS_DISPONIBLES);

  // Estados de navegación y selección de curso/mes
  const [selectedCursoId, setSelectedCursoId] = useState("1-1");
  const [selectedMes, setSelectedMes] = useState(new Date().getMonth() + 1); // Mes actual
  const [selectedAnio, setSelectedAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cargar lista dinámica de cursos desde el servicio/API
  useEffect(() => {
    let montado = true;
    AsistenciasService.getCursosDisponibles().then((lista) => {
      if (montado && lista && lista.length > 0) {
        setCursos(lista);
      }
    });
    return () => {
      montado = false;
    };
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
        orientacion: "Ciclo Básico",
        preceptor: "Preceptoría"
      }
    );
  }, [cursos, selectedCursoId]);

  // Cargar planilla al cambiar de curso o mes
  const cargarPlanilla = useCallback(async () => {
    setLoading(true);
    setSaveSuccess(false);
    try {
      const data = await AsistenciasService.getPlanilla(
        selectedCursoId,
        selectedMes,
        selectedAnio
      );
      setPlanilla(data);
      setPlanillaOriginal(JSON.parse(JSON.stringify(data)));
    } catch (err) {
      console.error("Error al cargar la planilla:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCursoId, selectedMes, selectedAnio]);

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
    if (!planilla) return;
    setSaving(true);
    try {
      await AsistenciasService.guardarPlanilla(planilla);
      setPlanillaOriginal(JSON.parse(JSON.stringify(planilla)));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (e) {
      alert("Error al guardar los registros de asistencia.");
    } finally {
      setSaving(false);
    }
  };

  // Imprimir planilla en formato oficio / apaisado
  const handleImprimir = () => {
    window.print();
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

    return {
      presentes,
      ausentesJust,
      ausentesInjust,
      ef: 0,
      totalInasistencias
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

  return h(
    "section",
    { className: "asistencias-page secretaria-dashboard" },

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
            window.location.hash = "#/cursos";
          },
          title: "Volver a Cursos"
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
        h("span", null, "Volver a Directorio de Cursos")
      ),
      h(
        "div",
        { className: "secretaria-eyebrow" },
        `${user.escuela || "E.E.S.T N°1 MONTE GRANDE"} · LIBRO DE ASISTENCIA DIARIA · CICLO 2026`
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
      ),
      h(
        "div",
        { className: "asistencia-badge-info" },
        h("span", { className: "badge-curso-activo" }, `${cursoActual.curso} ${cursoActual.division}°`),
        h("span", { className: "badge-turno-activo" }, `Turno ${cursoActual.turno}`)
      )
    ),

    // =========================================================================
    // SELECTOR DE CURSOS RÁPIDOS Y MES (TABS & CONTROLES)
    // =========================================================================
    h(
      "div",
      { className: "asistencias-controls-panel no-print" },

      // Selector de Cursos por Botones / Tabs con Flechas en los Extremos
      h(
        "div",
        { className: "asistencias-cursos-tabs-wrapper" },
        h("span", { className: "asistencias-section-label" }, "CURSOS Y DIVISIONES:"),
        h(
          "div",
          { className: "asistencias-cursos-carousel" },
          // Botón Flecha Izquierda
          h(
            "button",
            {
              type: "button",
              className: "btn-tab-scroll btn-tab-scroll-prev",
              onClick: () => handleScrollTabs(-240),
              "aria-label": "Desplazar cursos a la izquierda",
              title: "Cursos anteriores"
            },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", width: 16, height: 16 },
              h("polyline", { points: "15 18 9 12 15 6" })
            )
          ),

          // Contenedor scrollable de cursos
          h(
            "div",
            { className: "asistencias-cursos-tabs", ref: tabsRef },
            cursos.map((c) => {
              const isActive = c.id === selectedCursoId;
              return h(
                "button",
                {
                  key: c.id,
                  type: "button",
                  className: `asistencia-curso-pill ${isActive ? "active" : ""}`,
                  onClick: () => setSelectedCursoId(c.id),
                  title: `${c.curso} Año - División ${c.division}° (${c.turno})`
                },
                h("strong", null, `${c.curso} ${c.division}°`),
                h("span", { className: "pill-turno" }, c.turno.charAt(0))
              );
            })
          ),

          // Botón Flecha Derecha
          h(
            "button",
            {
              type: "button",
              className: "btn-tab-scroll btn-tab-scroll-next",
              onClick: () => handleScrollTabs(240),
              "aria-label": "Desplazar cursos a la derecha",
              title: "Cursos siguientes"
            },
            h(
              "svg",
              { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", width: 16, height: 16 },
              h("polyline", { points: "9 18 15 12 9 6" })
            )
          )
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
        h(
          "div",
          { className: "registro-header-left" },
          h("span", { className: "registro-escuela-name" }, "E.E.S.T N° 1 - MONTE GRANDE"),
          h(
            "h2",
            { className: "registro-main-title" },
            `REGISTRO DE ASISTENCIA: ${cursoActual.curso} ${cursoActual.division}° DIVISIÓN (${cursoActual.turno.toUpperCase()})`
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
                    { colSpan: diasMes.length + 7, className: "td-section-banner" },
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
                  h("td", { colSpan: 5, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-varones" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "VARONES AUSENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `va-${d.numero}`, className: "td-tot-col" }, d.esFinDeSemana || d.efemeride ? "—" : totalesDiarios.varonesAusentes[d.numero])
                  ),
                  h("td", { colSpan: 5, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-varones" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "VARONES INSCRIPTOS"),
                  diasMes.map((d) =>
                    h("td", { key: `vi-${d.numero}`, className: "td-tot-col" }, varones.length)
                  ),
                  h("td", { colSpan: 5, className: "td-empty-spacer" }, "")
                ),

                // -------------------------------------------------------------
                // SECCIÓN: MUJERES
                // -------------------------------------------------------------
                h(
                  "tr",
                  { className: "tr-section-divider" },
                  h(
                    "td",
                    { colSpan: diasMes.length + 7, className: "td-section-banner" },
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
                  h("td", { colSpan: 5, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-mujeres" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "MUJERES AUSENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `ma-${d.numero}`, className: "td-tot-col" }, d.esFinDeSemana || d.efemeride ? "—" : totalesDiarios.mujeresAusentes[d.numero])
                  ),
                  h("td", { colSpan: 5, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-mujeres" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "MUJERES INSCRIPTAS"),
                  diasMes.map((d) =>
                    h("td", { key: `mi-${d.numero}`, className: "td-tot-col" }, mujeres.length)
                  ),
                  h("td", { colSpan: 5, className: "td-empty-spacer" }, "")
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
                  h("td", { colSpan: 5, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-general" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "ALUMNOS AUSENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `ta-${d.numero}`, className: "td-tot-col td-tot-highlight" }, d.esFinDeSemana || d.efemeride ? "—" : totalesDiarios.totalAusentes[d.numero])
                  ),
                  h("td", { colSpan: 5, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-general" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "ALUMNOS INSCRIPTOS"),
                  diasMes.map((d) =>
                    h("td", { key: `ti-${d.numero}`, className: "td-tot-col td-tot-highlight" }, (planilla?.alumnos || []).length)
                  ),
                  h("td", { colSpan: 5, className: "td-empty-spacer" }, "")
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
          h("span", { className: "firma-label" }, "FIRMA PRECEPTOR"),
          h("span", { className: "firma-subtext" }, cursoActual.preceptor)
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
  );
}
