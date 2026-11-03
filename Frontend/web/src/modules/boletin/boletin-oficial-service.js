import { pedir } from "../../services/http.js";
import { cicloDeAnio, cuerpoParaGuardar } from "./boletin-oficial-datos.js";

/* Adaptador del Boletin Oficial y de la Planilla de Calificaciones. Todo sale y
   entra por el backend, que es la MISMA fuente que lee el portal del alumno:

     GET /api/v1/boletin-oficial/alumnos/:id?anio=    notas de un alumno
     GET /api/v1/boletin-oficial/alumnos?ids=&anio=   notas de varios alumnos
     PUT /api/v1/boletin-oficial/alumnos/:id          guarda notas (planilla o boletin)
     GET /api/v1/boletin-oficial/resumen?anio=&curso=&division=  quien ya tiene notas

   `anio` es el ciclo lectivo (2026). Si el backend falla, el error llega a la vista. */

const POR_PEDIDO = 100;

export const BoletinOficialService = {
  /* Registro de un alumno en el ciclo correspondiente al año de estudio. */
  async obtener(alumno, anioEstudio) {
    const ciclo = cicloDeAnio(anioEstudio, alumno);
    return pedir(`/api/v1/boletin-oficial/alumnos/${encodeURIComponent(alumno.id)}?anio=${ciclo}`);
  },

  /* Varios alumnos de un mismo ciclo. Devuelve { [alumnoId]: registro }. */
  async obtenerVarios(ids, ciclo) {
    const unicos = [...new Set(ids.filter(Boolean))];
    const resultado = {};
    for (let i = 0; i < unicos.length; i += POR_PEDIDO) {
      const lote = unicos.slice(i, i + POR_PEDIDO);
      const respuesta = await pedir(`/api/v1/boletin-oficial/alumnos?ids=${lote.map(encodeURIComponent).join(",")}&anio=${ciclo}`);
      Object.assign(resultado, respuesta?.alumnos ?? {});
    }
    return resultado;
  },

  /* Boletin completo (formulario del personal). */
  guardarBoletin(boletin, alumno) {
    const cuerpo = { ...cuerpoParaGuardar(boletin), anio: cicloDeAnio(boletin.anio, alumno) };
    return pedir(`/api/v1/boletin-oficial/alumnos/${encodeURIComponent(alumno.id)}`, { method: "PUT", body: JSON.stringify(cuerpo) });
  },

  /* Notas de una materia desde la planilla (ciclo actual). `detalle` guarda
     los parciales, valoraciones y faltas de la planilla. */
  guardarMateria(alumnoId, { ciclo, materia, notas, detalle }) {
    const cuerpo = { anio: ciclo, notas: { [materia]: notas }, detalle: detalle ? { [materia]: detalle } : undefined };
    return pedir(`/api/v1/boletin-oficial/alumnos/${encodeURIComponent(alumnoId)}`, { method: "PUT", body: JSON.stringify(cuerpo) });
  },

  resumenDeCurso({ ciclo, curso, division }) {
    const consulta = new URLSearchParams({ anio: String(ciclo), curso: String(curso), division: String(division) });
    return pedir(`/api/v1/boletin-oficial/resumen?${consulta}`);
  }
};

export default BoletinOficialService;
