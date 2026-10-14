import { StudentsService } from "../students/students-service.js";
import { AsistenciasService } from "../attendance/asistencias-service.js";

const STORAGE_PREFIX = "prece_docente_asistencia_";
const HISTORIAL_KEY = "prece_docente_asistencias_historial";

export const ESTADOS_DOCENTE = {
  P: { codigo: "P", label: "Presente", clase: "docente-asis-cell--p", badgeClase: "badge-presente" },
  A: { codigo: "A", label: "Ausente", clase: "docente-asis-cell--a", badgeClase: "badge-ausente" },
  T: { codigo: "T", label: "Tarde", clase: "docente-asis-cell--t", badgeClase: "badge-tarde" },
  J: { codigo: "J", label: "Justificada", clase: "docente-asis-cell--j", badgeClase: "badge-justificada" }
};

export const MODULOS_HORARIOS = [
  { id: "1", label: "1° Módulo (07:30 - 08:30)", turno: "Mañana" },
  { id: "2", label: "2° Módulo (08:30 - 09:30)", turno: "Mañana" },
  { id: "3", label: "3° Módulo (09:45 - 10:45)", turno: "Mañana" },
  { id: "4", label: "4° Módulo (10:45 - 11:45)", turno: "Mañana" },
  { id: "5", label: "5° Módulo (11:55 - 12:55)", turno: "Mañana" },
  { id: "6", label: "6° Módulo (13:15 - 14:15)", turno: "Tarde" },
  { id: "7", label: "7° Módulo (14:15 - 15:15)", turno: "Tarde" },
  { id: "8", label: "8° Módulo (15:30 - 16:30)", turno: "Tarde" },
  { id: "9", label: "9° Módulo (16:30 - 17:30)", turno: "Tarde" },
  { id: "10", label: "10° Módulo (17:30 - 18:30)", turno: "Tarde" }
];

