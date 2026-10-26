/* API del Portal Preceptor. Todo sale del backend con la identidad del token:
   el backend limita cursos, alumnos, asistencia y boletines a las divisiones
   que Direccion le asigno al preceptor (403 para cualquier otra). Nada se
   guarda en el navegador: los boletines viven solo en memoria mientras la
   pantalla esta abierta. */

import { pedir } from "../../services/http.js";

const PREFIJO = "/api/v1/preceptor";

function consulta(parametros = {}) {
  const busqueda = new URLSearchParams();

  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== "") {
      busqueda.set(clave, String(valor));
    }
  }

  const texto = busqueda.toString();
  return texto ? `?${texto}` : "";
}

export const PortalPreceptorService = {
  /* { cursos: [{ id: "1-1", anio, division, turno, orientacion, cantidadAlumnos }], restringido } */
  async misCursos() {
    const respuesta = await pedir(`${PREFIJO}/mis-cursos`, { crudo: true, recurso: "los cursos asignados" });
    return { cursos: respuesta?.data ?? [], restringido: Boolean(respuesta?.restringido) };
  },

  /* Lista del curso en orden alfabetico, con la asistencia del dia indicado. */
  async alumnos(cursoId, fecha) {
    const respuesta = await pedir(`${PREFIJO}/curso/${encodeURIComponent(cursoId)}/alumnos${consulta({ fecha })}`, {
      crudo: true,
      recurso: "la lista del curso"
    });
    return { alumnos: respuesta?.data ?? [], contexto: respuesta?.contexto ?? null };
  },

  /* Dias de asistencia diaria (misma forma que las tomas del portal docente). */
  async tomas({ cursoId, desde, hasta, incluirRegistros } = {}) {
    const respuesta = await pedir(`${PREFIJO}/asistencias${consulta({ cursoId, desde, hasta, incluirRegistros: incluirRegistros ? 1 : undefined })}`, {
      crudo: true,
      recurso: "el historial de asistencia"
    });
    return respuesta?.data ?? [];
  },

  /* id = "<cursoId>|<fecha>" */
  async toma(id) {
    const [cursoId, fecha] = String(id).split("|");
    const respuesta = await pedir(`${PREFIJO}/asistencias/${encodeURIComponent(cursoId)}/${encodeURIComponent(fecha)}`, {
      crudo: true,
      recurso: "la asistencia del día"
    });
    return respuesta?.data;
  },

  async corregir(id, registros) {
    const [cursoId, fecha] = String(id).split("|");
    await this.registrar({ cursoId, fecha, registros });
    return this.toma(id);
  },

  /* El backend acepta hasta 100 registros por solicitud. */
  async registrar({ cursoId, fecha, registros }) {
    for (let indice = 0; indice < registros.length; indice += 100) {
      await pedir(`${PREFIJO}/asistencia`, {
        method: "POST",
        crudo: true,
        body: JSON.stringify({ cursoId, fecha, registros: registros.slice(indice, indice + 100) })
      });
    }
  },

  /* { boletines, contexto } del curso, o del alumno indicado. */
  async boletines(cursoId, { alumnoId, ciclo } = {}) {
    const respuesta = await pedir(`${PREFIJO}/boletin/${encodeURIComponent(cursoId)}${consulta({ alumnoId, ciclo })}`, {
      crudo: true,
      recurso: "los boletines del curso"
    });
    return { boletines: respuesta?.data ?? [], contexto: respuesta?.contexto ?? null };
  }
};
