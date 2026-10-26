/* Fuente de datos del Portal Docente para la planilla mensual institucional
   (modules/attendance/asistencias-view.js).

   La planilla es la misma que usa Preceptoria: mismo encabezado, columnas,
   totales, resumenes e impresion. Lo que cambia es de donde salen y adonde van
   los datos:
   - cursos: solo las divisiones y materias asignadas al docente (backend);
   - alumnos: la lista de la division que autoriza el backend;
   - registros: las tomas de asistencia por clase del mes (una columna-dia por
     toma), y el guardado va a PUT /api/v1/asistencia-clases/planilla.
   Un dia sin toma queda vacio y no suma en los totales; los dias futuros no se
   editan. */

import { PortalDocenteService } from "./portal-docente-service.js";
import {
  expandirClases,
  fechaDeDia,
  hoyLocal,
  planillaDesdeTomas,
  rangoDelMes,
  tomasParaGuardar
} from "./portal-docente-logica.js";

function seleccionDelHash(lista) {
  const consulta = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const curso = consulta.get("curso");
  const materia = consulta.get("materia");
  const elegido = lista.find((item) => item.cursoId === curso && (!materia || item.materia === materia));
  return elegido?.id ?? lista[0]?.id ?? null;
}

export const fuentePlanillaDocente = {
  /* Ciclo de estados al hacer clic en una celda: los del catalogo que valida
     el backend. La justificacion la resuelve el modulo de inasistencias. */
  estadosCiclo: ["P", "A", "T"],
  volverA: "#/docente",
  observacionesHabilitadas: false,

  async cursos(usuario) {
    const clases = expandirClases(await PortalDocenteService.misCursos());
    const nombre = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || "Docente";

    return clases.map((clase) => ({
      id: clase.clave,
      cursoId: clase.cursoId,
      curso: `${clase.anio}°`,
      division: clase.division,
      turno: clase.turno ?? "—",
      materia: clase.materia ?? "",
      orientacion: "",
      preceptor: `Docente: ${nombre}`
    }));
  },

  seleccionInicial: seleccionDelHash,

  esDiaEditable(anio, mes, dia) {
    return fechaDeDia(anio, mes, dia) <= hoyLocal();
  },

  async cargar(curso, mes, anio) {
    const { desde, hasta } = rangoDelMes(anio, mes);
    const [{ alumnos }, tomas] = await Promise.all([
      PortalDocenteService.alumnos(curso.cursoId),
      PortalDocenteService.tomas({ cursoId: curso.cursoId, materia: curso.materia || undefined, desde, hasta, incluirRegistros: true })
    ]);

    return planillaDesdeTomas({ cursoId: curso.cursoId, materia: curso.materia, mes, anio, alumnos, tomas: Array.isArray(tomas) ? tomas : [] });
  },

  /* Devuelve la planilla recargada del backend. Si hay dias a medio marcar no
     se envia nada: la asistencia de cada dia se guarda completa. */
  async guardar(planilla, original, curso) {
    const { tomas, incompletos } = tomasParaGuardar(planilla, original);

    if (incompletos.length) {
      const error = new Error(`Completá a todos los alumnos del día ${incompletos.join(", ")} antes de guardar: cada clase se registra completa.`);
      error.mensaje = error.message;
      throw error;
    }

    if (tomas.length) {
      await PortalDocenteService.guardarPlanilla({ cursoId: curso.cursoId, materia: curso.materia, tomas });
    }

    return fuentePlanillaDocente.cargar(curso, planilla.mes, planilla.anio);
  }
};
