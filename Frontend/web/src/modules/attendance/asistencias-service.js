import { StudentsService } from "../students/students-service.js";

const STORAGE_KEY_PREFIX = "prece_asistencias_planilla_";

// Catálogo base de cursos (se complementa dinámicamente con getDivisiones del backend)
export const CURSOS_CATALOGO_BASE = [
  // 1° Año
  { id: "1-1", curso: "1°", division: "1", turno: "Mañana", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Mañana" },
  { id: "1-2", curso: "1°", division: "2", turno: "Mañana", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Mañana" },
  { id: "1-3", curso: "1°", division: "3", turno: "Tarde", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Tarde" },
  { id: "1-4", curso: "1°", division: "4", turno: "Tarde", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Tarde" },
  { id: "1-6", curso: "1°", division: "6", turno: "Mañana", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Mañana" },
  // 2° Año
  { id: "2-1", curso: "2°", division: "1", turno: "Mañana", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Mañana" },
  { id: "2-2", curso: "2°", division: "2", turno: "Mañana", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Mañana" },
  { id: "2-3", curso: "2°", division: "3", turno: "Tarde", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Tarde" },
  { id: "2-4", curso: "2°", division: "4", turno: "Tarde", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Tarde" },
  { id: "2-6", curso: "2°", division: "6", turno: "Mañana", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Mañana" },
  // 3° Año
  { id: "3-1", curso: "3°", division: "1", turno: "Mañana", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Mañana" },
  { id: "3-2", curso: "3°", division: "2", turno: "Mañana", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Mañana" },
  { id: "3-3", curso: "3°", division: "3", turno: "Tarde", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Tarde" },
  { id: "3-4", curso: "3°", division: "4", turno: "Tarde", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Tarde" },
  { id: "3-6", curso: "3°", division: "6", turno: "Mañana", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Mañana" },
  // 4° Año
  { id: "4-1", curso: "4°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática", preceptor: "Preceptoría Turno Mañana" },
  { id: "4-2", curso: "4°", division: "2", turno: "Tarde", orientacion: "Técnico en Informática", preceptor: "Preceptoría Turno Tarde" },
  { id: "4-3", curso: "4°", division: "3", turno: "Mañana", orientacion: "Técnico en Programación", preceptor: "Preceptoría Turno Mañana" },
  { id: "4-4", curso: "4°", division: "4", turno: "Tarde", orientacion: "Técnico en Programación", preceptor: "Preceptoría Turno Tarde" },
  // 5° Año
  { id: "5-1", curso: "5°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática", preceptor: "Preceptoría Turno Mañana" },
  { id: "5-2", curso: "5°", division: "2", turno: "Tarde", orientacion: "Técnico en Informática", preceptor: "Preceptoría Turno Tarde" },
  { id: "5-3", curso: "5°", division: "3", turno: "Mañana", orientacion: "Técnico en Programación", preceptor: "Preceptoría Turno Mañana" },
  { id: "5-4", curso: "5°", division: "4", turno: "Tarde", orientacion: "Técnico en Programación", preceptor: "Preceptoría Turno Tarde" },
  // 6° Año
  { id: "6-1", curso: "6°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática", preceptor: "Preceptoría Turno Mañana" },
  { id: "6-2", curso: "6°", division: "2", turno: "Tarde", orientacion: "Técnico en Informática", preceptor: "Preceptoría Turno Tarde" },
  { id: "6-3", curso: "6°", division: "3", turno: "Mañana", orientacion: "Técnico en Programación", preceptor: "Preceptoría Turno Mañana" },
  { id: "6-4", curso: "6°", division: "4", turno: "Tarde", orientacion: "Técnico en Programación", preceptor: "Preceptoría Turno Tarde" },
  // 7° Año
  { id: "7-1", curso: "7°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática", preceptor: "Preceptoría Turno Mañana" },
  { id: "7-2", curso: "7°", division: "2", turno: "Tarde", orientacion: "Técnico en Programación", preceptor: "Preceptoría Turno Tarde" },
  { id: "7-3", curso: "7°", division: "3", turno: "Mañana", orientacion: "Técnico en Programación", preceptor: "Preceptoría Turno Mañana" },
  { id: "7-4", curso: "7°", division: "4", turno: "Tarde", orientacion: "Técnico en Programación", preceptor: "Preceptoría Turno Tarde" }
];

export const CURSOS_DISPONIBLES = CURSOS_CATALOGO_BASE;

// Nombres de los meses del ciclo lectivo
export const MESES_DEL_ANIO = [
  { id: 3, nombre: "Marzo", diasHabiles: 21 },
  { id: 4, nombre: "Abril", diasHabiles: 20 },
  { id: 5, nombre: "Mayo", diasHabiles: 20 },
  { id: 6, nombre: "Junio", diasHabiles: 19 },
  { id: 7, nombre: "Julio", diasHabiles: 12 },
  { id: 8, nombre: "Agosto", diasHabiles: 21 },
  { id: 9, nombre: "Septiembre", diasHabiles: 20 },
  { id: 10, nombre: "Octubre", diasHabiles: 22 },
  { id: 11, nombre: "Noviembre", diasHabiles: 21 },
  { id: 12, nombre: "Diciembre", diasHabiles: 15 }
];

export const AsistenciasService = {
  /**
   * Obtiene la lista de cursos disponibles desde la API o catálogo escolar.
   */
  async getCursosDisponibles() {
    try {
      const divisionesApi = await StudentsService.getDivisiones();
      if (divisionesApi && divisionesApi.length > 0) {
        return divisionesApi.map((d) => {
          const anioLimpio = String(d.anio || d.curso || "1").replace(/°/g, "").trim();
          const divLimpia = String(d.division || "1").replace(/°/g, "").trim();
          const cursoStr = `${anioLimpio}°`;
          return {
            id: `${anioLimpio}-${divLimpia}`,
            curso: cursoStr,
            division: divLimpia,
            turno: d.turnoAula || "Mañana",
            orientacion: d.orientacion || (Number(anioLimpio) <= 3 ? "Ciclo Básico" : "Técnico en Informática"),
            preceptor: d.preceptor || `Preceptor Turno ${d.turnoAula || "Mañana"}`
          };
        });
      }
    } catch (e) {
      console.warn("Usando catálogo de cursos local.");
    }
    return CURSOS_CATALOGO_BASE;
  },

  /**
   * Obtiene la planilla de asistencias para el curso, mes y año cargando los alumnos reales del padrón.
   * Si se especifica materia (rol docente), almacena y recupera el registro específico de dicha asignatura.
   */
  async getPlanilla(cursoId, mes = new Date().getMonth() + 1, anio = new Date().getFullYear(), materia = null) {
    const rawMateria = materia ? String(materia).trim().toLowerCase().replace(/\s+/g, "_") : "";
    const normMateria = materia
      ? String(materia).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, "_")
      : "";

    let guardado = null;
    if (typeof localStorage !== "undefined") {
      const keys = [
        rawMateria ? `${STORAGE_KEY_PREFIX}docente_${rawMateria}_${cursoId}_${anio}_${mes}` : null,
        normMateria && normMateria !== rawMateria ? `${STORAGE_KEY_PREFIX}docente_${normMateria}_${cursoId}_${anio}_${mes}` : null,
        `${STORAGE_KEY_PREFIX}${cursoId}_${anio}_${mes}`
      ].filter(Boolean);

      for (const k of keys) {
        const item = localStorage.getItem(k);
        if (item) {
          guardado = item;
          break;
        }
      }
    }

    const [cursoNumRaw, divNumRaw] = (cursoId || "1-1").split("-");
    const cursoNum = String(cursoNumRaw || "1").replace(/°/g, "").trim();
    const divNum = String(divNumRaw || "1").replace(/°/g, "").trim();

    // 1. Obtener los alumnos reales matriculados en ese curso y división desde la base de datos
    let alumnos = [];
    try {
      const res = await StudentsService.getAlumnos({ curso: `${cursoNum}°`, division: divNum, limit: 100 });
      if (res.data && res.data.length > 0) {
        // Ordenar alfabéticamente por apellido y nombre
        const ordenados = [...res.data].sort((a, b) => {
          const compAp = (a.apellido || "").localeCompare(b.apellido || "");
          if (compAp !== 0) return compAp;
          return (a.nombre || "").localeCompare(b.nombre || "");
        });

        alumnos = ordenados.map((a, idx) => ({
          id: a.id,
          orden: idx + 1,
          genero: (a.genero || "").toLowerCase().startsWith("f") ? "F" : "M",
          apellido: (a.apellido || "").toUpperCase(),
          nombre: a.nombre || "",
          dni: a.dni || ""
        }));
      }
    } catch (e) {
      console.warn("No se pudieron consultar alumnos de la API para el curso:", e);
    }

    // 2. Si ya existía una planilla guardada, fusionamos los registros guardados con los alumnos actuales
    if (guardado) {
      try {
        const datosGuardados = JSON.parse(guardado);
        if (alumnos.length > 0) {
          datosGuardados.alumnos = alumnos;
        }
        return datosGuardados;
      } catch (e) {
        console.error("Error al parsear planilla guardada:", e);
      }
    }

    // 3. Si es una planilla nueva, inicializar días del mes
    const diasEnMes = new Date(anio, mes, 0).getDate();
    const registros = {};

    alumnos.forEach((alumno) => {
      registros[alumno.orden] = {};
      for (let dia = 1; dia <= diasEnMes; dia++) {
        const fecha = new Date(anio, mes - 1, dia);
        const diaSemana = fecha.getDay(); // 0 = Domingo, 6 = Sábado
        const esFinDeSemana = diaSemana === 0 || diaSemana === 6;

        if (esFinDeSemana) {
          registros[alumno.orden][dia] = "—";
        } else {
          // Inicializa en blanco para que el preceptor registre las asistencias reales
          registros[alumno.orden][dia] = "P";
        }
      }
    });

    const mesInfo = MESES_DEL_ANIO.find((m) => m.id === mes) || { diasHabiles: 20 };

    const nuevaPlanilla = {
      cursoId,
      materia: materia || null,
      mes,
      anio,
      diasHabiles: mesInfo.diasHabiles,
      alumnos,
      registros,
      observacionesPorAlumno: {},
      observacionesMes: [],
      matriculaInicial: alumnos.length,
      entradas: 0,
      salidas: 0,
      ultimaActualizacion: new Date().toISOString()
    };

    return nuevaPlanilla;
  },

  /**
   * Guarda los cambios de la planilla en el almacenamiento institucional.
   */
  async guardarPlanilla(planilla) {
    const materiaPrefix = planilla.materia ? `docente_${String(planilla.materia).trim().toLowerCase().replace(/\s+/g, "_")}_` : "";
    const key = `${STORAGE_KEY_PREFIX}${materiaPrefix}${planilla.cursoId}_${planilla.anio}_${planilla.mes}`;
    const actualizado = {
      ...planilla,
      ultimaActualizacion: new Date().toISOString()
    };
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(actualizado));
    }
    return actualizado;
  }
};

/**
 * Calcula las métricas oficiales de asistencia de una planilla
 * Idéntico al Libro Oficial de Asistencias (asistencias-view.js)
 */
export function calcularMetricasPlanilla(planilla) {
  if (!planilla || !Array.isArray(planilla.alumnos) || planilla.alumnos.length === 0) {
    return {
      matricula: 0,
      totalAsistencias: 0,
      totalInasistencias: 0,
      porcentaje: 0,
      label: "0%",
      sinAlumnos: true,
      sinRegistros: true,
      subtexto: "Sin matrícula asignada"
    };
  }

  const anio = Number(planilla.anio) || new Date().getFullYear();
  const mes = Number(planilla.mes) || new Date().getMonth() + 1;
  const totalDias = new Date(anio, mes, 0).getDate();
  const efemerides = Array.isArray(planilla.observacionesMes) ? planilla.observacionesMes : [];

  let totalPresentes = 0;
  let totalAusentes = 0;
  let diasHabilesEfectivos = 0;

  for (let dia = 1; dia <= totalDias; dia++) {
    const fecha = new Date(anio, mes - 1, dia);
    const diaSemanaIndex = fecha.getDay(); // 0 = Domingo, 6 = Sábado
    const esFinDeSemana = diaSemanaIndex === 0 || diaSemanaIndex === 6;
    const esEfemeride = efemerides.some((e) => e.dia === dia);

    if (!esFinDeSemana && !esEfemeride) {
      diasHabilesEfectivos++;
      planilla.alumnos.forEach((al) => {
        const val = planilla.registros?.[al.orden]?.[dia];
        if (val === "P") {
          totalPresentes += 1;
        } else if (val === "A" || val === "J") {
          totalAusentes += 1;
        } else if (val === "T") {
          totalPresentes += 0.5;
          totalAusentes += 0.5;
        } else if (val !== "—") {
          // Por defecto presente en día lectivo
          totalPresentes += 1;
        }
      });
    }
  }

  const basePosible = totalPresentes + totalAusentes;
  if (basePosible === 0) {
    return {
      matricula: planilla.alumnos.length,
      totalAsistencias: 0,
      totalInasistencias: 0,
      porcentaje: 0,
      label: "0%",
      sinAlumnos: false,
      sinRegistros: true,
      subtexto: "Sin asistencias registradas"
    };
  }

  const pctExacto = (totalPresentes / basePosible) * 100;
  const pctRedondeado = Math.round(pctExacto);

  return {
    matricula: planilla.alumnos.length,
    totalAsistencias: Math.round(totalPresentes),
    totalInasistencias: Math.round(totalAusentes),
    porcentaje: pctRedondeado,
    label: `${pctRedondeado}%`,
    sinAlumnos: false,
    sinRegistros: false,
    subtexto: totalAusentes === 0
      ? `${Math.round(totalPresentes)} presentes de ${Math.round(basePosible)} computados`
      : `${Math.round(totalAusentes)} inasistencia(s) computada(s)`
  };
}
