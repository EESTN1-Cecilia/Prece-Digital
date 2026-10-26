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
import { DocenteCursosService } from "../docente/docente-cursos-service.js";
import { AvisoVariasHojas, EncabezadoImpresion } from "../../components/impresion/encabezado-impresion.js";
import { imprimirDocumento } from "../../utils/impresion.js";

const ESTADOS_ASISTENCIA = {
  P: { label: "Presente", clase: "cell-presente" },
  A: { label: "Ausente", clase: "cell-ausente" },
  J: { label: "Justificada", clase: "cell-justificada" },
  T: { label: "Tarde / Media falta", clase: "cell-tarde" },
  "—": { label: "Sin clase / Feriado", clase: "cell-inactivo" },
  /* Solo con una fuente externa (Portal Docente): dia sin asistencia registrada. */
  "": { label: "Sin registrar", clase: "cell-vacio" }
};

const LETRAS_DIAS = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];


/* Planilla mensual institucional.

   Sin `fuente` funciona como siempre (Preceptoria / Secretaria / Direccion).
   Con `fuente` (Portal Docente) los cursos, la carga y el guardado salen de
   ese adaptador: { cursos, seleccionInicial, cargar, guardar, esDiaEditable,
   estadosCiclo, volverA, observacionesHabilitadas }. La estructura, los
   calculos y la impresion de la planilla son los mismos en ambos casos. */
