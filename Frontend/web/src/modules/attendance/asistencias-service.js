import { StudentsService } from "../students/students-service.js";

const STORAGE_KEY_PREFIX = "prece_asistencias_planilla_";

// Catálogo base de cursos (se complementa dinámicamente con getDivisiones del backend)
export const CURSOS_CATALOGO_BASE = [
  { id: "1-1", curso: "1°", division: "1", turno: "Mañana", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Mañana" },
  { id: "1-2", curso: "1°", division: "2", turno: "Tarde", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Tarde" },
  { id: "2-1", curso: "2°", division: "1", turno: "Mañana", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Mañana" },
  { id: "2-2", curso: "2°", division: "2", turno: "Tarde", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Tarde" },
  { id: "3-1", curso: "3°", division: "1", turno: "Mañana", orientacion: "Ciclo Básico", preceptor: "Preceptoría Turno Mañana" },
  { id: "4-1", curso: "4°", division: "1", turno: "Tarde", orientacion: "Técnico en Programación", preceptor: "Preceptoría Turno Tarde" },
  { id: "5-1", curso: "5°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática", preceptor: "Preceptoría Turno Mañana" },
  { id: "6-1", curso: "6°", division: "1", turno: "Tarde", orientacion: "Técnico en Programación", preceptor: "Preceptoría Turno Tarde" },
  { id: "7-1", curso: "7°", division: "1", turno: "Mañana", orientacion: "Técnico en Informática", preceptor: "Preceptoría Turno Mañana" },
  { id: "7-2", curso: "7°", division: "2", turno: "Tarde", orientacion: "Técnico en Programación", preceptor: "Preceptoría Turno Tarde" }
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
          const cursoStr = d.curso ? `${d.curso}°` : "1°";
          const divStr = String(d.division || "1");
          return {
            id: `${d.curso || 1}-${divStr}`,
            curso: cursoStr,
            division: divStr,
            turno: d.turnoAula || "Mañana",
            orientacion: d.orientacion || (Number(d.curso) <= 3 ? "Ciclo Básico" : "Técnico en Informática"),
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
   */
  async getPlanilla(cursoId, mes = new Date().getMonth() + 1, anio = new Date().getFullYear()) {
    const key = `${STORAGE_KEY_PREFIX}${cursoId}_${anio}_${mes}`;
    const guardado = localStorage.getItem(key);

    const [cursoNum, divNum] = cursoId.split("-");

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
    const key = `${STORAGE_KEY_PREFIX}${planilla.cursoId}_${planilla.anio}_${planilla.mes}`;
    const actualizado = {
      ...planilla,
      ultimaActualizacion: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(actualizado));
    return actualizado;
  }
};
