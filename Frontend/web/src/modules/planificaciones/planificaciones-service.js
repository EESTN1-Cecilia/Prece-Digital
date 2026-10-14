/* Servicios HTTP del modulo de planificaciones docentes.

   Todas las llamadas pasan por services/http.js (`pedir`), que firma con el
   token, traduce los errores a `ErrorApi` y dispara la sesion vencida ante un
   401. Las pantallas no arman URLs ni interpretan codigos HTTP: usan esto.

   Endpoints: Backend/modules/planificaciones/README.md. */

import { pedir } from "../../services/http.js";

/* Query string sin los valores vacios: un filtro sin elegir no viaja. */
function params(query = {}) {
  const busqueda = new URLSearchParams();

  Object.entries(query).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== "") {
      busqueda.set(clave, valor);
    }
  });

  const texto = busqueda.toString();
  return texto ? `?${texto}` : "";
}

/* El catalogo no cambia durante la sesion: se pide una sola vez. Si falla se
   descarta, para que el proximo intento vuelva a consultar. */
let catalogosEnCurso = null;

export const PlanificacionesService = {
  obtenerCatalogos() {
    if (!catalogosEnCurso) {
      catalogosEnCurso = pedir("/api/v1/planificaciones/catalogos", {
        recurso: "el catalogo de planificaciones"
      }).catch((fallo) => {
        catalogosEnCurso = null;
        throw fallo;
      });
    }

    return catalogosEnCurso;
  },

  /* Combinaciones ciclo lectivo -> curso -> division -> materia -> docente que
     el usuario puede planificar o consultar. */
  obtenerOpciones(filtros = {}) {
    return pedir("/api/v1/planificaciones/opciones" + params(filtros), {
      recurso: "las opciones de planificacion"
    });
  },

  /* Devuelve el cuerpo completo: { data, filtros, paginacion }. */
  listar(filtros = {}) {
    return pedir("/api/v1/planificaciones" + params(filtros), {
      recurso: "las planificaciones",
      crudo: true
    });
  },

  obtener(id) {
    return pedir(`/api/v1/planificaciones/${encodeURIComponent(id)}`, {
      recurso: "la planificacion solicitada"
    });
  },

  crear(datos) {
    return pedir("/api/v1/planificaciones", {
      method: "POST",
      body: JSON.stringify(datos)
    });
  },

  actualizar(id, datos) {
    return pedir(`/api/v1/planificaciones/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(datos),
      recurso: "la planificacion solicitada"
    });
  },

  presentar(id) {
    return pedir(`/api/v1/planificaciones/${encodeURIComponent(id)}/presentar`, {
      method: "POST",
      recurso: "la planificacion solicitada"
    });
  },

  /* Revision de Jefatura ({ estado, motivo }). Las transiciones posibles las
     informa el backend en `planificacion.transiciones`. */
  cambiarEstado(id, datos) {
    return pedir(`/api/v1/planificaciones/${encodeURIComponent(id)}/estado`, {
      method: "POST",
      body: JSON.stringify(datos),
      recurso: "la planificacion solicitada"
    });
  },

  porDocente(docenteId, filtros = {}) {
    return pedir(`/api/v1/planificaciones/por-docente/${encodeURIComponent(docenteId)}` + params(filtros), {
      recurso: "el docente solicitado"
    });
  },

  porMateria(materiaId, filtros = {}) {
    return pedir(`/api/v1/planificaciones/por-materia/${encodeURIComponent(materiaId)}` + params(filtros), {
      recurso: "la materia solicitada"
    });
  },

  porCurso(cursoId, filtros = {}) {
    return pedir(`/api/v1/planificaciones/por-curso/${encodeURIComponent(cursoId)}` + params(filtros), {
      recurso: "el curso solicitado"
    });
  }
};
