import * as service from "./informes-direccion.service.mjs";
import { esSoloDocente } from "./informes-direccion.middleware.mjs";

const query = (url) => Object.fromEntries(url.searchParams.entries());

/* Personal (director, preceptores, etc.): ver informes-direccion.middleware.mjs. */
export function listar({ url, user }) {
  const filtros = query(url);
  /* El docente solo recibe lo dirigido a docentes, aunque pida otro filtro. */
  if (esSoloDocente(user)) filtros.destinatario = "docentes";

  return {
    statusCode: 200,
    body: { data: service.listarInformes(filtros) }
  };
}

export function crear({ body, user }) {
  return {
    statusCode: 201,
    body: { data: service.crearInforme(body, user) }
  };
}

export function eliminar({ params }) {
  return {
    statusCode: 200,
    body: { data: service.eliminarInforme(params.informeId) }
  };
}

export function archivo({ params, user }) {
  const opciones = esSoloDocente(user) ? { destinatario: "docentes" } : {};

  return {
    statusCode: 200,
    body: { data: service.obtenerArchivo(params.informeId, opciones) }
  };
}

/* Portal del alumno: solo lo dirigido a alumnos. */
export function listarParaAlumno() {
  return {
    statusCode: 200,
    body: { data: service.listarParaAlumnos() }
  };
}

export function archivoParaAlumno({ params }) {
  return {
    statusCode: 200,
    body: { data: service.obtenerArchivo(params.informeId, { destinatario: "alumnos" }) }
  };
}
