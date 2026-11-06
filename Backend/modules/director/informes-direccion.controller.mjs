import * as service from "./informes-direccion.service.mjs";

const query = (url) => Object.fromEntries(url.searchParams.entries());

/* Personal (director, preceptores, etc.): ver informes-direccion.middleware.mjs. */
export function listar({ url }) {
  return {
    statusCode: 200,
    body: { data: service.listarInformes(query(url)) }
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

export function archivo({ params }) {
  return {
    statusCode: 200,
    body: { data: service.obtenerArchivo(params.informeId) }
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
