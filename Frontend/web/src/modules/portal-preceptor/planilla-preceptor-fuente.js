/* Fuente de datos del Portal Preceptor para la planilla mensual institucional
   (modules/attendance/asistencias-view.js), igual que la del Portal Docente
   pero con la asistencia diaria de preceptoria:
   - cursos: solo las divisiones que Direccion asigno al preceptor (backend);
   - alumnos: la lista de la division que autoriza el backend;
   - registros: la asistencia diaria del mes (GET /api/v1/preceptor/asistencias)
     y el guardado va a POST /api/v1/preceptor/asistencia.
   Un dia sin registros queda vacio y no suma en los totales; los dias futuros
   no se editan. Nada se guarda en el navegador. */

import { PortalPreceptorService } from "./portal-preceptor-service.js";
import { diasParaGuardar } from "./portal-preceptor-logica.js";
import { etiquetaTurno, fechaDeDia, hoyLocal, planillaDesdeTomas, rangoDelMes } from "../portal-docente/portal-docente-logica.js";

function seleccionDelHash(lista) {
  const consulta = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const curso = consulta.get("curso");
  return lista.find((item) => item.cursoId === curso)?.id ?? lista[0]?.id ?? null;
}

export const fuentePlanillaPreceptor = {
  estadosCiclo: ["P", "A", "T"],
  volverA: "#/preceptor",
  observacionesHabilitadas: false,

  async cursos(usuario) {
    const { cursos } = await PortalPreceptorService.misCursos();
    const nombre = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || usuario?.displayName || "Preceptor";

    return cursos.map((curso) => ({
      id: curso.id,
      cursoId: curso.id,
      curso: `${curso.anio}°`,
      division: curso.division,
      turno: etiquetaTurno(curso.turno) ?? "—",
      materia: "",
      orientacion: curso.orientacion ?? "",
      preceptor: `Preceptor/a: ${nombre}`
    }));
  },

  seleccionInicial: seleccionDelHash,

  esDiaEditable(anio, mes, dia) {
    return fechaDeDia(anio, mes, dia) <= hoyLocal();
  },

  async cargar(curso, mes, anio) {
    const { desde, hasta } = rangoDelMes(anio, mes);
    const [{ alumnos }, tomas] = await Promise.all([
      PortalPreceptorService.alumnos(curso.cursoId),
      PortalPreceptorService.tomas({ cursoId: curso.cursoId, desde, hasta, incluirRegistros: true })
    ]);

    return planillaDesdeTomas({ cursoId: curso.cursoId, materia: null, mes, anio, alumnos, tomas });
  },

  async guardar(planilla, original, curso) {
    for (const dia of diasParaGuardar(planilla, original)) {
      await PortalPreceptorService.registrar({ cursoId: curso.cursoId, fecha: dia.fecha, registros: dia.registros });
    }

    return fuentePlanillaPreceptor.cargar(curso, planilla.mes, planilla.anio);
  }
};