export const DocenteAsistenciasService = {
  /**
   * Genera la clave única para una clase de una materia y fecha específicas.
   */
  obtenerClaveClase({ curso, division, materia, fecha, modulo }) {
    const cLimpio = String(curso || "1").replace(/\D/g, "");
    const dLimpia = String(division || "1").replace(/\D/g, "");
    const mLimpia = String(materia || "Materia").trim().toLowerCase().replace(/\s+/g, "-");
    const modLimpio = String(modulo || "1");
    return `${STORAGE_PREFIX}${cLimpio}_${dLimpia}_${mLimpia}_${fecha}_${modLimpio}`;
  },

  /**
   * Obtiene la nómina de alumnos y los estados de asistencia de la clase para una fecha y módulo dados.
   * Cruza también la asistencia institucional tomada por Preceptoría ese mismo día.
   */
  async getClaseAsistencia({ curso, division, materia, fecha, modulo }) {
    const cNum = String(curso || "1").replace(/\D/g, "");
    const dNum = String(division || "1").replace(/\D/g, "");
    const clave = this.obtenerClaveClase({ curso: cNum, division: dNum, materia, fecha, modulo });

    // 1. Obtener alumnos reales del curso desde StudentsService
    let alumnos = [];
    try {
      const res = await StudentsService.getAlumnos({ curso: `${cNum}°`, division: dNum, limit: 100 });
      if (res?.data && res.data.length > 0) {
        const ordenados = [...res.data].sort((a, b) => {
          const comp = (a.apellido || "").localeCompare(b.apellido || "");
          if (comp !== 0) return comp;
          return (a.nombre || "").localeCompare(b.nombre || "");
        });
        alumnos = ordenados.map((a, idx) => ({
          id: a.id,
          orden: idx + 1,
          apellido: (a.apellido || "").toUpperCase(),
          nombre: a.nombre || "",
          dni: a.dni || "",
          genero: (a.genero || "").toLowerCase().startsWith("f") ? "F" : "M"
        }));
      }
    } catch (e) {
      console.warn("DocenteAsistenciasService: no se pudieron cargar alumnos desde API", e);
    }

    // Si no vinieron alumnos de la API, proveer lista base representativa
    if (alumnos.length === 0) {
      alumnos = [
        { id: "1", orden: 1, apellido: "ACOSTA", nombre: "Valentín", dni: "46.123.456", genero: "M" },
        { id: "2", orden: 2, apellido: "BENÍTEZ", nombre: "Camila", dni: "46.234.567", genero: "F" },
        { id: "3", orden: 3, apellido: "CARRIZO", nombre: "Lucas", dni: "46.345.678", genero: "M" },
        { id: "4", orden: 4, apellido: "DOMÍNGUEZ", nombre: "Sofía", dni: "46.456.789", genero: "F" },
        { id: "5", orden: 5, apellido: "ESPINOSA", nombre: "Mateo", dni: "46.567.890", genero: "M" }
      ];
    }

    // 2. Consultar asistencia institucional del preceptor para ese mismo día (si existe)
    const [anioStr, mesStr, diaStr] = String(fecha || "").split("-");
    const anio = Number(anioStr) || new Date().getFullYear();
    const mes = Number(mesStr) || new Date().getMonth() + 1;
    const dia = Number(diaStr) || new Date().getDate();

    let preceptorMap = {};
    try {
      const planillaPrece = await AsistenciasService.getPlanilla(`${cNum}-${dNum}`, mes, anio);
      if (planillaPrece?.registros) {
        alumnos.forEach((al) => {
          const stPrece = planillaPrece.registros[al.orden]?.[dia];
          if (stPrece && stPrece !== "—") {
            preceptorMap[al.id || al.orden] = stPrece;
          }
        });
      }
    } catch {
      // Si falla la consulta a preceptoría no bloquea la toma docente
    }

    // 3. Revisar si ya hay una toma previa guardada para esta clase
    let guardado = null;
    try {
      const raw = localStorage.getItem(clave);
      if (raw) guardado = JSON.parse(raw);
    } catch (err) {
      console.warn("DocenteAsistenciasService: error leyendo guardado local", err);
    }

    // 4. Mapear estado por estudiante
    const registros = {};
    const notas = {};

    alumnos.forEach((al) => {
      const keyId = al.id || al.orden;
      if (guardado?.registros && guardado.registros[keyId]) {
        registros[keyId] = guardado.registros[keyId];
      } else {
        // Por defecto: si preceptoría lo marcó Ausente, sugerir 'A', si no sugerir 'P'
        const estadoPrece = preceptorMap[keyId];
        registros[keyId] = estadoPrece === "A" ? "A" : "P";
      }

      if (guardado?.notas && guardado.notas[keyId]) {
        notas[keyId] = guardado.notas[keyId];
      } else {
        notas[keyId] = "";
      }
    });

    return {
      clave,
      curso: cNum,
      division: dNum,
      materia: materia || "Materia",
      fecha,
      modulo: modulo || "1",
      temaClase: guardado?.temaClase || "",
      observacionesGenerales: guardado?.observacionesGenerales || "",
      alumnos,
      registros,
      notas,
      preceptorMap,
      guardadoEn: guardado?.guardadoEn || null,
      docenteNombre: guardado?.docenteNombre || null
    };
  },

  /**
   * Guarda el registro de asistencia de la clase del docente.
   */
  async guardarClaseAsistencia(datosClase) {
    const { clave, curso, division, materia, fecha, modulo, temaClase, observacionesGenerales, registros, notas, docenteNombre } = datosClase;

    const payload = {
      clave,
      curso,
      division,
      materia,
      fecha,
      modulo,
      temaClase: temaClase || "",
      observacionesGenerales: observacionesGenerales || "",
      registros: registros || {},
      notas: notas || {},
      docenteNombre: docenteNombre || "Docente",
      guardadoEn: new Date().toISOString()
    };

    localStorage.setItem(clave, JSON.stringify(payload));

    // Guardar en índice de historial de clases tomadas
    try {
      const rawHist = localStorage.getItem(HISTORIAL_KEY);
      const historial = rawHist ? JSON.parse(rawHist) : [];
      const indexExistente = historial.findIndex((h) => h.clave === clave);
      const itemResumen = {
        clave,
        curso,
        division,
        materia,
        fecha,
        modulo,
        temaClase: temaClase || "",
        guardadoEn: payload.guardadoEn,
        totalAlumnos: Object.keys(registros || {}).length,
        presentes: Object.values(registros || {}).filter((v) => v === "P").length,
        ausentes: Object.values(registros || {}).filter((v) => v === "A").length,
        tardes: Object.values(registros || {}).filter((v) => v === "T").length
      };

      if (indexExistente >= 0) {
        historial[indexExistente] = itemResumen;
      } else {
        historial.unshift(itemResumen);
      }
      localStorage.setItem(HISTORIAL_KEY, JSON.stringify(historial.slice(0, 50)));
    } catch (e) {
      console.warn("DocenteAsistenciasService: no se pudo actualizar historial", e);
    }

    return payload;
  },

  /**
   * Obtiene las clases registradas recientemente por el docente.
   */
  getHistorialClases() {
    try {
      const raw = localStorage.getItem(HISTORIAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
};