export default function AsistenciasView({ modoDocente = false, fuente = null }) {
  const user = useUsuarioActual();
  const tabsRef = useRef(null);

  const esDocente =
    Boolean(fuente) ||
    modoDocente ||
    user?.rol === "docente" ||
    (Array.isArray(user?.roles) &&
      user.roles.includes("docente") &&
      !user.roles.includes("preceptor") &&
      !user.roles.includes("admin") &&
      !user.roles.includes("director"));

  // Desplazamiento horizontal suave con las flechas
  const handleScrollTabs = (delta) => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: delta, behavior: "smooth" });
    }
  };

  // Lista de cursos disponibles dinámicos
  const [cursos, setCursos] = useState(() => (esDocente ? [] : CURSOS_DISPONIBLES));
  const [cursosDocenteCargados, setCursosDocenteCargados] = useState(false);

  // Estados de navegación y selección de curso/mes
  const [selectedCursoId, setSelectedCursoId] = useState(() => {
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
  const [errorCarga, setErrorCarga] = useState(null);
  const [errorGuardado, setErrorGuardado] = useState(null);

  /* Con fuente externa un dia sin dato queda vacio; en la planilla de
     Preceptoria un dia habil sin dato cuenta como presente. */
  const valorPorDefecto = fuente ? "" : "P";

  // Cargar lista dinámica de cursos según rol
  useEffect(() => {
    let montado = true;

    if (fuente) {
      fuente
        .cursos(user)
        .catch(() => [])
        .then((lista) => {
          if (!montado) return;
          setCursos(lista);
          setCursosDocenteCargados(true);
          setSelectedCursoId((actual) => (lista.some((c) => c.id === actual) ? actual : fuente.seleccionInicial(lista) ?? actual));
        });
      return () => {
        montado = false;
      };
    }

    if (esDocente) {
      // Solo los cursos asignados al docente (los resuelve el backend)
      DocenteCursosService.getMisCursos()
        .catch(() => [])
        .then((asignados) => {
          if (!montado) return;
          const asigs = asignados.map((a) => ({
            id: a.id,
            curso: a.curso,
            division: a.division,
            turno: a.turno || "Mañana",
            materia: a.materia || "",
            orientacion: "Ciclo Básico",
            preceptor: `Docente: ${user?.nombre || "Docente"}`
          }));
          setCursos(asigs);
          setCursosDocenteCargados(true);
          // Si la URL apunta a un curso que no es suyo, se usa el primero asignado
          setSelectedCursoId((actual) =>
            asigs.some((c) => c.id === actual) ? actual : asigs[0]?.id ?? actual
          );
        });
      return () => {
        montado = false;
      };
    }

    AsistenciasService.getCursosDisponibles().then((lista) => {
      if (montado && lista && lista.length > 0) {
        setCursos(lista);
      }
    });
    return () => {
      montado = false;
    };
  }, [esDocente, user, fuente]);

  // Leer parámetros de URL si cambian
  useEffect(() => {
    if (fuente) {
      return undefined;
    }

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
  }, [fuente]);

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
        materia: esDocente ? "Matemática" : undefined,
        orientacion: "Ciclo Básico",
        preceptor: esDocente ? `Docente: ${user?.nombre || "Docente"}` : "Preceptoría"
      }
    );
  }, [cursos, selectedCursoId, esDocente, user]);

  // Cargar planilla al cambiar de curso o mes (con materia si es docente)
  const cargarPlanilla = useCallback(async () => {
    // El docente solo puede abrir la planilla de un curso asignado
    if (esDocente && !cursos.some((c) => c.id === selectedCursoId)) {
      return;
    }

    setLoading(true);
    setSaveSuccess(false);
    setErrorCarga(null);
    setErrorGuardado(null);

    if (fuente) {
      try {
        const data = await fuente.cargar(cursoActual, selectedMes, selectedAnio);
        setPlanilla(data);
        setPlanillaOriginal(JSON.parse(JSON.stringify(data)));
      } catch (err) {
        setPlanilla(null);
        setErrorCarga(err?.mensaje ?? err?.message ?? "No se pudo cargar la planilla.");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const materiaDocente = esDocente ? (cursoActual.materia || "Matemática") : null;
      const data = await AsistenciasService.getPlanilla(
        selectedCursoId,
        selectedMes,
        selectedAnio,
        materiaDocente
      );
      setPlanilla(data);
      setPlanillaOriginal(JSON.parse(JSON.stringify(data)));
    } catch (err) {
      console.error("Error al cargar la planilla:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCursoId, selectedMes, selectedAnio, esDocente, cursoActual, cursos, fuente]);

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
        const valOrig = origDias[dia] != null ? origDias[dia] : valorPorDefecto;
        const valCurr = currDias[dia] != null ? currDias[dia] : valorPorDefecto;
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
  }, [planilla, planillaOriginal, valorPorDefecto]);

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
        efemeride: efemeride ? efemeride.descripcion : null,
        /* Con fuente externa: un dia futuro todavia no se puede registrar. */
        bloqueado: Boolean(fuente) && !esFinDeSemana && !fuente.esDiaEditable(selectedAnio, selectedMes, d)
      });
    }
    return dias;
  }, [selectedMes, selectedAnio, planilla, fuente]);

  /* Dias con al menos un alumno registrado. Con fuente externa son las clases
     dictadas: los demas dias no suman ni en totales ni en dias computados. */
  const diasConRegistro = useMemo(() => {
    const dias = new Set();
    Object.values(planilla?.registros || {}).forEach((porDia) => {
      Object.entries(porDia || {}).forEach(([dia, valor]) => {
        if (valor && valor !== "—") dias.add(Number(dia));
      });
    });
    return dias;
  }, [planilla]);

  /* Con fuente externa, el encabezado de un dia habil marca a todos presentes. */
  const diaMarcable = (d) => Boolean(fuente) && !d.esFinDeSemana && !d.efemeride && !d.bloqueado;

  const sinClase = (d) => d.esFinDeSemana || Boolean(d.efemeride) || (Boolean(fuente) && !diasConRegistro.has(d.numero));

  // Alternar estado de una celda con un clic
  const handleToggleEstado = (ordenAlumno, diaNumero, esInactivo) => {
    if (esInactivo) return; // No editar fines de semana ni feriados directos

    const actual = planilla?.registros?.[ordenAlumno]?.[diaNumero] || valorPorDefecto;
    let siguiente = "P";
    if (fuente) {
      const ciclo = fuente.estadosCiclo;
      const indice = ciclo.indexOf(actual);
      siguiente = indice === -1 ? ciclo[0] : ciclo[(indice + 1) % ciclo.length];
    } else if (actual === "P") siguiente = "A";
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
        nextRegistros[al.orden] = { ...(nextRegistros[al.orden] || {}) };
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
    setErrorGuardado(null);

    if (fuente) {
      try {
        const recargada = await fuente.guardar(planilla, planillaOriginal, cursoActual);
        setPlanilla(recargada);
        setPlanillaOriginal(JSON.parse(JSON.stringify(recargada)));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } catch (e) {
        /* Lo marcado no se pierde: sigue en pantalla para corregir y reintentar. */
        setErrorGuardado(e?.mensaje ?? e?.message ?? "No se pudo guardar la asistencia.");
      } finally {
        setSaving(false);
      }
      return;
    }

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
    imprimirDocumento();
  };

  // Separación de alumnos en Varones y Mujeres (según formato oficial de la foto)
  const varones = useMemo(() => {
    return (planilla?.alumnos || []).filter((a) => a.genero === "M");
  }, [planilla]);

  const mujeres = useMemo(() => {
    return (planilla?.alumnos || []).filter((a) => a.genero === "F");
  }, [planilla]);

  /* Alumnos sin genero cargado en el legajo: se listan aparte en lugar de
     sumarlos a varones o mujeres. La planilla de Preceptoria siempre trae el
     dato, asi que alli este grupo no aparece. */
  const sinGenero = useMemo(() => {
    return (planilla?.alumnos || []).filter((a) => a.genero !== "M" && a.genero !== "F");
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
      /* Con fuente externa, sin clases registradas no hay porcentaje que mostrar. */
      porcentajeAsistencia: fuente && baseEvaluada === 0 ? "—" : `${porcentajeNumero}%`,
      porcentajeClass: fuente && baseEvaluada === 0 ? "" : porcentajeClass
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
    const sinGeneroPresentes = {};
    const sinGeneroAusentes = {};

    diasMes.forEach((d) => {
      let vP = 0,
        vA = 0,
        mP = 0,
        mA = 0,
        sP = 0,
        sA = 0;

      sinGenero.forEach((al) => {
        const val = planilla.registros?.[al.orden]?.[d.numero];
        if (val === "P") sP++;
        else if (val === "A" || val === "J") sA++;
        else if (val === "T") {
          sP += 0.5;
          sA += 0.5;
        }
      });

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
      sinGeneroPresentes[d.numero] = sP;
      sinGeneroAusentes[d.numero] = sA;
      totalPresentes[d.numero] = vP + mP + sP;
      totalAusentes[d.numero] = vA + mA + sA;
    });

    return {
      varonesPresentes,
      varonesAusentes,
      mujeresPresentes,
      mujeresAusentes,
      sinGeneroPresentes,
      sinGeneroAusentes,
      totalPresentes,
      totalAusentes
    };
  }, [planilla, diasMes, varones, mujeres, sinGenero]);

  // Estadísticas globales del mes para los cuadros finales
  const balanceMensual = useMemo(() => {
    if (!planilla || diasMes.length === 0) return {};

    let totalAsistenciasAcumuladas = 0;
    let totalInasistenciasAcumuladas = 0;
    let diasHabilesEfectivos = 0;

    diasMes.forEach((d) => {
      if (!sinClase(d)) {
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
        : fuente ? null : "100";

    return {
      matriculaInicial: totalMatricula,
      entradas: 0,
      salidas: 0,
      matriculaFinal: totalMatricula,
      totalAsistencia: Math.round(totalAsistenciasAcumuladas),
      totalInasistencia: Math.round(totalInasistenciasAcumuladas),
      asistenciaMedia,
      porcentajeAsistencia: porcentajeAsistencia === null ? "—" : `${porcentajeAsistencia}%`,
      diasHabiles: diasHabilesEfectivos
    };
  }, [planilla, diasMes, totalesDiarios, diasConRegistro, fuente]);

  const filaAlumno = (alumno) => {
    const totales = calcularTotalesAlumno(alumno.orden);
    return h(
      "tr",
      { key: `al-${alumno.orden}`, className: "tr-alumno-fila" },
      h("td", { className: "td-orden sticky-col col-1" }, alumno.orden),
      h("td", { className: "td-nombre sticky-col col-2" }, `${alumno.apellido}, ${alumno.nombre}`),

      // Celdas de días
      diasMes.map((dia) => {
        const valor = planilla?.registros?.[alumno.orden]?.[dia.numero] || (dia.esFinDeSemana || dia.efemeride ? "—" : valorPorDefecto);
        const esInactivo = dia.esFinDeSemana || Boolean(dia.efemeride) || dia.bloqueado;
        const estadoInfo = ESTADOS_ASISTENCIA[valor] || { label: "", clase: "" };

        return h(
          "td",
          {
            key: `celda-${alumno.orden}-${dia.numero}`,
            className: `td-celda-asistencia ${estadoInfo.clase} ${esInactivo ? "is-inactive-cell" : ""}`,
            onClick: () => handleToggleEstado(alumno.orden, dia.numero, esInactivo),
            title: esInactivo
              ? (dia.efemeride || (dia.bloqueado ? "Día futuro: todavía no se puede registrar" : "Fin de semana"))
              : `${alumno.apellido}: ${estadoInfo.label} (Clic para cambiar)`
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
          placeholder: fuente && !fuente.observacionesHabilitadas ? "No disponible" : "Observaciones...",
          disabled: Boolean(fuente) && !fuente.observacionesHabilitadas,
          title: fuente && !fuente.observacionesHabilitadas ? "Las observaciones de alumnos se registran en el módulo de Observaciones." : undefined,
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
  };

  const mesInfo = MESES_DEL_ANIO.find((m) => m.id === selectedMes) || MESES_DEL_ANIO[6];

  if (esDocente && cursosDocenteCargados && cursos.length === 0) {
    return h(
      "section",
      { className: "asistencias-page secretaria-dashboard" },
      h(EmptyState, { mensaje: "No tenés cursos asignados. Pedile a Dirección que te asigne tus cursos para tomar asistencia." })
    );
  }

  return h(
    "section",
    { className: "asistencias-page secretaria-dashboard documento-oficio", "data-ajuste": "hoja" },

    // Encabezado institucional (solo en la impresion)
    h(EncabezadoImpresion, {
      titulo: "Registro de asistencia",
      datos: [
        { etiqueta: "Año", valor: cursoActual.curso },
        { etiqueta: "División", valor: cursoActual.division ? `${cursoActual.division}°` : null },
        { etiqueta: "Turno", valor: cursoActual.turno && cursoActual.turno !== "—" ? cursoActual.turno : null },
        { etiqueta: "Materia", valor: esDocente ? cursoActual.materia : null },
        { etiqueta: "Mes", valor: `${mesInfo.nombre} ${selectedAnio}` },
        fuente
          ? { etiqueta: "Clases registradas", valor: balanceMensual.diasHabiles ?? 0 }
          : { etiqueta: "Días hábiles", valor: balanceMensual.diasHabiles || mesInfo.diasHabiles }
      ]
    }),


    /* En el Portal Docente el marco ya identifica al docente y la planilla
       lleva el encabezado institucional (escuela, curso, materia, mes).
       Volver / título / badges duplicarían esos datos. */
    fuente
      ? null
      : h(
          "div",
          { className: "secretaria-top-bar no-print" },
          h(
            "button",
            {
              type: "button",
              className: "btn-volver-atras",
              onClick: () => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.hash = fuente?.volverA ?? (esDocente ? "#/inicio" : "#/cursos");
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

    fuente
      ? null
      : h(
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
              ? h("span", { className: "badge-curso-activo badge-materia-activa" }, cursoActual.materia)
              : null,
            h("span", { className: "badge-turno-activo" }, `Turno ${cursoActual.turno}`)
          )
        ),

    // =========================================================================
    // SELECTOR DE CURSOS RÁPIDOS Y MES (TABS & CONTROLES)
    // =========================================================================
    h(
      "div",
      { className: `asistencias-controls-panel no-print${fuente ? " asistencias-controls-panel--portal" : ""}` },

      h(
        "div",
        { className: "asistencias-cursos-tabs-wrapper" },
        fuente
          ? null
          : h("span", { className: "asistencias-section-label" }, "CURSOS Y DIVISIONES:"),
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
                  title: `${c.curso} Año - División ${c.division}° (${c.turno})${fuente && c.materia ? ` - ${c.materia}` : ""}`
                },
                h("strong", null, `${c.curso} ${c.division}°`),
                fuente && c.materia ? h("span", { className: "pill-materia" }, c.materia) : null,
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
            ariaLabel: "Mes de la planilla",
            options: MESES_DEL_ANIO.map((m) => ({
              value: String(m.id),
              label: fuente ? m.nombre : `Mes: ${m.nombre} ${selectedAnio}`
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
          fuente
            ? h("div", { className: "registro-header-box" }, h("span", null, "CLASES REGISTRADAS:"), h("strong", null, String(balanceMensual.diasHabiles ?? 0)))
            : h("div", { className: "registro-header-box" }, h("span", null, "DÍAS HÁBILES:"), h("strong", null, String(balanceMensual.diasHabiles || mesInfo.diasHabiles)))
        )
      ),

      loading
        ? h(LoadingState, { mensaje: "Cargando nómina y registro de asistencias del curso..." })
        : errorCarga
          ? h("div", { className: "planilla-error-carga", role: "alert" }, errorCarga)
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
                        className: `th-dia-num ${dia.esFinDeSemana ? "th-dia-weekend" : ""} ${dia.efemeride ? "th-dia-jornada" : ""} ${diaMarcable(dia) ? "th-dia-marcable" : ""}`,
                        title: dia.efemeride
                          ? `Día ${dia.numero}: ${dia.efemeride}`
                          : diaMarcable(dia)
                            ? `Día ${dia.numero}: clic para marcar a todos presentes (se deshace con Cancelar)`
                            : `Día ${dia.numero}`,
                        ...(diaMarcable(dia)
                          ? {
                              onClick: () => handleMarcarDiaTodosPresentes(dia.numero),
                              onKeyDown: (evento) => {
                                if (evento.key === "Enter" || evento.key === " ") {
                                  evento.preventDefault();
                                  handleMarcarDiaTodosPresentes(dia.numero);
                                }
                              },
                              role: "button",
                              tabIndex: 0
                            }
                          : {})
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

                varones.map(filaAlumno),

                // Totales de Varones al pie de la sección
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-varones" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "VARONES PRESENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `vp-${d.numero}`, className: "td-tot-col" }, sinClase(d) ? "—" : totalesDiarios.varonesPresentes[d.numero])
                  ),
                  h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-varones" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "VARONES AUSENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `va-${d.numero}`, className: "td-tot-col" }, sinClase(d) ? "—" : totalesDiarios.varonesAusentes[d.numero])
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

                mujeres.map(filaAlumno),

                // Totales de Mujeres al pie de la sección
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-mujeres" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "MUJERES PRESENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `mp-${d.numero}`, className: "td-tot-col" }, sinClase(d) ? "—" : totalesDiarios.mujeresPresentes[d.numero])
                  ),
                  h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-mujeres" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "MUJERES AUSENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `ma-${d.numero}`, className: "td-tot-col" }, sinClase(d) ? "—" : totalesDiarios.mujeresAusentes[d.numero])
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
                // SECCIÓN: SIN DATO DE GÉNERO (solo si hay alumnos sin el dato)
                // -------------------------------------------------------------
                ...(sinGenero.length
                  ? [
                      h(
                        "tr",
                        { key: "div-sg", className: "tr-section-divider" },
                        h(
                          "td",
                          { colSpan: diasMes.length + 9, className: "td-section-banner" },
                          h("span", { className: "sticky-section-title" }, "SIN DATO DE GÉNERO EN EL LEGAJO")
                        )
                      ),
                      ...sinGenero.map(filaAlumno),
                      h(
                        "tr",
                        { key: "sg-p", className: "tr-total-balance tr-total-sin-genero" },
                        h("td", { className: "td-orden sticky-col col-1" }, ""),
                        h("td", { className: "td-nombre sticky-col col-2" }, "PRESENTES"),
                        diasMes.map((d) =>
                          h("td", { key: `sp-${d.numero}`, className: "td-tot-col" }, sinClase(d) ? "—" : totalesDiarios.sinGeneroPresentes[d.numero])
                        ),
                        h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                      ),
                      h(
                        "tr",
                        { key: "sg-a", className: "tr-total-balance tr-total-sin-genero" },
                        h("td", { className: "td-orden sticky-col col-1" }, ""),
                        h("td", { className: "td-nombre sticky-col col-2" }, "AUSENTES"),
                        diasMes.map((d) =>
                          h("td", { key: `sa-${d.numero}`, className: "td-tot-col" }, sinClase(d) ? "—" : totalesDiarios.sinGeneroAusentes[d.numero])
                        ),
                        h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                      ),
                      h(
                        "tr",
                        { key: "sg-i", className: "tr-total-balance tr-total-sin-genero" },
                        h("td", { className: "td-orden sticky-col col-1" }, ""),
                        h("td", { className: "td-nombre sticky-col col-2" }, "INSCRIPTOS"),
                        diasMes.map((d) => h("td", { key: `si-${d.numero}`, className: "td-tot-col" }, sinGenero.length)),
                        h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                      )
                    ]
                  : []),

                // -------------------------------------------------------------
                // RESUMEN GENERAL DIARIO DEL CURSO
                // -------------------------------------------------------------
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-general" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "ALUMNOS PRESENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `tp-${d.numero}`, className: "td-tot-col td-tot-highlight" }, sinClase(d) ? "—" : totalesDiarios.totalPresentes[d.numero])
                  ),
                  h("td", { colSpan: 7, className: "td-empty-spacer" }, "")
                ),
                h(
                  "tr",
                  { className: "tr-total-balance tr-total-general" },
                  h("td", { className: "td-orden sticky-col col-1" }, ""),
                  h("td", { className: "td-nombre sticky-col col-2" }, "ALUMNOS AUSENTES"),
                  diasMes.map((d) =>
                    h("td", { key: `ta-${d.numero}`, className: "td-tot-col td-tot-highlight" }, sinClase(d) ? "—" : totalesDiarios.totalAusentes[d.numero])
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
            h("tr", null, h("td", null, "MATRICULADAS/OS 1° DÍA"), h("td", { className: "val" }, balanceMensual.matriculaInicial ?? 0)),
            h("tr", null, h("td", null, "ENTRADAS"), h("td", { className: "val" }, balanceMensual.entradas || 0)),
            h("tr", null, h("td", null, "SALIDAS"), h("td", { className: "val" }, balanceMensual.salidas || 0)),
            h("tr", { className: "tr-resaltada" }, h("td", null, "MATRICULADAS/OS ÚLTIMO DÍA"), h("td", { className: "val" }, balanceMensual.matriculaFinal ?? 0))
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
            h("tr", { className: "tr-resaltada" }, h("td", null, "% DE ASISTENCIA"), h("td", { className: "val font-bold" }, balanceMensual.porcentajeAsistencia || (fuente ? "—" : "100%")))
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

    h(AvisoVariasHojas, { texto: "La planilla ocupa más de una hoja: se mantuvo un tamaño de letra legible en lugar de reducirla más." }),

    // =========================================================================
    // MODAL / BARRA FLOTANTE FIJA AL VIEWPORT DE PANTALLA (PORTAL EN BODY)
    // =========================================================================
    cambiosCount > 0 && typeof document !== "undefined"
      ? createPortal(
          h(
            "div",
            { className: `asistencias-floating-bar no-print${fuente ? " asistencias-floating-bar--portal" : ""}` },
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
              ),
              errorGuardado ? h("span", { className: "floating-bar-error", role: "alert" }, errorGuardado) : null
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
