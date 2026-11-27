import { StudentsService } from "../students/students-service.js";
import { pedir } from "../../services/http.js";

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
      /* El backend ya devuelve solo los cursos que la sesion puede ver (un
         preceptor, los que le asigno la Direccion): una lista vacia es valida. */
      const divisionesApi = await StudentsService.getDivisiones();
      if (Array.isArray(divisionesApi)) {
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
      /* Sin respuesta del backend no se muestran cursos: el catalogo local
         expondria cursos que la sesion quizas no tiene asignados. */
      console.warn("No se pudo obtener la lista de cursos.");
    }
    return [];
  },

  /**
   * Alumnos activos del curso, ordenados por apellido y nombre. Con soloAlumnosIds
   * (lista de un grupo de taller) quedan solo los de ese grupo, numerados de nuevo.
   */
  async _alumnosDelCurso(cursoId, soloAlumnosIds = null) {
    const [cursoNumRaw, divNumRaw] = (cursoId || "1-1").split("-");
    const cursoNum = String(cursoNumRaw || "1").replace(/°/g, "").trim();
    const divNum = String(divNumRaw || "1").replace(/°/g, "").trim();
    const res = await StudentsService.getAlumnos({ curso: `${cursoNum}°`, division: divNum, estado: "activo", limit: 100 });
    const ordenados = [...(res?.data ?? [])].sort((a, b) => {
      const compAp = (a.apellido || "").localeCompare(b.apellido || "");
      return compAp !== 0 ? compAp : (a.nombre || "").localeCompare(b.nombre || "");
    });
    const delGrupo = Array.isArray(soloAlumnosIds) ? ordenados.filter((a) => soloAlumnosIds.includes(a.id)) : ordenados;
    return delGrupo.map((a, idx) => ({
      id: a.id,
      orden: idx + 1,
      genero: (a.genero || "").toLowerCase().startsWith("f") ? "F" : "M",
      apellido: (a.apellido || "").toUpperCase(),
      nombre: a.nombre || "",
      dni: a.dni || ""
    }));
  },

  /* Dias del mes de un alumno sin marcas guardadas: presente en dias habiles. */
  _diasPorDefecto(mes, anio) {
    const dias = {};
    const diasEnMes = new Date(anio, mes, 0).getDate();
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const diaSemana = new Date(anio, mes - 1, dia).getDay();
      dias[dia] = diaSemana === 0 || diaSemana === 6 ? "—" : "P";
    }
    return dias;
  },

  _consultaPlanilla(cursoId, mes, anio, materia) {
    const parametros = new URLSearchParams({ curso: cursoId, anio: String(anio), mes: String(mes) });
    if (materia) parametros.set("materia", materia);
    return `/api/v1/asistencias/planillas?${parametros.toString()}`;
  },

  /* Planillas que quedaron guardadas solo en este navegador (version anterior del
     sistema). Se suben una vez al servidor y se borran de aca. */
  _planillaDelNavegador(cursoId, mes, anio, materia) {
    if (typeof localStorage === "undefined") return null;
    const raw = materia ? String(materia).trim().toLowerCase().replace(/\s+/g, "_") : "";
    const norm = materia ? String(materia).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, "_") : "";
    const claves = materia
      ? [`${STORAGE_KEY_PREFIX}docente_${raw}_${cursoId}_${anio}_${mes}`, `${STORAGE_KEY_PREFIX}docente_${norm}_${cursoId}_${anio}_${mes}`]
      : [`${STORAGE_KEY_PREFIX}${cursoId}_${anio}_${mes}`];
    for (const clave of [...new Set(claves)]) {
      try {
        const texto = localStorage.getItem(clave);
        if (texto) return { clave, datos: JSON.parse(texto) };
      } catch {
        /* Copia local ilegible: se ignora. */
      }
    }
    return null;
  },

  /* Pasa una planilla del servidor (marcas por id de alumno) al formato de la
     pantalla (marcas por numero de orden). */
  _aPantalla(guardada, alumnos, { cursoId, mes, anio, materia }) {
    const registros = {};
    const observacionesPorAlumno = {};
    for (const alumno of alumnos) {
      registros[alumno.orden] = { ...AsistenciasService._diasPorDefecto(mes, anio), ...(guardada?.registros?.[alumno.id] ?? {}) };
      const obs = guardada?.observacionesPorAlumno?.[alumno.id];
      if (obs) observacionesPorAlumno[alumno.orden] = obs;
    }
    const mesInfo = MESES_DEL_ANIO.find((m) => m.id === mes) || { diasHabiles: 20 };
    return {
      cursoId,
      materia: materia || null,
      mes,
      anio,
      diasHabiles: mesInfo.diasHabiles,
      alumnos,
      registros,
      observacionesPorAlumno,
      observacionesMes: guardada?.observacionesMes ?? [],
      matriculaInicial: guardada?.matriculaInicial || alumnos.length,
      entradas: guardada?.entradas ?? 0,
      salidas: guardada?.salidas ?? 0,
      version: guardada?.version ?? 0,
      ultimaActualizacion: guardada?.actualizadoEn ?? null,
      actualizadoPor: guardada?.actualizadoPor ?? null
    };
  },

  /* Pasa la planilla de la pantalla al formato del servidor (por id de alumno). */
  _aServidor(planilla) {
    const registros = {};
    const observacionesPorAlumno = {};
    for (const alumno of planilla.alumnos ?? []) {
      if (!alumno?.id) continue;
      registros[alumno.id] = { ...(planilla.registros?.[alumno.orden] ?? {}) };
      const obs = planilla.observacionesPorAlumno?.[alumno.orden];
      if (obs && String(obs).trim()) observacionesPorAlumno[alumno.id] = String(obs).trim();
    }
    return {
      version: planilla.version ?? 0,
      registros,
      observacionesPorAlumno,
      observacionesMes: planilla.observacionesMes ?? [],
      matriculaInicial: planilla.matriculaInicial ?? 0,
      entradas: planilla.entradas ?? 0,
      salidas: planilla.salidas ?? 0
    };
  },

  /* Convierte una planilla vieja del navegador (marcas por orden) a la pantalla
     actual, buscando cada alumno por su id para que nada quede en otra fila. */
  _desdeCopiaLocal(copia, alumnos, contexto) {
    const porId = {};
    const obsPorId = {};
    for (const viejo of copia?.alumnos ?? []) {
      if (!viejo?.id) continue;
      if (copia.registros?.[viejo.orden]) porId[viejo.id] = copia.registros[viejo.orden];
      if (copia.observacionesPorAlumno?.[viejo.orden]) obsPorId[viejo.id] = copia.observacionesPorAlumno[viejo.orden];
    }
    return AsistenciasService._aPantalla(
      { registros: porId, observacionesPorAlumno: obsPorId, observacionesMes: copia?.observacionesMes, matriculaInicial: copia?.matriculaInicial, entradas: copia?.entradas, salidas: copia?.salidas, version: 0 },
      alumnos,
      contexto
    );
  },

  /**
   * Planilla del curso y mes, guardada en el servidor: todos los perfiles y
   * dispositivos ven la misma. Con materia es la planilla del docente.
   */
  async getPlanilla(cursoId, mes = new Date().getMonth() + 1, anio = new Date().getFullYear(), materia = null, soloAlumnosIds = null) {
    const contexto = { cursoId, mes, anio, materia };
    const [alumnos, respuesta] = await Promise.all([
      AsistenciasService._alumnosDelCurso(cursoId, soloAlumnosIds),
      pedir(AsistenciasService._consultaPlanilla(cursoId, mes, anio, materia))
    ]);
    const guardada = respuesta?.data ?? null;
    let planilla = AsistenciasService._aPantalla(guardada, alumnos, contexto);

    /* Sin planilla en el servidor pero con una copia vieja en este navegador:
       se sube ahora, una sola vez, y despues se borra la copia local. */
    if (!guardada && alumnos.length > 0) {
      const local = AsistenciasService._planillaDelNavegador(cursoId, mes, anio, materia);
      if (local) {
        const migrada = AsistenciasService._desdeCopiaLocal(local.datos, alumnos, contexto);
        try {
          const subida = await AsistenciasService.guardarPlanilla(migrada);
          planilla = subida;
          try { localStorage.removeItem(local.clave); } catch { /* sin acceso al almacenamiento local */ }
        } catch {
          /* Si no se pudo subir se muestra igual; al guardar se vuelve a intentar. */
          planilla = migrada;
        }
      }
    }

    if (materia || !planilla.alumnos.length) return planilla;

    /* La planilla del preceptor muestra las inasistencias registradas en el
       backend (las que ve el alumno en su portal). */
    try {
      const inasistencias = await AsistenciasService._inasistenciasDelMes(planilla);
      const ordenPorAlumno = new Map(planilla.alumnos.map((a) => [a.id, a.orden]));
      const registros = {};
      for (const [orden, dias] of Object.entries(planilla.registros)) {
        registros[orden] = { ...dias };
        for (const dia of Object.keys(dias)) {
          if (["A", "J", "T"].includes(registros[orden][dia])) registros[orden][dia] = "P";
        }
      }
      for (const reg of inasistencias) {
        const orden = ordenPorAlumno.get(reg.alumnoId);
        const dia = Number(String(reg.fecha).slice(8, 10));
        if (!orden || !dia) continue;
        registros[orden][dia] = reg.tipo === "tarde" ? "T" : reg.justificada ? "J" : "A";
      }
      return { ...planilla, registros };
    } catch {
      return planilla;
    }
  },

  async _inasistenciasDelMes(planilla) {
    const mm = String(planilla.mes).padStart(2, "0");
    const ultimo = new Date(planilla.anio, planilla.mes, 0).getDate();
    const respuesta = await pedir(`/api/v1/alertas/inasistencias?desde=${planilla.anio}-${mm}-01&hasta=${planilla.anio}-${mm}-${String(ultimo).padStart(2, "0")}`);
    const lista = Array.isArray(respuesta) ? respuesta : (respuesta?.data ?? respuesta?.items ?? []);
    const ids = new Set(planilla.alumnos.map((a) => a.id));
    return lista.filter((reg) => ids.has(reg.alumnoId) && !reg.bajaEn);
  },

  /**
   * Envia al backend las diferencias de la planilla del preceptor: altas,
   * cambios y bajas de ausentes (A), justificadas (J) y tardes (T). Asi el alumno
   * las ve en su portal. Devuelve cuantas operaciones fallaron.
   */
  async _sincronizarInasistencias(planilla) {
    const guardadas = await AsistenciasService._inasistenciasDelMes(planilla);
    const porClave = new Map(guardadas.map((reg) => [`${reg.alumnoId}|${String(reg.fecha).slice(0, 10)}`, reg]));
    const mm = String(planilla.mes).padStart(2, "0");
    const tareas = [];

    for (const alumno of planilla.alumnos) {
      const dias = planilla.registros?.[alumno.orden] || {};
      const totalDias = new Date(planilla.anio, planilla.mes, 0).getDate();

      for (let dia = 1; dia <= totalDias; dia++) {
        const codigo = dias[dia] ?? "P";
        const fecha = `${planilla.anio}-${mm}-${String(dia).padStart(2, "0")}`;
        const actual = porClave.get(`${alumno.id}|${fecha}`);
        const marcada = ["A", "J", "T"].includes(codigo);

        if (!marcada) {
          if (actual) {
            tareas.push(() =>
              pedir(`/api/v1/alertas/inasistencias/${encodeURIComponent(actual.id)}`, {
                method: "DELETE",
                body: JSON.stringify({ motivo: "Corregido en la planilla de asistencia" })
              })
            );
          }
          continue;
        }

        const cuerpo = {
          tipo: codigo === "T" ? "tarde" : "ausente",
          justificada: codigo === "J",
          ...(codigo === "J" ? { motivo: "Justificada por preceptoría" } : {})
        };

        if (!actual) {
          tareas.push(() => pedir("/api/v1/alertas/inasistencias", { method: "POST", body: JSON.stringify({ alumnoId: alumno.id, fecha, ...cuerpo }) }));
        } else if (actual.tipo !== cuerpo.tipo || Boolean(actual.justificada) !== cuerpo.justificada) {
          tareas.push(() => pedir(`/api/v1/alertas/inasistencias/${encodeURIComponent(actual.id)}`, { method: "PATCH", body: JSON.stringify(cuerpo) }));
        }
      }
    }

    let fallidas = 0;
    for (let i = 0; i < tareas.length; i += 5) {
      const resultados = await Promise.allSettled(tareas.slice(i, i + 5).map((tarea) => tarea()));
      fallidas += resultados.filter((r) => r.status === "rejected").length;
    }
    return { operaciones: tareas.length, fallidas };
  },

  /**
   * Guarda la planilla en el servidor. Si otra persona la guardo mientras estaba
   * abierta, el servidor responde 409 y no se pisa nada: la pantalla avisa.
   */
  async guardarPlanilla(planilla) {
    const respuesta = await pedir(AsistenciasService._consultaPlanilla(planilla.cursoId, planilla.mes, planilla.anio, planilla.materia), {
      method: "PUT",
      body: JSON.stringify(AsistenciasService._aServidor(planilla))
    });
    const guardada = respuesta?.data ?? null;
    const actualizado = {
      ...planilla,
      version: guardada?.version ?? (planilla.version ?? 0) + 1,
      ultimaActualizacion: guardada?.actualizadoEn ?? new Date().toISOString(),
      actualizadoPor: guardada?.actualizadoPor ?? planilla.actualizadoPor ?? null
    };

    /* La planilla del preceptor (sin materia) se refleja en el portal del alumno. */
    if (!planilla.materia && planilla.alumnos?.length) {
      try {
        actualizado.sincronizacion = await AsistenciasService._sincronizarInasistencias(actualizado);
      } catch {
        actualizado.sincronizacion = { operaciones: 0, fallidas: -1 };
      }
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
